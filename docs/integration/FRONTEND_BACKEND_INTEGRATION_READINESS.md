# Frontend → Backend Integration Readiness Document
**Airport Taxi Offers — Problem 2**
*Document Version: 1.0 · Date: November 13, 2026*

This document serves as the bridge between the UI-only high-fidelity prototype and the future backend implementation running at `http://localhost:4000/api/v1`.

---

## 1. Architecture & The Integration Boundary

The frontend was engineered with a strict boundary separation between UI components and the data-access layer:

```
[ React Components (Pages & Views) ]
               │
               ▼
   [ src/services/apiService.ts ]  <─── Swap point: No UI changes needed!
               │
      ┌────────┴────────┐
      ▼                 ▼
[ Today: MockService ]  [ Future: HttpClient (fetch / axios) ]
  • Local Rule Engine     • http://localhost:4000/api/v1/...
  • LocalStorage / Memory • Real SQLite / MongoDB / Express
```

Because all React pages only import and call `ApiService` methods (e.g. `ApiService.createRequest()`, `ApiService.bookOffer()`), **zero React components need to be modified** when the backend is wired up. Only `src/services/apiService.ts` needs its implementation swapped to standard `fetch()` or `axios`.

---

## 2. Mock Data vs. Future Backend Endpoints

| Frontend Feature | Current Local Mock | Expected Backend API Endpoint | HTTP Method | Expected Payload / Notes |
|---|---|---|---|---|
| **Catalog Bootstrap** | `ALL_FLIGHTS`, `ALL_HOTELS`, `ALL_AIRPORTS` in `mockCatalog.ts` | `/api/v1/catalog/bootstrap` | `GET` | Returns catalog collections + `car_types` |
| **Live Route Preview & Price Range** | Local lookup in `routes.json` with R1 pre-validation | `/api/v1/catalog/route-preview?flight_id=&hotel_id=` | `GET` | Validates R1; returns suggested price bounds `[min, max]` and earliest pickup |
| **Post Ride Request (M1)** | `MockStorage.saveRequest()` | `/api/v1/requests` | `POST` | Enforces R1, R2, R3; returns created request with `supplier_matching` |
| **List All Requests** | `MockStorage.getRequests()` | `/api/v1/requests` | `GET` | Returns array of open requests |
| **Request Details & Offers (M4, G5)** | `MockStorage.getRequestById()` + offer filtering/sorting | `/api/v1/requests/:requestId?sort=&car_type=` | `GET` | Returns request and all assigned offers |
| **Supplier Dashboard (M2, R4)** | `MockRuleEngine.evaluateSupplierForRequest()` | `/api/v1/suppliers/:companyId/dashboard` | `GET` | Server-filtered servable requests with per-vehicle eligibility and busy slots |
| **Supplier Assign Car (M3, R7, G1, G4)** | `MockRuleEngine.checkR7()` + `saveOffer()` | `/api/v1/suppliers/:companyId/offers` | `POST` | Validates R5, R6, R7, R3; saves offer |
| **Traveler Books Offer (M4, M6, R8)** | `MockRuleEngine.checkR8()` + atomic status update | `/api/v1/offers/:offerId/book` | `POST` | Double-booking guard (M6); issues 10-digit number; marks siblings `NOT_CHOSEN` |
| **Traveler Rejects Offer (M4)** | In-place status update to `REJECTED` | `/api/v1/offers/:offerId/reject` | `POST` | Rejects offer so it cannot be booked |
| **Booking Summary Lookup (M5)** | `MockStorage.getBookingByNumber()` | `/api/v1/bookings/:bookingNumber` | `GET` | Standalone lookup; 404 returns message `"not found"` |
| **Traveler Change Request (M7, R9)** | `MockStorage.saveChangeRequest()` | `/api/v1/bookings/:bookingNumber/change-request` | `POST` | Creates change with status `WAITING` |
| **Supplier Change Response (M7, R9)** | `MockRuleEngine.checkR9()` | `/api/v1/change-requests/:changeId/respond` | `POST` | Body `{ "action": "ACCEPT" \| "REJECT" }`. On ACCEPT: re-checks R2 and R6 |
| **Admin Reset Demo** | `MockStorage.resetToSeed()` | `/api/v1/admin/reset-demo` | `POST` | Restores database to clean seed state |

---

## 3. Expected Data Contracts & Shape Compatibility

The mock service and TypeScript types (`src/types/index.ts`) were designed strictly from `Doc/FRONTEND_API_INTEGRATION_GUIDE.md`:

### 3.1 Unified Envelope
Every backend response must return:
```json
{
  "success": true,
  "code": "OK",
  "message": "...",
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "2027-04-10T10:00:00.000Z" }
}
```

### 3.2 Error Envelope (HTTP 422 for Rules R1–R9)
```json
{
  "success": false,
  "code": "RULE_R6_VIOLATION",
  "message": "[Rule R6 Violated] Car SC-2 is already busy...",
  "data": null,
  "error": {
    "ruleViolated": "R6",
    "details": {
      "vehicle_id": "SC-2",
      "needed_start": "2027-04-10T11:30",
      "needed_end": "2027-04-10T14:30"
    }
  }
}
```
*Frontend compatibility note:* `RuleBanner.tsx` and all error catch blocks directly consume `error.ruleViolated` and `message`.

---

## 4. Key Business Rules Requiring Backend Enforcement

When implementing the backend, ensure these rules are strictly enforced server-side:

1. **Rule R1 (Catalog & Route Compatibility):**
   - The arrival airport (`flight.to`) must have `serves_cities` containing `hotel.city`.
   - `adults >= 1`, each age in `child_ages` must be `0..17`.
2. **Rule R2 (Pickup Time):**
   - Pickup must be $\ge$ `flight.arrival_local` + 60 minutes.
3. **Rule R3 (Price Bounds):**
   - Price must be $\ge$ `price_min_inr` and $\le$ `price_max_inr` for the specific route.
4. **Rule R4 (Supplier Visibility):**
   - A supplier sees an open request only if:
     - It operates at the arrival airport.
     - It serves the hotel's city and area.
     - It is open at the pickup time (handling overnight hours crossing midnight, e.g. 05:00 to 01:00).
     - It has at least 1 car that fits (R5) and is free (R6).
5. **Rule R5 (Car Fit):**
   - `seats >= adults + child_ages.length`.
   - `large_bags >= request.large_bags` AND `small_bags >= request.small_bags` (checked independently).
   - If traveler selected `car_type`, vehicle must match.
6. **Rule R6 (Car Availability):**
   - Busy interval is `[pickup, pickup + 2 * drive_minutes]`.
   - Checks against pre-existing `booked_rides.json` AND platform confirmed bookings.
7. **Rule R7 (Assign Car):**
   - Car must belong to supplier; request must be `OPEN`; re-checks R3, R5, R6.
8. **Rule R8 & M6 (Atomic Booking & Double-Booking Guard):**
   - Cannot book rejected or expired offers.
   - At moment of booking confirmation, verifies the vehicle has not been taken by another booking for an overlapping window.
9. **Rule R9 (Change Request):**
   - On ACCEPT, re-validates R2 (new pickup $\ge$ landing + 60m) and R6 (same car free at new window).

---

## 5. Seamless Transition Steps for Backend Hookup

When the backend is ready:

1. In `vite.config.ts`, configure proxy:
   ```ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:4000',
         changeOrigin: true,
       }
     }
   }
   ```
2. In `src/services/apiService.ts`, replace the calls to `MockService` with HTTP calls:
   ```ts
   async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
     const res = await fetch(`/api/v1${path}`, options);
     const json = await res.json();
     if (!res.ok) {
       const err: any = new Error(json.message);
       err.ruleViolated = json.error?.ruleViolated;
       err.details = json.error?.details;
       throw err;
     }
     return json;
   }
   ```
3. Restart Vite dev server. The entire UI will now communicate with the real backend with zero UI regressions.

