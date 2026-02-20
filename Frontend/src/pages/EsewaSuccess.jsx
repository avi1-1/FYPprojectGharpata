import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader, Home } from 'lucide-react';
import './EsewaCallback.css';

const EsewaSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [transactionCode, setTransactionCode] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      // eSewa returns the response as base64 encoded data in the 'data' query param
      const encodedData = searchParams.get('data');

      if (!encodedData) {
        setStatus('error');
        setMessage('No payment data received from eSewa. Please contact support.');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        // If not logged in, redirect to login
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(
          '/api/payments/esewa/verify',
          { encodedData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStatus('success');
        setMessage(response.data.message);
        setTransactionCode(response.data.transactionCode || '');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Payment verification failed. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleGoToDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    navigate(`/${user.role || 'tenant'}`);
  };

  return (
    <div className="esewa-callback-page">
      <div className="esewa-callback-card">
        {/* eSewa Logo Strip */}
        <div className="esewa-brand-strip">
          <div className="esewa-logo-text">
            <span className="esewa-e">e</span>
            <span className="esewa-sewa">Sewa</span>
          </div>
          <span className="esewa-tag">Payment Gateway</span>
        </div>

        <div className="callback-body">
          {status === 'verifying' && (
            <div className="callback-state">
              <div className="spinner-ring">
                <Loader size={48} className="spin-icon" />
              </div>
              <h2>Verifying Payment...</h2>
              <p>Please wait while we confirm your payment with eSewa.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="callback-state success-state">
              <div className="icon-circle success-circle">
                <CheckCircle size={52} />
              </div>
              <h2>Payment Successful! 🎉</h2>
              <p>{message}</p>
              {transactionCode && (
                <div className="txn-badge">
                  <span className="txn-label">Transaction Code:</span>
                  <span className="txn-code">{transactionCode}</span>
                </div>
              )}
              <div className="congrats-message">
                <h3>Welcome to your new home! 🏠</h3>
                <p>Your tenancy is now <strong>active</strong>. You can manage everything from your dashboard.</p>
              </div>
              <button className="btn-go-dashboard" onClick={handleGoToDashboard}>
                <Home size={18} />
                Go to My Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="callback-state error-state">
              <div className="icon-circle error-circle">
                <XCircle size={52} />
              </div>
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <div className="error-actions">
                <button className="btn-go-dashboard" onClick={handleGoToDashboard}>
                  <Home size={18} />
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EsewaSuccess;
