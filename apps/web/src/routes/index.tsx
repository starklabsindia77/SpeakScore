import { Route, Routes } from 'react-router-dom';
import { AttemptPage } from '../pages/AttemptPage';
import { BatchDetail } from '../pages/BatchDetail';
import { BatchesPage } from '../pages/BatchesPage';
import { CandidatesPage } from '../pages/CandidatesPage';
import { Dashboard } from '../pages/Dashboard';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { ReviewQueue } from '../pages/ReviewQueue';
import { TestDetail } from '../pages/TestDetail';
import { TestsList } from '../pages/TestsList';
import { AdminLogsPage } from '../pages/admin/AdminLogsPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { AdminOrgDetailPage } from '../pages/admin/AdminOrgDetailPage';
import { AdminOrganizationsPage } from '../pages/admin/AdminOrganizationsPage';
import { AdminPlatformAdminsPage } from '../pages/admin/AdminPlatformAdminsPage';
import { AdminQuestionsPage } from '../pages/admin/AdminQuestionsPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';
import { BillingPage } from '../pages/admin/BillingPage'; // Added import for BillingPage
import { OrgRolesPage } from '../pages/org/OrgRolesPage';
import { OrgUsersPage } from '../pages/org/OrgUsersPage';
import { TemplatesPage } from '../pages/org/TemplatesPage';
import { AdminRoute, ProtectedRoute } from './Guards';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><TestsList /></ProtectedRoute>} />
            <Route path="/tests/:id" element={<ProtectedRoute><TestDetail /></ProtectedRoute>} />
            <Route path="/batches" element={<ProtectedRoute><BatchesPage /></ProtectedRoute>} />
            <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
            <Route path="/org/users" element={<ProtectedRoute><OrgUsersPage /></ProtectedRoute>} />
            <Route path="/org/roles" element={<ProtectedRoute><OrgRolesPage /></ProtectedRoute>} />
            <Route path="/org/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
            <Route path="/admin/orgs" element={<AdminRoute><AdminOrganizationsPage /></AdminRoute>} />
            <Route path="/admin/orgs/:id" element={<AdminRoute><AdminOrgDetailPage /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />
            <Route path="/admin/questions" element={<AdminRoute><AdminQuestionsPage /></AdminRoute>} />
            <Route path="/admin/admins" element={<AdminRoute><AdminPlatformAdminsPage /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
            <Route path="/settings/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
            <Route path="/attempt/:token" element={<AttemptPage />} />
        </Routes>
    );
}
