import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  padding = 'md',
  id,
  onClick,
}) => {
  const paddingStyle =
    padding === 'none'
      ? ''
      : padding === 'sm'
        ? 'p-4'
        : padding === 'lg'
          ? 'p-6 sm:p-8'
          : 'p-5 sm:p-6';

  const interactiveStyle = interactive
    ? 'card-surface-interactive cursor-pointer hover:border-slate-300 hover:shadow-sm'
    : '';

  return (
    <div
      id={id}
      onClick={onClick}
      className={`card-surface ${paddingStyle} ${interactiveStyle} ${className}`}
    >
      {children}
    </div>
  );
};
