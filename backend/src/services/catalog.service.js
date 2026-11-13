import { RuleEngine } from '../rules/ruleEngine.js';
import { AppError } from '../core/AppError.js';
import { addMinutes, normalizeLocalDateTime } from '../core/timeUtils.js';

export class CatalogService {
  constructor(catalog) {
    this.catalog = catalog;
  }

  /**
   * 1. Bootstrap Catalog Data
   * Returns the 240 arrival flights (landing at NRT, HND, KIX, DXB, AUH),
   * all 49 hotels, 10 airports, 33 routes, 11 taxi companies, and car types.
   */
  getBootstrapCatalog() {
    return {
      flights: this.catalog.arrivalFlights.map((f) => ({
        ...f,
        arrival_local: normalizeLocalDateTime(f.arrival_local),
        departure_local: normalizeLocalDateTime(f.departure_local),
        earliest_pickup: addMinutes(f.arrival_local, 60),
      })),
      hotels: Array.from(this.catalog.hotels.values()),
      airports: Array.from(this.catalog.airports.values()),
      routes: Array.from(this.catalog.routes.values()),
      companies: Array.from(this.catalog.companies.values()),
      car_types: ['HATCHBACK', 'SEDAN', 'SUV', 'BUS'],
    };
  }

  /**
   * 2. Route & Price Range Preview (Flow 1 step 1)
   * Validates R1 (airport serves hotel city).
   * Returns earliest_pickup (arrival_local + 60m), drive_minutes, distance_km, price_min_inr, and price_max_inr.
   */
  getRoutePreview(flightId, hotelId) {
    const flight = this.catalog.flights.get(flightId);
    const hotel = this.catalog.hotels.get(hotelId);
    const airport = flight ? this.catalog.airports.get(flight.to) : undefined;

    // Validate R1 on route preview
    const r1 = RuleEngine.checkR1({
      flight,
      hotel,
      airport,
      adults: 1,
      child_ages: [],
      large_bags: 0,
      small_bags: 0,
    });

    if (!r1.valid) {
      throw AppError.ruleViolation('R1', r1.reason, r1.details);
    }

    const route = this.catalog.getRoute(flight.to, hotel.city, hotel.area);
    const earliestPickup = addMinutes(flight.arrival_local, 60);

    return {
      flight: {
        ...flight,
        arrival_local: normalizeLocalDateTime(flight.arrival_local),
      },
      hotel,
      airport,
      earliest_pickup: earliestPickup,
      route,
    };
  }
}
