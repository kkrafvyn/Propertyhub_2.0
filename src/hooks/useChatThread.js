import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversation, sendMessage } from '../services/messaging-service'
import { subscribeToMessages } from '../lib/realtime'

function isOwnMessage(msg, selfLabel = 'You') {
  return msg?.sender === selfLabel || msg?.sender === 'You'
}

export function useChatThread(conversationId, { selfLabel = 'You' } = {}) {
  const [conversation, setConversation] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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
    reload().then((row) => {
      if (!cancelled && !row) setError('Conversation not found')
    })

    const unsubscribe = subscribeToMessages(conversationId, (row) => {
      setConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev
        if (prev.messages?.some((m) => m.id === row.id)) return prev
        return {
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            { id: row.id, sender: row.sender, body: row.body, at: row.created_at },
          ],
        }
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [conversationId, reload])

  const send = useCallback(async (text) => {
    const body = text.trim()
    if (!body || !conversationId) return false

    setSending(true)
    setError('')
    const tempId = `temp-${Date.now()}`
    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages ?? []), { id: tempId, sender: selfLabel, body, pending: true }],
    }))

    try {
      await sendMessage(conversationId, body)
      await reload()
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
  }, [conversationId, reload, selfLabel])

  return { conversation, sending, error, send, reload, isOwnMessage: (msg) => isOwnMessage(msg, selfLabel) }
}

export function useChatScroll(messages) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  return endRef
}
