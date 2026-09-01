export interface LivingDocumentTemplate {
  id: string;
  name: string;
  category: "BUDGET_SPREADSHEET" | "LEGAL_NOTICE" | "OWNER_REPORT" | "TENANCY_ADDENDUM";
  type: "spreadsheet" | "document";
  variables: string[];
  content: string;
}

export const STANDARD_TEMPLATES: LivingDocumentTemplate[] = [
  {
    id: "tmpl-estate-budget",
    name: "Annual Estate Operating Budget & CAPEX Model",
    category: "BUDGET_SPREADSHEET",
    type: "spreadsheet",
    variables: ["estate_name", "gross_revenue", "management_fee_pct", "maintenance_budget", "gra_tax_rate"],
    content: JSON.stringify({
      headers: ["Line Item Code", "Description", "Annual Budget (GHS)", "Monthly Allocation (GHS)", "Notes"],
      rows: [
        ["4010", "Gross Rental Income", "960,000", "80,000", "Based on 12 units"],
        ["5010", "Property Management Fee (10%)", "-96,000", "-8,000", "Contracted rate"],
        ["5020", "Facilities & Preventative Maintenance", "-72,000", "-6,000", "Generator, pool, security"],
        ["5030", "Statutory GRA Rent Tax (8%)", "-76,800", "-6,400", "Remitted to Ghana Revenue Authority"],
        ["2000", "Net Owner Payout Reserve", "715,200", "59,600", "Calculated residual"],
      ],
    }),
  },
  {
    id: "tmpl-act220-notice",
    name: "Formal Notice to Remedy Rent Arrears (Rent Act 1963 / Act 220)",
    category: "LEGAL_NOTICE",
    type: "document",
    variables: ["tenant_name", "unit_code", "estate_name", "arrears_amount_ghs", "remedy_deadline"],
    content: `FORMAL NOTICE OF RENT ARREARS

To: {{tenant_name}}
Unit: {{unit_code}}, {{estate_name}}
Date: {{current_date}}

Dear {{tenant_name}},

RE: DEMAND FOR PAYMENT OF OUTSTANDING RENT ARREARS

Please be advised that as of today's date, your rental account for {{unit_code}} has an outstanding arrears balance of GHS {{arrears_amount_ghs}}.

In accordance with the Tenancy Agreement and the statutory provisions of the Rent Act of Ghana (Act 220), you are hereby requested to remedy this default within 14 calendar days (on or before {{remedy_deadline}}).

Payment can be settled immediately via Pay Angels Mobile Money / Card checkout on the BaytMiftah resident portal.

Failure to settle or establish an authorized Promise-to-Pay will lead to formal recovery proceedings.

Yours faithfully,
Estate Operations & Collections Management
BaytMiftah REOS`,
  },
];

export const livingDocumentsService = {
  listTemplates(): LivingDocumentTemplate[] {
    return STANDARD_TEMPLATES;
  },

  interpolateTemplate(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), val);
    }
    return result;
  },
};
