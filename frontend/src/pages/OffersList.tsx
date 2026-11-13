import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/apiService';
import { RideRequest, TaxiOffer } from '../types';
import { RuleBanner } from '../components/common/RuleBanner';
import { EmptyState } from '../components/common/EmptyState';
import { Star, ArrowRight } from 'lucide-react';

export const OffersList: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [ruleError, setRuleError] = useState<{ ruleViolated: string | null; message: string } | null>(null);

  // Sorting & Filtering (Feature G5)
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | ''>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Booking state
  const [bookingOffer, setBookingOffer] = useState<TaxiOffer | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    try {
      const res = await ApiService.getRequest(
        requestId,
        sortBy ? (sortBy as 'price_asc' | 'price_desc') : undefined,
        filterType !== 'ALL' ? filterType : undefined
      );
      if (res.data) {
        setRequest(res.data);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || null,
        message: err.message || 'Failed to load offers.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
    const interval = setInterval(fetchRequestDetails, 3000);
    return () => clearInterval(interval);
  }, [requestId, sortBy, filterType]);

  const handleReject = async (offerId: string) => {
    try {
      await ApiService.rejectOffer(offerId);
      await fetchRequestDetails();
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || null,
        message: err.message || 'Failed to reject offer.',
      });
    }
  };

  const handleConfirmBook = async () => {
    if (!bookingOffer) return;
    setIsBooking(true);
    setRuleError(null);
    try {
      const res = await ApiService.bookOffer(bookingOffer.offer_id);
      if (res.data) {
        setBookingOffer(null);
        navigate(`/traveler/booking/${res.data.booking_number}`);
      }
    } catch (err: any) {
      setRuleError({
        ruleViolated: err.ruleViolated || 'R8',
        message: err.message || 'Booking refused by rule check.',
      });
      setBookingOffer(null);
      await fetchRequestDetails();
    } finally {
      setIsBooking(false);
    }
  };

  if (loading && !request) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
        <p>Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container">
        <EmptyState
          title="Request Not Found"
          description={`Could not retrieve ride request with ID ${requestId}.`}
          action={{
            label: 'Create New Request',
            onClick: () => navigate('/traveler/request'),
          }}
        />
      </div>
    );
  }

  const offers = request.offers || [];
  const cannotBeServed = request.supplier_matching && !request.supplier_matching.can_be_served;

  return (
    <div className="container" style={{ maxWidth: '1040px' }}>
      {/* Request Header Summary */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {request.request_id}
              </span>
              <span className={`badge ${request.status === 'BOOKED' ? 'badge-success' : 'badge-neutral'}`}>
                {request.status}
              </span>
            </div>
            <h2 style={{ fontSize: '1.1875rem', color: 'var(--text-primary)' }}>
              {request.flight?.to || 'Airport'} → {request.hotel?.name || 'Hotel'} ({request.hotel?.area})
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>{request.total_passengers} Passengers</span>
            <span>·</span>
            <span>{request.large_bags}L + {request.small_bags}S bags</span>
            <span>·</span>
            <span>Pickup: {request.pickup.replace('T', ' ')}</span>
            <span>·</span>
            <span className="tabular-nums">
              Target: <strong style={{ color: 'var(--text-primary)' }}>₹{request.price_inr.toLocaleString('en-IN')}</strong>
            </span>
          </div>
        </div>
      </div>

      {ruleError && (
        <RuleBanner
          ruleViolated={ruleError.ruleViolated}
          message={ruleError.message}
          onDismiss={() => setRuleError(null)}
        />
      )}

      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
          Supplier Bids ({offers.length})
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Car Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="filter_car" style={{ margin: 0, fontSize: '0.75rem' }}>Type:</label>
            <select
              id="filter_car"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: 'auto', minHeight: '32px', padding: '4px 28px 4px 8px', fontSize: '0.8125rem' }}
            >
              <option value="ALL">All Types</option>
              <option value="HATCHBACK">Hatchback</option>
              <option value="SEDAN">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="BUS">Bus</option>
            </select>
          </div>

          {/* Price Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="sort_price" style={{ margin: 0, fontSize: '0.75rem' }}>Sort:</label>
            <select
              id="sort_price"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ width: 'auto', minHeight: '32px', padding: '4px 28px 4px 8px', fontSize: '0.8125rem' }}
            >
              <option value="">Default</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case 1: Ineligible (Rule R4) */}
      {cannotBeServed && (
        <div className="card" style={{ borderColor: 'var(--warning-border)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>
            No Eligible Fleets Available (Rule R4)
          </h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
            None of our verified taxi suppliers can serve this request under territory, operating hours, or vehicle capacity rules:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {request.supplier_matching?.ineligible_reasons.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  backgroundColor: 'var(--surface-2)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                }}
              >
                <span className="badge badge-warning">{item.rule}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{item.name}:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case 2: Waiting */}
      {offers.length === 0 && !cannotBeServed && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <h3 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-2)' }}>
            Waiting for Fleet Offers
          </h3>
          <p style={{ maxWidth: '440px', margin: '0 auto var(--space-6)', fontSize: '0.875rem' }}>
            Your request is open to {request.supplier_matching?.eligible_supplier_count || 'licensed'} taxi fleets. Incoming bids will appear here automatically.
          </p>
          <button className="btn-secondary" onClick={() => fetchRequestDetails()}>
            Refresh Offers
          </button>
        </div>
      )}

      {/* Case 3: Offers Grid */}
      {offers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))', gap: 'var(--space-4)' }}>
          {offers.map((offer) => {
            const isBooked = offer.status === 'BOOKED';
            const isRejected = offer.status === 'REJECTED';
            const isNotChosen = offer.status === 'NOT_CHOSEN';
            const isExpired = offer.status === 'EXPIRED';
            const isInactive = isBooked || isRejected || isNotChosen || isExpired;

            return (
              <div
                key={offer.offer_id}
                className="card"
                style={{
                  opacity: isInactive && !isBooked ? 0.6 : 1,
                  borderColor: isBooked ? 'var(--success)' : 'var(--border-subtle)',
                  backgroundColor: isBooked ? 'var(--surface-2)' : 'var(--surface-1)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1px' }}>
                        {offer.company_name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        <Star size={11} fill="var(--warning)" color="var(--warning)" />
                        <span className="tabular-nums">{offer.company_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div>
                      {isBooked ? (
                        <span className="badge badge-success">Booked</span>
                      ) : isRejected ? (
                        <span className="badge badge-error">Rejected</span>
                      ) : isNotChosen ? (
                        <span className="badge badge-neutral">Not Chosen</span>
                      ) : isExpired ? (
                        <span className="badge badge-neutral">Expired</span>
                      ) : (
                        <span className="badge badge-info">Open Offer</span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Specs */}
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: 'var(--space-3) 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {offer.vehicle_type} · ID {offer.vehicle_id}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {offer.seats} seats · {offer.large_bags} large + {offer.small_bags} small bags
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Offered Price</div>
                    <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{offer.price_inr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {!isInactive && (
                    <>
                      <button
                        className="btn-danger"
                        onClick={() => handleReject(offer.offer_id)}
                        style={{ flex: 1, minHeight: '36px' }}
                      >
                        Reject
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => setBookingOffer(offer)}
                        style={{ flex: 2, minHeight: '36px' }}
                      >
                        <span>Book Taxi</span>
                        <ArrowRight size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Focused Confirmation Dialog */}
      {bookingOffer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '420px',
              width: '100%',
              backgroundColor: 'var(--surface-1)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Confirm Taxi Booking</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Confirm reservation with <strong>{bookingOffer.company_name}</strong> ({bookingOffer.vehicle_type}) for ₹{bookingOffer.price_inr.toLocaleString('en-IN')}.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                className="btn-secondary"
                onClick={() => setBookingOffer(null)}
                disabled={isBooking}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmBook}
                disabled={isBooking}
              >
                {isBooking ? 'Confirming...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
