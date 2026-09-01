import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Sparkles,
  ArrowRight,
  Command,
  FileText,
  Building,
  CreditCard,
  Wrench,
  ShieldCheck,
  Scale,
  CheckSquare,
  AlertOctagon,
  FolderTree,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";

interface CommandOption {
  id: string;
  title: string;
  category: "Navigation" | "Financial Action" | "Maintenance" | "Leasing" | "AI Command";
  slug?: string;
  icon: React.ElementType;
  action?: () => void;
  keywords: string[];
}

export function UniversalCommandBar({
  workspaceBasePath,
  onClose,
}: {
  workspaceBasePath?: string;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const COMMANDS: CommandOption[] = [
    {
      id: "nav-approvals",
      title: "Open Approval Center",
      category: "Navigation",
      slug: "approval-center",
      icon: CheckSquare,
      keywords: ["approve", "approval", "pending", "authorizations", "po", "orders"],
    },
    {
      id: "nav-exceptions",
      title: "Open Exception & SLA Center",
      category: "Navigation",
      slug: "exception-center",
      icon: AlertOctagon,
      keywords: ["exceptions", "sla", "broken", "breaches", "overdue", "incident"],
    },
    {
      id: "nav-coa",
      title: "View Chart of Accounts",
      category: "Navigation",
      slug: "chart-of-accounts",
      icon: FolderTree,
      keywords: ["coa", "chart of accounts", "ledger", "accounts", "asset", "liability"],
    },
    {
      id: "nav-journal",
      title: "Create / Post Journal Entry",
      category: "Navigation",
      slug: "journal-entries",
      icon: FileSpreadsheet,
      keywords: ["journal", "entry", "debit", "credit", "post", "double entry"],
    },
    {
      id: "nav-financial-statements",
      title: "View Financial Reports (P&L / Balance Sheet / Trial Balance)",
      category: "Navigation",
      slug: "financial-statements",
      icon: Scale,
      keywords: ["p&l", "profit", "loss", "balance sheet", "trial balance", "statement"],
    },
    {
      id: "nav-collections",
      title: "Manage Collections & Promises-to-Pay",
      category: "Navigation",
      slug: "collections-cases",
      icon: AlertOctagon,
      keywords: ["collections", "ptp", "promise", "arrears", "overdue", "debt"],
    },
    {
      id: "nav-owner-payouts",
      title: "Execute Owner Rental Waterfall Disbursements",
      category: "Navigation",
      slug: "owner-disbursements",
      icon: CreditCard,
      keywords: ["owner", "payout", "disburse", "waterfall", "commission", "tax", "gra"],
    },
    {
      id: "nav-leases",
      title: "Review Lease Applications & Screening",
      category: "Navigation",
      slug: "leasing-applications",
      icon: FileText,
      keywords: ["lease", "applicant", "screening", "application", "tenant"],
    },
    {
      id: "nav-esignature",
      title: "Send / Track eSignature Contracts",
      category: "Navigation",
      slug: "esignature",
      icon: FileText,
      keywords: ["esign", "signature", "envelope", "contract", "docusign"],
    },
    {
      id: "nav-procurement",
      title: "Open Procurement Center & 3-Way Match",
      category: "Navigation",
      slug: "procurement",
      icon: CreditCard,
      keywords: ["po", "procurement", "purchase order", "invoice match", "grn"],
    },
    {
      id: "nav-my-work",
      title: "Open My Work Queue",
      category: "Navigation",
      slug: "my-work",
      icon: CheckSquare,
      keywords: ["my work", "queue", "todo", "approvals", "exceptions"],
    },
    {
      id: "action-unpaid-rent",
      title: "Show unpaid rent / collections cases",
      category: "Financial Action",
      slug: "collections-cases",
      icon: CreditCard,
      keywords: ["unpaid", "rent", "arrears", "overdue", "show unpaid"],
    },
    {
      id: "nav-maintenance",
      title: "Maintenance Work Orders & Dispatch",
      category: "Navigation",
      slug: "maintenance",
      icon: Wrench,
      keywords: ["maintenance", "work order", "ticket", "contractor", "repair"],
    },
  ];

  const filtered = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleExecute = (cmd: CommandOption) => {
    if (cmd.slug && workspaceBasePath) {
      navigate(`${workspaceBasePath}/${cmd.slug}`);
    } else if (cmd.action) {
      cmd.action();
    }
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleExecute(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <Card
        className="w-full max-w-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-surface-border flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a natural command, task, or module (e.g. 'Show unpaid rent', 'Chart of accounts')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-ink placeholder:text-ink-muted text-sm outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-1 bg-surface-subtle border border-surface-border rounded text-ink-muted">
            ESC
          </kbd>
          {onClose && (
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-hover"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-surface-border p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">
              No matching commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-surface-hover/60 text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-surface-subtle border border-surface-border text-ink-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm">{cmd.title}</div>
                      <div className="text-[11px] text-ink-muted font-normal">
                        {cmd.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? "translate-x-1 opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="bg-surface-subtle/50 px-4 py-2 text-[11px] text-ink-muted flex justify-between items-center border-t border-surface-border">
          <span className="flex items-center gap-2">
            <span>Navigate with ↑ ↓</span>
            <span>•</span>
            <span>Select with Enter</span>
          </span>
          <span className="font-mono text-primary font-medium">BaytMiftah Universal Command</span>
        </div>
      </Card>
    </div>
  );
}
