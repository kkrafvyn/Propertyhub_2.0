import React, { useState } from "react";
import { useParams } from "react-router";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  FileText,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { useSurface } from "../../context/SurfaceContext";

export function DataImportExport() {
  const { organizationSlug = "default" } = useParams();
  const { isDesktop } = useSurface();
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleDesktopImport = async () => {
    const api = (window as unknown as { desktopAPI?: { openImportFile?: () => Promise<{ success: boolean; filePath?: string }> } }).desktopAPI;
    if (api?.openImportFile) {
      const res = await api.openImportFile();
      if (res.success && res.filePath) {
        setImportStatus(`Successfully parsed ${res.filePath}`);
      }
    } else {
      setImportStatus("Desktop import is only available in the BaytMiftah desktop app. Use a CSV template upload when available.");
    }
  };

  const importTypes = [
    { title: "Estate, Building & Unit Inventory", format: "Excel / CSV", desc: "Upload property portfolios, unit layouts, sqm, and amenities." },
    { title: "Active Leases & Tenant Roster", format: "CSV Template", desc: "Import current active tenants, contact phones, rent amounts, and deposit balances." },
    { title: "Historical Ledger & Opening Balances", format: "Accounting CSV", desc: "Set opening balances, past tenant arrears, and security deposit escrow totals." },
    { title: "Vendor & Contractor Directory", format: "CSV Template", desc: "Import pre-approved technicians, bank accounts, and negotiated rate cards." },
  ];

  const exportTypes = [
    { title: "Complete General Ledger & Trial Balance", format: "Excel / CSV / GAAP", desc: "Double-entry journal records, revenue recognition, and account reconciliation." },
    { title: "Rent Roll & Arrears Aging Report", format: "PDF / Excel", desc: "Detailed breakdown of monthly rent roll collections vs overdue balances." },
    { title: "Landlord Net Distribution Statements", format: "PDF / Excel", desc: "Gross collections minus management fees, maintenance disbursements, and withholding tax." },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Data Import & Export
            </h1>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
              Files & Reports
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Easily import property portfolios and tenant rosters or export financial records into Excel, QuickBooks, and Sage.
          </p>
        </div>
      </div>

      {importStatus && (
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Import Section */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>Import Templates & Data Uploads</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {importTypes.map((imp) => (
            <div key={imp.title} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground">{imp.title}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {imp.format}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{imp.desc}</p>
              <div className="pt-2 flex items-center justify-between">
                <button className="text-[11px] text-emerald-400 hover:underline">Download CSV Template</button>
                <button
                  onClick={handleDesktopImport}
                  className="flex items-center gap-1.5 px-3 py-1 bg-secondary hover:bg-secondary/70 text-foreground text-xs font-semibold rounded-lg border border-border transition"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Choose File to Import</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
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
                </div>
                <p className="text-xs text-muted-foreground">{exp.desc}</p>
              </div>
              <div className="pt-3">
                <button className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow">
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
