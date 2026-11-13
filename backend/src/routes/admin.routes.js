import { Router } from 'express';

export function createAdminRouter(controller) {
  const router = Router();

  const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // 14. Reset Demo State
  router.post(
    '/reset-demo',
    asyncHandler((req, res) => controller.resetDemo(req, res))
  );

  return router;
}
