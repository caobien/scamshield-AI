import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  let variantStyle = 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs';

  if (variant === 'secondary') {
    variantStyle = 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs';
  } else if (variant === 'outline') {
    variantStyle =
      'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs';
  } else if (variant === 'ghost') {
    variantStyle = 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  } else if (variant === 'danger') {
    variantStyle = 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs';
  }

  const sizeStyle =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] gap-1.5'
      : size === 'lg'
        ? 'px-6 py-3 text-base font-bold rounded-xl min-h-[48px] gap-2.5'
        : 'px-4 py-2.5 text-sm font-bold rounded-xl min-h-[44px] gap-2';

  const widthStyle = fullWidth ? 'w-full justify-center' : 'inline-flex justify-center';
  const disabledStyle = disabled || isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

  return (
    <button
      disabled={disabled || isLoading}
      className={`items-center font-sans tracking-tight transition-all focus-ring ${variantStyle} ${sizeStyle} ${widthStyle} ${disabledStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
