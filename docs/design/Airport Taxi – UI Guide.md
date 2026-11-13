# Airport Taxi – UI Guide

Nov 13, 2026 · @Vikshith Kumar

## Page Map — 8 Pages/Screens

Minimum needed to cover every Must-have flow. Desktop only, no responsive breakpoints needed.

| # | Page | Role | Covers |
| --- | --- | --- | --- |
| 1 | Role picker | Both | Entry point |
| 2 | Ride Request form | Traveler | M1 |
| 3 | Offers list | Traveler | M4 |
| 4 | Booking summary | Traveler | M5 |
| 5 | Change request | Traveler | M7 (request side) |
| 6 | Supplier dashboard | Supplier | M2 |
| 7 | Assign car | Supplier | M3 |
| 8 | Change request response | Supplier | M7 (response side) |

Pages 3+4 and 6+7 can collapse into fewer screens later (e.g. offers shown as a panel on the request page) — listed separately here so nothing gets missed while building.

## Page 1: Role Picker

**Contains**

- Two large buttons: "I'm a Traveler" / "I'm a Supplier"
- If Supplier chosen: a dropdown/list of companies from taxi\_companies.json (name + airports served)
- Confirm button → routes to Page 2 (traveler) or Page 6 (supplier)

**Done when**: role + (if supplier) company id is saved to session storage and used on every later API call.

## Page 2: Traveler — Ride Request Form

**Contains**

- Flight dropdown (shows arrival airport + date/time once picked)
- Hotel dropdown (filtered to cities the flight's airport serves)
- Adults (number input, min 1)
- Children: "Add child" rows, each just an age input (0-17)
- Bags: large bags count, small bags count
- Car type filter (G2): optional dropdown — Hatchback / Sedan / SUV / Bus / Any
- Pickup time: optional; if blank, backend's minimum (landing + 60 min) is shown as a default/placeholder
- Live price range banner: "Suggested: ₹X – ₹Y for this route" — updates as soon as flight + hotel are both chosen
- Traveler's price input (must be inside the shown range)
- Submit button
- Inline error area: shows the exact rule broken (R1 invalid flight/hotel, R2 pickup too early, R3 price out of range) — never a generic "invalid request"

**Done when**: valid submit routes to Page 3 (waiting-for-offers state if none yet); invalid submit shows the specific error, no page change.

## Page 3: Traveler — Offers List

**Contains**

- Request summary strip at top (flight, hotel, pax, bags, pickup)
- "No supplier can serve this" state: shown with the specific reason (no airport match / no area match / closed at pickup time / no car fits/free) when FR4 finds zero suppliers
- One card per offer: supplier name + rating, car type + seats/bags, price, countdown if G4 expiry is on
- Book button and Reject button on each card
- Sort by price / filter by car type controls (G5, built only after Musts)
- Booked/rejected/not-chosen cards shown greyed out with their status label, not removed from the list

**Done when**: Book routes to Page 4 with the booking number; Reject just updates that card's status in place.

## Page 4: Traveler — Booking Summary

**Contains**

- The 10-digit booking number, large and copyable
- Flight, hotel, pickup time, supplier name, car type, price
- "Enter a booking number" lookup box (so this page also works standalone after a restart)
- "Not found" state for a wrong/unknown number
- "Request a change" button → Page 5

**Done when**: looking up any valid booking number here works even after a backend restart (M5).

## Page 5: Traveler — Change Request

**Contains**

- Current booking details, read-only, at top
- New flight dropdown (optional) and/or new pickup time input (optional) — at least one required
- Submit button
- Status area: Pending / Accepted / Rejected, shown after submit; booking page (Page 4) also reflects the result

**Done when**: traveler can see whether the supplier accepted or rejected, and the booking shows the old details unchanged on a rejection.

## Page 6: Supplier — Dashboard

**Contains**

- Company name + its fleet summary (vehicle types/counts) at top
- List of open requests this supplier is eligible for (FR4 already filtered server-side) — one row/card per request: flight, hotel area, pax, bags, pickup, traveler's price range
- Empty state: "No eligible requests right now" when the list is empty
- Click a request → Page 7
- A "My bookings" tab/section: confirmed bookings for this supplier, with a badge for any pending change request → Page 8

**Done when**: a supplier never sees a request it can't serve, and never has to hunt for a pending change request.

## Page 7: Supplier — Assign Car

**Contains**

- Full request detail (flight, hotel, pax, bags, pickup, price range)
- Vehicle picker: only this company's cars, limited to the request's car type filter if G2 was set
- Price input (must be inside the route's range)
- "Add another car" button (G1) to make a second offer on the same request
- Expiry time picker (G4), defaulting to 10 minutes from now
- Submit → on success, offer appears on traveler's Page 3; on failure, exact rule broken is shown (wrong seats/bags, car busy, price out of range) — never a generic error

**Done when**: a supplier can't submit a car/price combo that breaks R5/R6/R7 without seeing exactly why.

## Page 8: Supplier — Change Request Response

**Contains**

- Original booking detail vs requested change, side by side (old flight/pickup vs new)
- Whether the new pickup/car-free check would pass, shown before the supplier decides (helps them decide, backend re-validates anyway)
- Accept / Reject buttons
- Confirmation message after the decision; traveler's Page 5/4 updates accordingly

**Done when**: a supplier can't accept a change that would break R2 or double-book the car — the backend blocks it even if they try.

## Shared UI Rules (across all 8 pages)

- Every refusal shown names the exact rule broken (R1-R9), never a generic "error" or HTTP status code.
- Every form disables Submit while a request is in flight, and shows a spinner/loading state — no double-submits.
- Nav bar on every page: current role + company (if supplier), and a "switch role" link back to Page 1.
- Prices always shown as ₹ with thousands separators (₹12,000, not 12000).
- Dates/times always shown in local time with the airport/city named, to avoid timezone confusion across routes.
- Consistent card/table pattern for "list of things" pages (3, 6): same card shape for offers and for eligible requests.
- No page blocks on a missing optional field (children, pickup time, car type) — only required fields (flight, hotel, adults, price) block submit.
