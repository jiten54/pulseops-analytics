import React, { useState, useEffect } from 'react';
import { DataSource } from '../types.js';
import { Layers, ExternalLink, CheckCircle2, Clock, Database, ShieldAlert } from 'lucide-react';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/sources')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSources(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Data Sources & Telemetry Provenance Registry
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict audit of authoritative public feeds powering the PulseOps analytics warehouse
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-mono mt-3 leading-relaxed">
          PulseOps strictly disallows synthetic data, random generators, or fabricated values. Every displayed metric, chart interval, and statistical baseline originates from authoritative public infrastructure data services.
        </p>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map(s => (
          <div key={s.source_id} className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                  {s.source_id}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {s.name}
                </h3>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                s.status === 'OPERATIONAL'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {s.status}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Provider:</span>
                <span className="text-slate-200 font-semibold text-right">{s.provider}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Endpoint URL:</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-right truncate max-w-[220px]"
                >
                  <span className="truncate">{s.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Data Type:</span>
                <span className="text-slate-200 text-right">{s.data_type}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Update Frequency:</span>
                <span className="text-slate-200 text-right">{s.update_frequency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Ingested Records:</span>
                <strong className="text-cyan-300 text-right">{s.records_count.toLocaleString()}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Last Synchronized:</span>
                <span className="text-slate-200 text-right">
                  {new Date(s.last_successful_fetch).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400">Data Window:</span>
                <span className="text-slate-300 text-right text-[11px]">
                  {s.data_period_start ? new Date(s.data_period_start).toLocaleDateString() : 'N/A'} –{' '}
                  {s.data_period_end ? new Date(s.data_period_end).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Field Provenance Table */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-white tracking-tight pb-3 border-b border-slate-800">
          Field Documentation & Physical Units
        </h3>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2">Field Name</th>
                <th className="px-3 py-2">SQL Data Type</th>
                <th className="px-3 py-2">Physical Unit</th>
                <th className="px-3 py-2">Description & Semantics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="px-3 py-2 font-bold text-cyan-300">metric_value</td>
                <td className="px-3 py-2">NUMERIC(10,2)</td>
                <td className="px-3 py-2">gCO2/kWh</td>
                <td className="px-3 py-2">Direct carbon emission intensity per kilowatt-hour of electric generation.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-cyan-300">forecast_value</td>
                <td className="px-3 py-2">NUMERIC(10,2)</td>
                <td className="px-3 py-2">gCO2/kWh</td>
                <td className="px-3 py-2">Day-ahead scheduled forecast issued by ESO control room.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-cyan-300">renewable_share</td>
                <td className="px-3 py-2">NUMERIC(5,2)</td>
                <td className="px-3 py-2">%</td>
                <td className="px-3 py-2">Calculated clean power share: Wind + Solar + Hydro generation percentage.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-cyan-300">generation_gas</td>
                <td className="px-3 py-2">NUMERIC(5,2)</td>
                <td className="px-3 py-2">%</td>
                <td className="px-3 py-2">Proportion of dispatch from Combined Cycle Gas Turbine (CCGT) fossil generation.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
