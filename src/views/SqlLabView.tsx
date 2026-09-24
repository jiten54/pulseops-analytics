import React, { useState, useEffect } from 'react';
import { PredefinedQuery } from '../types.js';
import { Terminal, Play, Download, Clock, Database, ShieldCheck, AlertCircle } from 'lucide-react';

export const SqlLabView: React.FC = () => {
  const [sql, setSql] = useState<string>(`SELECT 
  region,
  ROUND(AVG(metric_value), 1) AS avg_intensity_gco2,
  ROUND(AVG(renewable_share), 1) AS avg_renewable_pct,
  COUNT(*) AS total_intervals
FROM clean_records
WHERE source_id = 'SRC_UK_GRID_ESO'
GROUP BY region
ORDER BY avg_intensity_gco2 DESC`);

  const [predefinedQueries, setPredefinedQueries] = useState<PredefinedQuery[]>([]);
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    query: string;
    executionTimeMs: number;
    rowCount: number;
    columns: string[];
    rows: any[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/sql/predefined')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPredefinedQueries(data.queries);
      })
      .catch(console.error);

    // Initial run
    handleRunQuery(sql);
  }, []);

  const handleRunQuery = async (queryToRun?: string) => {
    const q = queryToRun || sql;
    setExecuting(true);
    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: q })
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        query: q,
        executionTimeMs: 0,
        rowCount: 0,
        columns: [],
        rows: [],
        error: err?.message || 'Network error running query'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSelectPredefined = (item: PredefinedQuery) => {
    setSql(item.sql);
    handleRunQuery(item.sql);
  };

  const handleExportResultCSV = () => {
    if (!result || !result.rows || result.rows.length === 0) return;
    const headers = result.columns;
    const csv = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseops_sql_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Security Sandbox Notice */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                SQL Analytics Lab & Sandbox
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute read-only SQL queries directly against the in-memory normalized relational tables
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Read-Only Sandbox (DDL/DML Blocked)</span>
          </div>
        </div>

        {/* Predefined Analytical Queries Palette */}
        <div className="mt-3">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
            Predefined Analytical Queries
          </span>
          <div className="flex flex-wrap gap-2">
            {predefinedQueries.map(pq => (
              <button
                key={pq.id}
                onClick={() => handleSelectPredefined(pq)}
                className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                title={pq.description}
              >
                {pq.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="bg-slate-900/90 rounded border border-slate-800 overflow-hidden">
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>SQL Query Editor (Target: clean_records, anomalies, daily_metrics)</span>
          </span>

          <button
            onClick={() => handleRunQuery()}
            disabled={executing}
            className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
            <span>{executing ? 'Executing...' : 'Run Query'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950/60 font-mono text-xs">
          <textarea
            value={sql}
            onChange={e => setSql(e.target.value)}
            rows={7}
            className="w-full bg-transparent text-cyan-300 font-mono text-xs focus:outline-none resize-y selection:bg-cyan-500/30 leading-relaxed"
            placeholder="SELECT * FROM clean_records LIMIT 20;"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="bg-slate-900/80 rounded border border-slate-800 overflow-hidden">
          {/* Result Metadata Bar */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className={`font-bold uppercase ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.success ? 'SUCCESS' : 'EXECUTION ERROR'}
              </span>

              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Execution Time: <strong className="text-slate-200">{result.executionTimeMs} ms</strong></span>
              </span>

              <span className="text-slate-400">
                Rows: <strong className="text-slate-200">{result.rowCount}</strong>
              </span>
            </div>

            {result.success && result.rowCount > 0 && (
              <button
                onClick={handleExportResultCSV}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Results CSV</span>
              </button>
            )}
          </div>

          {/* Error message or table */}
          {result.error ? (
            <div className="p-6 text-rose-400 font-mono text-xs flex items-start gap-3 bg-rose-950/20">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold">SQL Execution Failed</strong>
                <p className="mt-1 text-rose-300">{result.error}</p>
              </div>
            </div>
          ) : result.rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Query completed with 0 rows returned.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 uppercase tracking-wider text-[10px]">
                  <tr>
                    {result.columns.map(col => (
                      <th key={col} className="px-4 py-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      {result.columns.map(col => (
                        <td key={col} className="px-4 py-2 whitespace-nowrap">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
