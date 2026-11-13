import {
  addMinutes,
  doIntervalsOverlap,
  isWithinServiceHours,
  normalizeLocalDateTime,
  toEpochMinutes,
} from '../core/timeUtils.js';

export class RuleEngine {
  /**
   * RULE R1: Ride Request Catalog & Passenger Validity
   * - Flight and hotel must exist in catalog.
   * - Arrival airport (flight.to) must serve hotel.city (airports.serves_cities).
   * - adults >= 1.
   * - Every child age in child_ages must be an integer 0..17.
   */
  static checkR1({ flight, hotel, airport, adults, child_ages, large_bags, small_bags, car_type }) {
    if (!flight) {
      return { valid: false, ruleId: 'R1', reason: 'Selected flight does not exist in the catalog.' };
    }
    if (!hotel) {
      return { valid: false, ruleId: 'R1', reason: 'Selected hotel does not exist in the catalog.' };
    }
    if (!airport) {
      return {
        valid: false,
        ruleId: 'R1',
        reason: `Arrival airport '${flight.to}' does not exist in the catalog.`,
      };
    }

    const servedCities = airport.serves_cities ?? [];
    if (!servedCities.includes(hotel.city)) {
      return {
        valid: false,
        ruleId: 'R1',
        reason: `Arrival airport ${airport.code} (${airport.name}) serves [${
          servedCities.join(', ') || 'no international cities'
        }], which does not serve hotel city '${hotel.city}'.`,
        details: { airport: airport.code, serves_cities: servedCities, hotel_city: hotel.city },
      };
    }

    if (!Number.isInteger(adults) || adults < 1) {
      return {
        valid: false,
        ruleId: 'R1',
        reason: 'Ride request must include at least 1 adult (adults >= 1).',
      };
    }

    if (!Array.isArray(child_ages)) {
      return { valid: false, ruleId: 'R1', reason: 'child_ages must be an array of integers.' };
    }

    for (const age of child_ages) {
      if (!Number.isInteger(age) || age < 0 || age > 17) {
        return {
          valid: false,
          ruleId: 'R1',
          reason: `Invalid child age '${age}'. A child must be aged between 0 and 17 inclusive.`,
          details: { invalid_age: age },
        };
      }
    }

    if (
      !Number.isInteger(large_bags) ||
      large_bags < 0 ||
      !Number.isInteger(small_bags) ||
      small_bags < 0
    ) {
      return {
        valid: false,
        ruleId: 'R1',
        reason: 'Bag counts (large_bags, small_bags) must be non-negative integers.',
      };
    }

    if (car_type && !['HATCHBACK', 'SEDAN', 'SUV', 'BUS'].includes(car_type)) {
      return {
        valid: false,
        ruleId: 'R1',
        reason: `Invalid car_type '${car_type}'. Allowed types: HATCHBACK, SEDAN, SUV, BUS.`,
      };
    }

    return { valid: true, ruleId: null, reason: null };
  }

  /**
   * RULE R2: Pickup Time Validation
   * - Earliest pickup is arrival_local + 60 minutes.
   * - If pickup is omitted, defaults to earliest pickup.
   */
  static checkR2(arrivalLocal, requestedPickup = null) {
    const earliestPickup = addMinutes(arrivalLocal, 60);
    const resolvedPickup =
      requestedPickup && String(requestedPickup).trim() !== ''
        ? normalizeLocalDateTime(requestedPickup)
        : earliestPickup;

    let pickupMins;
    try {
      pickupMins = toEpochMinutes(resolvedPickup);
    } catch {
      return {
        valid: false,
        ruleId: 'R2',
        reason: `Invalid pickup time format: '${requestedPickup}'. Expected YYYY-MM-DDTHH:MM.`,
        resolvedPickup,
        earliestPickup,
      };
    }

    const earliestMins = toEpochMinutes(earliestPickup);

    if (pickupMins < earliestMins) {
      return {
        valid: false,
        ruleId: 'R2',
        reason: `Pickup time (${resolvedPickup}) must be at least 60 minutes after flight landing (${normalizeLocalDateTime(
          arrivalLocal
        )}). Earliest allowed pickup is ${earliestPickup}.`,
        resolvedPickup,
        earliestPickup,
        details: {
          arrival_local: normalizeLocalDateTime(arrivalLocal),
          earliest_pickup: earliestPickup,
          attempted_pickup: resolvedPickup,
        },
      };
    }

    return { valid: true, ruleId: null, reason: null, resolvedPickup, earliestPickup };
  }

  /**
   * RULE R3: Route Price Range Validation
   * - Validates that `priceInr` is inside `[route.price_min_inr, route.price_max_inr]`.
   */
  static checkR3(priceInr, route) {
    if (!route) {
      return {
        valid: false,
        ruleId: 'R3',
        reason: 'No valid route found for the selected airport and hotel area.',
      };
    }

    if (typeof priceInr !== 'number' || !Number.isInteger(priceInr)) {
      return {
        valid: false,
        ruleId: 'R3',
        reason: 'Price must be a whole integer in INR.',
        details: { price_min_inr: route.price_min_inr, price_max_inr: route.price_max_inr },
      };
    }

    if (priceInr < route.price_min_inr || priceInr > route.price_max_inr) {
      return {
        valid: false,
        ruleId: 'R3',
        reason: `Price ₹${priceInr} is outside the allowed route price range of ₹${route.price_min_inr} – ₹${route.price_max_inr} for ${route.airport} to ${route.area} (${route.city}).`,
        details: {
          airport: route.airport,
          city: route.city,
          area: route.area,
          price_min_inr: route.price_min_inr,
          price_max_inr: route.price_max_inr,
          attempted_price_inr: priceInr,
        },
      };
    }

    return { valid: true, ruleId: null, reason: null };
  }

  /**
   * RULE R5: Car Fits (Passengers, Large Bags, Small Bags, Optional Car Type G2)
   * - Seats >= adults + child_ages.length
   * - large_bags >= request.large_bags (checked separately)
   * - small_bags >= request.small_bags (checked separately)
   * - If request.car_type is set (G2), vehicle.type must match.
   */
  static checkR5(vehicle, request) {
    const totalPassengers = request.adults + request.child_ages.length;

    if (request.car_type && vehicle.type !== request.car_type) {
      return {
        valid: false,
        ruleId: 'R5',
        reason: `Car ${vehicle.vehicle_id} is a ${vehicle.type}, but the traveler requested car type ${request.car_type}.`,
        details: {
          vehicle_id: vehicle.vehicle_id,
          vehicle_type: vehicle.type,
          required_type: request.car_type,
        },
      };
    }

    if (vehicle.seats < totalPassengers) {
      return {
        valid: false,
        ruleId: 'R5',
        reason: `Car ${vehicle.vehicle_id} (${vehicle.type}) has ${vehicle.seats} seats, which cannot fit ${totalPassengers} passengers (${request.adults} adults + ${request.child_ages.length} children).`,
        details: {
          vehicle_id: vehicle.vehicle_id,
          seats: vehicle.seats,
          required_seats: totalPassengers,
        },
      };
    }

    if (vehicle.large_bags < request.large_bags) {
      return {
        valid: false,
        ruleId: 'R5',
        reason: `Car ${vehicle.vehicle_id} (${vehicle.type}) fits ${vehicle.large_bags} large bags, but the request requires ${request.large_bags} large bags.`,
        details: {
          vehicle_id: vehicle.vehicle_id,
          large_bags: vehicle.large_bags,
          required_large_bags: request.large_bags,
        },
      };
    }

    if (vehicle.small_bags < request.small_bags) {
      return {
        valid: false,
        ruleId: 'R5',
        reason: `Car ${vehicle.vehicle_id} (${vehicle.type}) fits ${vehicle.small_bags} small bags, but the request requires ${request.small_bags} small bags.`,
        details: {
          vehicle_id: vehicle.vehicle_id,
          small_bags: vehicle.small_bags,
          required_small_bags: request.small_bags,
        },
      };
    }

    return { valid: true, ruleId: null, reason: null };
  }

  /**
   * RULE R6: Car is Free
   * - Car busy window is [pickup, pickup + 2 * drive_minutes].
   * - Checks against all busySlots (from booked_rides.json + confirmed bookings).
   */
  static checkR6(vehicleId, pickupTime, driveMinutes, busySlots, ignoreBookingId = null) {
    const busyStart = normalizeLocalDateTime(pickupTime);
    const busyEnd = addMinutes(busyStart, 2 * driveMinutes);

    for (const slot of busySlots) {
      if (slot.vehicle_id !== vehicleId) continue;
      if (ignoreBookingId && slot.source_id === ignoreBookingId) continue;

      if (doIntervalsOverlap(busyStart, busyEnd, slot.start, slot.end)) {
        return {
          valid: false,
          ruleId: 'R6',
          reason: `Car ${vehicleId} is already busy from ${slot.start} to ${slot.end} (conflicts with needed window ${busyStart} to ${busyEnd}, ref: ${slot.source_id}).`,
          busyStart,
          busyEnd,
          details: {
            vehicle_id: vehicleId,
            needed_start: busyStart,
            needed_end: busyEnd,
            conflicting_source: slot.source_id,
            conflicting_start: slot.start,
            conflicting_end: slot.end,
          },
        };
      }
    }

    return { valid: true, ruleId: null, reason: null, busyStart, busyEnd };
  }

  /**
   * RULE R4: Supplier Eligibility & Per-Vehicle Evaluation
   * A supplier sees/serves a request iff:
   * 1. Works at arrival airport
   * 2. Drives to hotel's (city, area)
   * 3. Is open at pickup time (service_from .. service_until)
   * 4. Has at least 1 car that passes R5 (fits) AND R6 (free).
   */
  static evaluateSupplierForRequest(company, request, busySlots) {
    // 1. Check Airport
    if (!company.airports.includes(request.airport)) {
      return {
        eligible: false,
        ruleFailed: 'R4',
        reason: `${company.name} does not operate at airport ${request.airport} (operates at: ${company.airports.join(', ')}).`,
        vehicleEvaluations: [],
      };
    }

    // 2. Check City & Area
    const servesArea = company.areas.some(
      (a) => a.city === request.city && a.area === request.area
    );
    if (!servesArea) {
      return {
        eligible: false,
        ruleFailed: 'R4',
        reason: `${company.name} does not drive to ${request.area} in ${request.city}.`,
        vehicleEvaluations: [],
      };
    }

    // 3. Check Opening Hours
    if (!isWithinServiceHours(request.pickup, company.service_from, company.service_until)) {
      return {
        eligible: false,
        ruleFailed: 'R4',
        reason: `${company.name} is closed at pickup time ${request.pickup.slice(11, 16)} (operating hours: ${company.service_from}–${company.service_until}).`,
        vehicleEvaluations: [],
      };
    }

    // 4. Evaluate every vehicle in the supplier's fleet against R5 and R6
    const vehicleEvaluations = company.vehicles.map((vehicle) => {
      const r5 = this.checkR5(vehicle, request);
      if (!r5.valid) {
        return {
          ...vehicle,
          eligible: false,
          ruleFailed: r5.ruleId,
          reason: r5.reason,
        };
      }

      const r6 = this.checkR6(vehicle.vehicle_id, request.pickup, request.drive_minutes, busySlots);
      if (!r6.valid) {
        return {
          ...vehicle,
          eligible: false,
          ruleFailed: r6.ruleId,
          reason: r6.reason,
        };
      }

      return {
        ...vehicle,
        eligible: true,
        ruleFailed: null,
        reason: null,
      };
    });

    const eligibleVehicles = vehicleEvaluations.filter((v) => v.eligible);
    if (eligibleVehicles.length === 0) {
      const carReasons = vehicleEvaluations
        .map((v) => `${v.vehicle_id} (${v.type}): ${v.reason}`)
        .join(' | ');
      return {
        eligible: false,
        ruleFailed: 'R4',
        reason: `${company.name} has no available car that fits and is free (${carReasons}).`,
        vehicleEvaluations,
      };
    }

    return {
      eligible: true,
      ruleFailed: null,
      reason: null,
      vehicleEvaluations,
    };
  }
}

