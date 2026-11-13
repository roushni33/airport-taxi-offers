import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { logger } from './config/logger.js';
import { CatalogStore } from './database/catalogStore.js';
import { initDatabase } from './database/sqlite.js';

// Services
import { CatalogService } from './services/catalog.service.js';
import { BookingService } from './services/booking.service.js';
import { RequestService } from './services/request.service.js';
import { SupplierService } from './services/supplier.service.js';
import { AdminService } from './services/admin.service.js';

// Controllers
import { CatalogController } from './controllers/catalog.controller.js';
import { BookingController } from './controllers/booking.controller.js';
import { RequestController } from './controllers/request.controller.js';
import { SupplierController } from './controllers/supplier.controller.js';
import { AdminController } from './controllers/admin.controller.js';

// Routes & Error Handler
import { createApiRouter } from './routes/api.routes.js';
import { globalErrorHandler } from './core/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

// Log every incoming HTTP request
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.originalUrl }, 'Incoming HTTP Request');
  next();
});

// 1. Load Read-Only Catalog Data from ../data
const catalog = new CatalogStore(ENV.DATA_DIR);
logger.info(
  {
    arrivalFlights: catalog.arrivalFlights.length,
    hotels: catalog.hotels.size,
    routes: catalog.routes.size,
    companies: catalog.companies.size,
    preBookedRides: catalog.preBookedRides.length,
  },
  'Loaded read-only catalog files from disk'
);

// 2. Initialize Persistent SQLite Database (state.db)
const db = initDatabase(ENV.DB_FILE, catalog);

// 3. Wire Modular Services
const catalogService = new CatalogService(catalog);
const bookingService = new BookingService(db, catalog);
const requestService = new RequestService(db, catalog, bookingService);
const supplierService = new SupplierService(db, catalog, bookingService);
const adminService = new AdminService(db, catalog);

// 4. Wire Modular Controllers
const catalogController = new CatalogController(catalogService);
const bookingController = new BookingController(bookingService);
const requestController = new RequestController(requestService);
const supplierController = new SupplierController(supplierService);
const adminController = new AdminController(adminService);

// 5. Mount API Routes
app.use(
  '/api/v1',
  createApiRouter({
    catalogController,
    requestController,
    supplierController,
    bookingController,
    adminController,
  })
);

// 6. Global Error Handler
app.use(globalErrorHandler);

app.listen(ENV.PORT, () => {
  logger.info(`Airport Taxi Offers Backend running on http://localhost:${ENV.PORT}/api/v1`);
});
