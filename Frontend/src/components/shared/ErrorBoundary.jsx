import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Generic React error boundary for the page-render area. Class component
// because React only supports error boundaries via componentDidCatch /
// getDerivedStateFromError (no hook equivalent yet).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full p-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-w-md w-full p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-gray-500">
              This page ran into an unexpected error. Your data is safe — try going back to the
              dashboard and re-opening this page.
            </p>
            {this.state.error?.message && (
              <p className="mt-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono break-words text-left">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw size={15} />
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
