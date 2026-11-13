import { ApiResponse } from '../core/ApiResponse.js';

export class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  /**
   * Endpoint 14: POST /admin/reset-demo
   * Resets the SQLite state back to initial seed data.
   */
  resetDemo(_req, res) {
    const result = this.adminService.resetDatabaseToSeed();
    res.json(ApiResponse.ok(result, 'Demo database reset to initial state'));
  }
}
