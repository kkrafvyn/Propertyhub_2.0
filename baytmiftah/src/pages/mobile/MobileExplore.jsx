import React from 'react'
import { Link } from 'react-router-dom'

const stays = [
  {
    title: 'Beverly Hills, California',
    meta: 'Designed by ArchStudio • Oct 22-27',
    beds: '4 Beds',
    baths: '3 Baths',
    rating: '4.92',
    price: '$1,250',
    image:
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=700&q=85',
  },
  {
    title: 'Santorini, Greece',
    meta: 'Oia Heights View • Nov 2-7',
    beds: '2 Beds',
    baths: '2 Baths',
    rating: '4.88',
    price: '$840',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=85',
  },
  {
    title: 'Aspen, Colorado',
    meta: 'Mountain Retreat • Dec 12-18',
    beds: '5 Beds',
    baths: '4 Baths',
    rating: '4.99',
    price: '$2,100',
    image:
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=700&q=85',
  },
]

const categories = [
  ['storefront', 'Marketplace'],
  ['apartment', 'Apartments'],
  ['villa', 'Villas'],
  ['house', 'Houses'],
  ['beach_access', 'Beachfront'],
]

export default function MobileExplore() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#f7f8fc] pb-24 text-[#071121]">
      <header className="sticky top-0 z-20 bg-[#f7f8fc] px-6 pb-3 pt-5">
        <div className="flex items-center gap-3 rounded-full border border-[#c5ceda] bg-white px-4 py-3 shadow-sm">
          <span className="material-symbols-outlined text-3xl">search</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">Where to?</p>
            <p className="truncate text-sm text-[#303744]">Anywhere • Any week • Add guests</p>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-[#c5ceda]">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
        <nav className="mt-5 flex justify-between gap-4 overflow-x-auto">
          {categories.map(([icon, label], index) => (
            <button
              key={label}
              className={`min-w-16 text-center ${index === 0 ? 'text-black' : 'text-[#8b929c]'}`}
            >
              <span className="material-symbols-outlined text-3xl">{icon}</span>
              <p className="mt-1 text-sm">{label}</p>
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-10 px-6 pt-4">
        {stays.map((stay) => (
          <article key={stay.title}>
            <Link to="/mobile/property" className="relative block overflow-hidden rounded-lg">
              <img src={stay.image} alt="" className="h-80 w-full object-cover" />
              <span className="material-symbols-outlined absolute right-4 top-4 text-4xl text-white drop-shadow">
                favorite
              </span>
            </Link>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{stay.title}</h2>
                <p className="text-[#303744]">{stay.meta}</p>
                <p className="mt-1 flex gap-3 text-[#303744]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">bed</span>
                    {stay.beds}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">bathtub</span>
                    {stay.baths}
                  </span>
                </p>
                <p className="mt-3 text-xl">
                  <strong>{stay.price}</strong> night
                </p>
              </div>
              <span className="flex items-center gap-1 text-lg">
                <span className="material-symbols-outlined text-base">star</span>
                {stay.rating}
              </span>
            </div>
          </article>
        ))}
      </main>

      <button className="fixed bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-8 py-4 text-lg font-bold text-white shadow-xl">
        Map
        <span className="material-symbols-outlined">map</span>
      </button>

      <nav className="fixed bottom-0 left-1/2 z-10 grid h-16 w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-[#ccd3df] bg-white text-xs">
        {[
          ['explore', 'Explore'],
          ['favorite', 'Wishlists'],
          ['business_center', 'Trips'],
          ['chat_bubble', 'Inbox'],
          ['account_circle', 'Profile'],
        ].map(([icon, label]) => (
          <button
            key={label}
            className={`flex flex-col items-center justify-center gap-1 ${
              label === 'Explore' ? 'text-[#E9C349]' : 'text-[#303744]'
            }`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
