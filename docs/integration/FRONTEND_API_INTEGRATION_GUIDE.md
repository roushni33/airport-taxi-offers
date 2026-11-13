# Frontend API Integration Guide — Problem 2: Airport Taxi → Ride Offers

This guide provides everything needed to connect the frontend to the backend API running at `http://localhost:4000/api/v1`.

---

## 1. Global Response Architecture

Every endpoint returns a unified JSON envelope:

### Successful Response Format (`HTTP 200` / `HTTP 201`)
```json
{
  "success": true,
  "code": "OK",
  "message": "Success message",
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2027-04-10T10:00:00.000Z"
  }
}
```

### Business Rule Violation Format (`HTTP 422 Unprocessable Entity`)
When a business rule (`R1`–`R9`) is violated, the backend sends an HTTP 422 with the exact rule code and violation details:
```json
{
  "success": false,
  "code": "RULE_R6_VIOLATION",
  "message": "[Rule R6 Violated] Car SC-2 is already busy from 2027-04-10T11:00 to 2027-04-10T14:00 (conflicts with needed window 2027-04-10T11:30 to 2027-04-10T14:30, ref: RIDE-0001).",
  "data": null,
  "error": {
    "ruleViolated": "R6",
    "details": {
      "vehicle_id": "SC-2",
      "needed_start": "2027-04-10T11:30",
      "needed_end": "2027-04-10T14:30",
      "conflicting_source": "RIDE-0001",
      "conflicting_start": "2027-04-10T11:00",
      "conflicting_end": "2027-04-10T14:00"
    }
  },
  "meta": {
    "timestamp": "2027-04-10T10:00:00.000Z"
  }
}
```

### Common Error Codes
| HTTP Status | `code` | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing or invalid field types. |
| `404` | `REQUEST_NOT_FOUND` / `BOOKING_NOT_FOUND` / `OFFER_NOT_FOUND` / `SUPPLIER_NOT_FOUND` | Resource does not exist. (For booking lookup: message is `"not found"`). |
| `422` | `RULE_R1_VIOLATION` | Airport doesn't serve hotel city, passenger/bag constraints invalid. |
| `422` | `RULE_R2_VIOLATION` | Pickup time is earlier than 60 mins after flight landing. |
| `422` | `RULE_R3_VIOLATION` | Price is outside route's `[price_min_inr, price_max_inr]`. |
| `422` | `RULE_R4_VIOLATION` | Supplier doesn't operate at airport/area, closed at pickup time, or has no car. |
| `422` | `RULE_R5_VIOLATION` | Car does not fit passengers, large bags, small bags, or matches requested type. |
| `422` | `RULE_R6_VIOLATION` | Vehicle is busy during `[pickup, pickup + 2 * drive_minutes]`. |
| `422` | `RULE_R7_VIOLATION` | Vehicle does not belong to supplier, car already offered, or request closed. |
| `422` | `RULE_R8_VIOLATION` | Attempting to book a rejected, expired, or non-open offer. |
| `422` | `RULE_R9_VIOLATION` | Change request cannot be accepted (car busy or airport/hours invalid). |

---

## 2. API Endpoints Reference

### 1. Catalog Bootstrap
* **Purpose:** Initial app bootstrap. Populates flight dropdowns, hotel options, airports, routes, and suppliers.
* **Method:** `GET`
* **Path:** `/api/v1/catalog/bootstrap`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Catalog loaded",
  "data": {
    "flights": [
      {
        "flight_id": "FL-401",
        "airline": "Air India",
        "flight_number": "AI306",
        "from": "DEL",
        "to": "NRT",
        "departure_local": "2027-04-09T21:15",
        "arrival_local": "2027-04-10T10:30",
        "earliest_pickup": "2027-04-10T11:30",
        "stops": 0,
        "duration_minutes": 465,
        "price_per_seat": { "amount": 38500, "currency": "INR" },
        "seats_left": 18,
        "cabin": "ECONOMY"
      }
    ],
    "hotels": [
      {
        "hotel_id": "HTL-TYO-004",
        "name": "Ueno Garden Inn",
        "city": "Tokyo",
        "area": "Ueno",
        "rating": 4.3,
        "stars": 3
      }
    ],
    "airports": [
      {
        "code": "NRT",
        "name": "Narita International Airport",
        "city": "Tokyo",
        "country": "Japan",
        "serves_cities": ["Tokyo", "Yokohama"]
      }
    ],
    "routes": [
      {
        "airport": "NRT",
        "city": "Tokyo",
        "area": "Ueno",
        "distance_km": 70,
        "drive_minutes": 90,
        "price_min_inr": 10200,
        "price_max_inr": 16800
      }
    ],
    "companies": [
      {
        "company_id": "TX-JP-01",
        "name": "Sakura Cabs",
        "airports": ["NRT", "HND"],
        "areas": [{ "city": "Tokyo", "area": "Ueno" }],
        "service_from": "06:00",
        "service_until": "23:00",
        "rating": 4.8,
        "vehicles": [
          { "vehicle_id": "SC-1", "type": "SEDAN", "seats": 4, "large_bags": 2, "small_bags": 2 },
          { "vehicle_id": "SC-2", "type": "SUV", "seats": 6, "large_bags": 4, "small_bags": 3 },
          { "vehicle_id": "SC-3", "type": "SUV", "seats": 6, "large_bags": 4, "small_bags": 3 }
        ]
      }
    ],
    "car_types": ["HATCHBACK", "SEDAN", "SUV", "BUS"]
  }
}
```

---

### 2. Route Price Range & Pickup Preview (Flow 1, Step 1)
* **Purpose:** Called as soon as the traveler selects a flight and a hotel. Pre-validates `R1` and returns the suggested price bounds and default earliest pickup time.
* **Method:** `GET`
* **Path:** `/api/v1/catalog/route-preview?flight_id=FL-401&hotel_id=HTL-TYO-004`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Route preview ready",
  "data": {
    "flight": {
      "flight_id": "FL-401",
      "to": "NRT",
      "arrival_local": "2027-04-10T10:30"
    },
    "hotel": {
      "hotel_id": "HTL-TYO-004",
      "name": "Ueno Garden Inn",
      "city": "Tokyo",
      "area": "Ueno"
    },
    "earliest_pickup": "2027-04-10T11:30",
    "route": {
      "airport": "NRT",
      "city": "Tokyo",
      "area": "Ueno",
      "distance_km": 70,
      "drive_minutes": 90,
      "price_min_inr": 10200,
      "price_max_inr": 16800
    }
  }
}
```
* **Error Response `422` (Rule R1):** When flight arrival airport doesn't serve the hotel's city.

---

### 3. Post a Ride Request (Flow 1, M1, M2, G2)
* **Purpose:** Traveler posts a new ride request with their chosen price.
* **Method:** `POST`
* **Path:** `/api/v1/requests`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "traveler_name": "Menon Family",
  "flight_id": "FL-401",
  "hotel_id": "HTL-TYO-004",
  "adults": 2,
  "child_ages": [6],
  "large_bags": 3,
  "small_bags": 2,
  "pickup": "2027-04-10T11:30",
  "car_type": "SUV",
  "price_inr": 12000
}
```
*Note: `pickup` is optional (defaults to flight landing + 60 mins). `car_type` is optional (Feature G2).*
* **Response `201`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Ride request posted",
  "data": {
    "request_id": "REQ-0004",
    "traveler_name": "Menon Family",
    "status": "OPEN",
    "booking_number": null,
    "flight": { ... },
    "hotel": { ... },
    "adults": 2,
    "child_ages": [6],
    "total_passengers": 3,
    "large_bags": 3,
    "small_bags": 2,
    "pickup": "2027-04-10T11:30",
    "busy_end": "2027-04-10T14:30",
    "car_type": "SUV",
    "price_inr": 12000,
    "route": { "price_min_inr": 10200, "price_max_inr": 16800, "drive_minutes": 90 },
    "supplier_matching": {
      "can_be_served": true,
      "eligible_supplier_count": 2,
      "eligible_suppliers": [
        { "company_id": "TX-JP-01", "name": "Sakura Cabs" },
        { "company_id": "TX-JP-03", "name": "Edo Premium Cars" }
      ],
      "ineligible_reasons": [
        { "company_id": "TX-JP-02", "name": "Narita Star Taxi", "rule": "R4", "reason": "Narita Star Taxi does not drive to Ueno in Tokyo." },
        { "company_id": "TX-JP-04", "name": "Haneda Family Rides", "rule": "R4", "reason": "Haneda Family Rides does not operate at airport NRT." }
      ]
    },
    "offers": []
  }
}
```
* **Error Response `422` (Rule R3):** If `price_inr` is outside `[10200, 16800]`.
* **Error Response `422` (Rule R2):** If `pickup` is earlier than `2027-04-10T11:30`.

---

### 4. List All Requests
* **Purpose:** Lists all requests for display on traveler overview or admin screen.
* **Method:** `GET`
* **Path:** `/api/v1/requests`
* **Response `200`:** `data` is an array of request objects (including initial seed `REQ-0001`..`REQ-0003` + newly created ones).

---

### 5. Get Single Request & Offers (Flow 1, M4, G5)
* **Purpose:** Traveler views their request and all assigned taxi offers.
* **Method:** `GET`
* **Path:** `/api/v1/requests/:requestId`
* **Query Parameters (Feature G5):**
  - `sort=price_asc` or `sort=price_desc`
  - `car_type=SUV` (or `SEDAN`, `HATCHBACK`, `BUS`)
* **Example:** `/api/v1/requests/REQ-0004?sort=price_asc&car_type=SUV`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Request details fetched",
  "data": {
    "request_id": "REQ-0004",
    "traveler_name": "Menon Family",
    "status": "OPEN",
    "offers": [
      {
        "offer_id": "OFF-0001",
        "request_id": "REQ-0004",
        "company_id": "TX-JP-01",
        "company_name": "Sakura Cabs",
        "company_rating": 4.8,
        "vehicle_id": "SC-3",
        "vehicle_type": "SUV",
        "seats": 6,
        "large_bags": 4,
        "small_bags": 3,
        "price_inr": 12500,
        "expires_at": null,
        "status": "OPEN",
        "car_still_free": true
      }
    ]
  }
}
```

---

### 6. Supplier Dashboard (Flow 2, M2, R4, S2)
* **Purpose:** Supplier views only the open requests they are eligible to serve, along with their fleet's car evaluations and busy schedules.
* **Method:** `GET`
* **Path:** `/api/v1/suppliers/:companyId/dashboard`
* **Example:** `/api/v1/suppliers/TX-JP-01/dashboard`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Supplier dashboard fetched",
  "data": {
    "company": {
      "company_id": "TX-JP-01",
      "name": "Sakura Cabs"
    },
    "servable_requests": [
      {
        "request_id": "REQ-0004",
        "traveler_name": "Menon Family",
        "pickup": "2027-04-10T11:30",
        "busy_end": "2027-04-10T14:30",
        "traveler_price_inr": 12000,
        "vehicle_evaluations": [
          {
            "vehicle_id": "SC-1",
            "type": "SEDAN",
            "eligible": false,
            "ruleFailed": "R5",
            "reason": "Car SC-1 (SEDAN) fits 2 large bags, but the request requires 3 large bags."
          },
          {
            "vehicle_id": "SC-2",
            "type": "SUV",
            "eligible": false,
            "ruleFailed": "R6",
            "reason": "Car SC-2 is already busy from 2027-04-10T11:00 to 2027-04-10T14:00 (conflicts with needed window 2027-04-10T11:30 to 2027-04-10T14:30, ref: RIDE-0001)."
          },
          {
            "vehicle_id": "SC-3",
            "type": "SUV",
            "eligible": true,
            "ruleFailed": null,
            "reason": null
          }
        ],
        "my_offers": []
      }
    ],
    "my_offers": [],
    "change_requests": [],
    "fleet_busy_schedule": [
      {
        "vehicle_id": "SC-2",
        "type": "SUV",
        "busy_windows": [
          { "source_id": "RIDE-0001", "start": "2027-04-10T11:00", "end": "2027-04-10T14:00" }
        ]
      }
    ]
  }
}
```

---

### 7. Supplier Assigns a Car & Price (Flow 2, M3, R7, G1, G4)
* **Purpose:** Supplier submits an offer for a request.
* **Method:** `POST`
* **Path:** `/api/v1/suppliers/:companyId/offers`
* **Example:** `/api/v1/suppliers/TX-JP-01/offers`
* **Request Body:**
```json
{
  "request_id": "REQ-0004",
  "vehicle_id": "SC-3",
  "price_inr": 12500,
  "expires_at": "2027-04-10T11:00"
}
```
*Note: `expires_at` is optional (Feature G4).*
* **Response `201`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Car assigned to request",
  "data": {
    "offer_id": "OFF-0001",
    "request_id": "REQ-0004",
    "company_id": "TX-JP-01",
    "company_name": "Sakura Cabs",
    "vehicle_id": "SC-3",
    "vehicle_type": "SUV",
    "price_inr": 12500,
    "status": "OPEN"
  }
}
```
* **Error Response `422` (Rule R6 Violation - Demo Refusal 1):**
  If assigning `SC-2`:
  ```json
  {
    "success": false,
    "code": "RULE_R6_VIOLATION",
    "message": "[Rule R6 Violated] Car SC-2 is already busy from 2027-04-10T11:00 to 2027-04-10T14:00 (conflicts with needed window 2027-04-10T11:30 to 2027-04-10T14:30, ref: RIDE-0001).",
    "error": { "ruleViolated": "R6", "details": { "vehicle_id": "SC-2" } }
  }
  ```
* **Error Response `422` (Rule R5 Violation - Demo Refusal 2):**
  If assigning `SC-1`:
  ```json
  {
    "success": false,
    "code": "RULE_R5_VIOLATION",
    "message": "[Rule R5 Violated] Car SC-1 (SEDAN) fits 2 large bags, but the request requires 3 large bags.",
    "error": { "ruleViolated": "R5" }
  }
  ```

---

### 8. Traveler Books a Taxi (Flow 1, M4, M6, R8)
* **Purpose:** Traveler confirms booking of an assigned taxi offer. Sets chosen offer to `BOOKED`, others on this request to `NOT_CHOSEN`, blocks the car, and issues a 10-digit booking number.
* **Method:** `POST`
* **Path:** `/api/v1/offers/:offerId/book`
* **Example:** `/api/v1/offers/OFF-0001/book`
* **Response `201`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Taxi booked successfully",
  "data": {
    "booking_number": "7392018462",
    "status": "CONFIRMED",
    "traveler_name": "Menon Family",
    "flight": { "flight_id": "FL-401", "arrival_local": "2027-04-10T10:30" },
    "hotel": { "hotel_id": "HTL-TYO-004", "name": "Ueno Garden Inn" },
    "pickup": "2027-04-10T11:30",
    "busy_end": "2027-04-10T14:30",
    "drive_minutes": 90,
    "supplier": { "company_id": "TX-JP-01", "name": "Sakura Cabs" },
    "car": { "vehicle_id": "SC-3", "type": "SUV" },
    "price_inr": 12500,
    "change_requests": []
  }
}
```

---

### 9. Traveler Rejects a Taxi Offer (Flow 1, M4, R8)
* **Purpose:** Traveler marks an offer as rejected so it cannot be booked.
* **Method:** `POST`
* **Path:** `/api/v1/offers/:offerId/reject`
* **Example:** `/api/v1/offers/OFF-0002/reject`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Taxi offer rejected",
  "data": {
    "offer_id": "OFF-0002",
    "status": "REJECTED"
  }
}
```

---

### 10. Lookup Booking Summary (Flow 1, M5)
* **Purpose:** Traveler retrieves their ride summary using their 10-digit booking number. Persists across server restarts.
* **Method:** `GET`
* **Path:** `/api/v1/bookings/:bookingNumber`
* **Example:** `/api/v1/bookings/7392018462`
* **Response `200`:** Same summary object returned in Step 8.
* **Response `404` (Invalid Booking Number):**
```json
{
  "success": false,
  "code": "BOOKING_NOT_FOUND",
  "message": "not found",
  "data": null,
  "error": { "ruleViolated": null, "details": null }
}
```

---

### 11. Traveler Sends Change Request (Flow 1, M7, R9)
* **Purpose:** Traveler changes flight or pickup time after booking.
* **Method:** `POST`
* **Path:** `/api/v1/bookings/:bookingNumber/change-request`
* **Request Body:**
```json
{
  "new_flight_id": "FL-402",
  "new_pickup": "2027-04-11T11:30"
}
```
*Note: Both fields are optional (default to existing values if omitted).*
* **Response `201`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Change request submitted",
  "data": {
    "change_id": "CHG-0001",
    "booking_number": "7392018462",
    "new_flight_id": "FL-402",
    "new_pickup": "2027-04-11T11:30",
    "new_busy_end": "2027-04-11T14:30",
    "status": "WAITING"
  }
}
```

---

### 12. Supplier Accepts or Rejects Change Request (Flow 2, M7, R9)
* **Purpose:** Supplier reviews and decides on a change request.
* **Method:** `POST`
* **Path:** `/api/v1/change-requests/:changeId/respond`
* **Request Body:**
```json
{
  "action": "ACCEPT"
}
```
*(or `"action": "REJECT"`)*
* **Response `200`:** Returns updated booking summary reflecting the accepted or rejected change.
* **Error Response `422` (Rule R9 Violation):** If the car is busy at the new time or the supplier doesn't operate at the new airport, backend rejects with `RULE_R9_VIOLATION` and keeps the old booking intact.

---

### 13. Stretch S1: Shared Rides
* **Find Shareable Candidates:**
  - `GET /api/v1/requests/:requestId/shareable`
  - Returns other open requests on the same flight landing headed to the same hotel area where a single supplier car can accommodate their combined passenger and bag count.
* **Merge Requests:**
  - `POST /api/v1/requests/share`
  - Body: `{ "request_id_1": "REQ-0001", "request_id_2": "REQ-0002" }`

---

### 14. Reset Demo State (Admin Utility)
* **Purpose:** 1-click button to reset the database back to clean seed data before judge presentations.
* **Method:** `POST`
* **Path:** `/api/v1/admin/reset-demo`
* **Response `200`:**
```json
{
  "success": true,
  "code": "OK",
  "message": "Demo database reset to initial state",
  "data": {
    "reset": true,
    "open_requests_seeded": 3
  }
}
```

---

## 3. Winning 4-Minute Demo Script (For UI Flow)

1. **Traveler Tab:**
   - Select Flight: `FL-401` (lands `NRT` at `10:30`, 10 April 2027).
   - Select Hotel: `HTL-TYO-004` (Ueno Garden Inn, Tokyo/Ueno).
   - Range shown: `₹10,200` – `₹16,800`, Earliest Pickup: `11:30`.
   - Enter: 2 Adults, 1 Child (age 6), 3 Large bags, 2 Small bags, Pickup: `11:30`, Price: `₹12,000`. Click **Post Request**.
2. **Supplier Tab (Sakura Cabs `TX-JP-01`):**
   - Open Menon request.
   - Try assigning `SC-2` (SUV) at `₹12,500` → Shows red alert: Refused by **Rule R6** (car busy on `RIDE-0001`).
   - Try assigning `SC-1` (Sedan) at `₹12,500` → Shows red alert: Refused by **Rule R5** (only 2 large bags capacity).
   - Assign `SC-3` (SUV) at `₹12,500` → **Accepted!**
3. **Supplier Tab (Edo Premium Cars `TX-JP-03`):**
   - Assign `EP-2` (SUV) at `₹13,200` → **Accepted!**
4. **Traveler Tab:**
   - Sees two offers. Clicks **Reject** on `EP-2`, clicks **Book** on `SC-3`.
   - Displays 10-digit booking number and ride summary.
5. **Change Flight:**
   - Traveler clicks **Change Flight** to `FL-402` (lands `11 April 10:30`, pickup `11:30`).
   - Supplier dashboard shows change request. Sakura Cabs clicks **Accept**.
   - Booking successfully updates!

