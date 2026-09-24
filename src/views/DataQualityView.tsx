import React, { useState, useEffect } from 'react';
import { DataQualityReport, PipelineRun } from '../types.js';
import { ShieldCheck, CheckCircle2, AlertCircle, FileX2, History, Database, Cpu } from 'lucide-react';

interface DataQualityViewProps {
  initialReport?: DataQualityReport | null;
  pipelineRuns: PipelineRun[];
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ initialReport, pipelineRuns }) => {
  const [report, setReport] = useState<DataQualityReport | null>(initialReport || null);
  const [rejectedRecords, setRejectedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialReport);

  const fetchDQ = async () => {
    try {
      const res = await fetch('/api/data-quality');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
          setRejectedRecords(data.rejectedSamples || []);
        }
      }
    } catch (e) {
      console.error('Error fetching data quality:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDQ();
  }, []);

  if (loading || !report) {
    return (
      <div className="bg-slate-900/80 rounded border border-slate-800 p-12 text-center text-slate-400 font-mono text-xs">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Evaluating 5-pillar data quality dimensions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Header */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Data Quality & Ingestion Observability
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated audit of incoming telemetry across 5 ISO/DAMA data quality dimensions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Composite Health</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{report.overallScorePct}%</span>
            </div>
            <div className="w-12 h-12 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Global summary counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Total Rows Processed</span>
            <strong className="text-slate-200 text-lg mt-0.5 block">
              {report.summary.totalRowsProcessed.toLocaleString()}
            </strong>
            <span className="text-[10px] text-slate-500">Pipeline Lifetime</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Validated & Accepted</span>
            <strong className="text-emerald-400 text-lg mt-0.5 block">
              {report.summary.totalRowsAccepted.toLocaleString()}
            </strong>
            <span className="text-[10px] text-emerald-500/80">Clean Operational Store</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Rejected Records</span>
            <strong className="text-rose-400 text-lg mt-0.5 block">
              {report.summary.totalRowsRejected.toLocaleString()}
            </strong>
            <span className="text-[10px] text-rose-500/80">Quarantined Ingestion</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Duplicates Deduplicated</span>
            <strong className="text-cyan-400 text-lg mt-0.5 block">
              {report.summary.totalDuplicatesDetected.toLocaleString()}
            </strong>
            <span className="text-[10px] text-cyan-500/80">Idempotency Enforced</span>
          </div>
        </div>
      </div>

      {/* 5 Quality Dimensions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {report.dimensions.map(dim => (
          <div key={dim.dimension} className="bg-slate-900/60 rounded border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  {dim.dimension}
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  dim.scorePct >= 98
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : dim.scorePct >= 90
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}>
                  {dim.scorePct}%
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-mono text-[11px]">
                {dim.details}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
              <div>
                Formula: <span className="text-slate-300">{dim.formula}</span>
              </div>
              <div className="flex justify-between">
                <span>Evaluated: {dim.total.toLocaleString()}</span>
                <span>Passed: <strong className="text-emerald-400">{dim.passed.toLocaleString()}</strong></span>
                <span>Failed: <strong className="text-rose-400">{dim.failed}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quarantined & Rejected Records Log */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <FileX2 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Quarantine Audit: Rejected Ingestion Records
          </h3>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2">Raw Ingestion ID</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Fetched Timestamp</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Rejection Cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {rejectedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No records have failed validation rules in current observation window. 100% acceptance.
                  </td>
                </tr>
              ) : (
                rejectedRecords.map(r => (
                  <tr key={r.raw_id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 whitespace-nowrap text-rose-300 font-mono">{r.raw_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400">{r.source_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.fetched_at.replace('T', ' ').replace('Z', '')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-rose-400 uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">
                        {r.validation_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-rose-400 font-mono text-[11px]">{r.rejection_reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline Execution History */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Pipeline Execution Log & Audit Trail
          </h3>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2">Run ID</th>
                <th className="px-3 py-2">Pipeline Source</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Inserted</th>
                <th className="px-3 py-2">Rejected</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pipelineRuns.map(run => {
                const start = new Date(run.started_at).getTime();
                const end = run.completed_at ? new Date(run.completed_at).getTime() : start;
                const durationSec = ((end - start) / 1000).toFixed(2);
                return (
                  <tr key={run.run_id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{run.run_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400">{run.source}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(run.started_at).toLocaleTimeString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-cyan-300">{durationSec}s</td>
                    <td className="px-3 py-2 whitespace-nowrap">{run.records_received}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-emerald-400 font-semibold">{run.records_inserted}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-rose-400">{run.records_rejected}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        run.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
