import fs from 'fs';
import path from 'path';

const VALID_DESTINATION_AIRPORTS = new Set(['NRT', 'HND', 'KIX', 'DXB', 'AUH']);

/**
 * In-memory read-only store for all 7 hackathon JSON files.
 * Never writes to or modifies the `data/` directory.
 */
export class CatalogStore {
  constructor(dataRootDir) {
    this.airports = new Map();
    this.flights = new Map();
    this.arrivalFlights = []; // Filtered 240 flights landing at NRT/HND/KIX/DXB/AUH
    this.hotels = new Map();
    this.routes = new Map();  // Key: `${airport}|${city}|${area}`
    this.companies = new Map();
    this.preBookedRides = [];
    this.seedOpenRequests = [];

    this.loadAll(dataRootDir);
  }

  readJson(relativePath, rootDir) {
    const fullPath = path.resolve(rootDir, relativePath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  }

  static routeKey(airport, city, area) {
    return `${airport}|${city}|${area}`;
  }

  loadAll(rootDir) {
    const airportsList = this.readJson('catalog/airports.json', rootDir);
    airportsList.forEach((a) => this.airports.set(a.code, a));

    const flightsList = this.readJson('catalog/flights.json', rootDir);
    flightsList.forEach((f) => {
      this.flights.set(f.flight_id, f);
      if (VALID_DESTINATION_AIRPORTS.has(f.to)) {
        this.arrivalFlights.push(f);
      }
    });

    const hotelsList = this.readJson('catalog/hotels.json', rootDir);
    hotelsList.forEach((h) => this.hotels.set(h.hotel_id, h));

    const routesList = this.readJson('problem-2/routes.json', rootDir);
    routesList.forEach((r) =>
      this.routes.set(CatalogStore.routeKey(r.airport, r.city, r.area), r)
    );

    const companiesList = this.readJson('problem-2/taxi_companies.json', rootDir);
    companiesList.forEach((c) => this.companies.set(c.company_id, c));

    this.preBookedRides = this.readJson('problem-2/booked_rides.json', rootDir);
    this.seedOpenRequests = this.readJson('problem-2/open_requests.json', rootDir);
  }

  getRoute(airport, city, area) {
    return this.routes.get(CatalogStore.routeKey(airport, city, area));
  }
}

