import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleHelp, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useAuth } from "../../context/AuthContext";
import {
  getTutorialDefinition,
  getTutorialStorageKey,
  resolveTutorialRole,
  type TutorialRole,
} from "../../../lib/tutorials";

type TutorialStatus = "role" | "intro" | "tour" | "complete";

type StoredTutorial = {
  status: "skipped" | "complete";
  role: TutorialRole;
  checklist: boolean[];
};

const ONBOARDING_PATHS: Array<{
  role: TutorialRole;
  label: string;
  description: string;
  workspaceKind?: "personal" | "company";
}> = [
  {
    role: "consumer",
    label: "Resident",
    description: "Search for homes, save listings, book viewings, and manage your property journey.",
  },
  {
    role: "property_owner",
    label: "Owner",
    description: "Set up a personal workspace to manage your own properties and residents.",
    workspaceKind: "personal",
  },
  {
    role: "organization_owner",
    label: "Enterprise",
    description: "Apply to set up a company workspace for an agency, developer, or property team.",
    workspaceKind: "company",
  },
];

function readStoredTutorial(userId: string): StoredTutorial | null {
  try {
    const value = localStorage.getItem(getTutorialStorageKey(userId));
    return value ? (JSON.parse(value) as StoredTutorial) : null;
  } catch {
    return null;
  }
}

function writeStoredTutorial(userId: string, value: StoredTutorial) {
  try {
    localStorage.setItem(getTutorialStorageKey(userId), JSON.stringify(value));
  } catch {
    // On restricted browsers the tutorial remains available for this session.
  }
}

export function NewUserTutorial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role } = useAuth();
  const isWorkspaceRoute = location.pathname.startsWith("/workspace");
  const [status, setStatus] = useState<TutorialStatus | null>(null);
  const [selectedRole, setSelectedRole] = useState<TutorialRole | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([]);

  const detectedRole = useMemo(() => {
    if (profile?.is_platform_admin || profile?.is_platform_manager) return "platform_admin" as const;
    return resolveTutorialRole(role);
  }, [profile?.is_platform_admin, profile?.is_platform_manager, role]);

  const definition = selectedRole ? getTutorialDefinition(selectedRole) : null;
  const step = definition?.steps[stepIndex] || null;

  useEffect(() => {
    if (!user) {
      setStatus(null);
      return;
    }

    const stored = readStoredTutorial(user.id);
    if (stored) {
      setSelectedRole(stored.role);
      setChecklist(stored.checklist);
      setStatus(null);
      return;
    }

    if (detectedRole && detectedRole !== "consumer") {
      const definitionForRole = getTutorialDefinition(detectedRole);
      const emptyChecklist = Array(definitionForRole.checklist.length).fill(false);

      if (detectedRole === "platform_admin" || isWorkspaceRoute) {
        writeStoredTutorial(user.id, {
          status: "skipped",
          role: detectedRole,
          checklist: emptyChecklist,
        });
        setSelectedRole(detectedRole);
        setChecklist(emptyChecklist);
        setStatus(null);
        return;
      }

      setSelectedRole(detectedRole);
      setChecklist(emptyChecklist);
      setStatus("intro");
      return;
    }

    setStatus("role");
  }, [detectedRole, isWorkspaceRoute, user]);

  if (!user || !status) return null;

  if (isWorkspaceRoute && status !== "role") {
    return null;
  }

  const closeTutorial = () => setStatus(null);

  const saveAndClose = (nextStatus: "skipped" | "complete", roleToSave: TutorialRole, nextChecklist: boolean[]) => {
    if (user) writeStoredTutorial(user.id, { status: nextStatus, role: roleToSave, checklist: nextChecklist });
    setStatus(null);
  };

  const chooseRole = (nextRole: TutorialRole) => {
    setSelectedRole(nextRole);
    setChecklist(Array(getTutorialDefinition(nextRole).checklist.length).fill(false));
    setStepIndex(0);
    setStatus("intro");
  };

  const chooseOnboardingPath = (path: (typeof ONBOARDING_PATHS)[number]) => {
    if (!path.workspaceKind) {
      chooseRole(path.role);
      return;
    }

    // Workspace access is granted only through its enrollment and verification flow.
    // This selection simply sends the person to the appropriate onboarding form.
    writeStoredTutorial(user.id, {
      status: "skipped",
      role: path.role,
      checklist: Array(getTutorialDefinition(path.role).checklist.length).fill(false),
    });
    navigate(`/workspace?kind=${path.workspaceKind}`);
  };

  const completeTutorial = () => {
    if (!selectedRole || !definition) return;
    writeStoredTutorial(user.id, { status: "complete", role: selectedRole, checklist });
    setStatus("complete");
  };

  const toggleChecklist = (index: number) => {
    if (!selectedRole || !definition) return;
    const nextChecklist = checklist.map((item, itemIndex) => (itemIndex === index ? !item : item));
    setChecklist(nextChecklist);
    writeStoredTutorial(user.id, { status: "complete", role: selectedRole, checklist: nextChecklist });
  };

  const restart = () => {
    if (!selectedRole) return;
    setStepIndex(0);
    setStatus("intro");
  };

  if (status === "role") {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) closeTutorial(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to BaytMiftah</DialogTitle>
            <DialogDescription>
              Choose where you want to start. You can add workspace access later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {ONBOARDING_PATHS.map((path) => (
              <button
                key={path.role}
                type="button"
                onClick={() => chooseOnboardingPath(path)}
                className="rounded-xl border border-surface-border bg-surface-subtle p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <span className="font-semibold text-ink">{path.label}</span>
                <span className="mt-1 block text-sm text-ink-secondary">{path.description}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setStatus(null)}>
              Skip for now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!definition || !step || !selectedRole) return null;

  if (status === "complete") {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
        <Card className="mx-auto max-w-2xl border-emerald-500/30 bg-surface p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Check className="h-6 w-6" /></div><h2 className="text-3xl font-bold text-ink">You're ready.</h2><p className="mt-2 text-ink-secondary">{definition.completion}</p></div><button type="button" onClick={closeTutorial} className="rounded-full p-2 text-ink-secondary hover:bg-surface-hover" aria-label="Close tutorial"><X className="h-5 w-5" /></button></div>
          <div className="mt-6 rounded-xl border border-surface-border bg-surface-subtle p-4"><h3 className="font-semibold text-ink">Getting Started</h3><div className="mt-3 space-y-2">{definition.checklist.map((item, index) => <button key={item} type="button" onClick={() => toggleChecklist(index)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${checklist[index] ? "border-emerald-600 bg-emerald-600 text-white" : "border-surface-border"}`}>{checklist[index] ? <Check className="h-3.5 w-3.5" /> : null}</span><span className={checklist[index] ? "text-ink-secondary line-through" : "text-ink"}>{item}</span></button>)}</div></div>
          <div className="mt-6 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={restart}><RotateCcw className="mr-2 h-4 w-4" />Restart tutorial</Button><Button onClick={closeTutorial}>Use BaytMiftah</Button></div>
        </Card>
      </div>
    );
  }

  if (status === "intro") {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
        <Card className="mx-auto max-w-2xl border-surface-border bg-surface p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Personalized tutorial</p><h2 className="text-3xl font-bold text-ink">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h2><p className="mt-2 text-lg text-ink-secondary">{definition.label.replace("I'm ", "")}</p><p className="mt-4 text-ink-secondary">{definition.intro}</p></div><button type="button" onClick={() => saveAndClose("skipped", selectedRole, checklist)} className="rounded-full p-2 text-ink-secondary hover:bg-surface-hover" aria-label="Close tutorial"><X className="h-5 w-5" /></button></div><label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-surface-border bg-surface-subtle p-4"><input type="checkbox" checked={practiceMode} onChange={(event) => setPracticeMode(event.target.checked)} className="h-4 w-4 accent-primary" /><span><span className="block font-semibold text-ink">Practice mode</span><span className="block text-sm text-ink-secondary">Use safe sample workflows where available. Nothing is sent to production.</span></span></label><div className="mt-6 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => saveAndClose("skipped", selectedRole, checklist)}>Skip for now</Button><Button onClick={() => setStatus("tour")}><Play className="mr-2 h-4 w-4" />Start tutorial</Button></div></Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
      <Card className="mx-auto max-w-2xl border-surface-border bg-surface p-6 shadow-2xl sm:p-8"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-sm font-semibold text-ink-secondary"><span>Step {stepIndex + 1} of {definition.steps.length}</span>{practiceMode ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Practice mode</span> : null}</div><button type="button" onClick={() => saveAndClose("skipped", selectedRole, checklist)} className="rounded-full p-2 text-ink-secondary hover:bg-surface-hover" aria-label="Close tutorial"><X className="h-5 w-5" /></button></div><div className="mt-8"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div><h2 className="text-3xl font-bold text-ink">{step.title}</h2><p className="mt-3 text-lg leading-8 text-ink-secondary">{step.description}</p>{step.target ? <Button variant="outline" className="mt-6" onClick={() => navigate(step.target!)}>{step.actionLabel || "Open this area"}<ChevronRight className="ml-2 h-4 w-4" /></Button> : null}</div><div className="mt-8 h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((stepIndex + 1) / definition.steps.length) * 100}%` }} /></div><div className="mt-6 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>{stepIndex === definition.steps.length - 1 ? <Button onClick={completeTutorial}><Check className="mr-2 h-4 w-4" />Finish tutorial</Button> : <Button onClick={() => setStepIndex((index) => index + 1)}>Next<ChevronRight className="ml-2 h-4 w-4" /></Button>}</div></Card>
    </div>
  );
}

export function GettingStartedChecklist() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stored, setStored] = useState<StoredTutorial | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(`bm_checklist_dismissed_${user.id}`) === "true") {
        setDismissed(true);
        return;
      }
    } catch {}
    setStored(readStoredTutorial(user.id));
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    if (user) {
      try {
        localStorage.setItem(`bm_checklist_dismissed_${user.id}`, "true");
      } catch {}
    }
  };

  if (!user || !stored || dismissed) return null;
  const definition = getTutorialDefinition(stored.role);

  if (stored.status === "skipped") {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Card className="flex items-center gap-2 border-surface-border bg-surface/95 p-3 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(getTutorialStorageKey(user.id));
                localStorage.removeItem(`bm_checklist_dismissed_${user.id}`);
              } catch {}
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <CircleHelp className="h-4 w-4" />
            Restart your tutorial
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1 text-ink-secondary hover:bg-surface-hover hover:text-ink"
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      </div>
    );
  }

  const completedCount = stored.checklist.filter(Boolean).length;
  const totalCount = definition.checklist.length;
  const isAllComplete = completedCount >= totalCount;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-3 duration-200">
      <Card className="border-surface-border bg-surface/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Getting Started</p>
            <p className="text-xs text-ink-secondary">
              {completedCount}/{totalCount} complete
              {isAllComplete ? " · Done 🎉" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-full p-1.5 text-ink-secondary hover:bg-surface-hover hover:text-ink"
              aria-label="Toggle getting started checklist"
              title={open ? "Collapse" : "View checklist"}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-ink-secondary hover:bg-surface-hover hover:text-ink"
              aria-label="Close and dismiss getting started"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
            {definition.checklist.map((item, index) => (
              <div key={item} className="flex items-center gap-2 text-sm text-ink">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    stored.checklist[index]
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-surface-border"
                  }`}
                >
                  {stored.checklist[index] ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className={stored.checklist[index] ? "text-ink-secondary line-through" : ""}>
                  {item}
                </span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-surface-border/50">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(getTutorialStorageKey(user.id));
                    localStorage.removeItem(`bm_checklist_dismissed_${user.id}`);
                  } catch {}
                  window.location.reload();
                }}
                className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Restart tutorial
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
