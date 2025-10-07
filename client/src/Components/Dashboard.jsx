import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/SecurityContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back, {user?.username}! </h1>
        <button onClick={handleLogout} className="logout-btn">
           Logout
        </button>
      </header>
      
      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <h2>Quick Actions</h2>
          <ul>
            <li>
              <Link to="/payment" className="nav-link">
                 Make a Payment
              </Link>
            </li>
            <li>
              <Link to="/payment-history" className="nav-link">
                 View Payment History
              </Link>
            </li>
          </ul>
        </nav>

        <div className="welcome-message">
          <p>What would you like to do today?</p>
          <div style={{ marginTop: '20px', fontSize: '16px', color: '#7f8c8d' }}>
            <p>Secure • Fast • Reliable Banking</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;