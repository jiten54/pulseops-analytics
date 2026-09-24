import React, { useState, useEffect } from 'react';
import { CleanRecord } from '../types.js';
import { Search, Download, ChevronLeft, ChevronRight, Filter, SlidersHorizontal } from 'lucide-react';

interface ExplorerViewProps {
  initialRegion?: string;
  regions: string[];
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({ initialRegion = 'ALL', regions }) => {
  const [records, setRecords] = useState<CleanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [search, setSearch] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');

  // Column toggles
  const [showColumns, setShowColumns] = useState<Record<string, boolean>>({
    timestamp: true,
    entity_name: true,
    region: true,
    metric_value: true,
    forecast_value: true,
    intensity_index: true,
    renewable_share: true,
    generation_gas: true,
    generation_wind: true,
    source_id: false
  });

  const [showColMenu, setShowColMenu] = useState<boolean>(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort_by: sortBy,
        sort_dir: sortDir
      });

      if (selectedRegion && selectedRegion !== 'ALL') params.set('region', selectedRegion);
      if (selectedSource && selectedSource !== 'ALL') params.set('source_id', selectedSource);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/data?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setRecords(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.totalRecords);
      } else {
        throw new Error(data.message || 'Failed to load records');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, selectedRegion, selectedSource, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleExportCSV = () => {
    const url = `/api/export?type=records&region=${encodeURIComponent(selectedRegion)}`;
    window.location.href = url;
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Operational Data Explorer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect, filter, and audit verified historical and real-time operational records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowColMenu(!showColMenu)}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-slate-950 text-slate-300 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>

              {showColMenu && (
                <div className="absolute right-0 top-9 z-30 w-48 bg-slate-950 border border-slate-700 rounded shadow-2xl p-2 text-xs font-mono space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase pb-1 border-b border-slate-800">
                    Toggle Columns
                  </div>
                  {Object.keys(showColumns).map(col => (
                    <label key={col} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white py-0.5">
                      <input
                        type="checkbox"
                        checked={showColumns[col]}
                        onChange={e => setShowColumns({ ...showColumns, [col]: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search entity, region, index..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 placeholder-slate-500 px-3 py-1.5 pl-8 rounded border border-slate-700 focus:outline-none focus:border-cyan-400 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>

          {/* Region filter */}
          <div>
            <select
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-cyan-400 text-xs"
            >
              <option value="ALL">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div>
            <select
              value={selectedSource}
              onChange={e => {
                setSelectedSource(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-cyan-400 text-xs"
            >
              <option value="ALL">All Sources</option>
              <option value="SRC_UK_GRID_ESO">UK National Grid ESO</option>
              <option value="SRC_OPEN_METEO_HUB">Copernicus Logistics Hubs</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-cyan-400 text-xs"
            >
              <option value="timestamp">Sort: Timestamp</option>
              <option value="metric_value">Sort: Metric Value</option>
              <option value="renewable_share">Sort: Renewable %</option>
              <option value="forecast_value">Sort: Forecast</option>
              <option value="entity_name">Sort: Entity Name</option>
            </select>
            <button
              onClick={() => setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC')}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Toggle sort direction"
            >
              {sortDir}
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/80 rounded border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                {showColumns.timestamp && <th className="px-4 py-3">Timestamp</th>}
                {showColumns.entity_name && <th className="px-4 py-3">Entity</th>}
                {showColumns.region && <th className="px-4 py-3">Region</th>}
                {showColumns.metric_value && <th className="px-4 py-3">Actual Value</th>}
                {showColumns.forecast_value && <th className="px-4 py-3">Forecast</th>}
                {showColumns.intensity_index && <th className="px-4 py-3">Index</th>}
                {showColumns.renewable_share && <th className="px-4 py-3">Renewable %</th>}
                {showColumns.generation_gas && <th className="px-4 py-3">Gas %</th>}
                {showColumns.generation_wind && <th className="px-4 py-3">Wind %</th>}
                {showColumns.source_id && <th className="px-4 py-3">Source ID</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <span>Querying operational records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No records matched the selected query parameters.
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    {showColumns.timestamp && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-300">
                        {r.timestamp.replace('T', ' ').replace('Z', '')}
                      </td>
                    )}
                    {showColumns.entity_name && (
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-white">
                        {r.entity_name}
                      </td>
                    )}
                    {showColumns.region && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">
                        {r.region}
                      </td>
                    )}
                    {showColumns.metric_value && (
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold text-cyan-300">
                        {r.metric_value} <span className="text-[10px] text-slate-500 font-normal">{r.unit}</span>
                      </td>
                    )}
                    {showColumns.forecast_value && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-purple-300">
                        {r.forecast_value !== null ? `${r.forecast_value} ${r.unit}` : '—'}
                      </td>
                    )}
                    {showColumns.intensity_index && (
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`text-[11px] uppercase tracking-wider font-semibold ${
                          r.intensity_index === 'very high' || r.intensity_index === 'high'
                            ? 'text-rose-400'
                            : r.intensity_index === 'moderate'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {r.intensity_index}
                        </span>
                      </td>
                    )}
                    {showColumns.renewable_share && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-emerald-400 font-medium">
                        {r.renewable_share}%
                      </td>
                    )}
                    {showColumns.generation_gas && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-amber-400">
                        {r.generation_gas}%
                      </td>
                    )}
                    {showColumns.generation_wind && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-cyan-400">
                        {r.generation_wind}%
                      </td>
                    )}
                    {showColumns.source_id && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-[10px] text-slate-500">
                        {r.source_id}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{records.length}</strong> of{' '}
            <strong className="text-slate-200">{totalRecords.toLocaleString()}</strong> records (Page {page} of {totalPages})
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 text-slate-200 px-2 py-1 rounded border border-slate-700 text-xs"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-300">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
