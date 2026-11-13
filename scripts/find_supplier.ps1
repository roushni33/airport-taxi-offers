$base = 'http://localhost:4000/api/v1'
$boot = Invoke-RestMethod -Uri "$base/catalog/bootstrap"
foreach ($c in $boot.data.companies) {
  $d = Invoke-RestMethod -Uri "$base/suppliers/$($c.company_id)/dashboard"
  $req = $d.data.servable_requests | Where-Object { $_.request_id -eq 'REQ-0004' }
  if ($req) {
    $eligibleCars = $req.vehicle_evaluations | Where-Object { $_.eligible -eq $true }
    if ($eligibleCars.Count -gt 0) {
      Write-Host "Company $($c.company_id) ($($c.name)) has $($eligibleCars.Count) eligible cars: $(($eligibleCars | ForEach-Object { $_.vehicle_id }) -join ', ')"
    }
  }
}

