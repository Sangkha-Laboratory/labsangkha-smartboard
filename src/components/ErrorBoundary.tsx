import React, { ErrorInfo, ReactNode } from 'react';
import { writeLog } from '../lib/logger';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log the error to Supabase & local storage automatically
    writeLog(
      'CRITICAL',
      'REACT_BOUNDARY',
      error.message || 'React Runtime Crash',
      {
        componentStack: errorInfo.componentStack,
        stack: error.stack || null
      }
    ).catch(e => {
      console.warn('Could not write logging on componentDidCatch:', e);
    });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
            {/* Visual Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle size={32} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  เกิดข้อผิดพลาดในการประมวลผลระบบ
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  ระบบดักจับความเสียหายกลาง (React Error Boundary) ทำงานอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Explanatory notice */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-650 dark:text-slate-350 space-y-3 leading-relaxed">
              <p>
                ขออภัยอย่างสูง หน้าเว็บส่วนนี้เกิดข้อขัดข้องชั่วคราวในการแสดงผลชุดข้อมูล อย่างไรก็ดี <strong>ระบบได้บันทึกประวัติความเสียหายดังกล่าวขึ้นฐานข้อมูล (Activity Logs) แบบปกป้องข้อมูลผู้ป่วย</strong> เรียบร้อยแล้ว ทีมงานวิศวกรและผู้ดูแลระบบจะรีบตรวจสอบข้อบกพร่องดังกล่าวโดยเร็วที่สุด
              </p>
              <div className="p-3 bg-red-50/40 dark:bg-red-950/5 border-l-3 border-red-500 rounded font-mono text-xs overflow-auto max-h-48 text-red-900 dark:text-red-400 text-left">
                <strong>Error:</strong> {this.state.error?.toString() || 'Unknown React Error'}
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-[10px] text-slate-500 overflow-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium"
              >
                <Home size={16} />
                กลับหน้าหลัก
              </button>
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold"
              >
                <RotateCcw size={16} />
                รีเฟรชหน้าเว็บอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
