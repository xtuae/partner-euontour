import { Toaster } from 'react-hot-toast';
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

import { BookingHistoryPage } from './features/agency/BookingHistoryPage';
import { ToursPage } from './features/agency/ToursPage';
import { SettingsPage } from './features/agency/SettingsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { DashboardOverview } from './features/super/DashboardOverview';
import { AdminDepositsPage } from './features/admin/AdminDepositsPage';
import { AdminVerificationPage } from './features/admin/AdminVerificationPage';
import { AdminSettingsPage } from './features/admin/AdminSettingsPage';
import { AdminVerifiedAgenciesPage } from './features/admin/AdminVerifiedAgenciesPage';
import { SuperAdminVerificationList } from './features/admin/SuperAdminVerificationList';
import { SuperAdminVerificationDetail } from './features/admin/SuperAdminVerificationDetail';
import { SuperAdminToursPage } from './features/admin/SuperAdminToursPage';
import { AdminManagementPage } from './features/super/AdminManagementPage';
import { GlobalBookingsPage } from './features/super/GlobalBookingsPage';
import { RetailBookingForm } from './features/super/RetailBookingForm';
import { ManageAgencyTours } from './features/admin/ManageAgencyTours';
import { AdminAgencyDetailsPage } from './features/admin/AdminAgencyDetailsPage';
import { AuditLogsPage } from './features/super/AuditLogsPage';
import { AnalyticsDashboard } from './features/super/AnalyticsDashboard';
import { PaymentRedirect } from './features/public/PaymentRedirect';
import { ReportsPage } from './features/super/ReportsPage';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/pay/:id" element={<PaymentRedirect />} />
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
                  <Route path="bookings" element={<BookingHistoryPage />} />

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
                  <Route path="verified-agencies" element={<AdminVerifiedAgenciesPage />} />
                  <Route path="agencies/:id" element={<AdminAgencyDetailsPage />} />
                  <Route path="agencies/:id/tours" element={<ManageAgencyTours />} />
                  <Route path="finance" element={<PlaceholderPage title="Finance" />} />
                  <Route path="users" element={<PlaceholderPage title="Users" />} />
                  <Route path="audit" element={<PlaceholderPage title="Audit Logs" />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* Super Admin Routes */}
                <Route path="/super-admin" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
                  {/* Reuse Admin components for now or create specific ones */}
                  <Route path="dashboard" element={<DashboardOverview />} />
                  <Route path="agency-verifications" element={<SuperAdminVerificationList />} />
                  <Route path="agency-verifications/:agencyId" element={<SuperAdminVerificationDetail />} />
                  <Route path="deposits" element={<AdminDepositsPage />} />
                  <Route path="tours" element={<SuperAdminToursPage />} />
                  <Route path="bookings" element={<GlobalBookingsPage />} />
                  <Route path="retail-booking" element={<RetailBookingForm />} />
                  <Route path="staff" element={<AdminManagementPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                  <Route path="audit" element={<AuditLogsPage />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </HashRouter>
    </>
  );
}

export default App
