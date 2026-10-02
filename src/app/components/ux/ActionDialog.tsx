import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { TextareaField } from "../ui/TextareaField";

export type ActionDialogTone = "default" | "destructive";

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: ActionDialogTone;
  notesLabel?: string;
  notesPlaceholder?: string;
  notesRequired?: boolean;
  notes?: string;
  onNotesChange?: (value: string) => void;
  pending?: boolean;
  onConfirm: () => Promise<void> | void;
}

export function ActionDialog({
  open, onOpenChange, title, description, confirmLabel, tone = "default",
  notesLabel, notesPlaceholder, notesRequired = false, notes, onNotesChange,
  pending = false, onConfirm,
}: ActionDialogProps) {
  const confirmDisabled = pending || (notesRequired && !notes?.trim());

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8 text-left">
            <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`} aria-hidden="true">
              <AlertTriangle className="size-5" />
            </span>
            <div className="space-y-2">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="leading-relaxed">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {notesLabel ? (
          <TextareaField
            label={`${notesLabel}${notesRequired ? " *" : ""}`}
            value={notes || ""}
            onChange={(event) => onNotesChange?.(event.target.value)}
            placeholder={notesPlaceholder}
            required={notesRequired}
            aria-required={notesRequired}
            rows={4}
            autoFocus
            description={notesRequired ? "A reason is required for the audit record." : undefined}
          />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant={tone === "destructive" ? "destructive" : "primary"} onClick={() => void onConfirm()} disabled={confirmDisabled}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
