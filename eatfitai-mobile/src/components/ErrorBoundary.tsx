import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import ErrorState from './ErrorState';
import { useAppTheme } from '../theme/ThemeProvider';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          title="Ứng dụng gặp lỗi"
          description="Đã xảy ra lỗi không mong muốn. Vui lòng khởi động lại ứng dụng."
          onRetry={() => {
            this.setState({ hasError: false, error: undefined });
          }}
        />
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;
