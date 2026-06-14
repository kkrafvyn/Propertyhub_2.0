import { callEdgeFunction } from '../lib/edge-client'

export async function sendEmail({ to, subject, body }) {
  try {
    return await callEdgeFunction('email', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'queue', to, subject, body },
    })
  } catch (err) {
    return { ok: false, sent: false, message: err.message || 'Email service unavailable' }
  }
}

export async function sendViewingConfirmation({ to, listingTitle, date }) {
  return sendEmail({
    to,
    subject: `Viewing request — ${listingTitle}`,
    body: `<p>Your viewing for <strong>${listingTitle}</strong> on ${date} was received.</p><p>Track updates in Trips on BaytMiftah.</p>`,
  })
}

export async function sendListingStatusEmail({ to, listingTitle, status }) {
  return sendEmail({
    to,
    subject: `Listing ${status} — ${listingTitle}`,
    body: `<p>Your listing <strong>${listingTitle}</strong> is now <strong>${status}</strong>.</p>`,
  })
}

export default { sendEmail, sendViewingConfirmation, sendListingStatusEmail }
