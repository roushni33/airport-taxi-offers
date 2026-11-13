import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/apiService';
import { BookingSummary, ChangeRequest, Flight } from '../types';
import { RuleBanner } from '../components/common/RuleBanner';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const ChangeResponse: React.FC = () => {
  const { changeId } = useParams<{ changeId: string }>();
  const navigate = useNavigate();

  const [changeReq, setChangeReq] = useState<ChangeRequest | null>(null);
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-check results
  const [r2Check, setR2Check] = useState<{ pass: boolean; reason?: string }>({ pass: true });

  const [isResponding, setIsResponding] = useState(false);
  const [ruleError, setRuleError] = useState<{ ruleViolated: string | null; message: string } | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!changeId) return;

    Promise.all([
      ApiService.getChangeRequest(changeId),
      ApiService.getCatalogBootstrap().catch(() => null),
    ])
      .then(([changeRes, catRes]) => {
        if (changeRes.data) {
          const changeData = changeRes.data;
          setChangeReq(changeData);
          setBooking(changeData.booking);

          const catalogFlights = catRes?.data?.flights || [];
          setFlights(catalogFlights);

          // Calculate R2 pre-check
          const flightObj = changeData.new_flight_id
            ? catalogFlights.find((f) => f.flight_id === changeData.new_flight_id)
            : changeData.booking?.flight;

          const resolvedPickup = changeData.new_pickup || changeData.booking?.pickup;

          if (flightObj && resolvedPickup) {
            const arrivalMs = new Date(flightObj.arrival_local).getTime();
            const pickupMs = new Date(resolvedPickup).getTime();
            const diffMinutes = Math.floor((pickupMs - arrivalMs) / 60000);
            if (diffMinutes < 60) {
              setR2Check({
                pass: false,
                reason: `Pickup is only ${diffMinutes} minutes after landing. Rule R2 requires at least 60 minutes.`,
              });
            } else {
              setR2Check({ pass: true });
            }
          }
        }
      })
      .catch((err) => {
        setRuleError({
          ruleViolated: err.ruleViolated || null,
          message: err.message || 'Failed to load change request details.',
        });
      })
      .finally(() => setLoading(false));
  }, [changeId]);

  const handleDecision = async (action: 'ACCEPT' | 'REJECT') => {
    if (!changeId) return;
    setIsResponding(true);
    setRuleError(null);
    try {
      const res = await ApiService.respondToChangeRequest(changeId, action);
      if (res.data) {
        setDecisionFeedback(
          action === 'ACCEPT'
            ? 'Change accepted! The booking has been updated with the new flight and pickup time.'
            : 'Change rejected. The original confirmed booking remains intact.'
        );
        setTimeout(() => {
          navigate('/supplier/dashboard');
        }, 1800);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || 'R9',
        message: err.message || 'Failed to record decision.',
      });
    } finally {
      setIsResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <p>Loading change request...</p>
      </div>
    );
  }

  if (!changeReq || !booking) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <h2>Change Request Not Found</h2>
        <p>Could not locate change request {changeId}.</p>
        <button className="btn-secondary" onClick={() => navigate('/supplier/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const proposedFlight = changeReq.new_flight_id
    ? flights.find((f) => f.flight_id === changeReq.new_flight_id)
    : undefined;
  const isFlightChanged = Boolean(changeReq.new_flight_id && changeReq.new_flight_id !== booking.flight.flight_id);
  const isPickupChanged = Boolean(changeReq.new_pickup && changeReq.new_pickup !== booking.pickup);

  const canAccept = r2Check.pass;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => navigate('/supplier/dashboard')}
        style={{ marginBottom: 'var(--space-4)', padding: '6px 10px', fontSize: '0.8125rem' }}
      >
        <ChevronLeft size={16} />
        <span>Back to Supplier Dashboard</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
          <span className="badge badge-warning">Change Request #{changeReq.change_id}</span>
          <span className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Booking #{booking.booking_number}
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Review Schedule Change</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Traveler <strong>{booking.traveler_name}</strong> requested a flight or pickup time change. Review the comparison below to accept or reject.
        </p>
      </div>

      {ruleError && (
        <RuleBanner
          ruleViolated={ruleError.ruleViolated}
          message={ruleError.message}
          onDismiss={() => setRuleError(null)}
        />
      )}

      {decisionFeedback && (
        <div
          className="card animate-fade-in"
          style={{
            backgroundColor: 'var(--success-bg)',
            borderColor: 'var(--success-border)',
            color: 'var(--success)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={20} />
          <span>{decisionFeedback}</span>
        </div>
      )}

      {/* Side-by-Side Diff Table */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Parameter</th>
              <th style={{ width: '37.5%' }}>Current Confirmed</th>
              <th style={{ width: '37.5%' }}>Requested Change</th>
            </tr>
          </thead>
          <tbody>
            {/* Flight */}
            <tr style={{ backgroundColor: isFlightChanged ? 'var(--action-tint)' : 'transparent' }}>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Arrival Flight
              </td>
              <td>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.flight.flight_number || booking.flight.flight_id} ({booking.flight.to})
                </div>
                <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Lands {booking.flight.arrival_local.replace('T', ' ')}
                </div>
              </td>
              <td>
                {isFlightChanged && proposedFlight ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--action)' }}>
                        {proposedFlight.flight_number || proposedFlight.flight_id} ({proposedFlight.to})
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Changed</span>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Lands {proposedFlight.arrival_local.replace('T', ' ')}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>Unchanged ({booking.flight.flight_id})</span>
                )}
              </td>
            </tr>

            {/* Pickup Time */}
            <tr style={{ backgroundColor: isPickupChanged ? 'var(--action-tint)' : 'transparent' }}>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Pickup Time
              </td>
              <td className="tabular-nums">
                {booking.pickup.replace('T', ' ')}
              </td>
              <td>
                {isPickupChanged && changeReq.new_pickup ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--action)' }}>
                      {changeReq.new_pickup.replace('T', ' ')}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Changed</span>
                  </div>
                ) : (
                  <span className="tabular-nums" style={{ color: 'var(--text-tertiary)' }}>Unchanged ({booking.pickup.replace('T', ' ')})</span>
                )}
              </td>
            </tr>

            {/* Vehicle & Fleet */}
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Assigned Vehicle
              </td>
              <td>
                {booking.car.type} <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>({booking.car.vehicle_id})</span>
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>
                Preserved: {booking.car.vehicle_id}
              </td>
            </tr>

            {/* Destination */}
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Destination Hotel
              </td>
              <td>
                {booking.hotel.name}
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>
                Unchanged ({booking.hotel.name})
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pre-Check Verification Panel */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>
          Rule Pre-Check Verification
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          The rule engine validates compliance with pickup buffers and vehicle schedule constraints before approval:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* R2 Pre-check */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface-field)',
              border: '1px solid var(--border-subtle)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {r2Check.pass ? (
                <CheckCircle size={18} color="var(--success)" />
              ) : (
                <XCircle size={18} color="var(--error)" />
              )}
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Rule R2: Flight Buffer</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {r2Check.pass
                    ? 'Pickup is at least 60 minutes after arrival flight touchdown.'
                    : r2Check.reason}
                </div>
              </div>
            </div>
            <span className={`badge ${r2Check.pass ? 'badge-success' : 'badge-error'}`}>
              {r2Check.pass ? 'Passes R2' : 'Fails R2'}
            </span>
          </div>

          {/* R6 Verification Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface-field)',
              border: '1px solid var(--border-subtle)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="var(--success)" />
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Rule R6: Vehicle Schedule Lock</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Backend confirms vehicle {booking.car.vehicle_id} availability before updating reservation.
                </div>
              </div>
            </div>
            <span className="badge badge-info">
              Enforced on Accept
            </span>
          </div>
        </div>
      </div>

      {/* Decision Buttons Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <button
          type="button"
          className="btn-danger"
          onClick={() => handleDecision('REJECT')}
          disabled={isResponding}
        >
          {isResponding ? 'Processing...' : 'Reject Change'}
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => handleDecision('ACCEPT')}
          disabled={isResponding || !canAccept}
        >
          {isResponding ? 'Accepting...' : 'Accept & Update Booking'}
        </button>
      </div>
    </div>
  );
};
