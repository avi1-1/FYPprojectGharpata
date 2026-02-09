import React, { useState } from 'react';
import { CheckCircle, Info } from 'lucide-react';
import axios from 'axios';

const PaymentGateway = ({ booking, onSuccess }) => {
    const token = localStorage.getItem("token");
    const [selectedMonths, setSelectedMonths] = useState(1); // Number of months to pay (minimum 1)

    const monthlyRent = booking.monthlyRent || 0;
    const depositAmount = 5000;
    const maxMonths = (booking.durationYears || 1) * 12;

    const getPaymentBreakdown = () => {
        // Deposit (5,000) is deducted from first month's rent (30,000)
        // So: First month = deposit (5,000) + balance (25,000) = 30,000
        // Subsequent months = full monthly rent (30,000 each)
        const firstMonthBalance = monthlyRent - depositAmount;
        const additionalMonths = selectedMonths - 1;
        const additionalMonthsTotal = additionalMonths * monthlyRent;
        const totalPayment = monthlyRent * selectedMonths;

        return {
            deposit: depositAmount,
            firstMonthBalance,
            additionalMonths,
            additionalMonthsTotal,
            totalPayment
        };
    };

    const handlePayment = async (method) => {
        const breakdown = getPaymentBreakdown();
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post(`/api/payments/deposit`, {
                bookingId: booking.id,
                amount: breakdown.totalPayment,
                paymentMethod: method,
                monthsPaid: selectedMonths,
                depositAmount: depositAmount
            }, { headers });

            onSuccess();
        } catch (error) {
            alert("Error paying deposit: " + (error.response?.data?.message || "Unknown error"));
        }
    };

    const breakdown = getPaymentBreakdown();

    return (
        <div style={{ padding: '30px 20px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Success Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <CheckCircle size={56} style={{ color: '#10b981', marginBottom: '15px' }} />
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                    Contract Signed Successfully!
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                    Complete your payment to activate the tenancy
                </p>
            </div>

            {/* Payment Summary Card */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                color: 'white',
                boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
            }}>
                <h3 style={{ margin: '0 0 18px 0', fontSize: '1.2rem', fontWeight: '600', opacity: 0.95 }}>
                    Payment Breakdown
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ opacity: 0.9 }}>Landlord:</span>
                        <strong style={{ fontSize: '1.05rem' }}>{booking.landlordName || 'Property Owner'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ opacity: 0.9 }}>Monthly Rent:</span>
                        <strong style={{ fontSize: '1.05rem' }}>Rs. {monthlyRent.toLocaleString()}</strong>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ opacity: 0.9 }}>Security Deposit:</span>
                            <strong style={{ fontSize: '1.05rem' }}>Rs. {breakdown.deposit.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ opacity: 0.9 }}>1st Month Balance:</span>
                            <strong style={{ fontSize: '1.05rem' }}>Rs. {breakdown.firstMonthBalance.toLocaleString()}</strong>
                        </div>
                        {breakdown.additionalMonths > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ opacity: 0.9 }}>Next {breakdown.additionalMonths} Month(s):</span>
                                <strong style={{ fontSize: '1.05rem' }}>Rs. {breakdown.additionalMonthsTotal.toLocaleString()}</strong>
                            </div>
                        )}
                    </div>

                    <div style={{
                        borderTop: '2px solid rgba(255,255,255,0.4)',
                        paddingTop: '12px',
                        marginTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Total Payment:</span>
                        <strong style={{ fontSize: '1.4rem' }}>Rs. {breakdown.totalPayment.toLocaleString()}</strong>
                    </div>
                </div>
            </div>

            {/* Month Selection */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: '600', color: '#1a202c' }}>
                    How many months of rent do you want to pay upfront?
                </h4>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <button
                        onClick={() => setSelectedMonths(Math.max(1, selectedMonths - 1))}
                        disabled={selectedMonths <= 1}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: '2px solid #667eea',
                            background: selectedMonths <= 1 ? '#e2e8f0' : '#667eea',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: selectedMonths <= 1 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        −
                    </button>

                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea', marginBottom: '4px' }}>
                            {selectedMonths}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Month{selectedMonths > 1 ? 's' : ''}
                        </div>
                    </div>

                    <button
                        onClick={() => setSelectedMonths(Math.min(maxMonths, selectedMonths + 1))}
                        disabled={selectedMonths >= maxMonths}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: '2px solid #667eea',
                            background: selectedMonths >= maxMonths ? '#e2e8f0' : '#667eea',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: selectedMonths >= maxMonths ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        +
                    </button>
                </div>
                <p style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    marginTop: '8px',
                    textAlign: 'center'
                }}>
                    <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Deposit (Rs. {depositAmount.toLocaleString()}) is deducted from 1st month's rent. Subsequent months are full rent.
                </p>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '600', color: '#1a202c' }}>
                    Choose Payment Method
                </h4>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    {/* eSewa */}
                    <button
                        onClick={() => handlePayment('esewa')}
                        style={{
                            flex: '1',
                            maxWidth: '300px',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '24px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.borderColor = '#60bb46';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(96, 187, 70, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        <img
                            src="/assets/esewa-logo.png"
                            alt="eSewa"
                            style={{ width: '100%', height: '60px', objectFit: 'contain' }}
                        />
                    </button>

                    {/* Khalti */}
                    <button
                        onClick={() => handlePayment('khalti')}
                        style={{
                            flex: '1',
                            maxWidth: '300px',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '24px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.borderColor = '#5d2e8e';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(93, 46, 142, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        <img
                            src="/assets/khalti-logo.png"
                            alt="Khalti"
                            style={{ width: '100%', height: '60px', objectFit: 'contain' }}
                        />
                    </button>
                </div>
            </div>

            {/* Security Notice */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#64748b'
            }}>
                <Info size={16} />
                <span>🔒 Your payment is secured and encrypted with industry-standard protection</span>
            </div>
        </div>
    );
};

export default PaymentGateway;
