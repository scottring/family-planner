import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import DailyPage from './pages/DailyPage';
import WeeklyPage from './pages/WeeklyPage';
import BriefPage from './pages/BriefPage';
import ChecklistsPage from './pages/ChecklistsPage';
import CalendarView from './components/calendar/CalendarView';
import TasksPage from './pages/TasksPage';
import FamilyPage from './pages/FamilyPage';
import Settings from './pages/Settings';
import MealPlanner from './components/meals/MealPlanner';
import { useAuthStore } from './stores/authStore';
import './App.css';

function App() {
  const { user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={!user ? <LoginForm /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/register" 
            element={!user ? <RegisterForm /> : <Navigate to="/" replace />} 
          />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="daily" element={<DailyPage />} />
            <Route path="weekly" element={<WeeklyPage />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="meals" element={<MealPlanner />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="brief" element={<BriefPage />} />
            <Route path="family" element={<FamilyPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
