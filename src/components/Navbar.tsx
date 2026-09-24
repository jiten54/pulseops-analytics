import React from 'react';
import { Activity, Database, AlertTriangle, ShieldCheck, Terminal, Lightbulb, BookOpen, Layers, RefreshCw, Server } from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'system-health'
  | 'explorer'
  | 'anomalies'
  | 'data-quality'
  | 'sql-lab'
  | 'insights'
  | 'sources'
  | 'methodology';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isSyncing: boolean;
  onSync: () => void;
  sourceStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isSyncing,
  onSync,
  sourceStatus
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; isNew?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'system-health', label: 'System Health', icon: <Server className="w-4 h-4" />, isNew: true },
    { id: 'explorer', label: 'Explorer', icon: <Database className="w-4 h-4" /> },
    { id: 'anomalies', label: 'Anomalies', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'data-quality', label: 'Data Quality', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'sql-lab', label: 'SQL Lab', icon: <Terminal className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights & Root Cause', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'sources', label: 'Data Sources', icon: <Layers className="w-4 h-4" /> },
    { id: 'methodology', label: 'Methodology', icon: <BookOpen className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-white">
                  PULSE<span className="text-cyan-400">OPS</span>
                </span>
                <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 border-l border-slate-700 pl-2">
                  OPERATIONS INTELLIGENCE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Verified Public Telemetry &amp; Analytics Platform
              </p>
            </div>
          </div>

          {/* Sync Trigger & Status */}
          <div className="flex items-center gap-3">
            {/* Clickable System Health Status Pill */}
            <button
              onClick={() => onTabChange('system-health')}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              title="Click to open System Health & API Observability dashboard"
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  sourceStatus === 'OPERATIONAL'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline text-[11px] text-slate-400">APIs:</span>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase">
                {sourceStatus}
              </span>
            </button>

            {/* Ingestion Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/20"
              title="Trigger immediate re-fetch from official APIs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none text-xs font-mono">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded font-medium whitespace-nowrap transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-slate-800/90 text-cyan-400 border border-slate-700 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.isNew && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    SLA
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
