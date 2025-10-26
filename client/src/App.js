import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'; 


// Pages & Components
import Dashboard from './Components/Dashboard';
import PaymentForm from './pages/Payments/PaymentForm';
import PaymentHistory from './pages/Payments/PaymentHistory';
import LoginForm from './pages/Auth/LoginForm';
import RegistrationForm from './pages/Auth/RegistrationForm';
import EmployeeLogin from './pages/Employee/EmployeeLogin';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';

// Security Context
import { SecurityProvider, useAuth } from './contexts/SecurityContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
    }
  }, []);

  return (
    <div className="App">
      <Router>
        <SecurityProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-history"
              element={
                <ProtectedRoute>
                  <PaymentHistory />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          </Routes>
        </SecurityProvider>
      </Router>
    </div>
  );
};

export default App;