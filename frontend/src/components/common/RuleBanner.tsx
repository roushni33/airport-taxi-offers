import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface RuleBannerProps {
  ruleViolated: string | null;
  message: string;
  details?: any;
  onDismiss?: () => void;
}

export const RuleBanner: React.FC<RuleBannerProps> = ({
  ruleViolated,
  message,
  onDismiss,
}) => {
  if (!message) return null;

  const ruleNames: Record<string, string> = {
    R1: 'R1 · Catalog & Route',
    R2: 'R2 · Pickup Time',
    R3: 'R3 · Price Range',
    R4: 'R4 · Supplier Eligibility',
    R5: 'R5 · Vehicle Capacity',
    R6: 'R6 · Schedule Availability',
    R7: 'R7 · Assignment',
    R8: 'R8 · Booking Mutual Exclusion',
    R9: 'R9 · Flight Change Validation',
  };

  const badgeText = ruleViolated ? (ruleNames[ruleViolated] || `Rule ${ruleViolated}`) : 'Rule Refusal';

  return (
    <div
      role="alert"
      style={{
        backgroundColor: 'var(--error-bg)',
        border: '1px solid var(--error-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
      }}
    >
      <div style={{ color: 'var(--error)', marginTop: '2px', flexShrink: 0 }}>
        <AlertCircle size={16} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '3px' }}>
          <span className="badge badge-error">
            {badgeText}
          </span>
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.45 }}>
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="btn-ghost"
          style={{
            padding: '2px',
            minHeight: 'auto',
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}
          aria-label="Dismiss message"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
