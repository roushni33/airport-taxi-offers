import { Router } from 'express';

export function createCatalogRouter(controller) {
  const router = Router();

  const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // 1. Bootstrap Catalog
  router.get(
    '/bootstrap',
    asyncHandler((req, res) => controller.getBootstrap(req, res))
  );

  // 2. Route Price & Pickup Preview
  router.get(
    '/route-preview',
    asyncHandler((req, res) => controller.getRoutePreview(req, res))
  );

  return router;
}
