import React, { Component, ReactNode } from 'react';
import ErrorScreen from './ui/ErrorScreen';
import { t } from '../i18n/vi';
import { captureError } from '../services/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onRetry?: (error?: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  recoveryKey: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, recoveryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  private handleRetry = () => {
    const { error } = this.state;

    this.props.onRetry?.(error);
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      recoveryKey: prevState.recoveryKey + 1,
    }));
  };

  componentDidCatch(error: Error, errorInfo: any) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    captureError(error, 'ErrorBoundary', {
      componentStack:
        typeof errorInfo?.componentStack === 'string'
          ? errorInfo.componentStack
          : undefined,
    });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorScreen
          type="generic"
          title={t('common.appError')}
          message={t('common.appErrorDescription')}
          onRetry={this.handleRetry}
        />
      );
    }

    return (
      <React.Fragment key={this.state.recoveryKey}>{this.props.children}</React.Fragment>
    );
  }
}

export const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;
