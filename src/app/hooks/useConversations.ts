import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeToAgentConversations, subscribeToUserConversations } from '../lib/baytmiftah/realtime'
import {
  fetchAgentConversations,
  fetchConversations,
} from '../lib/baytmiftah/messaging-service'

function sortConversations(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
    return bTime - aTime
  })
}

function mergeConversation(prev, row) {
  const idx = prev.findIndex((c) => c.id === row.id)
  if (idx >= 0) {
    const next = [...prev]
    next[idx] = { ...next[idx], ...row }
    return sortConversations(next)
  }
  return sortConversations([row, ...prev])
}

export function useConversations({ mode = 'consumer' } = {}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)

  const reload = useCallback(async () => {
    if (!user) {
      setConversations([])
      setLoading(false)
      return
    }
    const fetcher = mode === 'agent' ? fetchAgentConversations : fetchConversations
    const { conversations: rows } = await fetcher()
    setConversations(sortConversations(rows ?? []))
    setLoading(false)
  }, [user, mode])

  useEffect(() => {
    if (!user) {
      setConversations([])
      setLoading(false)
      setLive(false)
      return undefined
    }

    let cancelled = false
    reload().then(() => {
      if (!cancelled) setLoading(false)
    })

    const subscribe = mode === 'agent' ? subscribeToAgentConversations : subscribeToUserConversations
    const unsubscribe = subscribe(
      user.id,
      (row) => {
        setConversations((prev) => mergeConversation(prev, row))
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
  }, [user, mode, reload])

  return { conversations, loading, live, reload }
}
