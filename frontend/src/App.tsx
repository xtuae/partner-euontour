import './styles/globals.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './app/guards/ProtectedRoute';
import { ROLES } from './features/auth/types';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { WalletPage } from './features/wallet/WalletPage';
import { DepositPage } from './features/wallet/DepositPage';
import { AppLayout } from './app/layouts/AppLayout';
import { AgencyDashboard } from './features/agency/AgencyDashboard';
import { UnauthorizedPage } from './pages/Unauthorized';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Agency Routes */}
              <Route path="/agency" element={<ProtectedRoute allowedRoles={[ROLES.AGENCY]} />}>
                <Route path="dashboard" element={<AgencyDashboard />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="deposits" element={<DepositPage />} />
                <Route path="tours" element={<PlaceholderPage title="Tours" />} />
                <Route path="bookings" element={<PlaceholderPage title="Bookings" />} />
                <Route path="verification" element={<PlaceholderPage title="Verification" />} />
                <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
                <Route path="settings" element={<PlaceholderPage title="Settings" />} />
                <Route path="security" element={<PlaceholderPage title="Security" />} />
                <Route path="support" element={<PlaceholderPage title="Support" />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
                <Route path="dashboard" element={<PlaceholderPage title="Admin Dashboard" />} />
                <Route path="deposits" element={<PlaceholderPage title="Admin Deposits" />} />
                <Route path="verification" element={<PlaceholderPage title="Verification Review" />} />
                <Route path="agencies/:id" element={<PlaceholderPage title="Agency Details" />} />
                <Route path="finance" element={<PlaceholderPage title="Finance" />} />
                <Route path="users" element={<PlaceholderPage title="Users" />} />
                <Route path="audit" element={<PlaceholderPage title="Audit Logs" />} />
              </Route>

              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
                <Route path="dashboard" element={<PlaceholderPage title="Super Admin Dashboard" />} />
                <Route path="agencies" element={<PlaceholderPage title="All Agencies" />} />
                <Route path="finance" element={<PlaceholderPage title="Global Finance" />} />
                <Route path="admins" element={<PlaceholderPage title="Manage Admins" />} />
                <Route path="settings" element={<PlaceholderPage title="Platform Settings" />} />
                <Route path="audit" element={<PlaceholderPage title="Global Audit" />} />
              </Route>

            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
