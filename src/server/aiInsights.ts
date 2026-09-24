/**
 * PulseOps - Grounded AI Insights Engine
 * Architecture:
 * User Question / Analytical Query
 *    ↓
 * SQL / Statistical Engine
 *    ↓
 * Actual Database Results & Mathematical Decomposition
 *    ↓
 * Grounded LLM Context
 *    ↓
 * Evidence-Backed Human-Readable Narrative
 *
 * Anti-Hallucination: Strictly references provided evidence tables.
 * Deterministic fallback if API key is not configured or unavailable.
 */
import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { computeRootCauseDecomposition, calculateKPISummary } from './analytics.js';

export interface GroundedInsightResult {
  question: string;
  dataUsed: string;
  analysisPeriod: string;
  metricsUsed: string[];
  evidenceData: Record<string, any>;
  explanation: string;
  recommendations: string[];
  isAiGenerated: boolean;
}

export async function generateGroundedInsight(question?: string): Promise<GroundedInsightResult> {
  const kpis = calculateKPISummary();
  const rootCause = computeRootCauseDecomposition();

  // Retrieve actual SQL database summaries for evidence
  const topAnomalies = db.query<any>(`
    SELECT timestamp, region, observed_value, expected_baseline, deviation_pct, z_score, severity, rule_explanation
    FROM anomalies
    ORDER BY ABS(z_score) DESC
    LIMIT 5
  `);

  const regionalRankings = db.query<any>(`
    SELECT region, ROUND(AVG(metric_value), 1) as avg_intensity, ROUND(AVG(renewable_share), 1) as avg_renewable
    FROM clean_records
    WHERE source_id = 'SRC_UK_GRID_ESO'
    GROUP BY region
    ORDER BY avg_intensity DESC
    LIMIT 5
  `);

  const metricsUsed = [
    'Carbon Intensity (gCO2/kWh)',
    'Renewable Generation Share (%)',
    'Forecast Tracking Error (gCO2/kWh)',
    'Operational Volatility (StdDev)'
  ];

  const analysisPeriod = `${rootCause.periodLabel} (Latest: ${kpis.lastUpdated})`;
  const dataUsed = `National Grid ESO verified telemetry (${kpis.totalCleanRecords} clean records across 18 UK regional nodes)`;

  const evidenceData = {
    currentSummary: {
      intensity: kpis.currentIntensity,
      intensityChangePct: kpis.intensityPeriodOverPeriodDeltaPct,
      renewableShare: kpis.currentRenewableShare,
      gasFossilShare: kpis.gasFossilShare,
      forecastTrackingError: kpis.forecastTrackingError,
      volatility: kpis.operationalVolatility
    },
    rootCauseDecomposition: {
      overallChangePct: rootCause.overallChangePct,
      currentAvg: rootCause.currentAvg,
      previousAvg: rootCause.previousAvg,
      topContributors: rootCause.contributors.slice(0, 4)
    },
    severeAnomalies: topAnomalies,
    regionalRankings
  };

  const userQuestion = question?.trim() || 'Provide an executive root-cause breakdown of recent grid operations, emission changes, and regional drivers.';

  // Attempt Grounded AI generation with Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are PulseOps Principal Data Analyst. Answer the user question strictly using ONLY the verified database evidence provided below.
NEVER invent statistics, fake customers, synthetic numbers, or ungrounded percentages.
Every number you cite MUST come directly from the evidence payload.
If evidence is insufficient to explain a trend, explicitly state: "Insufficient data to determine the cause."

USER QUESTION: "${userQuestion}"

EVIDENCE PAYLOAD:
${JSON.stringify(evidenceData, null, 2)}

Provide your response in JSON format with:
{
  "explanation": "concise, professional data analyst explanation highlighting what changed, where, the magnitude, and the regional drivers in percentage points",
  "recommendations": ["actionable operational recommendation 1 based on evidence", "actionable recommendation 2", "actionable recommendation 3"]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '';
      try {
        const parsed = JSON.parse(text);
        if (parsed.explanation && Array.isArray(parsed.recommendations)) {
          return {
            question: userQuestion,
            dataUsed,
            analysisPeriod,
            metricsUsed,
            evidenceData,
            explanation: parsed.explanation,
            recommendations: parsed.recommendations,
            isAiGenerated: true
          };
        }
      } catch {
        // Fall through to deterministic engine if JSON parse fails
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out, utilizing deterministic evidence engine:', err);
    }
  }

  // Deterministic, Traceable Analytical Explanation (Guaranteed No Hallucination)
  const topContributor = rootCause.contributors[0];
  const secondContributor = rootCause.contributors[1];

  let explanation = `National grid carbon intensity shifted by ${rootCause.overallChangePct > 0 ? '+' : ''}${rootCause.overallChangePct}% (moving from ${rootCause.previousAvg} to ${rootCause.currentAvg} gCO2/kWh). `;
  if (topContributor) {
    explanation += `Mathematical decomposition reveals '${topContributor.region}' was the primary contributor, accounting for ${topContributor.contributionPercentagePoints > 0 ? '+' : ''}${topContributor.contributionPercentagePoints} percentage points of the total shift (local delta of ${topContributor.deltaValue > 0 ? '+' : ''}${topContributor.deltaValue} gCO2/kWh). `;
  }
  if (secondContributor) {
    explanation += `'${secondContributor.region}' accounted for an additional ${secondContributor.contributionPercentagePoints > 0 ? '+' : ''}${secondContributor.contributionPercentagePoints} percentage points. `;
  }
  explanation += `Current renewable generation stands at ${kpis.currentRenewableShare}% while natural gas represents ${kpis.gasFossilShare}%. ${kpis.totalAnomaliesDetected} statistical anomalies were detected across the monitoring window.`;

  const recommendations = [
    `Investigate dispatch dynamics in ${topContributor?.region || 'high-carbon regions'} where intensity deviated from baseline.`,
    `Review day-ahead forecast calibration where Mean Absolute Tracking Error reached ${kpis.forecastTrackingError} gCO2/kWh.`,
    `Monitor renewable curtailment and transmission interconnectors during peak volatility periods (σ = ${kpis.operationalVolatility}).`
  ];

  return {
    question: userQuestion,
    dataUsed,
    analysisPeriod,
    metricsUsed,
    evidenceData,
    explanation,
    recommendations,
    isAiGenerated: false
  };
}
