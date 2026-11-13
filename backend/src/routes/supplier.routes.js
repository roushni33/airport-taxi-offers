import { Router } from 'express';

export function createSupplierRouter(controller) {
  const router = Router();

  const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // 6. Supplier Dashboard (M2, R4, S2)
  router.get(
    '/:companyId/dashboard',
    asyncHandler((req, res) => controller.getDashboard(req, res))
  );

  // 7. Supplier Assigns a Car Offer (M3, R7, G1, G4)
  router.post(
    '/:companyId/offers',
    asyncHandler((req, res) => controller.assignOffer(req, res))
  );

  return router;
}
