import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { PwaInstallProvider } from './context/PwaInstallContext'
import { ThemeProvider } from './context/ThemeContext'
import { UiFeedbackProvider } from './context/UiFeedbackContext'
import { MainLayout } from './components/Layout/MainLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RequireModule } from './components/RequireModule'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmailConfirmedPage } from './pages/EmailConfirmedPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductionPage } from './pages/ProductionPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesPage } from './pages/SalesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { UserManagementPage } from './pages/UserManagementPage'

function ManagerOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isManager, defaultLandingPath } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isManager) return <Navigate to={defaultLandingPath} replace />
  return <>{children}</>
}

function AuthedCatchAll() {
  const {
    isAuthenticated,
    defaultLandingPath,
    usesSupabaseAuth,
    permissionsReady,
  } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (usesSupabaseAuth && !permissionsReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] text-[var(--app-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden />
        <p className="text-sm">Loading access…</p>
      </div>
    )
  }
  return <Navigate to={defaultLandingPath} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <PwaInstallProvider>
        <AuthProvider>
          <UiFeedbackProvider>
            <DataProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/confirmed" element={<EmailConfirmedPage />} />
                  <Route path="/set-password" element={<SetPasswordPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      path="/"
                      element={
                        <RequireModule module="dashboard">
                          <DashboardPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/products"
                      element={
                        <RequireModule module="products">
                          <ProductsPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/production"
                      element={
                        <RequireModule module="production">
                          <ProductionPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/sales"
                      element={
                        <RequireModule module="sales">
                          <SalesPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/orders"
                      element={
                        <RequireModule module="orders">
                          <OrdersPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/purchases"
                      element={
                        <RequireModule module="purchases">
                          <PurchasesPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/reports"
                      element={
                        <RequireModule module="reports">
                          <ReportsPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/customers"
                      element={
                        <RequireModule module="customers">
                          <CustomersPage />
                        </RequireModule>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ManagerOnly>
                          <UserManagementPage />
                        </ManagerOnly>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RequireModule module="settings">
                          <SettingsPage />
                        </RequireModule>
                      }
                    />
                  </Route>
                  <Route path="*" element={<AuthedCatchAll />} />
                </Routes>
              </BrowserRouter>
            </DataProvider>
          </UiFeedbackProvider>
        </AuthProvider>
      </PwaInstallProvider>
    </ThemeProvider>
  )
}
