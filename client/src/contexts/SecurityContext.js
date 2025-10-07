import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';

export const SecurityContext = createContext();
export const useAuth = () => useContext(SecurityContext);

// Axios client
export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Validation patterns
export const VALIDATION_PATTERNS = {
  fullName: /^[a-zA-Z\s\-']{2,50}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
  paymentAmount: /^\d{1,10}(\.\d{1,2})?$/,
  currencyCode: /^[A-Z]{3}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
};

// Security utils
export const SecurityUtils = {
  sanitizeInput: input => typeof input === 'string' ? DOMPurify.sanitize(input.trim()) : input,
  validateInput: (input, pattern) => pattern.test(input)
};

export const SecurityProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  useEffect(() => {
    checkAuthentication();
    const cleanup = setupSessionTimeout();
    return cleanup;
  }, []);

  const checkAuthentication = async () => {
    try {
      const res = await apiClient.get('/auth/security-status');
      if (res.data) setUser({ authenticated: true, ...res.data });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setupSessionTimeout = () => {
    const timeout = setTimeout(() => {
      logout();
      alert('Session expired');
    }, 30 * 60 * 1000);

    setSessionTimeout(timeout);

    const resetTimeout = () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      setSessionTimeout(
        setTimeout(() => {
          logout();
          alert('Session expired');
        }, 30 * 60 * 1000)
      );
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, resetTimeout, true)
    );

    return () =>
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(ev =>
        document.removeEventListener(ev, resetTimeout, true)
      );
  };

  const login = userData => setUser(userData);

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {}
    finally {
      setUser(null);
      if (sessionTimeout) clearTimeout(sessionTimeout);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <SecurityContext.Provider value={{ user, login, logout }}>
      {children}
    </SecurityContext.Provider>
  );
};