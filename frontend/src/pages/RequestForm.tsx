import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/apiService';
import { RoutePreviewData, CarType, Flight, Hotel } from '../types';
import { RuleBanner } from '../components/common/RuleBanner';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export const RequestForm: React.FC = () => {
  const navigate = useNavigate();

  // Catalog State
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Form Fields
  const [travelerName, setTravelerName] = useState('');
  const [flightId, setFlightId] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [adults, setAdults] = useState(1);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [largeBags, setLargeBags] = useState(1);
  const [smallBags, setSmallBags] = useState(1);
  const [carType, setCarType] = useState<CarType | ''>('');
  const [pickup, setPickup] = useState('');
  const [priceInr, setPriceInr] = useState<number | ''>('');

  // Async States
  const [preview, setPreview] = useState<RoutePreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ruleError, setRuleError] = useState<{ ruleViolated: string | null; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load catalog on mount
  useEffect(() => {
    let isMounted = true;
    ApiService.getCatalogBootstrap()
      .then((res) => {
        if (isMounted && res.data) {
          const fetchedFlights = res.data.flights || [];
          const fetchedHotels = res.data.hotels || [];
          setFlights(fetchedFlights);
          setHotels(fetchedHotels);

          if (fetchedFlights.length > 0) {
            setFlightId(fetchedFlights[0].flight_id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setRuleError({
            ruleViolated: null,
            message: err.message || 'Failed to load catalog data from server.',
          });
        }
      })
      .finally(() => {
        if (isMounted) setCatalogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When flight changes, filter hotels by served cities
  const selectedFlight = flights.find((f) => f.flight_id === flightId);
  const filteredHotels = selectedFlight
    ? hotels.filter((h) => {
        if (['NRT', 'HND'].includes(selectedFlight.to)) return h.city === 'Tokyo';
        if (selectedFlight.to === 'KIX') return ['Osaka', 'Kyoto'].includes(h.city);
        if (selectedFlight.to === 'DXB') return ['Dubai', 'Abu Dhabi'].includes(h.city);
        if (selectedFlight.to === 'AUH') return h.city === 'Abu Dhabi';
        return true;
      })
    : hotels;

  useEffect(() => {
    if (filteredHotels.length > 0 && (!hotelId || !filteredHotels.some((h) => h.hotel_id === hotelId))) {
      setHotelId(filteredHotels[0].hotel_id);
    }
  }, [flightId, filteredHotels, hotelId]);

  // Fetch route preview whenever flight and hotel are chosen
  useEffect(() => {
    if (!flightId || !hotelId) return;

    let isMounted = true;
    setPreviewLoading(true);
    setRuleError(null);

    ApiService.getRoutePreview(flightId, hotelId)
      .then((res) => {
        if (isMounted && res.data) {
          setPreview(res.data);
          if (!pickup) {
            setPickup(res.data.earliest_pickup);
          }
          if (priceInr === '' && res.data.route) {
            const mid = Math.round((res.data.route.price_min_inr + res.data.route.price_max_inr) / 2);
            setPriceInr(mid);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPreview(null);
          setRuleError({
            ruleViolated: err.ruleViolated || 'R1',
            message: err.message || 'Route incompatibility detected',
          });
        }
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [flightId, hotelId]);

  const handleAddChild = () => {
    if (childAges.length < 5) {
      setChildAges([...childAges, 5]);
    }
  };

  const handleUpdateChildAge = (index: number, age: number) => {
    const updated = [...childAges];
    updated[index] = Math.max(0, Math.min(17, age));
    setChildAges(updated);
  };

  const handleRemoveChild = (index: number) => {
    setChildAges(childAges.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError(null);

    if (!flightId || !hotelId) {
      setRuleError({ ruleViolated: 'R1', message: 'Flight and Hotel selection are required.' });
      return;
    }

    if (priceInr === '' || priceInr <= 0) {
      setRuleError({ ruleViolated: 'R3', message: 'Please enter a valid whole INR price.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await ApiService.createRequest({
        traveler_name: travelerName.trim() || 'Traveler',
        flight_id: flightId,
        hotel_id: hotelId,
        adults,
        child_ages: childAges,
        large_bags: largeBags,
        small_bags: smallBags,
        pickup: pickup || undefined,
        car_type: carType ? (carType as CarType) : null,
        price_inr: Number(priceInr),
      });

      if (response.data) {
        navigate(`/traveler/offers/${response.data.request_id}`);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || null,
        message: err.message || 'Failed to submit ride request.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const minPrice = preview?.route?.price_min_inr || 0;
  const maxPrice = preview?.route?.price_max_inr || 0;
  const currentPriceNum = Number(priceInr) || 0;
  const isInsideRange = currentPriceNum >= minPrice && currentPriceNum <= maxPrice && minPrice > 0;

  return (
    <div className="container" style={{ maxWidth: '1040px' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>New Ride Request</h1>
        <p>
          Submit flight and destination details to receive vehicle offers from verified taxi fleets.
        </p>
      </div>

      {ruleError && (
        <RuleBanner
          ruleViolated={ruleError.ruleViolated}
          message={ruleError.message}
          onDismiss={() => setRuleError(null)}
        />
      )}

      {catalogLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading airport routes, hotels, and flight schedules...
        </div>
      ) : (
        /* Main 2-Column Desktop Grid */
        <form onSubmit={handleSubmit} className="form-layout-grid">
          {/* Left Form Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Trip Selection */}
            <div className="card">
              <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-4)' }}>
                Flight & Hotel
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label htmlFor="traveler_name">Lead Passenger Name</label>
                  <input
                    id="traveler_name"
                    type="text"
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="flight_select">Arrival Flight</label>
                  <select
                    id="flight_select"
                    value={flightId}
                    onChange={(e) => setFlightId(e.target.value)}
                    required
                  >
                    {flights.map((f) => (
                      <option key={f.flight_id} value={f.flight_id}>
                        {f.flight_id} · {f.airline} ({f.from} → {f.to}) · Lands {f.arrival_local.replace('T', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hotel_select">Destination Hotel</label>
                  <select
                    id="hotel_select"
                    value={hotelId}
                    onChange={(e) => setHotelId(e.target.value)}
                    required
                  >
                    {filteredHotels.map((h) => (
                      <option key={h.hotel_id} value={h.hotel_id}>
                        {h.name} — {h.area}, {h.city}
                      </option>
                    ))}
                  </select>
                </div>
            </div>
          </div>

          {/* Passengers & Bags */}
          <div className="card">
            <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-4)' }}>
              Passengers & Luggage
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label htmlFor="adult_count">Adults (Age 18+)</label>
                <input
                  id="adult_count"
                  type="number"
                  min={1}
                  max={20}
                  value={adults}
                  onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>

              <div>
                <label htmlFor="large_bags">Large Bags</label>
                <input
                  id="large_bags"
                  type="number"
                  min={0}
                  max={20}
                  value={largeBags}
                  onChange={(e) => setLargeBags(Math.max(0, parseInt(e.target.value) || 0))}
                  required
                />
              </div>

              <div>
                <label htmlFor="small_bags">Small Bags</label>
                <input
                  id="small_bags"
                  type="number"
                  min={0}
                  max={20}
                  value={smallBags}
                  onChange={(e) => setSmallBags(Math.max(0, parseInt(e.target.value) || 0))}
                  required
                />
              </div>
            </div>

            {/* Child Passengers */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Children (Ages 0–17): {childAges.length}
                </span>
                {childAges.length < 5 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleAddChild}
                    style={{ fontSize: '0.75rem', padding: '4px 8px', minHeight: 'auto' }}
                  >
                    <Plus size={12} />
                    <span>Add Child</span>
                  </button>
                )}
              </div>

              {childAges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {childAges.map((age, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--surface-2)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px 8px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Age:</span>
                      <input
                        type="number"
                        min={0}
                        max={17}
                        value={age}
                        onChange={(e) => handleUpdateChildAge(idx, parseInt(e.target.value) || 0)}
                        aria-label={`Child ${idx + 1} age`}
                        style={{
                          width: '44px',
                          padding: '2px 4px',
                          minHeight: 'auto',
                          fontSize: '0.8125rem',
                          textAlign: 'center',
                          backgroundColor: 'var(--surface-field)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveChild(idx)}
                        className="btn-ghost"
                        style={{ padding: '2px', minHeight: 'auto', color: 'var(--text-tertiary)' }}
                        aria-label={`Remove child ${idx + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Vehicle Preference */}
          <div className="card">
            <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-4)' }}>
              Pickup Time & Car Preference
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="pickup_time">Pickup Time</label>
                <input
                  id="pickup_time"
                  type="datetime-local"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  required
                />
                {preview && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                    Earliest allowed: {preview.earliest_pickup.replace('T', ' ')}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="car_type">Car Type (Optional)</label>
                <select
                  id="car_type"
                  value={carType}
                  onChange={(e) => setCarType(e.target.value as any)}
                >
                  <option value="">Any Eligible Type</option>
                  <option value="HATCHBACK">Hatchback</option>
                  <option value="SEDAN">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="BUS">Bus</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Route Summary & Price Submission Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card" style={{ position: 'sticky', top: '72px' }}>
            <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-3)' }}>
              Route & Price Corridor
            </h2>

            {previewLoading ? (
              <p style={{ fontSize: '0.875rem' }}>Calculating route corridor...</p>
            ) : preview ? (
              <div>
                <div style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {preview.flight.to} Airport → {preview.hotel.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {preview.route.distance_km} km · ~{preview.route.drive_minutes} min drive time
                  </div>
                </div>

                {/* Price bounds box */}
                <div style={{ backgroundColor: 'var(--surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                    Route Suggested Price Range
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ₹{preview.route.price_min_inr.toLocaleString('en-IN')} – ₹{preview.route.price_max_inr.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Proposed Price Input */}
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <label htmlFor="price_input">Your Target Price (INR)</label>
                  <input
                    id="price_input"
                    type="number"
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="12000"
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      borderColor: isInsideRange ? 'var(--border-subtle)' : 'var(--error-border)',
                    }}
                    required
                  />
                  <div style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: isInsideRange ? 'var(--success)' : 'var(--error)',
                        fontWeight: 500,
                      }}
                    >
                      {isInsideRange ? 'Within route price range' : 'Outside route corridor'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || !isInsideRange}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <span>{isSubmitting ? 'Posting Request...' : 'Post Ride Request'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem' }}>Select a flight and hotel to preview the route.</p>
            )}
          </div>
        </div>
      </form>
      )}
    </div>
  );
};
