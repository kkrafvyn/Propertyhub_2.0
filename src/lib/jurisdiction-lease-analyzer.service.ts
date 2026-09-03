import { buildPropertyComplianceSnapshot, type PropertyLocationInput } from "./property-country-context.service";
import {
  aiLeaseAnalyzerService,
  type LeaseAnalysisResult,
  type LeaseClauseRule,
} from "./ai-lease-analyzer.service";

export type JurisdictionLeaseRule = LeaseClauseRule & {
  jurisdictionId: string;
  source: "statute" | "subdivision" | "ghana_engine";
};

export type JurisdictionLeaseAnalysis = LeaseAnalysisResult & {
  jurisdictionId: string;
  jurisdictionLabel: string;
  subdivisionLabel?: string;
  governingLaw: string;
  requiredClausesMissing: string[];
  depositCapMonths?: number;
  advanceRentCapMonths?: number;
};

function checkNumericCap(
  text: string,
  patterns: RegExp[],
  capMonths: number,
  ruleMeta: Omit<JurisdictionLeaseRule, "detectedText" | "isCompliant" | "suggestedRedline" | "severity">
): JurisdictionLeaseRule | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const months = pattern.source.includes("year") ? value * 12 : value;
    if (months > capMonths) {
      return {
        ...ruleMeta,
        severity: "critical_violation",
        detectedText: match[0],
        suggestedRedline: `Reduce to ${capMonths} month(s) maximum per ${ruleMeta.jurisdictionId} rules.`,
        isCompliant: false,
      };
    }
    return {
      ...ruleMeta,
      severity: "compliant",
      description: `Within ${capMonths}-month cap.`,
      suggestedRedline: "Compliant.",
      isCompliant: true,
    };
  }
  return null;
}

function checkRequiredClauses(
  text: string,
  required: string[],
  jurisdictionId: string
): { missing: string[]; rules: JurisdictionLeaseRule[] } {
  const lower = text.toLowerCase();
  const missing: string[] = [];
  const rules: JurisdictionLeaseRule[] = [];

  for (const clause of required) {
    const keywords = clause
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);
    const found = keywords.some((kw) => lower.includes(kw));
    if (!found) missing.push(clause);
    rules.push({
      id: `clause_${clause.slice(0, 12).replace(/\W/g, "_")}`,
      category: "quiet_enjoyment",
      title: found ? `Clause present: ${clause.slice(0, 48)}…` : `Missing clause: ${clause.slice(0, 48)}…`,
      ghanaLawCitation: clause,
      severity: found ? "compliant" : "warning",
      description: found ? "Required lease language detected." : "Add this clause to the schedule.",
      suggestedRedline: clause,
      isCompliant: found,
      jurisdictionId,
      source: "subdivision",
    });
  }

  return { missing, rules };
}

/** Analyze lease text against property jurisdiction + subdivision rules. */
export function analyzeLeaseForProperty(
  text: string,
  property: PropertyLocationInput,
  org?: {
    default_jurisdiction?: string | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  },
  title = "Tenancy Agreement"
): JurisdictionLeaseAnalysis {
  const snapshot = buildPropertyComplianceSnapshot(property, org as any);
  const { context, jurisdictionId, subdivisionLabel, governingLaw } = snapshot;
  const lease = context.pack.leaseRules;

  if (jurisdictionId === "GH") {
    const gh = aiLeaseAnalyzerService.analyzeLease(text, title);
    return {
      ...gh,
      jurisdictionId,
      jurisdictionLabel: context.pack.label,
      subdivisionLabel,
      governingLaw,
      requiredClausesMissing: [],
      depositCapMonths: lease.maxSecurityDepositMonths,
      advanceRentCapMonths: lease.maxAdvanceRentMonths,
      rules: gh.rules.map((r) => ({ ...r, jurisdictionId, source: "ghana_engine" as const })),
    };
  }

  const rules: JurisdictionLeaseRule[] = [];
  let violations = 0;
  let score = 100;

  if (lease.maxAdvanceRentMonths != null) {
    const adv = checkNumericCap(
      text,
      [
        /(\d+)\s*years?\s*(?:advance|upfront)/i,
        /(\d+)\s*months?\s*(?:advance|upfront)/i,
        /(?:advance|upfront)\s*(?:rent\s*)?(?:of\s*)?(\d+)\s*months?/i,
      ],
      lease.maxAdvanceRentMonths,
      {
        id: "advance_rent_cap",
        category: "advance_rent",
        title: `Advance rent cap (${lease.maxAdvanceRentMonths} months)`,
        ghanaLawCitation: lease.statutoryReferences[0] || governingLaw,
        description: `Maximum advance rent for this market is ${lease.maxAdvanceRentMonths} months.`,
        jurisdictionId,
        source: "statute",
      }
    );
    if (adv) {
      rules.push(adv);
      if (!adv.isCompliant) {
        violations++;
        score -= 30;
      }
    }
  }

  if (lease.maxSecurityDepositMonths != null && lease.maxSecurityDepositMonths > 0) {
    const dep = checkNumericCap(
      text,
      [
        /(\d+)\s*months?\s*(?:security\s*)?deposit/i,
        /deposit\s*of\s*(\d+)\s*months?/i,
        /(?:security\s*)?deposit\s*(?:shall\s*)?not\s*exceed\s*(\d+)\s*months?/i,
      ],
      lease.maxSecurityDepositMonths,
      {
        id: "deposit_cap",
        category: "security_deposit",
        title: `Security deposit cap (${lease.maxSecurityDepositMonths} months)`,
        ghanaLawCitation: lease.statutoryReferences[0] || governingLaw,
        description: `Security deposit should not exceed ${lease.maxSecurityDepositMonths} months rent.`,
        jurisdictionId,
        source: "statute",
      }
    );
    if (dep) {
      rules.push(dep);
      if (!dep.isCompliant) {
        violations++;
        score -= 25;
      }
    }
  }

  if (lease.rentControlApplies) {
    const hasEscalation = /increase\s*(?:rent|by)\s*\d+\s*%/i.test(text);
    rules.push({
      id: "rent_control",
      category: "rent_escalation",
      title: "Rent control / escalation",
      ghanaLawCitation: lease.statutoryReferences.join("; "),
      severity: hasEscalation ? "warning" : "compliant",
      description: hasEscalation
        ? "Unilateral rent escalation detected — verify against local rent control caps."
        : "No aggressive escalation language detected.",
      suggestedRedline: hasEscalation
        ? "Rent increases subject to statutory cap and notice requirements."
        : "Compliant.",
      isCompliant: !hasEscalation,
      jurisdictionId,
      source: "subdivision",
    });
    if (hasEscalation) {
      violations++;
      score -= 15;
    }
  }

  const { missing, rules: clauseRules } = checkRequiredClauses(
    text,
    lease.requiredLeaseClauses.slice(0, 6),
    jurisdictionId
  );
  rules.push(...clauseRules);
  score -= missing.length * 5;

  const complianceGrade =
    score >= 90
      ? "A (Fully Compliant)"
      : score >= 75
        ? "B (Minor Warnings)"
        : score >= 50
          ? "C (High Risk)"
          : "F (Unlawful Clauses)";

  return {
    id: `analysis_${Date.now()}`,
    documentTitle: title,
    overallScore: Math.max(0, score),
    complianceGrade: complianceGrade as LeaseAnalysisResult["complianceGrade"],
    clausesAnalyzed: rules.length,
    violationsCount: violations + missing.length,
    rules,
    originalText: text,
    redlinedText: text,
    analyzedAt: new Date().toISOString(),
    jurisdictionId,
    jurisdictionLabel: context.pack.label,
    subdivisionLabel,
    governingLaw,
    requiredClausesMissing: missing,
    depositCapMonths: lease.maxSecurityDepositMonths,
    advanceRentCapMonths: lease.maxAdvanceRentMonths,
  };
}

export const jurisdictionLeaseAnalyzerService = {
  analyzeLeaseForProperty,
};
