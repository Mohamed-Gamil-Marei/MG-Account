import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class LocalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LocalErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Parse stack trace for file and line info if possible
      const stackLines = this.state.error?.stack?.split('\n') || [];
      const errorLocation = stackLines[1] ? stackLines[1].trim() : 'Unknown Location';

      return (
        <div className="p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm text-right space-y-4">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black">{this.props.title || 'حدث خطأ في عرض هذا المكوّن'}</h2>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
              {this.state.error?.message || 'خطأ غير معروف'}
            </p>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500 overflow-x-auto ltr">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <FileText className="w-3 h-3" />
                <span>Error Context:</span>
              </div>
              <p className="text-rose-500 dark:text-rose-400 font-bold mb-1">{errorLocation}</p>
              <pre className="opacity-70">{this.state.error?.stack?.split('\n').slice(0, 3).join('\n')}</pre>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تحميل المكوّن 🔄</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              تحديث المنظومة بالكامل
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
