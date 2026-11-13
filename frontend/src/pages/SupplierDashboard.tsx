import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { ApiService } from '../services/apiService';
import { SupplierDashboardData } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { ArrowRight } from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const { companyId, company } = useSession();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'BOOKINGS'>('REQUESTS');
  const [data, setData] = useState<SupplierDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!companyId) return;
    try {
      const res = await ApiService.getSupplierDashboard(companyId);
      if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) {
      navigate('/');
      return;
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 3000);
    return () => clearInterval(interval);
  }, [companyId]);

  if (!companyId || !company) {
    return null;
  }

  if (loading && !data) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <p>Loading fleet dashboard...</p>
      </div>
    );
  }

  const pendingChangesCount = data?.change_requests?.filter((c) => c.status === 'WAITING').length || 0;

  return (
    <div className="container" style={{ maxWidth: '1040px' }}>
      {/* Supplier Profile Header */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
            FLEET DISPATCH · {company.company_id}
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{company.name}</h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Airports: {company.airports.join(', ')} · Fleet: {company.vehicles.length} vehicles · Operating Hours: {company.service_from}–{company.service_until}
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => navigate('/')}
          style={{ fontSize: '0.8125rem' }}
        >
          Change Supplier
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error-border)', marginBottom: 'var(--space-6)', color: 'var(--error)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Supplier Views"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-6)',
          gap: 'var(--space-4)',
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'REQUESTS'}
          onClick={() => setActiveTab('REQUESTS')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'REQUESTS' ? '2px solid var(--action)' : '2px solid transparent',
            color: activeTab === 'REQUESTS' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'REQUESTS' ? 600 : 400,
            padding: '8px 4px',
            borderRadius: 0,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Open Eligible Requests</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
            {data?.servable_requests?.length || 0}
          </span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'BOOKINGS'}
          onClick={() => setActiveTab('BOOKINGS')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'BOOKINGS' ? '2px solid var(--action)' : '2px solid transparent',
            color: activeTab === 'BOOKINGS' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'BOOKINGS' ? 600 : 400,
            padding: '8px 4px',
            borderRadius: 0,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Confirmed Bookings</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
            {data?.my_bookings?.length || 0}
          </span>
          {pendingChangesCount > 0 && (
            <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
              {pendingChangesCount} Pending Change
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Servable Open Requests */}
      {activeTab === 'REQUESTS' && (
        <div>
          {data?.servable_requests && data.servable_requests.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {data.servable_requests.map((req) => {
                const eligibleCars = req.vehicle_evaluations.filter((v) => v.eligible);
                const hasBid = req.my_offers && req.my_offers.length > 0;

                return (
                  <div
                    key={req.request_id}
                    className="card"
                    style={{
                      padding: 'var(--space-5)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                            {req.request_id}
                          </span>
                          {hasBid && (
                            <span className="badge badge-info">
                              Offer Submitted ({req.my_offers.length})
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.125rem' }}>
                          {req.flight.to} Airport → {req.hotel.name} ({req.hotel.area}, {req.hotel.city})
                        </h3>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Passenger: <strong>{req.traveler_name}</strong> · Flight: {req.flight.flight_number} (Lands {req.flight.arrival_local.replace('T', ' ')})
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Traveler&apos;s Target Price</div>
                        <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ₹{req.traveler_price_inr.toLocaleString('en-IN')}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Route corridor: ₹{req.route.price_min_inr.toLocaleString('en-IN')} – ₹{req.route.price_max_inr.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Request Specs Line */}
                    <div
                      style={{
                        padding: 'var(--space-2) 0',
                        borderTop: '1px solid var(--border-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--space-3)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <span>{req.adults + req.child_ages.length} Passengers ({req.adults}A, {req.child_ages.length}C)</span>
                        <span>·</span>
                        <span>{req.large_bags}L + {req.small_bags}S bags</span>
                        <span>·</span>
                        <span>Pickup: {req.pickup.replace('T', ' ')}</span>
                        {req.car_type && (
                          <>
                            <span>·</span>
                            <span>Requested: <strong>{req.car_type}</strong></span>
                          </>
                        )}
                      </div>

                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                        {eligibleCars.length} of your cars fit and free
                      </span>
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                      <button
                        className="btn-primary"
                        onClick={() => navigate(`/supplier/request/${req.request_id}/assign`)}
                      >
                        <span>Assign Car & Bid</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No Servable Requests"
              description="No open requests currently match your airport coverage, operating hours, and vehicle fleet capacity (Rule R4)."
            />
          )}
        </div>
      )}

      {/* Tab 2: Confirmed Bookings & Changes */}
      {activeTab === 'BOOKINGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Pending Changes Section */}
          {data?.change_requests && data.change_requests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>
                Incoming Schedule Changes ({data.change_requests.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {data.change_requests.map((change) => {
                  const b = data.my_bookings.find((bkg) => bkg.booking_number === change.booking_number);

                  return (
                    <div
                      key={change.change_id}
                      className="card"
                      style={{
                        padding: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            className={`badge ${
                              change.status === 'ACCEPTED'
                                ? 'badge-success'
                                : change.status === 'REJECTED'
                                ? 'badge-error'
                                : 'badge-warning'
                            }`}
                          >
                            {change.status}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                            Booking {change.booking_number}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                          Passenger: {b?.traveler_name || 'Traveler'} · New Pickup: {change.new_pickup ? change.new_pickup.replace('T', ' ') : 'Unchanged'}
                        </div>
                      </div>

                      {change.status === 'WAITING' ? (
                        <button
                          className="btn-primary"
                          onClick={() => navigate(`/supplier/change-request/${change.change_id}`)}
                          style={{ minHeight: '34px', fontSize: '0.8125rem' }}
                        >
                          <span>Review & Decide</span>
                          <ArrowRight size={13} />
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Decided</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirmed Bookings Ledger */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>
              Confirmed Bookings ({data?.my_bookings?.length || 0})
            </h3>
            {data?.my_bookings && data.my_bookings.length > 0 ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Booking No.</th>
                      <th>Traveler</th>
                      <th>Assigned Car</th>
                      <th>Pickup Time</th>
                      <th>Busy Until</th>
                      <th>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.my_bookings.map((b) => (
                      <tr key={b.booking_number}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {b.booking_number}
                        </td>
                        <td>{b.traveler_name}</td>
                        <td>{b.car.type} ({b.car.vehicle_id})</td>
                        <td className="tabular-nums">{b.pickup.replace('T', ' ')}</td>
                        <td className="tabular-nums">{b.busy_end ? b.busy_end.slice(11, 16) : ''}</td>
                        <td className="tabular-nums" style={{ fontWeight: 600 }}>
                          ₹{b.price_inr.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No confirmed bookings yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
