import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Upload, Sparkles, FileText, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { sopKnowledgeService, type SopAnswer, type SopDocument } from "../../../lib/sop-knowledge.service";
import { useAuth } from "../../context/AuthContext";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

export function CompanyKnowledgeHub({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<SopAnswer | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Operations");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      setDocuments(await sopKnowledgeService.listDocuments(organizationId));
    } catch (error) {
      console.error(error);
      const message = "Unable to load SOP documents. Apply the latest migration first.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !question.trim()) return;
    try {
      setAsking(true);
      setAnswer(await sopKnowledgeService.ask(organizationId, question.trim()));
    } catch (error) {
      console.error(error);
      toast.error("Unable to search the knowledge base.");
    } finally {
      setAsking(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !newTitle.trim() || !newContent.trim()) return;
    try {
      setSaving(true);
      await sopKnowledgeService.createDocument({
        organizationId,
        title: newTitle,
        category: newCategory,
        content: newContent,
        createdBy: user?.id,
      });
      setNewTitle("");
      setNewContent("");
      toast.success("Document indexed into the organization knowledge base.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      title="Company SOP & Knowledge AI Hub"
      description="Upload organizational handbooks and policies. Search stays inside this organization; PII is redacted from queries."
      badge={
        <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          Strict Organization Boundary
        </Badge>
      }
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void load()}
      >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Ask Company Knowledge
            </h2>
            <form onSubmit={handleAsk} className="space-y-3">
              <div className="relative">
                <Input
                  required
                  placeholder="e.g. How do we handle emergency weekend plumbing repairs?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="pr-24 text-sm"
                />
                <Button type="submit" variant="primary" size="sm" disabled={asking} className="absolute right-1 top-1 h-8 text-xs">
                  {asking ? "Searching…" : "Ask SOP"}
                </Button>
              </div>
            </form>
            {answer ? (
              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-3">
                <div className="font-semibold text-ink text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  SOP response
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                {answer.citations.length > 0 ? (
                  <ul className="text-xs text-primary space-y-0.5">
                    {answer.citations.map((c) => (
                      <li key={c.documentId} className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {c.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-ink">Indexed documents ({documents.length})</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-ink-muted">No SOPs uploaded yet.</p>
            ) : (
              <div className="divide-y divide-surface-border border border-surface-border rounded-xl overflow-hidden">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface-subtle border border-surface-border text-primary">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-ink text-sm">{doc.title}</div>
                        <div className="text-xs text-ink-muted mt-0.5">
                          {doc.category} · {doc.size_kb} KB · {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px]">{doc.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Upload SOP
          </h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <Input required placeholder="Document title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="text-xs" />
            <NativeSelectControl
              className="w-full px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-ink text-xs"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option>Maintenance SOP</option>
              <option>Finance & Legal</option>
              <option>Estate Operations</option>
              <option>Leasing & Screening</option>
              <option>Operations</option>
            </NativeSelectControl>
            <Textarea
              required
              className="w-full min-h-[140px] rounded-lg border border-surface-border bg-background px-3 py-2 text-xs"
              placeholder="Paste policy text to index…"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <Button type="submit" variant="primary" size="sm" className="w-full" disabled={saving}>
              {saving ? "Indexing…" : "Upload & Index"}
            </Button>
          </form>
        </Card>
      </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
