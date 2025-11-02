import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/SecurityContext';
import axios from 'axios';

const EmployeeDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, submitted: 0 });
  const [csrfToken, setCsrfToken] = useState('');
  
  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { employeeUser, employeeLogout, resetInactivityTimer } = useAuth();

  useEffect(() => {
    if (!employeeUser) {
      return;
    }
    
    console.log('🔄 Initializing employee dashboard for:', employeeUser.fullName);
    const init = async () => {
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      console.log('✅ Dashboard initialized');
    };
    
    init();
  }, [employeeUser]);

  // Apply filters and search
  useEffect(() => {
    let filtered = transactions;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === filterStatus);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.userId?.fullName?.toLowerCase().includes(searchLower) ||
        tx.userId?.username?.toLowerCase().includes(searchLower) ||
        tx.beneficiaryAccount?.toLowerCase().includes(searchLower) ||
        tx.swiftCode?.toLowerCase().includes(searchLower) ||
        tx.provider?.toLowerCase().includes(searchLower) ||
        tx.currency?.toLowerCase().includes(searchLower) ||
        tx.amount?.toString().includes(searchTerm) ||
        tx._id?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterStatus, searchTerm, transactions]);

  // Reset inactivity timer on any user activity
  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetInactivityTimer]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const fetchCsrfToken = async () => {
    try {
      console.log('🔐 Fetching CSRF token...');
      const response = await axios.get(
        'http://localhost:5000/api/employeeauth/csrf-token',
        { withCredentials: true }
      );
      const token = response.data.csrfToken;
      setCsrfToken(token);
      console.log('✅ CSRF token received');
      return token;
    } catch (err) {
      console.error('❌ CSRF token fetch error:', err);
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
      setError('');
    } catch (err) {
      console.error('❌ Fetch transactions error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
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
      console.error('❌ Fetch stats error:', err);
    }
  };

  const handleVerify = async (transactionId) => {
    try {
      resetInactivityTimer();
      
      let token = csrfToken;
      if (!token) {
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('✅ Verifying transaction:', transactionId);
      
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
      
      alert('Transaction verified successfully!');
      
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Verify error:', err);
      if (err.response?.status === 403) {
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
      resetInactivityTimer();
      
      let token = csrfToken;
      if (!token) {
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('🚀 Submitting transaction to SWIFT:', transactionId);

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
      
      alert('Transaction submitted to SWIFT successfully!');
      
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Submit error:', err);
      if (err.response?.status === 403) {
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
      resetInactivityTimer();
      
      let token = csrfToken;
      if (!token) {
        token = await fetchCsrfToken();
        if (!token) {
          alert('Failed to get security token. Please refresh the page.');
          return;
        }
      }

      console.log('🚀 Bulk submitting transactions:', selectedTransactions.length);

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
      
      alert(`${selectedTransactions.length} transactions submitted successfully!`);
      setSelectedTransactions([]);
      
      await fetchCsrfToken();
      await fetchTransactions();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Bulk submit error:', err);
      if (err.response?.status === 403) {
        await fetchCsrfToken();
        alert('Security token expired. Please try again.');
      } else {
        alert(err.response?.data?.error || 'Failed to submit transactions');
      }
    }
  };

  const handleSelectTransaction = (txId) => {
    resetInactivityTimer();
    setSelectedTransactions(prev => {
      if (prev.includes(txId)) {
        return prev.filter(id => id !== txId);
      } else {
        return [...prev, txId];
      }
    });
  };

  const handleSelectAll = () => {
    resetInactivityTimer();
    if (selectedTransactions.length === currentTransactions.length) {
      setSelectedTransactions([]);
    } else {
      const allIds = currentTransactions.map(tx => tx._id);
      setSelectedTransactions(allIds);
    }
  };

  // Pagination functions
  const goToPage = (pageNumber) => {
    resetInactivityTimer();
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e) => {
    resetInactivityTimer();
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (!employeeUser) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#e74c3c' }}>Please login to access the dashboard</div>
      </div>
    );
  }

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
            Welcome back, {employeeUser.fullName} ({employeeUser.department})
          </p>
        
        </div>
        <button 
          onClick={employeeLogout}
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

      {/* Search and Filter Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '15px',
        marginBottom: '20px',
        background: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search transactions by customer, beneficiary, SWIFT code, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '12px 20px',
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filters and Bulk Actions */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => { setFilterStatus('pending'); resetInactivityTimer(); }}
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
              onClick={() => { setFilterStatus('verified'); resetInactivityTimer(); }}
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
              onClick={() => { setFilterStatus('submitted'); resetInactivityTimer(); }}
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
              onClick={() => { setFilterStatus('all'); resetInactivityTimer(); }}
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
              All ({transactions.length})
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

      {/* Pagination Controls - Top */}
      {filteredTransactions.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px',
          background: 'white',
          padding: '15px',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </span>
            
            <select 
              value={itemsPerPage} 
              onChange={handleItemsPerPageChange}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                background: 'white'
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => goToPage(1)} 
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              First
            </button>
            <button 
              onClick={() => goToPage(currentPage - 1)} 
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === pageNumber ? '#2c3e50' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: currentPage === pageNumber ? 'bold' : 'normal'
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button 
              onClick={() => goToPage(currentPage + 1)} 
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
            <button 
              onClick={() => goToPage(totalPages)} 
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Last
            </button>
          </div>
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
          {searchTerm && <p>Try adjusting your search terms</p>}
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
                  {filterStatus === 'verified' && (
                    <th style={{ padding: '15px', textAlign: 'left', width: '50px' }}>
                      <input 
                        type="checkbox"
                        checked={selectedTransactions.length === currentTransactions.length && currentTransactions.length > 0}
                        onChange={handleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                  )}
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
                {currentTransactions.map((tx, index) => (
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
                        {tx.amount?.toFixed(2) || '0.00'}
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

      {/* Pagination Controls - Bottom */}
      {filteredTransactions.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '20px',
          background: 'white',
          padding: '15px',
          borderRadius: '10px'
        }}>
          <span style={{ color: '#7f8c8d' }}>
            Page {currentPage} of {totalPages} • {filteredTransactions.length} transactions found
          </span>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => goToPage(1)} 
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              First
            </button>
            <button 
              onClick={() => goToPage(currentPage - 1)} 
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            {/* Show limited page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === pageNumber ? '#2c3e50' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: currentPage === pageNumber ? 'bold' : 'normal'
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button 
              onClick={() => goToPage(currentPage + 1)} 
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
            <button 
              onClick={() => goToPage(totalPages)} 
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;