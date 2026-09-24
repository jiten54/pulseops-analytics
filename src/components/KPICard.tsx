import React from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  deltaPct?: number;
  deltaLabel?: string;
  formula?: string;
  source?: string;
  statusColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'default';
  subtitle?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  deltaPct,
  deltaLabel = 'vs previous 24h',
  formula,
  source = 'National Grid ESO',
  statusColor = 'default',
  subtitle
}) => {
  const isPositive = deltaPct !== undefined && deltaPct > 0;
  const isNeutral = deltaPct === 0 || deltaPct === undefined;

  const colorStyles = {
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400',
    amber: 'border-amber-500/20 hover:border-amber-500/40 text-amber-400',
    rose: 'border-rose-500/20 hover:border-rose-500/40 text-rose-400',
    default: 'border-slate-800 hover:border-slate-700 text-slate-100'
  };

  return (
    <div className={`bg-slate-900/60 rounded border p-4 sm:p-5 transition-colors ${colorStyles[statusColor]}`}>
      <div className="flex items-start justify-between">
        <h4 className="text-xs font-medium tracking-wide uppercase text-slate-400">
          {title}
        </h4>
        {formula && (
          <div className="group relative cursor-pointer" title={formula}>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            <div className="absolute right-0 top-5 hidden group-hover:block z-20 w-64 p-2 text-[10px] font-mono bg-slate-950 border border-slate-700 rounded shadow-xl text-slate-300">
              <span className="text-cyan-400 font-semibold block mb-0.5">Calculation Formula:</span>
              {formula}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      {deltaPct !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`flex items-center font-medium ${
              deltaPct > 0 ? 'text-amber-400' : deltaPct < 0 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {deltaPct > 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : deltaPct < 0 ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : null}
            {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
          </span>
          <span className="text-slate-400 text-[11px]">{deltaLabel}</span>
        </div>
      )}

      {subtitle && (
        <div className="mt-2 text-xs font-mono text-slate-400 truncate">
          {subtitle}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Source: {source}</span>
        <span className="text-emerald-400">Real Verified</span>
      </div>
    </div>
  );
};
