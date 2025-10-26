// client/src/pages/Employee/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, submitted: 0 });
  const [csrfToken, setCsrfToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const employeeData = sessionStorage.getItem('employee');
    if (!employeeData) {
      navigate('/employee/login');
      return;
    }
    setEmployee(JSON.parse(employeeData));
    
    // Initialize everything
    const init = async () => {
      console.log('Initializing employee dashboard...');
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      console.log('Dashboard initialized');
    };
    
    init();
  }, [navigate]);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(tx => tx.status === filterStatus));
    }
  }, [filterStatus, transactions]);

  const fetchCsrfToken = async () => {
    try {
      console.log('Fetching CSRF token...');
      const response = await axios.get(
        'http://localhost:5000/api/employee/auth/csrf-token',
        { withCredentials: true }
      );
      const token = response.data.csrfToken;
      setCsrfToken(token);
      console.log('✅ CSRF token received:', token);
      return token;
    } catch (err) {
      console.error('❌ CSRF token fetch error:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to fetch security token. Please refresh the page.');
      return null;
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/employee/transactions',
        { withCredentials: true }
      );
      setTransactions(response.data);
    } catch (err) {
      console.error('Fetch transactions error:', err);
      if (err.response?.status === 401) {
        sessionStorage.removeItem('employee');
        navigate('/employee/login');
      } else {
        setError('Failed to load transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/employee/transactions/stats/summary',
        { withCredentials: true }
      );
      setStats(response.data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const handleVerify = async (transactionId) => {
    try {
      let token = csrfToken;
      if (!token) {
        console.log('⚠️ No CSRF token found, fetching...');
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('Verifying transaction with CSRF token');
      
      await axios.patch(
        `http://localhost:5000/api/employee/transactions/${transactionId}/verify`,
        {},
        { 
          withCredentials: true,
          headers: {
            'X-CSRF-Token': token
          }
        }
      );
      
      console.log('✅ Transaction verified successfully');
      alert('Transaction verified successfully!');
      
      // Refresh token and data
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Verify error:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);
      
      if (err.response?.status === 403) {
        console.log('CSRF token invalid or expired');
        await fetchCsrfToken();
        alert('Security token expired. Please try again.');
      } else {
        alert(err.response?.data?.error || 'Failed to verify transaction');
      }
    }
  };

  const handleSubmitToSwift = async (transactionId) => {
    if (!window.confirm('Submit this transaction to SWIFT? This action cannot be undone.')) {
      return;
    }

    try {
      let token = csrfToken;
      if (!token) {
        console.log('⚠️ No CSRF token found, fetching...');
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('Submitting transaction to SWIFT with CSRF token');

      await axios.patch(
        `http://localhost:5000/api/employee/transactions/${transactionId}/submit`,
        {},
        { 
          withCredentials: true,
          headers: {
            'X-CSRF-Token': token
          }
        }
      );
      
      console.log('✅ Transaction submitted to SWIFT');
      alert('Transaction submitted to SWIFT successfully!');
      
      // Refresh token and data
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Submit error:', err);
      console.error('Response:', err.response?.data);
      
      if (err.response?.status === 403) {
        console.log('CSRF token invalid or expired');
        await fetchCsrfToken();
        alert('Security token expired. Please try again.');
      } else {
        alert(err.response?.data?.error || 'Failed to submit to SWIFT');
      }
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to submit');
      return;
    }

    if (!window.confirm(`Submit ${selectedTransactions.length} transactions to SWIFT? This action cannot be undone.`)) {
      return;
    }

    try {
      let token = csrfToken;
      if (!token) {
        console.log('⚠️ No CSRF token found, fetching...');
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('Bulk submitting transactions with CSRF token');

      await axios.post(
        'http://localhost:5000/api/employee/transactions/submit-bulk',
        { transactionIds: selectedTransactions },
        { 
          withCredentials: true,
          headers: {
            'X-CSRF-Token': token
          }
        }
      );
      
      console.log('✅ Bulk submit successful');
      alert(`${selectedTransactions.length} transactions submitted successfully!`);
      setSelectedTransactions([]);
      
      // Refresh token and data
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Bulk submit error:', err);
      console.error('Response:', err.response?.data);
      
      if (err.response?.status === 403) {
        console.log('CSRF token invalid or expired');
        await fetchCsrfToken();
        alert('Security token expired. Please try again.');
      } else {
        alert(err.response?.data?.error || 'Failed to submit transactions');
      }
    }
  };

  const handleSelectTransaction = (txId) => {
    setSelectedTransactions(prev => {
      if (prev.includes(txId)) {
        return prev.filter(id => id !== txId);
      } else {
        return [...prev, txId];
      }
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        'http://localhost:5000/api/employee/auth/logout',
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('employee');
      navigate('/employee/login');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#3498db' }}>Loading transactions...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <header style={{ 
        background: 'white', 
        padding: '20px', 
        marginBottom: '20px', 
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Employee Portal</h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Welcome back, {employee?.fullName} ({employee?.department})
          </p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </header>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          padding: '20px', 
          background: '#fff3cd', 
          borderRadius: '10px',
          border: '2px solid #ffc107'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Pending</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#856404' }}>
            {stats.pending || 0}
          </p>
        </div>

        <div style={{ 
          padding: '20px', 
          background: '#d1ecf1', 
          borderRadius: '10px',
          border: '2px solid #17a2b8'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Verified</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#0c5460' }}>
            {stats.verified || 0}
          </p>
        </div>

        <div style={{ 
          padding: '20px', 
          background: '#d4edda', 
          borderRadius: '10px',
          border: '2px solid #28a745'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>Submitted</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#155724' }}>
            {stats.submitted || 0}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'white',
        padding: '15px',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilterStatus('pending')}
            style={{
              padding: '10px 20px',
              background: filterStatus === 'pending' ? '#ffc107' : '#f8f9fa',
              border: '2px solid #ffc107',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: filterStatus === 'pending' ? 'bold' : 'normal'
            }}
          >
            Pending ({stats.pending || 0})
          </button>

          <button 
            onClick={() => setFilterStatus('verified')}
            style={{
              padding: '10px 20px',
              background: filterStatus === 'verified' ? '#17a2b8' : '#f8f9fa',
              border: '2px solid #17a2b8',
              borderRadius: '5px',
              cursor: 'pointer',
              color: filterStatus === 'verified' ? '#fff' : '#000',
              fontWeight: filterStatus === 'verified' ? 'bold' : 'normal'
            }}
          >
            Verified ({stats.verified || 0})
          </button>

          <button 
            onClick={() => setFilterStatus('submitted')}
            style={{
              padding: '10px 20px',
              background: filterStatus === 'submitted' ? '#28a745' : '#f8f9fa',
              border: '2px solid #28a745',
              borderRadius: '5px',
              cursor: 'pointer',
              color: filterStatus === 'submitted' ? '#fff' : '#000',
              fontWeight: filterStatus === 'submitted' ? 'bold' : 'normal'
            }}
          >
            Submitted ({stats.submitted || 0})
          </button>

          <button 
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '10px 20px',
              background: filterStatus === 'all' ? '#6c757d' : '#f8f9fa',
              border: '2px solid #6c757d',
              borderRadius: '5px',
              cursor: 'pointer',
              color: filterStatus === 'all' ? '#fff' : '#000',
              fontWeight: filterStatus === 'all' ? 'bold' : 'normal'
            }}
          >
            All
          </button>
        </div>

        {selectedTransactions.length > 0 && filterStatus === 'verified' && (
          <button 
            onClick={handleBulkSubmit}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Submit {selectedTransactions.length} to SWIFT
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '15px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '5px',
          color: '#c33',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          background: 'white', 
          borderRadius: '10px' 
        }}>
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} transactions found</h3>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead>
                <tr style={{ background: '#3498db', color: 'white' }}>
                  {filterStatus === 'verified' && <th style={{ padding: '15px', textAlign: 'left' }}>Select</th>}
                  <th style={{ padding: '15px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Currency</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Provider</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>SWIFT Code</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Beneficiary</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, index) => (
                  <tr key={tx._id} style={{ 
                    borderBottom: '1px solid #eee',
                    background: index % 2 === 0 ? 'white' : '#f9f9f9'
                  }}>
                    {filterStatus === 'verified' && (
                      <td style={{ padding: '15px' }}>
                        <input 
                          type="checkbox"
                          checked={selectedTransactions.includes(tx._id)}
                          onChange={() => handleSelectTransaction(tx._id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '15px' }}>{new Date(tx.date).toLocaleString()}</td>
                    <td style={{ padding: '15px' }}>
                      <div>
                        <strong>{tx.userId?.fullName || 'N/A'}</strong><br />
                        <small style={{ color: '#7f8c8d' }}>
                          {tx.userId?.username || 'N/A'}
                        </small>
                      </div>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <strong style={{ color: '#27ae60', fontSize: '16px' }}>
                        {tx.amount.toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        background: '#e8eeff',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        color: '#4d7cfe'
                      }}>
                        {tx.currency}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>{tx.provider}</td>
                    <td style={{ padding: '15px' }}>
                      <code style={{
                        background: '#f8f9fa',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {tx.swiftCode}
                      </code>
                    </td>
                    <td style={{ padding: '15px' }}>{tx.beneficiaryAccount}</td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: 
                          tx.status === 'pending' ? '#fff3cd' :
                          tx.status === 'verified' ? '#d1ecf1' : '#d4edda',
                        color:
                          tx.status === 'pending' ? '#856404' :
                          tx.status === 'verified' ? '#0c5460' : '#155724'
                      }}>
                        {(tx.status || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {tx.status === 'pending' && (
                        <button
                          onClick={() => handleVerify(tx._id)}
                          style={{
                            padding: '8px 16px',
                            background: '#17a2b8',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Verify
                        </button>
                      )}
                      
                      {tx.status === 'verified' && (
                        <button
                          onClick={() => handleSubmitToSwift(tx._id)}
                          style={{
                            padding: '8px 16px',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Submit
                        </button>
                      )}

                      {tx.status === 'submitted' && (
                        <span style={{ color: '#28a745', fontSize: '14px', fontWeight: 'bold' }}>
                          ✓ Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        background: 'white', 
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          <strong>Showing:</strong> {filteredTransactions.length} transactions • 
          <strong> Total:</strong> {transactions.length}
        </p>
      </div>
    </div>
  );
};

export default EmployeeDashboard;