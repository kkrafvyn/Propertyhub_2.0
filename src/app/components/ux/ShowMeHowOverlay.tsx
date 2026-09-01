import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  HelpCircle,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { SHOW_ME_HOW_TOURS, type ShowMeHowTour } from "../../../lib/show-me-how-tours";

export function ShowMeHowOverlay({
  currentModule,
  onClose,
}: {
  currentModule?: string;
  onClose: () => void;
}) {
  const [selectedTour, setSelectedTour] = useState<ShowMeHowTour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentModule) {
      const match = SHOW_ME_HOW_TOURS.find((t) => t.moduleRoute === currentModule);
      if (match) {
        setSelectedTour(match);
        setCurrentStepIndex(0);
      }
    }
  }, [currentModule]);

  const handleNext = () => {
    if (!selectedTour) return;
    if (currentStepIndex < selectedTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setSelectedTour(null);
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!selectedTour) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <Card className="w-full max-w-xl bg-surface border border-surface-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-ink">Show Me How — Interactive Guides</h2>
            </div>
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-ink-muted">
            Select a guided interactive walkthrough. Step-by-step pointers will guide you through the exact workflow on screen.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {SHOW_ME_HOW_TOURS.map((tour) => (
              <div
                key={tour.id}
                onClick={() => {
                  setSelectedTour(tour);
                  setCurrentStepIndex(0);
                }}
                className="p-4 rounded-xl border border-surface-border bg-surface-subtle hover:bg-surface-hover/80 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                    {tour.title}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">{tour.description}</p>
                </div>
                <Play className="w-4 h-4 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const step = selectedTour.steps[currentStepIndex];

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-96 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 duration-200">
      <Card className="p-5 bg-surface border-2 border-primary shadow-2xl rounded-2xl space-y-4">
        <div className="flex items-start justify-between gap-2 border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
              Step {currentStepIndex + 1} of {selectedTour.steps.length}
            </Badge>
            <span className="text-xs font-semibold text-ink-muted truncate max-w-[160px]">
              {selectedTour.title}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedTour(null);
              onClose();
            }}
            className="text-ink-muted hover:text-ink p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-bold text-ink text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {step.title}
          </h4>
          <p className="text-xs text-ink leading-relaxed">{step.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="text-xs h-8 px-2.5"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            className="text-xs h-8 px-3"
          >
            {currentStepIndex === selectedTour.steps.length - 1 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Finish Tour
              </>
            ) : (
              <>
                Next Step
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
