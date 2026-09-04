import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (confirm('是否重置界面缓存以恢复系统？您的行程数据已保存在服务器与浏览器存储中。')) {
      try {
        // Clear layout temporary keys without deleting lists
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith('hike_mindmap_mapopen_') ||
            key.startsWith('hike_mindmap_viewport_')
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-4 selection:bg-[#5A5A40] selection:text-white">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-[#E5E1D8] p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FDE8E8] text-[#B33A3A] flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2C2C2C]">
                系统遇到了一点小波折
              </h2>
              <p className="text-xs sm:text-sm text-[#7A7465]">
                应用在加载视图时发生异常。我们已启用安全保护，点击下方按钮即可快速恢复。
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-left max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-[#B33A3A] break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新并重新载入</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#F0EEE8] hover:bg-[#E5E1D8] text-[#5A5A40] font-medium text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>清理临时状态并重试</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
