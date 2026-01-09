"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Home, LogIn, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react"
import GoogleButton from "../components/GoogleButton"
import { login } from "../api/auth"
import "./LoginPage.css"

function LoginPage({ setToken, setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await login(formData)
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)

      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (data) => {
    if (data.isNewUser) {
      // User not found, redirect to register
      navigate('/register', { state: { googleProfile: data.googleProfile } })
    } else {
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      navigate(`/${data.user.role}`)
    }
  }

  const handleGoogleError = (errorMessage) => {
    setError(errorMessage)
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
              <h1>Welcome Back!</h1>
              <p>Your journey to the perfect home continues. Log in to manage your rentals or find your next stay.</p>
            </div>
            <div className="feature-badges">
              <div className="badge-item">
                <CheckCircle2 size={18} />
                <span>Verified Listings</span>
              </div>
              <div className="badge-item">
                <CheckCircle2 size={18} />
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="auth-form-side">
          <div className="form-container">
            <div className="form-header">
              <h2>Login to Your Account</h2>
              <p>Enter your credentials to access your dashboard</p>
            </div>

            {error && <div className="auth-alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group-custom">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={20} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <div className="label-row">
                  <label>Password</label>
                  <Link to="/forgot-password" title="Coming soon!" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn btn-primary-auth" disabled={loading}>
                {loading ? "Verifying..." : <>Login Now <ArrowRight size={18} /></>}
              </button>
            </form>

            <div className="oauth-divider">Or continue with</div>

            <GoogleButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />

            <div className="auth-footer">
              <p>New to GharPata? <Link to="/register">Create an account</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
