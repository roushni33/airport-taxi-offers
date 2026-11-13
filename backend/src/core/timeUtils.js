/**
 * Normalizes any local ISO string ("2027-04-10T10:30:00" or "2027-04-10T10:30")
 * into a canonical "YYYY-MM-DDTHH:MM" 16-character string.
 * Per DATA_DICTIONARY.md Section 5: All times are local to the arrival airport.
 */
export function normalizeLocalDateTime(dtStr) {
  if (!dtStr || typeof dtStr !== 'string') {
    throw new Error(`Invalid datetime string: ${dtStr}`);
  }
  return dtStr.trim().slice(0, 16);
}

/**
 * Converts a local datetime string ("YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS")
 * into epoch minutes using UTC parsing so the host laptop's timezone never affects math.
 */
export function toEpochMinutes(dtStr) {
  const norm = normalizeLocalDateTime(dtStr);
  const ms = Date.parse(`${norm}:00.000Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid datetime format: ${dtStr}`);
  }
  return Math.floor(ms / 60000);
}

/**
 * Converts epoch minutes back into canonical "YYYY-MM-DDTHH:MM" local string.
 */
export function fromEpochMinutes(epochMins) {
  const iso = new Date(epochMins * 60000).toISOString();
  return iso.slice(0, 16);
}

/**
 * Adds `minutesToAdd` to a local datetime string and returns "YYYY-MM-DDTHH:MM".
 * Used by Rule R2 (arrival_local + 60m) and Rule R6 (pickup + 2 * drive_minutes).
 */
export function addMinutes(dtStr, minutesToAdd) {
  return fromEpochMinutes(toEpochMinutes(dtStr) + minutesToAdd);
}

export function parseHHMMToMinutes(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

/**
 * Extracts "HH:MM" clock time (0..1439 minutes from midnight) from a local datetime string.
 */
export function getClockMinutes(dtStr) {
  const norm = normalizeLocalDateTime(dtStr); // "YYYY-MM-DDTHH:MM"
  const timePart = norm.slice(11, 16);        // "HH:MM"
  return parseHHMMToMinutes(timePart);
}

/**
 * Rule R4 Opening Hours Check:
 * Checks if `pickupDateTime` falls within `[serviceFrom, serviceUntil]` (both ends inclusive).
 * Supports overnight windows that cross midnight, such as TX-AE-05 Marina Rides ("05:00" to "01:00").
 */
export function isWithinServiceHours(pickupDateTime, serviceFrom, serviceUntil) {
  const pickupMins = getClockMinutes(pickupDateTime);
  const fromMins = parseHHMMToMinutes(serviceFrom);
  const untilMins = parseHHMMToMinutes(serviceUntil);

  if (fromMins <= untilMins) {
    // Standard daytime window e.g., 06:00 (360) to 23:00 (1380)
    return pickupMins >= fromMins && pickupMins <= untilMins;
  } else {
    // Overnight window crossing midnight e.g., 05:00 (300) to 01:00 (60)
    return pickupMins >= fromMins || pickupMins <= untilMins;
  }
}

/**
 * Rule R6 Busy Time Overlap Check:
 * Per DATA_DICTIONARY.md Section 5:
 * "Two busy times overlap if one starts before the other ends.
 *  11:00-14:00 and 14:00-16:00 do not overlap."
 */
export function doIntervalsOverlap(startA, endA, startB, endB) {
  const a0 = toEpochMinutes(startA);
  const a1 = toEpochMinutes(endA);
  const b0 = toEpochMinutes(startB);
  const b1 = toEpochMinutes(endB);

  return a0 < b1 && b0 < a1;
}

