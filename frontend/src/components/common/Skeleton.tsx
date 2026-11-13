import React from 'react';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = '20px',
  width = '100%',
  borderRadius = 'var(--radius-md)',
  style,
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'var(--surface-2)',
        opacity: 0.7,
        animation: 'skeletonPulse 1.8s ease-in-out infinite',
        ...style,
      }}
    />
  );
};
