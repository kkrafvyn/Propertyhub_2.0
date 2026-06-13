import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import { fetchConversation, fetchConversations } from '../../services/messaging-service'

export function MobileMessagesPage() {
  const { id } = useParams()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)

  useEffect(() => {
    fetchConversations().then(({ conversations: rows }) => setConversations(rows))
  }, [])

  useEffect(() => {
    if (id) fetchConversation(id).then(({ conversation }) => setActive(conversation))
    else setActive(null)
  }, [id])

  if (active) {
    return (
      <MobileShell hideNav>
        <MobileHeader title={active.participant} subtitle={active.listingTitle} />
        <div className="space-y-2 px-4 py-4">
          {active.messages?.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                msg.sender === 'You' ? 'ml-auto bg-brand-dark text-brand' : 'bg-surface text-ink'
              }`}
            >
              {msg.body}
            </div>
          ))}
        </div>
        <Link to="/m/messages" className="fixed bottom-4 left-4 rounded-full bg-surface px-4 py-2 text-sm shadow-card">
          ← Back
        </Link>
      </MobileShell>
    )
  }

  return (
    <MobileShell>
      <MobileHeader title="Messages" subtitle="Chat with agencies" />
      <div className="divide-y divide-surface-border px-4">
        {conversations.map((conv) => (
          <Link key={conv.id} to={`/m/messages/${conv.id}`} className="block py-4">
            <p className="font-semibold">{conv.participant}</p>
            <p className="truncate text-sm text-ink-secondary">{conv.lastMessage}</p>
          </Link>
        ))}
      </div>
    </MobileShell>
  )
}

export function MobileProfilePage() {
  return (
    <MobileShell>
      <MobileHeader title="Profile" subtitle="Account & workspace" />
      <div className="space-y-2 px-4 pb-4">
        <MobileLink to="/profile">Account settings</MobileLink>
        <MobileLink to="/trips">Trips</MobileLink>
        <MobileLink to="/m/agent">Agent CRM</MobileLink>
        <MobileLink to="/buyer">Buyer workspace</MobileLink>
        <MobileLink to="/documents">Documents</MobileLink>
        <MobileLink to="/m/renter">Renter app</MobileLink>
        <MobileLink to="/manage">Property management</MobileLink>
        <MobileLink to="/admin">Admin</MobileLink>
        <MobileLink to="/login">Log in</MobileLink>
      </div>
    </MobileShell>
  )
}

function MobileLink({ to, children }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-4 font-medium shadow-sm">
      {children}
      <span className="text-ink-muted">›</span>
    </Link>
  )
}

export function MobilePropertyPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)

  useEffect(() => {
    import('../../services/marketplace-service').then(({ fetchListingById }) => {
      fetchListingById(id).then(({ listing: row }) => setListing(row))
    })
  }, [id])

  if (!listing) {
    return (
      <MobileShell hideNav>
        <div className="p-8 text-center">Loading…</div>
      </MobileShell>
    )
  }

  return (
    <MobileShell hideNav>
      <img src={listing.image} alt={listing.title} className="h-56 w-full object-cover" />
      <div className="space-y-3 px-4 py-4">
        <h1 className="text-xl font-bold">{listing.title}</h1>
        <p className="text-ink-secondary">{listing.location}</p>
        <p className="text-lg font-bold text-brand-dark">{listing.priceLabel}</p>
        <p className="text-sm leading-relaxed">{listing.description}</p>
        <Link
          to="/login"
          className="block rounded-2xl bg-brand-dark py-3.5 text-center font-semibold text-brand"
        >
          Request viewing
        </Link>
        <Link to="/m/explore" className="block text-center text-sm text-ink-secondary">← Back to explore</Link>
      </div>
    </MobileShell>
  )
}
