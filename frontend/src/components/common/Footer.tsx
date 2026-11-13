import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-base)',
        padding: 'var(--space-6) var(--space-6)',
        marginTop: 'var(--space-12)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          fontSize: '0.8125rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span>Deterministic Rule Engine (R1–R9)</span>
          <span>•</span>
          <span>Airport Local Time</span>
          <span>•</span>
          <span>Route-Bounded INR Pricing</span>
        </div>

        <div>
          <span>Airport Taxi Offers Platform</span>
        </div>
      </div>
    </footer>
  );
};
