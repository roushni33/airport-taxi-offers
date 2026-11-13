# Airport Taxi — UI/UX Design Brief

Draft v1 · Nov 13, 2026 · Scope: all 8 pages, Traveler + Supplier flows · Desktop only

## 0. Read first: assumptions and flags

| # | Flag | What this brief did |
| --- | --- | --- |
| 1 | `#0d255` has 5 hex digits, not valid | Assumed **#0D2555** (deep navy). Swap one token if wrong. |
| 2 | `#316f59` is a muted **green**, not electric blue | Assumed typo for **#E9f1FE** (electric blue). Swap one token if you really want the green. |
| 3 | Apple `design.md` was not uploaded | Could not read it. Type, spacing, radius, motion below use Apple-style conventions (system font, 4pt grid, large radii, restrained motion). Send the file and the non-color tokens get replaced 1:1. |
| 4 | Template placeholders `[SCREEN OR FLOW]`, `[USERS]` left blank | Filled from your files: flow = full 8-page booking flow; users = Traveler and Supplier. |
| 5 | Responsive not needed (BRD §10, §12) | One desktop layout. Breakpoints section covers desktop widths only. |

Rules from the BRD that shape the UI: all rule logic is server-side, so UI only renders backend answers; every refusal must name the rule (R1–R9); no login, role lives in session storage.

## 1. Audience

**Traveler (example: Menon family).** Just landed or planning ahead, tired, carrying bags, has kids. Wants: fair price known up front, a car that fits, several offers to compare, a booking number to keep. Fear: surprise price at the curb, car too small. Needs calm, big targets, zero jargon.

**Supplier (example: Sakura Cabs dispatcher).** At a desk, scanning many requests fast. Wants: only rides it can serve, assign right car at in-range price, never double-book. Fear: lost car to a conflict, hunting for a change request. Needs dense-but-clear lists, exact reasons on refusal, one-glance status.

**Judges (hidden third audience).** Will type bad input on purpose. Every failure state must look designed, not broken.

## 2. Design direction

**Feel:** quiet, confident, night-sky. Deep navy canvas, ice-blue type, one electric-blue action color. Like a cabin at night: calm, trustworthy, nothing shouting.

**Principles**

1. One primary action per screen. Electric blue appears only on that action (and focus/selected states).
2. Name the rule. Errors say what broke, which rule, and what value is allowed.
3. Price is the hero. Range, offer price, booking price: largest numbers on screen, tabular figures.
4. Show state, never hide it. Booked/rejected/expired cards stay in the list, greyed, with a label.
5. Same card shape for offers (Page 3) and eligible requests (Page 6).
6. No dead ends. Every empty and error state offers the next step.

**Pattern study (learn, do not copy)**

| Source | Pattern worth learning | Our own version |
| --- | --- | --- |
| Apple | Big type hierarchy, generous whitespace, translucent top bar, one clear call to action, short copy | Own token set; translucent nav on navy; role picker as two large choice tiles |
| Apple | Motion that explains cause and effect, never decorates | Cards slide in when an offer arrives; numbers crossfade when range changes |
| Booking.com | Sticky summary panel while filling a form | Sticky "Route and price" side card on Page 2 with live range |
| Booking.com | Trust cues beside the seller name (rating, clear policy) | Rating chip on offer card; line "Price agreed up front" near Book |
| Booking.com | Honest urgency | Offer countdown chip, turns warning color only in last 60 s |
| Booking.com | Confirmation page that doubles as lookup | Page 4 booking number large + lookup box |

Not borrowed: their layouts, orange/blue branding, badges, copy, iconography, Apple's exact type/spacing values.

## 3. Design tokens

### 3.1 Color

| Token | Value | Use |
| --- | --- | --- |
| `--bg-base` | #0D2550 | Page background (brand navy) |
| `--surface-1` | #182F58 | Cards, inputs, side panel (ice at 5% over base) |
| `--surface-2` | #1F365D | Raised/hover surface, table header (ice 8%) |
| `--surface-3` | #273E64 | Selected row, pressed surface (ice 12%) |
| `--border` | #2C4267 | Hairline 1px dividers, input outline (ice 14%) |
| `--text-primary` | #E9F5F5 | Headings, body, values (brand ice blue) |
| `--text-secondary` | #ABBBC7 | Labels, helper text (ice 72%) |
| `--text-tertiary` | #91A2B3 | Captions on base only (ice 60%) |
| `--action` | #316FF5 | Primary button fill, selected control, focus accent |
| `--action-hover` | #4A82FF | Primary hover |
| `--action-pressed` | #2558D6 | Primary active |
| `--focus-ring` | #E9F5F5 | 2px ring, 2px offset, every focusable element |
| `--error` | #FF7A7A | Rule violation, field error (tint bg: error at 14%) |
| `--success` | #4FD6A0 | Booked, accepted |
| `--warning` | #F2C14E | Expiring, pending |
| `--disabled-fg` / `-bg` | ice 38% / ice 6% | Disabled controls, greyed cards |

Status colors are outside your palette (you gave three). They are functional only; swap if you have a status palette.

Contrast (computed): ice on navy ≈ 13.4:1. Secondary on navy ≈ 7.6:1. Tertiary on navy ≈ 5:1. **Electric blue on navy ≈ 3.4:1 and ice on electric blue ≈ 4:1**, so: (a) action color is never used for small text on navy; links use ice text + underline; (b) button labels are 18px+ semibold (counts as large text, passes AA 3:1); (c) icon-only or border-only uses of action color are fine at 3:1.

### 3.2 Typography

Font stack: `-apple-system, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", system-ui, sans-serif`. Numbers: `font-variant-numeric: tabular-nums` on every price, time, count. Booking number: monospace stack, tabular.

| Token | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| Display | 40 / 46 | 600 | -0.02em | Page 1 title only |
| Title | 28 / 34 | 600 | -0.01em | Page titles |
| Heading | 22 / 28 | 600 | 0 | Section headings, card price |
| Subhead | 17 / 24 | 600 | 0 | Card titles, field group labels |
| Body | 16 / 24 | 400 | 0 | Default text, inputs |
| Button | 18 / 24 | 600 | 0 | All buttons |
| Small | 14 / 20 | 400 | 0 | Helper text, table cells |
| Caption | 12 / 16 | 500 | 0.02em | Badges, chips, timestamps |
| Price XL | 36 / 40 | 600 | -0.01em | Range banner, booking price |
| Booking No. | 32 / 40 | 500 mono | 0.04em | 10-digit number |

Price format: `₹12,000` always. Range: `₹10,200 – ₹16,800`. Times: `11:30 AM, Narita (NRT) · 10 Apr 2027`. Name airport/city on every time.

### 3.3 Space, shape, depth

- Spacing scale (4pt): 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: input 10, button 12, card 16, panel 20, chip/badge 999.
- Depth: dark UI uses lighter surfaces, not shadows. Only popovers/dialogs get shadow `0 12px 32px rgba(0,0,0,.40)`.
- Borders: 1px `--border`. Selected card: 2px `--action` border.
- Control height: 44px (inputs, buttons). Min hit target 40px.

## 4. User journeys

### 4.1 Traveler (Pages 1 → 2 → 3 → 4 → 5)

| Step | Screen | User does | System shows | Design must handle |
| --- | --- | --- | --- | --- |
| 1 | P1 Role picker | Taps "I'm a Traveler", Confirm | Saves role to session storage, goes to P2 | Big tiles, Confirm disabled until choice |
| 2 | P2 Request | Picks flight | Arrival airport + local landing time appear under the dropdown | Instant feedback, no layout jump |
| 3 | P2 | Picks hotel (list filtered to cities that airport serves) | Side card: live range "Suggested: ₹10,200 – ₹16,800", earliest pickup as placeholder | Loading shimmer in side card while range fetches; R1 error if mismatch |
| 4 | P2 | Enters adults, adds child ages, bags, optional car type, optional pickup | Inline validation only on required fields | Optional fields never block |
| 5 | P2 | Enters price, Submit | Button spinner; success → P3. Fail → rule banner (R2/R3), no page change | Exact rule + allowed value, focus moves to banner |
| 6 | P3 Offers | Waits, then compares offers | Summary strip; skeleton cards or "Waiting for offers"; offer cards slide in; or "No supplier" with reason | Poll or refresh; never blank |
| 7 | P3 | Clicks Book on one card | Confirm popover → book → P4 with number. Other cards flip to "Not chosen" | Irreversible: confirm step; R8/M6 errors named |
| 8 | P3 | Clicks Reject on a card | That card greys with "Rejected" in place | No page change; cannot be un-rejected |
| 9 | P4 Summary | Copies booking number, reviews details | Number, flight, hotel, pickup, supplier, car, price | Copy feedback; works standalone via lookup box after restart |
| 10 | P5 Change | Opens "Request a change", picks new flight and/or pickup, Submit | Status chip Pending → Accepted/Rejected | At least one field required; old details unchanged on reject |

### 4.2 Supplier (Pages 1 → 6 → 7 → 6 → 8)

| Step | Screen | User does | System shows | Design must handle |
| --- | --- | --- | --- | --- |
| 1 | P1 | Taps "I'm a Supplier", picks company (name + airports) | Confirm enabled after company chosen | Company list searchable-by-eye; selected state clear |
| 2 | P6 Dashboard | Lands on dashboard | Company name + fleet summary; list of eligible requests | Empty state "No eligible requests right now" |
| 3 | P6 | Clicks a request card | Goes to P7 | Whole card clickable, keyboard reachable |
| 4 | P7 Assign | Reviews request, picks one of own cars, sets price, sets expiry | Vehicle picker already limited by fit/car type; expiry defaults to +10 min | Disabled cars say why (too small, busy) when data allows |
| 5 | P7 | Submit | Success → offer live for traveler. Fail → R5/R6/R7/R3 banner with exact reason | No generic errors |
| 6 | P7 | "Add another car" (G1) | Second vehicle+price block appended | Each block removable |
| 7 | P6 "My bookings" | Sees confirmed bookings, badge on pending change | Badge count on tab and on row | Never hunt for a change request |
| 8 | P8 Response | Compares old vs new side by side, reads pre-check, Accept/Reject | Confirmation message; traveler pages update | Backend may still refuse (R2/R6/R9): show it, name it |

## 5. Layout per screen

### 5.1 Global shell (all pages)

- **Top nav**, 64px, sticky, translucent: `rgba(13,37,80,.72)` + 20px backdrop blur + 1px bottom border. Left: product wordmark. Right: role chip ("Traveler" or "Supplier · Sakura Cabs") + text link "Switch role" → P1.
- **Content**: max-width 1200, centered, 32px side padding, 12-column grid, 24px gutter, 32px top padding below nav.
- **Page header**: Title (28/34) + one line Small secondary subtitle. 24px below to content.
- **Banner slot**: directly under page header; error/info banners render here, full content width.
- Vertical rhythm: 48px between major sections, 24px between cards, 16px inside cards (24px for panels).

### 5.2 P1 Role picker

Centered column, max-width 720. Hierarchy: Display title → subtitle → two tiles side by side (each 340×200, radius 20, surface-1, icon + label + one-line description) → supplier company list (appears under tiles after Supplier chosen, slide-down) → Confirm button (full tile-row width, right-aligned on desktop ok). Company row: name (Subhead), airports as chips, radio at right. Spacing: tiles 24px apart; list 24px below tiles.

### 5.3 P2 Ride request form

Two columns: form 7 cols, sticky side card 5 cols (top: 88px).

- Form sections as stacked cards, each with Subhead: **Trip** (flight, hotel), **Passengers** (adults, children), **Luggage** (large, small), **Preferences** (car type, pickup time), **Price** (input).
- Side card "Route and price": route line (NRT → Ueno, Tokyo), earliest pickup, Price XL range banner, range track with marker for the entered price, Submit button at bottom (primary, full width).
- Inline error banner sits under page header and repeats beside the failing field.
- Pairs (adults/children, large/small bags) in 2-col sub-grid, 16px gap.

### 5.3b P3 Offers list

Summary strip (full width, surface-1, one row: flight · hotel · pax · bags · pickup, with edit-less read-only look). Below: controls row (sort, car-type filter) right-aligned. Below: offer cards in a 2-column grid (gap 24). Card order: supplier name + rating → car type, seats, bags → Price XL → countdown chip → Book (primary) + Reject (secondary). Greyed cards stay in grid order. "No supplier" state replaces grid: centered panel, icon, reason line, list of ineligible suppliers with their rule chips (from `supplier_matching.ineligible_reasons`).

### 5.4 P4 Booking summary

Single column, max-width 760. Top: success tint panel with label "Booking number" + Booking No. (32 mono) + Copy button. Below: details list in two columns (label secondary / value primary): flight, hotel, pickup (local, airport named), supplier, car type, price. Bottom: "Request a change" secondary button. Lookup box lives in a quiet panel at top-right on desktop and is the only content in the not-found/empty-load state.

### 5.5 P5 Change request

Single column, max-width 760. Read-only current booking card (surface-1, no inputs look) → form card: new flight dropdown, new pickup datetime (note "at least one required") → Submit. After submit the form collapses into a status card: Pending (warning), Accepted (success), Rejected (error) with old details unchanged note.

### 5.6 P6 Supplier dashboard

Header: company name (Title) + fleet summary chips ("2 SUV · 1 Sedan · 1 Hatchback"). Tabs: **Open requests** | **My bookings** (badge). Request cards in a single-column list on desktop (full width, 3-zone row: route + flight left, pax/bags/pickup center, traveler price range + chevron right). Same card shape as P3, different content. Bookings list uses same card, with status badge and change-request badge.

### 5.7 P7 Assign car

Two columns: 7 cols form, 5 cols sticky request detail. Form: vehicle picker as radio cards (id, type, seats, bags, busy note) in 2-col grid → price input with range track → expiry picker → "Add another car" tertiary button → Submit. Side: full request detail + price range Price XL.

### 5.8 P8 Change response

Full-width comparison table, two columns "Current" and "Requested", changed cells highlighted with action-tint background and a small "Changed" caption. Below: pre-check panel (two rows: pickup rule, car free) each with pass/fail icon + text + note "Server re-checks on accept". Footer: Reject (secondary) and Accept (primary), right-aligned, 16px apart.

## 6. Breakpoints (desktop only)

| Width | Behavior |
| --- | --- |
| ≥ 1440 | Content stays 1200 wide, centered; extra space is background |
| 1280 – 1439 | Design target. Layouts as in §5 |
| 1024 – 1279 | Side cards narrow to 4 cols; offers grid stays 2 col; side padding 24 |
| < 1024 | Not supported. Show min-width 1024 with horizontal scroll; no mobile layout built (BRD out-of-scope) |

## 7. Component inventory and states

Universal rules: focus = 2px ice ring + 2px offset; disabled = 38% ice text, no hover, `cursor: not-allowed`; loading = spinner inside control, control disabled, label stays.

### 7.1 Actions

| Component | States |
| --- | --- |
| Button primary | Default action fill, ice label · Hover action-hover · Pressed action-pressed + scale .98 · Focus ring · Disabled disabled-bg · Loading spinner replaces nothing, label kept, width fixed · Error n/a (error shown in banner) |
| Button secondary | Default transparent, 1px border, ice label · Hover surface-2 · Pressed surface-3 · Focus/Disabled/Loading as above |
| Button tertiary / link | Ice text underline on hover · Focus ring · Disabled dim |
| Copy button | Default "Copy" · Hover surface-2 · Success "Copied" + check for 1.6 s, then reset · Error "Press Ctrl+C" fallback |

### 7.2 Inputs

| Component | States |
| --- | --- |
| Dropdown (flight, hotel, car type, vehicle company) | Default surface-1, border · Hover border brightens · Open list on surface-2 with shadow · Focus ring · Disabled (hotel until flight chosen) with helper "Choose a flight first" · Loading skeleton line while catalog loads · Empty list "No hotels served by this airport" (R1) · Error error border + message |
| Number input (adults, bags) | Default · Hover · Focus · − / + steppers 44px · Min enforced (adults 1) · Error under field |
| Child age rows | Default row with age input + remove icon · Add-child button · Empty = no rows (valid) · Error age outside 0–17 |
| Date-time input | Default shows placeholder = earliest pickup (secondary text) · Focus ring · Error R2 message with earliest allowed time · Helper always names the airport timezone |
| Price input | Default with ₹ prefix · Focus · Inside range: success tick · Outside range: error + range repeated (R3) · Disabled until range is known |
| Range track | Shows min–max bar and marker at entered price · Loading shimmer · Empty "Pick flight and hotel" |
| Expiry picker (G4) | Default +10 min · Focus · Error in the past |

### 7.3 Display

| Component | States |
| --- | --- |
| Price range banner | Empty placeholder text · Loading shimmer · Loaded Price XL · Error (R1) rule banner replaces it |
| Offer card | Default · Hover lift 2px + border brightens · Focus ring · Selected-for-booking (2px action border) · Booked (success badge, success border) · Rejected / Not chosen / Expired (grey, label, buttons removed) · Loading skeleton · Error inline under buttons |
| Request card (P6) | Default · Hover · Focus · New (small dot) · Empty list state · Loading skeleton rows |
| Vehicle radio card | Default · Hover · Selected · Disabled with reason (too few seats, bags, busy) · Focus |
| Status badge | OFFERED (action tint) · BOOKED (success) · REJECTED (error) · NOT\_CHOSEN (neutral) · EXPIRED (neutral + clock) · PENDING (warning) · ACCEPTED (success) — always icon + text |
| Countdown chip | Normal neutral · Last 60 s warning · Expired grey "Expired" |
| Rating chip | Star + 4.8 · Missing: hidden |
| Booking number block | Default · Copied · Not-found state (lookup only) |
| Diff table (P8) | Unchanged cell neutral · Changed cell action tint + "Changed" · Loading skeleton |
| Pre-check row | Pass success icon + text · Fail error icon + text · Checking spinner |

### 7.4 Feedback and structure

| Component | States |
| --- | --- |
| Rule error banner | Appears with rule chip (R3), plain sentence, allowed value, "Fix field" link; dismiss on edit; persists until changed |
| Empty state | Icon, one line, one action. P3 waiting: "Waiting for offers". P3 none: reason list. P6: "No eligible requests right now". P4 lookup: not found |
| Toast | Success/info, bottom-center, auto-dismiss 4 s, pause on hover |
| Confirm popover | Anchored to Book button: "Book Sakura Cabs · ₹12,000?" Confirm / Cancel · Loading on confirm |
| Tabs | Default · Hover · Selected underline action · Focus · Badge |
| Nav bar | Default translucent · Scrolled adds border · Role chip static |
| Skeleton | Surface-2 blocks, shimmer; same dimensions as final content |
| Spinner | 20px ring, 800 ms linear loop |

## 8. Error language (R1–R9)

Backend returns HTTP 422 with `code` like `RULE_R6_VIOLATION`, `message`, `error.ruleViolated`, `error.details`. Render the **message** text; use `ruleViolated` for the chip; never show the HTTP number or the raw code. `400 VALIDATION_ERROR` maps to a field-level hint on the named field. `404 not found` on booking lookup shows the Not-found state.

| Rule | Shows on | Chip text | Plain meaning |
| --- | --- | --- | --- |
| R1 | P2 | R1 · Route | Airport does not serve this hotel city, or passenger/bag input invalid |
| R2 | P2, P8 | R2 · Pickup | Pickup earlier than landing + 60 min; show earliest allowed time |
| R3 | P2, P7 | R3 · Price | Price outside range; show range |
| R4 | P3 empty, P6 | R4 · Coverage | Supplier area/airport/hours/fleet mismatch; show reason per supplier |
| R5 | P7 | R5 · Fit | Seats, bags or car type do not fit |
| R6 | P7, P8, booking | R6 · Car busy | Car busy window; show conflicting start–end |
| R7 | P7 | R7 · Assignment | Car not yours, already offered, or request closed |
| R8 | P3 | R8 · Offer | Offer rejected, expired, or no longer open |
| R9 | P8 | R9 · Change | Change cannot be accepted (car busy or hours/airport invalid) |

Copy tone: short, specific, no blame. Example: "R3 · Price. ₹9,000 is below the range for this route. Enter ₹10,200 – ₹16,800."

## 9. Motion

| What | Animation | Duration | Easing |
| --- | --- | --- | --- |
| Button hover / press | Fill color; press scale to .98 | 120 ms | `cubic-bezier(.2,0,0,1)` |
| Card hover | Lift translateY(−2px), border brighten | 200 ms | `cubic-bezier(.2,0,0,1)` |
| Page change | Content fades in, rises 8 px | 240 ms | `cubic-bezier(.32,.72,0,1)` |
| Supplier list reveal on P1 | Height + fade | 280 ms | `cubic-bezier(.32,.72,0,1)` |
| Range banner update | Old value fades out, new fades in | 200 ms | `cubic-bezier(.2,0,0,1)` |
| Error banner | Slides down 8 px + fade, focus moves in | 240 ms | `cubic-bezier(.32,.72,0,1)` |
| New offer card arrives | Slides up 12 px + fade, staggered 60 ms | 320 ms | `cubic-bezier(.32,.72,0,1)` |
| Card becomes greyed (booked/rejected/not chosen) | Opacity to .55, buttons collapse | 320 ms | `cubic-bezier(.2,0,0,1)` |
| Booking success | Check icon draws, number fades in | 400 ms | `cubic-bezier(.32,.72,0,1)` |
| Copy confirmation | Label swap crossfade | 160 ms | linear |
| Countdown last 60 s | Color to warning only, no pulse | 200 ms | linear |
| Skeleton shimmer | Gradient sweep, loop | 1400 ms | linear |
| Spinner | Rotate, loop | 800 ms | linear |

Rules: nothing animates longer than 400 ms (except loops). Never animate layout of form fields while the user types. **Reduced motion** (`prefers-reduced-motion`): remove all translate/scale/draw/shimmer; keep opacity fades ≤ 120 ms; spinner becomes static "Loading…" text.

## 10. Accessibility

- **Target:** WCAG 2.2 AA.
- **Contrast:** see §3.1 numbers. Action color never carries small text on navy; button labels are 18px+ semibold. Re-check if you change the palette codes.
- **Color is never the only signal:** every status has icon + text; changed cells in P8 carry a "Changed" label; pass/fail has icon.
- **Keyboard:** full tab order top to bottom, left to right; Enter submits forms; Esc closes popovers; whole cards are one focusable link/button, not nested clickables (Book/Reject are separate buttons inside offer cards, so offer card itself is not a link).
- **Focus:** visible ice ring always; after failed submit, focus moves to error banner; after route change, focus moves to page title.
- **Forms:** every input has a visible `<label>`; helper text linked with `aria-describedby`; required fields marked in text ("Required"), not only asterisk; error text linked and `aria-invalid=true`.
- **Live regions:** error banner `role="alert"`; range banner, offer arrival and status changes `aria-live="polite"`; countdown is **not** live except one announcement at 60 s and at expiry.
- **Semantics:** use native `<select>`, `<input type="number">`, `<button>`, `<table>` for diff view; nav is `<nav>` with current role in text; tabs follow ARIA tabs pattern; booking number block is selectable text, not an image.
- **Time and money:** screen-reader text spells time zones ("11:30 AM Narita time"); rupee values read as "rupees" via visually hidden text where the symbol alone is ambiguous.
- **Targets and zoom:** controls ≥ 40px; layout survives 200% zoom (horizontal scroll allowed under 1024 per §6).
- **Motion:** honors reduced motion (§9). No auto-playing or looping animation beyond spinner/skeleton.
- **Errors never time out:** banners stay until fixed; only success toasts auto-dismiss.

## 11. Handoff checklist

1. Replace flagged tokens (#0D2550, #316FF5) once confirmed; update contrast numbers.
2. Send Apple `design.md`; swap type, spacing, radius, motion tokens to match.
3. Build order follows BRD: P1, P2, P6, P7, P3, P4, P5, P8; then G-feature UI (G2 car filter, G4 countdown/expiry, G1 add-car, G5 sort/filter).
4. Acceptance: every refusal shows chip + exact message; every list has empty, loading, error states; every submit button disables during flight; ₹ and local-time formats are consistent everywhere; booking lookup works after a backend restart.
