import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Home, RefreshCw } from 'lucide-react';
import './EsewaCallback.css';

const EsewaFailure = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    navigate(`/${user.role || 'tenant'}`);
  };

  const handleRetry = () => {
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
          <div className="callback-state error-state">
            <div className="icon-circle error-circle">
              <XCircle size={52} />
            </div>
            <h2>Payment Cancelled or Failed</h2>
            <p>
              Your payment was not completed. This could be because:
            </p>
            <ul className="failure-reasons">
              <li>You cancelled the payment on the eSewa page</li>
              <li>Insufficient balance in your eSewa wallet</li>
              <li>Session timed out</li>
            </ul>

            <div className="test-credentials">
              <p className="cred-title">🧪 eSewa Test Credentials (for retry):</p>
              <div className="cred-grid">
                <span><strong>eSewa ID:</strong> 9806800001</span>
                <span><strong>Password:</strong> Nepal@123</span>
                <span><strong>MPIN:</strong> 1122</span>
                <span><strong>OTP:</strong> 123456</span>
              </div>
            </div>

            <div className="error-actions">
              <button className="btn-retry" onClick={handleRetry}>
                <RefreshCw size={16} />
                Try Again
              </button>
              <button className="btn-go-dashboard secondary" onClick={handleGoToDashboard}>
                <Home size={16} />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EsewaFailure;
