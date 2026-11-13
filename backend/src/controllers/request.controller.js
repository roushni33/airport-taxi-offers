import { ApiResponse } from '../core/ApiResponse.js';

export class RequestController {
  constructor(requestService) {
    this.requestService = requestService;
  }

  /**
   * Endpoint 3: POST /requests
   * Creates a new ride request after validating R1, R2, and R3.
   */
  createRequest(req, res) {
    const created = this.requestService.createRequest(req.body);
    res.status(201).json(ApiResponse.ok(created, 'Ride request posted'));
  }

  /**
   * Endpoint 4: GET /requests
   * Lists all ride requests with offer counts and supplier matching diagnostics.
   */
  listRequests(_req, res) {
    const list = this.requestService.listAllRequests();
    res.json(ApiResponse.ok(list, 'Requests fetched'));
  }

  /**
   * Endpoint 5: GET /requests/:requestId
   * Retrieves single request details and assigned offers with sort and filter options.
   */
  getRequestById(req, res) {
    const data = this.requestService.getRequestById(req.params.requestId, req.query);
    res.json(ApiResponse.ok(data, 'Request details fetched'));
  }

  /**
   * Endpoint 13: GET /requests/:requestId/shareable
   * Finds matching open requests that can share a ride.
   */
  getShareableMatches(req, res) {
    const matches = this.requestService.findShareableMatches(req.params.requestId);
    res.json(ApiResponse.ok(matches, 'Shareable ride candidates fetched'));
  }

  /**
   * Endpoint 13: POST /requests/share
   * Merges two compatible ride requests into a shared ride.
   */
  shareRequests(req, res) {
    const { request_id_1, request_id_2 } = req.body;
    const result = this.requestService.shareRequests(request_id_1, request_id_2);
    res.json(ApiResponse.ok(result, 'Ride requests merged into shared ride'));
  }
}
