import { Router } from 'express';
import { createCatalogRouter } from './catalog.routes.js';
import { createRequestRouter } from './request.routes.js';
import { createSupplierRouter } from './supplier.routes.js';
import { createBookingRouter } from './booking.routes.js';
import { createAdminRouter } from './admin.routes.js';

export function createApiRouter({
  catalogController,
  requestController,
  supplierController,
  bookingController,
  adminController,
}) {
  const router = Router();

  router.use('/catalog', createCatalogRouter(catalogController));
  router.use('/requests', createRequestRouter(requestController));
  router.use('/suppliers', createSupplierRouter(supplierController));
  router.use('/', createBookingRouter(bookingController));
  router.use('/admin', createAdminRouter(adminController));

  return router;
}
