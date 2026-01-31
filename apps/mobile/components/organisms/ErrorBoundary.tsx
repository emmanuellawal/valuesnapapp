import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box } from '@/components/primitives/box';
import { Stack } from '@/components/primitives/stack';
import { Text } from '@/components/primitives/text';
import { SwissPressable } from '@/components/primitives/swiss-pressable';

/**
 * ErrorBoundaryProps interface for the error boundary component.
 */
export interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to render when an error occurs */
  fallback?: ReactNode;
}

/**
 * ErrorBoundaryState interface for tracking error state.
 */
export interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object, if any */
  error: Error | null;
  /** Key that increments on retry to force children remount */
  retryKey: number;
}

/**
 * ErrorBoundary - Global error boundary with Swiss Minimalist design.
 *
 * Catches unhandled errors in the component tree and displays a user-friendly
 * error screen with a "Try Again" button. Implements React error boundary patterns
 * using getDerivedStateFromError and componentDidCatch lifecycle methods.
 *
 * Features:
 * - Catches unhandled React errors in child component tree
 * - Displays Swiss Minimalist styled error screen
 * - "Try Again" button with retryKey for proper component remount
 * - Error logging for debugging (never exposes stack traces to users)
 * - Supports custom fallback UI
 *
 * @example
 * ```tsx
 * // Basic usage at root layout
 * <ErrorBoundary>
 *   <Stack>...</Stack>
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorScreen />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * @see Story 0.8: Set Up Global Error Boundary
 * @see docs/SWISS-MINIMALIST.md - Design guidelines
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryKey: 0,
    };
  }

  /**
   * Update state when an error is caught.
   * Called during "render" phase, so no side effects allowed.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error information for debugging.
   * Called during "commit" phase, so side effects are allowed.
   *
   * Always logs to console for debugging purposes.
   * In production, stack traces are NOT exposed to users.
   *
   * TODO: Integrate with Sentry for production error tracking
   * Future: sentry.captureException(error, { extra: { componentStack, retryKey } });
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Always log to console for debugging (development and production)
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Log retry context for debugging persistent errors
    if (this.state.retryKey > 0) {
      console.error(`Error occurred after ${this.state.retryKey} retry attempt(s)`);
    }
  }

  /**
   * Handle retry button press.
   * Resets error state and increments retryKey to force children remount.
   *
   * The retryKey pattern ensures React fully remounts children with fresh state,
   * preventing stale component trees from causing the same error immediately.
   * 
   * @public
   * @returns {void}
   */
  handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      retryKey: prevState.retryKey + 1,
    }));
  };

  /**
   * Render error UI or children based on error state.
   */
  render(): ReactNode {
    const { hasError, error, retryKey } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default Swiss Minimalist error screen
      return (
        <Box 
          className="flex-1 bg-paper items-start justify-center px-6 py-8"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Stack direction="vertical" gap={6} className="max-w-sm">
            {/* Error heading */}
            <Text variant="h1" className="text-ink">
              Something went wrong
            </Text>

            {/* User-friendly message */}
            <Text variant="body" className="text-ink-muted">
              The app stopped working. Tap Try Again to restart.
            </Text>

            {/* Try Again button - inverted Swiss style */}
            <SwissPressable
              accessibilityLabel="Try again to reload the app"
              onPress={this.handleRetry}
              className="bg-ink min-h-[44px] min-w-[200px] items-center justify-center px-6 py-3"
            >
              <Text variant="body" className="text-paper font-semibold">
                Try Again
              </Text>
            </SwissPressable>

            {/* Error code - development only */}
            {__DEV__ && error && (
              <Text variant="caption" className="text-ink-muted mt-4">
                Error: {error.name || 'ERR_UNKNOWN'}
                {'\n'}
                {error.message}
              </Text>
            )}
          </Stack>
        </Box>
      );
    }

    // No error - render children with retryKey for remount on retry
    return (
      <React.Fragment key={retryKey}>
        {children}
      </React.Fragment>
    );
  }
}

export default ErrorBoundary;
