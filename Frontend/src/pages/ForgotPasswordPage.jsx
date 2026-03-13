"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Home, Mail, ArrowRight, CheckCircle2 } from "lucide-react"
import { forgotPassword } from "../api/auth"
import "./LoginPage.css"

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    // Validate Email - Accept both Gmail and GharPata
    if (!email) {
      setError("Email is required.")
      return
    }
    
    const emailLower = email.toLowerCase()
    const isGmailValid = emailLower.endsWith('@gmail.com')
    const isGharPataValid = emailLower.endsWith('@gharpata.com')
    
    if (!isGmailValid && !isGharPataValid) {
      setError("Please use a valid Gmail or GharPata email address")
      return
    }

    setLoading(true)

    try {
      const data = await forgotPassword(email)
      setMessage(data.message || "Password reset link sent to your email")
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to process request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="auth-split-container">
        {/* Left Side: Visual & Welcome */}
        <div className="auth-visual-side">
          <div className="visual-overlay"></div>
          <div className="visual-content">
            <Link to="/" className="auth-logo">
              <Home size={32} />
              <span>GharPata</span>
            </Link>
            <div className="welcome-message">
              <h1>Reset Password</h1>
              <p>Don't worry, it happens to the best of us. Enter your email and we'll send you a reset link.</p>
            </div>
            <div className="feature-badges">
              <div className="badge-item">
                <CheckCircle2 size={18} />
                <span>Secure Reset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-side">
          <div className="form-container">
            <div className="form-header">
              <h2>Forgot Password?</h2>
              <p>Enter your registered email address</p>
            </div>

            {error && <div className="auth-alert alert-error">{error}</div>}
            {message && <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #d1fae5', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: 500 }}>{message}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group-custom">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={20} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn btn-primary-auth" disabled={loading}>
                {loading ? "Sending..." : <>Send Reset Link <ArrowRight size={18} /></>}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: '2rem' }}>
              <p>Remember your password? <Link to="/login">Back to Login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
