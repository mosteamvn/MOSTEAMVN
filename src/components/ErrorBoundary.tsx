import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-4 m-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Đã xảy ra lỗi hệ thống</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {this.state.error?.message || 'Không thể hiển thị tính năng này.'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-sm transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
