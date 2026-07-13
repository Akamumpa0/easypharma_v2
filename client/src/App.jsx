import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Layouts
import AdminLayout from './layouts/AdminLayout.jsx';
import PharmacistLayout from './layouts/PharmacistLayout.jsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Error pages
import NotFoundPage from './pages/errors/NotFoundPage.jsx';

// Admin pages
import UserManagementPage from './pages/admin/UserManagementPage.jsx';
import MedicinesPage from './pages/admin/MedicinesPage.jsx';
import ApiManagementPage from './pages/admin/ApiManagementPage.jsx';
import SuppliersPage from './pages/admin/SuppliersPage.jsx';
import ImportExportPage from './pages/admin/ImportExportPage.jsx';
import SystemHealthPage from './pages/admin/SystemHealthPage.jsx';

// Pharmacist pages
import CustomerServicePage from './pages/pharmacist/CustomerServicePage.jsx';
import UpdateStocksPage from './pages/pharmacist/UpdateStocksPage.jsx';
import ViewReportsPage from './pages/pharmacist/ViewReportsPage.jsx';
import FinancialDashboardPage from './pages/pharmacist/FinancialDashboardPage.jsx';
import ReorderPage from './pages/pharmacist/ReorderPage.jsx';
import ExpensesPage from './pages/pharmacist/ExpensesPage.jsx';
import BillingHistoryPage from './pages/pharmacist/BillingHistoryPage.jsx';
import PurchaseOrdersPage from './pages/pharmacist/PurchaseOrdersPage.jsx';
import ReturnsPage from './pages/pharmacist/ReturnsPage.jsx';
import StockMovementsPage from './pages/pharmacist/StockMovementsPage.jsx';
import ReconciliationPage from './pages/pharmacist/ReconciliationPage.jsx';

// Shared pages
import ActivityLogsPage from './pages/shared/ActivityLogsPage.jsx';
import ProfilePage from './pages/shared/ProfilePage.jsx';
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import AdvancedSearchPage from './pages/shared/AdvancedSearchPage.jsx';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen" role="status" aria-label="Loading">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen" role="status" aria-label="Loading">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
  return <Navigate to="/pharmacist/customer-service" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* ── Admin ─────────────────────────────────────────────── */}
            <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users"          element={<UserManagementPage />} />
              <Route path="medicines"      element={<MedicinesPage />} />
              <Route path="suppliers"      element={<SuppliersPage />} />
              <Route path="import-export"  element={<ImportExportPage />} />
              <Route path="api-management" element={<ApiManagementPage />} />
              <Route path="activity-logs"  element={<ActivityLogsPage />} />
              <Route path="system-health"  element={<SystemHealthPage />} />
              {/* Shared inside admin layout */}
              <Route path="profile"        element={<ProfilePage />} />
              <Route path="notifications"  element={<NotificationsPage />} />
              <Route path="search"         element={<AdvancedSearchPage />} />
            </Route>

            {/* ── Pharmacist ────────────────────────────────────────── */}
            <Route path="/pharmacist" element={<RequireAuth role="pharmacist"><PharmacistLayout /></RequireAuth>}>
              <Route index element={<Navigate to="customer-service" replace />} />
              <Route path="customer-service"    element={<CustomerServicePage />} />
              <Route path="billing-history"     element={<BillingHistoryPage />} />
              <Route path="update-stocks"       element={<UpdateStocksPage />} />
              <Route path="stock-movements"     element={<StockMovementsPage />} />
              <Route path="reconciliation"      element={<ReconciliationPage />} />
              <Route path="view-reports"        element={<ViewReportsPage />} />
              <Route path="financial-dashboard" element={<FinancialDashboardPage />} />
              <Route path="reorder"             element={<ReorderPage />} />
              <Route path="purchase-orders"     element={<PurchaseOrdersPage />} />
              <Route path="returns"             element={<ReturnsPage />} />
              <Route path="expenses"            element={<ExpensesPage />} />
              {/* Shared inside pharmacist layout */}
              <Route path="search"              element={<AdvancedSearchPage />} />
              <Route path="notifications"       element={<NotificationsPage />} />
              <Route path="profile"             element={<ProfilePage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
