import React, { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import EnterpriseShell from '../components/EnterpriseShell'
import { createViewingRequest, getLocalBookings } from '../services/booking-service'
import { SvgIcon } from '../components/Navigation'

const actions = [
  {
    title: 'Contemporary Glass Villa',
    status: 'Confirmed',
    statusClass: 'bg-[#F5D76B] text-[#E9C349]',
    meta: ['Oct 24, 2023', '14:00 - 15:00', 'Beverly Hills, CA'],
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=85',
    footer: 'Agent: Marcus Thorne',
    action: 'View Details',
    type: 'Upcoming',
  },
  {
    title: 'Industrial Penthouse',
    status: 'Pending Approval',
    statusClass: 'bg-[#dbeafe] text-[#303744]',
    meta: ['Oct 28, 2023', 'Rental Inquiry'],
    image:
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=85',
    footer: '"Waiting for owner to confirm the requested morning slot."',
    action: 'Property Page',
    type: 'Purchase Inquiries',
  },
]

export default function Bookings() {
  const location = useLocation()
  const bookingDraft = location.state?.bookingDraft || location.state?.from?.bookingDraft
  const [activeTab, setActiveTab] = useState('All Items')
  const [bookingForm, setBookingForm] = useState({
    property: bookingDraft?.property || 'The Obsidian Penthouse',
    listingId: bookingDraft?.listingId || '',
    propertyId: bookingDraft?.propertyId || '',
    requestedDate: '',
    requestedTime: '10:00',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
  })
  const [localBookings, setLocalBookings] = useState(getLocalBookings)
  const [bookingSource, setBookingSource] = useState('')
  const tabs = ['All Items', 'Upcoming', 'Past Transactions', 'Purchase Inquiries']
  const visibleActions = useMemo(
    () => actions.filter((item) => activeTab === 'All Items' || item.type === activeTab),
    [activeTab]
  )

  const submitViewingRequest = async (event) => {
    event.preventDefault()
    const result = await createViewingRequest(bookingForm)
    setLocalBookings((current) => [result.booking, ...current])
    setBookingSource(result.source)
    setBookingForm((current) => ({
      ...current,
      requestedDate: '',
      notes: '',
    }))
  }

  return (
    <EnterpriseShell activeSection="Settings" searchPlaceholder="Search bookings..." showCreate={false}>
      <main className="bg-[#f5f7fc] px-5 py-10 text-[#071121] md:px-10">
        <section className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black leading-tight md:text-5xl">My Bookings & History</h1>
          <p className="mt-3 text-xl text-[#303744]">
            Manage your viewing schedule, active rental agreements, and purchase offers.
          </p>
          {bookingDraft && (
            <div className="mt-6 rounded-lg border border-[#E9C349]/40 bg-[#fff8d7] p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-[#9a7413]">
                Booking request started
              </p>
              <h2 className="mt-2 text-2xl font-bold">{bookingDraft.property}</h2>
              <p className="mt-1 text-[#303744]">
                Choose a preferred time, add your contact details, and the agent can confirm or suggest another slot.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-7 py-3 text-lg ${
                  activeTab === tab
                    ? 'bg-[#071121] text-white shadow-[0_10px_26px_rgba(7,17,33,0.18)]'
                    : 'bg-white text-[#071121] ring-1 ring-[#d8dde6]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="relative overflow-hidden rounded-lg bg-[#111827] p-8 text-white">
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center rounded-full bg-[#174d4b] px-4 py-2 text-lg text-[#F5D76B]">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#F5D76B]" />
                  Live Now
                </span>
                <h2 className="mt-7 text-3xl font-bold">Viewing desk</h2>
                <p className="mt-5 max-w-lg text-xl leading-8 text-[#8f9aad]">
                  Review pending viewing requests, confirmed appointments, and offer follow-ups in one place.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="marketplace-cta px-8 py-4">
                    Open Calendar
                  </button>
                  <button className="rounded-md border border-white/20 px-8 py-4 font-bold text-white">
                    Contact Agent
                  </button>
                </div>
              </div>
              <div className="absolute right-8 top-10 h-56 w-56 rotate-12 rounded-[32px] border border-white/10" />
              <div className="absolute right-20 top-14 h-56 w-56 -rotate-12 rounded-[32px] border border-white/10" />
            </article>

            <aside className="rounded-lg border border-[#b7c7de] bg-[#cfe3ff] p-8">
              {[
                ['Active Inquiries', '04'],
                ['Confirmed Viewings', '02'],
                ['Completed Leases', '12'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-[#b7c7de] py-6 text-lg last:border-b-0"
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </aside>
          </div>

          <section className="mt-10 grid gap-6 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-[0_12px_32px_rgba(7,17,33,0.06)] lg:grid-cols-[1fr_320px]">
            <form onSubmit={submitViewingRequest} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-bold uppercase tracking-widest text-[#9a7413]">
                  Request to view
                </p>
                <h2 className="mt-2 text-3xl font-bold">Confirm your preferred slot</h2>
                <p className="mt-2 text-[#303744]">
                  Similar to a booking request, payment is not collected here. The agency confirms availability first.
                </p>
              </div>
              {[
                ['property', 'Property', 'text'],
                ['requestedDate', 'Date', 'date'],
                ['requestedTime', 'Time', 'time'],
                ['contactName', 'Name', 'text'],
                ['contactEmail', 'Email', 'email'],
                ['contactPhone', 'Phone', 'tel'],
              ].map(([key, label, type]) => (
                <label key={key} className="block">
                  <span className="font-semibold">{label}</span>
                  <input
                    type={type}
                    value={bookingForm[key]}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    required={['property', 'requestedDate', 'requestedTime'].includes(key)}
                    className="mt-2 h-12 w-full rounded-md border border-[#b9c3d2] bg-[#f8faff] px-4"
                  />
                </label>
              ))}
              <label className="block md:col-span-2">
                <span className="font-semibold">Notes</span>
                <textarea
                  value={bookingForm.notes}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="mt-2 min-h-24 w-full rounded-md border border-[#b9c3d2] bg-[#f8faff] px-4 py-3"
                />
              </label>
              <button className="marketplace-cta w-fit">
                <SvgIcon name="calendar_month" />
                Request Viewing
              </button>
              {bookingSource && (
                <p className="self-center text-sm text-[#303744]">
                  Request saved via {bookingSource === 'supabase' ? 'Supabase' : 'local fallback'}.
                </p>
              )}
            </form>

            <aside className="rounded-lg border border-[#d7e0ec] bg-[#edf4ff] p-5">
              <h3 className="font-bold">Recent requests</h3>
              <div className="mt-4 grid gap-2 text-sm">
                {['Agent must confirm', 'Calendar blocks after approval', 'Messages stay attached'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md bg-white/70 px-3 py-2">
                    <SvgIcon name="check_circle" className="h-4 w-4 text-[#9a7413]" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {localBookings.slice(0, 4).map((booking) => (
                  <div key={booking.id} className="rounded-md bg-white p-3">
                    <p className="font-semibold">{booking.property}</p>
                    <p className="text-sm text-[#303744]">
                      {booking.requestedDate || 'Date pending'} / {booking.requestedTime}
                    </p>
                  </div>
                ))}
                {localBookings.length === 0 && (
                  <p className="text-sm text-[#303744]">No viewing requests yet.</p>
                )}
              </div>
            </aside>
          </section>

          <h2 className="mt-10 text-3xl font-bold">Upcoming Viewings & Actions</h2>
          <div className="mt-6 space-y-5">
            {visibleActions.map((item) => (
              <article
                key={item.title}
                className="grid overflow-hidden rounded-lg border border-[#cbd3df] bg-white md:grid-cols-[300px_minmax(0,1fr)]"
              >
                <img src={item.image} alt="" className="h-64 w-full object-cover md:h-full" />
                <div className="p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-3xl font-bold">{item.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-lg text-[#303744]">
                        {item.meta.map((meta, index) => (
                          <span key={meta} className="flex items-center gap-1">
                            <SvgIcon
                              name={index === 0 ? 'calendar_month' : index === 1 ? 'monitoring' : 'location_on'}
                              className="h-4 w-4"
                            />
                            {meta}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`w-fit shrink-0 rounded-full px-5 py-2 text-base ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-16 flex flex-col gap-4 border-t border-[#cbd3df] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg text-[#303744]">{item.footer}</span>
                    <button className="flex items-center gap-2 text-lg">
                      {item.action}
                      <SvgIcon name="chevron_left" className="rotate-180" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {visibleActions.length === 0 && (
              <div className="rounded-lg border border-[#cbd3df] bg-white p-10 text-center">
                <SvgIcon name="calendar_month" className="mx-auto h-12 w-12 text-[#E9C349]" />
                <h3 className="mt-4 text-2xl font-bold">No bookings in this view</h3>
                <p className="mt-2 text-[#303744]">
                  Try another booking status or return to the full schedule.
                </p>
              </div>
            )}
          </div>

          <section className="mt-12">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl font-bold">Transaction History</h2>
              <button className="flex items-center gap-2 font-semibold text-[#E9C349]">
                Download CSV
                <SvgIcon name="folder_managed" className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#cbd3df] bg-white">
              <table className="min-w-[760px] w-full text-left">
                <thead className="bg-[#edf4ff]">
                  <tr>
                    {['Property', 'Date', 'Transaction Type', 'Status', 'Action'].map((heading) => (
                      <th key={heading} className="px-5 py-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Oakwood Estate', 'Unit 402, Building B', 'Sep 12, 2023', 'Purchase Inquiry', 'Completed'],
                    ['Hilltop Sanctuary', 'Main Residence', 'Aug 05, 2023', 'Rental Lease', 'Expired'],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#d8dde6]">
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=140&q=80"
                            alt=""
                            className="h-12 w-16 rounded object-cover"
                          />
                          <div>
                            <p className="font-semibold">{row[0]}</p>
                            <p className="text-sm text-[#4b5563]">{row[1]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">{row[2]}</td>
                      <td className="px-5 py-5">{row[3]}</td>
                      <td className="px-5 py-5">
                        <span
                          className={`rounded px-3 py-1 text-xs font-semibold uppercase ${
                            row[4] === 'Completed'
                              ? 'bg-[#dbeafe] text-[#303744]'
                              : 'bg-[#fecaca] text-red-700'
                          }`}
                        >
                          {row[4]}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <SvgIcon name="menu" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </EnterpriseShell>
  )
}
