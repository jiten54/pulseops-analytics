import React, { useState, useEffect } from 'react';
import { RootCauseDecomposition, GroundedInsight } from '../types.js';
import { Lightbulb, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Database, HelpCircle } from 'lucide-react';

export const InsightsView: React.FC = () => {
  const [rootCause, setRootCause] = useState<RootCauseDecomposition | null>(null);
  const [insight, setInsight] = useState<GroundedInsight | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [loadingRoot, setLoadingRoot] = useState<boolean>(true);

  const fetchRootCause = async () => {
    try {
      const res = await fetch('/api/insights/root-cause');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setRootCause(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoot(false);
    }
  };

  const handleAskQuestion = async (q?: string) => {
    const prompt = q || question;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt })
      });
      const data = await res.json();
      if (data.success) setInsight(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchRootCause();
    handleAskQuestion('Provide an executive root-cause breakdown of recent grid operations, emission changes, and regional drivers.');
  }, []);

  return (
    <div className="space-y-6">
      {/* Root Cause Mathematical Decomposition Header */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Root-Cause Mathematical Decomposition
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact attribution of aggregate metric delta into additive regional percentage points
            </p>
          </div>

          {rootCause && (
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase text-slate-400 block">Aggregate 24h Shift</span>
              <span className={`text-xl font-bold ${
                rootCause.overallChangePct > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {rootCause.overallChangePct > 0 ? `+${rootCause.overallChangePct}%` : `${rootCause.overallChangePct}%`}
              </span>
            </div>
          )}
        </div>

        {/* Narrative explanation */}
        {rootCause && (
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed">
            <span className="text-cyan-400 font-bold block mb-1">Analytical Decomposition Summary:</span>
            {rootCause.explanation}
          </div>
        )}

        {/* Contributors Table */}
        {rootCause && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2">Current Avg</th>
                  <th className="px-3 py-2">Previous Avg</th>
                  <th className="px-3 py-2">Local Delta</th>
                  <th className="px-3 py-2">Contribution (pp)</th>
                  <th className="px-3 py-2">Share of Total Shift</th>
                  <th className="px-3 py-2">Driver Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {rootCause.contributors.map(c => (
                  <tr key={c.region} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{c.region}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.currentAvg} g</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400">{c.previousAvg} g</td>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold">
                      <span className={c.deltaValue > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {c.deltaValue > 0 ? `+${c.deltaValue}` : c.deltaValue} g
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-bold text-cyan-300">
                      {c.contributionPercentagePoints > 0 ? `+${c.contributionPercentagePoints}` : c.contributionPercentagePoints} pp
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                      {c.percentageShareOfChange}%
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {c.isPrimaryDriver ? (
                        <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Primary Driver
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase">Subordinate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grounded AI Analysis Layer */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Grounded Operational AI Analyst
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evidence-grounded explanation synthesized strictly from real database queries and decomposition matrices
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Hallucination Guardrails Active</span>
          </div>
        </div>

        {/* Question Input Form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask an analytical question (e.g. 'What drove emissions today?', 'Which regions need investigation?')"
              className="flex-1 bg-slate-950 text-slate-200 text-xs font-mono px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => handleAskQuestion()}
              disabled={loadingAi}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
              <span>{loadingAi ? 'Analyzing...' : 'Generate Insight'}</span>
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <span>Suggested:</span>
            {[
              'What caused the 24h emissions change?',
              'Which regions have severe forecast variance?',
              'What is the correlation between wind generation and carbon intensity?'
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => {
                  setQuestion(prompt);
                  handleAskQuestion(prompt);
                }}
                className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Insight Result Card */}
        {insight && (
          <div className="mt-4 bg-slate-950 rounded border border-slate-800 p-4 space-y-4">
            {/* Metadata Traceability Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Data Provenance:</span>
                <strong className="text-slate-200">{insight.dataUsed}</strong>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Analysis Period:</span>
                <strong className="text-slate-200">{insight.analysisPeriod}</strong>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Engine Mode:</span>
                <strong className={insight.isAiGenerated ? 'text-cyan-400' : 'text-emerald-400'}>
                  {insight.isAiGenerated ? 'Gemini 3.8 Flash (Grounded)' : 'Deterministic Analytics Engine'}
                </strong>
              </div>
            </div>

            {/* Generated Explanation */}
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">
                Executive Findings:
              </span>
              <p className="text-xs text-slate-200 font-mono leading-relaxed bg-slate-900/40 p-3 rounded border border-slate-800">
                {insight.explanation}
              </p>
            </div>

            {/* Actionable Recommendations */}
            {insight.recommendations && insight.recommendations.length > 0 && (
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
                  Actionable Operational Next Steps:
                </span>
                <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                  {insight.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-800/80">
                      <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* End-to-End Data Lineage & Traceability */}
      <div className="bg-slate-900/80 rounded border border-slate-800 p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            End-to-End Data Lineage & Traceability Proof
          </h3>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] block">Stage 1: Verified Fetch</span>
            <strong className="text-slate-200 mt-1 block">api.carbonintensity.org.uk</strong>
            <span className="text-[10px] text-slate-400">UK Grid ESO REST Endpoint</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] block">Stage 2: Raw Audit Store</span>
            <strong className="text-slate-200 mt-1 block">raw_records table</strong>
            <span className="text-[10px] text-slate-400">Payload + Run ID hashed</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] block">Stage 3: Cleaning & Types</span>
            <strong className="text-emerald-400 mt-1 block">clean_records table</strong>
            <span className="text-[10px] text-slate-400">Tukey bounds & ISO checked</span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] block">Stage 4: Mathematical Agg</span>
            <strong className="text-cyan-400 mt-1 block">Z-Score & Decomposition</strong>
            <span className="text-[10px] text-slate-400">100% Traceable to SQL Rows</span>
          </div>
        </div>
      </div>
    </div>
  );
};
