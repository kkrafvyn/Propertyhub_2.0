import React from "react";
import { Link, useParams } from "react-router";
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { IMPORT_FORMATS_LABEL } from "../../../lib/document-import";

const FORMAT_BADGE = "CSV · Excel · JSON · XML · Word · PDF";

export function DataImportExport() {
  const { organizationSlug = "default" } = useParams();
  const base = `/workspace/${organizationSlug}`;

  const importTypes = [
    {
      title: "Estate, Building & Unit Inventory",
      desc: "Upload property portfolios, unit layouts, sqm, and amenities.",
      href: `${base}/data-migration`,
      templateHint: "estate_name, unit_identifier, block, floor",
    },
    {
      title: "Active Leases & Tenant Roster",
      desc: "Import occupancies: tenant emails, roles, and start dates per unit.",
      href: `${base}/data-migration`,
      templateHint: "estate_name, unit_identifier, user_email, role, start_date",
    },
    {
      title: "Historical Ledger & Opening Balances",
      desc: "Set opening balances and past tenant arrears before go-live billing.",
      href: `${base}/opening-balances`,
      templateHint: "estate_name, unit_identifier, amount, due_date, charge_type, description",
    },
    {
      title: "Payment & Receipt History",
      desc: "Import historic receipts and bank transfers with charge allocations.",
      href: `${base}/payment-import`,
      templateHint: "estate_name, unit_identifier, charge_id, amount, method, reference",
    },
    {
      title: "Bank Statement Lines",
      desc: "Upload exported bank transactions for reconciliation.",
      href: `${base}/bank-reconciliation`,
      templateHint: "date, description, amount, type, reference",
    },
  ];

  const exportTypes = [
    { title: "Complete General Ledger & Trial Balance", format: "CSV export", desc: "From General Ledger and Financial Reports.", href: `${base}/general-ledger` },
    { title: "Rent Roll & Arrears Aging Report", format: "CSV / PDF", desc: "From Estate Finance receivables export.", href: `${base}/estate-finance` },
    { title: "Landlord Net Distribution Statements", format: "CSV / PDF", desc: "From Owner Statements.", href: `${base}/owner-statements` },
  ];

  const downloadTemplate = (headers: string, fileName: string) => {
    const blob = new Blob([`${headers}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Data Import & Export</h1>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
              {FORMAT_BADGE}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Imports accept {IMPORT_FORMATS_LABEL}. Save Excel as .xlsx or export from Google Sheets — same column headers as CSV templates.
          </p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
        <span>
          Use the first worksheet row for column headers. Dates and amounts from Excel are read as text automatically.
          For occupancies, switch to <strong className="text-foreground">Occupancy History</strong> on Data Migration before upload.
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>Import Templates & Data Uploads</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {importTypes.map((imp) => (
            <div key={imp.title} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-foreground">{imp.title}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                  {FORMAT_BADGE}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{imp.desc}</p>
              <p className="text-[10px] font-mono text-muted-foreground truncate" title={imp.templateHint}>
                Headers: {imp.templateHint}
              </p>
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplate(imp.templateHint, `${imp.title.toLowerCase().replace(/\s+/g, "-")}-template.csv`)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Download CSV template
                </button>
                <Link
                  to={imp.href}
                  className="flex items-center gap-1.5 px-3 py-1 bg-secondary hover:bg-secondary/70 text-foreground text-xs font-semibold rounded-lg border border-border transition"
                >
                  <span>Open import</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>Accounting &amp; Management Data Exports</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportTypes.map((exp) => (
            <div key={exp.title} className="bg-card border border-border rounded-xl p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-foreground">{exp.title}</h3>
                  <span className="text-[10px] text-muted-foreground">{exp.format}</span>
                </div>
                <p className="text-xs text-muted-foreground">{exp.desc}</p>
              </div>
              <div className="pt-3">
                <Link
                  to={exp.href}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Go to export</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
