import React from 'react';
import { LucideIcon, SearchCode } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = SearchCode,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <Card
      padding="lg"
      className={`text-center space-y-5 ${className}`}
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <Button
            onClick={onAction}
            variant="primary"
            size="md"
          >
            {actionText}
          </Button>
        </div>
      )}
    </Card>
  );
};

