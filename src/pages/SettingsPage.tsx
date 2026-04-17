import clsx from 'clsx'
import { Download, Loader2, Moon, Monitor, RefreshCw, Shield, Sun } from 'lucide-react'
import type { ThemeMode } from '../context/ThemeContext'
import { useTheme } from '../context/ThemeContext'
import {
  MODULE_DESCRIPTIONS,
  MODULE_KEYS,
  MODULE_LABELS,
  type ModuleKey,
  wouldLeaveAllModulesOff,
} from '../auth/modules'
import {
  PERMISSION_DESCRIPTIONS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from '../auth/permissions'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import { isSupabaseConfigured } from '../lib/supabase'

const modes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

function roleLabel(role: string | null): string {
  if (role === 'manager') return 'Manager'
  if (role === 'sales') return 'Sales'
  if (role === 'viewer') return 'Viewer'
  return '—'
}

export function SettingsPage() {
  const {
    username,
    userEmail,
    role,
    isManager,
    adminPermissions,
    salesPermissions,
    setAdminModuleAccess,
    setSalesPermissionAccess,
    resetAdminAccess,
  } = useAuth()
  const { showToast } = useUiFeedback()
  const { lastCloudSaveAt, retryCloudSyncNow, downloadLocalBackup, cloudSync } =
    useData()
  const { mode, setMode, resolved } = useTheme()
  const syncBusy = cloudSync === 'syncing'

  function toggleViewerModule(key: ModuleKey, on: boolean) {
    if (wouldLeaveAllModulesOff(adminPermissions, key, on)) {
      showToast({
        message:
          'Keep at least one module on for viewers. Turn another module on first, or use Enable all modules.',
        variant: 'error',
      })
      return
    }
    const applied = setAdminModuleAccess(key, on, {
      onPersist: (err) => {
        if (err) {
          showToast({
            message: `Could not save viewer access to the server: ${err}`,
            variant: 'error',
          })
        }
      },
    })
    if (!applied) return
    showToast({
      message: `${MODULE_LABELS[key]} ${on ? 'enabled' : 'disabled'} for viewers.`,
      variant: 'info',
    })
  }

  function toggleSalesPermission(key: PermissionKey, on: boolean) {
    const applied = setSalesPermissionAccess(key, on, {
      onPersist: (err) => {
        if (err) {
          showToast({
            message: `Could not save Sales permission to server: ${err}`,
            variant: 'error',
          })
        }
      },
    })
    if (!applied) return
    showToast({
      message: `${PERMISSION_LABELS[key]} ${on ? 'enabled' : 'disabled'} for Sales role.`,
      variant: 'info',
    })
  }

  async function handleRetryCloudSync() {
    const res = await retryCloudSyncNow()
    if (!res.ok) {
      showToast({ message: `Cloud sync failed: ${res.error}`, variant: 'error' })
      return
    }
    showToast({ message: 'Cloud sync completed.', variant: 'success' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Profile</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Signed in to the operations dashboard.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 rounded-xl bg-[var(--app-bg)] px-4 py-3">
            <dt className="text-[var(--app-muted)]">Username</dt>
            <dd className="font-medium text-[var(--app-text)]">
              {username ?? '—'}
            </dd>
          </div>
          {userEmail && (
            <div className="flex justify-between gap-4 rounded-xl bg-[var(--app-bg)] px-4 py-3">
              <dt className="text-[var(--app-muted)]">Email</dt>
              <dd className="max-w-[60%] truncate font-medium text-[var(--app-text)]" title={userEmail}>
                {userEmail}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 rounded-xl bg-[var(--app-bg)] px-4 py-3">
            <dt className="text-[var(--app-muted)]">Role</dt>
            <dd>
              <span
                className={
                  role === 'manager'
                    ? 'rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-semibold text-coral-800 dark:bg-coral-950/50 dark:text-coral-200'
                    : role === 'sales'
                      ? 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                    : 'rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
                }
              >
                {roleLabel(role)}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[var(--app-muted)]">
          {isManager ? (
            <>
              <strong className="text-[var(--app-text)]">Managers</strong> always
              have full access. Use the section below to choose which modules{' '}
              <strong className="text-[var(--app-text)]">viewers</strong> can open
              (they stay read-only).
            </>
          ) : (
            <>
              You are signed in as a <strong className="text-[var(--app-text)]">Viewer</strong>
              : you can open the modules your manager allows, but you cannot change
              operational data.
            </>
          )}
        </p>
      </section>

      {isManager && (
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="mb-2 flex items-start gap-3">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--app-text)]">
                Viewer module access
              </h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                These switches apply to <strong className="text-[var(--app-text)]">viewers</strong>{' '}
                only (which sidebar pages they can open). Viewers cannot edit data.{' '}
                <strong className="text-[var(--app-text)]">
                  While signed in as a manager you always see every module in the sidebar
                </strong>
                — sign out and sign in as a viewer to test what they get. Unchecking
                Customers (or any row) hides that page from viewers until you turn it
                back on.
                {isSupabaseConfigured() && (
                  <>
                    {' '}
                    Changes are saved to the{' '}
                    <code className="rounded bg-gray-100 px-1 text-xs dark:bg-white/10">
                      app_settings
                    </code>{' '}
                    table (run migration{' '}
                    <code className="rounded bg-gray-100 px-1 text-xs dark:bg-white/10">
                      006_app_settings_admin_permissions.sql
                    </code>{' '}
                    if saves fail in the browser console).
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetAdminAccess('all')
                showToast({
                  message: 'Viewers can access all modules.',
                  variant: 'info',
                })
              }}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:bg-gray-100 active:scale-[0.99] dark:hover:bg-white/10"
            >
              Enable all modules
            </button>
            <button
              type="button"
              onClick={() => {
                resetAdminAccess('minimal')
                showToast({
                  message:
                    'Viewers limited to Settings only (profile & theme). Turn other modules on as needed.',
                  variant: 'info',
                })
              }}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:bg-gray-100 active:scale-[0.99] dark:hover:bg-white/10"
            >
              Minimal access
            </button>
          </div>

          <ul className="space-y-2">
            {MODULE_KEYS.map((key: ModuleKey) => {
              const on = adminPermissions[key]
              return (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${MODULE_LABELS[key]} for viewers`}
                    id={`perm-${key}`}
                    onClick={() => toggleViewerModule(key, !on)}
                    className={clsx(
                      'relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] active:scale-[0.97]',
                      on
                        ? 'bg-coral-500'
                        : 'bg-gray-300 dark:bg-gray-600',
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none m-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform',
                        on ? 'translate-x-6' : 'translate-x-0.5',
                      )}
                      aria-hidden
                    />
                  </button>
                  <label
                    htmlFor={`perm-${key}`}
                    className="min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <span className="font-medium text-[var(--app-text)]">
                      {MODULE_LABELS[key]}
                    </span>
                    <p className="text-xs text-[var(--app-muted)]">
                      {MODULE_DESCRIPTIONS[key]}
                    </p>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[10px] text-[var(--app-muted)]">
            At least one module must stay on for viewers. The app will not let you
            turn off the last remaining switch. Nothing is silently turned back on
            except the minimum Settings-only fallback if stored data is invalid.
          </p>
        </section>
      )}

      {isManager && (
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="mb-2 flex items-start gap-3">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--app-text)]">
                Sales role permissions
              </h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Configure what users in the <strong className="text-[var(--app-text)]">Sales</strong>{' '}
                role can do. These controls are permission-based and do not rely on hardcoded role checks.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {PERMISSION_KEYS.map((key) => {
              const on = salesPermissions[key]
              return (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${PERMISSION_LABELS[key]} for sales role`}
                    id={`sales-perm-${key}`}
                    onClick={() => toggleSalesPermission(key, !on)}
                    className={clsx(
                      'relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] active:scale-[0.97]',
                      on ? 'bg-coral-500' : 'bg-gray-300 dark:bg-gray-600',
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none m-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform',
                        on ? 'translate-x-6' : 'translate-x-0.5',
                      )}
                      aria-hidden
                    />
                  </button>
                  <label
                    htmlFor={`sales-perm-${key}`}
                    className="min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <span className="font-medium text-[var(--app-text)]">
                      {PERMISSION_LABELS[key]}
                    </span>
                    <p className="text-xs text-[var(--app-muted)]">
                      {PERMISSION_DESCRIPTIONS[key]}
                    </p>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Appearance</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Theme applies instantly across the dashboard. Current:{' '}
          <strong className="text-[var(--app-text)]">{resolved}</strong>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={
                mode === id
                  ? 'flex flex-col items-center gap-2 rounded-2xl border-2 border-coral-500 bg-coral-50 py-4 text-coral-800 transition active:scale-[0.99] dark:bg-coral-950/40 dark:text-coral-100'
                  : 'flex flex-col items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] py-4 text-[var(--app-muted)] transition hover:border-coral-300 active:scale-[0.99]'
              }
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          System preferences
        </h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          {isSupabaseConfigured()
            ? 'Operational data syncs to your Supabase project; sessions use Supabase Auth. Viewer module toggles (edited by managers) sync to Supabase when the app_settings table exists; theme stays in this browser.'
            : 'Data is stored locally in this browser until you add Supabase env vars.'}
        </p>
        <ul className="mt-4 list-inside list-disc text-sm text-[var(--app-muted)]">
          <li>Currency display follows your locale (USD formatting).</li>
          <li>Low-stock threshold is fixed in code for this demo.</li>
          <li>Notifications fire on low or zero stock after sales.</li>
        </ul>
      </section>

      {isManager && (
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Data safety</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Keep a local backup file and manually retry cloud sync any time.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => downloadLocalBackup()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)] hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Download local backup (JSON)
            </button>
            <button
              type="button"
              onClick={() => void handleRetryCloudSync()}
              disabled={syncBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50"
            >
              {syncBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry cloud sync now
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--app-muted)]">
            Last cloud save:{' '}
            <strong className="text-[var(--app-text)]">
              {lastCloudSaveAt ? new Date(lastCloudSaveAt).toLocaleString() : 'Not saved yet'}
            </strong>
          </p>
        </section>
      )}
    </div>
  )
}
