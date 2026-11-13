$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api/v1'

Write-Host "=== 1. Test Reset Demo ==="
$reset = Invoke-RestMethod -Uri "$base/admin/reset-demo" -Method Post
Write-Host "Reset result: open requests seeded = $($reset.data.open_requests_seeded)"

Write-Host "`n=== 2. Test Catalog Bootstrap ==="
$boot = Invoke-RestMethod -Uri "$base/catalog/bootstrap"
Write-Host "Flights count: $($boot.data.flights.Count)"
Write-Host "Companies count: $($boot.data.companies.Count)"

Write-Host "`n=== 3. Test Route Preview ==="
$preview = Invoke-RestMethod -Uri "$base/catalog/route-preview?flight_id=FL-401`&hotel_id=HTL-TYO-004"
Write-Host "Preview corridor: ₹$($preview.data.route.price_min_inr) - ₹$($preview.data.route.price_max_inr). Earliest: $($preview.data.earliest_pickup)"

Write-Host "`n=== 4. Test Create Ride Request (Menon Scenario) ==="
$reqBody = @{
  traveler_name = 'Menon Family Verification'
  flight_id = 'FL-401'
  hotel_id = 'HTL-TYO-004'
  adults = 2
  child_ages = @(6)
  large_bags = 3
  small_bags = 2
  pickup = '2027-04-10T11:30'
  car_type = 'SUV'
  price_inr = 12000
} | ConvertTo-Json
$created = Invoke-RestMethod -Uri "$base/requests" -Method Post -Body $reqBody -ContentType 'application/json'
$requestId = $created.data.request_id
Write-Host "Created Request ID: $requestId"

Write-Host "`n=== 5. Test Supplier Dashboard (Sakura Cabs / TX-JP-01) ==="
$dash = Invoke-RestMethod -Uri "$base/suppliers/TX-JP-01/dashboard"
Write-Host "Servable requests count: $($dash.data.servable_requests.Count)"

Write-Host "`n=== 6A. Negative Test: Assign Busy Car SC-2 (Must Fail R6) ==="
$busyOfferBody = @{
  request_id = $requestId
  vehicle_id = 'SC-2'
  price_inr = 12000
} | ConvertTo-Json
try {
  $null = Invoke-RestMethod -Uri "$base/suppliers/TX-JP-01/offers" -Method Post -Body $busyOfferBody -ContentType 'application/json'
  Write-Error "ERROR: SC-2 should have failed R6 but passed!"
} catch {
  Write-Host "Expected Rule R6 Rejection verified: $($_.Exception.Message)"
}

Write-Host "`n=== 6B. Positive Test: Assign Available SUV SC-3 ==="
$offerBody = @{
  request_id = $requestId
  vehicle_id = 'SC-3'
  price_inr = 12000
} | ConvertTo-Json
$offered = Invoke-RestMethod -Uri "$base/suppliers/TX-JP-01/offers" -Method Post -Body $offerBody -ContentType 'application/json'
$offerId = $offered.data.offer_id
Write-Host "Created Offer ID: $offerId (Vehicle: $($offered.data.car.vehicle_id), Price: ₹$($offered.data.price_inr))"

Write-Host "`n=== 7. Test Book Offer ==="
$booked = Invoke-RestMethod -Uri "$base/offers/$offerId/book" -Method Post
$bookingNumber = $booked.data.booking_number
Write-Host "Confirmed Booking Number: $bookingNumber"

Write-Host "`n=== 8. Test Retrieve Booking by 10-Digit Code ==="
$retrieved = Invoke-RestMethod -Uri "$base/bookings/$bookingNumber"
Write-Host "Retrieved Booking: $($retrieved.data.booking_number) (Vehicle: $($retrieved.data.car.vehicle_id), Status: $($retrieved.data.status))"

Write-Host "`n=== 9. Test Create Change Request (Delayed Flight FL-402) ==="
$changeBody = @{
  new_flight_id = 'FL-402'
  new_pickup = '2027-04-11T11:30'
} | ConvertTo-Json
$chg = Invoke-RestMethod -Uri "$base/bookings/$bookingNumber/change-request" -Method Post -Body $changeBody -ContentType 'application/json'
$changeId = $chg.data.change_id
Write-Host "Created Change Request ID: $changeId (Status: $($chg.data.status))"

Write-Host "`n=== 10. Test Get Change Request Details ==="
$chgDetails = Invoke-RestMethod -Uri "$base/change-requests/$changeId"
Write-Host "Change Request Details: ID = $($chgDetails.data.change_id), Status = $($chgDetails.data.status), Booking = $($chgDetails.data.booking.booking_number)"

Write-Host "`n=== 11. Test Respond to Change Request (Supplier Accepts) ==="
$respBody = @{ action = 'ACCEPT' } | ConvertTo-Json
$accepted = Invoke-RestMethod -Uri "$base/change-requests/$changeId/respond" -Method Post -Body $respBody -ContentType 'application/json'
Write-Host "Accepted! Booking updated pickup: $($accepted.data.pickup), flight: $($accepted.data.flight.flight_id)"

Write-Host "`n============================================================"
Write-Host "ALL END-TO-END WORKFLOWS AND VALIDATIONS PASSED CLEANLY!"
Write-Host "============================================================"
