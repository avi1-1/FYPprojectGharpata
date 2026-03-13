 "use client"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { Home, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { resetPassword } from "../api/auth"
import "./LoginPage.css"

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset.")
    }
  }, [token])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match")
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(formData.password)) {
        return setError("Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.")
    }

    setLoading(true)

    try {
      const data = await resetPassword(token, formData.password)
      setMessage(data.message || "Password has been reset successfully")
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login")
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to reset password")
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
              <h1>Create New Password</h1>
              <p>Your new password must be different from previous used passwords.</p>
            </div>
            <div className="feature-badges">
              <div className="badge-item">
                <CheckCircle2 size={18} />
                <span>Secure Password</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-side">
          <div className="form-container">
            <div className="form-header">
              <h2>Set new password</h2>
              <p>Please enter your new strong password</p>
            </div>

            {error && <div className="auth-alert alert-error">{error}</div>}
            {message && <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #d1fae5', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: 500 }}>{message} <br/><br/>Redirecting to login...</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group-custom">
                <label>New Password</label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={!token || message}
                    placeholder="••••••••"
                  />
                  {!message && token && (
                    <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group-custom">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={!token || message}
                    placeholder="••••••••"
                  />
                  {!message && token && (
                    <div className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="auth-btn btn-primary-auth" disabled={loading || !token || message}>
                {loading ? "Resetting..." : <>Reset Password <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
