import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import MySchedule from './pages/MySchedule';
import ShiftRequests from './pages/ShiftRequests';
import Availability from './pages/Availability';
import Announcements from './pages/Announcements';
import CreateEmployee from './pages/CreateEmployee';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated — all share the same Layout with Sidebar + Navbar */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="my-schedule" element={<MySchedule />} />
            <Route path="shift-requests" element={<ShiftRequests />} />
            <Route path="availability" element={<Availability />} />
            <Route path="announcements" element={<Announcements />} />

            {/* Manager-only */}
            <Route
              path="schedule"
              element={
                <ProtectedRoute requiredRole="manager">
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-employee"
              element={
                <ProtectedRoute requiredRole="manager">
                  <CreateEmployee />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
