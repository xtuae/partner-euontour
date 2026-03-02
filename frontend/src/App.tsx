import './styles/globals.css'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './app/guards/ProtectedRoute';
import { ROLES } from './features/auth/types';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage';
import { WalletPage } from './features/wallet/WalletPage';
import { DepositPage } from './features/wallet/DepositPage';
import { AppLayout } from './app/layouts/AppLayout';
import { AgencyDashboard } from './features/agency/AgencyDashboard';
import { AgencyVerificationPage } from './features/agency/AgencyVerificationPage';
import { UnauthorizedPage } from './pages/Unauthorized';
import { BookingPage } from './features/agency/BookingPage';
import { ToursPage } from './features/agency/ToursPage';
import { SettingsPage } from './features/agency/SettingsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminDepositsPage } from './features/admin/AdminDepositsPage';
import { AdminVerificationPage } from './features/admin/AdminVerificationPage';
import { AdminSettingsPage } from './features/admin/AdminSettingsPage';
import { SuperAdminVerificationList } from './features/admin/SuperAdminVerificationList';
import { SuperAdminVerificationDetail } from './features/admin/SuperAdminVerificationDetail';
import { ManageAgencyTours } from './features/admin/ManageAgencyTours';
import { AdminAgencyDetailsPage } from './features/admin/AdminAgencyDetailsPage';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
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
                <Route path="tours" element={<ToursPage />} />
                <Route path="bookings" element={<BookingPage />} />
                <Route path="verification" element={<AgencyVerificationPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="security" element={<PlaceholderPage title="Security" />} />
                <Route path="support" element={<PlaceholderPage title="Support" />} />
              </Route>


              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="deposits" element={<AdminDepositsPage />} />
                <Route path="verification" element={<AdminVerificationPage />} />
                <Route path="agencies/:id" element={<AdminAgencyDetailsPage />} />
                <Route path="agencies/:id/tours" element={<ManageAgencyTours />} />
                <Route path="finance" element={<PlaceholderPage title="Finance" />} />
                <Route path="users" element={<PlaceholderPage title="Users" />} />
                <Route path="audit" element={<PlaceholderPage title="Audit Logs" />} />
              </Route>

              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
                {/* Reuse Admin components for now or create specific ones */}
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="agency-verifications" element={<SuperAdminVerificationList />} />
                <Route path="agency-verifications/:agencyId" element={<SuperAdminVerificationDetail />} />
                <Route path="deposits" element={<AdminDepositsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="audit" element={<PlaceholderPage title="Global Audit" />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App
