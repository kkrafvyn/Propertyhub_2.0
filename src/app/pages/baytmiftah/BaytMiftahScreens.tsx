import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  Bath,
  BedDouble,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CloudUpload,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  Gem,
  Grid3X3,
  Heart,
  Home,
  KeyRound,
  Layers3,
  LineChart,
  Lock,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Palette,
  Paperclip,
  Phone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Smile,
  Sparkles,
  SquareKanban,
  Trash2,
  TrendingUp,
  UserCircle,
  UserPlus,
  Users,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";

type VisualKind =
  | "villa"
  | "tower"
  | "interior"
  | "ocean"
  | "skyline"
  | "lab"
  | "map"
  | "bath"
  | "bedroom"
  | "pavilion";

const publicNav = [
  "Marketplace",
  "Developments",
  "Concierge",
  "Portfolio",
  "Auction",
  "Innovation Lab",
  "Messages",
];
const adminNav = ["Dashboard", "Market Analysis", "Asset Vault"];
const footerLinks = ["Security Protocol", "System Status", "Audit Logs"];

const visualBackgrounds: Record<VisualKind, string> = {
  villa:
    "linear-gradient(180deg, rgba(247,184,70,.38), rgba(5,19,32,.22) 44%, rgba(5,19,32,.96)), linear-gradient(130deg, #172537 0%, #243d4d 38%, #e3a24a 39%, #111a25 42%, #071320 100%)",
  tower:
    "radial-gradient(circle at 50% 35%, rgba(247,204,80,.55), transparent 20%), linear-gradient(180deg, #082337 0%, #071321 52%, #04101b 100%)",
  interior:
    "linear-gradient(180deg, rgba(9,18,28,.2), rgba(6,15,25,.95)), linear-gradient(90deg, #0b1625 0%, #253240 34%, #d69d3d 36%, #162131 38%, #0a121f 100%)",
  ocean:
    "linear-gradient(180deg, rgba(255,255,255,.42), rgba(9,40,54,.1) 38%, rgba(5,19,32,.92)), linear-gradient(135deg, #f0eee5 0%, #c5e0dd 34%, #1b8494 35%, #006f82 56%, #062236 100%)",
  skyline:
    "linear-gradient(180deg, rgba(255,184,78,.28), rgba(5,17,30,.92)), linear-gradient(90deg, #07111f 0%, #1f3342 26%, #9bb2c1 27%, #132432 29%, #06101d 100%)",
  lab:
    "radial-gradient(circle at 50% 42%, rgba(31,199,209,.24), transparent 26%), linear-gradient(135deg, #061322 0%, #0d2734 54%, #06111d 100%)",
  map:
    "radial-gradient(circle at 55% 45%, rgba(185,205,216,.28), transparent 28%), linear-gradient(135deg, #162130, #07121f 70%)",
  bath:
    "linear-gradient(130deg, #111926, #1f2b34 38%, #d99c3f 39%, #0b131d 42%, #09131f)",
  bedroom:
    "linear-gradient(180deg, #21303b 0%, #111a24 48%, #050d17 100%)",
  pavilion:
    "linear-gradient(180deg, rgba(247,184,70,.34), rgba(5,19,32,.28) 45%, rgba(5,19,32,.96)), linear-gradient(120deg, #0d1b2a 0%, #41545a 32%, #c78943 33%, #152333 36%, #081421 100%)",
};

const listingCards = [
  {
    title: "The Celestial Penthouse",
    location: "Palm Jumeirah, Dubai",
    price: "AED 45,000,000",
    meta: ["5 Beds", "7 Baths", "8,400 SqFt"],
    visual: "villa" as const,
    featured: true,
  },
  {
    title: "Marina Sky Mansion",
    location: "Dubai Marina, Dubai",
    price: "AED 12,800,000",
    meta: ["3 Beds", "4 Baths", "Infinity Pool"],
    visual: "interior" as const,
  },
  {
    title: "Emirates Hills V8",
    location: "Emirates Hills, Dubai",
    price: "AED 82,000,000",
    meta: ["7 Beds", "12 Cars", "Vault"],
    visual: "pavilion" as const,
  },
  {
    title: "Bvlgari Ocean Front",
    location: "Jumeirah Bay Island",
    price: "AED 115,000,000",
    meta: ["Dock", "Gym", "Spa"],
    visual: "ocean" as const,
  },
];

const similarProperties = [
  ["The Alabaster Wing", "Emirates Hills, Dubai", "AED 12,000,000", "villa" as const],
  ["L'Horizon Residence", "Jumeirah Bay Island", "AED 21,900,000", "pavilion" as const],
  ["Dune Crest Pavilion", "Al Barari, Dubai", "AED 9,500,000", "interior" as const],
];

function BrandMark({ admin = false }: { admin?: boolean }) {
  return (
    <Link to="/baytmiftah" className="flex min-w-0 items-center gap-3 text-[#f7c843]">
      <ShieldCheck className="h-7 w-7 flex-shrink-0" aria-hidden="true" />
      <span className="truncate text-2xl font-black tracking-[-0.04em]">
        BaytMiftah{admin ? " Admin" : ""}
      </span>
    </Link>
  );
}

function PublicTopNav({ active = "Innovation Lab" }: { active?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071321]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <BrandMark />
        <nav className="hidden items-center gap-8 text-sm text-slate-100 lg:flex">
          {publicNav.map((item) => (
            <Link
              key={item}
              to={
                item === "Innovation Lab"
                  ? "/baytmiftah/innovation"
                  : item === "Marketplace"
                    ? "/baytmiftah/marketplace"
                    : item === "Developments"
                      ? "/baytmiftah/areas"
                      : item === "Messages"
                        ? "/baytmiftah/messages"
                    : "#"
              }
              className={`border-b-2 py-2 ${
                item === active
                  ? "border-[#f7c843] text-[#f7c843]"
                  : "border-transparent hover:text-[#f7c843]"
              }`}
            >
              {item}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/baytmiftah/listings"
            className="rounded-lg border border-[#f7c843] px-5 py-2 text-sm font-bold text-[#f7c843]"
          >
            List Property
          </Link>
          <Link
            to="/baytmiftah/offer"
            className="rounded-lg bg-[#f7c843] px-5 py-2 text-sm font-bold text-[#081321]"
          >
            Sign In
          </Link>
        </div>
        <button className="rounded-lg border border-white/15 p-2 text-slate-100 lg:hidden" type="button">
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </button>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#06111d] px-6 py-16 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
        <div>
          <p className="text-2xl font-black tracking-[-0.04em] text-[#f7c843]">BaytMiftah</p>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">
            Architecting the future of global luxury real estate through precision technology.
          </p>
        </div>
        {[
          ["Ecosystem", "Marketplace", "Developments", "Portfolio", "Auction House"],
          ["Resources", "Luxury Standards", "Global Press", "Whitepaper", "API Docs"],
          ["Legal", "Privacy Policy", "Terms of Service", "Compliance"],
        ].map(([title, ...items]) => (
          <div key={title}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">{title}</p>
            <div className="mt-5 space-y-4 text-sm">
              {items.map((item) => (
                <a key={item} className="block text-slate-300 hover:text-[#f7c843]" href="#">
                  {item}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-6 border-t border-white/10 pt-8 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>© 2024 BaytMiftah Luxury Ecosystem. Secure Protocol Encrypted.</p>
        <div className="flex gap-5 text-[#f7c843]">
          <Shield className="h-5 w-5" aria-hidden="true" />
          <Gem className="h-5 w-5" aria-hidden="true" />
          <Layers3 className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-white/12 bg-[#0d1a2a] shadow-[0_22px_70px_rgba(0,0,0,.18)] ${className}`}>
      {children}
    </section>
  );
}

function LuxuryVisual({
  kind,
  className = "",
  label,
}: {
  kind: VisualKind;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[#091624] ${className}`}
      style={{ background: visualBackgrounds[kind] }}
      role="img"
      aria-label={label || "Luxury real estate visual"}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06111d] to-transparent" />
      {kind === "tower" ? (
        <div className="absolute bottom-7 left-1/2 h-[78%] w-24 -translate-x-1/2 rounded-t-full border border-[#f7c843]/40 bg-[repeating-linear-gradient(180deg,rgba(247,200,67,.8)_0_4px,rgba(8,19,33,.4)_4px_15px)] shadow-[0_0_55px_rgba(247,200,67,.3)]" />
      ) : null}
      {kind === "map" ? (
        <>
          <div className="absolute left-[20%] top-[20%] h-32 w-56 rotate-[-22deg] rounded-full border border-white/12" />
          <div className="absolute left-[32%] top-[38%] h-40 w-72 rotate-[12deg] rounded-full border border-white/10" />
          <div className="absolute left-[48%] top-[40%] rounded-full bg-[#f7c843] px-3 py-1 text-xs font-bold text-[#081321]">
            The Obsidian Pavilion
          </div>
          <MapPin className="absolute left-1/2 top-1/2 h-10 w-10 -translate-y-1/2 text-[#f7c843]" aria-hidden="true" />
        </>
      ) : null}
      {kind !== "tower" && kind !== "map" ? (
        <div className="absolute inset-x-[12%] bottom-[18%] h-[48%] border border-white/14 bg-[#0b1725]/55 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <div className="grid h-full grid-cols-4 gap-[2px] p-2">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className={`border border-[#f7c843]/20 ${
                  index % 3 === 0 ? "bg-[#f7c843]/22" : "bg-white/8"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[#071321]/70" />
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  featured = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  featured?: boolean;
}) {
  return (
    <Panel className={`p-8 ${featured ? "border-[#f7c843]" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">{title}</p>
          <p className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-100">{value}</p>
          <p className="mt-2 text-sm font-bold text-[#f7c843]">{detail}</p>
        </div>
        <Icon className="h-12 w-12 text-[#f7c843]/28" aria-hidden="true" />
      </div>
    </Panel>
  );
}

function DashboardSidebar({ active = "User Management" }: { active?: string }) {
  const items = [
    ["Global Analytics", BarChart3],
    ["User Management", Users],
    ["Listing Oversight", Building2],
    ["Verification Hub", ShieldCheck],
    ["System Security", Shield],
  ] as const;

  return (
    <aside className="hidden min-h-screen w-[360px] flex-shrink-0 border-r border-white/10 bg-[#06111d] px-10 py-12 xl:block">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-[#f7c843]/50 bg-[#172536]">
          <LuxuryVisual kind="interior" className="h-full w-full" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#f7c843]">System Architect</p>
          <p className="text-lg font-bold tracking-[0.12em] text-slate-400">TIER 1 ACCESS</p>
        </div>
      </div>
      <nav className="mt-24 space-y-3">
        {items.map(([item, Icon]) => (
          <a
            key={item}
            href="#"
            className={`flex items-center gap-6 px-8 py-6 text-xl ${
              item === active
                ? "-mx-10 border-l-4 border-[#f7c843] bg-[#f7c843]/10 pl-10 text-[#f7c843]"
                : "text-slate-200"
            }`}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
            {item}
          </a>
        ))}
      </nav>
      <div className="mt-72 rounded-xl border border-white/10 bg-[#0d1a2a] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Status</p>
        <p className="mt-2 text-2xl font-black text-[#f7c843]">System Secure</p>
      </div>
    </aside>
  );
}

function AdminTopNav({ active = "Dashboard" }: { active?: string }) {
  return (
    <header className="border-b border-white/10 bg-[#0c1928] px-6 py-5 text-slate-100">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6">
        <BrandMark admin />
        <nav className="hidden items-center gap-12 text-xl lg:flex">
          {adminNav.map((item) => (
            <a
              key={item}
              href="#"
              className={`border-b-4 py-2 ${
                item === active ? "border-[#f7c843] text-[#f7c843]" : "border-transparent text-slate-300"
              }`}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <Bell className="h-6 w-6 text-slate-300" aria-hidden="true" />
          <div className="h-12 w-12 overflow-hidden rounded-full border border-[#f7c843]/50">
            <LuxuryVisual kind="interior" className="h-full w-full" />
          </div>
        </div>
      </div>
    </header>
  );
}

function AdminFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#06111d] px-8 py-5 text-sm font-bold tracking-wide text-slate-400">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[#f7c843]">© 2024 BaytMiftah Luxury Real Estate Ecosystem. Secure Encrypted Session.</p>
        <div className="flex gap-12">
          {footerLinks.map((link) => (
            <a key={link} href="#" className="hover:text-[#f7c843]">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function BaytMiftahScreensHome() {
  const screens = [
    ["Innovation Lab", "/baytmiftah/innovation", Sparkles],
    ["Listing Oversight", "/baytmiftah/listings", Building2],
    ["Area Guides", "/baytmiftah/areas", Map],
    ["Messages", "/baytmiftah/messages", MessageSquare],
    ["Mobile Leads", "/baytmiftah/mobile-messages", Phone],
    ["Aureus District", "/baytmiftah/aureus-district", MapPin],
    ["Aureus Analytics", "/baytmiftah/aureus-analytics", BarChart3],
    ["Financial Ledger", "/baytmiftah/aureus-financials", CircleDollarSign],
    ["Aureus Settings", "/baytmiftah/aureus-settings", Settings],
    ["Aureus Security", "/baytmiftah/aureus-security", Shield],
    ["Aureus Compliance", "/baytmiftah/aureus-compliance", FileText],
    ["Aureus Listings", "/baytmiftah/aureus-listings", Building2],
    ["Secure Login", "/baytmiftah/secure-login", Lock],
    ["Advisor Viewings", "/baytmiftah/advisor-viewings", CalendarDays],
    ["Deal Room", "/baytmiftah/deal-room", FileText],
    ["Payments & Escrow", "/baytmiftah/payments-escrow", CircleDollarSign],
    ["Mobile Landing", "/baytmiftah/mobile-landing", Home],
    ["Mobile Trust", "/baytmiftah/mobile-trust", ShieldCheck],
    ["Mobile Workspace", "/baytmiftah/mobile-workspace", BriefcaseBusiness],
    ["Mobile Viewing", "/baytmiftah/mobile-viewing", CalendarDays],
    ["Mobile Portfolio", "/baytmiftah/mobile-portfolio", Gem],
    ["Mobile Performance", "/baytmiftah/mobile-performance", BarChart3],
    ["Security Email", "/baytmiftah/security-email", AlertTriangle],
    ["Admin Platform", "/baytmiftah/admin-platform", LineChart],
    ["Mobile Security", "/baytmiftah/mobile-security", Shield],
    ["Admin Governance", "/baytmiftah/admin-governance", Lock],
    ["Agency Workspace", "/baytmiftah/agency", SquareKanban],
    ["User Management", "/baytmiftah/users", Users],
    ["Property Detail", "/baytmiftah/property", Home],
    ["Marketplace", "/baytmiftah/marketplace", Grid3X3],
    ["Offer Details", "/baytmiftah/offer", ClipboardList],
    ["Proof of Funds", "/baytmiftah/proof", CloudUpload],
    ["Review and Sign", "/baytmiftah/review", FileText],
    ["Command Center", "/baytmiftah/command", ShieldCheck],
  ] as const;

  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Marketplace" />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-[#f7c843]/40 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#f7c843]">
            BaytMiftah screen pack
          </p>
          <h1 className="mt-8 text-5xl font-black tracking-[-0.05em] text-slate-100 lg:text-7xl">
            Luxury real estate flows for marketplace, admin, and secure offers.
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-300">
            A routed prototype matching the supplied dark navy and gold product direction.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {screens.map(([label, href, Icon]) => (
            <Link
              key={label}
              to={href}
              className="group rounded-xl border border-white/12 bg-[#0d1a2a] p-7 transition hover:-translate-y-1 hover:border-[#f7c843]/70"
            >
              <Icon className="h-8 w-8 text-[#f7c843]" aria-hidden="true" />
              <p className="mt-8 text-2xl font-black">{label}</p>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-400 group-hover:text-[#f7c843]">
                Open screen <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </p>
            </Link>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export function BaytMiftahInnovationLab() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Innovation Lab" />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-16">
        <section className="text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#f7c843]/40 bg-[#f7c843]/8 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#f7c843]">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> R&D Division
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black tracking-[-0.05em] text-slate-100 lg:text-6xl">
            Future-Proofing Real Estate
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Explore the confluence of proprietary AI, blockchain decentralization, and spatial computing designed for the next generation of global property ownership.
          </p>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1.35fr_.95fr]">
          <Panel className="p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#f7c843]">AI Predictive Valuation</h2>
                <p className="mt-1 text-slate-300">Neural Network Price Forecasting Model (Bayt-1)</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-md bg-slate-700 px-3 py-1">Live Feed</span>
                <span className="rounded-md bg-slate-700 px-3 py-1">98.4% Acc.</span>
              </div>
            </div>
            <div className="mt-8 h-64 rounded-lg bg-[#081521] p-7">
              <div className="flex h-full items-end gap-3">
                {[36, 52, 47, 68, 78, 62, 72].map((height, index) => (
                  <span
                    key={height + index}
                    className="flex-1 rounded-t border border-[#f7c843]/30 bg-[#f7c843]/18"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {[
                ["Market Sentiment", "Bullish"],
                ["Projected ROI", "+12.4%"],
                ["Volatility Score", "Low"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#172436] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-3">
            <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-[#19a7b5]/35 p-3">
              <LuxuryVisual kind="lab" className="absolute inset-3 rounded-lg" label="Immersive real estate lab" />
              <div className="absolute inset-x-3 bottom-3 z-10 rounded-b-lg bg-gradient-to-t from-[#071321] via-[#071321]/86 to-transparent px-8 pb-6 pt-28">
                <Sparkles className="h-8 w-8 text-[#f7c843]" aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-black">Immersive Realities</h2>
                <p className="mt-2 leading-6 text-slate-100">
                  Experience properties across the globe in 1:1 scale spatial fidelity before ground-breaking.
                </p>
                <button className="mt-7 flex w-full items-center justify-center gap-3 rounded-lg border border-[#f7c843] px-5 py-4 text-sm font-black text-[#f7c843]" type="button">
                  Enter VR Lounge <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <Panel className="p-8">
            <div className="flex items-center gap-4">
              <span className="rounded-lg bg-[#f7c843]/12 p-4 text-[#f7c843]">
                <KeyRound className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-black">Blockchain Protocol</h2>
                <p className="text-slate-300">Decentralized Fractional Ownership Ledger</p>
              </div>
            </div>
            <div className="mt-8 space-y-5">
              {[
                ["Contract Address", "0x71C...492b", Copy],
                ["Asset Tokenization Rate", "1,000,000 BM-TKN / Property", CheckCircle2],
                ["Staking Yield (APRL)", "7.2% Performance Base", Shield],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="flex items-center justify-between rounded-lg bg-[#182537] p-5">
                  <div>
                    <p className="text-xs font-bold text-slate-300">{label as string}</p>
                    <p className="mt-1 font-bold">{value as string}</p>
                  </div>
                  <Icon className="h-5 w-5 text-[#f7c843]" aria-hidden="true" />
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-8">
            <h2 className="text-2xl font-black">Evolution Timeline</h2>
            <div className="mt-10 space-y-10 border-l border-white/20 pl-8">
              {[
                ["Phase 1: Present", "Smart Concierge AI", "Deployment of localized AI agents for 24/7 client asset management."],
                ["Phase 2: Q4 2024", "Autonomous Legal Closings", "Zero-knowledge proof verification for instant property transfers."],
                ["Phase 3: 2025+", "Metropolitan Nodes", "Global ecosystem integration for borderless real estate mobility."],
              ].map(([phase, title, detail], index) => (
                <div key={phase} className="relative">
                  <span className={`absolute -left-[38px] top-1 h-3 w-3 rounded-full ${index === 0 ? "bg-[#f7c843]" : "bg-slate-500"}`} />
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f7c843]">{phase}</p>
                  <p className="mt-2 text-xl font-black">{title}</p>
                  <p className="mt-2 text-slate-300">{detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel className="mt-16 grid gap-10 p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-5xl font-black tracking-[-0.05em] text-[#f7c843]">Apply for Elite Access</h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-200">
              The Innovation Lab is restricted to registered Agency Partners and High-Net-Worth individuals. Request credentials to access proprietary valuation tools and early-stage tokenization rounds.
            </p>
            <div className="mt-8 space-y-4">
              {["Priority access to new developments", "Direct API access for institutional trading", "Invites to exclusive innovation summits"].map((item) => (
                <p key={item} className="flex items-center gap-3 font-bold">
                  <ShieldCheck className="h-5 w-5 text-[#f7c843]" aria-hidden="true" /> {item}
                </p>
              ))}
            </div>
          </div>
          <form className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                Full Name
                <input className="mt-2 h-12 w-full rounded-lg border border-white/20 bg-[#081521] px-4 text-base font-medium normal-case tracking-normal text-slate-100" placeholder="Alexander Sterling" />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                Professional Title
                <input className="mt-2 h-12 w-full rounded-lg border border-white/20 bg-[#081521] px-4 text-base font-medium normal-case tracking-normal text-slate-100" placeholder="Principal Investor" />
              </label>
            </div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
              Email Address
              <input className="mt-2 h-12 w-full rounded-lg border border-white/20 bg-[#081521] px-4 text-base font-medium normal-case tracking-normal text-slate-100" placeholder="alex@sterling-group.global" />
            </label>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
              Interest Area
              <select className="mt-2 h-12 w-full rounded-lg border border-white/20 bg-[#081521] px-4 text-base font-medium normal-case tracking-normal text-slate-100">
                <option>AI-Powered Portfolio Analysis</option>
                <option>Tokenized Ownership</option>
                <option>Spatial Property Tours</option>
              </select>
            </label>
            <button className="h-16 rounded-lg bg-[#f7c843] text-xl font-black text-[#081321]" type="button">
              Submit Application
            </button>
            <p className="text-center text-xs font-bold text-slate-300">
              All applications are subject to 72-hour KYC verification.
            </p>
          </form>
        </Panel>
      </main>
      <PublicFooter />
    </div>
  );
}

export function BaytMiftahListingOversight() {
  return (
    <div className="min-h-screen bg-[#071321] pb-24 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071321]/95 px-8 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
          <BrandMark />
          <nav className="hidden gap-9 text-lg lg:flex">
            {["Listing Oversight", "Global Analytics", "User Management", "System Security"].map((item) => (
              <a
                key={item}
                className={`border-b-2 py-2 ${item === "Listing Oversight" ? "border-[#f7c843] text-[#f7c843]" : "border-transparent text-slate-300"}`}
                href="#"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-6">
            <Search className="h-6 w-6" aria-hidden="true" />
            <Bell className="h-6 w-6" aria-hidden="true" />
            <div className="hidden text-right sm:block">
              <p className="font-black">System Architect</p>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-300">TIER 1 ACCESS</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-8 px-6 lg:grid-cols-[340px_1fr] lg:px-0">
        <aside className="bg-[#06111d] px-8 py-10 lg:min-h-[calc(100vh-82px)]">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Search Filters</h1>
            <button className="text-sm font-black text-[#f7c843]" type="button">RESET</button>
          </div>
          <div className="mt-10 space-y-9">
            <FilterBlock label="Location">
              <div className="flex h-14 items-center justify-between rounded-lg border border-white/10 bg-[#0d1a2a] px-5 text-slate-400">
                Dubai Marina, Palm Jumeirah <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
            </FilterBlock>
            <FilterBlock label="Price Range (AED)">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input className="h-12 rounded-lg border border-white/10 bg-[#0d1a2a] px-4" placeholder="Min" />
                <span>-</span>
                <input className="h-12 rounded-lg border border-white/10 bg-[#0d1a2a] px-4" placeholder="Max" />
              </div>
            </FilterBlock>
            <FilterBlock label="Property Type">
              <div className="grid grid-cols-2 gap-3">
                {["Penthouse", "Villa", "Mansion", "Island"].map((item) => (
                  <button key={item} className={`h-11 rounded-lg border text-sm font-bold ${item === "Penthouse" ? "border-[#f7c843] text-[#f7c843]" : "border-white/10"}`} type="button">
                    {item}
                  </button>
                ))}
              </div>
            </FilterBlock>
            <FilterBlock label="Amenities">
              <div className="space-y-4 text-lg">
                {["Infinity Pool", "Private Beach", "Home Cinema", "Wine Cellar"].map((item, index) => (
                  <label key={item} className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${index === 1 ? "border-[#f7c843] bg-[#f7c843]" : "border-white/25"}`}>
                      {index === 1 ? <Check className="h-4 w-4 text-[#081321]" aria-hidden="true" /> : null}
                    </span>
                    {item}
                  </label>
                ))}
              </div>
            </FilterBlock>
            <FilterBlock label="Min Area (SqFt)">
              <button className="flex h-14 w-full items-center justify-between rounded-lg border border-white/10 bg-[#0d1a2a] px-5 text-lg" type="button">
                Any Size <ChevronRight className="h-5 w-5 rotate-90" aria-hidden="true" />
              </button>
            </FilterBlock>
          </div>
        </aside>

        <section className="py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black">128 Exclusive Listings</h2>
              <p className="text-xl text-slate-300">Showing premium properties in Dubai, UAE</p>
            </div>
            <div className="flex gap-5">
              <div className="flex rounded-lg bg-[#0d1a2a] p-2">
                {[Grid3X3, ClipboardList, Map].map((Icon, index) => (
                  <button key={index} className={`rounded-lg p-3 ${index === 0 ? "bg-[#f7c843] text-[#081321]" : "text-slate-300"}`} type="button">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button className="rounded-lg bg-[#0d1a2a] px-6 py-3 text-lg" type="button">Sort by: Newest</button>
            </div>
          </div>

          <div className="mt-12 grid gap-10 xl:grid-cols-[1.35fr_.75fr]">
            {listingCards.slice(0, 2).map((listing) => (
              <ListingCard key={listing.title} listing={listing} />
            ))}
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-2 xl:w-[880px]">
            {listingCards.slice(2).map((listing) => (
              <ListingCard key={listing.title} listing={listing} compact />
            ))}
          </div>
          <Panel className="mt-12 max-w-[880px] bg-[#161a24] p-16 text-center">
            <div className="mx-auto max-w-xl rounded-2xl border border-white/15 bg-white/5 p-14">
              <Map className="mx-auto h-14 w-14 text-[#f7c843]" aria-hidden="true" />
              <h3 className="mt-6 text-3xl font-black">Interactive Map View</h3>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Explore exclusive listings by neighborhood. See live market trends and location demographics.
              </p>
              <button className="mt-8 rounded-lg bg-[#f7c843] px-14 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#081321]" type="button">
                Enable Map Experience
              </button>
            </div>
          </Panel>
          <div className="mt-16 flex justify-center gap-4">
            {[ChevronLeft, "1", "2", "3", "...", "12", ChevronRight].map((item, index) => {
              if (typeof item === "string") {
                return (
                  <button key={item} className={`h-14 w-14 rounded-full border border-white/10 ${item === "1" ? "bg-[#f7c843] text-[#081321]" : ""}`} type="button">
                    {item}
                  </button>
                );
              }

              const Icon = item;
              return (
                <button key={index} className="h-14 w-14 rounded-full border border-white/10" type="button">
                  <Icon className="mx-auto h-5 w-5" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </main>
      <AdminFooter />
    </div>
  );
}

function FilterBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-5 text-sm font-black uppercase tracking-[0.22em] text-slate-300">{label}</p>
      {children}
    </div>
  );
}

function ListingCard({
  listing,
  compact = false,
}: {
  listing: (typeof listingCards)[number];
  compact?: boolean;
}) {
  return (
    <article className={`overflow-hidden rounded-xl bg-[#0d1a2a] ${listing.featured ? "xl:col-span-1" : ""}`}>
      <div className="relative">
        <LuxuryVisual kind={listing.visual} className={compact ? "h-72" : "h-80"} label={listing.title} />
        <div className="absolute left-6 top-6 flex gap-3">
          <span className="rounded bg-[#f7c843] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#081321]">Exclusive</span>
          {listing.featured ? (
            <span className="rounded bg-[#1e1e24] px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">New Construction</span>
          ) : null}
        </div>
        {!listing.featured ? (
          <button className="absolute right-6 top-6 rounded-full bg-[#06111d]/70 p-3" type="button">
            <Heart className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">Save property</span>
          </button>
        ) : null}
      </div>
      <div className="p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-3xl font-black tracking-[-0.04em]">{listing.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-lg text-slate-300">
              <MapPin className="h-5 w-5" aria-hidden="true" /> {listing.location}
            </p>
          </div>
          <p className="text-3xl font-black text-[#f7c843]">{listing.price}</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-7 text-lg text-slate-200">
          {listing.meta.map((item, index) => {
            const Icon = index === 0 ? BedDouble : index === 1 ? Bath : Gem;
            return (
              <span key={item} className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#f7c843]" aria-hidden="true" /> {item}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function BaytMiftahAgencyWorkspace() {
  return (
    <div className="min-h-screen bg-[#071321] pb-24 text-slate-100">
      <AdminTopNav />
      <div className="flex">
        <DashboardSidebar />
        <main className="mx-auto max-w-[1500px] flex-1 px-8 py-16">
          <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-7xl font-black tracking-[-0.06em] text-[#f7c843]">Agency Workspace</h1>
              <p className="mt-6 max-w-4xl text-3xl leading-[1.35] text-slate-300">
                Refined oversight for premium property portfolios. Monitor leads, client engagements, and high-value transactions from a unified sanctuary.
              </p>
            </div>
            <div className="flex flex-wrap gap-5">
              <button className="flex items-center gap-5 rounded-xl border border-[#f7c843] px-10 py-6 text-2xl font-bold text-[#f7c843]" type="button">
                <FileText className="h-7 w-7" aria-hidden="true" /> Generate Report
              </button>
              <button className="flex items-center gap-5 rounded-xl bg-[#f7c843] px-10 py-6 text-2xl font-bold text-[#081321]" type="button">
                <CalendarDays className="h-7 w-7" aria-hidden="true" /> Schedule Meeting
              </button>
            </div>
          </section>

          <section className="mt-16 grid gap-8 xl:grid-cols-[1.15fr_.9fr]">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black">Lead Management Pipeline</h2>
                <p className="text-xl font-bold text-slate-300">Active Portfolios: 12</p>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {[
                  ["Qualification", "#f7c843", ["Julian Thorne", "$4.2M - Penthouse"], ["Elena Moretti", "$8.5M - Estate"]],
                  ["Viewing", "#61a5ff", ["Marcus Sterling", "$12M - Coastal Villa"], ["Today 2:00 PM", ""]],
                  ["Negotiation", "#42e083", ["Isabella Chen", "$6.8M - Skyline Loft"], ["", ""]],
                ].map(([title, color, first, second]) => (
                  <Panel key={title as string} className="p-6">
                    <p className="border-b border-white/10 pb-5 text-lg font-black uppercase tracking-[0.18em]" style={{ color: color as string }}>
                      {title as string}
                    </p>
                    <LeadCard name={(first as string[])[0]} detail={(first as string[])[1]} active={title === "Viewing"} />
                    {(second as string[])[0] ? <LeadCard name={(second as string[])[0]} detail={(second as string[])[1]} /> : null}
                  </Panel>
                ))}
              </div>
            </div>
            <Panel className="p-8">
              <h2 className="text-4xl font-black">Client Insights</h2>
              <div className="mt-10 space-y-9">
                {[
                  ["Marcus Sterling", "Looking for: Waterfront Properties, Dubai Marina", "High Intent"],
                  ["Isabella Chen", "Looking for: Sky Villas, Downtown Dubai", "Negotiating"],
                ].map(([name, detail, status]) => (
                  <div key={name} className="flex items-center gap-6">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-[#f7c843]">
                      <LuxuryVisual kind="interior" className="h-full w-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-black">{name}</p>
                      <p className="text-lg font-bold tracking-wide text-slate-300">{detail}</p>
                    </div>
                    <span className="rounded-lg bg-[#f7c843]/12 px-4 py-2 text-lg font-black text-[#f7c843]">{status}</span>
                  </div>
                ))}
              </div>
              <button className="mt-32 w-full border-t border-white/10 pt-8 text-xl font-black uppercase tracking-[0.18em] text-[#f7c843]" type="button">
                View All 42 Premium Clients
              </button>
            </Panel>
          </section>

          <section className="mt-12 grid gap-8 xl:grid-cols-[.9fr_1.1fr]">
            <Panel className="overflow-hidden">
              <h2 className="p-8 text-4xl font-black">Concierge Messaging</h2>
              <div className="border-y border-white/10 px-8 py-5 text-xl font-black text-[#f7c843]">
                <span className="mr-3 inline-block h-3 w-3 rounded-full bg-[#42e083]" /> Julian Thorne
              </div>
              <div className="space-y-6 p-8">
                <p className="max-w-sm rounded-xl bg-[#172536] p-6 text-2xl leading-9">Good morning. Has the owner of the Royal Penthouse reviewed the revised offer yet?</p>
                <p className="ml-auto max-w-sm rounded-xl border border-[#f7c843]/40 bg-[#f7c843]/8 p-6 text-2xl leading-9">Processing now, Mr. Thorne. I am expecting a response within the hour.</p>
                <div className="flex items-center rounded-xl border border-white/10 bg-[#071321] px-6 py-4">
                  <span className="flex-1 text-2xl text-slate-400">Type a message...</span>
                  <Send className="h-8 w-8 text-[#f7c843]" aria-hidden="true" />
                </div>
              </div>
            </Panel>
            <Panel className="p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black">Upcoming Viewings</h2>
                <p className="text-2xl">October 24, 2024</p>
              </div>
              <div className="mt-10 grid grid-cols-7 gap-3">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <p key={day} className={`text-center text-lg font-black uppercase ${day === "Thu" ? "text-[#f7c843]" : "text-slate-300"}`}>{day}</p>
                ))}
                {[21, 22, 23, 24, 25, 26, 27].map((day) => (
                  <div key={day} className={`min-h-40 rounded-xl p-4 text-2xl ${day === 24 ? "border border-[#f7c843] bg-[#f7c843]/10 text-[#f7c843]" : "bg-[#0a1624] text-slate-400"}`}>
                    {day}
                    {day === 24 ? <div className="mt-5 space-y-2 text-sm font-black"><p className="rounded bg-[#f7c843] px-2 py-1 text-[#081321]">Marcus ...</p><p className="rounded bg-[#61a5ff] px-2 py-1 text-[#081321]">Isabella ...</p></div> : null}
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

function LeadCard({ name, detail, active = false }: { name: string; detail: string; active?: boolean }) {
  return (
    <div className={`mt-6 rounded-xl p-7 ${active ? "border border-[#f7c843] bg-[#f7c843]/7" : "bg-[#172536]"}`}>
      <p className="text-2xl font-black leading-9">{name}</p>
      <p className="mt-2 text-xl font-bold text-slate-300">{detail}</p>
      <div className="mt-8 flex h-9 w-9 items-center justify-center rounded-full bg-[#f7c843]/20 text-sm font-black text-[#f7c843]">
        {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </div>
    </div>
  );
}

export function BaytMiftahUserManagement() {
  const users = [
    ["JD", "Julian De Marco", "uid_99283471", "Elite Agent", "Tier 3 (Ultra)", "Dubai, UAE", "2 mins ago", "Active"],
    ["EK", "Elena Kostic", "uid_10293847", "Buyer", "Tier 1 (Basic)", "London, UK", "14 hrs ago", "Idle"],
    ["SA", "Security Audit #40", "uid_restricted_77", "System Admin", "Verification Pending", "Global Edge", "3 days ago", "Flagged"],
    ["MR", "Marco Rossi", "uid_88271104", "Listing Manager", "Tier 2 (Pro)", "Milan, Italy", "Just now", "Active"],
  ];

  return (
    <div className="min-h-screen bg-[#071321] pb-24 text-slate-100">
      <AdminTopNav active="Dashboard" />
      <div className="flex">
        <DashboardSidebar />
        <main className="mx-auto max-w-[1500px] flex-1 px-8 py-16">
          <section className="grid gap-8 xl:grid-cols-4">
            <MetricCard title="Total Platform Users" value="12,482" detail="+12.4% from last month" icon={TrendingUp} />
            <MetricCard title="Verified Agents" value="841" detail="98% KYC Completion" icon={Gem} />
            <MetricCard title="Active HNW Buyers" value="3,204" detail="Avg. Portfolio $14M" icon={CircleDollarSign} />
            <MetricCard title="Global Security Score" value="99.2%" detail="Optimal Session Health" icon={ShieldCheck} featured />
          </section>

          <Panel className="mt-16 p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
              <div className="flex h-20 min-w-[250px] items-center gap-4 rounded-xl bg-[#06111d] px-7 text-2xl text-slate-400">
                <Search className="h-8 w-8" aria-hidden="true" /> Search
              </div>
              {["Role: All", "Status: Active", "Region: MENA", "Verification: Tier 3"].map((filter, index) => (
                <button key={filter} className={`rounded-full px-8 py-4 text-lg font-black ${index === 0 ? "border border-[#f7c843] bg-[#f7c843]/8 text-[#f7c843]" : "bg-slate-700 text-slate-200"}`} type="button">
                  {filter}
                </button>
              ))}
              <button className="ml-auto flex items-center gap-4 rounded-xl bg-[#f7c843] px-10 py-5 text-2xl font-bold text-[#081321]" type="button">
                <Plus className="h-6 w-6" aria-hidden="true" /> Provision User
              </button>
            </div>
          </Panel>

          <Panel className="mt-12 overflow-hidden">
            <div className="grid grid-cols-[1.3fr_.8fr_1fr_1fr_.9fr_.7fr] gap-8 bg-[#132131] px-10 py-8 text-2xl font-black uppercase tracking-[0.12em] text-slate-400">
              {["User Identity", "Role", "Verification", "Region", "Last Activity", "Status"].map((heading) => (
                <p key={heading}>{heading}</p>
              ))}
            </div>
            {users.map(([initials, name, uid, role, verification, region, activity, status]) => (
              <div key={uid} className="grid grid-cols-[1.3fr_.8fr_1fr_1fr_.9fr_.7fr] gap-8 border-t border-white/6 px-10 py-10 text-2xl">
                <div className="flex items-center gap-6">
                  <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-700 font-black text-[#f7c843]">{initials}</span>
                  <div>
                    <p>{name}</p>
                    <p className="font-mono text-lg text-slate-400">{uid}</p>
                  </div>
                </div>
                <p><span className="rounded-full bg-[#f7c843]/12 px-5 py-3 text-xl font-black text-[#f7c843]">{role}</span></p>
                <p className="font-bold">{verification}</p>
                <p>{region}<span className="block text-lg text-slate-400">Cluster: {region.split(",")[0]}</span></p>
                <p className="text-slate-400">{activity}<span className="block font-mono text-lg text-[#f7c843]">0x22...A14C</span></p>
                <p className={status === "Flagged" ? "text-rose-300" : status === "Idle" ? "text-slate-400" : "text-[#f7c843]"}>{status}</p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/10 px-10 py-8 text-xl font-bold text-slate-400">
              <p>Showing 4 of 12,482 entries</p>
              <div className="flex gap-4">
                {["1", "2", "3"].map((page) => (
                  <button key={page} className={`h-14 w-14 rounded-lg ${page === "1" ? "bg-[#f7c843] text-[#081321]" : "bg-[#071321]"}`} type="button">
                    {page}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

export function BaytMiftahPropertyDetail() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <div className="flex">
        <aside className="hidden min-h-screen w-[160px] border-r border-white/10 bg-[#06111d] px-5 py-8 lg:block">
          <p className="text-lg font-black">BaytMiftah</p>
          <nav className="mt-16 space-y-8 text-xs font-bold">
            {["Dashboard", "Listings", "Analytics", "Clients", "Messages", "Settings"].map((item) => (
              <a key={item} className={`flex items-center gap-3 ${item === "Listings" ? "text-[#f7c843]" : "text-slate-300"}`} href="#">
                <Grid3X3 className="h-4 w-4" aria-hidden="true" /> {item}
              </a>
            ))}
          </nav>
          <button className="mt-[520px] w-full rounded-lg bg-[#f7c843] px-4 py-3 text-xs text-[#081321]" type="button">
            New Listing
          </button>
        </aside>
        <main className="mx-auto max-w-[1180px] flex-1 px-6 pb-20 lg:px-0">
          <section className="grid h-[620px] gap-1 lg:grid-cols-[1.2fr_.8fr]">
            <LuxuryVisual kind="villa" className="h-full" label="Obsidian Pavilion sunset view" />
            <div className="grid gap-1">
              <div className="grid grid-cols-2 gap-1">
                <LuxuryVisual kind="skyline" className="h-full" />
                <LuxuryVisual kind="bedroom" className="h-full" />
              </div>
              <LuxuryVisual kind="bath" className="h-full" />
            </div>
          </section>

          <section className="grid gap-10 py-10 lg:grid-cols-[1fr_330px]">
            <div>
              <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.14em]">
                <span className="rounded bg-[#f7c843] px-3 py-1 text-[#081321]">Exclusive Listing</span>
                <span className="rounded bg-slate-700 px-3 py-1">New Construction</span>
              </div>
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-5xl font-black tracking-[-0.06em]">The Obsidian Pavilion</h1>
                  <p className="mt-2 flex items-center gap-2 text-slate-300">
                    <MapPin className="h-5 w-5 text-[#f7c843]" aria-hidden="true" /> Palm Jumeirah, Crescent West, Dubai
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Investment Value</p>
                  <p className="text-5xl font-black text-[#f7c843]">AED 14,500,000</p>
                </div>
              </div>
              <div className="mt-10 grid grid-cols-4 gap-5 border-y border-white/10 py-8 text-lg">
                {["6 Suites", "8.5", "12,400 sqft", "4 Bays"].map((item, index) => {
                  const Icon = index === 0 ? BedDouble : index === 1 ? Bath : index === 2 ? Layers3 : Home;
                  return <p key={item} className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#f7c843]" aria-hidden="true" /> {item}</p>;
                })}
              </div>
              <article className="mt-12 max-w-3xl">
                <h2 className="text-2xl font-black text-[#f7c843]">The Vision</h2>
                <p className="mt-6 leading-8 text-slate-300">
                  Emerging from the pristine sands of Palm Jumeirah, The Obsidian Pavilion represents a pinnacle of architectural achievement. Designed by the world-renowned studio Archi-Excellence, this residence blends monochromatic brutalism with the warmth of Champagne Gold accents.
                </p>
                <p className="mt-6 leading-8 text-slate-300">
                  Every detail has been curated for the discerning individual who values silence and precision. The property features a triple-height atrium, private cinema with acoustic treatment from London, and a wellness floor that rivals the finest spas in the Mediterranean.
                </p>
              </article>
              <div className="mt-12 grid gap-5 md:grid-cols-2">
                {[
                  ["Intelligence", "Fully integrated Savant Home Ecosystem", "Biometric Entry via Obsidian Portals", "AI-Driven Climate & Lighting Scenes"],
                  ["Finishes", "Rare Noir Saint Laurent Marble", "24k Champagne Gold Hardware", "Hand-Applied Venetian Plaster"],
                ].map(([title, ...items]) => (
                  <Panel key={title} className="p-7">
                    <h3 className="text-xl font-black text-slate-100">{title}</h3>
                    <ul className="mt-5 space-y-3 text-sm text-slate-300">
                      {items.map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </Panel>
                ))}
              </div>
              <div className="mt-16">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">Area Insights: Palm Jumeirah</h2>
                  <button className="text-sm font-black uppercase tracking-[0.16em] text-[#f7c843]" type="button">Download Report</button>
                </div>
                <LuxuryVisual kind="map" className="mt-6 h-80 rounded-xl border border-white/15" />
              </div>
              <section className="mt-24">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black">Similar Portfolios</h2>
                    <p className="text-sm text-slate-300">Curated properties that match your aesthetic preferences.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="rounded-full border border-white/15 p-3" type="button"><ChevronLeft className="h-5 w-5" /></button>
                    <button className="rounded-full border border-white/15 p-3" type="button"><ChevronRight className="h-5 w-5" /></button>
                  </div>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  {similarProperties.map(([title, location, price, visual]) => (
                    <article key={title} className="overflow-hidden rounded-xl border border-white/12 bg-[#0d1a2a]">
                      <LuxuryVisual kind={visual as VisualKind} className="h-48" />
                      <div className="p-5">
                        <p className="text-xs font-black text-[#f7c843]">{price}</p>
                        <h3 className="mt-3 font-black">{title}</h3>
                        <p className="mt-2 text-sm text-slate-300">{location}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
            <aside className="space-y-6">
              <Panel className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-[#f7c843]"><LuxuryVisual kind="interior" className="h-full w-full" /></div>
                  <div>
                    <p className="font-black">Alexander Vance</p>
                    <p className="text-sm text-slate-400">Global Portfolio Director</p>
                  </div>
                </div>
                <button className="mt-5 w-full rounded-lg bg-[#f7c843] py-4 font-bold text-[#081321]" type="button">Concierge Request</button>
                <button className="mt-3 w-full rounded-lg border border-[#f7c843] py-4 font-bold text-[#f7c843]" type="button">Send Message</button>
              </Panel>
              <Panel className="p-6">
                <h3 className="text-xl font-black">Schedule Private Viewing</h3>
                <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
                  {"MTWTFSS".split("").map((day) => <span key={day}>{day}</span>)}
                  {Array.from({ length: 14 }, (_, i) => i + 12).map((day) => (
                    <span key={day} className={day === 16 ? "rounded bg-[#f7c843] text-[#081321]" : ""}>{day}</span>
                  ))}
                </div>
                <button className="mt-5 w-full rounded-lg border border-white/20 py-4 text-sm font-black uppercase tracking-[0.16em]" type="button">Confirm Time Slot</button>
              </Panel>
              <Panel className="border-[#f7c843]/40 bg-[#f7c843]/8 p-6 text-center">
                <p className="text-sm">Ready to secure this legacy?</p>
                <h3 className="mt-2 text-2xl font-black">Digital Offer Submission</h3>
                <Link to="/baytmiftah/offer" className="mt-5 block rounded-lg bg-slate-100 py-4 font-bold text-[#081321]">
                  Submit Formal Offer
                </Link>
                <p className="mt-4 text-xs font-bold text-slate-400">Secure protocol encrypted</p>
              </Panel>
            </aside>
          </section>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}

export function BaytMiftahMarketplace() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Marketplace" />
      <section className="relative min-h-[760px] overflow-hidden">
        <LuxuryVisual kind="ocean" className="absolute inset-0 h-full w-full" label="Luxury coastal estate" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071321]/15 via-[#071321]/50 to-[#071321]" />
      </section>
      <main>
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black">Featured Developments</h1>
              <p className="mt-2 text-slate-300">Exclusive off-plan opportunities across the luxury landscape.</p>
            </div>
            <div className="flex gap-4">
              <button className="rounded-full border border-white/50 p-3" type="button"><ChevronLeft className="h-5 w-5" /></button>
              <button className="rounded-full border border-white/50 p-3" type="button"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ["The Aurora Spires", "Dubai Marina, UAE", "From $4.2M", "tower" as const],
              ["Villa Belle Epoque", "Saint-Tropez, France", "From $12.8M", "villa" as const],
              ["Skyline Residence", "Manhattan, NYC", "From $8.5M", "skyline" as const],
            ].map(([title, location, price, visual]) => (
              <article key={title}>
                <LuxuryVisual kind={visual as VisualKind} className="h-[420px] rounded-lg" />
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-black">{title}</h2>
                    <p className="text-slate-300">{location}</p>
                  </div>
                  <p className="text-2xl font-black text-[#f7c843]">{price}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-[#112032] py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1.5fr_.55fr]">
            <div className="relative overflow-hidden rounded-xl">
              <LuxuryVisual kind="lab" className="h-[480px]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#071321]/90 to-transparent" />
              <div className="absolute bottom-12 left-12 max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f7c843]">Pioneering the future</p>
                <h2 className="mt-3 text-5xl font-black tracking-[-0.05em]">Innovation Lab</h2>
                <p className="mt-5 text-lg leading-8 text-slate-200">Access our proprietary AI-driven market prediction engine and virtual property exploration tools. Beta access available for Portfolio members.</p>
                <Link to="/baytmiftah/innovation" className="mt-8 inline-block rounded-lg border border-[#f7c843] px-8 py-4 text-sm font-black text-[#f7c843]">
                  Request Access
                </Link>
              </div>
            </div>
            <div className="grid gap-8">
              <Panel className="p-10">
                <LineChart className="h-8 w-8 text-[#f7c843]" />
                <h3 className="mt-16 text-2xl font-black">Market Pulse</h3>
                <p className="mt-3 text-slate-300">Luxury assets in coastal Europe show record-breaking resilience in Q3 2024.</p>
              </Panel>
              <Panel className="p-10">
                <ShieldCheck className="h-8 w-8 text-[#f7c843]" />
                <h3 className="mt-16 text-2xl font-black">Secure Protocol</h3>
                <p className="mt-3 text-slate-300">Every transaction is protected by our proprietary encrypted luxury standards.</p>
              </Panel>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#071321] py-8 text-slate-100">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/10 bg-[#071321] shadow-[0_25px_90px_rgba(0,0,0,.55)]">
        {children}
      </div>
    </div>
  );
}

function MobileHeader({ admin = false }: { admin?: boolean }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0c1928] px-5">
      <BrandMark admin={admin} />
      <Bell className="h-5 w-5 text-[#f7c843]" aria-hidden="true" />
    </header>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Offer Details", "Proof of Funds", "Review & Sign"];
  return (
    <div className="flex items-start justify-between px-8 py-9">
      {labels.map((label, index) => {
        const current = index + 1;
        return (
          <div key={label} className="flex flex-1 items-start">
            <div className="text-center">
              <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-black ${current <= step ? "bg-[#f7c843] text-[#081321]" : "bg-slate-700 text-slate-100"}`}>
                {current}
              </span>
              <p className={`mt-3 max-w-[90px] text-sm font-black ${current === step ? "text-[#f7c843]" : "text-slate-100"}`}>{label}</p>
            </div>
            {current < labels.length ? <span className="mt-6 h-px flex-1 bg-white/12" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function BaytMiftahOfferDetails() {
  return (
    <MobileShell>
      <MobileHeader admin />
      <Stepper step={1} />
      <main className="px-5 pb-12">
        <h1 className="text-3xl font-black tracking-[-0.05em]">Submit Purchase Offer</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Drafting an official offer for <span className="text-[#f7c843]">The Onyx Penthouse, Dubai Marina.</span>
        </p>
        <Panel className="mt-8 p-7">
          <h2 className="flex items-center gap-3 text-2xl font-black"><CircleDollarSign className="h-6 w-6 text-[#f7c843]" /> Financial Proposal</h2>
          <div className="mt-7 space-y-5">
            {["Offer Price (AED)", "Earnest Money Deposit (EMD)", "Closing Date"].map((label, index) => (
              <label key={label} className="block text-xs font-black uppercase tracking-wide text-slate-300">
                {label}
                <input className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-[#071321] px-5 text-base normal-case tracking-normal text-slate-300" placeholder={index === 0 ? "$ 12,500,000" : index === 1 ? "$ 250,000" : "mm/dd/yyyy"} />
              </label>
            ))}
          </div>
        </Panel>
        <Panel className="mt-3 p-7">
          <h2 className="text-2xl font-black">Contingencies & Protections</h2>
          <div className="mt-6 space-y-4">
            {["Financing Contingency", "Home Inspection", "Appraisal Contingency"].map((item) => (
              <label key={item} className="flex gap-4 rounded-lg bg-[#071321] p-5">
                <span className="mt-1 h-5 w-5 rounded border border-white/25" />
                <span>
                  <span className="block font-black">{item}</span>
                  <span className="text-sm text-slate-300">Subject to a satisfactory protocol within 10 business days.</span>
                </span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel className="mt-3 p-7">
          <h2 className="text-2xl font-black">Additional Provisions</h2>
          <textarea className="mt-6 h-32 w-full rounded-lg border border-white/10 bg-[#071321] p-5 text-slate-300" placeholder="Any specific requests, furniture inclusions, or custom terms..." />
        </Panel>
        <div className="mt-8 flex items-center gap-5">
          <button className="flex-1 text-xs font-black" type="button">Save as Draft</button>
          <Link to="/baytmiftah/proof" className="flex-[2] rounded-lg bg-[#f7c843] px-6 py-5 text-center font-black text-[#081321]">
            Next: Terms & Conditions
          </Link>
        </div>
        <PropertyMiniCard />
        <Panel className="mt-7 p-6">
          <h3 className="font-black">Concierge Support</h3>
          <p className="mt-4 text-sm text-slate-300">Need legal assistance with your offer terms? Our Tier 1 advisors are available 24/7.</p>
          <button className="mt-5 w-full rounded-lg border border-[#f7c843] py-4 font-black text-[#f7c843]" type="button">Speak with Advisor</button>
        </Panel>
      </main>
      <MobileFooter />
    </MobileShell>
  );
}

function PropertyMiniCard() {
  return (
    <Panel className="mt-9 overflow-hidden">
      <LuxuryVisual kind="interior" className="h-44" />
      <div className="p-6">
        <span className="rounded bg-[#f7c843]/20 px-3 py-1 text-xs font-black text-[#f7c843]">ACTIVE LISTING</span>
        <h3 className="mt-5 text-xl font-black">The Onyx Penthouse</h3>
        <p className="mt-1 text-sm text-slate-300">Dubai Marina, Unit 8802</p>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
          <p className="flex justify-between"><span>Listing Price</span><b>AED 13,200,000</b></p>
          <p className="flex justify-between"><span>Estimated Taxes</span><b>AED 528,000 (4%)</b></p>
        </div>
      </div>
    </Panel>
  );
}

export function BaytMiftahProofOfFunds() {
  return (
    <MobileShell>
      <MobileHeader admin />
      <Stepper step={2} />
      <main className="px-6 pb-12">
        <h1 className="text-3xl font-black tracking-[-0.05em]">Financial Verification</h1>
        <p className="mt-7 text-xl leading-9 text-slate-300">
          To maintain the exclusivity and integrity of the BaytMiftah ecosystem, all offers require a verified Proof of Funds (POF) or a certified Mortgage Pre-approval.
        </p>
        <Panel className="mt-10 p-8">
          <div className="space-y-8">
            {[
              [ShieldCheck, "AES-256 Encryption", "Your documents are encrypted instantly and only accessible by authorized compliance officers."],
              [Shield, "Privacy First", "Sensitive account numbers may be redacted. We only require the account holder's name and total available balance."],
            ].map(([Icon, title, detail]) => (
              <div key={title as string} className="flex gap-5">
                <Icon className="h-8 w-8 flex-shrink-0 text-[#f7c843]" aria-hidden="true" />
                <div>
                  <p className="text-lg font-black uppercase tracking-[0.18em] text-[#f7c843]">{title as string}</p>
                  <p className="mt-2 text-base leading-6 text-slate-400">{detail as string}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="mt-8 border-[#f7c843]/30 bg-[#f7c843]/8 p-6">
          <div className="flex items-center gap-6">
            <span className="rounded-xl bg-[#f7c843] p-4 text-[#081321]"><ShieldCheck className="h-8 w-8" /></span>
            <div>
              <p className="text-lg font-black text-[#f7c843]">Verified Security Badge</p>
              <p className="font-mono text-sm text-slate-400">SYSTEM ID: BM-LX-9942</p>
            </div>
          </div>
        </Panel>
        <Panel className="mt-8 p-6">
          <h2 className="text-3xl font-black">Upload Documents</h2>
          <p className="mt-2 text-xl text-slate-200">Accepted formats: PDF, JPEG, PNG (Max 20MB)</p>
          <div className="mt-10 rounded-xl border-2 border-dashed border-white/15 p-12 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
              <CloudUpload className="h-10 w-10 text-[#f7c843]" aria-hidden="true" />
            </span>
            <p className="mt-8 text-2xl leading-9">Drag and drop your files here</p>
            <p className="mt-3">or</p>
            <button className="mt-6 rounded-full bg-[#f7c843] px-12 py-4 font-black tracking-[0.18em] text-[#081321]" type="button">Browse Files</button>
          </div>
          <div className="mt-8 flex items-center gap-5 rounded-lg bg-[#102033] p-5">
            <FileText className="h-8 w-8 text-slate-200" />
            <div className="flex-1">
              <p className="font-black">Chase_Statement_June.pdf</p>
              <p className="text-sm text-slate-400">2.4 MB - Encrypting...</p>
            </div>
            <Trash2 className="h-7 w-7 text-rose-300" />
          </div>
          <div className="mt-12 flex items-center gap-5 border-t border-white/10 pt-8">
            <Link to="/baytmiftah/offer" className="flex flex-1 items-center gap-2 font-black text-slate-200">
              <ArrowLeft className="h-5 w-5" /> Previous Step
            </Link>
            <Link to="/baytmiftah/review" className="flex-[1.7] rounded-full bg-[#f7c843] px-8 py-5 text-center font-black text-[#081321]">
              Continue to Review
            </Link>
          </div>
        </Panel>
      </main>
      <MobileFooter />
    </MobileShell>
  );
}

export function BaytMiftahReviewSign() {
  return (
    <MobileShell>
      <MobileHeader />
      <Stepper step={3} />
      <main className="px-5 pb-12">
        <PropertyMiniCard />
        <Panel className="mt-6 p-6">
          <div className="space-y-4 text-sm">
            <p className="flex justify-between"><span>Offer Price</span><b className="text-2xl">$14,500,000</b></p>
            <p className="flex justify-between"><span>Earnest Deposit (2%)</span><b>$290,000</b></p>
            <p className="flex justify-between"><span>Financing Amount</span><b>$8,700,000</b></p>
          </div>
        </Panel>
        <Panel className="mt-7 p-7">
          <h1 className="text-3xl font-black tracking-[-0.05em]">Review Agreement</h1>
          <p className="mt-3 text-sm text-slate-300">Please verify all contract terms before proceeding to signature.</p>
          {[
            ["01", "Transaction Terms", ["Closing Date|October 24, 2024", "Due Diligence Period|15 Calendar Days", "Possession|Upon Close of Escrow", "Offer Expiration|72 Hours from Submission"]],
            ["02", "Key Contingencies", ["Structural Inspection|Subject to comprehensive structural and roofing inspection by an approved certified inspector.", "Financing Approval|Offer is contingent upon buyer obtaining firm commitment for the mortgage amount listed."]],
            ["03", "Binding Authorization", ["By signing below, you acknowledge that this is a legally binding offer. You confirm that you have reviewed the Digital Signature Disclosure and agree to conduct this transaction electronically."]],
          ].map(([number, title, rows]) => (
            <section key={number as string} className="mt-10">
              <h2 className="flex gap-4 text-2xl font-black"><span className="text-[#f7c843]">{number as string}</span>{title as string}</h2>
              <div className="mt-6 space-y-4">
                {(rows as string[]).map((row) => {
                  const [label, value] = row.split("|");
                  return (
                    <div key={row} className="rounded-lg bg-[#0b1726] p-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                      <p className="mt-2 text-lg">{value || label}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="mt-8 h-44 rounded-lg border border-white/10 bg-[repeating-linear-gradient(180deg,transparent_0_20px,rgba(255,255,255,.05)_20px_21px)] p-6 text-center">
            <FileText className="mx-auto mt-12 h-7 w-7 text-slate-500" />
            <p className="mt-3 text-xs uppercase text-slate-500">Sign your name here</p>
          </div>
          <button className="mt-8 w-full rounded-lg bg-[#f7c843] px-6 py-6 text-lg font-medium text-[#081321]" type="button">
            Sign Document & Submit Offer
          </button>
          <p className="mt-7 text-center text-xs font-bold tracking-wide text-slate-400">Your signature will be timestamped and encrypted via BaytMiftah Secure Protocol.</p>
        </Panel>
      </main>
      <MobileFooter />
    </MobileShell>
  );
}

function MobileFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#06111d] px-8 py-8 text-center text-xs text-slate-400">
      <p className="font-black text-[#f7c843]">BaytMiftah Innovation</p>
      <p className="mt-2">© 2024 BaytMiftah Luxury Real Estate Ecosystem. Secure Encrypted Session.</p>
      <div className="mt-5 flex justify-center gap-8">
        {footerLinks.map((link) => <a key={link} href="#">{link}</a>)}
      </div>
    </footer>
  );
}

export function BaytMiftahCommandCenter() {
  return (
    <div className="min-h-screen bg-[#071321] pb-24 text-slate-100">
      <div className="flex">
        <aside className="hidden min-h-screen w-[300px] border-r border-white/10 bg-[#06111d] p-8 xl:block">
          <p className="text-3xl font-black">BaytMiftah</p>
          <p className="mt-2 font-black uppercase tracking-[0.2em] text-slate-400">Elite Partner</p>
          <nav className="mt-16 space-y-4">
            {["Dashboard", "Listings", "Analytics", "Clients", "Messages", "Settings"].map((item) => (
              <a key={item} className={`flex items-center gap-5 px-5 py-5 font-black ${item === "Dashboard" ? "border-r-4 border-[#f7c843] bg-[#f7c843]/10 text-[#f7c843]" : "text-slate-300"}`} href="#">
                <Grid3X3 className="h-6 w-6" /> {item}
              </a>
            ))}
          </nav>
          <button className="mt-80 flex w-full items-center justify-center gap-3 rounded-lg bg-[#f7c843] py-5 text-[#081321]" type="button">
            <Plus className="h-5 w-5" /> New Listing
          </button>
        </aside>
        <main className="mx-auto max-w-[1500px] flex-1 px-8 py-14">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-6xl font-black tracking-[-0.06em]">Command Center</h1>
              <p className="mt-5 text-2xl text-slate-300">Real-time global ecosystem oversight for Agency Partners.</p>
            </div>
            <Panel className="hidden px-8 py-5 lg:block">
              <p className="text-right text-lg font-black">Julian Thorne</p>
              <p className="text-right text-sm font-black uppercase tracking-[0.2em] text-[#f7c843]">Admin Verified</p>
            </Panel>
          </div>
          <section className="mt-14 grid gap-8 lg:grid-cols-3">
            <MetricCard title="Total Transaction Volume" value="$2.48B" detail="+14.2%" icon={CircleDollarSign} />
            <MetricCard title="Investor Growth" value="12.8k" detail="+5.1%" icon={UserPlus} />
            <MetricCard title="System Health Status" value="99.98%" detail="Optimal" icon={ShieldCheck} featured />
          </section>
          <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 p-8">
                <div>
                  <h2 className="text-3xl font-black">Global Market Heatmap</h2>
                  <p className="text-lg font-bold text-slate-300">Concentration of ultra-luxury transactions by region.</p>
                </div>
                <div className="flex gap-3">
                  <button className="rounded border border-[#f7c843] px-4 py-2 text-[#f7c843]" type="button">WEB</button>
                  <button className="rounded border border-white/20 px-4 py-2" type="button">MOBILE</button>
                </div>
              </div>
              <div className="relative h-[650px]">
                <LuxuryVisual kind="map" className="h-full" />
                <div className="absolute bottom-14 left-14 flex gap-8">
                  <div className="rounded border border-[#f7c843]/30 bg-[#071321]/80 p-5"><p className="font-black text-[#f7c843]">DUBAI HUB</p><p className="text-4xl font-black">$412M</p></div>
                  <div className="rounded border border-white/10 bg-[#071321]/80 p-5"><p className="font-black">LONDON CORE</p><p className="text-4xl font-black">$289M</p></div>
                </div>
              </div>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="border-b border-white/10 p-8">
                <h2 className="text-3xl font-black">Live Activity</h2>
                <p className="text-lg font-bold text-slate-300">Secured transactional protocol logs.</p>
              </div>
              <div className="space-y-8 p-8">
                {[
                  ["KYC Verified: Sheikh M. bin Rashid", "Tier 1 Compliance check passed. Encryption key assigned.", Lock],
                  ["New Escrow: Palm Jumeirah Villa", "Transaction hash assigned to listing.", KeyRound],
                  ["Access Attempt Blocked", "Unauthorized IP from VPN node rejected.", Shield],
                  ["Auction Finalized", "Bel Air Sanctuary sold for $42.5M.", Mail],
                ].map(([title, detail, Icon]) => (
                  <div key={title as string} className="flex gap-5">
                    <span className="rounded-lg bg-[#f7c843]/12 p-3 text-[#f7c843]"><Icon className="h-5 w-5" /></span>
                    <div>
                      <p className="text-lg font-black">{title as string}</p>
                      <p className="mt-2 text-slate-300">{detail as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

function AgencySidebar({ active = "Listings" }: { active?: string }) {
  const items = [
    ["Dashboard", Grid3X3],
    ["Listings", Building2],
    ["Analytics", LineChart],
    ["Clients", Users],
    ["Messages", MessageSquare],
    ["Settings", Gem],
  ] as const;

  return (
    <aside className="hidden w-[320px] flex-shrink-0 border-r border-white/10 bg-[#06111d] lg:flex lg:flex-col">
      <div className="px-8 pt-12">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f7c843]">Agency Portal</p>
        <p className="mt-2 text-xl text-slate-300">Elite Partner</p>
      </div>
      <nav className="mt-14">
        {items.map(([item, Icon]) => (
          <a
            key={item}
            href="#"
            className={`flex items-center gap-5 px-8 py-5 text-base font-black tracking-wide ${
              item === active
                ? "border-r-4 border-[#f7c843] bg-[#f7c843]/10 text-[#f7c843]"
                : "text-slate-300"
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
            {item}
          </a>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 px-8 py-8">
        <button className="flex w-full items-center justify-center gap-4 rounded-lg bg-[#f7c843] py-4 text-base font-medium text-[#081321]" type="button">
          <Plus className="h-6 w-6" aria-hidden="true" />
          New Listing
        </button>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <p className="flex items-center gap-3"><Shield className="h-4 w-4" aria-hidden="true" /> Security</p>
          <p className="flex items-center gap-3"><MessageSquare className="h-4 w-4" aria-hidden="true" /> Support</p>
        </div>
      </div>
    </aside>
  );
}

function MapBlueprint({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#0a1828] ${className}`}>
      <LuxuryVisual kind="map" className="absolute inset-0 h-full w-full opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0_30%,rgba(255,255,255,.09)_30%_31%,transparent_31%_100%),linear-gradient(25deg,transparent_0_42%,rgba(255,255,255,.07)_42%_43%,transparent_43%_100%)] opacity-80" />
      {[["left-[28%] top-[38%]"], ["left-[68%] top-[58%]"], ["left-[56%] top-[78%]"]].map(([position], index) => (
        <span
          key={index}
          className={`absolute h-5 w-5 rounded-full bg-[#f7c843] shadow-[0_0_40px_rgba(247,200,67,.8)] ${position}`}
        />
      ))}
      <div className="absolute right-8 top-10 flex gap-5">
        <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0d1a2a] text-3xl" type="button">+</button>
        <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0d1a2a] text-3xl" type="button">-</button>
      </div>
    </div>
  );
}

function AreaGuideCard({
  title,
  location,
  visual,
  tag,
}: {
  title: string;
  location: string;
  visual: VisualKind;
  tag: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/12 bg-[#0d1a2a]">
      <LuxuryVisual kind={visual} className="h-64" label={`${title} district`} />
      <div className="p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em]">{title}</h2>
            <p className="mt-2 flex items-center gap-2 text-lg text-slate-300">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              {location}
            </p>
          </div>
          <span className="rounded-md border border-[#f7c843]/30 bg-[#f7c843]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f7c843]">
            {tag}
          </span>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Yield", "5.8%"],
            ["Luxury", "9.9/10"],
            ["Schools", "4.2km"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-xs uppercase text-slate-300">{label}</p>
              <p className="mt-2 text-2xl font-black text-[#f7c843]">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between">
          <div className="flex -space-x-2">
            {["JV", "ER", "+12"].map((initials) => (
              <span key={initials} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#071321] bg-[#172536] text-xs font-black">
                {initials}
              </span>
            ))}
          </div>
          <Link to="/baytmiftah/listings" className="flex items-center gap-2 text-xl font-black text-[#f7c843]">
            View Listings <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BaytMiftahAreaGuides() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Developments" />
      <div className="flex border-b border-white/10">
        <AgencySidebar active="Listings" />
        <main className="grid min-h-[calc(100vh-80px)] flex-1 lg:grid-cols-[1.1fr_.9fr]">
          <section className="border-r border-white/10">
            <div className="px-8 py-14 lg:px-14">
              <h1 className="text-6xl font-black tracking-[-0.06em]">Area Guides</h1>
              <p className="mt-6 text-2xl text-slate-300">
                Discover the most prestigious residential enclaves in the region.
              </p>
              <div className="mt-8 flex h-16 max-w-2xl items-center gap-5 rounded-xl border border-white/20 bg-[#0d1a2a] px-6 text-xl text-slate-400">
                <Search className="h-7 w-7" aria-hidden="true" />
                Search by lifestyle (Beachfront, Golf, Urban)...
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {["All Districts", "Beachfront", "Golf Estates", "Skyline Views"].map((filter, index) => (
                  <button
                    key={filter}
                    className={`rounded-full px-6 py-3 font-bold ${
                      index === 0 ? "bg-[#f7c843] text-[#081321]" : "bg-slate-700 text-slate-100"
                    }`}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-8 border-t border-white/10 px-8 py-10 lg:px-14">
              <AreaGuideCard title="Palm Jumeirah" location="Dubai, UAE" visual="ocean" tag="Iconic" />
              <AreaGuideCard title="Downtown Core" location="Dubai, UAE" visual="skyline" tag="Prime" />
            </div>
          </section>
          <aside className="sticky top-20 hidden h-[calc(100vh-80px)] lg:block">
            <MapBlueprint className="absolute inset-0 h-full" />
            <Panel className="absolute bottom-28 left-12 right-12 p-8">
              <div className="flex items-start gap-6">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f7c843]/20 text-[#f7c843]">
                  <Sparkles className="h-8 w-8" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-black">Area Intelligence</h2>
                  <p className="text-lg text-slate-300">Real-time market insights</p>
                </div>
              </div>
              <div className="mt-8 space-y-6">
                {[
                  ["Average Rental Yield", "5.4%", "72%"],
                  ["Price Appreciation (YOY)", "+12.8%", "88%"],
                ].map(([label, value, width]) => (
                  <div key={label}>
                    <div className="flex justify-between font-medium">
                      <span>{label}</span>
                      <span className="font-black text-[#f7c843]">{value}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-700">
                      <span className="block h-full rounded-full bg-[#f7c843]" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </main>
      </div>
      <footer className="flex flex-wrap items-center gap-8 bg-[#06111d] px-12 py-8 text-xl text-slate-400">
        <p className="text-3xl font-black text-[#f7c843]">BaytMiftah</p>
        <p>Luxury Ecosystem</p>
        {["Privacy Policy", "Terms of Service", "Luxury Standards", "Global Press"].map((link) => (
          <a key={link} href="#" className="hover:text-[#f7c843]">{link}</a>
        ))}
        <p className="ml-auto text-sm">© 2024 BaytMiftah Luxury Ecosystem. Secure Protocol Encrypted.</p>
      </footer>
    </div>
  );
}

function ConversationPreview({
  name,
  status,
  time,
  active = false,
}: {
  name: string;
  status: string;
  time: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex w-full gap-5 px-8 py-7 text-left ${
        active ? "border-l-4 border-[#f7c843] bg-[#f7c843]/8" : "bg-transparent"
      }`}
      type="button"
    >
      <div className="h-14 w-14 overflow-hidden rounded-full border border-[#f7c843]/30">
        <LuxuryVisual kind="interior" className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <p className="truncate text-xl font-black">{name}</p>
          <span className="text-sm text-slate-300">{time}</span>
        </div>
        <p className="mt-1 truncate text-slate-300">Is the Penthouse at Skyview still available?</p>
        <span className="mt-3 inline-flex rounded-md border border-[#f7c843]/30 bg-[#f7c843]/10 px-3 py-1 text-xs font-black uppercase text-[#f7c843]">
          {status}
        </span>
      </div>
    </button>
  );
}

export function BaytMiftahMessages() {
  return (
    <div className="h-screen overflow-hidden bg-[#071321] text-slate-100">
      <PublicTopNav active="Messages" />
      <div className="grid h-[calc(100vh-80px)] lg:grid-cols-[320px_400px_1fr_360px]">
        <AgencySidebar active="Messages" />
        <aside className="hidden border-r border-white/10 bg-[#0d1a2a] lg:block">
          <div className="border-b border-white/10 p-8">
            <div className="flex h-12 items-center gap-4 rounded-full border border-white/20 bg-[#071321] px-5 text-slate-400">
              <Search className="h-5 w-5" aria-hidden="true" />
              Search conversations...
            </div>
            <div className="mt-5 flex gap-3">
              {["Active", "Unread", "Archived"].map((filter, index) => (
                <button key={filter} className={`rounded-full px-5 py-2 font-bold ${index === 0 ? "bg-[#f7c843] text-[#081321]" : "bg-slate-700"}`} type="button">
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <ConversationPreview name="Julian Vane" status="High Intent" time="12M AGO" active />
          <ConversationPreview name="Elena Rostova" status="Negotiating" time="2H AGO" />
          <ConversationPreview name="Marcus Sterling" status="Verified Buyer" time="Yesterday" />
        </aside>
        <main className="flex min-h-0 flex-col border-r border-white/10 bg-[#06111d]">
          <header className="flex items-center justify-between border-b border-white/10 px-10 py-7">
            <div>
              <h1 className="text-3xl font-black">Julian Vane</h1>
              <p className="text-slate-300">Skyview Residences - Penthouse B</p>
            </div>
            <div className="flex items-center gap-8">
              <Phone className="h-6 w-6" aria-hidden="true" />
              <Video className="h-6 w-6" aria-hidden="true" />
              <button className="rounded-full bg-[#f7c843]/12 px-7 py-4 font-black text-[#f7c843]" type="button">
                Concierge Support
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 space-y-9 overflow-y-auto px-10 py-10">
            <p className="mx-auto w-fit rounded-full bg-slate-700 px-8 py-2 text-sm uppercase tracking-[0.2em] text-slate-300">
              Thursday, October 24
            </p>
            <div className="max-w-md rounded-2xl border border-white/10 bg-[#172536] p-7 text-xl leading-8">
              Good morning. I have reviewed the prospectus for the Skyview Residences. The architectural narrative is compelling. Is the private elevator access confirmed for Penthouse B?
              <p className="mt-5 text-sm text-slate-400">09:12 AM</p>
            </div>
            <div className="ml-auto max-w-md rounded-2xl border border-[#f7c843]/40 bg-[#f7c843]/10 p-7 text-center text-xl leading-8">
              Absolutely, Julian. Penthouse B includes a dual-redundancy private elevator system with biometric entry. It opens directly into your private foyer.
              <p className="mt-5 text-right text-sm text-slate-400">09:15 AM</p>
            </div>
            <div className="ml-auto max-w-sm overflow-hidden rounded-2xl border border-[#f7c843]/40">
              <LuxuryVisual kind="interior" className="h-56" />
              <div className="p-5">
                <p className="text-xl font-black">Skyview Residences</p>
                <p className="font-black text-[#f7c843]">Floor Plan & Security Specs.pdf</p>
              </div>
            </div>
          </div>
          <footer className="border-t border-white/10 px-10 py-6">
            <div className="flex items-center gap-5">
              <div className="flex flex-1 items-center gap-4 rounded-2xl border border-white/15 bg-[#0d1a2a] px-6 py-4 text-xl text-slate-400">
                Draft a professional
                <Paperclip className="ml-auto h-6 w-6" aria-hidden="true" />
                <Smile className="h-6 w-6" aria-hidden="true" />
                <Mic className="h-6 w-6" aria-hidden="true" />
              </div>
              <button className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f7c843] text-[#081321]" type="button">
                <Send className="h-9 w-9" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 flex gap-8 text-sm font-black uppercase tracking-[0.16em] text-slate-300">
              <button type="button">Standard Reply</button>
              <button type="button">AI Suggestion</button>
            </div>
          </footer>
        </main>
        <aside className="hidden bg-[#0d1a2a] xl:block">
          <div className="border-b border-white/10 p-10 text-center">
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-[#f7c843]/30">
              <LuxuryVisual kind="interior" className="h-full w-full" />
            </div>
            <h2 className="mt-8 text-3xl font-black">Julian Vane</h2>
            <p className="mt-2 uppercase tracking-[0.2em] text-slate-300">Global Portfolio Manager</p>
          </div>
          <div className="space-y-8 p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Investor Profile</p>
              {[
                ["Status", "Verified Whale"],
                ["Preferred Range", "$12M - $25M"],
                ["Avg. Response Time", "14 mins"],
              ].map(([label, value]) => (
                <p key={label} className="mt-5 flex justify-between text-lg"><span>{label}</span><b className="text-[#f7c843]">{value}</b></p>
              ))}
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Active Inquiry</p>
              <article className="mt-5 overflow-hidden rounded-xl border border-[#f7c843]/30">
                <LuxuryVisual kind="villa" className="h-36" />
                <div className="p-5">
                  <p className="font-black">Skyview Residences - Penthouse B</p>
                  <p className="text-sm font-black text-[#f7c843]">$18,500,000</p>
                </div>
              </article>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Milestones</p>
              <div className="mt-5 space-y-7 border-l border-white/20 pl-6">
                {["Viewing Scheduled", "Offer Submission", "KYC Verification"].map((item, index) => (
                  <p key={item} className={`relative ${index === 0 ? "text-slate-100" : "text-slate-500"}`}>
                    <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full ${index === 0 ? "bg-[#f7c843]" : "bg-slate-600"}`} />
                    <b>{item}</b>
                    {index === 0 ? <span className="block text-sm">Saturday, 18:00 PM</span> : null}
                  </p>
                ))}
              </div>
            </div>
            <button className="w-full rounded-lg bg-[#f7c843] py-4 font-black text-[#081321]" type="button">Schedule Viewing</button>
            <button className="w-full rounded-lg border border-[#f7c843] py-4 font-black text-[#f7c843]" type="button">Generate Contract</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function BaytMiftahMobileMessages() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <div className="mx-auto min-h-screen max-w-[663px] border-x border-white/10 bg-[#071321]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#071321] px-7 py-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-[#f7c843]/40">
            <LuxuryVisual kind="interior" className="h-full w-full" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-medium text-[#f7c843]">
              Julian Vane <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.24em] text-slate-300">Elite Portfolio Director</p>
          </div>
        </div>
        <div className="flex gap-6 text-slate-300">
          <Phone className="h-7 w-7" aria-hidden="true" />
          <CalendarDays className="h-7 w-7" aria-hidden="true" />
        </div>
      </header>
      <main className="px-7 pb-56 pt-8">
        <Panel className="flex items-center gap-5 p-5">
          <LuxuryVisual kind="interior" className="h-20 w-28 flex-shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f7c843]">Currently Discussing</p>
            <h2 className="truncate text-2xl">The Obsidian Penthouse</h2>
            <p className="text-xl text-slate-300">$12,450,000 - Downtown Core</p>
          </div>
          <ChevronRight className="h-7 w-7 text-slate-300" aria-hidden="true" />
        </Panel>
        <p className="mt-10 text-center text-sm uppercase tracking-[0.24em] text-slate-500">Today, 10:45 AM</p>
        <div className="mt-8 max-w-[88%] rounded-3xl bg-slate-700 p-7 text-2xl leading-10">
          Good morning. I have just received the private inspection report for the Obsidian Penthouse. The terrace structural verification is complete.
        </div>
        <p className="mt-2 text-sm uppercase text-slate-300">Julian - 10:46 AM</p>
        <div className="ml-auto mt-8 max-w-[88%] rounded-3xl bg-[#f7c843] p-7 text-2xl leading-10 text-[#081321]">
          Excellent news, Julian. Did the report mention anything about the bespoke automation system in the master suite?
        </div>
        <p className="mt-2 text-right text-sm uppercase text-slate-300">Sent - 10:48 AM</p>
        <article className="mt-8 overflow-hidden rounded-3xl bg-slate-700">
          <LuxuryVisual kind="bedroom" className="h-72" />
          <div className="p-7 text-2xl leading-10">
            Yes, it is fully operational. I have attached a snapshot of the interface. It is the latest Savant system, integrated with the building's concierge AI.
          </div>
        </article>
      </main>
      </div>
      <div className="fixed bottom-[88px] left-1/2 z-20 flex w-[min(608px,calc(100vw-42px))] -translate-x-1/2 items-center gap-4 rounded-full border border-white/12 bg-[#0d1a2a] px-7 py-5 text-slate-400">
        <Paperclip className="h-7 w-7" aria-hidden="true" />
        <span className="flex-1 text-2xl">Message Julian...</span>
        <button className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f7c843] text-[#081321]" type="button">
          <Send className="h-8 w-8" aria-hidden="true" />
        </button>
      </div>
      <nav className="fixed bottom-0 left-1/2 z-20 grid w-[min(663px,100vw)] -translate-x-1/2 grid-cols-5 rounded-t-2xl border border-white/10 bg-[#071321] px-5 py-4 text-center text-slate-300">
        {[
          ["Home", Home],
          ["Listings", Building2],
          ["Invest", TrendingUp],
          ["Leads", MessageSquare],
          ["Menu", MoreHorizontal],
        ].map(([label, Icon]) => (
          <a key={label as string} href="#" className={`rounded-2xl px-2 py-3 ${label === "Leads" ? "bg-[#f7c843]/10 text-[#f7c843]" : ""}`}>
            <Icon className="mx-auto h-7 w-7" aria-hidden="true" />
            <span className="mt-1 block text-sm">{label as string}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function AureusHeader({
  active = "Concierge",
  search = false,
  searchLabel = "Search Markets...",
}: {
  active?: string;
  search?: boolean;
  searchLabel?: string;
}) {
  const items = ["Marketplace", "Concierge", "Portfolio"];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071321]/95 px-8 py-5 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-12">
        <Link to="/baytmiftah/aureus-district" className="text-5xl font-black tracking-[-0.08em] text-[#f7c843]">
          AUREUS
        </Link>
        <nav className="hidden items-center gap-12 text-xl text-slate-200 lg:flex">
          {items.map((item) => (
            <Link
              key={item}
              to={item === "Concierge" ? "/baytmiftah/aureus-district" : "#"}
              className={`border-b-2 py-2 ${item === active ? "border-[#f7c843] text-[#f7c843]" : "border-transparent"}`}
            >
              {item}
            </Link>
          ))}
        </nav>
        {search ? (
          <div className="ml-auto hidden h-14 w-80 items-center gap-4 rounded-xl bg-slate-700 px-5 text-slate-400 lg:flex">
            <Search className="h-5 w-5" aria-hidden="true" />
            {searchLabel}
          </div>
        ) : (
          <div className="ml-auto hidden h-14 w-80 items-center gap-4 rounded-full bg-slate-700 px-6 text-slate-400 lg:flex">
            {searchLabel} <Search className="ml-auto h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <button className="rounded-full bg-[#f7c843] px-10 py-4 text-base font-black uppercase tracking-[0.16em] text-[#081321]" type="button">
          Elite Access
        </button>
        <Bell className="hidden h-6 w-6 text-[#f7c843] sm:block" aria-hidden="true" />
        <ShieldCheck className="hidden h-7 w-7 text-[#f7c843] sm:block" aria-hidden="true" />
      </div>
    </header>
  );
}

function AureusSidebar({ active = "Analytics" }: { active?: string }) {
  const items = [
    ["CRM", Users],
    ["Listings", Building2],
    ["Financials", CircleDollarSign],
    ["Analytics", BarChart3],
  ] as const;
  const bottomItems = [
    ["Settings", Settings],
    ["Support", MessageSquare],
  ] as const;

  return (
    <aside className="hidden w-[300px] flex-shrink-0 border-r border-white/10 bg-[#06111d] xl:flex xl:flex-col">
      <div className="flex items-center gap-4 px-8 py-10">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-[#f7c843]/40">
          <LuxuryVisual kind="interior" className="h-full w-full" />
        </div>
        <div>
          <p className="font-black text-[#f7c843]">Agent Terminal</p>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Luxury Division</p>
        </div>
      </div>
      <nav className="mt-10 space-y-4 px-5">
        {items.map(([item, Icon]) => (
          <a
            key={item}
            href="#"
            className={`flex items-center gap-6 rounded-xl px-7 py-5 text-lg font-black ${
              item === active
                ? "border-r-4 border-[#f7c843] bg-[#f7c843]/10 text-[#f7c843]"
                : "text-slate-300"
            }`}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
            {item}
          </a>
        ))}
      </nav>
      <button className="mx-7 mt-10 rounded-lg border border-[#f7c843] py-4 text-lg font-black uppercase tracking-[0.18em] text-[#f7c843]" type="button">
        + New Listing
      </button>
      <div className="mt-auto border-t border-white/10 px-5 py-10 text-slate-300">
        {bottomItems.map(([item, Icon]) => (
          <a
            key={item}
            href="#"
            className={`mt-4 flex items-center gap-4 rounded-xl px-3 py-3 ${
              item === active ? "bg-[#f7c843]/10 font-black text-[#f7c843]" : ""
            }`}
          >
            <Icon className="h-5 w-5" />
            {item}
          </a>
        ))}
      </div>
    </aside>
  );
}

function AureusPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-white/12 bg-[#0d1a2a] ${className}`}>{children}</section>;
}

function HeatRows() {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: 25 }).map((_, index) => (
        <span
          key={index}
          className={`h-8 rounded ${index % 6 === 2 || index % 7 === 4 ? "bg-[#f7c843]" : index % 3 === 0 ? "bg-[#9d8435]" : "bg-slate-700"}`}
        />
      ))}
    </div>
  );
}

function DistrictLineChart() {
  return (
    <div className="relative mt-10 h-[380px] overflow-hidden rounded-lg bg-[#0a1624]">
      <div className="absolute inset-x-12 bottom-20 h-px bg-white/12" />
      <div className="absolute inset-x-12 bottom-40 h-px bg-white/8" />
      <div className="absolute inset-x-12 bottom-60 h-px bg-white/8" />
      <div className="absolute left-16 right-16 top-28 h-44">
        <div className="absolute left-0 top-[54%] h-1 w-full rounded-full bg-slate-500/60" />
        <div className="absolute left-0 top-[47%] h-px w-full rotate-[-8deg] border-t border-dashed border-slate-200/70" />
        <div className="absolute left-0 top-[42%] h-1 w-full rotate-[-11deg] rounded-full bg-[#f7c843] shadow-[0_0_20px_rgba(247,200,67,.35)]" />
      </div>
      <div className="absolute inset-x-12 bottom-8 flex justify-between text-sm uppercase text-slate-500">
        {"JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ").map((month) => <span key={month}>{month}</span>)}
      </div>
    </div>
  );
}

export function AureusDistrictDetail() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <header className="border-b border-white/10 bg-[#071321] px-8 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-12">
          <Link to="/baytmiftah/aureus-district" className="text-2xl font-black text-[#f7c843]">AUREUS</Link>
          <nav className="hidden gap-10 text-sm lg:flex">
            {["Marketplace", "Concierge", "Portfolio"].map((item) => (
              <a key={item} className={`border-b py-2 ${item === "Concierge" ? "border-[#f7c843] text-[#f7c843]" : "border-transparent"}`} href="#">{item}</a>
            ))}
          </nav>
          <button className="ml-auto rounded-full bg-[#f7c843] px-6 py-2 text-xs font-black text-[#081321]" type="button">Elite Access</button>
          <Bell className="h-4 w-4" />
          <ShieldCheck className="h-4 w-4" />
        </div>
      </header>
      <main>
        <section className="mx-auto flex min-h-[680px] max-w-7xl flex-col justify-end px-8 pb-14">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f7c843]">Exclusive District</p>
          <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-6xl font-medium tracking-[-0.05em]">Palm Jumeirah</h1>
              <p className="mt-8 max-w-xl leading-7 text-slate-200">
                The eighth wonder of the world. A man-made masterpiece that redefines ultra-luxury living through private fronds, beach clubs, and the world's most prestigious residences.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["5.4%", "Rental Yield"],
                ["AAA+", "Luxury Index"],
                ["Top 5", "School Dist."],
              ].map(([value, label]) => (
                <AureusPanel key={label} className="min-w-36 p-5 text-center">
                  <p className="text-2xl font-black text-[#f7c843]">{value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase">{label}</p>
                </AureusPanel>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-10 px-8 py-10 md:grid-cols-3">
          <div>
            <h2 className="font-black">Technical Market Intelligence</h2>
            {[
              ["Avg. Price PSF", "AED 3,850", "72%"],
              ["Inventory Absorption", "14 Days", "48%"],
              ["Year-on-Year Growth", "+22.4%", "86%"],
            ].map(([label, value, width]) => (
              <div key={label} className="mt-5 border-b border-white/8 pb-4">
                <p className="flex justify-between text-sm"><span>{label}</span><b>{value}</b></p>
                <span className="mt-3 block h-1 rounded-full bg-slate-700"><span className="block h-full rounded-full bg-[#f7c843]" style={{ width }} /></span>
              </div>
            ))}
          </div>
          {[
            ["The Frond Ecosystem", "The Palm Jumeirah's frond system provides unparalleled privacy. Controlled gated access ensures each bay remains an asset class unto itself."],
            ["Investment Security", "As Dubai's mature luxury market, the Palm represents a flight to quality, limited land supply, and institutional-level private portfolios."],
          ].map(([title, detail]) => (
            <div key={title}>
              <ShieldCheck className="h-5 w-5 text-[#f7c843]" />
              <h2 className="mt-5 font-black">{title}</h2>
              <p className="mt-4 leading-7 text-slate-300">{detail}</p>
            </div>
          ))}
        </section>
        <section className="mx-auto max-w-7xl px-8 py-10">
          <AureusPanel className="relative h-[430px] overflow-hidden p-6">
            <LuxuryVisual kind="map" className="absolute inset-0 h-full opacity-70" />
            <div className="relative w-64 rounded-lg border border-white/12 bg-[#0d1a2a]/90 p-5">
              <h3 className="font-black">Price Heatmap</h3>
              {["Ultra-Premium", "Prime", "Emerging"].map((item, index) => (
                <p key={item} className="mt-3 flex items-center justify-between text-xs uppercase">
                  {item}<span className={`h-3 w-3 rounded-full ${index === 0 ? "bg-[#f7c843]" : "bg-slate-500"}`} />
                </p>
              ))}
              <button className="mt-5 rounded bg-[#f7c843]/12 px-6 py-3 text-xs font-bold text-[#f7c843]" type="button">Explore Fronds</button>
            </div>
          </AureusPanel>
        </section>
        <section className="mx-auto max-w-7xl px-8 py-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7c843]">Curation</p>
              <h2 className="mt-2 text-4xl font-black">Flagship Developments</h2>
            </div>
            <button className="rounded-full border border-[#f7c843] px-6 py-3 text-sm text-[#f7c843]" type="button">View All Properties</button>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_.7fr]">
            <article className="overflow-hidden rounded-xl bg-[#0d1a2a]">
              <LuxuryVisual kind="tower" className="h-[520px]" />
              <div className="-mt-24 relative p-8">
                <h3 className="text-2xl font-black">The Royal Atlantis</h3>
                <p className="text-xs font-black uppercase text-[#f7c843]">Residences & Mansions</p>
              </div>
            </article>
            <div className="grid gap-6">
              {[
                ["Signature Villas", "From $M", "ocean" as const],
                ["W Residences", "West Crescent", "interior" as const],
              ].map(([title, sub, visual]) => (
                <article key={title} className="overflow-hidden rounded-xl bg-[#0d1a2a]">
                  <LuxuryVisual kind={visual as VisualKind} className="h-60" />
                  <div className="-mt-16 relative p-5">
                    <p className="font-black">{title}</p>
                    <p className="text-xs font-black uppercase text-[#f7c843]">{sub}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-[#112032] px-8 py-16 text-center">
          <h2 className="text-4xl font-black">The Aureus Lifestyle</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">A curated selection of the district's most exclusive Michelin-starred culinary experiences and private member clubs.</p>
          <div className="mx-auto mt-10 grid max-w-7xl gap-7 md:grid-cols-3">
            {[
              ["Dinner by Heston", "Michelin Guide", "bath" as const],
              ["Palm Yacht Club", "Private Member", "ocean" as const],
              ["The Nakheel Galleria", "Luxe Retail", "interior" as const],
            ].map(([title, tag, visual]) => (
              <article key={title} className="overflow-hidden rounded-xl bg-[#0d1a2a] text-left">
                <LuxuryVisual kind={visual as VisualKind} className="h-48" />
                <div className="p-6">
                  <p className="text-xs font-black uppercase text-[#f7c843]">{tag}</p>
                  <h3 className="mt-3 font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Bespoke access, private rooms, and high-touch reservation support.</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-8 py-16">
          <AureusPanel className="flex flex-col gap-8 p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black">Request Area Report</h2>
              <p className="mt-4 max-w-lg text-slate-300">Get the full 42-page technical analysis of Palm Jumeirah, including off-plan projections and transaction history.</p>
            </div>
            <div className="flex gap-4">
              <input className="h-14 rounded-full bg-slate-700 px-6" placeholder="Professional Email" />
              <button className="rounded-full bg-[#f7c843] px-9 font-black text-[#081321]" type="button">Download PDF</button>
            </div>
          </AureusPanel>
        </section>
      </main>
    </div>
  );
}

export function AureusAnalyticsDashboard() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Concierge" />
      <div className="flex">
        <AureusSidebar active="Analytics" />
        <main className="mx-auto max-w-[1500px] flex-1 px-8 py-8">
          <section className="grid gap-8 xl:grid-cols-4">
            {[
              ["Global Index", "2,481.50", "+1.2%"],
              ["Total Inventory", "12,840", "-4.8%"],
              ["Investor Sentiment", "Bullish", "||||"],
              ["Median Price (SQFT)", "$3,250", "Stable"],
            ].map(([label, value, detail]) => (
              <AureusPanel key={label} className="p-8">
                <p className="text-xl uppercase tracking-[0.22em] text-slate-300">{label}</p>
                <p className="mt-4 text-4xl font-light text-[#f7c843]">{value}</p>
                <p className="mt-2 text-lg text-slate-300">{detail}</p>
              </AureusPanel>
            ))}
          </section>
          <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_390px]">
            <AureusPanel className="p-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl text-[#f7c843]">District Performance Index</h2>
                  <p className="mt-2 max-w-xl text-2xl text-slate-400">Price progression across major luxury hubs over 12 months</p>
                </div>
                <div className="flex gap-4">
                  {["12M", "6M", "1M"].map((item, index) => (
                    <button key={item} className={`rounded-full px-5 py-2 ${index === 0 ? "border border-[#f7c843] text-[#f7c843]" : "border border-white/15"}`} type="button">{item}</button>
                  ))}
                </div>
              </div>
              <DistrictLineChart />
            </AureusPanel>
            <AureusPanel className="p-10">
              <h2 className="text-2xl text-[#f7c843]">Market Intensity</h2>
              <p className="mt-4 text-2xl text-slate-400">Transaction velocity by hour and district</p>
              <div className="mt-10">
                <HeatRows />
              </div>
              <div className="mt-10 flex items-center gap-5 text-sm">
                <span>Low Activity</span>
                <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-slate-700 to-[#f7c843]" />
                <span>Peak Sales</span>
              </div>
            </AureusPanel>
          </section>
          <section className="mt-8 grid gap-8 xl:grid-cols-[.8fr_1.2fr]">
            <AureusPanel className="p-10 text-center">
              <h2 className="text-left text-2xl text-[#f7c843]">Supply Absorption</h2>
              <div className="mx-auto mt-12 flex h-64 w-64 items-center justify-center rounded-full border-[14px] border-[#f7c843] border-l-slate-700">
                <div>
                  <p className="text-5xl font-light text-[#f7c843]">75%</p>
                  <p className="uppercase tracking-[0.18em]">Sold Units</p>
                </div>
              </div>
              <p className="mt-10 text-2xl">Market liquidity is <b className="text-[#f7c843]">Optimal</b></p>
            </AureusPanel>
            <AureusPanel className="p-10">
              <div className="flex justify-between">
                <h2 className="text-2xl text-[#f7c843]">Recent High-Value Liquidity</h2>
                <button className="font-black text-[#f7c843]" type="button">View Ledger</button>
              </div>
              <div className="mt-8 space-y-5">
                {[
                  ["Penthouse A-12, Royal Atlantis", "$24.5M", "2 mins ago"],
                  ["Villa 84, District One", "$18.2M", "14 mins ago"],
                  ["The Bulgari Resort, Unit 302", "$112M", "1 hour ago"],
                ].map(([title, value, time], index) => (
                  <div key={title} className="flex items-center gap-5 rounded-lg border border-white/8 bg-white/5 p-5">
                    <span className={`h-3 w-3 rounded-full ${index === 0 ? "bg-emerald-400" : "bg-slate-700"}`} />
                    <div className="flex-1">
                      <p className="text-xl">{title}</p>
                      <p className="text-xs uppercase text-slate-400">Secondary market sale</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl text-[#f7c843]">{value}</p>
                      <p className="text-slate-400">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AureusPanel>
          </section>
          <section className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ["High Density", "Downtown Core", "skyline" as const],
              ["Waterfront", "Palm Jumeirah", "ocean" as const],
              ["Ultra-Exclusive", "Emirates Hills", "villa" as const],
            ].map(([tag, title, visual]) => (
              <article key={title} className="overflow-hidden rounded-xl border border-white/12 bg-[#0d1a2a]">
                <LuxuryVisual kind={visual as VisualKind} className="h-72" />
                <div className="-mt-24 relative p-8">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f7c843]">{tag}</p>
                  <h3 className="mt-3 text-2xl">{title}</h3>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export function AureusFinancialLedger() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Concierge" search />
      <div className="flex">
        <AureusSidebar active="Financials" />
        <main className="mx-auto max-w-[1500px] flex-1 px-10 py-8">
          <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="uppercase tracking-[0.2em] text-slate-400">Executive / Financials</p>
              <h1 className="mt-4 text-6xl font-black tracking-[-0.06em]">Financial Ledger</h1>
              <p className="mt-5 max-w-3xl text-2xl leading-9 text-slate-300">
                Real-time oversight of agency revenue streams, escrow performance, and commission disbursements for the luxury portfolio.
              </p>
            </div>
            <div className="flex gap-6">
              <button className="rounded-xl bg-slate-700 px-12 py-6 text-2xl" type="button">Download Audit</button>
              <button className="rounded-xl bg-[#f7c843] px-12 py-6 text-2xl text-[#081321]" type="button">Initiate Transfer</button>
            </div>
          </section>
          <section className="mt-12 grid gap-8 lg:grid-cols-3">
            <AureusPanel className="p-10"><p className="text-2xl uppercase tracking-[0.18em] text-slate-300">Agency Revenue (YTD)</p><p className="mt-4 text-5xl text-[#f7c843]">$12,482,900</p><p className="mt-6 text-xl text-emerald-300">+ 14.2% from last quarter</p></AureusPanel>
            <AureusPanel className="p-10"><p className="text-2xl uppercase tracking-[0.18em] text-slate-300">In Escrow Pipeline</p><p className="mt-4 text-5xl">$4,105,000</p><span className="mt-8 block h-2 rounded-full bg-slate-700"><span className="block h-full w-3/4 rounded-full bg-[#f7c843]" /></span><p className="mt-5">8 high-value closings expected by Oct 30</p></AureusPanel>
            <AureusPanel className="border-[#f7c843]/30 p-10"><p className="text-2xl uppercase tracking-[0.18em] text-[#f7c843]">Secure Gateway</p><p className="mt-5 text-2xl">Escrow Management</p><button className="mt-12 w-full rounded-lg border border-[#f7c843]/40 bg-slate-700 px-6 py-4 text-xl" type="button">Authenticate Gateway</button></AureusPanel>
          </section>
          <section className="mt-12 grid gap-8 xl:grid-cols-[1fr_420px]">
            <AureusPanel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 p-10">
                <h2 className="text-2xl">Recent Commissions & Fees</h2>
                <button className="rounded-lg bg-slate-700 px-6 py-4" type="button">All Assets</button>
              </div>
              <div className="grid grid-cols-[1.2fr_.8fr_.8fr_.7fr] gap-6 px-10 py-6 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                <p>Property / Asset</p><p>Transaction ID</p><p>Amount</p><p>Status</p>
              </div>
              {[
                ["The Obsidian Heights", "Bel Air, CA", "#TX-88210-ZP", "$245,000.00", "Settled"],
                ["Azure Point Villa", "Malibu, CA", "#TX-91024-MV", "$182,500.00", "Pending"],
                ["The Gilded Atrium", "Manhattan, NY", "#TX-72331-GA", "$410,200.00", "Escrow"],
              ].map(([name, location, tx, amount, status]) => (
                <div key={name} className="grid grid-cols-[1.2fr_.8fr_.8fr_.7fr] items-center gap-6 border-t border-white/8 px-10 py-8">
                  <div className="flex items-center gap-5"><LuxuryVisual kind="interior" className="h-12 w-12 rounded" /><div><p className="text-2xl">{name}</p><p>{location}</p></div></div>
                  <p className="text-xl">{tx}</p>
                  <p className="text-2xl">{amount}<span className="block text-sm font-black text-[#f7c843]">2.5% Commission</span></p>
                  <p><span className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-black uppercase text-emerald-300">{status}</span></p>
                </div>
              ))}
              <button className="w-full border-t border-white/8 py-8 text-lg font-black uppercase tracking-[0.18em] text-[#f7c843]" type="button">View Full Archive</button>
            </AureusPanel>
            <div className="space-y-8">
              <AureusPanel className="p-10">
                <h2 className="text-2xl">Revenue Growth</h2>
                <div className="mt-12 flex h-64 items-end gap-5">
                  {[34, 55, 48, 86, 66, 95].map((height, index) => <span key={index} className={`flex-1 rounded-t ${index === 3 ? "bg-[#f7c843]" : "bg-slate-700"}`} style={{ height: `${height}%` }} />)}
                </div>
                <div className="mt-8 flex justify-between text-sm uppercase text-slate-300">{"MAY JUN JUL AUG SEP OCT".split(" ").map((m) => <span key={m}>{m}</span>)}</div>
                <p className="mt-12 flex justify-between text-xl">Market Share Projection <b>+18.5%</b></p>
              </AureusPanel>
              <AureusPanel className="p-10">
                <h2 className="text-2xl">Disbursement Logic</h2>
                {[
                  ["Agency Operating", "15%"],
                  ["Agent Commission", "75%"],
                  ["Tax Provision", "10%"],
                ].map(([label, value]) => <p key={label} className="mt-8 flex justify-between rounded-lg bg-slate-700 p-5 text-xl"><span>{label}</span><b>{value}</b></p>)}
              </AureusPanel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function BaytMobileHeader({ admin = false, title }: { admin?: boolean; title?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#071321] px-4 py-4">
      <div className="flex items-center gap-3">
        <Menu className="h-5 w-5 text-[#f7c843]" aria-hidden="true" />
        <h1 className="text-2xl font-black tracking-[-0.04em] text-[#f7c843]">{title || (admin ? "BaytMiftah Admin" : "BaytMiftah")}</h1>
      </div>
      <div className="h-8 w-8 overflow-hidden rounded-full border border-[#f7c843]/40">
        <LuxuryVisual kind="interior" className="h-full w-full" />
      </div>
    </header>
  );
}

function BaytMobileBottom({ active = "Home" }: { active?: string }) {
  const items = [
    ["Home", Home],
    ["Listings", Building2],
    ["Invest", TrendingUp],
    ["Leads", Users],
    ["Menu", MoreHorizontal],
  ] as const;

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 grid w-[min(430px,100vw)] -translate-x-1/2 grid-cols-5 border-t border-white/10 bg-[#071321] px-2 py-2 text-center text-[11px] text-slate-300">
      {items.map(([item, Icon]) => (
        <a key={item} href="#" className={`rounded-xl px-1 py-2 ${item === active ? "bg-[#f7c843]/10 text-[#f7c843]" : ""}`}>
          <Icon className="mx-auto h-5 w-5" />
          <span className="mt-1 block">{item}</span>
        </a>
      ))}
    </nav>
  );
}

function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <div className="mx-auto min-h-screen max-w-[430px] border-x border-white/10 bg-[#071321]">
        {children}
      </div>
    </div>
  );
}

export function BaytMiftahMobileLanding() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-28">
        <section className="pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f7c843]">Global Trust Ranking #1</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">Extraordinary Living, <span className="text-[#f7c843]">Authenticated by Excellence.</span></h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">Discover thousands of discerning investors choosing BaytMiftah for their portfolio management.</p>
          <div className="mt-5 flex gap-3">
            <button className="rounded-lg bg-[#f7c843] px-5 py-3 text-xs font-black text-[#081321]" type="button">Get The App</button>
            <button className="rounded-lg border border-[#f7c843] px-5 py-3 text-xs font-black text-[#f7c843]" type="button">View Portfolios</button>
          </div>
        </section>
        <Panel className="mt-8 overflow-hidden p-2"><LuxuryVisual kind="villa" className="h-48 rounded-lg" /></Panel>
        <section className="mt-8">
          <h2 className="font-black">Client Testimonials</h2>
          <p className="mt-1 text-xs text-slate-300">Real stories from our global community.</p>
          {[
            ["Marcus Thorne", "Tech Founder", "The concierge-level service is unparalleled. BaytMiftah found me a penthouse before it went public."],
            ["Sarah Mitchell", "Interior Architect", "A frequent traveler, having a mobile-first interface that handles everything is a game-changer."],
            ["David G.", "Portfolio Manager", "The transparency in their fee structure and depth of market analysis provided our investment committee confidence."],
          ].map(([name, role, quote]) => (
            <Panel key={name} className="mt-5 p-5">
              <div className="flex items-center gap-3"><LuxuryVisual kind="interior" className="h-10 w-10 rounded-full" /><div><p className="text-xs font-black">{name}</p><p className="text-[10px] text-slate-300">{role}</p></div></div>
              <p className="mt-4 text-sm italic leading-6 text-slate-200">"{quote}"</p>
            </Panel>
          ))}
        </section>
        <Panel className="mt-8 overflow-hidden">
          <div className="p-5">
            <h2 className="text-2xl font-black">Future of Estate <span className="text-[#f7c843]">In Your Pocket</span></h2>
            <p className="mt-3 text-sm text-slate-300">Manage listings, tours, documents, and concierge requests from a single secure command surface.</p>
          </div>
          <LuxuryVisual kind="bedroom" className="mx-auto mb-5 h-72 w-48 rounded-3xl border border-white/15" />
        </Panel>
        <div className="mt-8 grid grid-cols-2 gap-5 text-center">
          {["12B+ Asset Value Managed", "14 Global Offices", "98% Client Retention", "24/7 Expert Support"].map((item) => {
            const [value, ...label] = item.split(" ");
            return <p key={item}><b className="block text-xl text-[#f7c843]">{value}</b><span className="text-[10px] uppercase">{label.join(" ")}</span></p>;
          })}
        </div>
      </main>
      <BaytMobileBottom active="Menu" />
    </MobileFrame>
  );
}

export function BaytMiftahMobileTrust() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-28 pt-6">
        <h1 className="text-2xl font-black">Trust & Verification</h1>
        <p className="mt-3 leading-6 text-slate-300">Secure document management and verification gateway for premium listings and client KYC protocols.</p>
        <button className="mt-5 w-full rounded-lg bg-[#f7c843] py-4 font-black text-[#081321]" type="button">Upload New Document</button>
        <Panel className="mt-8 p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f7c843]">Active Verification Status</p>
          <h2 className="mt-3 text-xl font-black">Level 3: Global Elite</h2>
          <div className="mt-6 flex items-center gap-4"><span className="h-2 flex-1 rounded-full bg-slate-700"><span className="block h-full w-[85%] rounded-full bg-[#f7c843]" /></span><b className="text-[#f7c843]">85% Complete</b></div>
          <p className="mt-5 text-sm text-slate-300">Verification allows access to high-value international escrow accounts and off-market listings.</p>
        </Panel>
        <Panel className="mt-6 p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7c843]/12"><Shield className="h-8 w-8 text-[#f7c843]" /></span>
          <h2 className="mt-6 text-2xl font-black">256-bit AES</h2>
          <p className="mt-2 text-sm text-slate-300">End-to-end encrypted vault active for all shared documents.</p>
        </Panel>
        <Panel className="mt-8 overflow-hidden">
          <div className="flex items-start justify-between p-6">
            <h2 className="text-2xl font-black">Document Repository</h2>
            <span className="rounded bg-slate-700 px-3 py-2 text-xs font-black">14 Total</span>
          </div>
          <div className="mx-6 flex h-11 items-center gap-3 rounded-lg border border-white/12 px-4 text-sm text-slate-400"><Search className="h-4 w-4" /> Search by name or tier...</div>
          {["Dubai Marina - Title Deed.pdf", "KYC_Hassan_Elite_Wallet.zip", "Escrow_Agreement_Draft_V4.docx", "Proof_of_Funds_MorganStanley.pdf"].map((doc) => (
            <p key={doc} className="flex items-center gap-3 border-t border-white/8 px-6 py-5 text-sm font-black"><FileText className="h-5 w-5 text-[#f7c843]" /> {doc}</p>
          ))}
          <button className="w-full border-t border-white/8 py-4 text-xs font-black text-[#f7c843]" type="button">View All Documents</button>
        </Panel>
        <h2 className="mt-8 text-xl font-black">Verification Tiers</h2>
        {[
          ["Tier 1: Basic Access", "Standard"],
          ["Tier 2: Verified Partner", "Pro"],
          ["Tier 3: Global Elite", "Elite"],
        ].map(([title, tag], index) => (
          <Panel key={title} className={`mt-5 p-6 ${index === 1 ? "border-[#f7c843]/50" : ""}`}>
            <p className="text-xs uppercase text-[#f7c843]">{tag}</p>
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">- Identity verification<br />- Private listing access<br />- Concierge escrow services</p>
          </Panel>
        ))}
      </main>
      <BaytMobileBottom active="Leads" />
    </MobileFrame>
  );
}

export function BaytMiftahMobileWorkspace() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-28 pt-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#f7c843]">Workspace Overview</p>
        <h1 className="mt-3 text-2xl font-black">Good Morning, Khalid</h1>
        <Panel className="mt-8 p-6">
          <div className="flex justify-between"><div><h2 className="text-xl font-black">Total Revenue</h2><p className="text-sm text-slate-300">Quarterly Performance 2024</p></div><p className="text-3xl font-black text-[#f7c843]">$4.2M<span className="block text-sm text-emerald-300">+12.4%</span></p></div>
          <div className="mt-8 flex h-32 items-end gap-3">{[45, 62, 74, 88, 66, 82, 100].map((h, i) => <span key={i} className={`flex-1 rounded-t ${i === 3 || i === 6 ? "bg-[#f7c843]" : "bg-slate-700"}`} style={{ height: `${h}%` }} />)}</div>
        </Panel>
        {[
          ["Active Listings", "124", Gem],
          ["Lead Conversion", "8.4%", BarChart3],
          ["Avg. Days on Market", "18", CalendarDays],
        ].map(([label, value, Icon]) => (
          <Panel key={label as string} className="mt-4 flex items-center justify-between p-5">
            <div><p className="text-xs uppercase tracking-[0.18em] text-slate-300">{label as string}</p><p className="mt-2 text-2xl font-black">{value as string}</p></div>
            <span className="rounded-full bg-slate-700 p-4"><Icon className="h-5 w-5 text-[#f7c843]" /></span>
          </Panel>
        ))}
        <div className="mt-8 flex items-end justify-between"><h2 className="text-xl font-black">Top Performing Assets</h2><button className="text-[#f7c843]" type="button">View All</button></div>
        {[
          ["The Sapphire Villa", "Palm Jumeirah, Dubai", "1.2k Views", "villa" as const],
          ["Elysium Penthouse", "Downtown District", "940 Views", "interior" as const],
          ["Quartz Residence", "Marina Promenade", "780 Views", "pavilion" as const],
        ].map(([title, location, views, visual]) => (
          <Panel key={title} className="mt-3 flex items-center gap-4 p-4">
            <LuxuryVisual kind={visual as VisualKind} className="h-16 w-16 rounded-lg" />
            <div className="flex-1"><p className="font-black">{title}</p><p className="text-sm text-slate-300">{location}</p></div>
            <p className="text-right font-black text-[#f7c843]">{views}</p>
          </Panel>
        ))}
        <div className="mt-8 flex items-center justify-between"><h2 className="text-xl font-black">Recent Invoices</h2><button className="rounded-lg bg-[#f7c843] px-5 py-3 text-[#081321]" type="button">Generate Report</button></div>
        <Panel className="mt-4 overflow-hidden">
          {["Global Sky Estates", "Apex Luxury Prop", "Private Portfolio", "Zenith Dev Group"].map((client, index) => (
            <p key={client} className="grid grid-cols-[.8fr_1fr_.7fr] gap-3 border-t border-white/8 p-4 text-sm"><span>#BM-2024-0{index + 89}</span><span>{client}</span><b className={index === 3 ? "text-rose-300" : "text-emerald-300"}>{index === 1 ? "Pending" : index === 3 ? "Overdue" : "Paid"}</b></p>
          ))}
        </Panel>
      </main>
      <button className="fixed bottom-20 left-[calc(50%+140px)] z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[#f7c843] text-3xl text-[#081321]" type="button">+</button>
      <BaytMobileBottom active="Home" />
    </MobileFrame>
  );
}

export function BaytMiftahAdminPlatform() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AdminTopNav active="Dashboard" />
      <div className="flex">
        <DashboardSidebar active="Global Analytics" />
        <main className="mx-auto max-w-[1400px] flex-1 px-10 py-14">
          <h1 className="text-6xl font-black tracking-[-0.06em]">Elite Platform Intelligence</h1>
          <p className="mt-5 max-w-3xl text-2xl text-slate-300">Live oversight for luxury liquidity, verified agents, security posture, and institutional portfolio movement.</p>
          <section className="mt-12 grid gap-8 xl:grid-cols-4">
            <MetricCard title="Global Deal Flow" value="$8.4B" detail="+18.7%" icon={LineChart} />
            <MetricCard title="Verified Agents" value="841" detail="98% KYC" icon={Users} />
            <MetricCard title="Active Assets" value="3,204" detail="MENA + EU" icon={Building2} />
            <MetricCard title="Threat Index" value="Low" detail="3 alerts" icon={Shield} featured />
          </section>
          <section className="mt-10 grid gap-8 xl:grid-cols-[1fr_420px]">
            <Panel className="p-10"><h2 className="text-3xl font-black">Cross-Market Signal Graph</h2><DistrictLineChart /></Panel>
            <Panel className="p-10"><h2 className="text-3xl font-black">Risk Review Queue</h2>{["Escrow anomaly", "Off-market duplicate", "KYC refresh"].map((item, i) => <p key={item} className={`mt-6 rounded-lg p-5 ${i === 0 ? "border border-rose-300/40 bg-rose-300/10" : "bg-slate-700"}`}>{item}<span className="float-right text-[#f7c843]">Review</span></p>)}</Panel>
          </section>
          <section className="mt-10 grid gap-8 md:grid-cols-3">
            {["Dubai Core", "London Prime", "Monaco Coast"].map((item, index) => <Panel key={item} className="p-8"><p className="text-[#f7c843]">Node {index + 1}</p><h3 className="mt-4 text-2xl font-black">{item}</h3><p className="mt-6 text-slate-300">Stable routing, clean audit logs, and high-value liquidity.</p></Panel>)}
          </section>
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

export function BaytMiftahMobileSecurity() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-28 pt-6">
        <h1 className="text-2xl font-black">Security Dashboard</h1>
        <p className="mt-3 leading-6 text-slate-300">Monitor your property portfolio's integrity, manage access credentials, and review real-time fraud detection alerts.</p>
        <Panel className="mt-6 p-6">
          <div className="flex justify-between"><p className="text-xs font-black uppercase text-[#f7c843]">Live Monitoring</p><span className="rounded-full bg-rose-300/20 px-4 py-2 text-xs font-black">2 High Risk</span></div>
          <h2 className="mt-3 text-2xl font-black">Fraud Detection Alerts</h2>
          {[
            ["Suspicious Inquiry Attempt", "Villa Marbella - Unauthorized ID format detected", "Review"],
            ["Digital Twin Access", "Dubai Penthouse - New IP: London", "Verify"],
          ].map(([title, detail, action], index) => <div key={title} className={`mt-5 rounded-lg border-l-4 p-4 ${index === 0 ? "border-rose-300 bg-rose-300/10" : "border-[#f7c843] bg-[#f7c843]/10"}`}><p className="font-black">{title}</p><p className="text-sm text-slate-300">{detail}</p><button className="mt-2 text-[#f7c843]" type="button">{action}</button></div>)}
        </Panel>
        <Panel className="mt-6 p-6">
          <h2 className="text-2xl font-black">Master Access</h2>
          <button className="mt-5 w-full rounded-lg bg-[#f7c843] py-4 font-black text-[#081321]" type="button">Revoke All Guest Keys</button>
          <button className="mt-4 w-full rounded-lg border border-[#f7c843] py-4 font-black text-[#f7c843]" type="button">Biometric Sync</button>
          <p className="mt-6 rounded-lg bg-[#071321] p-5 text-sm">Last Backup<br /><span className="text-lg">Today, 04:12 AM</span></p>
        </Panel>
        <Panel className="mt-6 overflow-hidden">
          <h2 className="p-6 text-2xl font-black">Property Access Logs</h2>
          {["The Glass House, Aspen / Housekeeping Staff #4 / Maintenance", "Azure Quay Estate / Listing Agent Sarah K. / Private Viewing", "Azure Quay Estate / Unknown Entity / Unauthorized Inquiry"].map((row) => <p key={row} className="grid grid-cols-3 gap-3 border-t border-white/8 p-5 text-sm">{row.split(" / ").map((cell) => <span key={cell}>{cell}</span>)}</p>)}
        </Panel>
        <Panel className="mt-6 p-6">
          <h2 className="text-2xl font-black">Aftercare Status</h2>
          <div className="mt-6 grid grid-cols-2 gap-5">{["HVAC Systems Optimal", "Leak Sensors Active", "Connectivity Encrypted", "Surveillance 12/12 Live"].map((item) => <p key={item} className="text-sm"><b className="block text-lg">{item}</b><span className="text-emerald-300">No issues</span></p>)}</div>
        </Panel>
        <Panel className="mt-6 overflow-hidden p-6">
          <h2 className="text-2xl font-black text-slate-500">Regional Risk Map</h2>
          <LuxuryVisual kind="map" className="mt-4 h-48 rounded-lg" />
          <p className="mt-4 rounded-lg border border-white/12 p-4 text-sm"><span className="text-rose-300">High Scraping Activity (EMEA)</span><br />Enhanced listing protection enabled automatically.</p>
        </Panel>
      </main>
      <BaytMobileBottom active="Menu" />
    </MobileFrame>
  );
}

export function BaytMiftahAdminGovernance() {
  return (
    <div className="min-h-screen bg-[#071321] pb-20 text-slate-100">
      <header className="border-b border-white/10 px-8 py-10">
        <div className="mx-auto flex max-w-[980px] items-center justify-between">
          <BrandMark admin />
          <Bell className="h-8 w-8 text-[#f7c843]" />
        </div>
      </header>
      <main className="mx-auto max-w-[980px] px-8 py-8">
        <p className="text-2xl text-[#f7c843]">Global Settings & Governance</p>
        <h1 className="mt-4 max-w-3xl text-3xl leading-10 text-slate-200">Configure platform-wide economic parameters and monitor the immutable audit trail of the luxury ecosystem's financial flows.</h1>
        <section className="mt-16 grid gap-10">
          {[
            [CircleDollarSign, "Service Fee Logic", "Dynamic commission rates for Tier-1 property acquisitions.", "2.45%", "Adjust"],
            [Sparkles, "Global API Nodes", "Real-time sync between Hong Kong, London, and Dubai vaults.", "SYSC-ACTIVE-2024", ""],
            [Shield, "Quantum Encryption", "Multi-layer verification protocols for high-value transfers.", "Enabled", ""],
          ].map(([Icon, title, detail, value, action]) => (
            <Panel key={title as string} className="p-12">
              <Icon className="h-9 w-9 text-[#f7c843]" />
              <h2 className="mt-12 text-2xl">{title as string}</h2>
              <p className="mt-5 max-w-xl text-xl leading-8 text-slate-300">{detail as string}</p>
              <div className="mt-10 flex items-center justify-between">
                <p className="text-5xl font-black text-[#f7c843]">{value as string}</p>
                {action ? <button className="rounded-lg border border-[#f7c843] px-10 py-5 text-2xl uppercase text-[#f7c843]" type="button">{action as string}</button> : null}
              </div>
            </Panel>
          ))}
        </section>
        <h2 className="mt-16 text-2xl">Financial</h2>
      </main>
      <footer className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#06111d] px-8 py-5">
        <div className="mx-auto flex max-w-[980px] items-center gap-12 text-xl text-slate-400">
          <p className="max-w-[220px] text-[#f7c843]">(c) 2024 BaytMiftah Luxury Real Estate Ecosystem. Secure Encrypted Session.</p>
          {footerLinks.map((link) => <a key={link} href="#">{link}</a>)}
          <p className="ml-auto">Main Control Stable</p>
        </div>
      </footer>
    </div>
  );
}

export function AureusAgencySettings() {
  const agents = [
    ["AM", "Alexander Mercer", "Principal Broker", "Active", "3.5%"],
    ["SC", "Sophia Chen", "Director of Sales", "Active", "2.8%"],
    ["JD", "Julian De Ville", "Senior Advisor", "On Leave", "2.5%"],
  ];

  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Concierge" />
      <div className="flex">
        <AureusSidebar active="Settings" />
        <main className="flex-1 px-10 py-16">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-16">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-[#f7c843]">Workspace Configuration</p>
                <h1 className="mt-5 text-6xl font-black tracking-[-0.06em]">Agency Settings</h1>
              </div>
              <div className="flex gap-5">
                <button className="rounded-lg border border-white/12 px-9 py-4 font-black" type="button">Discard Changes</button>
                <button className="rounded-lg bg-[#f7c843] px-9 py-4 font-black text-[#081321]" type="button">Save Changes</button>
              </div>
            </div>

            <section className="mt-16 grid gap-8 xl:grid-cols-[1fr_410px]">
              <AureusPanel className="p-10">
                <div className="flex items-center gap-6">
                  <Shield className="h-8 w-8 text-[#f7c843]" aria-hidden="true" />
                  <h2 className="text-3xl font-black">Agency Profile</h2>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-2">
                  {[
                    ["Legal Agency Name", "Aureus Luxury Real Estate Gro"],
                    ["License Identifier", "LX-889-2024-GLOBAL"],
                  ].map(([label, value]) => (
                    <label key={label} className="block">
                      <span className="text-sm font-black tracking-[0.08em] text-slate-300">{label}</span>
                      <span className="mt-4 block rounded-lg border border-white/10 bg-[#071321] px-6 py-5 text-xl">{value}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-10 block">
                  <span className="text-sm font-black tracking-[0.08em] text-slate-300">Primary Headquarters</span>
                  <span className="mt-4 flex items-center gap-4">
                    <span className="block flex-1 rounded-lg border border-white/10 bg-[#071321] px-6 py-5 text-xl">700 Madison Avenue, New York, NY</span>
                    <button className="rounded-lg bg-slate-700 p-5 text-[#f7c843]" type="button" aria-label="Open map">
                      <Map className="h-7 w-7" />
                    </button>
                  </span>
                </label>
              </AureusPanel>

              <AureusPanel className="p-10">
                <div className="flex items-center gap-6">
                  <Palette className="h-8 w-8 text-[#f7c843]" aria-hidden="true" />
                  <h2 className="text-3xl font-black">Branding</h2>
                </div>
                <p className="mt-10 text-sm font-black tracking-[0.08em] text-slate-300">Primary Gold Shade</p>
                <div className="mt-5 flex items-center gap-8">
                  <span className="h-16 w-16 rounded-full bg-[#e9c349] shadow-inner" />
                  <span className="text-2xl">#E9C349</span>
                </div>
                <p className="mt-10 text-sm font-black tracking-[0.08em] text-slate-300">Agency Watermark</p>
                <div className="mt-5 flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-600 text-center font-black text-slate-300">
                  <span><CloudUpload className="mx-auto mb-3 h-8 w-8" /> Upload SVG or PNG</span>
                </div>
              </AureusPanel>
            </section>

            <AureusPanel className="mt-8 overflow-hidden">
              <div className="flex items-center justify-between p-10">
                <h2 className="flex items-center gap-6 text-3xl font-black"><ClipboardList className="h-8 w-8 text-[#f7c843]" /> Team Management</h2>
                <button className="rounded-lg border border-[#f7c843]/40 px-8 py-4 text-sm font-black uppercase tracking-[0.16em] text-[#f7c843]" type="button">
                  Invite Agent
                </button>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.3fr] bg-slate-700 px-10 py-5 text-sm font-black uppercase tracking-[0.18em] text-[#f7c843]">
                <span>Agent Name</span><span>Role</span><span>Status</span><span>Commission %</span><span>Actions</span>
              </div>
              {agents.map(([initials, name, role, status, commission], index) => (
                <div key={name} className={`grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.3fr] items-center border-t border-white/8 px-10 py-8 ${index === 2 ? "opacity-55" : ""}`}>
                  <span className="flex items-center gap-5"><b className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7c843]/18 text-[#f7c843]">{initials}</b>{name}</span>
                  <span><b className="rounded bg-slate-600 px-3 py-2 text-sm">{role}</b></span>
                  <span className={status === "Active" ? "text-emerald-300" : "text-slate-400"}>{status}</span>
                  <span className="text-xl">{commission}</span>
                  <MoreHorizontal className="h-6 w-6" />
                </div>
              ))}
            </AureusPanel>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AureusSystemSecurity() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Concierge" search searchLabel="Search Security Protocols." />
      <div className="flex">
        <AureusSidebar active="CRM" />
        <main className="flex-1 px-10 py-14">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl uppercase tracking-[0.35em] text-[#f7c843]">Security Operations Center</p>
                <h1 className="mt-4 text-6xl font-black tracking-[-0.06em]">Global System Security</h1>
              </div>
              <p className="text-3xl font-black"><span className="mr-3 text-emerald-300">-</span>Nominal</p>
            </div>

            <section className="mt-14 grid gap-8 xl:grid-cols-[1fr_360px]">
              <AureusPanel className="relative h-[560px] overflow-hidden p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black">Multi-Region Node Monitoring</h2>
                    <p className="mt-2 font-black text-slate-300">Real-time latency and threat assessment</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full border border-[#f7c843]/50 bg-[#f7c843]/10 px-4 py-2 text-xs font-black text-[#f7c843]">Active Nodes: 1,204</span>
                    <span className="rounded-full border border-white/12 px-4 py-2 text-xs font-black">Uptime: 99.998%</span>
                  </div>
                </div>
                <MapBlueprint className="mt-10 h-[420px] opacity-75" />
                {[
                  ["left-[47%] top-[38%]"],
                  ["left-[60%] top-[50%]"],
                  ["left-[74%] top-[54%]"],
                ].map(([position]) => <span key={position} className={`absolute ${position} h-4 w-4 rounded-full bg-[#f7c843] shadow-[0_0_22px_rgba(247,200,67,.7)]`} />)}
              </AureusPanel>

              <AureusPanel className="p-10">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-[#f7c843]/30 bg-[#f7c843]/10"><Lock className="h-7 w-7 text-[#f7c843]" /></span>
                <h2 className="mt-14 text-3xl font-black">Quantum Protocol</h2>
                <p className="mt-6 text-xl leading-8 text-slate-300">Active lattice-based encryption for high-value asset transfers.</p>
                <div className="mt-8 rounded-lg bg-slate-700 p-5">
                  <p className="flex justify-between font-black uppercase tracking-[0.1em]">Current Entropy <span className="text-[#f7c843]">99.98%</span></p>
                  <span className="mt-5 block h-2 rounded-full bg-[#f7c843]" />
                </div>
                <p className="mt-10 flex justify-between border-t border-white/10 pt-6 font-black">Encryption Layer <span className="text-[#f7c843]">KYBER-1024</span></p>
                <p className="mt-8 flex justify-between border-t border-white/10 pt-6">Key Rotation <span>Every 300s</span></p>
                <button className="mt-8 w-full rounded-lg border border-[#f7c843]/50 py-5 text-xl font-black uppercase tracking-[0.28em] text-[#f7c843]" type="button">
                  Refresh Handshake
                </button>
              </AureusPanel>
            </section>

            <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_460px]">
              <AureusPanel className="p-10">
                <div className="flex justify-between">
                  <div><h2 className="text-3xl font-black">Active Session Audits</h2><p className="mt-2 font-black text-slate-300">Cross-reference verified executive credentials</p></div>
                  <MoreHorizontal className="h-7 w-7" />
                </div>
                <div className="mt-10 grid grid-cols-[1.2fr_.9fr_1fr] text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                  <span>User Entity</span><span>Origin IP</span><span>Clearance Status</span>
                </div>
                {[
                  ["Director V. Sterling", "HQ Terminal Alpha", "192.168.1.104", "Level 5", "Verified"],
                  ["Automated Custodian", "Cloud Node London", "44.201.32.9", "System", "Verified"],
                  ["Associate J. Chen", "VPN - Hong Kong", "210.3.4.155", "Level 2", "Re-authenticating"],
                ].map(([name, sub, ip, level, status]) => (
                  <div key={name} className="grid grid-cols-[1.2fr_.9fr_1fr] items-center border-t border-white/8 py-6">
                    <span className="flex items-center gap-4"><UserCircle className="h-10 w-10 text-slate-400" /><b>{name}<small className="block text-slate-400">{sub}</small></b></span>
                    <span>{ip}</span>
                    <span><b className="rounded border border-[#f7c843]/50 px-3 py-1 text-[#f7c843]">{level}</b> <span className={status === "Verified" ? "text-emerald-300" : "text-[#f7c843]"}>{status}</span></span>
                  </div>
                ))}
              </AureusPanel>

              <AureusPanel className="p-10">
                <h2 className="text-3xl font-black">Firewall Protocols</h2>
                {[
                  { title: "Adaptive Threat Shield", sub: "AI Analysis Mode", on: true, icon: Shield },
                  { title: "Deep Packet Inspection", sub: "L7 Protection", on: true, icon: Search },
                  { title: "Isolation Protocol", sub: "Emergency Airgap", on: false, icon: Lock },
                ].map(({ title, sub, on, icon: Icon }) => (
                  <div key={title} className={`mt-7 flex items-center gap-5 rounded-lg bg-slate-700 p-5 ${on ? "" : "opacity-45"}`}>
                    <Icon className="h-7 w-7 text-[#f7c843]" />
                    <p className="flex-1 font-black">{title}<span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{sub}</span></p>
                    <span className={`h-7 w-12 rounded-full ${on ? "bg-[#f7c843]" : "bg-slate-500"}`} />
                  </div>
                ))}
                <div className="mt-10 rounded-lg border border-rose-300/40 bg-rose-300/12 p-6">
                  <p className="flex items-center gap-3 font-black uppercase tracking-[0.18em] text-rose-200"><AlertTriangle className="h-6 w-6" /> Unauthorized Access Attempt</p>
                  <p className="mt-4 text-slate-200">Brute force detected on Node 7 (Hong Kong). IP 104.22.x.x blocked permanently.</p>
                </div>
              </AureusPanel>
            </section>

            <footer className="mt-24 flex justify-between border-t border-white/10 py-8 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              <span>(c) 2024 Aureus Global Security</span>
              <span>System Version 4.2.0-Elite</span>
              <span className="text-[#f7c843]">Encrypted Connection Secure</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AureusTrustCompliance() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Concierge" />
      <div className="flex">
        <AureusSidebar active="Listings" />
        <main className="flex-1 px-10 py-14">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.32em] text-[#f7c843]">Document Management</p>
                <h1 className="mt-4 text-6xl font-black tracking-[-0.06em]">Trust & Compliance</h1>
              </div>
              <div className="flex gap-6">
                <button className="rounded-lg bg-slate-700 px-10 py-5 font-black" type="button">Export Audit Log</button>
                <button className="rounded-lg bg-[#f7c843] px-10 py-5 font-black text-[#081321]" type="button">Secure Upload</button>
              </div>
            </div>

            <section className="mt-12 grid gap-8 xl:grid-cols-[380px_1fr]">
              <AureusPanel className="p-10">
                <h2 className="flex items-center justify-between text-3xl font-black">Agent Identity <Shield className="h-7 w-7 text-[#f7c843]" /></h2>
                {[
                  ["Standard Verification", "Complete", "100%"],
                  ["Professional (KYC)", "92%", "92%"],
                  ["Elite Tier Status", "Pending Documents", "15%"],
                ].map(([label, value, width]) => (
                  <div key={label} className="mt-8">
                    <p className="flex justify-between font-black tracking-[0.08em]"><span>{label}</span><span className="text-[#f7c843]">{value}</span></p>
                    <span className="mt-3 block h-1.5 rounded-full bg-slate-700"><span className="block h-full rounded-full bg-[#f7c843]" style={{ width }} /></span>
                  </div>
                ))}
                <div className="mt-16 rounded-lg border border-white/12 bg-slate-700 p-7">
                  <div className="flex items-center gap-5">
                    <LuxuryVisual kind="interior" className="h-20 w-20 rounded-full" />
                    <p className="text-2xl">Julian Vane <span className="block text-base font-black text-[#f7c843]">Director of Acquisitions</span></p>
                  </div>
                  <p className="mt-8 border-t border-white/10 pt-5 font-black">ID: FR-992-BX <span className="ml-4 rounded-full bg-[#f7c843]/12 px-4 py-2 text-sm text-[#f7c843]">In Review</span></p>
                </div>
              </AureusPanel>

              <AureusPanel className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-8 border-b border-white/10 p-8">
                  {["All Documents", "Title Deeds", "Legal Briefs"].map((item, index) => (
                    <button key={item} className={`px-5 py-3 font-black ${index === 0 ? "border-b-2 border-[#f7c843] text-[#f7c843]" : "text-slate-300"}`} type="button">{item}</button>
                  ))}
                  <div className="ml-auto flex h-12 w-80 items-center gap-4 rounded-lg border border-white/10 bg-[#071321] px-5 text-slate-400"><Search className="h-5 w-5" /> Search archive...</div>
                </div>
                <div className="grid grid-cols-[1.25fr_.75fr_.75fr_.65fr] gap-6 px-8 py-7 text-sm font-black uppercase tracking-[0.14em] text-slate-300">
                  <span>Document Name</span><span>Asset Reference</span><span>Verification</span><span>Last Modified</span>
                </div>
                {[
                  ["Title_Deed_BelAir_V4.pdf", "12.4 MB - PDF", "Estate #04921", "Encrypted", "2h ago", FileText],
                  ["KYC_Verification_A10.zip", "45.0 MB - ZIP", "Corporate Hub", "Pending", "Oct 12, 2023", ShieldCheck],
                  ["Legal_Disclosure_V2.pdf", "8.1 MB - PDF", "Unit 12A Paris", "Secured", "Oct 09, 2023", ClipboardList],
                ].map(([doc, size, asset, status, modified, Icon]) => (
                  <div key={doc as string} className="grid grid-cols-[1.25fr_.75fr_.75fr_.65fr] items-center gap-6 px-8 py-7">
                    <span className="flex min-w-0 items-center gap-5">
                      <span className="flex-shrink-0 rounded border border-white/12 bg-slate-700 p-3"><Icon className="h-6 w-6 text-[#f7c843]" /></span>
                      <span className="min-w-0">
                        <b className="block truncate text-lg">{doc as string}</b>
                        <small className="block text-slate-400">{size as string}</small>
                      </span>
                    </span>
                    <span className="font-black">{asset as string}</span>
                    <span><b className={`rounded-full px-4 py-2 text-xs uppercase ${status === "Pending" ? "bg-[#f7c843]/12 text-[#f7c843]" : "bg-emerald-300/12 text-emerald-300"}`}>{status as string}</b></span>
                    <span>{modified as string}</span>
                  </div>
                ))}
              </AureusPanel>
            </section>

            <AureusPanel className="mt-12 p-14">
              <div className="flex h-[430px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#f7c843]/30 bg-[#f7c843]/10"><CloudUpload className="h-10 w-10 text-[#f7c843]" /></span>
                <h2 className="mt-8 text-3xl font-black">Drag & Drop Encrypted Assets</h2>
                <p className="mt-4 max-w-2xl text-xl leading-8 text-slate-300">Upload high-resolution deeds, legal certifications, or verification identity documents. All files are encrypted using AES-256 standard before storage.</p>
                <p className="mt-8 flex gap-4 text-xs font-black uppercase tracking-[0.16em]"><span className="rounded border border-white/12 px-5 py-2">Max Size: 2GB</span><span className="rounded border border-white/12 px-5 py-2">Format: PDF, ZIP, RAW</span></p>
              </div>
            </AureusPanel>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AureusListingOversight() {
  const rows = [
    { title: "The Obsidian Heights", location: "Bel Air, Los Angeles, CA", price: "$82,500,000", agent: "Sterling Management", status: "Active", visual: "villa" as const },
    { title: "Villa Celeste - Penthouse B", location: "Upper East Side, NYC", price: "$14,200,000", agent: "Unverified Entity", status: "Flagged", visual: "interior" as const },
    { title: "Elysian Reef Estate", location: "Exuma, Bahamas", price: "$31,000,000", agent: "Apex Luxury", status: "Pending", visual: "ocean" as const },
    { title: "The Ginza Sky-Suite", location: "Chuo City, Tokyo", price: "$5,800,000", agent: "Nippon Realty", status: "Archived", visual: "skyline" as const },
  ];

  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <AureusHeader active="Marketplace" />
      <div className="flex">
        <AureusSidebar active="Listings" />
        <main className="flex-1 px-10 py-16">
          <div className="mx-auto max-w-[1280px]">
            <section className="flex flex-wrap items-center justify-between gap-8">
              <div>
                <h1 className="text-6xl font-black tracking-[-0.06em]">Listing Oversight</h1>
                <p className="mt-5 max-w-4xl text-2xl leading-9 text-slate-300">Manage and audit global high-value listings. Ensure data integrity, verify exclusive access rights, and handle flag management for the AUREUS ecosystem.</p>
              </div>
              <AureusPanel className="grid min-w-[360px] grid-cols-2 gap-8 p-8 text-center">
                <p><b className="block text-4xl text-[#f7c843]">1,429</b><span className="text-slate-400">Total Active</span></p>
                <p><b className="block text-4xl text-rose-300">12</b><span className="text-slate-400">Pending Flag</span></p>
              </AureusPanel>
            </section>

            <AureusPanel className="mt-12 flex flex-wrap items-center gap-5 p-6">
              <div className="flex h-16 min-w-[360px] flex-1 items-center gap-4 rounded-lg border border-white/12 px-5 text-xl text-slate-400"><Search className="h-7 w-7" /> Search by property name, ID, or</div>
              <button className="flex items-center gap-3 rounded-lg bg-slate-700 px-8 py-5 font-black" type="button"><Filter className="h-5 w-5" /> Filters</button>
              {["All Listings", "Pending Approval", "Flagged"].map((item, index) => <button key={item} className={`rounded-lg px-9 py-5 font-black ${index === 0 ? "bg-[#f7c843] text-[#081321]" : "bg-[#071321]"}`} type="button">{item}</button>)}
              <Grid3X3 className="ml-auto h-7 w-7 text-slate-300" />
              <ClipboardList className="h-7 w-7 text-[#f7c843]" />
            </AureusPanel>

            <div className="mt-12 grid grid-cols-[1.5fr_.8fr_.9fr_1fr_.6fr] px-8 text-sm font-black uppercase tracking-[0.16em] text-slate-300">
              <span>Property & Location</span><span>Price (USD)</span><span>Agent / Bureau</span><span>Status & Activity</span><span>Actions</span>
            </div>
            <div className="mt-6 space-y-5">
              {rows.map((row, index) => (
                <AureusPanel key={row.title} className={`grid grid-cols-[1.5fr_.8fr_.9fr_1fr_.6fr] items-center gap-5 p-8 ${row.status === "Flagged" ? "border-rose-300" : ""} ${row.status === "Archived" ? "opacity-45" : ""}`}>
                  <div className="flex items-center gap-6">
                    <LuxuryVisual kind={row.visual} className="h-20 w-24 rounded-lg" />
                    <p className="font-black">{row.title}<span className="block font-normal text-slate-300">{row.location}</span></p>
                  </div>
                  <p className="text-xl font-black text-[#f7c843]">{row.price}</p>
                  <p className="flex items-center gap-4"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${row.status === "Flagged" ? "bg-red-700 text-white" : "bg-slate-600"}`}>{index === 1 ? "??" : row.agent.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>{row.agent}</p>
                  <p><b className={`rounded-full px-3 py-1 text-sm uppercase ${row.status === "Flagged" ? "bg-rose-300/20 text-rose-200" : row.status === "Active" ? "bg-[#f7c843]/12 text-[#f7c843]" : "bg-slate-600"}`}>{row.status}</b><span className="ml-4 text-slate-300">{row.status === "Flagged" ? "Suspicious Activity" : row.status === "Pending" ? "Verification step 2/3" : row.status === "Archived" ? "Sold 3d ago" : "Updated 2h ago"}</span></p>
                  <div className="flex items-center gap-5">{row.status === "Flagged" ? <button className="rounded-lg bg-rose-300 px-6 py-3 font-black text-[#081321]" type="button">Review</button> : <><RefreshCw className="h-6 w-6" /><Pencil className="h-6 w-6" /><Flag className="h-6 w-6" /><Eye className="h-6 w-6" /></>}</div>
                </AureusPanel>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
              <p className="font-black text-slate-300">Showing 1-15 of 1,429 listings</p>
              <div className="flex items-center gap-4">{["1", "2", "3", "...", "96"].map((page) => <button key={page} className={`h-11 min-w-11 rounded-lg px-4 ${page === "1" ? "bg-[#f7c843] text-[#081321]" : "bg-[#071321]"}`} type="button">{page}</button>)}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function BaytMiftahSecureLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#071321] p-8 text-slate-100">
      <LuxuryVisual kind="interior" className="absolute inset-0 h-full opacity-35" />
      <div className="absolute inset-0 bg-[#071321]/70" />
      <main className="relative w-full max-w-[620px] text-center">
        <h1 className="text-6xl font-black tracking-[-0.06em] text-[#f7c843]">BaytMiftah</h1>
        <p className="mt-3 text-lg font-black uppercase tracking-[0.28em] text-slate-300">Institutional Access Portal</p>
        <Panel className="mt-12 p-12 text-left">
          <label className="block">
            <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">Professional Email</span>
            <span className="mt-4 flex h-16 items-center gap-4 rounded-lg border border-white/12 bg-[#071321] px-6 text-xl text-slate-500"><Mail className="h-7 w-7" /> name@firm.com</span>
          </label>
          <label className="mt-8 block">
            <span className="flex justify-between text-sm font-black uppercase tracking-[0.16em] text-slate-300">Access Key <b className="text-[#f7c843]">Forgot Password?</b></span>
            <span className="mt-4 flex h-16 items-center gap-4 rounded-lg border border-white/12 bg-[#071321] px-6 text-xl text-slate-500"><Lock className="h-7 w-7" /> ............ <Eye className="ml-auto h-7 w-7" /></span>
          </label>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <button className="rounded-lg border border-white/12 bg-slate-700 py-4 font-black uppercase tracking-[0.1em]" type="button">2FA Active</button>
            <button className="rounded-lg border border-white/12 bg-slate-700 py-4 font-black uppercase tracking-[0.1em]" type="button">Biometric</button>
          </div>
          <button className="mt-8 w-full rounded-lg bg-[#f7c843] py-6 text-3xl font-black text-[#081321]" type="button">Secure Login <ArrowRight className="ml-4 inline h-8 w-8" /></button>
          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-8 font-black text-slate-300">
            <span className="flex items-center gap-3"><Map className="h-6 w-6 text-[#f7c843]" /> Global Access</span>
            <span className="flex gap-7"><a href="#">Privacy</a><a href="#">Concierge</a></span>
          </div>
        </Panel>
        <p className="mt-10 italic text-slate-500">"Where architecture meets the future of investment."</p>
      </main>
    </div>
  );
}

export function BaytMiftahAdvisorViewings() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Portfolio" />
      <div className="grid min-h-[calc(100vh-88px)] xl:grid-cols-[320px_560px_1fr]">
        <DashboardSidebar active="Viewings" />
        <main className="border-r border-white/10 bg-[#0d1a2a] px-10 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">October 2024</h1>
            <p className="flex gap-5"><ChevronLeft /><ChevronRight /></p>
          </div>
          <div className="mt-8 grid grid-cols-7 gap-4 text-center text-sm uppercase text-slate-300">
            {"MO TU WE TH FR SA SU".split(" ").map((day) => <span key={day}>{day}</span>)}
            {[26, 27, 28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8].map((day) => <span key={day} className={`rounded-lg py-3 text-xl ${day === 4 ? "bg-[#f7c843] font-black text-[#081321]" : day < 3 ? "text-slate-600" : ""}`}>{day}</span>)}
          </div>
          <h2 className="mt-12 flex justify-between border-t border-white/10 pt-8 font-black uppercase tracking-[0.14em]">Today's Viewings (3) <a className="normal-case text-[#f7c843]" href="#">View History</a></h2>
          {[
            ["The Azure Pavilion", "Alastair Vance - Platinum Member", "10:30 AM", "Confirmed", "interior" as const],
            ["Observatory Estate", "Elena Rodriguez - New Client", "02:15 PM", "Pending Response", "pavilion" as const],
            ["Grand Marquee Suites", "Marcus Thorne - Internal Transfer", "05:00 PM", "Confirmed", "bedroom" as const],
          ].map(([title, detail, time, status, visual]) => (
            <Panel key={title} className="mt-6 flex items-center gap-5 p-5">
              <LuxuryVisual kind={visual as VisualKind} className="h-24 w-32 rounded-lg" />
              <div className="flex-1"><p className="text-xl">{title}</p><p className="text-slate-300">{detail}</p><span className="mt-3 inline-block rounded-full bg-[#f7c843]/10 px-3 py-1 text-sm text-[#f7c843]">{status}</span></div>
              <p>{time}</p>
            </Panel>
          ))}
          <h2 className="mt-12 font-black uppercase tracking-[0.14em]">Tomorrow, Oct 5</h2>
          <div className="mt-4 rounded-xl border border-dashed border-slate-600 py-8 text-center text-slate-500">No viewings scheduled yet.</div>
        </main>
        <section className="relative overflow-hidden">
          <MapBlueprint className="absolute inset-0 h-full opacity-70" />
          {[["left-[38%] top-[36%]"], ["left-[72%] top-[52%]"], ["left-[58%] top-[65%]"]].map(([pos]) => <MapPin key={pos} className={`absolute ${pos} h-12 w-12 text-[#f7c843]`} />)}
          <div className="absolute bottom-10 left-1/2 flex w-[min(720px,calc(100%-80px))] -translate-x-1/2 items-center gap-8 rounded-2xl border border-white/12 bg-[#0d1a2a]/95 p-8">
            <LuxuryVisual kind="bath" className="h-28 w-28 rounded-lg" />
            <div className="flex-1"><h2 className="text-4xl font-black text-[#f7c843]">The Azure Pavilion</h2><p className="text-xl">Marina Promenade, Block 42 - District 1</p><p className="mt-4 text-sm uppercase">4 Beds - 5 Baths - 4,200 sqft</p></div>
            <button className="rounded-lg bg-[#f7c843] px-9 py-5 text-xl font-black text-[#081321]" type="button">Get Directions</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function BaytMiftahDealRoom() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Portfolio" />
      <div className="grid xl:grid-cols-[320px_1fr_360px]">
        <DashboardSidebar active="Financials" />
        <main className="border-r border-white/10">
          <div className="sticky top-[88px] z-10 flex items-center gap-6 border-b border-white/10 bg-[#071321] px-10 py-4">
            <FileText className="h-8 w-8 text-[#f7c843]" />
            <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black">Master_Sale_Purchase_Agreement_V4.pdf</h1><p className="text-slate-300">Last updated by Julian Thorne - 14 mins ago</p></div>
            <div className="flex flex-shrink-0 items-center gap-5">
              <Search className="h-7 w-7" /><Search className="h-6 w-6" />
              <button className="rounded-lg border border-[#f7c843]/50 px-7 py-3 font-black text-[#f7c843]" type="button">Sign Document</button>
            </div>
          </div>
          <div className="mx-auto my-12 max-w-[980px] bg-white p-16 text-[#111827] shadow-2xl">
            <div className="flex items-end justify-between border-b-4 border-[#111827] pb-5">
              <h2 className="text-4xl font-serif font-black">Purchase Agreement</h2>
              <p className="text-xl font-black uppercase tracking-[0.18em] text-slate-500">Transaction Ref: BM-992-01</p>
            </div>
            <p className="mt-12 text-2xl font-serif font-black leading-9">THIS AGREEMENT is made on October 24th, 2023, by and between the following parties:</p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {["Seller (Party A) / Elysian Properties Ltd. / Verified", "Buyer (Party B) / The Valerius Trust / Verified"].map((item) => {
                const [role, name, status] = item.split(" / ");
                return <div key={role} className="rounded border border-slate-200 bg-slate-50 p-8"><p className="font-black uppercase text-slate-400">{role}</p><p className="mt-4 text-2xl font-serif font-black">{name}</p><p className="font-serif italic">Status: <span className="text-emerald-600">{status}</span></p></div>;
              })}
            </div>
            {[
              ["1. Property Particulars", "The property known as The Obsidian Heights Penthouse located at 4500 Skyline Dr, Sector 9, is hereby the subject of this transaction. Inclusion of fixtures: all integrated intelligent home systems, custom marble installations, and the temperature-controlled subterranean wine cellar are included in the final valuation."],
              ["2. Financial Terms", "The agreed Purchase Price is USD $42,500,000.00. Earnest Money Deposit: A sum of USD $2,125,000.00 representing 5% of the Purchase Price shall be deposited into the Escrow account within forty-eight hours of execution."],
            ].map(([heading, body]) => <section key={heading} className="mt-12"><h3 className="border-b border-slate-200 pb-3 text-3xl font-serif font-black">{heading}</h3><p className="mt-6 text-xl font-serif leading-9">{body}</p></section>)}
            <div className="mt-16 h-36 rounded border-2 border-dashed border-slate-200" />
          </div>
        </main>
        <aside className="hidden bg-[#0d1a2a] p-8 xl:block">
          <h2 className="text-2xl font-black">Deal Milestones</h2>
          {["KYC/AML Verified", "Initial Deposit $2,125,000", "Purchase Agreement Awaiting Final Signature", "Title Transfer Pending"].map((item, index) => <p key={item} className={`mt-10 border-l-2 pl-6 ${index < 2 ? "border-[#f7c843] text-[#f7c843]" : "border-slate-700 text-slate-400"}`}><CheckCircle2 className="mb-3 h-8 w-8" /> {item}</p>)}
          <h2 className="mt-16 text-2xl font-black">Stakeholders</h2>
          {["Julian Thorne - Inspector", "Arthur Sterling - Seller Counsel", "Valerius Trust - Buyer"].map((item) => <Panel key={item} className="mt-5 p-5">{item}</Panel>)}
          <Panel className="mt-16 p-6">Confirming requested amendment cleared through verified source. Escrow remains ready.</Panel>
        </aside>
      </div>
    </div>
  );
}

export function BaytMiftahPaymentsEscrow() {
  return (
    <div className="min-h-screen bg-[#071321] text-slate-100">
      <PublicTopNav active="Portfolio" />
      <div className="flex">
        <DashboardSidebar active="Financials" />
        <main className="flex-1 px-10 py-16">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div><h1 className="text-6xl font-black tracking-[-0.06em] text-[#f7c843]">Payments & Escrow</h1><p className="mt-4 text-2xl text-slate-300">Manage high-value settlements and secure transaction custody.</p></div>
              <div className="flex gap-6"><button className="rounded-lg border border-[#f7c843] px-10 py-5 font-black uppercase tracking-[0.12em] text-[#f7c843]" type="button">Download Report</button><button className="rounded-lg bg-[#f7c843] px-10 py-5 font-black uppercase tracking-[0.12em] text-[#081321]" type="button">Initiate Transfer</button></div>
            </div>
            <section className="mt-12 grid gap-8 lg:grid-cols-3">
              {[["Total Under Contract", "$84,250,000", "+ 12% from last month"], ["Escrow Deposits", "$12,400,000", "4 assets awaiting closing"], ["Upcoming Disbursements", "$4,120,500", "Next batch scheduled: Oct 24"]].map(([label, value, detail]) => <AureusPanel key={label} className="p-10"><p className="text-xl font-black uppercase tracking-[0.18em] text-[#f7c843]">{label}</p><p className="mt-8 whitespace-nowrap text-[clamp(2rem,3vw,2.7rem)] font-black leading-tight">{value}</p><p className="mt-6 text-xl text-emerald-300">{detail}</p></AureusPanel>)}
            </section>
            <section className="mt-12 grid gap-8 xl:grid-cols-[1fr_420px]">
              <AureusPanel className="overflow-hidden">
                <div className="flex items-center justify-between bg-slate-700 p-8"><h2 className="text-3xl font-black">Recent Activity</h2><span className="rounded-full bg-[#f7c843]/12 px-4 py-2 text-sm font-black text-[#f7c843]">Live Updates</span></div>
                <div className="grid grid-cols-[1.3fr_.7fr_.7fr_.6fr_.1fr] px-8 py-5 text-sm font-black uppercase tracking-[0.16em] text-slate-300"><span>Asset / Entity</span><span>Type</span><span>Amount</span><span>Status</span><span /></div>
                {[
                  ["The Obsidian Penthouse", "Closing ID: #82910", "Escrow Deposit", "$2,500,000", "Escrow"],
                  ["Palm Estate Marina", "Closing ID: #82915", "Settlement", "$14,800,000", "Settled"],
                  ["Luxury Concierge Fee", "Ref: SV-9902", "Service Payment", "$12,000", "Pending"],
                ].map(([title, sub, type, amount, status]) => <div key={title} className="grid grid-cols-[1.3fr_.7fr_.7fr_.6fr_.1fr] items-center border-t border-white/8 px-8 py-9"><p className="text-2xl font-black">{title}<span className="block text-base font-normal text-slate-300">{sub}</span></p><p>{type}</p><p className="text-xl font-black">{amount}</p><p><b className="rounded border border-[#f7c843]/40 px-4 py-2 text-sm uppercase text-[#f7c843]">{status}</b></p><MoreHorizontal /></div>)}
              </AureusPanel>
              <div className="grid gap-8">
                <AureusPanel className="p-10"><h2 className="flex items-center gap-4 text-3xl font-black"><Shield className="text-[#f7c843]" /> Vault Approvals</h2><Panel className="mt-8 p-7"><p className="uppercase tracking-[0.18em]">Transfer Request <span className="float-right text-[#f7c843]">2/3 Signed</span></p><p className="mt-3 text-2xl font-black">$5,000,000.00</p><button className="mt-8 w-full rounded-lg bg-[#f7c843] py-4 font-black text-[#081321]" type="button">Sign Transaction</button></Panel></AureusPanel>
                <AureusPanel className="p-10"><p className="text-sm font-black uppercase tracking-[0.18em]">Projected Earnings</p><p className="mt-6 text-5xl font-black">$2,450,120</p><p className="text-xl text-[#f7c843]">Advisor Commission (Q4)</p><span className="mt-8 block h-3 rounded-full bg-slate-700"><span className="block h-full w-[72%] rounded-full bg-[#f7c843]" /></span></AureusPanel>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function BaytMiftahMobileViewing() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-24 pt-5">
        <LuxuryVisual kind="pavilion" className="h-72 rounded-xl" />
        <p className="-mt-20 ml-5 inline-block rounded-full border border-[#f7c843]/50 bg-[#071321]/80 px-4 py-2 text-xs font-black uppercase text-[#f7c843]">Confirmation</p>
        <h1 className="ml-5 mt-3 text-3xl font-black">Azure Pavilion</h1>
        <p className="ml-5 text-slate-200">Penthouse Viewing Experience</p>
        <h2 className="mt-10 text-2xl font-black text-[#f7c843]">Good Morning, Alexander</h2>
        <p className="mt-5 text-lg leading-8 text-slate-200">We are delighted to confirm your exclusive private viewing of the <b className="text-[#f7c843]">Azure Pavilion</b>. Our senior advisor has prepared a bespoke tour of the property.</p>
        <Panel className="mt-8 p-6">
          {[["Date", "Oct 24, 2023", CalendarDays], ["Time", "11:00 AM GST", Clock], ["Your Advisor", "Marcus Vance", MessageSquare]].map(([label, value, Icon]) => <p key={label as string} className="mt-5 flex gap-4"><Icon className="h-6 w-6 text-[#f7c843]" /><span><b className="block text-xs uppercase tracking-[0.18em] text-slate-300">{label as string}</b><span className="text-xl font-black">{value as string}</span></span></p>)}
          <button className="mt-8 w-full rounded-lg bg-[#f7c843] py-4 font-black text-[#081321]" type="button">Add to Calendar</button>
          <p className="mt-5 text-center text-slate-300">Share invitation</p>
        </Panel>
        <div className="mt-8 flex justify-between"><h2 className="text-2xl font-black">Meeting Location</h2><a className="text-[#f7c843]" href="#">Get Directions</a></div>
        <Panel className="mt-4 relative h-48 overflow-hidden"><MapBlueprint className="absolute inset-0 h-full" /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#f7c843]/50 bg-[#071321]/90 p-5 text-center"><MapPin className="mx-auto h-8 w-8 text-[#f7c843]" /><b>Main Entrance Lobby</b><small className="block uppercase">Azure Pavilion North</small></div></Panel>
      </main>
      <BaytMobileBottom active="Home" />
    </MobileFrame>
  );
}

export function BaytMiftahMobilePortfolio() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-24 pt-5">
        <p className="inline-block rounded-full border border-[#f7c843]/40 px-3 py-1 text-[10px] font-black uppercase text-[#f7c843]">Off-Market Exclusive</p>
        <h1 className="mt-4 text-3xl font-black leading-tight">Curated for Your Portfolio</h1>
        <p className="mt-4 leading-6 text-slate-300">A rare opportunity to acquire a legendary architectural masterpiece in the heart of the Golden Quadrant.</p>
        <Panel className="mt-6 overflow-hidden"><LuxuryVisual kind="villa" className="h-40" /><div className="-mt-16 p-6"><p className="text-3xl font-black text-[#f7c843]">$34,500,000</p><button className="mt-4 rounded bg-[#f7c843] px-6 py-3 text-xs font-black uppercase text-[#081321]" type="button">View Private Details</button></div></Panel>
        <Panel className="mt-8 p-6"><h2 className="font-black">Market Analysis</h2><div className="mt-5 grid h-32 place-items-center rounded bg-[#071321] text-[#f7c843]">Asset Location Analysis</div><p className="mt-5 text-sm leading-6 text-slate-300">This property has seen a 12% appreciation and low exposure over the last 18 months.</p></Panel>
        <Panel className="mt-6 p-6"><Lock className="h-7 w-7 text-[#f7c843]" /><h2 className="mt-4 font-black">Confidentiality Protocol</h2><p className="mt-3 text-sm leading-6 text-slate-300">Access to full dossier requires a signed non-disclosure agreement.</p><button className="mt-5 w-full rounded border border-[#f7c843] py-3 text-xs font-black uppercase text-[#f7c843]" type="button">Request NDA</button></Panel>
        <div className="mt-10 flex justify-between"><h2 className="text-xl font-black">Related Portfolio Matches</h2><a className="text-[#f7c843]" href="#">Explore All</a></div>
        {[
          ["The Skyline Pavilion", "New York, NY - $18.2M", "interior" as const],
          ["Azure Vista Manor", "Antibes, France - $22.0M", "ocean" as const],
          ["The Obsidian Retreat", "Sedona, AZ - $12.5M", "pavilion" as const],
        ].map(([title, meta, visual]) => <article key={title} className="mt-5"><LuxuryVisual kind={visual as VisualKind} className="h-44 rounded-lg" /><p className="mt-3 text-xs font-black uppercase text-[#f7c843]">New Construction</p><h3 className="font-black">{title}</h3><p className="text-xs text-slate-300">{meta}</p></article>)}
      </main>
      <BaytMobileBottom active="Home" />
    </MobileFrame>
  );
}

export function BaytMiftahMobilePerformance() {
  return (
    <MobileFrame>
      <BaytMobileHeader />
      <main className="px-4 pb-24 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7c843]">Performance Analytics</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">Your Monthly Performance Overview</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">A detailed analysis of agency impact, revenue metrics, and listing performance for October 2023.</p>
        <button className="mt-5 w-full rounded-lg bg-[#f7c843] py-3 text-xs font-black uppercase text-[#081321]" type="button"><Download className="mr-2 inline h-4 w-4" /> Export PDF Report</button>
        {[
          ["Total Revenue", "$4.2M", "+12.4%"],
          ["Active Listings", "48", "+5"],
          ["Lead Conversion", "3.8%", "Steady"],
          ["Property Views", "124.5k", "+28%"],
        ].map(([label, value, change]) => <Panel key={label} className="mt-4 p-5"><p className="text-xs text-slate-300">{label}</p><p className="mt-3 text-2xl font-black text-[#f7c843]">{value}</p><p className="text-right text-xs text-emerald-300">{change}</p></Panel>)}
        <Panel className="mt-6 p-6"><h2 className="text-xl font-black">Revenue Growth</h2><div className="mt-8 flex h-40 items-end gap-3">{[40, 54, 62, 76, 88, 72].map((h, i) => <span key={i} className={`flex-1 rounded-t ${i === 5 ? "bg-[#f7c843]" : "bg-slate-700"}`} style={{ height: `${h}%` }} />)}</div></Panel>
        <Panel className="mt-6 p-6"><h2 className="font-black">Lead Sources</h2>{[["Direct Referrals", "42%"], ["Social Media", "28%"], ["Organic Search", "18%"], ["Paid Advertising", "12%"]].map(([label, value]) => <div key={label} className="mt-4 text-sm"><p className="flex justify-between"><span>{label}</span><b className="text-[#f7c843]">{value}</b></p><span className="mt-2 block h-1 rounded bg-slate-700"><span className="block h-full rounded bg-[#f7c843]" style={{ width: value }} /></span></div>)}</Panel>
        <h2 className="mt-8 text-xl font-black">Top Performing Listings</h2>
        {["The Zenith Penthouse", "Amber Estates", "The Quartz Cube"].map((title, index) => <Panel key={title} className="mt-4 overflow-hidden"><LuxuryVisual kind={index === 0 ? "villa" : index === 1 ? "ocean" : "interior"} className="h-40" /><div className="p-5"><h3 className="font-black">{title}</h3><p className="mt-3 grid grid-cols-3 text-xs text-[#f7c843]"><span>{24 - index * 6}.1k Views</span><span>{114 - index * 25} Leads</span><span>{4.7 + index / 2}% Conv.</span></p></div></Panel>)}
        <Panel className="mt-8 p-7 text-center"><h2 className="text-xl font-black">Ready for next month?</h2><p className="mt-3 text-sm text-slate-300">Maximize your performance by utilizing AI-driven listing optimization.</p><button className="mt-5 w-full rounded-lg bg-[#f7c843] py-3 text-[#081321]" type="button">Go to Dashboard</button></Panel>
      </main>
      <BaytMobileBottom active="Invest" />
    </MobileFrame>
  );
}

export function BaytMiftahSecurityEmail() {
  return (
    <div className="min-h-screen bg-[#071321] px-5 py-10 text-slate-100">
      <main className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#081624]">
        <header className="border-b border-white/10 py-8 text-center">
          <h1 className="text-4xl font-black text-[#f7c843]">BaytMiftah</h1>
        </header>
        <section className="px-8 py-10 text-center">
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f7c843]/10"><AlertTriangle className="h-12 w-12 text-[#f7c843]" /></span>
          <h2 className="mt-8 text-2xl">Security Alert: New Login Detected</h2>
          <p className="mt-6 text-xl leading-8 text-slate-200">A new sign-in was detected on your BaytMiftah account. Please review the details below to ensure your account remains secure.</p>
          <Panel className="mt-10 p-8 text-left">
            {[
              ["Device", "MacBook Pro 16", Video],
              ["Location", "Dubai, UAE", MapPin],
              ["IP Address", "94.201.12.XXX", Wifi],
              ["Time", "Oct 24, 2023 at 14:22 GST", Clock],
            ].map(([label, value, Icon]) => <p key={label as string} className="mt-7"><b className="block text-sm uppercase tracking-[0.18em] text-[#f7c843]">{label as string}</b><span className="mt-3 flex items-center gap-4 text-2xl"><Icon className="h-8 w-8 text-slate-300" /> {value as string}</span></p>)}
          </Panel>
          <Panel className="relative mt-10 h-56 overflow-hidden"><MapBlueprint className="absolute inset-0 h-full opacity-70" /><span className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/12 bg-[#0d1a2a] px-5 py-3 font-black"><MapPin className="h-5 w-5 text-[#f7c843]" /> Approximate location of login</span></Panel>
          <button className="mt-10 w-full rounded-xl bg-[#f7c843] py-6 text-2xl font-black text-[#081321]" type="button"><Shield className="mr-3 inline h-7 w-7" /> Secure My Account</button>
          <button className="mt-5 w-full rounded-xl border border-[#f7c843] py-5 text-2xl font-black text-[#f7c843]" type="button">This was me</button>
          <p className="mt-10 border-t border-white/10 pt-8 text-xl italic leading-8 text-slate-200">If you did not recognize this activity, please secure your account immediately.</p>
        </section>
        <footer className="bg-slate-700 px-8 py-5 font-black text-slate-300"><Shield className="mr-3 inline h-5 w-5 text-[#f7c843]" /> Verified BaytMiftah Security Email</footer>
      </main>
    </div>
  );
}
