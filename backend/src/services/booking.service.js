import { RuleEngine } from '../rules/ruleEngine.js';
import { AppError } from '../core/AppError.js';
import { addMinutes, normalizeLocalDateTime, toEpochMinutes } from '../core/timeUtils.js';

export class BookingService {
  constructor(db, catalog) {
    this.db = db;
    this.catalog = catalog;
  }

  /**
   * Aggregates all car busy windows from:
   * 1. data/problem-2/booked_rides.json (6 pre-booked rides)
   * 2. Confirmed bookings in SQLite `bookings` table
   */
  getAllBusySlots() {
    const slots = this.catalog.preBookedRides.map((r) => ({
      source_id: r.ride_id,
      vehicle_id: r.vehicle_id,
      start: normalizeLocalDateTime(r.start),
      end: normalizeLocalDateTime(r.end),
    }));

    const dbBookings = this.db
      .prepare(
        `SELECT booking_number, vehicle_id, pickup, busy_end FROM bookings WHERE status = 'CONFIRMED'`
      )
      .all();

    for (const b of dbBookings) {
      slots.push({
        source_id: b.booking_number,
        vehicle_id: b.vehicle_id,
        start: normalizeLocalDateTime(b.pickup),
        end: normalizeLocalDateTime(b.busy_end),
      });
    }

    return slots;
  }

  /**
   * Generates a unique 10-digit numeric booking number (Rule R8 / M5).
   */
  generateUnique10DigitBookingNumber() {
    while (true) {
      // Generate 10-digit number starting with 1-9 (1000000000 to 9999999999)
      const num = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const existing = this.db
        .prepare('SELECT booking_number FROM bookings WHERE booking_number = ?')
        .get(num);
      if (!existing) return num;
    }
  }

  /**
   * Flow 1 (M4, R8): Traveler Rejects an Assigned Taxi Offer
   * Marks offer REJECTED permanently so it can never be booked.
   */
  rejectOffer(offerId) {
    const offer = this.db.prepare('SELECT * FROM ride_offers WHERE offer_id = ?').get(offerId);
    if (!offer) {
      throw new AppError(`Offer '${offerId}' not found.`, 404, 'OFFER_NOT_FOUND');
    }
    if (offer.status !== 'OPEN') {
      throw AppError.ruleViolation('R8', `Cannot reject offer with status '${offer.status}'.`);
    }
    this.db.prepare(`UPDATE ride_offers SET status = 'REJECTED' WHERE offer_id = ?`).run(offerId);
    return { offer_id: offerId, status: 'REJECTED' };
  }

  /**
   * Flow 1 (M4, M6, R8, G4): Traveler Books an Assigned Taxi Offer
   * Confirms booking. Checks offer is OPEN, not REJECTED, and not expired (G4).
   * Re-runs R6 (M6 no double booking check).
   * Generates a unique 10-digit booking number, sets chosen offer to BOOKED,
   * other offers on that request to NOT_CHOSEN, and blocks the car for [pickup, pickup + 2*drive_minutes].
   */
  bookOffer(offerId) {
    const offer = this.db.prepare('SELECT * FROM ride_offers WHERE offer_id = ?').get(offerId);
    if (!offer) {
      throw new AppError(`Offer '${offerId}' not found.`, 404, 'OFFER_NOT_FOUND');
    }

    if (offer.status === 'REJECTED') {
      throw AppError.ruleViolation('R8', `Offer ${offerId} was rejected and cannot be booked.`);
    }
    if (offer.status !== 'OPEN') {
      throw AppError.ruleViolation(
        'R8',
        `Offer ${offerId} is no longer open (status: ${offer.status}).`
      );
    }

    const reqRow = this.db
      .prepare('SELECT * FROM ride_requests WHERE request_id = ?')
      .get(offer.request_id);
    if (reqRow.status !== 'OPEN') {
      throw AppError.ruleViolation('R8', `Request ${reqRow.request_id} is already ${reqRow.status}.`);
    }

    // Check G4 Offer Expiry
    if (offer.expires_at) {
      const nowLocal = normalizeLocalDateTime(new Date().toISOString());
      if (toEpochMinutes(nowLocal) > toEpochMinutes(offer.expires_at)) {
        this.db.prepare(`UPDATE ride_offers SET status = 'EXPIRED' WHERE offer_id = ?`).run(offerId);
        throw AppError.ruleViolation(
          'R8',
          `Offer ${offerId} expired at ${offer.expires_at} and cannot be booked.`
        );
      }
    }

    const flight = this.catalog.flights.get(reqRow.flight_id);
    const hotel = this.catalog.hotels.get(reqRow.hotel_id);
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);

    // M6 / R6 / R8: Re-verify that the car has not become busy with another booking
    const r6 = RuleEngine.checkR6(
      offer.vehicle_id,
      reqRow.pickup,
      route.drive_minutes,
      this.getAllBusySlots()
    );
    if (!r6.valid) {
      throw AppError.ruleViolation('R6', `Booking refused (M6/R8): ${r6.reason}`, r6.details);
    }

    const bookingNumber = this.generateUnique10DigitBookingNumber();
    const nowIso = new Date().toISOString();

    const tx = this.db.transaction(() => {
      // 1. Mark chosen offer BOOKED
      this.db.prepare(`UPDATE ride_offers SET status = 'BOOKED' WHERE offer_id = ?`).run(offerId);

      // 2. Mark all other OPEN offers on this request as NOT_CHOSEN (Rule R8)
      this.db
        .prepare(
          `UPDATE ride_offers SET status = 'NOT_CHOSEN' WHERE request_id = ? AND offer_id != ? AND status = 'OPEN'`
        )
        .run(reqRow.request_id, offerId);

      // 3. Mark request as BOOKED
      this.db
        .prepare(`UPDATE ride_requests SET status = 'BOOKED' WHERE request_id = ?`)
        .run(reqRow.request_id);

      // 4. Create persistent booking record
      this.db
        .prepare(`
          INSERT INTO bookings (
            booking_number, request_id, offer_id, company_id, vehicle_id,
            flight_id, hotel_id, pickup, busy_end, price_inr, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)
        `)
        .run(
          bookingNumber,
          reqRow.request_id,
          offerId,
          offer.company_id,
          offer.vehicle_id,
          reqRow.flight_id,
          reqRow.hotel_id,
          r6.busyStart,
          r6.busyEnd,
          offer.price_inr,
          nowIso
        );
    });
    tx();

    return this.getBookingSummary(bookingNumber);
  }

  /**
   * Flow 1 (M5): Get Persistent Booking Summary by 10-Digit Booking Number
   * Looks up the 10-digit booking number.
   * Returns full summary (flight, hotel, pickup, busy window, supplier, vehicle, price, and change request history).
   * Works after backend restart. Returns 404 "not found" if invalid.
   */
  getBookingSummary(bookingNumber) {
    const b = this.db
      .prepare('SELECT * FROM bookings WHERE booking_number = ?')
      .get(bookingNumber);
    if (!b) {
      throw new AppError('not found', 404, 'BOOKING_NOT_FOUND');
    }

    const reqRow = this.db
      .prepare('SELECT * FROM ride_requests WHERE request_id = ?')
      .get(b.request_id);
    const flight = this.catalog.flights.get(b.flight_id);
    const hotel = this.catalog.hotels.get(b.hotel_id);
    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const company = this.catalog.companies.get(b.company_id);
    const vehicle = company.vehicles.find((v) => v.vehicle_id === b.vehicle_id);

    const changeRequests = this.db
      .prepare('SELECT * FROM change_requests WHERE booking_number = ? ORDER BY created_at DESC')
      .all(bookingNumber);

    return {
      booking_number: b.booking_number,
      request_id: b.request_id,
      status: b.status,
      traveler_name: reqRow.traveler_name,
      flight: {
        flight_id: flight.flight_id,
        airline: flight.airline,
        flight_number: flight.flight_number,
        from: flight.from,
        to: flight.to,
        arrival_local: normalizeLocalDateTime(flight.arrival_local),
      },
      hotel: {
        hotel_id: hotel.hotel_id,
        name: hotel.name,
        city: hotel.city,
        area: hotel.area,
      },
      pickup: b.pickup,
      busy_end: b.busy_end,
      drive_minutes: route.drive_minutes,
      supplier: {
        company_id: company.company_id,
        name: company.name,
        rating: company.rating,
      },
      car: vehicle,
      passengers: {
        adults: reqRow.adults,
        child_ages: JSON.parse(reqRow.child_ages_json),
        large_bags: reqRow.large_bags,
        small_bags: reqRow.small_bags,
      },
      price_inr: b.price_inr,
      change_requests: changeRequests,
    };
  }

  /**
   * Flow 1 & 2 (M7, R9): Traveler submits Change Request
   * Creates a change request for the supplier to review.
   */
  createChangeRequest(bookingNumber, payload) {
    const b = this.db
      .prepare('SELECT * FROM bookings WHERE booking_number = ?')
      .get(bookingNumber);
    if (!b) {
      throw new AppError('not found', 404, 'BOOKING_NOT_FOUND');
    }

    const targetFlightId = payload.new_flight_id || b.flight_id;
    const newFlight = this.catalog.flights.get(targetFlightId);
    const hotel = this.catalog.hotels.get(b.hotel_id);
    const airport = newFlight ? this.catalog.airports.get(newFlight.to) : undefined;

    // Validate R1 on new flight (must exist and serve hotel city)
    if (!newFlight || !airport || !(airport.serves_cities ?? []).includes(hotel.city)) {
      throw AppError.ruleViolation(
        'R1',
        `New flight '${targetFlightId}' is invalid or its arrival airport does not serve ${hotel.city}.`
      );
    }

    // Validate R2 on new pickup time
    const r2 = RuleEngine.checkR2(newFlight.arrival_local, payload.new_pickup);
    if (!r2.valid) {
      throw AppError.ruleViolation('R2', r2.reason, r2.details);
    }

    const route = this.catalog.getRoute(newFlight.to, hotel.city, hotel.area);
    const newBusyEnd = addMinutes(r2.resolvedPickup, 2 * route.drive_minutes);

    const cntRow = this.db.prepare('SELECT COUNT(*) as cnt FROM change_requests').get();
    const changeId = `CHG-${String(cntRow.cnt + 1).padStart(4, '0')}`;

    this.db
      .prepare(`
        INSERT INTO change_requests (
          change_id, booking_number, new_flight_id, new_pickup, new_busy_end, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'WAITING', ?)
      `)
      .run(
        changeId,
        bookingNumber,
        targetFlightId,
        r2.resolvedPickup,
        newBusyEnd,
        new Date().toISOString()
      );

    return this.db.prepare('SELECT * FROM change_requests WHERE change_id = ?').get(changeId);
  }

  /**
   * Flow 2 (M7, R9): Supplier Responds to Change Request (ACCEPT or REJECT)
   * If ACCEPT: backend verifies R1, R2, supplier airport & opening hours, and R6
   * (that the same vehicle_id is free during new busy window, ignoring the current booking's old slot).
   * If REJECT: marks change request REJECTED and keeps the old booking intact.
   */
  respondToChangeRequest(changeId, action) {
    const chg = this.db
      .prepare('SELECT * FROM change_requests WHERE change_id = ?')
      .get(changeId);
    if (!chg) {
      throw new AppError(`Change request '${changeId}' not found.`, 404, 'CHANGE_REQUEST_NOT_FOUND');
    }
    if (chg.status !== 'WAITING') {
      throw AppError.ruleViolation('R9', `Change request ${changeId} is already ${chg.status}.`);
    }

    const booking = this.db
      .prepare('SELECT * FROM bookings WHERE booking_number = ?')
      .get(chg.booking_number);

    if (action === 'REJECT') {
      this.db
        .prepare(
          `UPDATE change_requests SET status = 'REJECTED', resolution_note = 'Rejected by supplier', resolved_at = ? WHERE change_id = ?`
        )
        .run(new Date().toISOString(), changeId);
      return this.getBookingSummary(chg.booking_number);
    }

    // Action === 'ACCEPT': Enforce Rule R9 (R2 + R4 opening hours/airport + R6 same car free at new time)
    const newFlight = this.catalog.flights.get(chg.new_flight_id);
    const hotel = this.catalog.hotels.get(booking.hotel_id);
    const route = this.catalog.getRoute(newFlight.to, hotel.city, hotel.area);
    const company = this.catalog.companies.get(booking.company_id);

    // Verify supplier works at new flight's airport
    if (!company.airports.includes(newFlight.to)) {
      throw AppError.ruleViolation(
        'R9',
        `Cannot accept change request: ${company.name} does not operate at airport ${newFlight.to}.`
      );
    }

    const r2 = RuleEngine.checkR2(newFlight.arrival_local, chg.new_pickup);
    if (!r2.valid) {
      throw AppError.ruleViolation('R9', r2.reason, r2.details);
    }

    // Check R6: Same vehicle_id must be free at [new_pickup, new_pickup + 2*drive_minutes], ignoring current booking_number
    const r6 = RuleEngine.checkR6(
      booking.vehicle_id,
      chg.new_pickup,
      route.drive_minutes,
      this.getAllBusySlots(),
      booking.booking_number
    );
    if (!r6.valid) {
      throw AppError.ruleViolation(
        'R9',
        `Cannot accept change request (Rule R9/R6): ${r6.reason}`,
        r6.details
      );
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE bookings SET flight_id = ?, pickup = ?, busy_end = ? WHERE booking_number = ?`
        )
        .run(chg.new_flight_id, r6.busyStart, r6.busyEnd, booking.booking_number);

      this.db
        .prepare(`UPDATE ride_requests SET flight_id = ?, pickup = ? WHERE request_id = ?`)
        .run(chg.new_flight_id, r6.busyStart, booking.request_id);

      this.db
        .prepare(
          `UPDATE change_requests SET status = 'ACCEPTED', resolution_note = 'Accepted and booking updated', resolved_at = ? WHERE change_id = ?`
        )
        .run(new Date().toISOString(), changeId);
    });
    tx();

    return this.getBookingSummary(booking.booking_number);
  }

  /**
   * Flow 1 (Feature 3): Ride Cancellation at Booking Stage
   * Enforces that booking exists, is CONFIRMED, and cancels it in an SQLite transaction.
   * Cancelling automatically releases the vehicle schedule lock because getAllBusySlots() filters by status = 'CONFIRMED'.
   * Also cancels the associated ride_request, ride_offer, and rejects any pending WAITING change requests.
   */
  cancelBooking(bookingNumber) {
    const booking = this.db
      .prepare('SELECT * FROM bookings WHERE booking_number = ?')
      .get(bookingNumber);

    if (!booking) {
      throw new AppError(`Booking '${bookingNumber}' not found.`, 404, 'BOOKING_NOT_FOUND');
    }

    if (booking.status === 'CANCELLED') {
      throw AppError.ruleViolation('R8', `Booking ${bookingNumber} is already cancelled.`);
    }

    if (booking.status !== 'CONFIRMED') {
      throw AppError.ruleViolation('R8', `Cannot cancel booking with status '${booking.status}'.`);
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`UPDATE bookings SET status = 'CANCELLED' WHERE booking_number = ?`)
        .run(bookingNumber);

      this.db
        .prepare(`UPDATE ride_requests SET status = 'CANCELLED' WHERE request_id = ?`)
        .run(booking.request_id);

      this.db
        .prepare(`UPDATE ride_offers SET status = 'CANCELLED' WHERE offer_id = ?`)
        .run(booking.offer_id);

      this.db
        .prepare(
          `UPDATE change_requests SET status = 'REJECTED', resolution_note = 'Cancelled due to ride cancellation', resolved_at = ? WHERE booking_number = ? AND status = 'WAITING'`
        )
        .run(new Date().toISOString(), bookingNumber);
    });

    tx();

    return this.getBookingSummary(bookingNumber);
  }

  /**
   * Retrieves single change request along with its corresponding booking summary.
   */
  getChangeRequest(changeId) {
    const chg = this.db
      .prepare('SELECT * FROM change_requests WHERE change_id = ?')
      .get(changeId);
    if (!chg) {
      throw new AppError(`Change request '${changeId}' not found.`, 404, 'CHANGE_REQUEST_NOT_FOUND');
    }
    const booking = this.getBookingSummary(chg.booking_number);
    return {
      ...chg,
      booking,
    };
  }
}
