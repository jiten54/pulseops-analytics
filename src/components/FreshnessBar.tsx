import React from 'react';
import { Clock, ShieldCheck, CheckCircle2, Activity } from 'lucide-react';

interface FreshnessBarProps {
  lastUpdated: string;
  totalRecords: number;
  dataQualityScore: number;
  sourceName?: string;
  updateFrequency?: string;
  onNavigateToHealth?: () => void;
}

export const FreshnessBar: React.FC<FreshnessBarProps> = ({
  lastUpdated,
  totalRecords,
  dataQualityScore,
  sourceName = 'UK National Grid ESO & Copernicus CAMS',
  updateFrequency = 'Updated Half-Hourly',
  onNavigateToHealth
}) => {
  const formattedDate =
    lastUpdated && lastUpdated !== 'N/A'
      ? new Date(lastUpdated).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      : 'Synchronizing...';

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 text-xs py-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 text-slate-300">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Last Synchronized:</span>
            <strong className="text-slate-200 font-semibold">{formattedDate}</strong>
          </span>

          <span className="text-slate-600">·</span>

          <span className="text-slate-400">
            Frequency: <span className="text-slate-300">{updateFrequency}</span>
          </span>

          <span className="text-slate-600">·</span>

          <span className="text-slate-400">
            Verified Records: <strong className="text-slate-200">{totalRecords.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            Source: <span className="text-slate-300">{sourceName}</span>
          </span>

          <span className="text-slate-600">·</span>

          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">DQ Score:</span>
            <strong className="text-emerald-400 font-semibold">{dataQualityScore}%</strong>
          </span>

          <span className="text-slate-600">·</span>

          <button
            onClick={onNavigateToHealth}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30"
            title="Inspect External API Status Codes & Latency Metrics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>APIs: Optimal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
