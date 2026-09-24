import React, { useState, useEffect } from 'react';
import { SystemHealthReport, EndpointMetric, HealthGrade } from '../types.js';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Database,
  ArrowUpRight,
  Clock,
  Zap
} from 'lucide-react';

interface SystemHealthDashboardProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({
  onClose,
  isModal = false
}) => {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [probing, setProbing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointMetric | null>(null);

  const fetchHealthReport = async () => {
    try {
      const res = await fetch('/api/system-health');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        }
      }
    } catch (e) {
      console.error('Failed to load system health report:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleProbeNow = async () => {
    setProbing(true);
    try {
      const res = await fetch('/api/system-health/ping', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        }
      }
    } catch (e) {
      console.error('Probe execution failed:', e);
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, []);

  // Periodic polling every 20 seconds when autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealthReport();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getGradeBadge = (grade: HealthGrade) => {
    switch (grade) {
      case 'GREEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            OPTIMAL (GREEN)
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            DEGRADED (YELLOW)
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            CRITICAL / OUTAGE (RED)
          </span>
        );
    }
  };

  const getStatusCodeBadge = (code: number, text: string) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
          HTTP {code} {text}
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
          HTTP {code} {text}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 font-mono font-bold text-xs border border-rose-500/40">
        {code === 0 ? 'CONNECTION FAILED' : `HTTP ${code} ${text}`}
      </span>
    );
  };

  const getLatencyColor = (latencyMs: number, grade: HealthGrade) => {
    if (grade === 'RED' || latencyMs > 2000) return 'text-rose-400';
    if (grade === 'YELLOW' || latencyMs >= 800) return 'text-amber-400';
    return 'text-emerald-400';
  };

  if (loading && !report) {
    return (
      <div className="bg-slate-900/90 rounded border border-slate-800 p-12 text-center text-slate-400 font-mono text-xs">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Probing external ingestion endpoints & measuring live latency...</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className={`space-y-6 ${isModal ? 'max-h-[85vh] overflow-y-auto pr-1' : ''}`}>
      {/* Top Health Overview Card */}
      <div className="bg-slate-900/90 rounded border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded flex items-center justify-center ${
              report.overallGrade === 'GREEN'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : report.overallGrade === 'YELLOW'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  System Health & Ingestion Telemetry Observability
                </h2>
                {getGradeBadge(report.overallGrade)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time HTTP status codes, latency telemetry, and SLA compliance across all data ingestion pipelines
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs font-mono px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
                autoRefresh
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
              title="Toggle automatic 20s health probe polling"
            >
              Auto-Poll {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleProbeNow}
              disabled={probing}
              className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
              <span>{probing ? 'Probing...' : 'Probe Live Now'}</span>
            </button>
          </div>
        </div>

        {/* Global SLA and Performance Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Average Endpoint Latency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className={`text-xl font-bold ${getLatencyColor(report.summary.avgSystemLatencyMs, report.overallGrade)}`}>
                {report.summary.avgSystemLatencyMs}
              </strong>
              <span className="text-slate-500 text-xs">ms</span>
            </div>
            <span className="text-[10px] text-slate-500">Target SLA: &lt;800ms</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Cumulative Ingestion Uptime</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-xl font-bold text-emerald-400">
                {report.summary.systemUptimePct}%
              </strong>
            </div>
            <span className="text-[10px] text-emerald-500/80">Continuous Health SLA</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Healthy Services</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-xl font-bold text-slate-200">
                {report.summary.healthyCount}
              </strong>
              <span className="text-slate-500 text-xs">/ {report.summary.totalEndpoints}</span>
            </div>
            <span className="text-[10px] text-slate-500">Green Status Tier</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Degraded / Unresponsive</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className={`text-xl font-bold ${
                report.summary.downCount > 0
                  ? 'text-rose-400'
                  : report.summary.degradedCount > 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}>
                {report.summary.downCount + report.summary.degradedCount}
              </strong>
              <span className="text-slate-500 text-xs">endpoints</span>
            </div>
            <span className="text-[10px] text-slate-500">Requires Investigation</span>
          </div>
        </div>

        {/* Indicator SLA Reference Banner */}
        <div className="p-3 bg-slate-950/70 rounded border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Health Grading System:</span>
          </span>

          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span>Green: HTTP 2xx &amp; &lt;800ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span>Yellow: HTTP 4xx or 800ms–2000ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
              <span>Red: HTTP 5xx, Timeout, or &gt;2000ms</span>
            </div>
          </div>

          <span className="text-slate-500 text-[10px]">
            Last Probe: {new Date(report.lastEvaluatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Individual Endpoint Observability Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Monitored Ingestion Endpoints &amp; Subsystems ({report.endpoints.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report.endpoints.map(ep => (
            <div
              key={ep.id}
              className={`bg-slate-900/80 rounded border p-4 space-y-3 transition-colors ${
                ep.healthGrade === 'GREEN'
                  ? 'border-emerald-500/20 hover:border-emerald-500/40'
                  : ep.healthGrade === 'YELLOW'
                  ? 'border-amber-500/30 hover:border-amber-500/50'
                  : 'border-rose-500/40 hover:border-rose-500/60'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      ep.healthGrade === 'GREEN'
                        ? 'bg-emerald-400'
                        : ep.healthGrade === 'YELLOW'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`} />
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {ep.name}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Provider: {ep.provider}
                  </span>
                </div>

                <div>
                  {getStatusCodeBadge(ep.statusCode, ep.statusText)}
                </div>
              </div>

              {/* Endpoint URL */}
              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold">
                    {ep.method}
                  </span>
                  <span className="truncate text-slate-400 text-[11px]">{ep.url}</span>
                </div>
                {ep.url.startsWith('http') && (
                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-cyan-300 transition-colors p-1"
                    title="Open external endpoint in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Latency & Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Current</span>
                  <strong className={`text-sm ${getLatencyColor(ep.latencyMs, ep.healthGrade)}`}>
                    {ep.latencyMs} ms
                  </strong>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Average</span>
                  <strong className="text-sm text-slate-200">
                    {ep.avgLatencyMs} ms
                  </strong>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Min / Max</span>
                  <span className="text-[11px] text-slate-300 block">
                    {ep.minLatencyMs} / {ep.maxLatencyMs} ms
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Uptime</span>
                  <strong className="text-sm text-emerald-400">
                    {ep.uptimePct}%
                  </strong>
                </div>
              </div>

              {/* Rolling History Spark-bar */}
              {ep.history && ep.history.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Recent Probes (Last {ep.history.length}):</span>
                    <span>Latest: {ep.latencyMs}ms</span>
                  </div>
                  <div className="flex items-end gap-1 h-6 bg-slate-950 p-1 rounded border border-slate-800/80">
                    {ep.history.slice(0, 12).map((item, idx) => {
                      const heightPct = Math.min(100, Math.max(15, (item.latencyMs / 400) * 100));
                      const barColor =
                        item.grade === 'GREEN'
                          ? 'bg-emerald-500 hover:bg-emerald-400'
                          : item.grade === 'YELLOW'
                          ? 'bg-amber-500 hover:bg-amber-400'
                          : 'bg-rose-500 hover:bg-rose-400';
                      return (
                        <div
                          key={idx}
                          className={`flex-1 rounded-xs transition-all ${barColor}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${item.statusCode} - ${item.latencyMs}ms (${item.timestamp})`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error or Notice message */}
              {ep.errorMessage ? (
                <div className="text-[11px] font-mono text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-500/30 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{ep.errorMessage}</span>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-500">{ep.healthDescription}</span>
                  <span className="text-[10px] text-slate-600">
                    Checks: {ep.totalChecks}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
