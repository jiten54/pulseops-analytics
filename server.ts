/**
 * PulseOps - Business Operations Intelligence Platform
 * Full-Stack Express Server with Real Data Ingestion, Relational SQL Engine,
 * Statistical Analytics, Anomaly Detection, and Vite dev middleware.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, initDatabase } from './src/server/db.js';
import { runIngestionPipeline } from './src/server/ingestion.js';
import {
  computeDailyMetrics,
  detectStatisticalAnomalies,
  calculateKPISummary,
  computeRootCauseDecomposition
} from './src/server/analytics.js';
import { evaluateDataQuality } from './src/server/dataQuality.js';
import { executeSafeReadOnlySQL, PREDEFINED_QUERIES } from './src/server/sqlLab.js';
import { generateGroundedInsight } from './src/server/aiInsights.js';
import { generateSystemHealthReport, probeAllSystemEndpoints } from './src/server/systemHealth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize DB tables
  initDatabase();

  // ---------------------------------------------------------------------------
  // REST API ROUTES
  // ---------------------------------------------------------------------------

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'PulseOps Business Operations Intelligence',
      timestamp: new Date().toISOString(),
      database: 'connected (in-memory relational SQL)',
      environment: isProd ? 'production' : 'development'
    });
  });

  // System Health & External API Ingestion Observability
  app.get('/api/system-health', (req, res) => {
    const report = generateSystemHealthReport();
    res.json({ success: true, report });
  });

  app.post('/api/system-health/ping', async (req, res) => {
    try {
      const report = await probeAllSystemEndpoints();
      res.json({ success: true, report });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Failed to probe endpoints' });
    }
  });

  // Sources
  app.get('/api/sources', (req, res) => {
    const sources = db.query('SELECT * FROM data_sources ORDER BY records_count DESC');
    res.json({ success: true, count: sources.length, data: sources });
  });

  // KPI Summary
  app.get('/api/metrics', (req, res) => {
    const kpis = calculateKPISummary();
    const catalog = db.query('SELECT * FROM metrics');
    res.json({ success: true, summary: kpis, catalog });
  });

  // Time-Series Trend
  app.get('/api/metrics/trend', (req, res) => {
    const { region, metric = 'intensity' } = req.query;

    let sql = `
      SELECT 
        timestamp,
        region,
        metric_value,
        forecast_value,
        renewable_share,
        generation_gas,
        generation_wind,
        generation_solar,
        generation_nuclear
      FROM clean_records
      WHERE source_id = 'SRC_UK_GRID_ESO'
    `;
    const params: any[] = [];

    if (region && region !== 'ALL') {
      sql += ' AND region = ?';
      params.push(region);
    }

    sql += ' ORDER BY timestamp ASC';
    const rows = db.query(sql, params);

    // Group by timestamp for aggregated trend
    const timeMap: Record<string, {
      timestamp: string;
      timeLabel: string;
      avgIntensity: number;
      avgForecast: number | null;
      avgRenewable: number;
      avgGas: number;
      avgWind: number;
      avgSolar: number;
      count: number;
    }> = {};

    for (const r of rows) {
      const t = r.timestamp;
      if (!timeMap[t]) {
        const d = new Date(t);
        const timeLabel = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        timeMap[t] = {
          timestamp: t,
          timeLabel,
          avgIntensity: 0,
          avgForecast: 0,
          avgRenewable: 0,
          avgGas: 0,
          avgWind: 0,
          avgSolar: 0,
          count: 0
        };
      }
      timeMap[t].avgIntensity += r.metric_value;
      if (r.forecast_value !== null) timeMap[t].avgForecast = (timeMap[t].avgForecast || 0) + r.forecast_value;
      timeMap[t].avgRenewable += r.renewable_share;
      timeMap[t].avgGas += r.generation_gas;
      timeMap[t].avgWind += r.generation_wind;
      timeMap[t].avgSolar += r.generation_solar;
      timeMap[t].count += 1;
    }

    const trend = Object.values(timeMap).map(item => ({
      timestamp: item.timestamp,
      timeLabel: item.timeLabel,
      intensity: Number((item.avgIntensity / item.count).toFixed(1)),
      forecast: item.avgForecast !== null ? Number((item.avgForecast / item.count).toFixed(1)) : null,
      renewableShare: Number((item.avgRenewable / item.count).toFixed(1)),
      gasShare: Number((item.avgGas / item.count).toFixed(1)),
      windShare: Number((item.avgWind / item.count).toFixed(1)),
      solarShare: Number((item.avgSolar / item.count).toFixed(1))
    }));

    res.json({ success: true, count: trend.length, data: trend });
  });

  // Regional Comparison
  app.get('/api/metrics/comparison', (req, res) => {
    const comparison = db.query(`
      SELECT 
        region,
        ROUND(AVG(metric_value), 1) as avg_intensity,
        ROUND(MIN(metric_value), 1) as min_intensity,
        ROUND(MAX(metric_value), 1) as max_intensity,
        ROUND(AVG(renewable_share), 1) as avg_renewable_share,
        ROUND(AVG(generation_gas), 1) as avg_gas_share,
        ROUND(AVG(generation_wind), 1) as avg_wind_share,
        COUNT(*) as total_records
      FROM clean_records
      WHERE source_id = 'SRC_UK_GRID_ESO'
      GROUP BY region
      ORDER BY avg_intensity DESC
    `);
    res.json({ success: true, count: comparison.length, data: comparison });
  });

  // Explorer Filtered Data with Pagination
  app.get('/api/data', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const { region, source_id, search, sort_by = 'timestamp', sort_dir = 'DESC' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (region && region !== 'ALL') {
      whereClause += ' AND region = ?';
      params.push(region);
    }

    if (source_id && source_id !== 'ALL') {
      whereClause += ' AND source_id = ?';
      params.push(source_id);
    }

    if (search && typeof search === 'string' && search.trim()) {
      whereClause += ' AND (entity_name LIKE ? OR region LIKE ? OR intensity_index LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const countSql = `SELECT COUNT(*) as total FROM clean_records ${whereClause}`;
    const totalCount = db.query<{ total: number }>(countSql, params)[0]?.total || 0;

    const safeSortCols = ['timestamp', 'entity_name', 'region', 'metric_value', 'renewable_share', 'forecast_value'];
    const sortCol = safeSortCols.includes(sort_by as string) ? (sort_by as string) : 'timestamp';
    const sortDirection = (sort_dir as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT * FROM clean_records 
      ${whereClause} 
      ORDER BY ${sortCol} ${sortDirection} 
      LIMIT ? OFFSET ?
    `;
    const rows = db.query(dataSql, [...params, limit, offset]);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      data: rows
    });
  });

  // Latest Single Snapshot
  app.get('/api/data/latest', (req, res) => {
    const latestTimestamp = db.query<{ timestamp: string }>(
      'SELECT timestamp FROM clean_records ORDER BY timestamp DESC LIMIT 1'
    )[0]?.timestamp;

    if (!latestTimestamp) {
      return res.json({ success: false, message: 'No records ingested yet' });
    }

    const rows = db.query(
      'SELECT * FROM clean_records WHERE timestamp = ? ORDER BY metric_value DESC',
      [latestTimestamp]
    );

    res.json({
      success: true,
      timestamp: latestTimestamp,
      count: rows.length,
      data: rows
    });
  });

  // Anomalies
  app.get('/api/anomalies', (req, res) => {
    const { severity, region } = req.query;
    let sql = 'SELECT * FROM anomalies WHERE 1=1';
    const params: any[] = [];

    if (severity && severity !== 'ALL') {
      sql += ' AND severity = ?';
      params.push(severity);
    }

    if (region && region !== 'ALL') {
      sql += ' AND region = ?';
      params.push(region);
    }

    sql += ' ORDER BY ABS(z_score) DESC';
    const anomalies = db.query(sql, params);

    res.json({ success: true, count: anomalies.length, data: anomalies });
  });

  // Data Quality
  app.get('/api/data-quality', (req, res) => {
    const report = evaluateDataQuality();
    const rejectedSamples = db.query(`
      SELECT raw_id, fetched_at, source_id, validation_status, rejection_reason 
      FROM raw_records 
      WHERE validation_status = 'REJECTED'
      ORDER BY fetched_at DESC 
      LIMIT 20
    `);
    res.json({ success: true, report, rejectedSamples });
  });

  // Pipeline Runs
  app.get('/api/pipeline/runs', (req, res) => {
    const runs = db.query('SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 20');
    res.json({ success: true, count: runs.length, data: runs });
  });

  // Root Cause Decomposition
  app.get('/api/insights/root-cause', (req, res) => {
    const rootCause = computeRootCauseDecomposition();
    res.json({ success: true, data: rootCause });
  });

  // Grounded AI Insights
  app.post('/api/insights', async (req, res) => {
    try {
      const { question } = req.body || {};
      const insight = await generateGroundedInsight(question);
      res.json({ success: true, data: insight });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Error generating grounded insight' });
    }
  });

  // SQL Lab Runner
  app.post('/api/sql/query', (req, res) => {
    const { sql } = req.body || {};
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'Query string required' });
    }
    const result = executeSafeReadOnlySQL(sql);
    res.json(result);
  });

  // SQL Lab Predefined Catalog
  app.get('/api/sql/predefined', (req, res) => {
    res.json({ success: true, queries: PREDEFINED_QUERIES });
  });

  // Manual Ingestion Sync Trigger
  app.post('/api/sync', async (req, res) => {
    try {
      const result = await runIngestionPipeline();
      computeDailyMetrics();
      detectStatisticalAnomalies();
      evaluateDataQuality();
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to sync source data' });
    }
  });

  // CSV Data Export Endpoint
  app.get('/api/export', (req, res) => {
    const { type = 'records', region } = req.query;

    let rows: any[] = [];
    let filename = 'pulseops_export.csv';

    if (type === 'anomalies') {
      rows = db.query('SELECT * FROM anomalies ORDER BY timestamp DESC');
      filename = `pulseops_anomalies_${Date.now()}.csv`;
    } else {
      let sql = 'SELECT * FROM clean_records';
      const params: any[] = [];
      if (region && region !== 'ALL') {
        sql += ' WHERE region = ?';
        params.push(region);
      }
      sql += ' ORDER BY timestamp DESC LIMIT 2000';
      rows = db.query(sql, params);
      filename = `pulseops_records_${Date.now()}.csv`;
    }

    if (!rows.length) {
      return res.status(404).send('No data available to export.');
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers
          .map(h => {
            const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  });

  // ---------------------------------------------------------------------------
  // Vite Dev Middlewares / Production Static Assets
  // ---------------------------------------------------------------------------
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulseOps] Platform active on http://0.0.0.0:${PORT}`);
  });

  // Run startup ingestion in background so server is responsive immediately
  (async () => {
    console.log('[PulseOps] Triggering startup real data ingestion pipeline...');
    try {
      await probeAllSystemEndpoints();
      await runIngestionPipeline();
      computeDailyMetrics();
      detectStatisticalAnomalies();
      evaluateDataQuality();
      console.log('[PulseOps] Startup ingestion & analytics compute completed successfully.');
    } catch (err) {
      console.error('[PulseOps] Startup ingestion error:', err);
    }
  })();

  // Periodic Ingestion Sync (every 30 minutes) and Health Probe (every 5 minutes)
  setInterval(async () => {
    try {
      await probeAllSystemEndpoints();
    } catch (e) {
      console.error('[PulseOps] Health probe error:', e);
    }
  }, 5 * 60 * 1000);

  setInterval(async () => {
    console.log('[PulseOps] Running scheduled data ingestion sync...');
    try {
      await runIngestionPipeline();
      computeDailyMetrics();
      detectStatisticalAnomalies();
      evaluateDataQuality();
    } catch (e) {
      console.error('[PulseOps] Periodic sync error:', e);
    }
  }, 30 * 60 * 1000);
}

startServer().catch(err => {
  console.error('[PulseOps] Fatal server startup failure:', err);
  process.exit(1);
});
