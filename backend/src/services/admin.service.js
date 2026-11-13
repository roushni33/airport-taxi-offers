import { seedInitialOpenRequests } from '../database/sqlite.js';

export class AdminService {
  constructor(db, catalog) {
    this.db = db;
    this.catalog = catalog;
  }

  /**
   * Resets the SQLite state back to the initial seeded open requests and pre-booked rides.
   * Useful before live judge demonstrations.
   */
  resetDatabaseToSeed() {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM change_requests').run();
      this.db.prepare('DELETE FROM bookings').run();
      this.db.prepare('DELETE FROM ride_offers').run();
      this.db.prepare('DELETE FROM ride_requests').run();
    });
    tx();
    seedInitialOpenRequests(this.db, this.catalog);
    return { reset: true, open_requests_seeded: this.catalog.seedOpenRequests.length };
  }
}
