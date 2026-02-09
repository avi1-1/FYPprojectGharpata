import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import axios from 'axios';
import PaymentGateway from './PaymentGateway';

const RentalAgreementModal = ({ show, onClose, booking, user, onUpdate }) => {
    const [step, setStep] = useState(1);
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (show && booking) {
            // If the contract is already agreed, jump to payment step
            if (booking.status === 'contract_agreed') {
                setStep(2);
            } else {
                setStep(1);
            }
        }
    }, [show, booking]);

    if (!show || !booking) return null;

    const handleAgree = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.put(`/api/bookings/${booking.id}/contract/agree`, {}, { headers });
            setStep(2);
            onUpdate(); // Refresh parent data
        } catch (error) {
            alert("Error agreeing to contract: " + (error.response?.data?.message || "Unknown error"));
        }
    };

    const handlePaymentSuccess = () => {
        alert("Deposit Paid! You are now the active tenant.");
        onUpdate();
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content contract-modal">
                <div className="modal-header">
                    <h3>{step === 1 ? "Rental Agreement" : "Complete Activation"}</h3>
                    <button onClick={onClose} className="close-btn"><XCircle size={24} /></button>
                </div>
                <div className="modal-body">
                    {step === 1 ? (
                        <>
                            <div className="contract-section">
                                <h4>1. Parties</h4>
                                <p>
                                    This agreement is made between <strong>{user.name}</strong> (Tenant) and
                                    the Landlord <strong>{booking.landlordName || 'the Property Owner'}</strong> for the property at <strong>{booking.address}</strong>.
                                </p>
                            </div>
                            <div className="contract-section">
                                <h4>2. Term</h4>
                                <p>The lease term is for <strong>{booking.durationYears || 1} Year(s)</strong>, commencing on <strong>{new Date(booking.moveInDate).toLocaleDateString()}</strong>.</p>
                            </div>
                            <div className="contract-section">
                                <h4>3. Financials</h4>
                                <p>Monthly Rent: <strong>Rs. {booking.monthlyRent}</strong></p>
                                <p>Security Deposit: <strong>Rs. 5000</strong> (Refundable)</p>
                                <p className="highlight-text" style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '10px' }}>
                                    * Note: The tenancy will only be activated after the security deposit of Rs. 5000 is paid.
                                </p>
                            </div>
                            <div className="contract-section">
                                <h4>4. Rules & Regulations</h4>
                                <p>The tenant agrees to abide by all house rules specified by the landlord and maintain the property in good condition.</p>
                            </div>

                            <div className="contract-actions">
                                <button
                                    className="btn-primary btn-lg btn-block"
                                    onClick={handleAgree}
                                >
                                    I Agree & Proceed to Payment
                                </button>
                            </div>
                        </>
                    ) : (
                        <PaymentGateway
                            booking={booking}
                            onSuccess={handlePaymentSuccess}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default RentalAgreementModal;
