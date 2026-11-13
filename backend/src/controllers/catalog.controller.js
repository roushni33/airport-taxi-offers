import { ApiResponse } from '../core/ApiResponse.js';

export class CatalogController {
  constructor(catalogService) {
    this.catalogService = catalogService;
  }

  /**
   * Endpoint 1: GET /catalog/bootstrap
   * Returns bootstrap catalog data: 240 arrival flights, hotels, airports, routes, and companies.
   */
  getBootstrap(_req, res) {
    const data = this.catalogService.getBootstrapCatalog();
    res.json(ApiResponse.ok(data, 'Catalog loaded'));
  }

  /**
   * Endpoint 2: GET /catalog/route-preview?flight_id=...&hotel_id=...
   * Returns route price range and earliest pickup time.
   */
  getRoutePreview(req, res) {
    const { flight_id, hotel_id } = req.query;
    const data = this.catalogService.getRoutePreview(flight_id, hotel_id);
    res.json(ApiResponse.ok(data, 'Route preview ready'));
  }
}
