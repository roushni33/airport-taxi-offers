import { RuleEngine } from '../rules/ruleEngine.js';
import { AppError } from '../core/AppError.js';
import { addMinutes, normalizeLocalDateTime } from '../core/timeUtils.js';

export class RequestService {
  constructor(db, catalog, bookingService) {
    this.db = db;
    this.catalog = catalog;
    this.bookingService = bookingService;
  }

  /**
   * Evaluates all 11 suppliers in taxi_companies.json for a given request (Rule R4 & M2).
   */
  evaluateAllSuppliersForRequest(reqObj) {
    const flight = this.catalog.flights.get(reqObj.flight_id);
    const hotel = this.catalog.hotels.get(reqObj.hotel_id);
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const busySlots = this.bookingService.getAllBusySlots();

    const eligibleSuppliers = [];
    const ineligibleReasons = [];

    for (const company of this.catalog.companies.values()) {
      const evalResult = RuleEngine.evaluateSupplierForRequest(
        company,
        {
          airport: flight.to,
          city: hotel.city,
          area: hotel.area,
          pickup: reqObj.pickup,
          drive_minutes: route.drive_minutes,
          adults: reqObj.adults,
          child_ages: reqObj.child_ages,
          large_bags: reqObj.large_bags,
          small_bags: reqObj.small_bags,
          car_type: reqObj.car_type,
        },
        busySlots
      );

      if (evalResult.eligible) {
        eligibleSuppliers.push({ company_id: company.company_id, name: company.name });
      } else {
        ineligibleReasons.push({
          company_id: company.company_id,
          name: company.name,
          rule: evalResult.ruleFailed || 'R4',
          reason: evalResult.reason || 'Ineligible',
        });
      }
    }

    return {
      can_be_served: eligibleSuppliers.length > 0,
      eligible_supplier_count: eligibleSuppliers.length,
      eligible_suppliers: eligibleSuppliers,
      ineligible_reasons: ineligibleReasons,
    };
  }

  /**
   * Flow 1 (M1, M2, R1, R2, R3, R4): Create a new Ride Request
   */
  createRequest(payload) {
    const flight = this.catalog.flights.get(payload.flight_id);
    const hotel = this.catalog.hotels.get(payload.hotel_id);
    const airport = flight ? this.catalog.airports.get(flight.to) : undefined;

    // 1. Validate R1
    const r1 = RuleEngine.checkR1({
      flight,
      hotel,
      airport,
      adults: payload.adults,
      child_ages: payload.child_ages,
      large_bags: payload.large_bags,
      small_bags: payload.small_bags,
      car_type: payload.car_type,
    });
    if (!r1.valid) {
      throw AppError.ruleViolation('R1', r1.reason, r1.details);
    }

    // 2. Validate R2 (Pickup >= arrival_local + 60m)
    const r2 = RuleEngine.checkR2(flight.arrival_local, payload.pickup);
    if (!r2.valid) {
      throw AppError.ruleViolation('R2', r2.reason, r2.details);
    }

    // 3. Validate R3 (Price inside route min..max)
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const r3 = RuleEngine.checkR3(payload.price_inr, route);
    if (!r3.valid) {
      throw AppError.ruleViolation('R3', r3.reason, r3.details);
    }

    // 4. Generate request_id and save to SQLite
    const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM ride_requests').get();
    const requestId = `REQ-${String(countRow.cnt + 1).padStart(4, '0')}`;
    const travelerName = payload.traveler_name?.trim() || 'Traveler';

    this.db
      .prepare(`
        INSERT INTO ride_requests (
          request_id, traveler_name, flight_id, hotel_id, adults,
          child_ages_json, large_bags, small_bags, pickup, car_type, price_inr, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
      `)
      .run(
        requestId,
        travelerName,
        payload.flight_id,
        payload.hotel_id,
        payload.adults,
        JSON.stringify(payload.child_ages),
        payload.large_bags,
        payload.small_bags,
        r2.resolvedPickup,
        payload.car_type || null,
        payload.price_inr,
        new Date().toISOString()
      );

    return this.getRequestById(requestId);
  }

  /**
   * Flow 1: List all ride requests (including REQ-0001..REQ-0003 + newly posted requests)
   */
  listAllRequests() {
    const rows = this.db
      .prepare('SELECT * FROM ride_requests ORDER BY created_at DESC, request_id DESC')
      .all();
    return rows.map((r) => this.enrichRequestRow(r));
  }

  /**
   * Flow 1 (M4, G5): Get Single Request with all assigned offers
   */
  getRequestById(requestId, query = {}) {
    const row = this.db
      .prepare('SELECT * FROM ride_requests WHERE request_id = ?')
      .get(requestId);
    if (!row) {
      throw new AppError(`Ride request '${requestId}' not found.`, 404, 'REQUEST_NOT_FOUND');
    }
    return this.enrichRequestRow(row, query);
  }

  /**
   * Enriches a raw database request row with catalog details, route bounds,
   * live car availability status, and applies optional car_type filter and price sorting.
   */
  enrichRequestRow(row, query = {}) {
    const flight = this.catalog.flights.get(row.flight_id);
    const hotel = this.catalog.hotels.get(row.hotel_id);
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const childAges = JSON.parse(row.child_ages_json);
    const busySlots = this.bookingService.getAllBusySlots();

    const rawOffers = this.db
      .prepare('SELECT * FROM ride_offers WHERE request_id = ? ORDER BY created_at ASC')
      .all(row.request_id);

    let offers = rawOffers.map((o) => {
      const company = this.catalog.companies.get(o.company_id);
      const vehicle = company.vehicles.find((v) => v.vehicle_id === o.vehicle_id);
      const r6Check = RuleEngine.checkR6(o.vehicle_id, row.pickup, route.drive_minutes, busySlots);

      return {
        offer_id: o.offer_id,
        request_id: o.request_id,
        company_id: o.company_id,
        company_name: company.name,
        company_rating: company.rating,
        vehicle_id: o.vehicle_id,
        vehicle_type: vehicle.type,
        seats: vehicle.seats,
        large_bags: vehicle.large_bags,
        small_bags: vehicle.small_bags,
        price_inr: o.price_inr,
        expires_at: o.expires_at,
        status: o.status,
        car_still_free: r6Check.valid,
        created_at: o.created_at,
      };
    });

    // Feature G5: Filter by car type
    if (query.car_type) {
      offers = offers.filter((o) => o.vehicle_type === query.car_type);
    }
    // Feature G5: Sort by price
    if (query.sort === 'price_asc') {
      offers.sort((a, b) => a.price_inr - b.price_inr);
    } else if (query.sort === 'price_desc') {
      offers.sort((a, b) => b.price_inr - a.price_inr);
    }

    const booking = this.db
      .prepare('SELECT booking_number FROM bookings WHERE request_id = ?')
      .get(row.request_id);

    return {
      request_id: row.request_id,
      traveler_name: row.traveler_name,
      status: row.status,
      booking_number: booking ? booking.booking_number : null,
      flight: {
        ...flight,
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
      price_inr: row.price_inr,
      route,
      supplier_matching: this.evaluateAllSuppliersForRequest({
        flight_id: row.flight_id,
        hotel_id: row.hotel_id,
        adults: row.adults,
        child_ages: childAges,
        large_bags: row.large_bags,
        small_bags: row.small_bags,
        pickup: row.pickup,
        car_type: row.car_type,
      }),
      offers,
    };
  }

  /**
   * Stretch S1: Find Shareable Ride Matches (Same Flight + Same Hotel Area)
   * Finds and suggests pairs of OPEN requests that can share one vehicle.
   */
  findShareableMatches(requestId) {
    const req1 = this.db
      .prepare('SELECT * FROM ride_requests WHERE request_id = ?')
      .get(requestId);
    if (!req1 || req1.status !== 'OPEN') return [];

    const hotel1 = this.catalog.hotels.get(req1.hotel_id);
    const flight = this.catalog.flights.get(req1.flight_id);
    const route = this.catalog.getRoute(flight.to, hotel1.city, hotel1.area);
    const children1 = JSON.parse(req1.child_ages_json);

    const candidates = this.db
      .prepare(
        `SELECT * FROM ride_requests WHERE status = 'OPEN' AND flight_id = ? AND request_id != ?`
      )
      .all(req1.flight_id, requestId);

    const matches = [];
    for (const req2 of candidates) {
      const hotel2 = this.catalog.hotels.get(req2.hotel_id);
      if (hotel2.city !== hotel1.city || hotel2.area !== hotel1.area) continue;

      const children2 = JSON.parse(req2.child_ages_json);
      const combinedAdults = req1.adults + req2.adults;
      const combinedChildAges = [...children1, ...children2];
      const combinedLargeBags = req1.large_bags + req2.large_bags;
      const combinedSmallBags = req1.small_bags + req2.small_bags;
      const sharedPickup = req1.pickup > req2.pickup ? req1.pickup : req2.pickup;

      const matchingSummary = this.evaluateAllSuppliersForRequest({
        flight_id: req1.flight_id,
        hotel_id: req1.hotel_id,
        adults: combinedAdults,
        child_ages: combinedChildAges,
        large_bags: combinedLargeBags,
        small_bags: combinedSmallBags,
        pickup: sharedPickup,
        car_type: null,
      });

      if (matchingSummary.can_be_served) {
        matches.push({
          partner_request_id: req2.request_id,
          partner_traveler_name: req2.traveler_name,
          hotel_area: hotel1.area,
          combined_passengers: combinedAdults + combinedChildAges.length,
          combined_large_bags: combinedLargeBags,
          combined_small_bags: combinedSmallBags,
          shared_pickup: sharedPickup,
          route_price_range: route,
          eligible_suppliers: matchingSummary.eligible_suppliers,
        });
      }
    }

    return matches;
  }

  /**
   * Stretch S1: Merge Two Requests into a Shared Ride
   */
  shareRequests(requestId1, requestId2) {
    const req1 = this.db.prepare('SELECT * FROM ride_requests WHERE request_id = ?').get(requestId1);
    const req2 = this.db.prepare('SELECT * FROM ride_requests WHERE request_id = ?').get(requestId2);
    if (!req1 || !req2) {
      throw new AppError('One or both ride requests not found.', 404, 'REQUEST_NOT_FOUND');
    }
    if (req1.status !== 'OPEN' || req2.status !== 'OPEN') {
      throw AppError.ruleViolation('R1', 'Both requests must be OPEN to share a ride.');
    }
    const tx = this.db.transaction(() => {
      this.db
        .prepare("UPDATE ride_requests SET status = 'SHARED', shared_with_request_id = ? WHERE request_id = ?")
        .run(requestId2, requestId1);
      this.db
        .prepare("UPDATE ride_requests SET status = 'SHARED', shared_with_request_id = ? WHERE request_id = ?")
        .run(requestId1, requestId2);
    });
    tx();
    return {
      shared: true,
      request_id_1: requestId1,
      request_id_2: requestId2,
      message: 'Requests successfully merged into a shared ride.',
    };
  }
}
