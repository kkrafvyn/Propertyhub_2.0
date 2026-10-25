import { useState } from "react";
import { Link } from "react-router";
import { Heart, BedDouble, Bath, MapPin, X } from "lucide-react";
import { DesktopShell, PageMeta } from "../components/baytmiftah";

const samples = [
  { id: "residence", title: "Cantonments Garden Residence", area: "Cantonments, Accra", type: "Buy", price: "GHS 1,850,000", beds: 4, baths: 3, photo: "residences", description: "A fictional family residence with landscaped outdoor space, generous living areas, and a private terrace." },
  { id: "apartment", title: "East Legon Courtyard Apartments", area: "East Legon, Accra", type: "Rent", price: "GHS 4,500 / month", beds: 2, baths: 2, photo: "architecture", description: "A fictional apartment community with contemporary architecture, shared gardens, and light-filled rooms." },
  { id: "interior", title: "Osu City Retreat", area: "Osu, Accra", type: "Stay", price: "GHS 650 / night", beds: 1, baths: 1, photo: "interior", description: "A fictional short-stay home with an open living space and carefully considered interiors." },
];

/** Explicit demonstration, available to everyone; never inserted into live listings. */
export function ConsumerDemoContent() {
  const [filter, setFilter] = useState("All");
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = samples.find((home) => home.id === selected);
  return (
    <>
      <section className="mb-6 rounded-3xl border border-surface-border bg-surface-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5">
            <img src={`${import.meta.env.BASE_URL}brand/logo-approved.png`} alt="BaytMiftah — Unlocking property opportunities" className="h-20 w-64 rounded-xl bg-white object-contain p-2" />
            <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-secondary">Demo collection · Accra</p>
            <h1 className="text-3xl font-serif text-ink sm:text-4xl">Discover your next place</h1>
            <p className="mt-3 max-w-2xl text-sm text-ink-secondary">Explore sample homes and build a shortlist.</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-950 px-4 py-2 text-sm text-white">{saved.length} saved in this demo</span>
        </div>
        <p role="note" className="mt-5 rounded-xl border border-surface-border bg-surface p-3 text-sm text-ink-secondary">Fictional properties with illustrative photography. These homes are not available to book, rent, or buy. Demo saves stay on this screen and do not create real enquiries or payments.</p>
      </section>
      <div role="group" aria-label="Demo property type" className="mb-6 flex flex-wrap gap-2">
        {["All", "Buy", "Rent", "Stay", "Saved"].map((type) => <button key={type} onClick={() => setFilter(type)} aria-pressed={filter === type} className={`rounded-full border px-5 py-2 text-sm ${filter === type ? "border-emerald-950 bg-emerald-950 text-white" : "border-surface-border bg-surface text-ink"}`}>{type}</button>)}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {samples.filter((home) => filter === "All" || home.type === filter || (filter === "Saved" && saved.includes(home.id))).map((home) => (
          <article key={home.id} className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm">
            <div className="relative">
              <button onClick={() => setSelected(home.id)} aria-label={`View demo ${home.title}`} className="block w-full">
                <img src={`${import.meta.env.BASE_URL}marketing/hero/${home.photo}-1280.webp`} alt={`Illustrative ${home.title}`} className="aspect-[4/3] w-full object-cover" />
              </button>
              <span style={{color: "#0F2922"}} className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold">Demo · {home.type}</span>
              <button aria-label={`${saved.includes(home.id) ? "Unsave" : "Save"} demo ${home.title}`} aria-pressed={saved.includes(home.id)} onClick={() => setSaved((ids) => ids.includes(home.id) ? ids.filter((id) => id !== home.id) : [...ids, home.id])} className="absolute right-3 top-3 rounded-full bg-white p-2 text-emerald-950"><Heart className={`h-5 w-5 ${saved.includes(home.id) ? "fill-current" : ""}`} /></button>
            </div>
            <div className="p-5">
              <h2 className="font-semibold text-ink">{home.title}</h2>
              <p className="mt-2 flex items-center gap-1 text-sm text-ink-secondary"><MapPin className="h-4 w-4" />{home.area}</p>
              <p className="mt-3 flex gap-4 text-sm text-ink-secondary"><span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{home.beds} beds</span><span className="flex items-center gap-1"><Bath className="h-4 w-4" />{home.baths} baths</span></p>
              <p className="mt-4 font-semibold text-ink">{home.price}</p>
              <button onClick={() => setSelected(home.id)} className="mt-4 text-sm font-semibold text-ink underline underline-offset-4">Explore sample home</button>
            </div>
          </article>
        ))}
      </div>
      {filter === "Saved" && !saved.length && <p className="py-12 text-center text-ink-secondary">Tap a heart to start your demo shortlist.</p>}
      {detail && <section aria-label="Sample home details" className="mt-8 rounded-2xl border border-surface-border bg-surface p-6 text-ink">
        <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-serif">{detail.title}</h2><button onClick={() => setSelected(null)} aria-label="Close sample details"><X /></button></div>
        <img src={`${import.meta.env.BASE_URL}marketing/hero/${detail.photo}-1280.webp`} alt={`Illustrative ${detail.title} detail`} className="mt-4 max-h-96 w-full rounded-xl object-cover" />
        <p className="mt-4">{detail.description}</p><p className="mt-3 text-sm text-ink-secondary">Demo only — illustrative price and location. No reservation or transaction is available.</p>
      </section>}
      <Link to="/" className="mt-8 inline-block text-sm text-ink underline underline-offset-4">Return to the live marketplace</Link>
    </>
  );
}

export function ConsumerDemo() {
  return <><PageMeta title="Sample homes · BaytMiftah" description="Explore clearly marked fictional sample homes in the BaytMiftah demo." /><DesktopShell><ConsumerDemoContent /></DesktopShell></>;
}
