import { ApiResponse } from '../core/ApiResponse.js';

export class BookingController {
  constructor(bookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Endpoint 8: POST /offers/:offerId/book
   * Confirms a taxi booking, generates a 10-digit booking number, and sets vehicle busy window.
   */
  bookOffer(req, res) {
    const booking = this.bookingService.bookOffer(req.params.offerId);
    res.status(201).json(ApiResponse.ok(booking, 'Taxi booked successfully'));
  }

  /**
   * Endpoint 9: POST /offers/:offerId/reject
   * Rejects an assigned taxi offer permanently.
   */
  rejectOffer(req, res) {
    const rejected = this.bookingService.rejectOffer(req.params.offerId);
    res.json(ApiResponse.ok(rejected, 'Taxi offer rejected'));
  }

  /**
   * Endpoint 10: GET /bookings/:bookingNumber
   * Retrieves booking summary by unique 10-digit booking number.
   */
  getBooking(req, res) {
    const summary = this.bookingService.getBookingSummary(req.params.bookingNumber);
    res.json(ApiResponse.ok(summary, 'Booking summary fetched'));
  }

  /**
   * Endpoint 11: POST /bookings/:bookingNumber/change-request
   * Creates a flight or pickup time change request for a booking.
   */
  createChangeRequest(req, res) {
    const chg = this.bookingService.createChangeRequest(req.params.bookingNumber, req.body);
    res.status(201).json(ApiResponse.ok(chg, 'Change request submitted'));
  }

  /**
   * Endpoint 12: POST /change-requests/:changeId/respond
   * Supplier accepts or rejects a change request.
   */
  respondToChangeRequest(req, res) {
    const updated = this.bookingService.respondToChangeRequest(
      req.params.changeId,
      req.body.action
    );
    res.json(ApiResponse.ok(updated, `Change request ${req.body.action}ED`));
  }
}
