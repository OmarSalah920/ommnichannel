import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { InboxPage } from './pages/InboxPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TeamPage } from './pages/TeamPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { BotConfigPage } from './pages/BotConfigPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import WebhookLogsPage from './pages/WebhookLogsPage';
import MessageStatusPage from './pages/MessageStatusPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="conversations" element={<ConversationsPage />} />

            <Route
              path="analytics"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="team"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="channels"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ChannelsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="bot"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BotConfigPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="integrations"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <IntegrationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="webhook-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <WebhookLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="message-status"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MessageStatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/inbox" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
