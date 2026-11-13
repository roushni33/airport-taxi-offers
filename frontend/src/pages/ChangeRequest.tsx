import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/apiService';
import { BookingSummary, ChangeRequest as IChangeRequest, Flight } from '../types';
import { RuleBanner } from '../components/common/RuleBanner';
import { ChevronLeft, ArrowRight } from 'lucide-react';

export const ChangeRequest: React.FC = () => {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [newFlightId, setNewFlightId] = useState('');
  const [newPickup, setNewPickup] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedChange, setSubmittedChange] = useState<IChangeRequest | null>(null);
  const [ruleError, setRuleError] = useState<{ ruleViolated: string | null; message: string } | null>(null);

  useEffect(() => {
    if (!bookingNumber) return;

    Promise.all([
      ApiService.getBooking(bookingNumber),
      ApiService.getCatalogBootstrap(),
    ])
      .then(([bookingRes, catRes]) => {
        if (bookingRes.data) {
          setBooking(bookingRes.data);
        }
        if (catRes.data?.flights) {
          setFlights(catRes.data.flights);
        }
      })
      .catch((err) => {
        setRuleError({
          ruleViolated: err.ruleViolated || null,
          message: err.message || 'Failed to load booking or flight data.',
        });
      })
      .finally(() => setLoading(false));
  }, [bookingNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingNumber) return;
    setRuleError(null);

    if (!newFlightId && !newPickup) {
      setRuleError({
        ruleViolated: 'R9',
        message: 'Please specify at least a new flight or a new pickup time.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.createChangeRequest(bookingNumber, {
        new_flight_id: newFlightId || undefined,
        new_pickup: newPickup || undefined,
      });

      if (res.data) {
        setSubmittedChange(res.data);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || 'R9',
        message: err.message || 'Failed to submit change request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <h2>Booking Not Found</h2>
        <p>Could not retrieve booking details for reference {bookingNumber}.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => navigate(`/traveler/booking/${bookingNumber}`)}
        style={{ marginBottom: 'var(--space-4)', padding: '4px 8px', fontSize: '0.8125rem' }}
      >
        <ChevronLeft size={14} />
        <span>Back to Booking</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>Request Schedule Change</h1>
        <p>
          Submit an adjusted arrival flight or pickup time for booking <strong style={{ color: 'var(--text-primary)' }}>{booking.booking_number}</strong>.
        </p>
      </div>

      {ruleError && (
        <RuleBanner
          ruleViolated={ruleError.ruleViolated}
          message={ruleError.message}
          onDismiss={() => setRuleError(null)}
        />
      )}

      {/* Submitted Banner */}
      {submittedChange ? (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span className="badge badge-warning">Waiting for Fleet Response</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>ID: {submittedChange.change_id}</span>
          </div>
          <h2 style={{ fontSize: '1.1875rem', marginBottom: 'var(--space-2)' }}>Change Request Submitted</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Your taxi supplier (<strong>{booking.supplier.name}</strong>) has been notified to re-evaluate vehicle availability for the requested new time.
          </p>

          <button
            className="btn-secondary"
            onClick={() => navigate(`/traveler/booking/${bookingNumber}`)}
          >
            <span>Return to Booking Details</span>
            <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Current Confirmed Schedule Card */}
          <div className="card" style={{ backgroundColor: 'var(--surface-2)', padding: 'var(--space-4) var(--space-5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }}>
              Current Confirmed Schedule
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Flight</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.flight.flight_number || booking.flight.flight_id} ({booking.flight.arrival_local.replace('T', ' ')})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Pickup Time</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.pickup.replace('T', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* New Schedule Inputs Card */}
          <div className="card">
            <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-4)' }}>
              Proposed New Schedule
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="new_flight">New Arrival Flight (Optional)</label>
                <select
                  id="new_flight"
                  value={newFlightId}
                  onChange={(e) => setNewFlightId(e.target.value)}
                >
                  <option value="">Keep current flight ({booking.flight.flight_id})</option>
                  {flights.filter((f) => f.to === booking.flight.to).map((f) => (
                    <option key={f.flight_id} value={f.flight_id}>
                      {f.flight_id} · {f.airline} · Lands {f.arrival_local.replace('T', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new_pickup">New Pickup Time (Rule R2: Min 60 mins after landing)</label>
                <input
                  id="new_pickup"
                  type="datetime-local"
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM"
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/traveler/booking/${bookingNumber}`)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Change Request'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
