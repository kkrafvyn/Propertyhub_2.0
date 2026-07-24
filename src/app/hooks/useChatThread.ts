import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversation, markConversationRead, sendMessage } from '../lib/baytmiftah/messaging-service'
import { subscribeToMessages } from '../lib/baytmiftah/realtime'

function isOwnMessage(msg, { selfLabel, selfUserId }) {
  if (!msg) return false
  if (selfUserId && msg.sender_user_id) return msg.sender_user_id === selfUserId
  return msg.sender === selfLabel || msg.sender === 'You'
}

function mapMessageRow(row) {
  return {
    id: row.id,
    sender: row.sender,
    body: row.body,
    at: row.created_at ?? row.at,
    sender_user_id: row.sender_user_id,
  }
}

export function useChatThread(
  conversationId,
  { selfLabel = 'You', selfUserId, sendMessageFn }: {
    selfLabel?: string
    selfUserId?: string
    sendMessageFn?: typeof sendMessage
  } = {},
) {
  const [conversation, setConversation] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const selfRef = useRef({ selfLabel, selfUserId })
  selfRef.current = { selfLabel, selfUserId }

  const reload = useCallback(async () => {
    if (!conversationId) {
      setConversation(null)
      return null
    }
    const { conversation: row } = await fetchConversation(conversationId)
    setConversation(row ?? null)
    return row ?? null
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) {
      setConversation(null)
      return undefined
    }

    let cancelled = false
    setError('')
    reload().then((row) => {
      if (!cancelled && !row) setError('Conversation not found')
      if (!cancelled && row) markConversationRead(conversationId).catch(() => {})
    })

    const unsubscribe = subscribeToMessages(
      conversationId,
      (row) => {
        const mapped = mapMessageRow(row)
        const { selfLabel: label, selfUserId: uid } = selfRef.current

        setConversation((prev) => {
          if (!prev) return prev
          if (prev.messages?.some((m) => m.id === mapped.id)) return prev

          const filtered = (prev.messages ?? []).filter(
            (m) => !(
              m.pending
              && m.body === mapped.body
              && (isOwnMessage(mapped, { selfLabel: label, selfUserId: uid })
                || mapped.sender === m.sender
                || mapped.sender === label)
            ),
          )

          return {
            ...prev,
            messages: [...filtered, mapped],
          }
        })

        markConversationRead(conversationId).catch(() => {})
      },
      (status) => {
        setLive(status === 'SUBSCRIBED')
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
      setLive(false)
    }
  }, [conversationId, reload])

  const send = useCallback(async (text) => {
    const body = text.trim()
    if (!body || !conversationId) return false

    setSending(true)
    setError('')
    const tempId = `temp-${Date.now()}`
    const { selfLabel: label } = selfRef.current

    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages ?? []), { id: tempId, sender: label, body, pending: true }],
    }))

    try {
      const deliver = sendMessageFn ?? sendMessage
      const result = await deliver(conversationId, body)
      const realMsg = result?.message
      if (realMsg?.id) {
        const mapped = mapMessageRow(realMsg)
        setConversation((prev) => ({
          ...prev,
          messages: [
            ...(prev?.messages ?? []).filter((m) => m.id !== tempId),
            mapped,
          ],
        }))
      }
      return true
    } catch (err) {
      setError(err.message || 'Could not send message')
      setConversation((prev) => ({
        ...prev,
        messages: (prev?.messages ?? []).filter((m) => m.id !== tempId),
      }))
      return false
    } finally {
      setSending(false)
    }
  }, [conversationId, sendMessageFn])

  return {
    conversation,
    sending,
    error,
    live,
    send,
    reload,
    isOwnMessage: (msg) => isOwnMessage(msg, { selfLabel, selfUserId }),
  }
}

export function useChatScroll(messages) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  return endRef
}
