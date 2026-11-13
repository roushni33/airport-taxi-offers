# Airport Taxi Offers — Application Prototype

A high-fidelity, Apple-quality frontend web application for airport-to-hotel taxi offers and ride matching. Built for Problem 2 of the hackathon with React, TypeScript, and Vite.

---

## 🚀 Quick Start (1–2 Commands)

To run the application locally on your machine:

```bash
# 1. Install dependencies
npm install
# (or bun install)

# 2. Start the development server
npm run dev
# (or bun run dev)
```

The application will start immediately at `http://localhost:3000`.

To run the automated verification test suite:
```bash
bun run scripts/test-prototype.ts
```

To build for production:
```bash
npm run build
```

---

## 🌟 Highlights & Architecture

- **Stack:** React 18, TypeScript, Vite, React Router 6, CSS variables/tokens.
- **Design System:** Apple design principles (`Doc/DESIGN-apple.md`), dark navy canvas (`#0D2550`), ice text (`#E9F5F5`), single Action Blue (`#316FF5`), SF Pro/Inter typography with tabular numbers, translucent glass navigation with 20px blur, and micro-interactions (`transform: scale(0.98)`).
- **Service Layer Abstraction:** All UI components interact exclusively through `src/services/apiService.ts`. All mock data and rules run locally in `src/mocks/`, completely ready for a zero-UI-refactor swap to a live Express backend running at `http://localhost:4000/api/v1`.
- **Demo Persistence:** Uses `localStorage` with initial catalog and problem dataset seeding. Bookings and change requests persist across page refreshes.
- **Demo Reset:** A 1-click "Reset Demo" button in the navigation bar restores the original seed state at any time.

---

## 📱 Complete User Flows

### A. Traveler Flow
1. **Role Selection (`/`):** Choose "I am a Traveler".
2. **Ride Request Form (`/traveler/request`):**
   - Select arrival flight (filtered to Japan/UAE).
   - Select hotel (filtered to cities served by the flight's airport; incompatible selections immediately trigger Rule R1).
   - Specify adults (min 1), children (with exact ages 0–17), large check-in bags, and small carry-on bags.
   - Choose optional car type filter (`HATCHBACK`, `SEDAN`, `SUV`, `BUS`) [G2].
   - View live sticky **Route & Price Preview** card with distance, drive time, earliest pickup time, and price range banner (e.g. ₹10,200 – ₹16,800).
   - Enter whole INR price with live range tracker bar.
   - Submit request (Rule R1, R2, R3 enforced).
3. **Offers List (`/traveler/offers/:id`):**
   - Summary strip of passengers, bags, pickup, and price.
   - Filter by car type and sort by price [G5].
   - 10-minute offer countdown chips [G4].
   - Reject an offer in place (greys out card; cannot be re-booked).
   - Book an offer -> confirmation prompt -> validates no double booking (M6) -> issues unique 10-digit booking number.
4. **Booking Summary & Lookup (`/traveler/booking/:number`):**
   - Large copyable 10-digit booking number with 1-click clipboard feedback.
   - Full breakdown: flight, pickup, hotel, supplier, car ID, and agreed price.
   - Standalone lookup input works across reloads.
5. **Change Request (`/traveler/change-request/:number`):**
   - Propose a new flight and/or new pickup time.
   - Submits request with `WAITING` (Pending) status.

### B. Supplier Flow
1. **Role Selection (`/`):** Choose "I am a Taxi Supplier" and pick your company (e.g. Sakura Cabs).
2. **Supplier Dashboard (`/supplier/dashboard`):**
   - Fleet summary chips ("2 SUV · 1 Sedan · 1 Hatchback") and operating hours.
   - **Open Requests Tab:** Shows only requests this supplier is eligible to serve per Rule R4.
   - **My Bookings Tab:** Shows confirmed bookings, with an alert badge for any pending change request.
3. **Assign Car & Bid (`/supplier/request/:id/assign`):**
   - Fleet vehicle cards showing real-time eligibility. Ineligible cars are disabled and explain why:
     - `SC-1`: Refused by Rule R5 (only 2 large bags capacity).
     - `SC-2`: Refused by Rule R6 (conflicts with `RIDE-0001` busy window).
     - `SC-3`: Eligible!
   - Enter offer price within route range (Rule R3).
   - Submit offer to traveler.
4. **Change Request Response (`/supplier/change-request/:id`):**
   - Side-by-side diff table: "Current Booking" vs "Requested Change" with highlighted changed cells.
   - Real-time pre-check indicators for Rule R2 (pickup >= landing + 60m) and Rule R6 (car free at new time).
   - Accept or Reject change buttons. On Accept: booking updates immediately.

---

## 🎬 4-Minute Winning Demo Script (Menon Scenario)

You can run this demo manually or click **"Menon Demo Run"** in the top navigation bar:

1. **Traveler Tab:**
   - Click "Menon Demo Run" (pre-fills Flight `FL-401` landing NRT at 10:30, Hotel `HTL-TYO-004` Ueno Garden Inn, 2 adults, 1 child aged 6, 3 large + 2 small bags, 11:30 pickup, ₹12,000 price).
   - Click **Post Ride Request**.
2. **Supplier Tab (Sakura Cabs):**
   - In nav bar, click "Switch" -> Select "Taxi Supplier" -> "Sakura Cabs".
   - Open the Menon request -> Click **Assign Car & Set Price**.
   - Select `SC-2` (SUV) -> Shows Rule R6 refusal banner (busy on `RIDE-0001`).
   - Select `SC-1` (Sedan) -> Shows Rule R5 refusal banner (only 2 large bags space).
   - Select `SC-3` (SUV) -> Enter `₹12,500` -> Click **Submit Taxi Offer**.
3. **Supplier Tab (Edo Premium Cars):**
   - Switch supplier to "Edo Premium Cars" -> Open request -> Assign `EP-2` at `₹13,200`.
4. **Traveler Tab:**
   - Switch role to Traveler -> Open offers list.
   - Click **Reject** on `EP-2` (card greys out with "Rejected" label).
   - Click **Book Ride** on `SC-3` -> Confirm in dialog -> 10-digit booking number is generated and summary opens.
5. **Change Flight:**
   - Click **Request Flight / Pickup Change** -> Select `FL-402` (landing next day) -> Submit.
   - Switch to Sakura Cabs -> Click **Review Flight Change Request** -> Click **Accept & Update Booking**.
   - Booking successfully updates!

---

## 📂 Project Structure

```
airport-taxi-offers/
├── Doc/
│   ├── FRONTEND_BACKEND_INTEGRATION_READINESS.md  # Detailed API wiring guide
│   ├── Airport Taxi Platform – BRD & PRD.md
│   ├── Airport Taxi – UI Guide.md
│   ├── Airport Taxi — UI UX Design Brief.md
│   ├── DESIGN-apple.md
│   └── FRONTEND_API_INTEGRATION_GUIDE.md
├── src/
│   ├── types/               # Shared TypeScript data contracts
│   ├── styles/              # Design tokens & Apple global styles
│   ├── contexts/            # Session & Role state management
│   ├── services/            # ApiService abstraction layer
│   ├── mocks/               # Local rule engine, catalog, & mock storage
│   ├── components/          # Reusable UI components (NavBar, RuleBanner, etc.)
│   ├── pages/               # 8 Complete pages covering both user journeys
│   ├── App.tsx              # Router & layout
│   └── main.tsx             # App entry point
├── scripts/
│   └── test-prototype.ts    # 25-test automated business rule verification
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🛡️ Business Rule Matrix (R1–R9)

| Rule | Description | Frontend Prototype Demonstration |
|---|---|---|
| **R1** | Arrival airport serves hotel city; valid pax/bags | Hotel dropdown auto-filters to served cities; invalid flight/hotel triggers R1 banner |
| **R2** | Pickup $\ge$ flight landing + 60 minutes | Pickup input enforces minimum time; earlier pickup triggers R2 banner |
| **R3** | Price inside route `[price_min_inr, price_max_inr]` | Live range track and error banner if price is out of bounds |
| **R4** | Supplier operates at airport, serves area, open at pickup | Dashboard filters out ineligible requests; lists rejection reasons |
| **R5** | Vehicle fits seats and large/small luggage | Ineligible fleet cars are disabled with exact missing capacity reason |
| **R6** | Car is free during `[pickup, pickup + 2 × drive_minutes]` | Conflicting pre-booked rides (e.g. `SC-2` on `RIDE-0001`) are flagged and refused |
| **R7** | Supplier assigns valid car & in-range price | Assignment checks R3, R5, R6 before generating offer |
| **R8** | Cannot book rejected, expired, or unavailable offers | Reject greys out card in place; double-booking guard (M6) blocks conflicts |
| **R9** | Change request re-validates R2 and car-free R6 | Side-by-side diff table with pass/fail pre-checks before accept |

---

## 🔌 Future Backend Integration

When the backend server (`http://localhost:4000/api/v1`) is ready to be connected, consult `Doc/FRONTEND_BACKEND_INTEGRATION_READINESS.md`. Only `src/services/apiService.ts` needs its implementation swapped from `MockService` to `fetch()`, with zero changes required to UI components.
