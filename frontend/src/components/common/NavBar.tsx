import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { ApiService } from '../../services/apiService';
import { Car, RefreshCw, ArrowRightLeft } from 'lucide-react';

export const NavBar: React.FC = () => {
  const { role, company, clearSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSwitchRole = () => {
    clearSession();
    navigate('/');
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await ApiService.resetDemo();
      setResetMessage('Demo data restored to initial state.');
      setTimeout(() => setResetMessage(null), 3000);
      setShowResetConfirm(false);
      if (location.pathname === '/') {
        window.location.reload();
      } else {
        navigate('/');
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: '56px',
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            textDecoration: 'none',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--action)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Car size={16} strokeWidth={2} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Airport Taxi
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                padding: '1px 5px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                fontWeight: 500,
              }}
            >
              Offers
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Reset Demo button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn-ghost"
            style={{ minHeight: '32px', padding: '6px 10px', fontSize: '0.8125rem' }}
            title="Reset data back to seed state"
          >
            <RefreshCw size={12} className={isResetting ? 'spin' : ''} />
            <span>Reset Demo</span>
          </button>

          {/* Current Role Indicator */}
          {role ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {role === 'TRAVELER' ? 'Traveler' : (company?.name || 'Supplier')}
              </span>
              <button
                onClick={handleSwitchRole}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  padding: '2px 4px',
                  cursor: 'pointer',
                  minHeight: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Switch active role"
                aria-label="Switch active role"
              >
                <ArrowRightLeft size={11} />
                <span style={{ fontSize: '0.75rem' }}>Switch</span>
              </button>
            </div>
          ) : (
            <Link
              to="/"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '4px 8px',
              }}
            >
              Select Role
            </Link>
          )}
        </div>
      </nav>

      {/* Demo Reset Notice */}
      {resetMessage && (
        <div
          style={{
            backgroundColor: 'var(--success-bg)',
            borderBottom: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '6px var(--space-6)',
            textAlign: 'center',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
        >
          {resetMessage}
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
              maxWidth: '400px',
              width: '100%',
              backgroundColor: 'var(--surface-1)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Reset Demo Data?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              This restores all requests, booked rides, and vehicle schedules to their clean seed state. Any simulated bookings created during this session will be cleared.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleResetDemo}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
