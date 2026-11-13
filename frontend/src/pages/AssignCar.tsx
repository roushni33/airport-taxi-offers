import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { ApiService } from '../services/apiService';
import { RideRequest, VehicleEvaluation } from '../types';
import { RuleBanner } from '../components/common/RuleBanner';
import {
  Car,
  ChevronLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plane,
  Building,
} from 'lucide-react';

export const AssignCar: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { companyId, company } = useSession();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [offerPrice, setOfferPrice] = useState<number | ''>('');
  const [expiryMinutes, setExpiryMinutes] = useState<number>(10);

  // Evaluation & Errors
  const [evaluations, setEvaluations] = useState<VehicleEvaluation[]>([]);
  const [ruleError, setRuleError] = useState<{ ruleViolated: string | null; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || !companyId || !company) return;

    Promise.all([
      ApiService.getRequest(requestId),
      ApiService.getSupplierDashboard(companyId).catch(() => null),
    ])
      .then(([reqRes, dashRes]) => {
        if (reqRes.data) {
          const req = reqRes.data;
          setRequest(req);
          setOfferPrice(req.price_inr || (req.route ? req.route.price_min_inr : 10000));

          // Check if servable requests from backend dashboard contains precomputed evaluations
          const servable = dashRes?.data?.servable_requests?.find((r) => r.request_id === requestId);
          if (servable && servable.vehicle_evaluations?.length > 0) {
            setEvaluations(servable.vehicle_evaluations);
            const firstEligible = servable.vehicle_evaluations.find((e) => e.eligible);
            if (firstEligible) {
              setSelectedVehicleId(firstEligible.vehicle_id);
            } else {
              setSelectedVehicleId(servable.vehicle_evaluations[0].vehicle_id);
            }
          } else {
            // Clean fallback: evaluate vehicles based on fleet capacity rules
            const totalPass = (req.adults || 0) + (req.child_ages?.length || 0);
            const evals: VehicleEvaluation[] = company.vehicles.map((v) => {
              let eligible = true;
              let ruleFailed: 'R5' | 'R6' | null = null;
              let reason: string | null = null;

              if (req.car_type && v.type !== req.car_type) {
                eligible = false;
                ruleFailed = 'R5';
                reason = `Vehicle type ${v.type} does not match requested ${req.car_type}.`;
              } else if (v.seats < totalPass) {
                eligible = false;
                ruleFailed = 'R5';
                reason = `Vehicle has ${v.seats} seats; requires ${totalPass}.`;
              } else if (v.large_bags < (req.large_bags || 0)) {
                eligible = false;
                ruleFailed = 'R5';
                reason = `Vehicle holds ${v.large_bags} large bags; requires ${req.large_bags}.`;
              } else if (v.small_bags < (req.small_bags || 0)) {
                eligible = false;
                ruleFailed = 'R5';
                reason = `Vehicle holds ${v.small_bags} small bags; requires ${req.small_bags}.`;
              }

              return {
                ...v,
                eligible,
                ruleFailed,
                reason,
              };
            });
            setEvaluations(evals);
            const firstEligible = evals.find((e) => e.eligible);
            if (firstEligible) {
              setSelectedVehicleId(firstEligible.vehicle_id);
            } else if (evals.length > 0) {
              setSelectedVehicleId(evals[0].vehicle_id);
            }
          }
        }
      })
      .catch((err) => {
        setRuleError({
          ruleViolated: err.ruleViolated || null,
          message: err.message || 'Failed to load request.',
        });
      })
      .finally(() => setLoading(false));
  }, [requestId, companyId, company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !companyId || !selectedVehicleId) return;
    setRuleError(null);
    setSuccessMsg(null);

    const priceNum = Number(offerPrice);
    if (!priceNum || priceNum <= 0) {
      setRuleError({ ruleViolated: 'R3', message: 'Please enter a valid price in whole INR.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() + expiryMinutes);
      const expiresAt = now.toISOString().slice(0, 16);

      const res = await ApiService.assignCar(companyId, {
        request_id: requestId,
        vehicle_id: selectedVehicleId,
        price_inr: priceNum,
        expires_at: expiresAt,
      });

      if (res.data) {
        setSuccessMsg(`Car ${selectedVehicleId} successfully assigned at ₹${priceNum.toLocaleString('en-IN')}!`);
        setTimeout(() => {
          navigate('/supplier/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || 'R7',
        message: err.message || 'Vehicle assignment was refused.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !request || !company) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <p>Loading vehicle assignment...</p>
      </div>
    );
  }

  const route = request.route;
  const priceNum = Number(offerPrice) || 0;
  const isPriceValid = route ? priceNum >= route.price_min_inr && priceNum <= route.price_max_inr : true;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1200px' }}>
      {/* Back Link */}
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
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
          Assign Car & Bid · {company.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review request parameters, select an eligible vehicle from your fleet, and quote your price within approved route bounds.
        </p>
      </div>

      {ruleError && (
        <RuleBanner
          ruleViolated={ruleError.ruleViolated}
          message={ruleError.message}
          onDismiss={() => setRuleError(null)}
        />
      )}

      {successMsg && (
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
          <span>{successMsg}</span>
        </div>
      )}

      {/* Responsive Form Grid */}
      <form onSubmit={handleSubmit} className="form-layout-grid">
        {/* Left: Vehicle Selection & Price Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Vehicle Picker */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={18} color="var(--action)" />
                <span>Select Fleet Vehicle</span>
              </h2>
              <span className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {evaluations.filter((e) => e.eligible).length} of {evaluations.length} cars eligible
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Vehicles are evaluated against required passenger seats ({request.total_passengers}), baggage capacity ({request.large_bags}L + {request.small_bags}S), and conflicting ride schedules.
            </p>

            {/* Accessible Vehicle Radio Cards */}
            <div
              role="radiogroup"
              aria-label="Fleet vehicle selection"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {evaluations.map((veh) => {
                const isSelected = selectedVehicleId === veh.vehicle_id;
                return (
                  <div
                    key={veh.vehicle_id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setSelectedVehicleId(veh.vehicle_id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedVehicleId(veh.vehicle_id);
                      }
                    }}
                    style={{
                      border: '1px solid',
                      borderColor: isSelected
                        ? 'var(--action)'
                        : veh.eligible
                        ? 'var(--border-subtle)'
                        : 'var(--error-border)',
                      backgroundColor: isSelected
                        ? 'var(--surface-2)'
                        : 'var(--surface-1)',
                      boxShadow: isSelected ? '0 0 0 1px var(--action)' : 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      cursor: 'pointer',
                      transition: 'border-color 0.12s ease, background-color 0.12s ease',
                      opacity: veh.eligible ? 1 : 0.85,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <input
                          type="radio"
                          name="assigned_vehicle"
                          checked={isSelected}
                          onChange={() => setSelectedVehicleId(veh.vehicle_id)}
                          tabIndex={-1}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--action)', cursor: 'pointer', margin: 0 }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                              {veh.vehicle_id} · {veh.type}
                            </strong>
                            {veh.eligible ? (
                              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '1px 7px' }}>
                                Eligible
                              </span>
                            ) : (
                              <span className="badge badge-error" style={{ fontSize: '0.75rem', padding: '1px 7px' }}>
                                {veh.ruleFailed || 'Refused'}
                              </span>
                            )}
                          </div>

                          <div className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Seats: {veh.seats} · Large bags: {veh.large_bags} · Small bags: {veh.small_bags}
                          </div>
                        </div>
                      </div>

                      <div>
                        {veh.eligible ? (
                          <CheckCircle size={18} color="var(--success)" />
                        ) : (
                          <XCircle size={18} color="var(--error)" />
                        )}
                      </div>
                    </div>

                    {/* Refusal Reason (If Ineligible) */}
                    {!veh.eligible && veh.reason && (
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--error-bg)',
                          border: '1px solid var(--error-border)',
                          fontSize: '0.8125rem',
                          color: 'var(--error)',
                          lineHeight: 1.4,
                        }}
                      >
                        {veh.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offer Price Field */}
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>
              Offer Price (INR)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Traveler requested ₹{request.price_inr.toLocaleString('en-IN')}. Route bounds: ₹{route?.price_min_inr.toLocaleString('en-IN')} – ₹{route?.price_max_inr.toLocaleString('en-IN')}.
            </p>

            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }}
              >
                ₹
              </span>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="12500"
                className="tabular-nums"
                style={{
                  paddingLeft: '34px',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  borderColor: isPriceValid ? 'var(--border-subtle)' : 'var(--error)',
                }}
                required
              />
            </div>

            <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8125rem' }}>
              {isPriceValid ? (
                <span className="tabular-nums" style={{ color: 'var(--success)' }}>
                  Allowed range: ₹{route?.price_min_inr.toLocaleString('en-IN')} – ₹{route?.price_max_inr.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="tabular-nums" style={{ color: 'var(--error)' }}>
                  Must be between ₹{route?.price_min_inr.toLocaleString('en-IN')} and ₹{route?.price_max_inr.toLocaleString('en-IN')}.
                </span>
              )}
            </div>
          </div>

          {/* Offer Expiry (Feature G4) */}
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>
              Offer Expiry Window
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <select
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 10)}
                style={{ width: '200px' }}
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes (Default)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                Offer will expire automatically if traveler does not confirm within this duration.
              </span>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/supplier/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !selectedVehicleId}
              style={{ padding: '10px 24px' }}
            >
              {isSubmitting ? 'Validating & Assigning...' : 'Submit Taxi Offer'}
            </button>
          </div>
        </div>

        {/* Right: Request Summary Sidebar */}
        <div style={{ position: 'sticky', top: '88px' }}>
          <div className="card" style={{ backgroundColor: 'var(--surface-1)' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                Request Details
              </div>
              <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {request.traveler_name} <span className="tabular-nums" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({request.request_id})</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: '0.875rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  <Plane size={14} color="var(--action)" />
                  <span>Flight</span>
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {request.flight?.flight_number} (Lands {request.flight?.to} at <span className="tabular-nums">{request.flight?.arrival_local.slice(11, 16)}</span>)
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  <Building size={14} color="var(--action)" />
                  <span>Destination</span>
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {request.hotel?.name} ({request.hotel?.area}, {request.hotel?.city})
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  <Users size={14} color="var(--action)" />
                  <span>Passengers & Luggage</span>
                </div>
                <div className="tabular-nums" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {request.total_passengers} Pax ({request.adults}A, {request.child_ages.length}C)
                </div>
                <div className="tabular-nums" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  Bags: {request.large_bags} Large + {request.small_bags} Small
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  <Clock size={14} color="var(--warning)" />
                  <span>Pickup Time & Busy Window</span>
                </div>
                <div className="tabular-nums" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  Pickup: {request.pickup.replace('T', ' ')}
                </div>
                <div className="tabular-nums" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  Car busy: {request.pickup.slice(11, 16)} – {request.busy_end?.slice(11, 16)} (2 × {route?.drive_minutes}m)
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Traveler&apos;s Target Price</div>
                <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  ₹{request.price_inr.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
