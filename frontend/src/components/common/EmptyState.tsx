import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            color: 'var(--text-tertiary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-1)' }}>{title}</h3>
      <p style={{ maxWidth: '420px', margin: '0 auto var(--space-5)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {description}
      </p>
      {action && (
        <button className="btn-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};
