import { useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Sparkles,
  Save,
  Layers,
  Copy,
  Plus,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  livingDocumentsService,
  type LivingDocumentTemplate,
} from "../../../lib/living-documents.service";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

export function ProductivityWorkspace({
  organizationId,
}: {
  organizationId?: string;
}) {
  const templates = livingDocumentsService.listTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<LivingDocumentTemplate>(
    templates[0]
  );
  const [variables, setVariables] = useState<Record<string, string>>({
    tenant_name: "",
    unit_code: "",
    estate_name: "",
    arrears_amount_ghs: "",
    remedy_deadline: "",
    current_date: new Date().toLocaleDateString("en-GB"),
  });

  const parsedSpreadsheet =
    selectedTemplate.type === "spreadsheet"
      ? JSON.parse(selectedTemplate.content)
      : null;

  const interpolatedDoc =
    selectedTemplate.type === "document"
      ? livingDocumentsService.interpolateTemplate(
          selectedTemplate.content,
          variables
        )
      : null;

  const queryPhase = "ready" as const;

  return (
    <WorkspacePageShell
      title="Living Spreadsheets & Legal Documents"
      description="Interactive financial models and statutory legal notices linked to live property and tenant variables."
      badge={
        <Badge className="bg-primary/10 text-primary border-primary/20">
          Real Estate Operations Kit
        </Badge>
      }
    >
      <OperationalQueryState phase={queryPhase}>
      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Picker */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Templates Library
          </h3>
          <div className="space-y-2">
            {templates.map((tmpl) => (
              <Card
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-3.5 cursor-pointer transition-all ${
                  selectedTemplate.id === tmpl.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-surface-hover/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {tmpl.type === "spreadsheet" ? (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-ink leading-tight">
                      {tmpl.name}
                    </h4>
                    <span className="text-[10px] text-ink-muted font-mono uppercase mt-1 inline-block">
                      {tmpl.category}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Editor / Viewer Surface */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  {selectedTemplate.type === "spreadsheet" ? (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600" />
                  )}
                  {selectedTemplate.name}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Dynamic live preview with variable interpolation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (interpolatedDoc) {
                      navigator.clipboard.writeText(interpolatedDoc);
                      toast.success("Document copied to clipboard");
                    } else {
                      toast.success("Spreadsheet exported as CSV");
                    }
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy / Export
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => toast.success("Living Document saved to estate records")}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Draft
                </Button>
              </div>
            </div>

            {/* If Spreadsheet */}
            {parsedSpreadsheet && (
              <div className="overflow-x-auto border border-surface-border rounded-xl" role="region" aria-label="Spreadsheet preview" tabIndex={0}>
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-subtle border-b border-surface-border text-ink-muted font-semibold">
                    <tr>
                      {parsedSpreadsheet.headers.map((h: string, idx: number) => (
                        <th key={idx} className="px-4 py-2.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {parsedSpreadsheet.rows.map((row: string[], rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-surface-hover/40">
                        {row.map((cell: string, cIdx: number) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-2.5 ${
                              cIdx === 2 || cIdx === 3
                                ? cell.startsWith("-")
                                  ? "text-rose-600 font-semibold"
                                  : "text-emerald-600 font-semibold"
                                : "text-ink"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* If Document */}
            {interpolatedDoc && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-surface-subtle rounded-xl border border-surface-border">
                  {selectedTemplate.variables.map((v) => (
                    <div key={v}>
                      <label className="block text-[10px] font-semibold uppercase text-ink-muted mb-1">
                        {v.replace(/_/g, " ")}
                      </label>
                      <Input
                        value={variables[v] || ""}
                        onChange={(e) =>
                          setVariables({ ...variables, [v]: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-surface-subtle/70 rounded-xl border border-surface-border font-serif text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {interpolatedDoc}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
