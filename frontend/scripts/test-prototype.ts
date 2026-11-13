import { MockCatalogService, ALL_FLIGHTS, ALL_HOTELS, ALL_ROUTES, ALL_COMPANIES } from '../src/mocks/mockCatalog';
import { MockRuleEngine } from '../src/mocks/mockRules';
import { MockStorage } from '../src/mocks/mockStorage';
import { MockService } from '../src/mocks/mockService';

let passed = 0;
let failed = 0;

function assert(desc: string, condition: boolean, detail?: any) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${desc}`, detail || '');
    failed++;
  }
}

async function runTests() {
  console.log('--- TEST SUITE: Airport Taxi Offers Prototype Business Logic ---');

  // Test 1: Catalog Integrity
  console.log('\n[1. Catalog Datasets]');
  assert('Catalog has flights arriving in Japan/UAE', ALL_FLIGHTS.length > 0);
  assert('Catalog has 49 hotels', ALL_HOTELS.length === 49);
  assert('Catalog has 33 routes', ALL_ROUTES.length === 33);
  assert('Catalog has 11 taxi companies', ALL_COMPANIES.length === 11);

  // Test 2: Rule R1 (Route & City Serving)
  console.log('\n[2. Rule R1: Route & City Serving]');
  const fl401 = MockCatalogService.getFlight('FL-401')!; // Lands NRT
  const uenoHotel = MockCatalogService.getHotel('HTL-TYO-004')!; // Tokyo
  const osakaHotel = MockCatalogService.getHotel('HTL-OSA-001')!; // Osaka
  const nrtAirport = MockCatalogService.getAirports().find(a => a.code === 'NRT')!;

  const r1Valid = MockRuleEngine.checkR1({
    flight: fl401,
    hotel: uenoHotel,
    airport: nrtAirport,
    adults: 2,
    child_ages: [6],
    large_bags: 3,
    small_bags: 2,
    car_type: 'SUV',
  });
  assert('FL-401 to Ueno Hotel (NRT serves Tokyo) passes R1', r1Valid.valid);

  const r1Invalid = MockRuleEngine.checkR1({
    flight: fl401,
    hotel: osakaHotel,
    airport: nrtAirport,
    adults: 2,
    child_ages: [],
    large_bags: 1,
    small_bags: 1,
  });
  assert('FL-401 to Osaka Hotel (NRT does NOT serve Osaka) fails R1', !r1Invalid.valid && r1Invalid.ruleId === 'R1');

  // Test 3: Rule R2 (Pickup Time >= Landing + 60m)
  console.log('\n[3. Rule R2: Pickup Time]');
  // FL-401 lands at 2027-04-10T10:30
  const r2Valid = MockRuleEngine.checkR2('2027-04-10T10:30', '2027-04-10T11:30');
  assert('Pickup at 11:30 (landing 10:30 + 60m) passes R2', r2Valid.valid);

  const r2Invalid = MockRuleEngine.checkR2('2027-04-10T10:30', '2027-04-10T11:00');
  assert('Pickup at 11:00 (landing 10:30 + 30m) fails R2', !r2Invalid.valid && r2Invalid.ruleId === 'R2');

  // Test 4: Rule R3 (Route Price Range)
  console.log('\n[4. Rule R3: Route Price Range]');
  const nrtUenoRoute = MockCatalogService.findRoute('NRT', 'Tokyo', 'Ueno')!; // Range: 10200 - 16800
  assert('NRT-Ueno route exists with min 10200 and max 16800', nrtUenoRoute.price_min_inr === 10200 && nrtUenoRoute.price_max_inr === 16800);

  const r3Valid = MockRuleEngine.checkR3(12000, nrtUenoRoute);
  assert('Price ₹12,000 passes R3 (inside ₹10,200 – ₹16,800)', r3Valid.valid);

  const r3TooLow = MockRuleEngine.checkR3(9000, nrtUenoRoute);
  assert('Price ₹9,000 fails R3 (below ₹10,200)', !r3TooLow.valid && r3TooLow.ruleId === 'R3');

  const r3TooHigh = MockRuleEngine.checkR3(18000, nrtUenoRoute);
  assert('Price ₹18,000 fails R3 (above ₹16,800)', !r3TooHigh.valid && r3TooHigh.ruleId === 'R3');

  // Test 5: Rule R5 (Vehicle Fit)
  console.log('\n[5. Rule R5: Vehicle Fit]');
  const sakura = MockCatalogService.getCompany('TX-JP-01')!; // Sakura Cabs
  const sc1Sedan = sakura.vehicles.find(v => v.vehicle_id === 'SC-1')!; // 4 seats, 2 large bags, 2 small bags
  const sc3Suv = sakura.vehicles.find(v => v.vehicle_id === 'SC-3')!; // 6 seats, 4 large bags, 3 small bags

  const r5SedanCheck = MockRuleEngine.checkR5(sc1Sedan, {
    adults: 2,
    child_ages: [6],
    large_bags: 3,
    small_bags: 2,
  });
  assert('SC-1 Sedan fails R5 for 3 large bags (capacity is 2)', !r5SedanCheck.valid && r5SedanCheck.ruleId === 'R5');

  const r5SuvCheck = MockRuleEngine.checkR5(sc3Suv, {
    adults: 2,
    child_ages: [6],
    large_bags: 3,
    small_bags: 2,
  });
  assert('SC-3 SUV passes R5 for 3 large bags (capacity is 4)', r5SuvCheck.valid);

  // Test 6: Rule R6 (Car Availability & Overlap Check with RIDE-0001)
  console.log('\n[6. Rule R6: Car Free Window]');
  // RIDE-0001: SC-2 busy 2027-04-10T11:00 to 2027-04-10T14:00
  const busySlots = [
    { vehicle_id: 'SC-2', source_id: 'RIDE-0001', start: '2027-04-10T11:00', end: '2027-04-10T14:00' },
  ];

  // Needed window: pickup 11:30 + 2 * 90m = 11:30 to 14:30
  const r6Conflict = MockRuleEngine.checkR6('SC-2', '2027-04-10T11:30', 90, busySlots);
  assert('SC-2 fails R6 due to conflicting RIDE-0001 window', !r6Conflict.valid && r6Conflict.ruleId === 'R6');

  const r6Free = MockRuleEngine.checkR6('SC-3', '2027-04-10T11:30', 90, busySlots);
  assert('SC-3 passes R6 (free during 11:30–14:30)', r6Free.valid);

  // Test 7: Full Menon End-to-End Simulation Flow
  console.log('\n[7. End-to-End Menon Flow Simulation]');
  // Setup in-memory mock storage
  MockStorage.resetToSeed();

  // 1. Menon posts request
  const reqRes = await MockService.createRequest({
    traveler_name: 'Menon Family',
    flight_id: 'FL-401',
    hotel_id: 'HTL-TYO-004',
    adults: 2,
    child_ages: [6],
    large_bags: 3,
    small_bags: 2,
    pickup: '2027-04-10T11:30',
    car_type: 'SUV',
    price_inr: 12000,
  });
  const reqId = reqRes.data!.request_id;
  assert('Menon request created successfully', Boolean(reqId));

  // 2. Sakura assigns SC-3 at 12500
  const sakuraOffer = await MockService.assignCar('TX-JP-01', {
    request_id: reqId,
    vehicle_id: 'SC-3',
    price_inr: 12500,
  });
  assert('Sakura Cabs assigns SC-3 at ₹12,500', sakuraOffer.data?.status === 'OPEN');

  // 3. Edo Premium assigns EP-2 at 13200
  const edoOffer = await MockService.assignCar('TX-JP-03', {
    request_id: reqId,
    vehicle_id: 'EP-2',
    price_inr: 13200,
  });
  assert('Edo Premium assigns EP-2 at ₹13,200', edoOffer.data?.status === 'OPEN');

  // 4. Traveler rejects EP-2
  const rejectRes = await MockService.rejectOffer(edoOffer.data!.offer_id);
  assert('Traveler rejects EP-2', rejectRes.data?.status === 'REJECTED');

  // 5. Traveler books SC-3
  const bookRes = await MockService.bookOffer(sakuraOffer.data!.offer_id);
  const bookingNumber = bookRes.data!.booking_number;
  assert('Traveler books SC-3 and receives 10-digit number', bookingNumber && bookingNumber.length === 10);
  assert('Sibling EP-2 is marked rejected/not chosen', MockStorage.getOfferById(edoOffer.data!.offer_id)?.status === 'REJECTED');

  // 6. Booking lookup persists
  const lookupRes = await MockService.getBooking(bookingNumber);
  assert('Booking lookup returns confirmed summary', lookupRes.data?.booking_number === bookingNumber);

  // 7. Traveler submits change request (FL-402 next day)
  const changeRes = await MockService.createChangeRequest(bookingNumber, {
    new_flight_id: 'FL-402',
    new_pickup: '2027-04-11T11:30',
  });
  const changeId = changeRes.data!.change_id;
  assert('Change request created with status WAITING', changeRes.data?.status === 'WAITING');

  // 8. Supplier accepts change request
  const acceptRes = await MockService.respondToChangeRequest(changeId, 'ACCEPT');
  assert('Supplier accepts change; booking reflects new pickup', acceptRes.data?.pickup === '2027-04-11T11:30');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();

