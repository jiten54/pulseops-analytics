import React, { useState } from 'react';
import { KPISummary, TrendPoint, RegionComparison, AnomalyRecord, PipelineRun } from '../types.js';
import { KPICard } from '../components/KPICard.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { AlertTriangle, ArrowRight, ShieldCheck, Zap, Wind, Flame, CheckCircle, BarChart3, Database, Server, Activity } from 'lucide-react';
import { NavTab } from '../components/Navbar.js';

interface OverviewViewProps {
  summary: KPISummary;
  trend: TrendPoint[];
  comparison: RegionComparison[];
  anomalies: AnomalyRecord[];
  recentRuns: PipelineRun[];
  onNavigate: (tab: NavTab) => void;
  selectedRegion: string;
  onSelectRegion: (reg: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  summary,
  trend,
  comparison,
  anomalies,
  recentRuns,
  onNavigate,
  selectedRegion,
  onSelectRegion
}) => {
  const [metricMode, setMetricMode] = useState<'intensity' | 'mix'>('intensity');
  const severeAnomalies = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
  const latestRun = recentRuns[0];

  return (
    <div className="space-y-6">
      {/* Active Anomaly Banner */}
      {severeAnomalies.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-amber-300">
                  {severeAnomalies.length} High-Severity Operational Anomalies Detected
                </span>
                <span className="text-[11px] text-amber-400/80">· Statistical Z-Score &gt; 2.5</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Significant deviation detected in {severeAnomalies[0].region}: observed {severeAnomalies[0].observed_value} gCO2/kWh vs {severeAnomalies[0].expected_baseline} gCO2/kWh baseline ({severeAnomalies[0].deviation_pct > 0 ? '+' : ''}{severeAnomalies[0].deviation_pct}%).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('anomalies')}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
          >
            <span>Inspect Anomalies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Operational KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Grid Carbon Intensity"
          value={summary.currentIntensity}
          unit={summary.intensityUnit}
          deltaPct={summary.intensityPeriodOverPeriodDeltaPct}
          deltaLabel="24h period delta"
          formula="Weighted average emissions across active generation units: SUM(gen_fuel * factor) / total_gen"
          source="National Grid ESO"
          statusColor="cyan"
        />

        <KPICard
          title="Renewable Generation Share"
          value={summary.currentRenewableShare}
          unit="%"
          deltaPct={summary.renewablePeriodOverPeriodDeltaPct}
          deltaLabel="24h green capacity delta"
          formula="Total generation share from wind, solar, and hydro: generation_wind + solar + hydro"
          source="National Grid ESO"
          statusColor="emerald"
        />

        <KPICard
          title="Natural Gas (CCGT) Reliance"
          value={summary.gasFossilShare}
          unit="%"
          formula="Combined Cycle Gas Turbine generation proportion of active national load"
          source="National Grid ESO"
          statusColor="amber"
          subtitle="Fossil peaker & base generation"
        />

        <KPICard
          title="Day-Ahead Forecast Error"
          value={summary.forecastTrackingError}
          unit="gCO2/kWh"
          formula="Mean Absolute Deviation between Day-Ahead Forecast and Verified Telemetry: |Actual - Forecast|"
          source="National Grid ESO"
          statusColor="default"
          subtitle="MAE Model Tracking Variance"
        />
      </div>

      {/* Secondary Metrics / Operational Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 rounded border border-slate-800 p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Emissions Dispersion</span>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-rose-400 font-mono block">Highest Carbon Region:</span>
              <strong className="text-sm font-semibold text-slate-200">{summary.highestCarbonRegion.name}</strong>
            </div>
            <span className="text-base font-mono font-bold text-rose-400">{summary.highestCarbonRegion.value} g</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-emerald-400 font-mono block">Lowest Carbon Region:</span>
              <strong className="text-sm font-semibold text-slate-200">{summary.lowestCarbonRegion.name}</strong>
            </div>
            <span className="text-base font-mono font-bold text-emerald-400">{summary.lowestCarbonRegion.value} g</span>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded border border-slate-800 p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Statistical Volatility</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-200">{summary.operationalVolatility}</span>
            <span className="text-xs font-mono text-slate-400">σ (Standard Deviation)</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Quantifies dispersion of regional carbon intensity across the 24-hour observation window.
          </p>
        </div>

        <div className="bg-slate-900/60 rounded border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Pipeline Integrity</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Healthy</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">{summary.dataQualityScore}%</span>
            <span className="text-xs font-mono text-slate-400">DQ Composite Score</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {summary.totalCleanRecords.toLocaleString()} verified telemetry records processed across 5 quality pillars.
          </p>
        </div>
      </div>

      {/* Main Interactive Time-Series Chart */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Operational Time-Series Analysis
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous half-hourly grid metrics across past 4 operational days
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Region Selector */}
            <select
              value={selectedRegion}
              onChange={e => onSelectRegion(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs font-mono px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Regions (National Aggregate)</option>
              {comparison.map(c => (
                <option key={c.region} value={c.region}>
                  {c.region}
                </option>
              ))}
            </select>

            {/* Metric Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setMetricMode('intensity')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'intensity' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Intensity & Forecast
              </button>
              <button
                onClick={() => setMetricMode('mix')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'mix' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Renewable vs Gas Mix (%)
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 sm:h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === 'intensity' ? (
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="intensity"
                  name="Actual Intensity (gCO2/kWh)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#intensityGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  name="Day-Ahead Forecast (gCO2/kWh)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#forecastGrad)"
                />
              </AreaChart>
            ) : (
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="renGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="renewableShare"
                  name="Renewable Share (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#renGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="gasShare"
                  name="Gas Generation (%)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#gasGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Comparison Ranking */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Regional Performance & Carbon Ranking
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative average intensity (gCO2/kWh) and clean energy adoption across all 18 UK regions
            </p>
          </div>
          <button
            onClick={() => onNavigate('explorer')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore Raw Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-72 sm:h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparison}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="region"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                width={85}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              />
              <Bar dataKey="avg_intensity" name="Avg Intensity (gCO2/kWh)" fill="#06b6d4" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* External Ingestion API Health & Latency Telemetry */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">External Ingestion API Health:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All Endpoints Green (HTTP 200 OK)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              UK Grid ESO (145ms) · Copernicus CAMS (185ms) · Internal AlaSQL (2ms)
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('system-health')}
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 px-3 py-1.5 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Inspect Status Codes &amp; Latency</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Recent Pipeline Ingestion Audit */}
      {latestRun && (
        <div className="bg-slate-900/60 rounded border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-300 font-semibold">Latest Pipeline Execution: </span>
              <span className="text-slate-400">{latestRun.run_id}</span>
              <span className="text-slate-500"> · Started: {new Date(latestRun.started_at).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Received: <strong className="text-slate-200">{latestRun.records_received}</strong></span>
            <span>Inserted: <strong className="text-emerald-400">{latestRun.records_inserted}</strong></span>
            <span>Rejected: <strong className="text-rose-400">{latestRun.records_rejected}</strong></span>
            <span className="text-emerald-400 font-bold uppercase">{latestRun.status}</span>
          </div>
        </div>
      )}
    </div>
  );
};
