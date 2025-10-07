import React, { useEffect, useState } from 'react';
import { useAuth, apiClient } from '../../contexts/SecurityContext';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 8;

const PaymentHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/transactions');
        setTransactions(response.data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.response?.data?.error || 'Failed to fetch transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentTransactions = transactions.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  if (!user) {
    return (
      <div className="payment-history-container">
        <div className="payment-history-content">
          <div className="alert alert-error">
            Please log in to view payment history. <Link to="/login">Login here</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="payment-history-container">
        <div className="payment-history-content">
          <div className="loading">
            Loading your transactions...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-history-container">
        <div className="payment-history-content">
          <div className="alert alert-error">
            {error}
          </div>
          <Link to="/dashboard" className="back-link" style={{ display: 'inline-block', marginTop: '20px' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-history-container">
      <div className="payment-history-content">
        <div className="history-header">
          <h2> Your Payment History</h2>
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>You haven't made any payments yet. Make your first payment to see it here.</p>
            <Link to="/payment" className="nav-link" style={{ display: 'inline-flex', width: 'auto', marginTop: '20px' }}>
               Make Your First Payment
            </Link>
          </div>
        ) : (
          <>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Provider</th>
                  <th>SWIFT Code</th>
                  <th>Beneficiary</th>
                </tr>
              </thead>
              <tbody>
                {currentTransactions.map(tx => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.date).toLocaleString()}</td>
                    <td>
                      <strong style={{ color: '#27ae60' }}>
                        {tx.amount.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ 
                        background: '#e8eeff', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontWeight: '600',
                        color: '#4d7cfe'
                      }}>
                        {tx.currency}
                      </span>
                    </td>
                    <td>{tx.provider}</td>
                    <td>
                      <code style={{ 
                        background: '#f8f9fa', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {tx.swiftCode}
                      </code>
                    </td>
                    <td>{tx.beneficiaryAccount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={handlePrevPage} disabled={currentPage === 1}>
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages}>
                  Next →
                </button>
              </div>
            )}
            
            <div style={{ 
              textAlign: 'center', 
              color: '#7f8c8d', 
              marginTop: '20px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <strong>Total Transactions:</strong> {transactions.length} • 
              <strong> Showing:</strong> {currentTransactions.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;