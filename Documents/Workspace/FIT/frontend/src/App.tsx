import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import IssueListPage from './pages/IssueList/IssueListPage';
import IssueFormPage from './pages/IssueForm/IssueFormPage';
import IssueDetailPage from './pages/IssueDetail/IssueDetailPage';
import PrivateRoute from './components/Layout/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';
import UsersPage from './pages/Admin/UsersPage';

const App: React.FC = () => {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Navigate to="/dashboard" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout breadcrumbs={[{ label: 'Dashboard' }]}>
              <DashboardPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/issues"
        element={
          <PrivateRoute>
            <MainLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Issues' }]}>
              <IssueListPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/issues/new"
        element={
          <PrivateRoute>
            <MainLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Issues', href: '/issues' }, { label: 'New Issue' }]}>
              <IssueFormPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/issues/:id"
        element={
          <PrivateRoute>
            <MainLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Issues', href: '/issues' }, { label: 'Issue Detail' }]}>
              <IssueDetailPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/issues/:id/edit"
        element={
          <PrivateRoute>
            <MainLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Issues', href: '/issues' }, { label: 'Edit Issue' }]}>
              <IssueFormPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute requiredRoles={['Admin', '5']}>
            <MainLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'User Management' }]}>
              <UsersPage />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
