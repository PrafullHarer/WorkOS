import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import Upcoming from './pages/Upcoming';
import Settings from './pages/Settings';
import TaskDetail from './pages/TaskDetail';
import Home from './pages/Home';

const AppLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-transparent">
    <Sidebar />
    <div className="flex-1 p-6 pt-20 lg:p-10 lg:pt-20 flex flex-col">
      {children}
    </div>
  </div>
);

const App = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-none animate-spin" />
          <p className="text-black/60 dark:text-white/60 font-medium animate-pulse">Loading TaskMaste...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <AppLayout><CalendarView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/upcoming" element={
        <ProtectedRoute>
          <AppLayout><Upcoming /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/tasks/:id" element={
        <ProtectedRoute>
          <AppLayout><TaskDetail /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
