import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, RotateCcw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Hooshyar ErrorBoundary captured an error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    try {
      window.location.href = '/';
    } catch {
      this.handleResetState();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7F4EC] text-[#1C2523] select-none"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D9DED9] text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-[#123C35] mb-2">
              متأسفانه خطایی در اجرای برنامه رخ داد
            </h1>
            
            <p className="text-sm text-[#59635F] leading-relaxed mb-6">
              نگران اطلاعات خود نباشید، تمام داده‌های شما محفوظ هستند. می‌توانید با دکمه‌های زیر صفحه را بارگذاری مجدد کنید یا به صفحه اصلی بازگردید.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-[#123C35] hover:bg-[#0C2E29] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد برنامه</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                className="w-full py-3 px-4 bg-[#E9E5DA] hover:bg-[#D9DED9] text-[#1C2523] font-medium rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4 text-[#59635F]" />
                <span>تلاش دوباره برای بازگشت</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full py-2.5 px-4 text-[#59635F] hover:text-[#123C35] text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>صفحه اصلی هوشیار</span>
              </button>
            </div>

            {(import.meta.env?.DEV || false) && this.state.error && (
              <div className="mt-6 w-full text-left bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs font-mono overflow-auto max-h-32 text-stone-700 dir-ltr">
                <p className="font-bold text-red-600 mb-1">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
