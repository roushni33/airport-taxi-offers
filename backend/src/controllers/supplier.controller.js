import { ApiResponse } from '../core/ApiResponse.js';

export class SupplierController {
  constructor(supplierService) {
    this.supplierService = supplierService;
  }

  /**
   * Endpoint 6: GET /suppliers/:companyId/dashboard
   * Returns servable requests, current offers, change requests, and vehicle busy schedule.
   */
  getDashboard(req, res) {
    const data = this.supplierService.getSupplierDashboard(req.params.companyId);
    res.json(ApiResponse.ok(data, 'Supplier dashboard fetched'));
  }

  /**
   * Endpoint 7: POST /suppliers/:companyId/offers
   * Assigns a supplier vehicle and price to an open request after verifying R4, R5, R6, and R3.
   */
  assignOffer(req, res) {
    const offer = this.supplierService.assignCarOffer(req.params.companyId, req.body);
    res.status(201).json(ApiResponse.ok(offer, 'Car assigned to request'));
  }
}
