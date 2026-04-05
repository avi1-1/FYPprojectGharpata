import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader, Home } from 'lucide-react';
import './EsewaCallback.css';

const KhaltiSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const pidx            = searchParams.get('pidx');
      const purchaseOrderId = searchParams.get('purchase_order_id');
      const txnStatus       = searchParams.get('status');

      // Debug: Log all URL parameters
      console.log('Khalti callback URL parameters:', {
        pidx,
        purchaseOrderId,
        txnStatus,
        allParams: Object.fromEntries(searchParams.entries())
      });

      // Guard: no pidx means nothing was sent back from Khalti
      if (!pidx) {
        setStatus('error');
        setMessage('No payment data received from Khalti. Please contact support.');
        return;
      }

      // If we don't have purchaseOrderId, try alternative parameter names
      let finalPurchaseOrderId = purchaseOrderId;
      if (!finalPurchaseOrderId) {
        finalPurchaseOrderId = searchParams.get('purchase_order_name') || 
                              searchParams.get('order_id') ||
                              searchParams.get('transaction_id');
        console.log('Using alternative purchase order ID:', finalPurchaseOrderId);
      }

      // If Khalti already tells us it's not Completed, bail early
      if (txnStatus && txnStatus !== 'Completed') {
        setStatus('error');
        setMessage(`Payment was not completed. Khalti status: ${txnStatus}`);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        console.log('Sending verification request:', { pidx, purchaseOrderId: finalPurchaseOrderId });
        
        const response = await axios.post(
          '/api/payments/khalti/verify',
          { pidx, purchaseOrderId: finalPurchaseOrderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStatus('success');
        setMessage(response.data.message || 'Payment verified! You are now an active tenant.');
        // Khalti returns transaction_id from lookup — store it for display
        if (response.data.transactionId) setTransactionId(response.data.transactionId);
      } catch (err) {
        console.error('Verification error:', err.response?.data || err.message);
        console.error('Full error object:', err);
        
        // Show detailed error information
        const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
        const errorDetails = err.response?.data?.error || 'No additional details';
        
        setStatus('error');
        setMessage(`${errorMessage}${errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleGoToDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    navigate(`/${user.role || 'tenant'}`);
  };

  return (
    <div
      className="esewa-callback-page"
      style={{ background: 'linear-gradient(135deg, #1e0a38 0%, #3a1660 50%, #1a0830 100%)' }}
    >
      <div className="esewa-callback-card" style={{ borderTop: '4px solid #7B3FBF' }}>

        {/* ── Khalti Brand Strip ─────────────────────────────── */}
        <div
          className="esewa-brand-strip"
          style={{ background: 'linear-gradient(135deg, #5C2D91 0%, #7B3FBF 100%)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontWeight: '900', color: 'white', fontSize: '1.65rem',
              letterSpacing: '-0.02em'
            }}>Khalti</span>
          </div>
          <span className="esewa-tag" style={{ color: '#d4b0ff' }}>Payment Gateway</span>
        </div>

        {/* ── Verifying ──────────────────────────────────────── */}
        {status === 'verifying' && (
          <div className="callback-body">
            <div className="callback-state">
              <div className="spinner-ring" style={{ color: '#7B3FBF' }}>
                <Loader size={48} className="spin-icon" />
              </div>
              <h2 style={{ color: '#5C2D91' }}>Verifying Payment…</h2>
              <p>Please wait while we confirm your payment with Khalti.</p>
            </div>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="callback-body">
            <div className="callback-state success-state">
              <div className="icon-circle success-circle">
                <CheckCircle size={52} />
              </div>
              <h2>Payment Successful! 🎉</h2>
              <p>{message}</p>

              {transactionId && (
                <div className="txn-badge" style={{ borderColor: '#d4b0ff', background: '#f5f0ff' }}>
                  <span className="txn-label" style={{ color: '#7B3FBF' }}>Transaction ID:</span>
                  <span className="txn-code" style={{ color: '#5C2D91', borderColor: '#d4b0ff' }}>
                    {transactionId}
                  </span>
                </div>
              )}

              <div
                className="congrats-message"
                style={{
                  background: 'linear-gradient(135deg, #f5f0ff, #ede9fe)',
                  borderColor: '#c4b5fd'
                }}
              >
                <h3 style={{ color: '#5C2D91' }}>Welcome to your new home! 🏠</h3>
                <p style={{ color: '#4c1d95' }}>
                  Your tenancy is now <strong>active</strong>. You can manage everything from your dashboard.
                </p>
              </div>

              <button
                className="btn-go-dashboard"
                style={{
                  background: 'linear-gradient(135deg, #5C2D91 0%, #7B3FBF 100%)',
                  boxShadow: '0 4px 14px rgba(92,45,145,0.4)'
                }}
                onClick={handleGoToDashboard}
              >
                <Home size={18} />
                Go to My Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="callback-body">
            <div className="callback-state error-state">
              <div className="icon-circle error-circle">
                <XCircle size={52} />
              </div>
              <h2>Verification Failed</h2>
              <p style={{ color: '#dc2626' }}>{message}</p>

              {/* Test credentials hint */}
              <div className="test-credentials">
                <p className="cred-title">🧪 Khalti Test Credentials (Sandbox):</p>
                <div className="cred-grid">
                  <span><strong>Khalti ID:</strong> 9800000001 or 9800000005</span>
                  <span><strong>MPIN:</strong> 1111</span>
                  <span><strong>OTP:</strong> 987654</span>
                  <span><strong>Balance:</strong> Test wallet</span>
                </div>
              </div>

              <div className="error-actions">
                <button
                  className="btn-go-dashboard"
                  style={{
                    background: 'linear-gradient(135deg, #5C2D91 0%, #7B3FBF 100%)',
                    boxShadow: '0 4px 14px rgba(92,45,145,0.4)'
                  }}
                  onClick={handleGoToDashboard}
                >
                  <Home size={18} />
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KhaltiSuccess;
