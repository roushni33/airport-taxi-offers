# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Traveler (Primary Consumer)**: International airline passengers landing after long-haul flights (exemplified by the Menon family arriving from Bengaluru at Tokyo Narita NRT). Traveling with family members (adults + children) and multiple luggage pieces (large check-in bags and small carry-ons). Their core job is securing a reliable, right-sized airport-to-hotel vehicle transfer with transparent, upfront pricing, zero curb negotiation surprises, and a reliable booking reference.
- **Taxi Supplier / Fleet Dispatcher (Primary Provider)**: Licensed taxi and fleet operators (exemplified by Sakura Cabs operating at Tokyo Narita NRT and Haneda HND). Fleet dispatchers need to quickly scan servable ride requests within their licensed territory and operating hours, assign suitable vehicles with sufficient passenger seats and luggage capacity without creating scheduling overlaps, and respond to traveler flight schedule modifications.
- **Evaluation Panel / Hackathon Judges (Auditor Persona)**: Technical and product evaluators assessing end-to-end functionality, UI fidelity, and server-side business rule enforcement (R1 through R9 and M6) through both standard benchmark journeys and adversarial, unseen ride requests designed to trigger edge-case refusals.

## Product Purpose

Airport Taxi Offers is a two-sided airport-to-hotel ride offer platform designed to eliminate the anxiety, price gouging, and vehicle mismatches common in airport arrivals. Arriving travelers submit their arrival flight, destination hotel, passenger counts, child ages, luggage volume, and target budget. Verified taxi suppliers review eligible requests and submit binding, vehicle-specific offers within route price corridors. The platform deterministically enforces passenger safety, flight buffer windows, luggage capacities, and fleet non-collision rules.

Success means:
1. 100% adherence to flight buffers (minimum 60 minutes post-landing) and physical vehicle capacities (seats and bags).
2. Zero schedule collisions across vehicle fleets (roundtrip return drive times strictly non-overlapping).
3. Complete price transparency bounded by official route price ceilings and floors.
4. Fast, dependable role switching and booking lookup without mandatory user registration.

## Positioning

Unlike on-demand ride-hailing services (e.g., Uber, Grab) that introduce unpredictable surge pricing, unpredictable vehicle sizing, and curb driver cancellations, and unlike rigid flat-rate airport limousine desks with opaque dispatch logic, Airport Taxi Offers provides a deterministic, rule-guaranteed marketplace:
- Route corridors dictate strict, non-negotiable minimum and maximum price envelopes.
- Suppliers can only see and bid on requests they are physically, geographically, and temporally capable of fulfilling.
- Flight landing times govern pickup availability, and booking permanently reserves roundtrip vehicle busy windows.

## Operating Context

- **Standalone UI-Only Prototype**: Runs locally via Vite (`http://localhost:3000`) with React 18, TypeScript, and a deterministic local mock engine (`MockService`, `MockRules`, `MockStorage`). Fully decoupled via `ApiService` to allow zero-UI-refactor transition to a real REST backend (`/api/v1`) in future phases.
- **Session & Persistence Model**: No authentication or password barriers. Users select a persona (`Traveler` or specific `Taxi Company`) at launch, persisted in `sessionStorage`. Application state (requests, offers, bookings, change requests) persists in `localStorage` across page reloads, accompanied by a deterministic one-click "Reset Demo Data" capability.
- **Catalog & Territory Boundaries**: Fixed catalog data covering international airports in Japan (`NRT`, `HND`, `KIX`) and UAE (`DXB`, `AUH`), corresponding flight schedules (April 1 to April 20, 2027), 49 destination hotels, and 33 route corridors with defined distances, drive times, and INR price boundaries.
- **Time Representation**: All schedule times represent local wall-clock time (`YYYY-MM-DDTHH:MM`) without timezone offsets, preventing browser timezone skew across international routes.

## Capabilities and Constraints

### Core Capabilities
- **Role Selection (P1)**: Instant persona switching between Traveler and 11 registered Taxi Suppliers.
- **Ride Request Creation (P2)**: Flight & hotel selection, adult & child passenger breakdown with individual child ages, check-in and carry-on bag counts, optional car type preference, live route preview with estimated drive time and price range, and custom traveler price proposal.
- **Offers Exploration & Comparison (P3)**: Live offer feed for submitted requests showing vehicle specs, supplier ratings, vehicle type, and offered price. Individual offer rejection and one-click booking.
- **Booking Summary & Lookup (P4)**: Instant generation of a unique 10-digit booking reference (`BK-XXXXXXXX`), comprehensive trip overview, and direct booking lookup by reference code.
- **Booking Change Request Flow (P5 & P8)**: Traveler-initiated flight or pickup time adjustment with automated R2/R6 validation, followed by supplier review, acceptance, or rejection.
- **Supplier Operations Dashboard (P6)**: Fleet visibility, active bookings ledger, incoming flight change request queue, and an open request feed filtered strictly to servable rides.
- **Vehicle Assignment (P7)**: Inspection of fleet vehicles against request requirements with real-time pass/fail badges naming specific business rules.

### Enforced Business Rules
- **R1 (Catalog & Passenger Integrity)**: Flight and hotel must exist in catalog; arrival airport must serve hotel city; minimum 1 adult passenger; child defined as age 0–17.
- **R2 (Flight Arrival Buffer)**: Pickup time must be $\ge$ flight landing local time + 60 minutes minimum buffer.
- **R3 (Route Price Bounding)**: Traveler quote and supplier offer must fall within `[price_min_inr, price_max_inr]` for the specific airport-to-hotel area route.
- **R4 (Supplier Eligibility)**: Supplier only sees requests where: supplier operates at arrival airport, covers hotel city/area, operates during pickup hours, and has $\ge 1$ vehicle meeting R5 and R6.
- **R5 (Vehicle Capacity)**: Vehicle seats $\ge$ total passengers (adults + children); vehicle large bags $\ge$ requested large bags; vehicle small bags $\ge$ requested small bags; vehicle type matches requested preference if specified.
- **R6 (Roundtrip Fleet Non-Collision)**: Vehicle busy window spans from `pickup` to `pickup + (2 * drive_minutes)`. No two busy windows for the same vehicle ID may overlap, including pre-existing seed bookings (`booked_rides.json`).
- **R7 (Offer Validation)**: Supplier offer assignment re-validates R3, R4, R5, and R6; violations are refused with explicit rule citations.
- **R8 (Booking & Mutual Exclusion)**: Booking one offer creates a confirmed booking, locks the vehicle as busy under R6, and marks all other offers for that request as `NOT_CHOSEN`. Rebooking rejected offers is prohibited.
- **R9 (Change Request Validation)**: Supplier acceptance re-validates R2 (buffer) and R6 (vehicle free for new roundtrip window) without re-opening settled pricing or territorial rules.
- **M6 (Double-Booking Guard)**: Atomic availability check at confirmation time; if a vehicle became occupied by a competing booking, confirmation is refused with a clear error.

### Constraints
- Zero backend/database dependency in current prototype phase; all business logic runs via pure deterministic TypeScript rules in `src/mocks/`.
- Currency fixed to Indian Rupee (`INR` / `₹`).
- External AI/LLM calls prohibited within runtime application logic.

## Brand Commitments

- **Visual Direction**: Apple Human Interface Guidelines aesthetic (`Doc/DESIGN-apple.md`), conveying quiet confidence, institutional trust, and clarity through deep navy canvas, crisp typography, and restrained interactive accents.
- **Color Identity**:
  - Base Canvas: Night Sky Navy (`--bg-base: #0D2550`)
  - Elevated Surfaces: Deep Ice Navy layers (`--surface-1: #182F58`, `--surface-2: #1F365D`, `--surface-3: #273E64`)
  - Primary Text: Ice Blue (`--text-primary: #E9F5F5`, `--text-secondary: #ABBBC7`)
  - Singular Action Accent: Action Blue (`--action: #316FF5`, hover: `#4A82FF`, pressed: `#2558D6`)
  - Hairline Boundaries: Ice Dividers (`--border: #2C4267`)
  - Semantic Status: Emerald Success (`#4FD6A0`), Amber Warning (`#F2C14E`), Coral Error (`#FF7A7A`)
- **Typography**: `-apple-system`, `SF Pro Text`, `SF Pro Display`, `Inter` font stack. Tabular numerals (`tabular-nums`) mandatory for all prices, flight arrival times, passenger counts, and luggage badges; monospace for 10-digit booking codes.
- **Voice and Copywriting**: Factual, respectful, and direct. Error alerts avoid blaming the user and clearly specify the violated rule, allowed parameters, and constructive corrective action.

## Evidence on Hand

- **Data Catalogs**:
  - `data/catalog/airports.json`: 5 international hub airports (`NRT`, `HND`, `KIX`, `DXB`, `AUH`).
  - `data/catalog/flights.json`: 469 catalog flights; 240 arrival flights serving target airport hubs.
  - `data/catalog/hotels.json`: 49 hotels categorized by city and municipal area.
  - `data/problem-2/routes.json`: 33 distinct route corridors with distance, drive times, and INR price ranges.
  - `data/problem-2/taxi_companies.json`: 11 licensed taxi suppliers, operating hours, airports, coverage areas, and complete vehicle fleet specs.
  - `data/problem-2/booked_rides.json`: 14 pre-existing vehicle bookings defining active busy slots.
  - `data/problem-2/open_requests.json`: 8 pre-seeded open benchmark requests.
- **Software Implementation**:
  - Complete 8-page React 18 application in `src/pages/`.
  - Service abstraction in `src/services/apiService.ts` and mock engine in `src/mocks/`.
  - Automated test suite in `scripts/test-prototype.ts` validating all 25 core business rule scenarios (25/25 passing).
  - Production build verified in `dist/`.

## Product Principles

1. **Deterministic Rule Enforcement**: Every constraint (R1–R9, M6) is enforced programmatically. Refusals explicitly cite the violated rule and required threshold; the system never presents vague errors.
2. **Upfront Price Integrity**: Both traveler budget bids and supplier offers are strictly anchored within officially certified route price corridors. No hidden charges or unvetted estimates.
3. **Physical & Temporal Grounding**: Vehicles cannot be assigned or booked unless they physically seat all passengers, hold all luggage, and have zero schedule overlap including return travel time.
4. **Clean Contract Decoupling**: UI components strictly consume service APIs without embedded business logic or database concerns, preserving full portability between mock state and production REST servers.
5. **Calm, High-Contrast Usability**: High visual hierarchy, 44px+ hit targets, single primary call-to-action per view, and clear visual state persistence (greyed cards for rejected/expired offers rather than abrupt disappearing elements).

## Accessibility & Inclusion

- High contrast text ratios conforming to WCAG AA: Primary Ice text on Night Sky Navy exceeds 13:1 contrast; large action buttons exceed 3:1 contrast.
- Minimum 44px touch and pointer hit targets across all buttons, dropdown triggers, and navigation tabs.
- Full keyboard navigation support with prominent 2px high-visibility focus rings (`--focus-ring: #E9F5F5` with 2px offset).
- Semantic HTML markup (`<main>`, `<nav>`, `<header>`, `<article>`, `<button>`) with descriptive ARIA attributes for real-time status alerts and dynamic badge counters.

