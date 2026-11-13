import { Router } from 'express';

export function createRequestRouter(controller) {
  const router = Router();

  const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // 3. Create Ride Request (M1, M2, G2)
  router.post(
    '/',
    asyncHandler((req, res) => controller.createRequest(req, res))
  );

  // 4. List All Requests
  router.get(
    '/',
    asyncHandler((req, res) => controller.listRequests(req, res))
  );

  // 13. Stretch S1: Merge Shareable Requests
  router.post(
    '/share',
    asyncHandler((req, res) => controller.shareRequests(req, res))
  );

  // 5. Get Single Request & Offers (with G5 Sort & Filter)
  router.get(
    '/:requestId',
    asyncHandler((req, res) => controller.getRequestById(req, res))
  );

  // 13. Stretch S1: Find Shareable Ride Matches
  router.get(
    '/:requestId/shareable',
    asyncHandler((req, res) => controller.getShareableMatches(req, res))
  );

  return router;
}
