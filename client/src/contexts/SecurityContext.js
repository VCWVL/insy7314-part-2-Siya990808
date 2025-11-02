import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';

export const SecurityContext = createContext();
export const useAuth = () => useContext(SecurityContext);

// Axios clients
export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true,
});

export const employeeApiClient = axios.create({
  baseURL: 'http://localhost:5000/api/employeeauth',
  timeout: 10000,
  withCredentials: true,
});

// Validation patterns
export const VALIDATION_PATTERNS = {
  fullName: /^[a-zA-Z\s\-']{2,50}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
};

// Security utils
export const SecurityUtils = {
  sanitizeInput: input => typeof input === 'string' ? DOMPurify.sanitize(input.trim()) : input,
  validateInput: (input, pattern) => pattern.test(input)
};

// Custom alert system with countdown
const createCustomAlert = (message, type = 'warning', minutesLeft = null) => {
  // Remove any existing custom alerts
  const existingAlerts = document.querySelectorAll('.custom-inactivity-alert');
  existingAlerts.forEach(alert => alert.remove());

  const alertDiv = document.createElement('div');
  alertDiv.className = `custom-inactivity-alert custom-alert-${type}`;
  
  // Colors based on type
  const colors = {
    warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    final: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
    logout: { bg: '#d4edda', border: '#28a745', text: '#155724' }
  };

  const color = colors[type] || colors.warning;

  // Styling for the alert
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color.bg};
    border: 2px solid ${color.border};
    color: ${color.text};
    padding: 20px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 400px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `;

  // Add icon and countdown based on type
  let icon = '⚠️';
  let countdownText = '';
  
  if (type === 'final') {
    icon = '🚨';
    countdownText = minutesLeft ? `<div style="margin-top: 8px; font-size: 18px; color: #dc3545;">Logging out in ${minutesLeft} minutes</div>` : '';
  } else if (type === 'logout') {
    icon = '✅';
  }

  alertDiv.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 10px;">${icon}</div>
    <div>${message}</div>
    ${countdownText}
    <div style="margin-top: 10px; font-size: 14px; font-weight: normal; opacity: 0.8;">
      Click anywhere to reset timer
    </div>
  `;

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .custom-inactivity-alert {
      animation: slideIn 0.3s ease-out;
    }
    
    .custom-alert-final {
      animation: slideIn 0.3s ease-out, pulse 2s infinite;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(alertDiv);

  // Auto-remove after appropriate time
  const removeTime = type === 'logout' ? 3000 : 10000; // Shorter for logout, longer for warnings
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => alertDiv.remove(), 300);
    }
  }, removeTime);

  return alertDiv;
};

export const SecurityProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [employeeUser, setEmployeeUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timersRef = useRef({});
  const navigate = useNavigate();
  const alertShownRef = useRef({ 
    warning25: false, 
    warning5: false, 
    warning2: false, 
    warning1: false 
  });

  // Check authentication on mount
  useEffect(() => {
    checkEmployeeSession();
  }, []);

  const checkEmployeeSession = async () => {
    try {
      const res = await employeeApiClient.get('/session');
      if (res.data.authenticated) {
        setEmployeeUser(res.data.employee);
        startInactivityTimer();
      }
    } catch (error) {
      console.log('No employee session found');
    } finally {
      setLoading(false);
    }
  };

  // Employee Login
  const employeeLogin = async (username, password) => {
    try {
      const res = await employeeApiClient.post('/login', { username, password });
      
      if (res.data.employee) {
        setEmployeeUser(res.data.employee);
        startInactivityTimer();
        return { success: true, employee: res.data.employee };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  // Employee Logout
  const employeeLogout = async () => {
    try {
      await employeeApiClient.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setEmployeeUser(null);
      clearAllTimers();
      navigate('/employee/login');
    }
  };

  // Clear all timers
  const clearAllTimers = () => {
    Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    timersRef.current = {};
    alertShownRef.current = { 
      warning25: false, 
      warning5: false, 
      warning2: false, 
      warning1: false 
    };
    
    // Clear any existing alerts
    const existingAlerts = document.querySelectorAll('.custom-inactivity-alert');
    existingAlerts.forEach(alert => alert.remove());
  };

  // Start 30-minute inactivity monitoring
  const startInactivityTimer = () => {
    clearAllTimers();
    
    const totalMinutes = 30;
    
    // 25-minute warning (5 minutes left)
    timersRef.current.warning25 = setTimeout(() => {
      if (!alertShownRef.current.warning25) {
        createCustomAlert(
          `You have been inactive for 25 minutes. You will be logged out in 5 minutes.`,
          'warning'
        );
        alertShownRef.current.warning25 = true;
      }
    }, 25 * 60 * 1000);

    // 28-minute warning (2 minutes left)
    timersRef.current.warning28 = setTimeout(() => {
      if (!alertShownRef.current.warning2) {
        createCustomAlert(
          'Warning: You have been inactive for 28 minutes. You will be logged out in 2 minutes!',
          'warning'
        );
        alertShownRef.current.warning2 = true;
      }
    }, 28 * 60 * 1000);

    // 29-minute final warning (1 minute left)
    timersRef.current.warning29 = setTimeout(() => {
      if (!alertShownRef.current.warning1) {
        createCustomAlert(
          'FINAL WARNING: You have been inactive for 29 minutes. You will be logged out in 1 minute!',
          'final',
          1
        );
        alertShownRef.current.warning1 = true;
      }
    }, 29 * 60 * 1000);

    // 30-minute logout
    timersRef.current.logout = setTimeout(() => {
      createCustomAlert(
        'You have been logged out due to 30 minutes of inactivity.',
        'logout'
      );
      setTimeout(() => employeeLogout(), 2000);
    }, 30 * 60 * 1000);
  };

  // Reset timer on user activity
  const resetInactivityTimer = () => {
    if (employeeUser) {
      // Clear any existing alerts when user is active
      const existingAlerts = document.querySelectorAll('.custom-inactivity-alert');
      existingAlerts.forEach(alert => {
        alert.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => alert.remove(), 300);
      });
      
      startInactivityTimer();
    }
  };

  // Event listeners for activity
  useEffect(() => {
    if (employeeUser) {
      const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove', 'click'];
      
      const handleActivity = () => resetInactivityTimer();
      
      events.forEach(event => {
        document.addEventListener(event, handleActivity);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
        clearAllTimers();
      };
    }
  }, [employeeUser]);

  // Regular user functions
  const login = (userData) => setUser(userData);
  
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <SecurityContext.Provider value={{
      user,
      login,
      logout,
      employeeUser,
      employeeLogin, 
      employeeLogout,
      resetInactivityTimer
    }}>
      {children}
    </SecurityContext.Provider>
  );
};