import Database from 'better-sqlite3';
import path from 'path';
import { normalizeLocalDateTime } from '../core/timeUtils.js';
import { logger } from '../config/logger.js';

export function initDatabase(dbFilePath, catalog) {
  const resolvedPath = dbFilePath === ':memory:' ? ':memory:' : path.resolve(dbFilePath);
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create persistent tables for Ride Requests, Ride Offers, Bookings, and Change Requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS ride_requests (
      request_id TEXT PRIMARY KEY,
      traveler_name TEXT NOT NULL,
      flight_id TEXT NOT NULL,
      hotel_id TEXT NOT NULL,
      adults INTEGER NOT NULL,
      child_ages_json TEXT NOT NULL,
      large_bags INTEGER NOT NULL,
      small_bags INTEGER NOT NULL,
      pickup TEXT NOT NULL,
      car_type TEXT,
      price_inr INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | BOOKED | SHARED
      shared_with_request_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ride_offers (
      offer_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      price_inr INTEGER NOT NULL,
      expires_at TEXT,                     -- Feature G4: Optional offer expiry timestamp
      status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | BOOKED | REJECTED | NOT_CHOSEN | EXPIRED
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES ride_requests(request_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      booking_number TEXT PRIMARY KEY,     -- Unique 10-digit booking number (Rule R8 / M5)
      request_id TEXT NOT NULL,
      offer_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      flight_id TEXT NOT NULL,
      hotel_id TEXT NOT NULL,
      pickup TEXT NOT NULL,
      busy_end TEXT NOT NULL,              -- pickup + 2 * drive_minutes (Rule R6)
      price_inr INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_requests (
      change_id TEXT PRIMARY KEY,
      booking_number TEXT NOT NULL,
      new_flight_id TEXT NOT NULL,
      new_pickup TEXT NOT NULL,
      new_busy_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING | ACCEPTED | REJECTED (Rule R9 / M7)
      resolution_note TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (booking_number) REFERENCES bookings(booking_number)
    );
  `);

  seedInitialOpenRequests(db, catalog);
  return db;
}

export function seedInitialOpenRequests(db, catalog) {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM ride_requests').get();
  if (countRow.cnt === 0) {
    const insertReq = db.prepare(`
      INSERT INTO ride_requests (
        request_id, traveler_name, flight_id, hotel_id, adults,
        child_ages_json, large_bags, small_bags, pickup, car_type, price_inr, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `);

    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const req of catalog.seedOpenRequests) {
        insertReq.run(
          req.request_id,
          req.traveler_name,
          req.flight_id,
          req.hotel_id,
          req.adults,
          JSON.stringify(req.child_ages),
          req.large_bags,
          req.small_bags,
          normalizeLocalDateTime(req.pickup),
          req.car_type || null,
          req.price_inr,
          nowIso
        );
      }
    });
    tx();
    logger.info(`Seeded ${catalog.seedOpenRequests.length} open requests from open_requests.json`);
  }
}
