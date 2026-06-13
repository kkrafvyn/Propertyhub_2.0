export const conversations = [
  {
    id: 'conv-1',
    participant: 'Gold Coast Realty',
    participantRole: 'Agency',
    listingTitle: 'Cantonments Sky Villa',
    lastMessage: 'We can schedule a viewing this Saturday at 10am.',
    updatedAt: '2026-06-12T14:30:00Z',
    unread: 2,
    messages: [
      { id: 'm1', sender: 'You', body: 'Hi, is the Cantonments villa still available?', at: '2026-06-12T10:00:00Z' },
      { id: 'm2', sender: 'Gold Coast Realty', body: 'Yes, it is. Would you like to book a viewing?', at: '2026-06-12T10:15:00Z' },
      { id: 'm3', sender: 'You', body: 'Saturday morning works for me.', at: '2026-06-12T11:00:00Z' },
      { id: 'm4', sender: 'Gold Coast Realty', body: 'We can schedule a viewing this Saturday at 10am.', at: '2026-06-12T14:30:00Z' },
    ],
  },
  {
    id: 'conv-2',
    participant: 'Anchorstone Properties',
    participantRole: 'Agency',
    listingTitle: 'Airport Residential Townhouse',
    lastMessage: 'Ownership documents are ready for review.',
    updatedAt: '2026-06-11T09:00:00Z',
    unread: 0,
    messages: [
      { id: 'm5', sender: 'Anchorstone Properties', body: 'Ownership documents are ready for review.', at: '2026-06-11T09:00:00Z' },
    ],
  },
]

export function getConversation(id) {
  return conversations.find((c) => c.id === id) ?? null
}
