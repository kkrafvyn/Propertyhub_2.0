import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RoleProtectedRoute from '../../components/RoleProtectedRoute'
import { Field, selectClass } from '../../components/ui/AirbnbUI'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { PROMOTABLE_ROLES } from '../../platform/registry'
import { fetchAdminUsers, promoteUserRole } from '../../services/trust-service'

function AdminUsersContent() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [draftRoles, setDraftRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminUsers()
      .then(({ users: rows }) => {
        setUsers(rows)
        const initial = {}
        rows.forEach((row) => { initial[row.id] = row.role })
        setDraftRoles(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const roleOptions = useMemo(
    () => PROMOTABLE_ROLES.map((code) => ({
      code,
      label: t(`roles.${code}`, { defaultValue: code }),
    })),
    [t],
  )

  async function handleSave(row) {
    const nextRole = draftRoles[row.id]
    if (!nextRole || nextRole === row.role) return

    setSavingId(row.id)
    setError('')
    setMessage('')

    try {
      await promoteUserRole(row.id, nextRole)
      setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, role: nextRole } : u)))
      setMessage(t('adminUsers.promoted', { email: row.email }))
    } catch (err) {
      setError(err.message || t('adminUsers.promoteFailed'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminShell titleKey="hubs.admin.users.title" subtitleKey="hubs.admin.users.subtitle">
      {message && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      ) : (
        <div className="space-y-3">
          {users.map((row) => {
            const pending = draftRoles[row.id] !== row.role
            const isSelf = row.id === user?.id

            return (
              <article key={row.id} className="panel-card p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{row.display_name || row.email}</p>
                    <p className="text-sm text-ink-secondary">{row.email}</p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {t('adminUsers.currentRole')}: {t(`roles.${row.role}`, { defaultValue: row.role })}
                      {isSelf && ` · ${t('adminUsers.you')}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={t('adminUsers.newRole')} className="min-w-[200px]">
                      <select
                        value={draftRoles[row.id] ?? row.role}
                        onChange={(e) => setDraftRoles((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className={selectClass}
                        disabled={savingId === row.id}
                      >
                        {roleOptions.map(({ code, label }) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={() => handleSave(row)}
                      disabled={!pending || savingId === row.id}
                      className="rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                    >
                      {savingId === row.id ? t('adminUsers.saving') : t('adminUsers.promote')}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute require="admin">
        <AdminUsersContent />
      </RoleProtectedRoute>
    </ProtectedRoute>
  )
}
