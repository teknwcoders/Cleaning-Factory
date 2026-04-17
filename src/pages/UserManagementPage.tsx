import { Loader2, MailPlus, Shield, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import {
  fetchManagedUsers,
  inviteSalesUser,
  setManagedUserActive,
  updateManagedUserRole,
  type ManagedUser,
} from '../lib/userManagementRemote'

export function UserManagementPage() {
  const { isManager } = useAuth()
  const { showToast } = useUiFeedback()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busyInvite, setBusyInvite] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  async function reloadUsers() {
    setLoading(true)
    const res = await fetchManagedUsers()
    if (res.error) {
      showToast({ message: `Could not load users: ${res.error}`, variant: 'error' })
    } else {
      setUsers(res.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isManager) return
    void reloadUsers()
  }, [isManager])

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [users],
  )

  async function handleInviteSales(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setBusyInvite(true)
    const res = await inviteSalesUser(clean)
    setBusyInvite(false)
    if (res.error) {
      showToast({ message: `Invite failed: ${res.error}`, variant: 'error' })
      return
    }
    setEmail('')
    showToast({
      message: 'Sales invite sent. User will set password via secure email link.',
      variant: 'success',
    })
    await reloadUsers()
  }

  async function handleRoleChange(userId: string, role: 'viewer' | 'sales') {
    setBusyUserId(userId)
    const res = await updateManagedUserRole(userId, role)
    setBusyUserId(null)
    if (res.error) {
      showToast({ message: `Could not update role: ${res.error}`, variant: 'error' })
      return
    }
    showToast({ message: 'User role updated.', variant: 'success' })
    await reloadUsers()
  }

  async function handleActiveToggle(userId: string, nextActive: boolean) {
    setBusyUserId(userId)
    const res = await setManagedUserActive(userId, nextActive)
    setBusyUserId(null)
    if (res.error) {
      showToast({ message: `Could not update status: ${res.error}`, variant: 'error' })
      return
    }
    showToast({
      message: nextActive ? 'User activated.' : 'User deactivated.',
      variant: 'success',
    })
    await reloadUsers()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Create Sales User
            </h2>
            <p className="text-xs text-[var(--app-muted)]">
              Manager-only flow. Invite email is sent and user sets password securely.
            </p>
          </div>
        </div>
        <form onSubmit={handleInviteSales} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sales.user@company.com"
            className="min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={busyInvite}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50"
          >
            {busyInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
            Invite Sales
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="border-b border-[var(--app-border)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--app-text)]">User Management</h2>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            Change role between Viewer and Sales, and deactivate users.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[var(--app-muted)]">
                    Loading users...
                  </td>
                </tr>
              )}
              {!loading && sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[var(--app-muted)]">
                    No users found.
                  </td>
                </tr>
              )}
              {!loading &&
                sortedUsers.map((u) => (
                  <tr key={u.userId}>
                    <td className="px-4 py-3 text-[var(--app-text)]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--app-bg)] px-2 py-0.5 text-xs uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          u.active
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200'
                        }
                      >
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {u.role !== 'manager' && (
                          <>
                            <button
                              type="button"
                              disabled={busyUserId === u.userId}
                              onClick={() =>
                                handleRoleChange(
                                  u.userId,
                                  u.role === 'sales' ? 'viewer' : 'sales',
                                )
                              }
                              className="rounded-lg border border-[var(--app-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--app-bg)] disabled:opacity-50"
                            >
                              {u.role === 'sales' ? 'Set Viewer' : 'Set Sales'}
                            </button>
                            <button
                              type="button"
                              disabled={busyUserId === u.userId}
                              onClick={() => handleActiveToggle(u.userId, !u.active)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
