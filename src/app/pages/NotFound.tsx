import { Compass, Heart, Home, Mail, MapPin, Menu, Search, UserRound } from "lucide-react";
import { Link } from "react-router";

export function NotFound() {
  return (
    <main className="min-h-screen bg-[#061725] text-[#f7f4ed]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-gradient-to-b from-[#061725] via-[#071928] to-[#061725] pb-[112px] shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <header className="flex items-center justify-between border-b border-[#e8bd3118] px-5 py-6">
          <Link to="/" className="flex items-center gap-3 text-[#f7f4ed] no-underline">
            <MapPin className="h-7 w-7 text-[#dbe7ff]" aria-hidden="true" />
            <strong className="text-2xl font-black tracking-[-0.06em] text-[#dbe7ff]">
              Obsidian Estate
            </strong>
          </Link>
          <Link to="/search" aria-label="Open menu" className="grid h-10 w-10 place-items-center text-[#dbe7ff]">
            <Menu className="h-7 w-7" aria-hidden="true" />
          </Link>
        </header>

        <section className="px-5 pt-10">
          <article className="rounded-[12px] border border-[#e8bd3120] bg-[#0b1b2d]/82 px-12 py-16 text-center shadow-[0_30px_70px_rgba(0,0,0,0.2)]">
            <div className="relative mx-auto h-36">
              <span className="absolute inset-x-0 top-0 text-[7rem] font-black leading-none tracking-[-0.08em] text-[#516275]/35">
                404
              </span>
              <span className="absolute inset-x-0 top-9 rotate-[-7deg] text-[3rem] font-black italic tracking-[-0.07em] text-[#e8bd31]">
                Lost?
              </span>
            </div>

            <h1 className="mt-5 text-[1.85rem] font-black leading-[1.25] tracking-[-0.04em] text-[#dbe7ff]">
              The property you&apos;re looking for is off-market.
            </h1>
            <p className="mx-auto mt-7 max-w-[18rem] text-[1.4rem] font-semibold leading-[1.45] text-[#f7f4ed]/75">
              Even the most exclusive estates can be elusive. Let&apos;s find you something even
              better within the Obsidian portfolio.
            </p>

            <div className="mt-12 grid gap-5">
              <Link
                to="/"
                className="inline-flex min-h-[70px] items-center justify-center gap-4 rounded-[9px] bg-[#e8bd31] px-5 text-[0.92rem] font-black uppercase tracking-[0.14em] text-[#081521] no-underline"
              >
                <Home className="h-6 w-6" aria-hidden="true" />
                Return to Home
              </Link>
              <Link
                to="/search"
                className="inline-flex min-h-[70px] items-center justify-center gap-4 rounded-[9px] border border-[#e8bd31] bg-transparent px-5 text-[0.92rem] font-black uppercase tracking-[0.14em] text-[#e8bd31] no-underline"
              >
                <Search className="h-6 w-6" aria-hidden="true" />
                Start New Search
              </Link>
            </div>
          </article>

          <section className="mt-8 rounded-[12px] border border-[#e8bd3120] bg-[#0b1b2d]/82 px-10 py-10 text-center">
            <h2 className="text-[0.88rem] font-black uppercase tracking-[0.2em] text-[#e8bd31]">
              Quick Search
            </h2>
            <label className="mt-6 flex min-h-[70px] items-center rounded-[9px] border border-[#e8bd3120] bg-[#102438] px-5 text-left">
              <span className="sr-only">Quick search</span>
              <input
                type="search"
                placeholder="Location, ZIP, or Property Type"
                className="min-w-0 flex-1 border-0 bg-transparent text-[1.28rem] font-semibold text-[#f7f4ed] outline-none placeholder:text-[#f7f4ed]/48"
              />
              <Search className="h-6 w-6 text-[#dbe7ff]" aria-hidden="true" />
            </label>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {["Penthouse", "Coastal", "Modernism"].map((tag) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-[#e9eef7]/15 px-4 py-2 text-[0.92rem] font-black text-[#dbe7ff] no-underline"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          <Link
            to="/property/featured"
            className="relative mt-8 block min-h-[238px] overflow-hidden rounded-[12px] border border-[#e8bd3120] no-underline"
          >
            <img
              src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=900&q=85&auto=format&fit=crop"
              alt="The Obsidian Heights featured property"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.62] saturate-[0.9]"
            />
            <span className="absolute inset-0 bg-gradient-to-b from-transparent via-[#06172510] to-[#061725cc]" />
            <span className="absolute bottom-12 left-6 text-[1rem] font-black text-[#e8bd31]">
              Featured Property
            </span>
            <strong className="absolute bottom-6 left-6 text-[1.35rem] font-black tracking-[-0.04em] text-white">
              The Obsidian Heights
            </strong>
          </Link>
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[430px] items-center justify-around border-t border-[#e8bd3118] bg-[#041221]/95 px-6 py-4 shadow-[0_-24px_58px_rgba(0,0,0,0.28)]">
          {[
            { label: "Explore", icon: Compass, to: "/" },
            { label: "Saved", icon: Heart, to: "/?tab=saved" },
            { label: "Messages", icon: Mail, to: "/app/messages" },
            { label: "Profile", icon: UserRound, to: "/?tab=profile" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="grid min-w-[58px] justify-items-center gap-1 text-[0.94rem] font-bold text-[#f7f4ed]/80 no-underline"
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
