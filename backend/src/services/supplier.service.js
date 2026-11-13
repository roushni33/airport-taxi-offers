import { RuleEngine } from '../rules/ruleEngine.js';
import { AppError } from '../core/AppError.js';
import { addMinutes, normalizeLocalDateTime } from '../core/timeUtils.js';

export class SupplierService {
  constructor(db, catalog, bookingService) {
    this.db = db;
    this.catalog = catalog;
    this.bookingService = bookingService;
  }

  /**
   * Flow 2 (M2, R4, S2): Supplier Dashboard
   * Returns:
   * 1. servable_requests: Only open requests where this supplier passes all of R4, with vehicle_evaluations
   * 2. my_offers: All offers assigned by this supplier with status
   * 3. change_requests: All change requests for this supplier's bookings
   * 4. fleet_busy_schedule: Visual busy timeline of all cars (S2)
   */
  getSupplierDashboard(companyId) {
    const company = this.catalog.companies.get(companyId);
    if (!company) {
      throw new AppError(`Supplier '${companyId}' not found.`, 404, 'SUPPLIER_NOT_FOUND');
    }

    const busySlots = this.bookingService.getAllBusySlots();
    const openRequests = this.db
      .prepare(`SELECT * FROM ride_requests WHERE status = 'OPEN' ORDER BY pickup ASC`)
      .all();

    const servableRequests = [];

    for (const row of openRequests) {
      const flight = this.catalog.flights.get(row.flight_id);
      const hotel = this.catalog.hotels.get(row.hotel_id);
      const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
      const childAges = JSON.parse(row.child_ages_json);

      const evalResult = RuleEngine.evaluateSupplierForRequest(
        company,
        {
          airport: flight.to,
          city: hotel.city,
          area: hotel.area,
          pickup: row.pickup,
          drive_minutes: route.drive_minutes,
          adults: row.adults,
          child_ages: childAges,
          large_bags: row.large_bags,
          small_bags: row.small_bags,
          car_type: row.car_type,
        },
        busySlots
      );

      if (evalResult.eligible) {
        const myOffers = this.db
          .prepare('SELECT * FROM ride_offers WHERE request_id = ? AND company_id = ?')
          .all(row.request_id, companyId);

        servableRequests.push({
          request_id: row.request_id,
          traveler_name: row.traveler_name,
          flight: {
            flight_id: flight.flight_id,
            airline: flight.airline,
            flight_number: flight.flight_number,
            from: flight.from,
            to: flight.to,
            arrival_local: normalizeLocalDateTime(flight.arrival_local),
          },
          hotel,
          adults: row.adults,
          child_ages: childAges,
          total_passengers: row.adults + childAges.length,
          large_bags: row.large_bags,
          small_bags: row.small_bags,
          pickup: row.pickup,
          busy_end: addMinutes(row.pickup, 2 * route.drive_minutes),
          car_type: row.car_type,
          traveler_price_inr: row.price_inr,
          route,
          vehicle_evaluations: evalResult.vehicleEvaluations,
          my_offers: myOffers,
        });
      }
    }

    const allMyOffers = this.db
      .prepare(`
        SELECT o.*, r.traveler_name, r.flight_id, r.hotel_id, r.pickup, b.booking_number
        FROM ride_offers o
        JOIN ride_requests r ON r.request_id = o.request_id
        LEFT JOIN bookings b ON b.offer_id = o.offer_id
        WHERE o.company_id = ?
        ORDER BY o.created_at DESC
      `)
      .all(companyId);

    const changeRequests = this.db
      .prepare(`
        SELECT c.*, b.vehicle_id, b.flight_id as old_flight_id, b.pickup as old_pickup, b.hotel_id
        FROM change_requests c
        JOIN bookings b ON b.booking_number = c.booking_number
        WHERE b.company_id = ?
        ORDER BY c.created_at DESC
      `)
      .all(companyId)
      .map((chg) => {
        const newFlight = this.catalog.flights.get(chg.new_flight_id);
        const hotel = this.catalog.hotels.get(chg.hotel_id);
        const route = this.catalog.getRoute(newFlight.to, hotel.city, hotel.area);
        const r6 = RuleEngine.checkR6(
          chg.vehicle_id,
          chg.new_pickup,
          route.drive_minutes,
          busySlots,
          chg.booking_number
        );
        return {
          ...chg,
          car_free_at_new_time: r6.valid,
          conflict_reason: r6.reason,
        };
      });

    const fleetBusySchedule = company.vehicles.map((v) => ({
      ...v,
      busy_windows: busySlots.filter((s) => s.vehicle_id === v.vehicle_id),
    }));

    return {
      company,
      servable_requests: servableRequests,
      my_offers: allMyOffers,
      change_requests: changeRequests,
      fleet_busy_schedule: fleetBusySchedule,
    };
  }

  /**
   * Flow 2 (M3, R7, G1, G4): Supplier Assigns a Car with a Price
   * Strictly checks R4, R5, R6, and R3 and reports the exact broken rule on failure.
   */
  assignCarOffer(companyId, payload) {
    const company = this.catalog.companies.get(companyId);
    if (!company) {
      throw new AppError(`Supplier company '${companyId}' not found.`, 404, 'SUPPLIER_NOT_FOUND');
    }

    const reqRow = this.db
      .prepare('SELECT * FROM ride_requests WHERE request_id = ?')
      .get(payload.request_id);
    if (!reqRow) {
      throw new AppError(`Ride request '${payload.request_id}' not found.`, 404, 'REQUEST_NOT_FOUND');
    }
    if (reqRow.status !== 'OPEN') {
      throw AppError.ruleViolation(
        'R7',
        `Request ${payload.request_id} is no longer OPEN (status: ${reqRow.status}).`
      );
    }

    const flight = this.catalog.flights.get(reqRow.flight_id);
    const hotel = this.catalog.hotels.get(reqRow.hotel_id);
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const childAges = JSON.parse(reqRow.child_ages_json);

    // 1. Check Supplier Airport, Area, and Opening Hours (Rule R4)
    const evalSupplier = RuleEngine.evaluateSupplierForRequest(
      company,
      {
        airport: flight.to,
        city: hotel.city,
        area: hotel.area,
        pickup: reqRow.pickup,
        drive_minutes: route.drive_minutes,
        adults: reqRow.adults,
        child_ages: childAges,
        large_bags: reqRow.large_bags,
        small_bags: reqRow.small_bags,
        car_type: reqRow.car_type,
      },
      this.bookingService.getAllBusySlots()
    );

    // If supplier failed airport/area/hours before vehicle check:
    if (!evalSupplier.eligible && evalSupplier.vehicleEvaluations.length === 0) {
      throw AppError.ruleViolation('R4', evalSupplier.reason);
    }

    // 2. Verify the vehicle belongs to this supplier
    const vehicle = company.vehicles.find((v) => v.vehicle_id === payload.vehicle_id);
    if (!vehicle) {
      throw AppError.ruleViolation(
        'R7',
        `Vehicle '${payload.vehicle_id}' does not belong to supplier ${company.name} (${company.company_id}).`
      );
    }

    // 3. Check R5 (Car Fits: seats, large_bags, small_bags, G2 car_type)
    const r5 = RuleEngine.checkR5(vehicle, {
      adults: reqRow.adults,
      child_ages: childAges,
      large_bags: reqRow.large_bags,
      small_bags: reqRow.small_bags,
      car_type: reqRow.car_type,
    });
    if (!r5.valid) {
      throw AppError.ruleViolation('R5', r5.reason, r5.details);
    }

    // 4. Check R6 (Car is Free during [pickup, pickup + 2 * drive_minutes])
    const r6 = RuleEngine.checkR6(
      vehicle.vehicle_id,
      reqRow.pickup,
      route.drive_minutes,
      this.bookingService.getAllBusySlots()
    );
    if (!r6.valid) {
      throw AppError.ruleViolation('R6', r6.reason, r6.details);
    }

    // 5. Check R3 (Supplier Price inside route range)
    const r3 = RuleEngine.checkR3(payload.price_inr, route);
    if (!r3.valid) {
      throw AppError.ruleViolation('R3', r3.reason, r3.details);
    }

    // 6. Prevent assigning the exact same car twice to the same request
    const duplicateOffer = this.db
      .prepare(
        `SELECT offer_id FROM ride_offers WHERE request_id = ? AND vehicle_id = ? AND status = 'OPEN'`
      )
      .get(payload.request_id, payload.vehicle_id);
    if (duplicateOffer) {
      throw AppError.ruleViolation(
        'R7',
        `Car ${payload.vehicle_id} is already assigned as an active offer for request ${payload.request_id}.`
      );
    }

    const offerCount = this.db.prepare('SELECT COUNT(*) as cnt FROM ride_offers').get();
    const offerId = `OFF-${String(offerCount.cnt + 1).padStart(4, '0')}`;

    this.db
      .prepare(`
        INSERT INTO ride_offers (
          offer_id, request_id, company_id, vehicle_id, price_inr, expires_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
      `)
      .run(
        offerId,
        payload.request_id,
        companyId,
        payload.vehicle_id,
        payload.price_inr,
        payload.expires_at ? normalizeLocalDateTime(payload.expires_at) : null,
        new Date().toISOString()
      );

    return {
      offer_id: offerId,
      request_id: payload.request_id,
      company_id: companyId,
      company_name: company.name,
      vehicle_id: vehicle.vehicle_id,
      vehicle_type: vehicle.type,
      seats: vehicle.seats,
      large_bags: vehicle.large_bags,
      small_bags: vehicle.small_bags,
      price_inr: payload.price_inr,
      expires_at: payload.expires_at ? normalizeLocalDateTime(payload.expires_at) : null,
      status: 'OPEN',
    };
  }
}
