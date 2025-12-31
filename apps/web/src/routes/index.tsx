import { Route, Routes } from 'react-router-dom';
import { AttemptPage } from '../pages/AttemptPage';
import { BatchDetail } from '../pages/BatchDetail';
import { BatchesPage } from '../pages/BatchesPage';
import { CandidatesPage } from '../pages/CandidatesPage';
import { Dashboard } from '../pages/Dashboard';
import { LoginPage } from '../pages/LoginPage';
import { ReviewQueue } from '../pages/ReviewQueue';
import { TestDetail } from '../pages/TestDetail';
import { TestsList } from '../pages/TestsList';
import { AdminLogsPage } from '../pages/admin/AdminLogsPage';
import { AdminOrgDetailPage } from '../pages/admin/AdminOrgDetailPage';
import { AdminOrganizationsPage } from '../pages/admin/AdminOrganizationsPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';
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
            <Route path="/admin/orgs" element={<AdminRoute><AdminOrganizationsPage /></AdminRoute>} />
            <Route path="/admin/orgs/:id" element={<AdminRoute><AdminOrgDetailPage /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
            <Route path="/attempt/:token" element={<AttemptPage />} />
        </Routes>
    );
}
