import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RuleAlertBanner } from './RuleAlertBanner';
import { SearchableSelect } from './SearchableSelect';
import {
  Search,
  Sparkles,
  ArrowUpDown,
  Users,
  Check,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  MapPin,
  PlusCircle,
  FileText,
  BookmarkCheck,
} from 'lucide-react';

export function TravelerWorkspace({ catalog, onJumpToSupplier }) {
  // Sub-Tabs: 'POST_REQUEST' | 'ACTIVE_OFFERS' | 'BOOKING_LOOKUP'
  const [subTab, setSubTab] = useState('POST_REQUEST');

  // Feedback banners
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State (M1, G2)
  const [travelerName, setTravelerName] = useState('Menon Family');
  const [flightId, setFlightId] = useState('FL-401');
  const [hotelId, setHotelId] = useState('HTL-TYO-004');
  const [adults, setAdults] = useState(2);
  const [childAgesStr, setChildAgesStr] = useState('6');
  const [largeBags, setLargeBags] = useState(3);
  const [smallBags, setSmallBags] = useState(2);
  const [pickup, setPickup] = useState('2027-04-10T11:30');
  const [carType, setCarType] = useState('');
  const [priceInr, setPriceInr] = useState(12000);

  // Route Preview State (R1, R2, R3)
  const [routePreview, setRoutePreview] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // Requests List & Active Request Details (M2, M4, G5)
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [sortOrder, setSortOrder] = useState('');
  const [filterCarType, setFilterCarType] = useState('');
  const [shareableMatches, setShareableMatches] = useState([]);

  // Booking Summary Lookup & Change Request State (M5, M7, R9)
  const [bookingNumberInput, setBookingNumberInput] = useState('');
  const [bookingSummary, setBookingSummary] = useState(null);
  const [newFlightId, setNewFlightId] = useState('');
  const [newPickup, setNewPickup] = useState('');

  // Fetch route preview whenever flightId or hotelId changes
  useEffect(() => {
    if (!flightId || !hotelId) return;
    setRouteError(null);
    api
      .getRoutePreview(flightId, hotelId)
      .then((data) => {
        setRoutePreview(data);
        // Auto-set pickup to earliest_pickup if empty or default
        setPickup(data.earliest_pickup);
      })
      .catch((err) => {
        setRoutePreview(null);
        setRouteError(err);
      });
  }, [flightId, hotelId]);

  const loadRequestsList = async (selectId = null) => {
    try {
      const list = await api.listRequests();
      setRequests(list);
      const targetId = selectId || selectedRequestId || (list[0]?.request_id ?? null);
      if (targetId) {
        setSelectedRequestId(targetId);
      }
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    loadRequestsList();
  }, []);

  // Load selected request details with G5 sort & filter
  const loadActiveRequest = async () => {
    if (!selectedRequestId) return;
    try {
      const detail = await api.getRequestById(selectedRequestId, {
        sort: sortOrder,
        car_type: filterCarType,
      });
      setActiveRequest(detail);
      // Also fetch Stretch S1 shareable matches
      const matches = await api.getShareableMatches(selectedRequestId).catch(() => []);
      setShareableMatches(matches || []);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    loadActiveRequest();
  }, [selectedRequestId, sortOrder, filterCarType]);

  // 1-Click Menon Demo Autofill
  const fillMenonScenario = () => {
    setError(null);
    setSuccessMsg('Loaded Menon Family demo preset (FL-401 → Ueno).');
    setTravelerName('Menon Family');
    setFlightId('FL-401');
    setHotelId('HTL-TYO-004');
    setAdults(2);
    setChildAgesStr('6');
    setLargeBags(3);
    setSmallBags(2);
    setPickup('2027-04-10T11:30');
    setCarType('');
    setPriceInr(12000);
    setSubTab('POST_REQUEST');
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    const parsedChildAges = childAgesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => Number(n));

    try {
      const created = await api.createRequest({
        traveler_name: travelerName,
        flight_id: flightId,
        hotel_id: hotelId,
        adults: Number(adults),
        child_ages: parsedChildAges,
        large_bags: Number(largeBags),
        small_bags: Number(smallBags),
        pickup: pickup || null,
        car_type: carType || null,
        price_inr: Number(priceInr),
      });
      setSuccessMsg(`Posted ride request ${created.request_id} for ${created.traveler_name}! Viewing offers.`);
      await loadRequestsList(created.request_id);
      setActiveRequest(created);
      setSubTab('ACTIVE_OFFERS');
    } catch (err) {
      setError(err);
    }
  };

  const handleBookOffer = async (offerId) => {
    setError(null);
    setSuccessMsg('');
    try {
      const summary = await api.bookOffer(offerId);
      setSuccessMsg(`Confirmed Booking #${summary.booking_number}!`);
      setBookingNumberInput(summary.booking_number);
      setBookingSummary(summary);
      setNewFlightId(summary.flight.flight_id);
      setNewPickup(summary.pickup);
      await loadRequestsList(selectedRequestId);
      await loadActiveRequest();
      setSubTab('BOOKING_LOOKUP');
    } catch (err) {
      setError(err);
    }
  };

  const handleRejectOffer = async (offerId) => {
    setError(null);
    setSuccessMsg('');
    try {
      await api.rejectOffer(offerId);
      setSuccessMsg(`Offer ${offerId} rejected.`);
      await loadActiveRequest();
    } catch (err) {
      setError(err);
    }
  };

  const handleLookupBooking = async (e, overrideNumber = null) => {
    if (e) e.preventDefault();
    const num = (overrideNumber ?? bookingNumberInput).trim();
    if (!num) return;
    setError(null);
    setSuccessMsg('');
    try {
      const summary = await api.getBookingSummary(num);
      setBookingSummary(summary);
      setNewFlightId(summary.flight.flight_id);
      setNewPickup(summary.pickup);
    } catch (err) {
      setBookingSummary(null);
      setError(err);
    }
  };

  const handleSubmitChangeRequest = async (e) => {
    e.preventDefault();
    if (!bookingSummary) return;
    setError(null);
    setSuccessMsg('');
    try {
      const chg = await api.createChangeRequest(bookingSummary.booking_number, {
        new_flight_id: newFlightId,
        new_pickup: newPickup,
      });
      setSuccessMsg(
        `Change request ${chg.change_id} sent to ${bookingSummary.supplier.name} (Status: ${chg.status}).`
      );
      await handleLookupBooking(null, bookingSummary.booking_number);
    } catch (err) {
      setError(err);
    }
  };

  const handleMergeSharedRide = async (partnerRequestId) => {
    setError(null);
    setSuccessMsg('');
    try {
      await api.mergeSharedRequests(selectedRequestId, partnerRequestId);
      setSuccessMsg(`Shared ride merged between ${selectedRequestId} and ${partnerRequestId}!`);
      await loadRequestsList(selectedRequestId);
      await loadActiveRequest();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-7 space-y-7">
      {/* Primary Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E6DF] pb-4">
        <div className="inline-flex rounded-xl border border-[#DDD9CE] bg-[#ECEAE3] p-1 gap-1">
          <button
            type="button"
            onClick={() => setSubTab('POST_REQUEST')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              subTab === 'POST_REQUEST'
                ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#161615] font-semibold'
                : 'text-[#686660] hover:text-[#161615]'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Post New Request
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ACTIVE_OFFERS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              subTab === 'ACTIVE_OFFERS'
                ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#161615] font-semibold'
                : 'text-[#686660] hover:text-[#161615]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Active Requests & Taxi Offers
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono-tabular ${
                subTab === 'ACTIVE_OFFERS'
                  ? 'bg-[#161615] text-white'
                  : 'bg-[#DDD9CE] text-[#686660]'
              }`}
            >
              {requests.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('BOOKING_LOOKUP')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              subTab === 'BOOKING_LOOKUP'
                ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#161615] font-semibold'
                : 'text-[#686660] hover:text-[#161615]'
            }`}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Booking Summary & Flight Change
          </button>
        </div>

        <button
          type="button"
          onClick={fillMenonScenario}
          className="inline-flex items-center gap-1.5 border border-[#DDD9CE] bg-white px-3.5 py-1.5 text-xs font-medium text-[#161615] hover:border-[#161615] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#B45309]" />
          Load Menon Family Preset (FL-401 → Ueno)
        </button>
      </div>

      <RuleAlertBanner
        error={error}
        successMessage={successMsg}
        onClear={() => {
          setError(null);
          setSuccessMsg('');
        }}
      />

      {/* VIEW 1: Post New Request */}
      {subTab === 'POST_REQUEST' && (
        <div className="mx-auto max-w-3xl">
          <div className="border border-[#E6E3DB] bg-white p-7 sm:p-9 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <div className="mb-6 pb-4 border-b border-[#F0EEE8] flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
                  Feature M1 · Rules R1, R2, R3, G2
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-[#161615] mt-0.5">
                  Post a New Airport Ride Request
                </h2>
                <p className="text-xs text-[#787670] mt-0.5">
                  Select your arrival flight and destination hotel to receive verified quotes from licensed airport taxi suppliers.
                </p>
              </div>
              <button
                type="button"
                onClick={fillMenonScenario}
                className="text-xs font-medium text-[#B45309] hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Auto-fill Menon Preset
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-5">
              {/* Traveler Name */}
              <div>
                <label className="block text-xs font-medium text-[#686660] mb-1.5">
                  Traveler or Group Name
                </label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  required
                  placeholder="e.g. Menon Family"
                  className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2.5 text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Searchable Flight & Hotel Selection */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SearchableSelect
                  label="Arrival Flight (Catalog — Local Arrival Time)"
                  value={flightId}
                  onChange={setFlightId}
                  options={catalog.flights}
                  getOptionValue={(f) => f.flight_id}
                  getOptionLabel={(f) => `[${f.flight_id}] ${f.flight_number || ''} (${f.from} → ${f.to})`}
                  getOptionSublabel={(f) => `${f.airline || ''} · Lands ${f.arrival_local} (Local)`}
                  placeholder="Select arrival flight..."
                  searchPlaceholder="Search flight ID, airline, city..."
                />

                <SearchableSelect
                  label="Destination Hotel (City & Area)"
                  value={hotelId}
                  onChange={setHotelId}
                  options={catalog.hotels}
                  getOptionValue={(h) => h.hotel_id}
                  getOptionLabel={(h) => `[${h.hotel_id}] ${h.name}`}
                  getOptionSublabel={(h) => `${h.city} (${h.area}) · ★${h.rating || ''}`}
                  placeholder="Select destination hotel..."
                  searchPlaceholder="Search hotel name, area, city..."
                />
              </div>

              {/* Route Preview Callout (R1, R2, R3) */}
              {routeError ? (
                <div className="border border-[#F0D0D0] bg-[#FAF2F2] p-3.5 text-xs text-[#7A1D1D] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <strong className="font-mono-tabular">[Rule {routeError.ruleViolated || 'R1'}]</strong>{' '}
                  {routeError.message}
                </div>
              ) : (
                routePreview && (
                  <div className="border border-[#E2DFD6] bg-[#F4F3EE] p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#5E5D59]">
                      <span className="font-medium flex items-center gap-1.5 text-[#161615]">
                        <MapPin className="h-3.5 w-3.5 text-[#8A8881]" />
                        Route: {routePreview.route.airport} → {routePreview.route.area} ({routePreview.route.city})
                      </span>
                      <span className="font-mono-tabular text-[#787670]">
                        {routePreview.route.drive_minutes} mins · {routePreview.route.distance_km} km
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-[#E4E1D8] pt-2">
                      <span className="text-xs font-medium text-[#161615]">
                        Suggested Price Range (Rule R3):
                      </span>
                      <span className="font-mono-tabular text-sm font-bold text-[#161615]">
                        ₹{routePreview.route.price_min_inr.toLocaleString()} – ₹
                        {routePreview.route.price_max_inr.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#686660]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#8A8881]" />
                        Earliest Allowed Pickup (Rule R2, +60m after landing):
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#161615]">
                        {routePreview.earliest_pickup}
                      </span>
                    </div>
                  </div>
                )
              )}

              {/* Passengers & Luggage */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Adults (≥ 1)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adults}
                    onChange={(e) => setAdults(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Child Ages (0–17)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 6, 10"
                    value={childAgesStr}
                    onChange={(e) => setChildAgesStr(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Large Bags
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={largeBags}
                    onChange={(e) => setLargeBags(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Small Bags
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={smallBags}
                    onChange={(e) => setSmallBags(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
              </div>

              {/* Pickup Time, Car Type & Offered Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Pickup Time (Rule R2)
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DDTHH:MM"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2.5 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Car Type (Optional G2)
                  </label>
                  <select
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                    className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3 py-2.5 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <option value="">ANY CAR TYPE</option>
                    {catalog.car_types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#686660] mb-1.5">
                    Your Offered Price (INR, R3)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono-tabular text-[#8A8881]">₹</span>
                    <input
                      type="number"
                      value={priceInr}
                      onChange={(e) => setPriceInr(e.target.value)}
                      required
                      className="w-full border border-[#DDD9CE] bg-[#FCFCFA] pl-8 pr-3.5 py-2.5 font-mono-tabular text-xs font-semibold rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#161615] py-3 text-xs font-semibold uppercase tracking-wider text-[#FAF9F6] hover:bg-[#2A2A27] rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition active:scale-[0.99]"
                >
                  Post Ride Request & View Offers →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: Active Requests & Taxi Offers */}
      {subTab === 'ACTIVE_OFFERS' && (
        <div className="space-y-6">
          {/* Requests Selector Ribbon */}
          <div className="border border-[#E6E3DB] bg-white p-5 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
                Select Posted Request ({requests.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubTab('POST_REQUEST')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#161615] hover:underline"
                >
                  <PlusCircle className="h-3 w-3" /> Post Another Request
                </button>
                <span className="text-[#DDD9CE]">·</span>
                <button
                  type="button"
                  onClick={() => loadActiveRequest()}
                  className="inline-flex items-center gap-1 text-xs text-[#686660] hover:text-[#161615] transition"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh Offers
                </button>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8A8881] border border-dashed border-[#DDD9CE] rounded-xl">
                No ride requests found.{' '}
                <button
                  type="button"
                  onClick={() => setSubTab('POST_REQUEST')}
                  className="font-medium text-[#161615] underline ml-1"
                >
                  Post your first request now
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {requests.map((r) => {
                  const isSelected = selectedRequestId === r.request_id;
                  return (
                    <button
                      key={r.request_id}
                      type="button"
                      onClick={() => setSelectedRequestId(r.request_id)}
                      className={`border px-4 py-2 text-left font-mono-tabular text-xs rounded-xl transition ${
                        isSelected
                          ? 'border-[#161615] bg-[#161615] text-[#FAF9F6] shadow-[0_2px_6px_rgba(0,0,0,0.12)]'
                          : 'border-[#DDD9CE] bg-[#FCFCFA] text-[#161615] hover:border-[#161615]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{r.request_id}</span>
                        <span className="font-normal truncate max-w-[140px]">{r.traveler_name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#ECEAE3] text-[#686660]'
                          }`}
                        >
                          {r.offers?.length || 0} offers
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${
                            r.status === 'BOOKED'
                              ? isSelected
                                ? 'text-[#86EFAC]'
                                : 'text-[#1E3F24]'
                              : isSelected
                              ? 'text-[#FCD34D]'
                              : 'text-[#8A8881]'
                          }`}
                        >
                          [{r.status}]
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeRequest && (
            <>
              {/* Request Details & M2 Supplier Eligibility */}
              <div className="border border-[#E6E3DB] bg-white p-7 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F0EEE8] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-base font-bold text-[#161615]">
                        {activeRequest.request_id}
                      </span>
                      <span className="text-base font-semibold text-[#161615]">
                        · {activeRequest.traveler_name}
                      </span>
                      <span
                        className={`border px-2.5 py-0.5 font-mono-tabular text-[10px] font-semibold rounded-md ${
                          activeRequest.status === 'BOOKED'
                            ? 'border-[#D0E2D4] bg-[#F0F5F1] text-[#1E3F24]'
                            : 'border-[#DDD9CE] bg-[#ECEAE3] text-[#161615]'
                        }`}
                      >
                        {activeRequest.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono-tabular text-xs text-[#686660]">
                      Flight {activeRequest.flight.flight_id} ({activeRequest.flight.to} lands{' '}
                      {activeRequest.flight.arrival_local}) → {activeRequest.hotel.name} (
                      {activeRequest.hotel.area}, {activeRequest.hotel.city})
                    </p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div className="text-[11px] text-[#8A8881]">
                      Traveler Offer (Range ₹{activeRequest.route.price_min_inr}–₹{activeRequest.route.price_max_inr})
                    </div>
                    <div className="text-xl font-bold text-[#161615]">
                      ₹{activeRequest.price_inr.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 4 Metrics Strip */}
                <div className="grid grid-cols-2 gap-3 font-mono-tabular text-xs sm:grid-cols-4">
                  <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-3 rounded-xl">
                    <div className="text-[10px] text-[#8A8881] uppercase">Pickup Time</div>
                    <div className="font-semibold text-[#161615] mt-0.5">{activeRequest.pickup}</div>
                  </div>
                  <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-3 rounded-xl">
                    <div className="text-[10px] text-[#8A8881] uppercase">Car Busy Window</div>
                    <div className="font-semibold text-[#161615] mt-0.5">Until {activeRequest.busy_end?.slice(11, 16)}</div>
                  </div>
                  <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-3 rounded-xl">
                    <div className="text-[10px] text-[#8A8881] uppercase">Passengers</div>
                    <div className="font-semibold text-[#161615] mt-0.5">
                      {activeRequest.total_passengers} ({activeRequest.adults}A, {activeRequest.child_ages.length}C)
                    </div>
                  </div>
                  <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-3 rounded-xl">
                    <div className="text-[10px] text-[#8A8881] uppercase">Luggage & Car Type</div>
                    <div className="font-semibold text-[#161615] mt-0.5">
                      {activeRequest.large_bags}L, {activeRequest.small_bags}S · {activeRequest.car_type || 'ANY'}
                    </div>
                  </div>
                </div>

                {/* M2 Diagnostics: Eligible Suppliers or Reasons */}
                <div className="pt-1">
                  {activeRequest.supplier_matching?.can_be_served ? (
                    <div className="border border-[#D0E2D4] bg-[#F0F5F1] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-medium text-[#1E3F24] flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-[#1E3F24]" />
                        ✓ {activeRequest.supplier_matching.eligible_supplier_count} Eligible Supplier(s) under Rule R4:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {activeRequest.supplier_matching.eligible_suppliers.map((s) => (
                          <button
                            key={s.company_id}
                            type="button"
                            onClick={() => onJumpToSupplier(s.company_id)}
                            className="border border-[#BFD6C4] bg-white px-3 py-1 font-mono-tabular text-xs font-medium text-[#1E3F24] hover:border-[#1E3F24] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition"
                          >
                            Switch to [{s.company_id}] {s.name} →
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-[#F0D0D0] bg-[#FAF2F2] p-4 text-xs text-[#7A1D1D] rounded-xl space-y-2">
                      <div className="font-semibold">
                        [Feature M2 / Rule R4] No taxi supplier can serve this request. Breakdown per supplier:
                      </div>
                      <ul className="space-y-1 font-mono-tabular text-[11px] max-h-36 overflow-y-auto">
                        {activeRequest.supplier_matching?.ineligible_reasons?.map((ir) => (
                          <li key={ir.company_id}>
                            • <strong>[{ir.company_id}] {ir.name}</strong> ({ir.rule}): {ir.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Stretch S1: Shared Ride */}
                {shareableMatches.length > 0 && (
                  <div className="border border-[#EBDCC0] bg-[#FAF5EC] p-4 text-xs text-[#78350F] rounded-xl">
                    <div className="font-semibold flex items-center gap-1.5 mb-1.5">
                      <Users className="h-3.5 w-3.5" />
                      [Stretch S1: Shared Ride Available] Matched passenger on same flight and destination:
                    </div>
                    {shareableMatches.map((m) => (
                      <div
                        key={m.partner_request_id}
                        className="mt-1.5 flex items-center justify-between border-t border-[#EBDCC0]/70 pt-2 font-mono-tabular"
                      >
                        <span>
                          Merge with <strong>{m.partner_request_id}</strong> ({m.partner_traveler_name}) · Combined:{' '}
                          {m.combined_passengers} pax, {m.combined_large_bags}L/{m.combined_small_bags}S bags
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMergeSharedRide(m.partner_request_id)}
                          className="bg-[#78350F] px-3.5 py-1 text-[11px] text-white rounded-lg hover:bg-[#632a0c] transition shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        >
                          Share 1 Car
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Taxi Offers List (M4, R8, G4, G5) */}
              <div className="border border-[#E6E3DB] bg-white p-7 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EEE8] pb-3.5">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
                      Feature M4 & G5 · Rule R8
                    </span>
                    <h3 className="text-base font-semibold tracking-tight text-[#161615]">
                      Assigned Taxi Offers ({activeRequest.offers?.length || 0})
                    </h3>
                  </div>

                  {/* Feature G5: Sort & Filter */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-xs text-[#686660]">
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#8A8881]" />
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="border border-[#DDD9CE] bg-[#FCFCFA] px-3 py-1.5 font-mono-tabular text-xs rounded-xl focus:border-[#161615] focus:outline-none"
                      >
                        <option value="">Sort: Default</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                      </select>
                    </div>
                    <select
                      value={filterCarType}
                      onChange={(e) => setFilterCarType(e.target.value)}
                      className="border border-[#DDD9CE] bg-[#FCFCFA] px-3 py-1.5 font-mono-tabular text-xs rounded-xl focus:border-[#161615] focus:outline-none"
                    >
                      <option value="">Filter: All Types</option>
                      {catalog.car_types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!activeRequest.offers || activeRequest.offers.length === 0 ? (
                  <div className="border border-dashed border-[#DDD9CE] bg-[#FCFCFA] p-9 text-center text-xs text-[#686660] rounded-2xl space-y-1">
                    <div>No taxi offers assigned yet.</div>
                    <div className="text-[11px] text-[#8A8881]">
                      Switch to <strong>Flow 2: Taxi Supplier</strong> in the top bar to assign a car and quote a price.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {activeRequest.offers.map((offer) => (
                      <div
                        key={offer.offer_id}
                        className="flex flex-wrap items-center justify-between gap-4 border border-[#ECEAE3] bg-[#FCFCFA] p-4.5 rounded-xl transition hover:border-[#DDD9CE]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-tabular text-xs font-bold text-[#161615]">
                              [{offer.offer_id}]
                            </span>
                            <span className="text-sm font-semibold text-[#161615]">
                              {offer.company_name}
                            </span>
                            <span className="font-mono-tabular text-xs text-[#686660]">
                              ★{offer.company_rating}
                            </span>
                            <span
                              className={`border px-2 py-0.5 font-mono-tabular text-[10px] font-semibold rounded-md ${
                                offer.status === 'BOOKED'
                                  ? 'border-[#D0E2D4] bg-[#F0F5F1] text-[#1E3F24]'
                                  : offer.status === 'REJECTED' || offer.status === 'NOT_CHOSEN'
                                  ? 'border-[#F0D0D0] bg-[#FAF2F2] text-[#7A1D1D]'
                                  : 'border-[#DDD9CE] bg-white text-[#161615]'
                              }`}
                            >
                              {offer.status}
                            </span>
                          </div>
                          <div className="mt-1 font-mono-tabular text-xs text-[#686660]">
                            Vehicle: <strong>{offer.vehicle_id}</strong> ({offer.vehicle_type}) ·{' '}
                            {offer.seats} seats · {offer.large_bags}L / {offer.small_bags}S bags
                            {offer.expires_at && ` · Expires: ${offer.expires_at}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right font-mono-tabular">
                            <div className="text-lg font-bold text-[#161615]">
                              ₹{offer.price_inr.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#8A8881]">
                              {offer.car_still_free ? 'Car Free (R6 ✓)' : 'Car Busy (R6 ✗)'}
                            </div>
                          </div>

                          {offer.status === 'OPEN' && activeRequest.status === 'OPEN' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBookOffer(offer.offer_id)}
                                className="flex items-center gap-1.5 bg-[#161615] px-4 py-2 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A27] rounded-xl transition shadow-[0_1px_3px_rgba(0,0,0,0.1)] active:scale-[0.98]"
                              >
                                <Check className="h-3.5 w-3.5" /> Book
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectOffer(offer.offer_id)}
                                className="flex items-center gap-1 border border-[#F0D0D0] bg-[#FAF2F2] px-3.5 py-2 text-xs font-semibold text-[#7A1D1D] hover:bg-[#f6e6e6] rounded-xl transition active:scale-[0.98]"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 3: Booking Summary & Flight Change */}
      {subTab === 'BOOKING_LOOKUP' && (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="border border-[#E6E3DB] bg-white p-7 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
              Feature M5 · Persistent Across Restarts
            </span>
            <h2 className="text-base font-semibold tracking-tight text-[#161615] mt-0.5">
              Lookup Ride Summary by 10-Digit Booking Number
            </h2>
            <form onSubmit={(e) => handleLookupBooking(e)} className="mt-3.5 flex gap-2.5">
              <input
                type="text"
                placeholder="Enter 10-digit booking number (e.g. 7392018462)"
                value={bookingNumberInput}
                onChange={(e) => setBookingNumberInput(e.target.value)}
                className="flex-1 border border-[#DDD9CE] bg-[#FCFCFA] px-4 py-2.5 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-[#161615] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#FAF9F6] hover:bg-[#2A2A27] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition active:scale-[0.98]"
              >
                <Search className="h-3.5 w-3.5" /> Open Summary
              </button>
            </form>
          </div>

          {bookingSummary && (
            <div className="border border-[#E6E3DB] bg-white p-7 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex flex-wrap items-center justify-between border-b border-[#F0EEE8] pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
                    Confirmed 10-Digit Booking
                  </span>
                  <div className="font-mono-tabular text-2xl font-bold tracking-tight text-[#161615]">
                    #{bookingSummary.booking_number}
                  </div>
                </div>
                <div className="text-right font-mono-tabular">
                  <span className="border border-[#D0E2D4] bg-[#F0F5F1] px-2.5 py-1 text-xs font-semibold text-[#1E3F24] rounded-md">
                    {bookingSummary.status}
                  </span>
                  <div className="mt-1 text-xl font-bold text-[#161615]">
                    ₹{bookingSummary.price_inr.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 font-mono-tabular text-xs sm:grid-cols-2">
                <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-4.5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#8A8881]">Flight & Pickup</div>
                  <div className="font-semibold text-[#161615]">
                    Flight {bookingSummary.flight.flight_id} ({bookingSummary.flight.airline}{' '}
                    {bookingSummary.flight.flight_number})
                  </div>
                  <div className="text-[#686660]">
                    Lands {bookingSummary.flight.to}: {bookingSummary.flight.arrival_local}
                  </div>
                  <div className="text-[#161615] font-semibold pt-1">
                    Pickup: {bookingSummary.pickup} (Busy until {bookingSummary.busy_end})
                  </div>
                </div>

                <div className="border border-[#ECEAE3] bg-[#FCFCFA] p-4.5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#8A8881]">Hotel & Transport</div>
                  <div className="font-semibold text-[#161615]">
                    {bookingSummary.hotel.name} ({bookingSummary.hotel.area}, {bookingSummary.hotel.city})
                  </div>
                  <div className="text-[#686660]">
                    Supplier: [{bookingSummary.supplier.company_id}] {bookingSummary.supplier.name}
                  </div>
                  <div className="text-[#161615] font-semibold pt-1">
                    Car: {bookingSummary.car.vehicle_id} ({bookingSummary.car.type},{' '}
                    {bookingSummary.car.seats} seats)
                  </div>
                </div>
              </div>

              {/* Feature M7 / Rule R9: Send Flight or Pickup Change Request */}
              <div className="border-t border-[#F0EEE8] pt-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8881]">
                  Feature M7 · Rule R9
                </span>
                <h3 className="text-sm font-semibold tracking-tight text-[#161615] mb-3">
                  Send a Flight or Pickup Time Change Request
                </h3>
                <form onSubmit={handleSubmitChangeRequest} className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-[#686660] mb-1.5 font-medium">New Flight</label>
                    <select
                      value={newFlightId}
                      onChange={(e) => {
                        const fid = e.target.value;
                        setNewFlightId(fid);
                        const fl = catalog.flights.find((f) => f.flight_id === fid);
                        if (fl) setNewPickup(fl.earliest_pickup);
                      }}
                      className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none"
                    >
                      {catalog.flights.map((f) => (
                        <option key={f.flight_id} value={f.flight_id}>
                          [{f.flight_id}] → {f.to} ({f.arrival_local})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#686660] mb-1.5 font-medium">
                      New Pickup Time (≥ Landing + 60m)
                    </label>
                    <input
                      type="text"
                      value={newPickup}
                      onChange={(e) => setNewPickup(e.target.value)}
                      className="w-full border border-[#DDD9CE] bg-[#FCFCFA] px-3 py-2 font-mono-tabular text-xs rounded-xl transition focus:border-[#161615] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#161615] py-2 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A27] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition active:scale-[0.98]"
                    >
                      Send Change Request
                    </button>
                  </div>
                </form>

                {/* Change Requests History */}
                {bookingSummary.change_requests?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-[#686660]">Change Request History:</div>
                    {bookingSummary.change_requests.map((c) => (
                      <div
                        key={c.change_id}
                        className="flex items-center justify-between border border-[#ECEAE3] bg-[#FCFCFA] px-3.5 py-2 font-mono-tabular text-xs rounded-xl"
                      >
                        <span>
                          <strong>{c.change_id}</strong> → Flight {c.new_flight_id}, Pickup{' '}
                          {c.new_pickup}
                        </span>
                        <span
                          className={`border px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                            c.status === 'ACCEPTED'
                              ? 'border-[#D0E2D4] bg-[#F0F5F1] text-[#1E3F24]'
                              : c.status === 'REJECTED'
                              ? 'border-[#F0D0D0] bg-[#FAF2F2] text-[#7A1D1D]'
                              : 'border-[#EBDCC0] bg-[#FAF5EC] text-[#78350F]'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
