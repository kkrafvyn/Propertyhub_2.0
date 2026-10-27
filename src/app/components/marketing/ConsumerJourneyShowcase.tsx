import { useState } from "react";
import {
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Headphones,
  Home,
  MessageCircle,
  Scale,
  Search,
} from "lucide-react";
import { appPath } from "../../../lib/marketing-urls";

const PROPERTY_A =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80";
const PROPERTY_B =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

const STEPS = [
  {
    id: "discover",
    label: "Discover",
    hint: "Search smart. Find what fits.",
    icon: Search,
  },
  {
    id: "compare",
    label: "Compare",
    hint: "Compare properties side by side.",
    icon: Scale,
  },
  {
    id: "view",
    label: "View",
    hint: "View details, photos, and locations.",
    icon: Eye,
  },
  {
    id: "apply",
    label: "Apply / Offer",
    hint: "Submit applications or offers.",
    icon: FileText,
  },
  {
    id: "transact",
    label: "Book / Transact",
    hint: "Secure and complete your booking.",
    icon: CreditCard,
  },
  {
    id: "communicate",
    label: "Communicate",
    hint: "Chat and get updates in real time.",
    icon: MessageCircle,
  },
  {
    id: "manage",
    label: "Manage stay / lease",
    hint: "Manage payments, requests, and more.",
    icon: Home,
  },
  {
    id: "support",
    label: "Request support",
    hint: "Get help when you need it.",
    icon: Headphones,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function DiscoverVisual() {
  return (
    <div className="mk-ui-panel">
      <div className="mk-ui-toolbar">
        <span className="mk-ui-search">Search destinations, areas, or buildings</span>
        <span className="mk-ui-chip">Rent</span>
        <span className="mk-ui-chip">Buy</span>
      </div>
      <div className="mk-ui-split">
        <div className="mk-ui-list">
          {[
            { title: "Airport Hills Residence", meta: "3 bed · GHS 18,500 / mo", img: PROPERTY_A },
            { title: "Cantonments Terrace", meta: "2 bed · GHS 12,200 / mo", img: PROPERTY_B },
          ].map((item) => (
            <div key={item.title} className="mk-ui-list-row">
              <img src={item.img} alt="" className="mk-ui-thumb" loading="lazy" />
              <div>
                <p className="mk-ui-row-title">{item.title}</p>
                <p className="mk-ui-row-meta">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mk-ui-map" aria-hidden="true">
          <span className="mk-ui-map-pin" />
          <span className="mk-ui-map-pin mk-ui-map-pin--b" />
        </div>
      </div>
    </div>
  );
}

function CompareVisual() {
  return (
    <div className="mk-ui-panel">
      <p className="mk-ui-panel-label">Compare selected listings</p>
      <div className="mk-ui-compare-grid">
        {[
          { title: "Airport Hills", price: "GHS 18,500", beds: "3", score: "Best value" },
          { title: "Cantonments", price: "GHS 12,200", beds: "2", score: "Lower rent" },
          { title: "Labone Flat", price: "GHS 15,800", beds: "2", score: "Central" },
        ].map((col) => (
          <article key={col.title} className="mk-ui-compare-col">
            <p className="mk-ui-row-title">{col.title}</p>
            <p className="mk-ui-stat">{col.price}</p>
            <p className="mk-ui-row-meta">{col.beds} bedrooms</p>
            <span className="mk-ui-badge">{col.score}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function ViewVisual() {
  return (
    <div className="mk-ui-panel">
      <img src={PROPERTY_A} alt="" className="mk-ui-hero-img" loading="lazy" />
      <div className="mk-ui-detail">
        <p className="mk-ui-row-title">Airport Hills Residence · Unit 204</p>
        <p className="mk-ui-row-meta">3 bed · 2 bath · East Legon</p>
        <div className="mk-ui-inline-actions">
          <span className="mk-ui-btn-ghost">Schedule viewing</span>
          <span className="mk-ui-btn-solid">Save listing</span>
        </div>
      </div>
    </div>
  );
}

function ApplyVisual() {
  return (
    <div className="mk-ui-panel">
      <p className="mk-ui-panel-label">Lease application</p>
      <div className="mk-ui-form-rows">
        <div className="mk-ui-field">Applicant · Ama Mensah</div>
        <div className="mk-ui-field">Property · Unit 204, Airport Hills</div>
        <div className="mk-ui-field">Status · Under review</div>
      </div>
      <span className="mk-ui-badge mk-ui-badge--progress">Documents attached · 2 of 2</span>
    </div>
  );
}

function TransactVisual() {
  return (
    <div className="mk-ui-panel">
      <p className="mk-ui-panel-label">Booking & payment</p>
      <div className="mk-ui-status-card">
        <p className="mk-ui-row-title">Reservation confirmed</p>
        <p className="mk-ui-row-meta">Payment received · Ref #BM-20481</p>
        <div className="mk-ui-progress">
          <span className="mk-ui-progress-fill" />
        </div>
        <p className="mk-ui-row-meta">Move-in date · 15 Oct 2026</p>
      </div>
    </div>
  );
}

function CommunicateVisual() {
  return (
    <div className="mk-ui-panel mk-ui-chat">
      <p className="mk-ui-panel-label">Conversation · Unit 204</p>
      <div className="mk-ui-chat-bubble mk-ui-chat-bubble--in">
        Viewing confirmed for Thursday 10:00.
      </div>
      <div className="mk-ui-chat-bubble mk-ui-chat-bubble--out">
        Can I also ask about parking availability?
      </div>
      <div className="mk-ui-chat-bubble mk-ui-chat-bubble--in">
        Yes — one dedicated bay is included with the lease.
      </div>
    </div>
  );
}

function ManageVisual() {
  return (
    <div className="mk-ui-panel">
      <p className="mk-ui-panel-label">My stay / lease</p>
      <div className="mk-ui-stat-grid">
        <div className="mk-ui-stat-box">
          <span className="mk-ui-stat-label">Lease</span>
          <span className="mk-ui-stat">Active</span>
        </div>
        <div className="mk-ui-stat-box">
          <span className="mk-ui-stat-label">Next payment</span>
          <span className="mk-ui-stat">1 Oct</span>
        </div>
        <div className="mk-ui-stat-box">
          <span className="mk-ui-stat-label">Open requests</span>
          <span className="mk-ui-stat">0</span>
        </div>
      </div>
    </div>
  );
}

function SupportVisual() {
  return (
    <div className="mk-ui-panel">
      <p className="mk-ui-panel-label">Support request</p>
      <div className="mk-ui-ticket">
        <div className="mk-ui-ticket-head">
          <span className="mk-ui-row-title">Kitchen sink leak</span>
          <span className="mk-ui-badge">In progress</span>
        </div>
        <p className="mk-ui-row-meta">Ticket #MT-1182 · Assigned to maintenance</p>
        <p className="mk-ui-row-meta">SLA · Response within 4 hours</p>
      </div>
    </div>
  );
}

function JourneyVisual({ stepId }: { stepId: StepId }) {
  switch (stepId) {
    case "discover":
      return <DiscoverVisual />;
    case "compare":
      return <CompareVisual />;
    case "view":
      return <ViewVisual />;
    case "apply":
      return <ApplyVisual />;
    case "transact":
      return <TransactVisual />;
    case "communicate":
      return <CommunicateVisual />;
    case "manage":
      return <ManageVisual />;
    case "support":
      return <SupportVisual />;
    default:
      return null;
  }
}

export function ConsumerJourneyShowcase() {
  const [activeStep, setActiveStep] = useState<StepId>("discover");

  return (
    <div className="mk-showcase-split mk-consumer-showcase">
      <div className="mk-showcase-copy">
        <p className="mk-eyebrow">For consumers</p>
        <h2 id="consumers-heading" className="mk-section-title">Find a property without the friction.</h2>
        <p className="mk-section-copy mk-showcase-intro">
          Discover, compare, view, and move forward from one place. Renters, buyers, hosts, and guests
          use BaytMiftah alongside the business operating system — connected to the same platform,
          without the operational complexity.
        </p>
        <p className="text-xs text-ink-muted mt-2 max-w-prose">
          Illustrative preview — screens are simplified for marketing. Live product flows (search, offers,
          and your property journey timeline) may differ in layout and copy.
        </p>

        <div className="mk-journey-nav" role="tablist" aria-label="Consumer journey">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mk-journey-item${isActive ? " mk-journey-item--active" : ""}`}
                onClick={() => setActiveStep(step.id)}
              >
                <span className="mk-journey-item-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="mk-journey-item-copy">
                  <span className="mk-journey-item-label">{step.label}</span>
                  <span className="mk-journey-item-hint">{step.hint}</span>
                </span>
                <ChevronRight className="mk-journey-item-chevron" size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mk-showcase-stage">
        <div className="mk-showcase-frame">
          <div className="mk-showcase-frame-bar">
            <span className="mk-showcase-frame-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="mk-showcase-frame-title">BaytMiftah · Consumer</span>
            <span className="mk-showcase-frame-tag">Preview</span>
          </div>
          <div key={activeStep} className="mk-showcase-frame-body mk-showcase-crossfade">
            <JourneyVisual stepId={activeStep} />
          </div>
        </div>
      </div>

      <a href={appPath("/search")} className="mk-btn mk-btn-accent mk-showcase-cta">
        Explore Properties
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
}
