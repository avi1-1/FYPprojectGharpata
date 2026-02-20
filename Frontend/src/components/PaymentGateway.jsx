// Payment gateway component for eSewa and Khalti integration
import React, { useState } from 'react';
import { CheckCircle, Info, Shield, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';

const PaymentGateway = ({ booking, onSuccess }) => {
  const token = localStorage.getItem("token");
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMode, setPaymentMode] = useState('deposit_only');
  const [gateway, setGateway] = useState(null); // Payment gateway selection

  // Payment configuration
  const monthlyRent = booking.monthlyRent || 0;
  const depositAmount = 5000; // Fixed deposit amount
  const maxMonths = (booking.durationYears || 1) * 12;

  // Calculate payment breakdown based on selected options
  const getPaymentBreakdown = () => {
    // Handle custom amount payments
    if (booking.customAmount) {
      return { deposit: 0, firstMonthBalance: 0, additionalMonths: 0, additionalMonthsTotal: 0, totalPayment: booking.customAmount };
    }
    // Handle deposit-only payments
    if (paymentMode === 'deposit_only') {
      return { deposit: depositAmount, firstMonthBalance: 0, additionalMonths: 0, additionalMonthsTotal: 0, totalPayment: depositAmount };
    }
    // Calculate advance rent payments
    const firstMonthBalance = monthlyRent - depositAmount;
    const additionalMonths = selectedMonths - 1;
    const additionalMonthsTotal = additionalMonths * monthlyRent;
    const totalPayment = monthlyRent * selectedMonths;
    return { deposit: depositAmount, firstMonthBalance, additionalMonths, additionalMonthsTotal, totalPayment };
  };

  const breakdown = getPaymentBreakdown();

  // Create and submit form for eSewa payment
  const submitEsewaForm = (gatewayUrl, formData) => {
    const form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", gatewayUrl);
    form.style.display = "none";
    // Add all form fields as hidden inputs
    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", key);
      input.setAttribute("value", value);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  // Handle eSewa payment initiation
  const handleEsewaPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Call backend to initiate eSewa payment
      const response = await axios.post(
        "/api/payments/esewa/initiate",
        { bookingId: booking.id, totalAmount: breakdown.totalPayment, monthsPaid: selectedMonths },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { gatewayUrl, formData } = response.data;
      // Submit form to eSewa gateway after short delay
      setTimeout(() => submitEsewaForm(gatewayUrl, formData), 300);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate eSewa payment.");
      setLoading(false);
    }
  };

  // Handle Khalti payment initiation
  const handleKhaltiPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Initiating Khalti payment for booking:', booking.id);
      
      // Call backend to initiate Khalti payment
      const response = await axios.post(
        "/api/payments/khalti/initiate",
        { 
          bookingId: booking.id, 
          totalAmount: breakdown.totalPayment 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { payment_url, pidx } = response.data;
      
      if (!payment_url) {
        throw new Error('No payment URL received from Khalti');
      }
      
      console.log('Khalti payment initiated. Redirecting to:', payment_url);
      
      // Redirect to Khalti payment page
      window.location.href = payment_url;
      
    } catch (err) {
      console.error('Khalti payment initiation error:', err);
      const errorData = err.response?.data;
      const errorMsg = errorData?.message || errorData?.error || err.message;
      setError(`Failed to initiate Khalti payment: ${errorMsg}`);
      setLoading(false);
    }
  };

  // Show gateway selection screen if no gateway chosen
  if (!gateway) {
    return (
      <div style={{ padding: '30px 20px', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <CheckCircle size={52} style={{ color: '#10b981', marginBottom: '12px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '1.65rem', fontWeight: '700', color: '#1a202c' }}>
            {booking.customAmount ? "Secure Rent Checkout" : "Contract Signed Successfully!"}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
            Choose your preferred payment gateway to continue
          </p>
        </div>

        <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: '700', color: '#1a202c' }}>
          Select Payment Gateway
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* eSewa Card */}
          <div
            onClick={() => setGateway('esewa')}
            style={{
              border: '2px solid #e2e8f0', borderRadius: '16px', padding: '24px',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => { e.currentTarget.style.border = '2px solid #60bb46'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(96,187,70,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.border = '2px solid #e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: '#60bb46', borderRadius: '10px', padding: '8px 16px',
              marginBottom: '14px'
            }}>
              <span style={{ background: 'white', borderRadius: '5px', padding: '2px 7px', fontWeight: '900', color: '#60bb46', fontSize: '1.1rem' }}>e</span>
              <span style={{ fontWeight: '700', color: 'white', fontSize: '1.1rem' }}>Sewa</span>
            </div>
            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Pay with eSewa</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Trusted digital wallet widely used across Nepal</div>
          </div>

          {/* Khalti Card */}
          <div
            onClick={() => setGateway('khalti')}
            style={{
              border: '2px solid #e2e8f0', borderRadius: '16px', padding: '24px',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => { e.currentTarget.style.border = '2px solid #5C2D91'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(92,45,145,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.border = '2px solid #e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #5C2D91 0%, #7B3FBF 100%)',
              borderRadius: '10px', padding: '8px 16px', marginBottom: '14px'
            }}>
              <span style={{ fontWeight: '800', color: 'white', fontSize: '1.15rem', letterSpacing: '-0.01em' }}>Khalti</span>
            </div>
            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Pay with Khalti</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Secure digital wallet payment via Khalti sandbox environment.</div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '12px', background: '#f0fdf4', borderRadius: '8px',
          fontSize: '0.82rem', color: '#15803d', border: '1px solid #bbf7d0'
        }}>
          <Shield size={15} />
          <span>🔒 All payments are secured and processed in a sandbox test environment</span>
        </div>
      </div>
    );
  }

  // ─── Main payment form (after gateway selected)
  const isKhalti = gateway === 'khalti';

  return (
    <div style={{ padding: '30px 20px', maxWidth: '680px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => { setGateway(null); setError(null); }}
        style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '6px 14px', fontSize: '0.85rem', color: '#64748b', cursor: 'pointer',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        ← Change Gateway
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: isKhalti ? '6px' : '4px',
          background: isKhalti ? 'linear-gradient(135deg, #5C2D91, #7B3FBF)' : '#60bb46',
          borderRadius: '12px', padding: '8px 20px', marginBottom: '16px'
        }}>
          {isKhalti ? (
            <span style={{ fontWeight: '800', color: 'white', fontSize: '1.2rem' }}>Khalti</span>
          ) : (
            <>
              <span style={{ background: 'white', borderRadius: '5px', padding: '2px 7px', fontWeight: '900', color: '#60bb46', fontSize: '1.1rem' }}>e</span>
              <span style={{ fontWeight: '700', color: 'white', fontSize: '1.1rem' }}>Sewa</span>
            </>
          )}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.55rem', fontWeight: '700', color: '#1a202c' }}>
          {booking.customAmount ? "Secure Rent Checkout" : "Complete Your Payment"}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          {booking.customAmount
            ? `Pay your outstanding balance via ${isKhalti ? 'Khalti' : 'eSewa'}`
            : `Activate tenancy by completing the deposit via ${isKhalti ? 'Khalti' : 'eSewa'}`}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '20px', color: '#dc2626'
        }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      {/* Payment Mode (hidden for custom amounts) */}
      {!booking.customAmount && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: '600', color: '#1a202c' }}>
            Select Payment Option
          </h4>
          <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
            <div
              onClick={() => setPaymentMode('deposit_only')}
              style={{
                border: paymentMode === 'deposit_only' ? '2px solid #10b981' : '2px solid #e2e8f0',
                borderRadius: '12px', padding: '16px', cursor: 'pointer',
                background: paymentMode === 'deposit_only' ? '#f0fdf4' : 'white',
                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
              }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                border: paymentMode === 'deposit_only' ? '6px solid #10b981' : '2px solid #cbd5e1',
                background: 'white', flexShrink: 0
              }}></div>
              <div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>Security Deposit Only</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  Pay Rs. {depositAmount.toLocaleString()} to secure the property. Remaining rent can be paid later.
                </div>
              </div>
            </div>

            <div
              onClick={() => setPaymentMode('full_rent')}
              style={{
                border: paymentMode === 'full_rent' ? '2px solid #10b981' : '2px solid #e2e8f0',
                borderRadius: '12px', padding: '16px', cursor: 'pointer',
                background: paymentMode === 'full_rent' ? '#f0fdf4' : 'white',
                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
              }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                border: paymentMode === 'full_rent' ? '6px solid #10b981' : '2px solid #cbd5e1',
                background: 'white', flexShrink: 0
              }}></div>
              <div style={{ width: '100%' }}>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>Pay Rent Upfront</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  Pay for one or more months in advance.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      <div style={{
        background: isKhalti
          ? 'linear-gradient(135deg, #3a1660 0%, #5C2D91 100%)'
          : 'linear-gradient(135deg, #1a4c2e 0%, #2d7a4f 100%)',
        borderRadius: '16px', padding: '24px', marginBottom: '22px',
        color: 'white', boxShadow: isKhalti
          ? '0 10px 30px rgba(92,45,145,0.35)'
          : '0 10px 30px rgba(26,76,46,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', opacity: 0.95 }}>Payment Breakdown</h3>
          <div style={{
            background: 'rgba(255,255,255,0.18)', borderRadius: '8px',
            padding: '4px 12px', fontSize: '0.8rem', fontWeight: '700',
            letterSpacing: '0.05em', color: isKhalti ? '#d4b0ff' : '#60bb46'
          }}>
            {isKhalti ? 'KHALTI TEST' : 'eSEWA TEST'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.85 }}>Property:</span>
            <strong style={{ fontSize: '1rem' }}>{booking.title}</strong>
          </div>

          {booking.customAmount ? (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: '12px', marginTop: '4px', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.85 }}>Outstanding Balance:</span>
                <strong>Rs. {booking.customAmount.toLocaleString()}</strong>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.85 }}>Landlord:</span>
                <strong>{booking.landlordName || 'Property Owner'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.85 }}>Monthly Rent:</span>
                <strong>Rs. {monthlyRent.toLocaleString()}</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: '12px', marginTop: '4px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.85 }}>Security Deposit:</span>
                  <strong>Rs. {breakdown.deposit.toLocaleString()}</strong>
                </div>
                {paymentMode === 'full_rent' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.85 }}>1st Month Balance:</span>
                    <strong>Rs. {breakdown.firstMonthBalance.toLocaleString()}</strong>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7, fontSize: '0.9rem' }}>
                    <span>Rent Balance:</span>
                    <span>(To be paid later)</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{
            borderTop: '2px solid rgba(255,255,255,0.4)', paddingTop: '12px', marginTop: '4px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Total to Pay:</span>
            <strong style={{ fontSize: '1.5rem' }}>Rs. {breakdown.totalPayment.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Month selector */}
      {paymentMode === 'full_rent' && !booking.customAmount && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: '600', color: '#1a202c' }}>
            How many months to pay upfront?
          </h4>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'white', padding: '18px 20px', borderRadius: '12px',
            border: '2px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <button
              onClick={() => setSelectedMonths(Math.max(1, selectedMonths - 1))}
              disabled={selectedMonths <= 1}
              style={{
                width: '42px', height: '42px', borderRadius: '10px',
                border: `2px solid ${isKhalti ? '#5C2D91' : '#60bb46'}`,
                background: selectedMonths <= 1 ? '#e2e8f0' : (isKhalti ? '#5C2D91' : '#60bb46'),
                color: 'white', fontSize: '1.4rem', cursor: selectedMonths <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '700', color: isKhalti ? '#5C2D91' : '#1a4c2e', marginBottom: '2px' }}>
                {selectedMonths}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Month{selectedMonths > 1 ? 's' : ''}</div>
            </div>
            <button
              onClick={() => setSelectedMonths(Math.min(maxMonths, selectedMonths + 1))}
              disabled={selectedMonths >= maxMonths}
              style={{
                width: '42px', height: '42px', borderRadius: '10px',
                border: `2px solid ${isKhalti ? '#5C2D91' : '#60bb46'}`,
                background: selectedMonths >= maxMonths ? '#e2e8f0' : (isKhalti ? '#5C2D91' : '#60bb46'),
                color: 'white', fontSize: '1.4rem', cursor: selectedMonths >= maxMonths ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >+</button>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
            <Info size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Deposit (Rs. {depositAmount.toLocaleString()}) is deducted from 1st month's rent.
          </p>
        </div>
      )}

      {/* Pay Button */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: '600', color: '#1a202c' }}>
          Pay with {isKhalti ? 'Khalti' : 'eSewa'}
        </h4>
        <button
          onClick={isKhalti ? handleKhaltiPayment : handleEsewaPayment}
          disabled={loading}
          style={{
            width: '100%', padding: '0', border: 'none', borderRadius: '14px',
            cursor: loading ? 'not-allowed' : 'pointer', overflow: 'hidden',
            boxShadow: loading ? 'none' : isKhalti ? '0 8px 24px rgba(92,45,145,0.4)' : '0 8px 24px rgba(96,187,70,0.35)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            background: loading
              ? (isKhalti ? '#9B72CC' : '#a7d7a0')
              : (isKhalti
                ? 'linear-gradient(135deg, #5C2D91 0%, #7B3FBF 100%)'
                : 'linear-gradient(135deg, #60bb46 0%, #3a9e2c 100%)'),
            padding: '18px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                  Redirecting to {isKhalti ? 'Khalti' : 'eSewa'}...
                </span>
              </div>
            ) : (
              <>
                {isKhalti ? (
                  <span style={{ fontWeight: '800', color: 'white', fontSize: '1.2rem' }}>Khalti</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'white', borderRadius: '8px', padding: '4px 10px',
                      fontSize: '1.1rem', fontWeight: '900', color: '#60bb46'
                    }}>e</div>
                    <span style={{ fontSize: '1.3rem', fontWeight: '700', color: 'white' }}>Sewa</span>
                  </div>
                )}
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>
                  Pay Rs. {breakdown.totalPayment.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </button>
        {isKhalti && (
          <p style={{ marginTop: '14px', fontSize: '0.85rem', color: '#7B3FBF', textAlign: 'center' }}>
            Note: Khalti is currently using a mock integration. You will be redirected to a local test success page.
          </p>
        )}

        {/* Test Credentials */}
        <div style={{
          marginTop: '12px', background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: '10px', padding: '12px 16px',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: '700', color: '#92400e' }}>
            🧪 {isKhalti ? 'Khalti' : 'eSewa'} Test Credentials (Sandbox):
          </p>
          {isKhalti ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.82rem', color: '#78350f' }}>
              <span><strong>Khalti ID:</strong> 9800000001 or 9800000005</span>
              <span><strong>MPIN:</strong> 1111</span>
              <span><strong>OTP:</strong> 987654</span>
              <span><strong>Balance:</strong> Test wallet</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.82rem', color: '#78350f' }}>
              <span><strong>eSewa ID:</strong> 9806800001</span>
              <span><strong>Password:</strong> Nepal@123</span>
              <span><strong>MPIN:</strong> 1122</span>
              <span><strong>OTP Token:</strong> 123456</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '12px', background: isKhalti ? '#f5f0ff' : '#f0fdf4', borderRadius: '8px',
        fontSize: '0.82rem', color: isKhalti ? '#5C2D91' : '#15803d',
        border: `1px solid ${isKhalti ? '#d4b0ff' : '#bbf7d0'}`
      }}>
        <Shield size={15} />
        <span>🔒 Payment secured by {isKhalti ? 'Khalti' : 'eSewa'} sandbox — encrypted test environment</span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PaymentGateway;
