import { Router } from 'express';

export function createBookingRouter(controller) {
  const router = Router();

  const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // 8. Traveler Books an Offer (M4, M6, R8)
  router.post(
    '/offers/:offerId/book',
    asyncHandler((req, res) => controller.bookOffer(req, res))
  );

  // 9. Traveler Rejects an Offer (M4, R8)
  router.post(
    '/offers/:offerId/reject',
    asyncHandler((req, res) => controller.rejectOffer(req, res))
  );

  // 10. Get Booking Summary by 10-Digit Number (M5)
  router.get(
    '/bookings/:bookingNumber',
    asyncHandler((req, res) => controller.getBooking(req, res))
  );

  // Flow 1 (Feature 3): Ride Cancellation at Booking Stage
  router.post(
    '/bookings/:bookingNumber/cancel',
    asyncHandler((req, res) => controller.cancelBooking(req, res))
  );

  // 11. Traveler Sends Flight/Pickup Change Request (M7, R9)
  router.post(
    '/bookings/:bookingNumber/change-request',
    asyncHandler((req, res) => controller.createChangeRequest(req, res))
  );

  // 12. Supplier Accepts or Rejects Change Request (M7, R9)
  router.post(
    '/change-requests/:changeId/respond',
    asyncHandler((req, res) => controller.respondToChangeRequest(req, res))
  );

  // Get Single Change Request Details
  router.get(
    '/change-requests/:changeId',
    asyncHandler((req, res) => controller.getChangeRequest(req, res))
  );

  return router;
}
