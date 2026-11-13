# Airport Taxi Platform – BRD & PRD

Nov 13, 2026 · @Vikshith Kumar

## 1. Overview & Problem Statement

Travelers landing after a long flight need a taxi sized to their family and bags, booked in advance, at a price agreed upfront — not a surprise at the curb. Taxi suppliers need to see only the rides they can actually serve, so no car gets double-booked or mismatched to a request it can't fit.

This is a two-sided ride-matching platform for airport-to-hotel transfers, built as a hackathon deliverable: 2-person team, \~9-10 hour build window, MERN stack with MongoDB, demoed live to judges who will also post their own unseen requests and try to break the rules.

Two flows, no login (role picked at start):

- **Traveler** — posts a ride request, sees offers from eligible suppliers, books one, gets a booking number, can request a flight/pickup change later.
- **Supplier** — sees only requests it can legally and physically serve, assigns a car + price per request, responds to change requests on its own bookings.

## 2. Goals & Success Metrics

Primary goal: survive live judge testing — unseen requests, unseen cars, deliberate rule-breaking attempts — not just the scripted Menon demo.

Success criteria, mapped to the stated judging weights:

| Judging area | Weight | What "done" looks like |
| --- | --- | --- |
| Working end-to-end feature | 25% | Full traveler + supplier flow runs without manual DB edits |
| Correctness on new requests/cars | 25% | R1-R9 enforced server-side; survives judges' unseen inputs |
| Individual understanding | 20% | Either teammate can explain any file and make a small live code change |
| Product & UX | 15% | Clear price range, clear refusal reasons, clear "no supplier available" messaging |
| Engineering quality | 15% | Clean data model, readable code, README with run steps + architecture + known limits |

## 3. Users & Personas

No login. User picks a role at start: Traveler, or one of the suppliers listed in taxi\_companies.json. Role choice persists in browser session storage for that tab.

**Traveler — Menon family**: NRT → Ueno Garden Inn, 2 adults + 1 child (6), 3 large + 2 small bags, flight FL-401 lands 10:30. Wants a fair price and a car that fits, wants the price range before committing, wants to compare offers from several suppliers before booking.

**Supplier — Sakura Cabs**: works NRT/HND, serves 6 Tokyo areas, fleet of 4 vehicles (2 SUV, 1 Sedan, 1 Hatchback), hours 06:00-23:00. Wants to see only requests it can serve, assign the right car at a profitable in-range price, and not lose a booked car to a scheduling conflict.

## 4. Scope — Feature Priority

Scoped for a 2-person, \~9-10 hour build. Must-haves are the full judged baseline; Good-to-haves are built only after all Musts pass; Stretch is documented for completeness but not planned into the build.

| Priority | ID | Feature | Build it when |
| --- | --- | --- | --- |
| Must-have | M1 | Ride request form + R1/R2/R3 validation + live price range | Hour 1-3 |
| Must-have | M2 | Supplier dashboard — only eligible requests (R4) | Hour 3-4 |
| Must-have | M3 | Assign car + price, rule-checked (R5/R6/R7) | Hour 4-5 |
| Must-have | M4 | Traveler sees all offers, books or rejects (R8) | Hour 5-6 |
| Must-have | M5 | Booking number + summary, restart-safe | Hour 6 |
| Must-have | M6 | No-double-booking check at confirm | Hour 6-7 |
| Must-have | M7 | Change request + supplier accept/reject (R9) | Hour 7-8 |
| Good-to-have | G1 | Several cars per supplier per request | After Musts |
| Good-to-have | G2 | Traveler picks car type pre-request; supplier limited to that type | After Musts |
| Good-to-have | G4 | Offer expiry (10 min default), expired offer unbookable | After Musts |
| Good-to-have | G5 | Sort by price / filter by car type on offers list | After Musts, if time |
| Stretch (documented only) | S1 | Shared ride across two requests, same flight + area | Not planned |
| Stretch (documented only) | S2 | Open/own-idea feature | Not planned — left blank per team decision |

## 5. Functional Requirements

All rules enforced server-side. Frontend only renders backend responses and errors — no client-side rule logic that could be bypassed.

**FR1 — Ride request validity (R1)**: flight and hotel must exist in catalog; arrival airport must serve the hotel's city. ≥1 adult required. Child = age 0-17. Invalid → clear message naming which field failed.

**FR2 — Pickup time (R2)**: pickup ≥ landing time + 60 min (local). Traveler may choose later. Violation blocks request creation.

**FR3 — Price range (R3)**: range pulled from routes.json by (arrival airport → hotel area). Traveler's price must be within \[price\_min\_inr, price\_max\_inr\]; out-of-range is refused with the range shown.

**FR4 — Supplier visibility (R4)**: a supplier sees a request only if: it operates at the arrival airport AND drives to the hotel's city+area AND is open at pickup time AND owns ≥1 car that fits (FR5) and is free (FR6). If zero suppliers qualify, traveler sees "no supplier available" with the specific reason (airport/area/hours/fit/availability).

**FR5 — Car fit (R5)**: seats ≥ total passengers (adults + children); large\_bags/small\_bags ≥ requested; car type in {HATCHBACK, SEDAN, SUV, BUS}.

**FR6 — Car availability (R6)**: a car is busy from pickup until pickup + 2×drive\_minutes (same drive\_minutes used for both legs, confirmed: e.g. 35 min each way = 70 min total busy window). Two busy windows for the same vehicle\_id can never overlap. booked\_rides.json pre-existing bookings count toward this check.

**FR7 — Assign a car (R7)**: supplier picks one of its own vehicles + sets a price inside the route's range. Backend validates FR4/FR5/FR6/FR3 again at assignment time; a failing assignment is refused and names the exact rule broken (not a generic error).

**FR8 — Book or reject (R8)**: traveler sees every assigned offer (supplier, car, price) for their request and can Book exactly one or Reject each. Note: the supplier's price is independent of the traveler's quoted price — it only needs to be inside the same range, not match. Booking generates a unique 10-digit booking number; all other offers for that request flip to "not chosen"; the booked vehicle becomes busy per FR6. A rejected offer can never be booked. If the vehicle became busy between offer and booking (another booking landed first), the booking is refused — see FR-M6.

**FR9 — Change request (R9)**: post-booking, traveler submits a new flight and/or pickup time. Supplier accepts or rejects. On accept, backend re-validates only FR2 (new pickup ≥ new landing + 60 min) and FR6 (same vehicle free at the new busy window) — not the full FR1/FR3/FR4 chain, since route/price/eligibility were already settled at booking. Reject keeps the original booking unchanged. Supplier cannot unilaterally retract or reassign an already-assigned offer outside this flow.

**FR-M6 — No double booking**: before writing a booking as CONFIRMED, backend re-checks that the target vehicle has no existing CONFIRMED booking whose FR6 window overlaps the new one. First booking to reach the backend for a given vehicle/time wins; a later conflicting booking attempt is rejected with a clear error. Sequential checks only — no distributed locking needed (confirmed: no simultaneous-request race handling required).

## 6. User Flows

**Traveler flow**

1. Pick "Traveler" role.
2. Select flight + hotel (dropdowns from catalog).
3. Enter adults, children's ages, bags, optional car type (G2), optional pickup time.
4. See suggested price range for the route; enter price within range.
5. Submit → request created (or clear error if R1/R2/R3 fails).
6. See offers as suppliers assign them (supplier, car, price); sort/filter if G5 built.
7. Book one offer or reject individually; rejected offers cannot be rebooked.
8. Get 10-digit booking number → summary screen (flight, hotel, pickup, supplier, car, price).
9. Optionally submit a change request (new flight/pickup) → see accepted or rejected result.

**Supplier flow**

1. Pick supplier (company) from list.
2. See dashboard of only the open requests this supplier is eligible to serve (FR4), with full request details.
3. Open a request → pick one of its own vehicles + set a price.
4. Submit → accepted (now visible to traveler as an offer) or refused with the exact rule broken.
5. See whether the traveler booked or rejected the offer.
6. Receive change requests on its bookings → accept or reject each.

## 7. Data Model

Catalog JSON files (taxi\_companies, routes, booked\_rides, open\_requests, flights, hotels, airports) are seeded once into read-only MongoDB collections at startup — same shape as the source files, never mutated by the app. New app state lives in its own collections.

| Collection | Key fields | Purpose |
| --- | --- | --- |
| suppliers (seeded) | company\_id, airports\[\], areas\[\], service\_from/until, vehicles\[\] | Read-only reference, as given |
| routes (seeded) | airport, city, area, drive\_minutes, price\_min\_inr, price\_max\_inr | Read-only reference, as given |
| bookedRides (seeded) | vehicle\_id, pickup time, drive\_minutes | Pre-existing busy windows, read-only |
| rideRequests (new) | flight, hotel, adults, children\[ages\], bags, pickup, travelerPrice, carTypeFilter?, status | One per traveler submission |
| offers (new) | requestId, companyId, vehicleId, price, status (OFFERED / NOT\_CHOSEN / BOOKED / REJECTED / EXPIRED), expiresAt? | One per supplier assignment (supports G1: many per request) |
| bookings (new) | offerId, requestId, bookingNumber (10-digit, unique), vehicleId, busyFrom, busyUntil, status | Created on FR8 book action |
| changeRequests (new) | bookingId, newFlight?, newPickup?, status (PENDING/ACCEPTED/REJECTED) | FR9 flow |

bookingNumber is generated unique (retry-on-collision) and indexed for O(1) lookup on the summary page, independent of in-memory state, so it survives a backend restart.

## 8. Tech Stack & Architecture

**Stack: MERN — MongoDB, Express, React, Node.** Confirmed over SQLite for this build, for three reasons:

1. MERN names Mongo as its default store — no extra driver/ORM decision, Mongoose gives schema validation fast.
2. Source JSON (taxi\_companies, routes, etc.) is already nested/document-shaped (vehicles\[\], areas\[\]) — seeds straight into Mongo documents with near-zero transformation; a relational schema would need normalization work the 9-10 hour window can't spare.
3. No migrations: new collections (rideRequests, offers, bookings, changeRequests) can be added/changed mid-hackathon without a schema-migration step, which matters when requirements shift during the build.

**Layers**

| Layer | Responsibility |
| --- | --- |
| React frontend | Role picker, traveler form + offers view + summary, supplier dashboard + assign form. Calls backend REST API only — no rule logic client-side. |
| Express API | All routes/controllers; owns every validation in Section 5 (FR1-FR9, FR-M6). |
| Service layer (Node) | Pure functions: validateRequest, findEligibleSuppliers, checkCarFit, checkCarFree, priceInRange, generateBookingNumber. Unit-testable, used by controllers. |
| MongoDB (Mongoose) | Seeded read-only catalog collections + new app-state collections (Section 7). |
| Seed script | One-time load of all data/problem-2/*.json + data/catalog/*.json into Mongo on first run — run once, documented in README as part of the 1-2 start commands. |

Frontend never computes price ranges, car fit, or busy windows itself — it only renders what the API returns, so judges changing data or trying to break rules can't be bypassed client-side.

## 9. API Endpoints (high-level)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/catalog/flights, /hotels, /airports | Populate dropdowns |
| GET | /api/routes/price-range?flight=&hotel= | Live suggested range (FR3) |
| POST | /api/requests | Create ride request (FR1-FR3) |
| GET | /api/requests/:id | Request detail + its offers |
| GET | /api/suppliers/:companyId/requests | Eligible open requests for that supplier (FR4) |
| POST | /api/requests/:id/offers | Supplier assigns car + price (FR5-FR7) |
| GET | /api/requests/:id/offers | All offers for traveler to view |
| POST | /api/offers/:id/book | Traveler books (FR8, FR-M6) |
| POST | /api/offers/:id/reject | Traveler rejects one offer |
| GET | /api/bookings/:bookingNumber | Booking summary (FR8/M5) |
| POST | /api/bookings/:id/change-request | Traveler submits change (FR9) |
| POST | /api/change-requests/:id/accept\|reject | Supplier responds (FR9) |

## 10. Non-Functional Requirements

- **Persistence**: all requests, offers, bookings, change requests live in MongoDB, not in-memory — survives a backend restart and a page refresh (M5, M6).
- **No AI inside the app**: no call to any LLM/AI model, cloud or local, at runtime. AI coding assistants during the build are fine.
- **Platform**: desktop browser demo only — no mobile responsiveness required.
- **Data integrity**: original JSON files in data/ are never written to; the app only reads them once at seed time.
- **Startup**: app starts in 1-2 commands (documented in README) — e.g. one command to seed Mongo, one to run both servers (or a concurrently/npm script combining both).
- **Concurrency**: sequential correctness only — no optimistic locking or transactions needed for simultaneous booking attempts (confirmed by organizers); M6's check-then-write is sufficient.

## 11. Edge Cases & Confirmed Decisions

| Question | Decision |
| --- | --- |
| Busy window math (R6) | Symmetric: pickup → pickup + 2×drive\_minutes (e.g. 35 min each way = 70 min total busy), same drive\_minutes both legs |
| Change request re-validation (R9) | Re-check pickup rule (R2) + car-free (R6) only — not full R1/R3/R4 chain |
| Supplier retracting an assigned offer | Not allowed — only the traveler's book/reject and the R9 change flow can change an offer's fate |
| Multiple offers per supplier per request | Backend data model supports it structurally (G1-ready) even if UI for several cars ships later |
| Traveler's quoted price vs supplier's price | Independent — supplier price only needs to be inside the route range, doesn't need to match traveler's number |
| Role selection persistence | Session-based (browser session storage), no login |
| Double-booking resolution (M6) | First booking to reach the backend for a vehicle/time slot wins; later conflicting attempt is rejected — no locking needed |
| Database | MongoDB (reasoning in Section 8) |
| Car type filter (G2) | Applied by traveler before posting the request, not after seeing offers |
| Offer expiry default (G4) | 10 minutes from assignment time |
| open\_requests.json | Pre-existing open requests, visible to eligible suppliers from app start (not just reference data) |

## 12. Out of Scope for MVP

- S1 shared rides (two requests sharing one car) — documented, not built.
- S2 open/own-idea feature — left blank per team decision; can be added only if all Musts + Good-to-haves finish early.
- Real payments or real dispatch — bookings are simulated only, no money moves, no data files change (per FAQ).
- User login/authentication — role is self-selected, no accounts.
- Database-level locking / optimistic concurrency — explicitly not required by organizers.
- Mobile-responsive UI — desktop demo only.
- Online deployment — runs locally for the demo.

## 13. Open Items / Assumptions Log

| Item | Status |
| --- | --- |
| Offer expiry check mechanism (client poll vs server-side TTL check on read) | Implementation detail, left to dev — doesn't change behavior spec |
| Exact seed script behavior if Mongo already has data (re-seed vs skip) | Left to dev; recommend: drop + reseed catalog collections, never touch app-state collections |
| UI for G1 (multiple cars per supplier per request) | Data model ready; UI build only after Musts pass |
| Vehicle type enum (HATCHBACK/SEDAN/SUV/BUS) | Fixed per spec — not extensible without a data file change (not allowed) |
| S2 own-idea feature | Intentionally blank — team may propose one only if time remains |

## 14. Build Plan — Compressed Window

Must-haves (M1-M7) built in 5-6 hours. Remaining time goes to Good-to-haves first, then any other feature work.

| Hour | Block |
| --- | --- |
| 0-0.5 | Repo setup, Mongo schema + seed script, Express + React skeletons, role picker |
| 0.5-1.5 | Catalog + price-range endpoints; traveler request form UI; FR1-FR3 validation |
| 1.5-2.5 | FR4 eligibility logic + supplier dashboard UI |
| 2.5-3.5 | FR5-FR7 car fit/free/assign logic + supplier assign UI |
| 3.5-4.5 | FR8 offers view, book/reject, booking number + summary page |
| 4.5-5.5 | FR-M6 double-booking guard; FR9 change request flow both sides |
| 5.5-6 | End-to-end Menon scenario run, fix breakage — all Musts (M1-M7) done by hour 6 |
| 6-8 | Good-to-haves in priority order: G2 (car type filter) → G4 (10-min offer expiry) → G1 (multiple cars per supplier) → G5 (sort/filter offers) |
| 8-9/10 | Remaining time: README, polish, judge-input stress test, any further feature the team adds |

If Must-haves slip past hour 6, Good-to-haves are cut first — never skip M1-M7 or the restart/persistence check to make room for G-features.
