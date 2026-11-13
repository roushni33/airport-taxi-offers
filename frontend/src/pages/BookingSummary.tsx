import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiService } from '../services/apiService';
import { BookingSummary as IBookingSummary } from '../types';
import { Check, Copy, Search, ArrowRight } from 'lucide-react';

export const BookingSummary: React.FC = () => {
  const { bookingNumber: routeBookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();

  const [searchNumber, setSearchNumber] = useState(routeBookingNumber || '');
  const [booking, setBooking] = useState<IBookingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBooking = async (num: string) => {
    if (!num || num.trim() === '') return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await ApiService.getBooking(num.trim());
      if (res.data) {
        setBooking(res.data);
      } else {
        setBooking(null);
        setNotFound(true);
      }
    } catch {
      setBooking(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeBookingNumber) {
      setSearchNumber(routeBookingNumber);
      fetchBooking(routeBookingNumber);
    }
  }, [routeBookingNumber]);

  const handleCopy = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.booking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchNumber.trim()) {
      navigate(`/traveler/booking/${searchNumber.trim()}`);
    }
  };

  const latestChange = booking?.change_requests && booking.change_requests.length > 0
    ? booking.change_requests[booking.change_requests.length - 1]
    : null;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      {/* Search Header Bar */}
      <div
        className="card"
        style={{
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '1px' }}>Booking Lookup</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>
            Enter your 10-digit confirmation number to retrieve your reservation.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            placeholder="10-digit code"
            maxLength={10}
            style={{ width: '150px', minHeight: '34px', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}
          />
          <button type="submit" className="btn-secondary" style={{ minHeight: '34px', padding: '6px 12px', fontSize: '0.8125rem' }}>
            <Search size={13} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <p style={{ fontSize: '0.875rem' }}>Retrieving booking record...</p>
        </div>
      )}

      {notFound && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <h3 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-2)' }}>Booking Not Found</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
            No reservation found with reference <code style={{ fontFamily: 'var(--font-mono)' }}>{searchNumber}</code>.
          </p>
          <button className="btn-secondary" onClick={() => navigate('/traveler/request')}>
            Create New Request
          </button>
        </div>
      )}

      {booking && !loading && (
        <div>
          {/* Confirmed Banner */}
          <div
            className="card"
            style={{
              marginBottom: 'var(--space-5)',
              padding: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
              borderLeft: '3px solid var(--success)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span className="badge badge-success">Confirmed</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  Reserved {booking.booked_at ? booking.booked_at.slice(0, 10) : ''}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem' }}>Airport Taxi Confirmed</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Lead passenger: <strong>{booking.traveler_name}</strong>
              </p>
            </div>

            {/* Reference Number Box */}
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Booking Reference
                </div>
                <div
                  className="booking-number tabular-nums"
                  aria-label={`Booking number ${booking.booking_number.split('').join(' ')}`}
                  style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                >
                  {booking.booking_number}
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopy}
                style={{ padding: '6px 8px', minHeight: 'auto' }}
                title="Copy reference number"
                aria-label="Copy booking reference"
              >
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span style={{ fontSize: '0.75rem' }}>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Change Request Notice */}
          {latestChange && (
            <div
              className="card"
              style={{
                marginBottom: 'var(--space-5)',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span
                  className={`badge ${
                    latestChange.status === 'ACCEPTED'
                      ? 'badge-success'
                      : latestChange.status === 'REJECTED'
                      ? 'badge-error'
                      : 'badge-warning'
                  }`}
                >
                  Change {latestChange.status}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  ID: {latestChange.change_id}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                {latestChange.status === 'WAITING'
                  ? 'Your requested schedule modification has been submitted to the supplier for vehicle availability check.'
                  : latestChange.status === 'ACCEPTED'
                  ? 'The supplier accepted your change. Ride details below reflect the updated schedule.'
                  : 'The supplier could not accommodate this schedule change. Original reservation remains confirmed.'}
              </p>
            </div>
          )}

          {/* Transfer Details Card */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
              Ride Transfer Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Flight & Arrival</label>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.flight.flight_number || booking.flight.flight_id} ({booking.flight.from} → {booking.flight.to})
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Lands: {booking.flight.arrival_local.replace('T', ' ')}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Destination Hotel</label>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.hotel.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {booking.hotel.area}, {booking.hotel.city}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Scheduled Pickup</label>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.pickup.replace('T', ' ')}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Drive time: ~{booking.drive_minutes} mins
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Assigned Taxi</label>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {booking.supplier.name} · {booking.car.type}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Vehicle ID: {booking.car.vehicle_id}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Confirmed Total</label>
                <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{booking.price_inr.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <Link
              to={`/traveler/change-request/${booking.booking_number}`}
              className="btn-secondary"
            >
              <span>Modify Flight or Pickup Time</span>
              <ArrowRight size={13} />
            </Link>

            <button
              className="btn-ghost"
              onClick={() => navigate('/traveler/request')}
              style={{ fontSize: '0.8125rem' }}
            >
              Post Another Ride
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
