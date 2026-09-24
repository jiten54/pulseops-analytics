import React, { useState } from 'react';
import { BookOpen, Calculator, ShieldCheck, Code, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const interviewQuestions = [
    {
      q: "How does PulseOps ensure zero hallucination and metric traceability?",
      a: "Every metric displayed in PulseOps originates from our transactional `raw_records` table, linked by immutable IDs to the `clean_records` table. The AI explanation layer never queries external models directly with open-ended prompts; instead, a deterministic SQL aggregation executes first, returns structured JSON evidence, and supplies only verified statistical metrics to Gemini 3.8 Flash. If the AI service fails or if the API key is omitted, a deterministic mathematical engine outputs the exact same verified metrics."
    },
    {
      q: "Why use percentage point contribution decomposition instead of simple percentage changes?",
      a: "If an aggregate metric drops by -30%, saying 'Region A dropped 10% and Region B dropped 40%' fails to quantify which region was responsible for the overall national shift. Our additive decomposition formula: c_i = ((Avg_current,i - Avg_prev,i) / Avg_prev_total) * (1 / N) * 100 guarantees that the sum of all regional contributions equals the exact aggregate percentage shift, providing rigorous attribution."
    },
    {
      q: "How do you detect statistical anomalies in grid telemetry?",
      a: "We utilize a dual-model statistical architecture: (1) Standard Normal Z-Score: Z = (x - μ) / σ, flagging moderate outliers at |Z| ≥ 2.0σ, high severity at |Z| ≥ 2.5σ, and critical anomalies at |Z| ≥ 3.0σ. (2) Tukey's Fences using Interquartile Range (IQR): [Q1 - 1.5·IQR, Q3 + 1.5·IQR], which provides robust outlier detection without Gaussian distribution assumptions."
    },
    {
      q: "How does the ingestion pipeline handle idempotency and deduplication?",
      a: "We construct composite primary keys from `source_id + entity_id + period_from`. Before writing to the database, our DataCleaner verifies against the known composite keys in memory and rejects duplicate intervals with an explicit 'DUPLICATE_RECORD' quarantine status, preventing data inflation on repeated poll cycles."
    },
    {
      q: "How do you validate the integrity of multi-fuel energy telemetry?",
      a: "In electrical grid operations, generation fuel percentages (gas, wind, solar, nuclear, biomass, hydro, imports) must sum to 100%. We enforce an acceptance tolerance of |SUM(perc) - 100| ≤ 6.0% to accommodate transmission line losses and measurement round-off. Records exceeding this threshold are flagged and rejected."
    },
    {
      q: "How is the SQL Lab protected against destructive attacks?",
      a: "The SQL engine executes through an AST and keyword tokenizer that strictly allows queries starting with `SELECT` or `WITH`. Any statement containing keywords like `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, or chained semicolons is intercepted before parsing, returning a 403 Forbidden Security Error."
    },
    {
      q: "What is Day-Ahead Forecast Tracking Error and how is it monitored?",
      a: "Grid operators publish 24-hour day-ahead generation forecasts. We calculate the Mean Absolute Tracking Error: MAE = (1/N) * Σ |Actual_t - Forecast_t|. Significant divergence alerts operators to sudden wind drops, solar overcast events, or unscheduled thermal generation outages."
    },
    {
      q: "What are the 5 data quality dimensions implemented in PulseOps?",
      a: "Based on ISO 8000 and DAMA DMBOK principles: Completeness (non-null mandatory fields), Validity (proper ISO-8601 timestamps and non-negative values), Uniqueness (ratio of deduplicated composite keys), Consistency (fuel percentage sums adhering to 100% bounds), and Freshness (lag between real-time timestamp and ingestion execution)."
    },
    {
      q: "Why was an in-memory SQL relational engine used in the web prototype?",
      a: "PulseOps implements a normalized relational database schema with foreign keys, indexes, and full ANSI SQL support using AlaSQL, enabling instantaneous sub-5ms query performance and full standalone portability while providing production DDL schemas in `backend/schema.sql` for PostgreSQL deployment."
    },
    {
      q: "How would you scale PulseOps for 100 million records per hour in an enterprise setting?",
      a: "In an enterprise environment, raw API payloads would be published to an Apache Kafka or Google Cloud Pub/Sub topic. A stream processing engine (Apache Flink or Spark Streaming) would perform stateless validation and sliding-window Z-score calculations. Processed records would sink to a columnar data warehouse (Snowflake, BigQuery, or ClickHouse) partitioned by ingestion date and clustered by region, with dbt running hourly rollups."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Engineering Methodology & Mathematical Formulations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive architectural documentation and statistical specifications
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-mono mt-3 leading-relaxed">
          PulseOps is engineered to demonstrate real-world Senior Data Analyst and Analytics Engineer capabilities: data ingestion, rigorous cleaning, relational SQL modeling, statistical hypothesis testing, root-cause attribution, and observable data quality.
        </p>
      </div>

      {/* Core Methodology Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mathematical Contribution Decomposition */}
        <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] pb-2 border-b border-slate-800">
            <Calculator className="w-4 h-4" />
            <span>Regional Contribution Decomposition</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            To decompose an overall percentage shift into exact regional contributions without non-linear interaction terms:
          </p>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-cyan-300 font-bold text-center">
            c_i = ((Avg_current,i - Avg_prev,i) / Avg_prev_total) * (1 / N) * 100
          </div>
          <p className="text-slate-400 text-[11px]">
            Where N is the total number of reporting regions, Avg_prev_total is the aggregate baseline across all regions, and c_i represents the additive contribution of region i in percentage points.
          </p>
        </div>

        {/* Statistical Anomaly Detection */}
        <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] pb-2 border-b border-slate-800">
            <Calculator className="w-4 h-4" />
            <span>Dual-Model Statistical Anomaly Detection</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            1. Standard Score (Z-Score):
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300 font-bold text-center">
            Z = (x - μ) / σ
          </div>
          <p className="text-slate-300 leading-relaxed">
            2. Tukey's Interquartile Range Fences:
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-purple-300 font-bold text-center">
            [Q1 - 1.5·IQR, Q3 + 1.5·IQR]
          </div>
        </div>

        {/* Data Quality Scoring */}
        <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] pb-2 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4" />
            <span>5-Pillar Data Quality Index</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            The composite Data Quality Score represents a weighted aggregation across 5 foundational dimensions:
          </p>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-emerald-400 text-[11px] leading-relaxed">
            DQ_Score = 0.25·Completeness + 0.25·Validity + 0.20·Uniqueness + 0.20·Consistency + 0.10·Freshness
          </div>
        </div>

        {/* Anti-Hallucination AI Grounding */}
        <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px] pb-2 border-b border-slate-800">
            <Code className="w-4 h-4" />
            <span>Grounded AI Architecture</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Strict pipeline:
          </p>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 text-[11px]">
            User Query → Relational SQL Aggregation → Structured Metric Context → Gemini 3.8 Flash (temperature: 0.1) → Traceable Explanation
          </div>
          <p className="text-slate-400 text-[11px]">
            If database evidence is insufficient, system responds: "Insufficient data to determine cause."
          </p>
        </div>
      </div>

      {/* Technical Interview Q&A Accordion */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-4">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Data Analyst & Analytics Engineer Interview Q&A
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Key architectural, statistical, and data-engineering questions addressed by PulseOps
          </p>
        </div>

        <div className="space-y-3">
          {interviewQuestions.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-slate-950 rounded border border-slate-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3 text-left flex items-center justify-between text-xs font-mono font-semibold text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-cyan-400">Q{idx + 1}:</span>
                    <span>{item.q}</span>
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-3 pt-0 text-xs font-mono text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                    <span className="text-emerald-400 font-bold block mb-1">Senior Engineer Answer:</span>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
