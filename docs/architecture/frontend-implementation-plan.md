# Frontend Implementation Plan

## Assumptions (correct me if wrong)

-   Backend already exists at `localhost:4000/api/v1`, as in your API
    guide.
-   Repository layout: `server/` + `client/`.
-   If no backend exists yet, say so and I will add backend steps first.
-   BRD and API guide disagree. I will follow the API guide:
    -   Paths: `/api/v1/...`
    -   Offer status: `OPEN` (BRD says `OFFERED`)
    -   Change status: `WAITING` (BRD says `PENDING`)
    -   Accept/reject: one `/respond` endpoint.
-   Migrations: none.
-   Database: MongoDB, with no schema changes.
-   The only possible backend change is flagged in Step 15.
-   New dependencies are limited to Step 2: `react`, `react-dom`,
    `react-router-dom`, `vite`, and `@vitejs/plugin-react`. No other
    dependencies are planned.

### Riskiest unknowns (front-loaded)

1.  Real JSON shapes: dashboard items, change requests, and supplier
    bookings.
2.  Rule errors rendering exactly as required for the R5/R6 demo
    refusals.
3.  Booking persists across a backend restart (M5).
4.  No double booking (M6).
5.  Change flow (M7).

------------------------------------------------------------------------

## 1. Contract smoke test + fixtures

**Files** - `scripts/contract-check.mjs` - `scripts/fixtures/*.json`

**Change**

Create a Node script using built-in `fetch` that hits all 14 endpoints
and saves real responses. Add a `--seed-menon` flag to create the Menon
request.

**Verify**

-   Script prints pass/fail for each endpoint.
-   Check fixtures to answer:
    -   Does a dashboard item carry flight, hotel, passenger count,
        bags, and price range?
    -   Where do supplier confirmed bookings come from?
    -   What is the shape of a `change_requests` item?

**Flags:** None.

The answers determine Steps 6, 15, and 16.

## 2. Scaffold client

**Files** - `client/package.json` - `vite.config.ts` - `index.html` -
`src/main.tsx` - `src/App.tsx`

**Change**

Set up Vite, React, and the router. Configure the dev proxy `/api` →
`:4000` to avoid CORS.

**Verify**

-   `npm run dev` loads.
-   Placeholder page displays the backend `/catalog/bootstrap` flight
    count.

**Flags:** New dependencies.

## 3. Tokens + shell

**Files** - `src/styles/tokens.css` - `src/styles/global.css` -
`src/components/NavBar.tsx` - `src/components/Layout.tsx`

**Change**

Implement the brief's colors, typography, spacing, and radius as CSS
variables. Add a translucent 64px navigation bar, a 1200px content
container, and visible focus rings.

**Verify**

-   Blank page renders with a navy background, ice-colored text, and
    navigation.
-   Navigation stays sticky.
-   Pressing Tab displays the focus ring.

**Flags:** Palette codes are still unconfirmed: `#0D2550`, `#316FF5`.

## 4. API client + rule banner

**Files** - `src/api/client.ts` - `src/api/types.ts` -
`src/components/RuleBanner.tsx` - Temporary: `src/pages/DevErrors.tsx`

**Change**

Create one `request()` function that unwraps the response envelope and
throws a typed `ApiError` containing `ruleViolated`, `message`, and
`details`.

The banner displays the rule chip and message, with `role="alert"`.

**Verify**

-   Temporary page posts an out-of-range price.
-   Banner displays `R3` and the backend message.
-   A booking 404 displays a "not found" state.

**Flags:** Temporary page is deleted in Step 22.

## 5. Session + Role picker (P1)

**Files** - `src/session/SessionContext.tsx` -
`src/session/CatalogContext.tsx` - `src/pages/RolePicker.tsx` -
`src/App.tsx` routes

**Change**

Store role and company in `sessionStorage`. Populate companies from
bootstrap data (name + airports). Keep Confirm disabled until the
selection is valid.

Navigation displays the selected role and a "Switch role" action.

**Verify**

-   Pick Supplier → choose company → Confirm → route changes.
-   Refresh preserves the role.
-   Switching roles clears the current session selection.

**Flags:** None.

## 6. Supplier dashboard (P6), open requests only

**Files** - `src/pages/SupplierDashboard.tsx` -
`src/components/RequestCard.tsx` - `src/components/Skeleton.tsx` -
`src/components/EmptyState.tsx`

**Change**

Call `GET /suppliers/:id/dashboard`. Build the fleet summary from
bootstrap data. Add loading skeletons, an empty state, and an error
banner.

Clicking a card routes to `/supplier/request/:id` (placeholder
initially).

**Verify**

-   Sakura Cabs displays the seeded requests.
-   A company with no eligible requests displays "No eligible requests
    right now".
-   Stopping the backend displays an error state without crashing the
    app.

**Flags:** If Step 1 finds that the dashboard response lacks a price
range, fetch `GET /requests/:id` for each card.

## 7. Assign car (P7), single car

**Files** - `src/pages/AssignCar.tsx` -
`src/components/VehiclePicker.tsx` - `src/components/PriceField.tsx`

**Change**

Build the request detail panel. Render radio vehicle cards from
`vehicle_evaluations`; ineligible vehicles are disabled and show the
reason.

Add a price input. Submit the offer with `POST`. Display rule errors
through the banner. Lock the submit action while the request is in
flight.

**Verify (demo script)**

-   SC-2 → R6 banner.
-   SC-1 → R5 banner.
-   SC-3 at ₹12,500 → success, then return to the dashboard.

**Flags:** Requires the Menon request. Use `--seed-menon` from Step 1.

## 8. Request form fields + live range (P2, no submit)

**Files** - `src/pages/RequestForm.tsx` -
`src/components/FlightSelect.tsx` - `src/components/HotelSelect.tsx` -
`src/components/ChildAgeRows.tsx` -
`src/components/RouteSummaryCard.tsx`

**Change**

Populate dropdowns from bootstrap data. Filter the hotel list by
airport.

Once both flight and hotel are selected, call `GET route-preview`.
Display the price range and earliest pickup in a sticky card. Show R1 on
a mismatch.

**Verify**

-   FL-401 + Ueno → ₹10,200--₹16,800 and 11:30.
-   A mismatched flight/hotel pair displays R1.
-   Child rows can be added and removed.

**Flags:** None.

## 9. Request submit

**Files** - `src/pages/RequestForm.tsx` -
`src/session/requestStore.ts` - `src/pages/OffersList.tsx` (stub)

**Change**

Call `POST /requests`. Only flight, hotel, adults, and price block
submission. Omit optional pickup/car type when blank.

Save `request_id` in the session. On success, navigate to
`/traveler/offers/:id` (stub initially).

**Verify**

-   Menon values → route changes.
-   Price ₹9,000 → R3 banner; remain on the page.
-   Pickup 11:00 → R2 banner.

**Flags:** None.

## 10. Offers list (P3), read-only

**Files** - `src/pages/OffersList.tsx` -
`src/components/OfferCard.tsx` - `src/components/SummaryStrip.tsx` -
`src/components/NoSupplierState.tsx`

**Change**

Call `GET /requests/:id` and poll every 5 seconds.

Implement the waiting state, offer cards (supplier, rating, car, and
price), and zero-supplier state listing `ineligible_reasons` with rule
chips.

**Verify**

-   After Step 7 creates an offer, its card appears without a manual
    refresh.
-   A request with an unserviceable route displays the reasons.

**Flags:** None.

## 11. Book / Reject

**Files** - `src/components/OfferCard.tsx` -
`src/components/ConfirmPopover.tsx` - `src/pages/OffersList.tsx`

**Change**

-   Reject updates the card in place to a greyed-out state with a label.
-   Book opens a confirmation prompt, calls `POST book`, then navigates
    to `/traveler/booking/:number`.
-   Sibling offers change to `NOT_CHOSEN` and appear greyed out.

**Verify**

Demo Step 4: - Reject EP-2. - Book SC-3. - Confirm the booking number is
returned. - Confirm the other card is greyed out. - Confirm the rejected
card has no buttons.

**Flags:** None.

## 12. Booking summary + lookup (P4)

**Files** - `src/pages/BookingSummary.tsx` -
`src/components/BookingNumber.tsx` - `src/components/LookupBox.tsx`

**Change**

Call `GET /bookings/:no`. Display a prominent monospaced booking number
with a Copy action. Add a lookup box and a not-found state.

Add a "Request a change" button that initially routes to a stub.

**Verify**

-   Restart the backend.
-   Reload the page and look up the same booking number.
-   Confirm the booking still exists (M5).
-   An incorrect number displays "not found".

**Flags:** None.

## 13. Book-time refusals (M6, R8)

**Files** - `src/components/OfferCard.tsx` - `src/pages/OffersList.tsx`

**Change**

Map R6/R8 errors from booking to a card-level message. Refetch the offer
list so stale state is corrected.

**Verify**

-   Create two requests for the same car and time; offer the same car to
    both.
-   Booking the first succeeds.
-   Booking the second displays an R6 message.
-   Booking a rejected offer displays R8.

**Flags:** None.

## 14. Change request (P5, traveler)

**Files** - `src/pages/ChangeRequest.tsx` -
`src/components/StatusChip.tsx`

**Change**

Display a read-only booking card. Allow a new flight and/or pickup time;
at least one change is required.

Call `POST /change-request`. Map the `WAITING` status to the UI label
"Pending". Poll the booking until the request is decided.

**Verify**

-   Submit a change request and confirm "Pending" is displayed.
-   An empty form is blocked with a message.
-   P4 continues to show the old details until the change is accepted.

**Flags:** API uses `WAITING`, not `PENDING`.

## 15. Supplier "My bookings" tab

**Files** - `src/pages/SupplierDashboard.tsx` -
`src/components/Tabs.tsx` - `src/components/BookingRow.tsx`

**Change**

Add a tab for confirmed bookings, with a badge for pending changes. Use
`my_offers` / `change_requests` from the dashboard response, based on
the findings in Step 1.

**Verify**

-   After booking + change request, the tab badge displays 1.
-   The row links to P8.

**Flags:** If the dashboard has no bookings list, a small backend
endpoint is required. Stop and ask before touching `server/`.

## 16. Change response (P8)

**Files** - `src/pages/ChangeResponse.tsx` -
`src/components/DiffTable.tsx`

**Change**

Display an old-versus-new table, with changed cells highlighted.
Accept/reject through `POST /respond`. Display R9 errors through the
banner; the booking remains unchanged when the change is rejected.

**Verify**

Demo Step 5: - Accept → booking displays FL-402 and the updated pickup
time. - Reject → traveler sees "Rejected"; old details remain. - A
change that makes the car busy displays an R9 banner.

**Flags**

-   No preview endpoint exists for the pre-check.
-   The brief requested a "would pass?" panel. I will ship a static note
    ("Server re-checks") unless you want a backend endpoint.

## 17. Demo reset + full Menon run

**Files** - `src/components/Footer.tsx` - `src/api/admin.ts`

**Change**

Add a small "Reset demo data" link that calls `/admin/reset-demo` behind
a confirmation prompt.

**Verify**

Run the complete 4-minute demo script end to end. Reset should restore
clean seed data.

**Flags:** This is a judge-facing destructive action; a confirmation
dialog is mandatory.

## 18. G2 car type filter

**Files** - `src/pages/RequestForm.tsx` -
`src/components/VehiclePicker.tsx`

**Change**

Add an optional dropdown: Hatchback / Sedan / SUV / Bus / Any. Send
`car_type`. Disable vehicles of other types in the picker and show the
reason.

**Verify**

-   An SUV request disables Sakura's sedan.
-   "Any" omits the field.

**Flags:** None.

## 19. G4 expiry + countdown

**Files** - `src/pages/AssignCar.tsx` -
`src/components/CountdownChip.tsx` - `src/components/OfferCard.tsx`

**Change**

Add an expiry picker defaulting to +10 minutes. Display a countdown
chip, with a warning color during the last 60 seconds.

When an offer expires, grey out the card and remove Book.

**Verify**

-   Set a 1-minute expiry.
-   Confirm the chip counts down and changes to Expired.
-   Forcing a booking after expiry is refused with R8.

**Flags:** None.

## 20. G1 add another car

**Files** - `src/pages/AssignCar.tsx` - `src/components/OfferBlock.tsx`

**Change**

Add repeatable vehicle + price blocks, each removable. Submit one `POST`
per block and report each block's result.

**Verify**

-   Offer SC-3 and a second eligible car from Sakura.
-   Confirm both cards appear on P3.
-   If one block fails, its rule error is shown independently while the
    other successful offer still appears.

**Flags:** Partial-success handling is the risk. Verify carefully.

## 21. G5 sort / filter

**Files** - `src/pages/OffersList.tsx` -
`src/components/OfferControls.tsx`

**Change**

Add price sort (ascending/descending) and car-type filtering through
`?sort=&car_type=` query parameters on `GET /requests`.

**Verify**

-   Sorting changes the order.
-   Filtering shows only the selected type.
-   Greyed-out cards remain visible, as required by the rules.

**Flags:** None.

## 22. Polish + handoff

**Files** - Delete `src/pages/DevErrors.tsx` - `README.md` -
Accessibility fixes across components

**Change**

Remove the temporary page. Write the README with run steps,
architecture, and known limitations.

Add reduced-motion CSS, `aria-live` regions, and audit rupee/local-time
formatting.

**Verify**

-   Complete a keyboard-only pass of both flows.
-   No console errors.
-   A fresh clone runs in two commands.

**Flags:** None.

------------------------------------------------------------------------

## Execution protocol

Say **"go"** and I will start Step 1.

I will stop after each step and wait for your approval before
proceeding.
