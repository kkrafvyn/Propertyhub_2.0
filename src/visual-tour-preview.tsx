import React from "react";
import { createRoot } from "react-dom/client";
import { Property3DTour } from "./app/components/baytmiftah/Property3DTour";
import "./styles/index.css";

function TourVisualFixture() {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-2xl font-bold tracking-tight text-primary">BaytMiftah</span>
          <span className="rounded-full border border-amber-600/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">
            QA component preview
          </span>
        </div>
        <h1 className="mb-2 font-serif text-3xl text-ink sm:text-4xl">Interactive property walkthrough</h1>
        <p className="mb-6 max-w-2xl text-sm text-ink-secondary sm:text-base">
          Actual component rendered by BaytMiftah on this development branch. The model ID below
          is a test fixture, not a published or verified property scan.
        </p>
        <Property3DTour
          propertyName="Demo property (sample scan URL)"
          tourUrl="https://my.matterport.com/show/?m=AbCdEf12345"
        />
        <div className="mt-5 rounded-xl border border-surface-border bg-surface p-4 text-sm text-ink-secondary">
          Owners and agencies set the real tour URL when creating or editing a property.
          Listings without a valid tour URL do not display this section.
        </div>
      </div>
    </div>
  );
}

const element = document.getElementById("root");
if (element) createRoot(element).render(<TourVisualFixture />);
