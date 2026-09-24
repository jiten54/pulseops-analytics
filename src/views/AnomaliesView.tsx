import React, { useState } from 'react';
import { AnomalyRecord } from '../types.js';
import { AlertTriangle, Download, Filter, Info, X, Calculator, ShieldAlert } from 'lucide-react';

interface AnomaliesViewProps {
  anomalies: AnomalyRecord[];
  regions: string[];
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({ anomalies, regions }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [activeAnomaly, setActiveAnomaly] = useState<AnomalyRecord | null>(null);

  const filtered = anomalies.filter(a => {
    if (selectedSeverity !== 'ALL' && a.severity !== selectedSeverity) return false;
    if (selectedRegion !== 'ALL' && a.region !== selectedRegion) return false;
    return true;
  });

  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
  const moderateCount = anomalies.filter(a => a.severity === 'MODERATE').length;
  const avgDeviation = anomalies.length > 0
    ? (anomalies.reduce((sum, a) => sum + Math.abs(a.deviation_pct), 0) / anomalies.length).toFixed(1)
    : '0';

  const handleExportCSV = () => {
    window.location.href = '/api/export?type=anomalies';
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Statistical Anomaly Detection Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-model statistical evaluation (Z-Score &gt; 2.0σ and Tukey Interquartile Range Fences)
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Anomalies CSV</span>
          </button>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950 p-3 rounded border border-rose-500/20">
            <span className="text-[10px] font-mono uppercase text-rose-400">Critical Anomalies</span>
            <div className="text-xl font-mono font-bold text-rose-400 mt-1">{criticalCount}</div>
            <span className="text-[10px] text-slate-500 font-mono">|Z| ≥ 3.0σ</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-amber-500/20">
            <span className="text-[10px] font-mono uppercase text-amber-400">High Anomalies</span>
            <div className="text-xl font-mono font-bold text-amber-400 mt-1">{highCount}</div>
            <span className="text-[10px] text-slate-500 font-mono">2.5σ ≤ |Z| &lt; 3.0σ</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-cyan-500/20">
            <span className="text-[10px] font-mono uppercase text-cyan-400">Moderate Outliers</span>
            <div className="text-xl font-mono font-bold text-cyan-400 mt-1">{moderateCount}</div>
            <span className="text-[10px] text-slate-500 font-mono">2.0σ ≤ |Z| &lt; 2.5σ</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400">Mean Abs Deviation</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">±{avgDeviation}%</div>
            <span className="text-[10px] text-slate-500 font-mono">vs Regional Baseline</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter Severity:</span>
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map(sev => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-slate-800 text-white font-semibold border border-slate-600'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400 text-xs">Region:</span>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="bg-slate-950 text-slate-200 px-2.5 py-1 rounded border border-slate-700 text-xs font-mono"
            >
              <option value="ALL">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="bg-slate-900/80 rounded border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Observed Value</th>
                <th className="px-4 py-3">Expected Baseline</th>
                <th className="px-4 py-3">Deviation (%)</th>
                <th className="px-4 py-3">Z-Score</th>
                <th className="px-4 py-3">Detection Method</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No statistical anomalies match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.anomaly_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                      {a.timestamp.replace('T', ' ').replace('Z', '')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-white">
                      {a.region}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-amber-300">
                      {a.observed_value} gCO2/kWh
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {a.expected_baseline} gCO2/kWh
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">
                      <span className={a.deviation_pct > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {a.deviation_pct > 0 ? `+${a.deviation_pct}%` : `${a.deviation_pct}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-cyan-300 font-bold">
                      {a.z_score > 0 ? `+${a.z_score}σ` : `${a.z_score}σ`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-400">
                      {a.detection_method}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        a.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : a.severity === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => setActiveAnomaly(a)}
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomaly Inspection Modal */}
      {activeAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${
                  activeAnomaly.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                }`} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Anomaly Investigation: {activeAnomaly.anomaly_id}
                </h3>
              </div>
              <button
                onClick={() => setActiveAnomaly(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block">Region</span>
                <strong className="text-slate-200 text-sm">{activeAnomaly.region}</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block">Recorded Timestamp</span>
                <strong className="text-slate-200 text-sm">
                  {activeAnomaly.timestamp.replace('T', ' ').replace('Z', '')}
                </strong>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block">Observed Metric Value</span>
                <strong className="text-amber-300 text-base">{activeAnomaly.observed_value} gCO2/kWh</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block">Expected Regional Baseline</span>
                <strong className="text-slate-300 text-base">{activeAnomaly.expected_baseline} gCO2/kWh</strong>
              </div>
            </div>

            {/* Mathematical Rule Breakdown */}
            <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-mono">
                <Calculator className="w-4 h-4" />
                <span>Statistical Rule Formulation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {activeAnomaly.rule_explanation}
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-400 grid grid-cols-2 gap-2 border-t border-slate-800/80">
                <div>Standard Score: <span className="text-cyan-300 font-bold">{activeAnomaly.z_score}σ</span></div>
                <div>IQR Distance: <span className="text-cyan-300 font-bold">{activeAnomaly.iqr_distance} g</span></div>
                <div>Relative Shift: <span className="text-amber-300 font-bold">{activeAnomaly.deviation_pct}%</span></div>
                <div>Detection Architecture: <span className="text-slate-200 font-bold">{activeAnomaly.detection_method}</span></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveAnomaly(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
