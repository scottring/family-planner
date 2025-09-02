import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import CalendarView from './components/calendar/CalendarView';
import TaskList from './components/tasks/TaskList';
import FamilyPage from './pages/FamilyPage';
import Settings from './pages/Settings';
import DailyItinerary from './components/itinerary/DailyItinerary';
import WeeklyPlanner from './components/itinerary/WeeklyPlanner';
import FamilyBrief from './components/itinerary/FamilyBrief';
import ChecklistTemplates from './components/checklists/ChecklistTemplates';
import ChecklistBuilder from './components/checklists/ChecklistBuilder';
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
            <Route path="calendar" element={<CalendarView />} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="family" element={<FamilyPage />} />
            <Route path="meals" element={<MealPlanner />} />
            <Route path="settings" element={<Settings />} />
            <Route path="daily" element={<DailyItinerary />} />
            <Route path="weekly" element={<WeeklyPlanner />} />
            <Route path="brief" element={<FamilyBrief />} />
            <Route path="checklists" element={<ChecklistTemplates />} />
            <Route path="checklists/new" element={<ChecklistBuilder />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
