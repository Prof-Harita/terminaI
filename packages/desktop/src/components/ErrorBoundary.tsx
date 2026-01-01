/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 h-screen w-screen overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Something went wrong 😭</h1>
          <p className="font-mono bg-red-100 p-4 rounded text-sm whitespace-pre-wrap">
            {this.state.error?.toString()}
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold mb-2">
              Component Stack
            </summary>
            <pre className="text-xs font-mono bg-white p-4 border rounded overflow-auto">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
