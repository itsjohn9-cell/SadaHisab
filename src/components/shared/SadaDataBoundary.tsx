import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Inbox, Plus } from 'lucide-react';

interface ErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class InternalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SadaDataBoundary caught an unhandled render error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-destructive/30 bg-destructive/5 text-foreground max-w-lg mx-auto my-6">
          <div className="p-3 bg-destructive/10 text-destructive rounded-full mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-destructive">Something went wrong</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4 font-mono break-words">
            {this.state.error.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition active:scale-95 shadow-sm min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface SadaDataBoundaryProps {
  isLoading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingSkeleton?: ReactNode;
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SadaDataBoundary: React.FC<SadaDataBoundaryProps> = ({
  isLoading = false,
  error = null,
  isEmpty = false,
  onRetry,
  loadingSkeleton,
  skeletonCount = 3,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no items recorded yet in this workspace.',
  emptyActionLabel,
  onEmptyAction,
  emptyIcon,
  children,
  className = '',
}) => {
  if (isLoading) {
    if (loadingSkeleton) {
      return <div className={`animate-pulse ${className}`}>{loadingSkeleton}</div>;
    }
    return (
      <div className={`space-y-3 w-full py-2 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm animate-pulse flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3.5 bg-muted rounded w-16" />
            </div>
            <div className="h-3 bg-muted/60 rounded w-2/3" />
            <div className="flex gap-2 pt-1">
              <div className="h-2.5 bg-muted/40 rounded w-12" />
              <div className="h-2.5 bg-muted/40 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-destructive/20 bg-destructive/5 max-w-md mx-auto my-6 ${className}`}>
        <div className="p-3 bg-destructive/10 text-destructive rounded-full mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Failed to load content</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-4">
          {errorMsg || 'A network or local database error occurred.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition active:scale-95 shadow-sm min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border bg-card/40 my-6 max-w-md mx-auto ${className}`}>
        <div className="p-3.5 bg-muted rounded-full text-muted-foreground mb-3.5">
          {emptyIcon || <Inbox className="w-8 h-8 opacity-75" />}
        </div>
        <h3 className="text-base font-semibold text-foreground tracking-tight">{emptyTitle}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-5 leading-relaxed">
          {emptyDescription}
        </p>
        {emptyActionLabel && onEmptyAction && (
          <button
            onClick={onEmptyAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition active:scale-95 shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <InternalErrorBoundary onReset={onRetry}>
      <div className={className}>{children}</div>
    </InternalErrorBoundary>
  );
};

