import { callEdgeFunction } from './edge-client'

const OFFER_KEY = 'baytmiftah_offer_packets'

const syncPersistence = (type, body) =>
  callEdgeFunction('persistence', {
    method: 'POST',
    query: { action: 'save', type },
    body,
  })

export function getOfferPackets() {
  try {
    return JSON.parse(localStorage.getItem(OFFER_KEY) || '[]')
  } catch {
    return []
  }
}

export async function createOfferPacket(payload) {
  const packet = {
    id: `offer-${Date.now()}`,
    status: 'drafted',
    signatureStatus: 'pending',
    created_at: new Date().toISOString(),
    ...payload,
  }
  const next = [packet, ...getOfferPackets()].slice(0, 30)
  localStorage.setItem(OFFER_KEY, JSON.stringify(next))

  try {
    const remote = await syncPersistence('offer_packet', packet)
    return { packet: { ...packet, ...remote }, source: 'supabase' }
  } catch (error) {
    return { packet, source: 'local', error: error.message }
  }
}

export async function markOfferPacketSigned(id) {
  const next = getOfferPackets().map((packet) =>
    packet.id === id
      ? { ...packet, signatureStatus: 'signed', signed_at: new Date().toISOString() }
      : packet
  )
  localStorage.setItem(OFFER_KEY, JSON.stringify(next))
  const signedPacket = next.find((packet) => packet.id === id)
  if (!signedPacket) return { packet: null, source: 'local' }

  try {
    const remote = await syncPersistence('e_sign_packet', signedPacket)
    return { packet: { ...signedPacket, ...remote }, source: 'supabase' }
  } catch (error) {
    return { packet: signedPacket, source: 'local', error: error.message }
  }
}
