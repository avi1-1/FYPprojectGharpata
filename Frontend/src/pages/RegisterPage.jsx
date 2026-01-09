"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Home,
  UserPlus,
  Mail,
  Lock,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import GoogleButton from "../components/GoogleButton"
import { register } from "../api/auth"
import "./RegisterPage.css"

function RegisterPage({ setToken, setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "tenant",
    idProofType: "citizenship",
  })
  const [idProofImage, setIdProofImage] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  })

  const [googleAuthData, setGoogleAuthData] = useState(null)

  useEffect(() => {
    const { password } = formData
    // Skip password validation if using Google Auth
    if (googleAuthData) {
      setPasswordValidations({
        length: true,
        upper: true,
        lower: true,
        number: true,
        special: true
      })
      return
    }

    setPasswordValidations({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[\W_]/.test(password)
    })
  }, [formData.password, googleAuthData])

  useEffect(() => {
    // Check for redirected google data from Login Page
    const state = window.history.state?.usr
    if (state && state.googleProfile) {
      handleGooglePreFill(state.googleProfile)
    }
  }, [])

  const handleGooglePreFill = (profile) => {
    setFormData(prev => ({
      ...prev,
      name: profile.name,
      email: profile.email
    }))
    setGoogleAuthData({
      googleToken: profile.access_token,
      googleId: profile.googleId,
      profilePicture: profile.picture
    })
    setSuccess("Google account verified! Please complete your profile.")
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB")
        setIdProofImage(null)
        e.target.value = null
        return
      }
      setError("")
      setIdProofImage(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const phoneRegex = /^9\d{9}$/
    if (!formData.phone) {
      setError("Phone number is required.")
      return
    }
    if (!phoneRegex.test(formData.phone)) {
      setError("Phone number must be 10 digits and start with 9 (e.g., 98xxxxxxxx).")
      return
    }

    if (!googleAuthData && !Object.values(passwordValidations).every(Boolean)) {
      setError("Please meet all password requirements.")
      return
    }

    // ID proof is required logic
    if (!idProofImage && !googleAuthData) {
      setError("Identity Verification failed: Please upload an ID Proof photo.")
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('email', formData.email)
      data.append('phone', formData.phone)
      data.append('address', formData.address)
      data.append('role', formData.role)
      data.append('idProofType', formData.idProofType)

      if (idProofImage) {
        data.append('idProofImage', idProofImage)
      }

      if (googleAuthData) {
        data.append('googleToken', googleAuthData.googleToken)
        data.append('googleId', googleAuthData.googleId)
        data.append('profilePicture', googleAuthData.profilePicture)
      } else {
        data.append('password', formData.password)
      }

      await register(data)

      setSuccess("Account created successfully! Redirecting...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (data) => {
    // If backend returns isNewUser, pre-fill form
    if (data.isNewUser) {
      handleGooglePreFill(data.googleProfile)
    } else {
      // Normal Login
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
    <div className="register-page">
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
              <h1>Join Our Community</h1>
              <p>Experience the future of house rentals in Nepal. Whether you're a tenant or a landlord, we've got you covered.</p>
            </div>
            <div className="step-list">
              <div className="step-item">
                <div className="step-icon">1</div>
                <div>
                  <h4>Secure Profile</h4>
                  <p>Encrypted data protection for your peace of mind.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-icon">2</div>
                <div>
                  <h4>Verified Identity</h4>
                  <p>Building trust through manual ID verification.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="auth-form-side">
          <div className="form-container-register">
            <div className="form-header">
              <h2>Create Your Account</h2>
              <p>Join thousands of users find their dream homes</p>
            </div>

            {error && <div className="auth-alert alert-error">{error}</div>}
            {success && <div className="auth-alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} className="auth-form-register">
              <div className="form-grid">
                {/* Personal Info */}
                <div className="form-section-title">Personal Information</div>

                <div className="form-group-custom">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <UserPlus size={18} className="input-icon" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" disabled={!!googleAuthData} />
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" disabled={!!googleAuthData} />
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>Phone Number</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="98xxxxxxxx" />
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>I am a...</label>
                  <div className="input-with-icon">
                    <Briefcase size={18} className="input-icon" />
                    <select name="role" value={formData.role} onChange={handleChange}>
                      <option value="tenant">Tenant (Looking for home)</option>
                      <option value="landlord">Landlord (Listing properties)</option>
                    </select>
                  </div>
                </div>

                {/* Password Info */}
                <div className="form-section-title">Security</div>

                {!googleAuthData && (
                  <div className="form-group-custom full-width">
                    <label>Password</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Strong password" />
                    </div>
                    <div className="password-checker-grid">
                      <div className={`checker-item ${passwordValidations.length ? 'met' : ''}`}>8+ Chars</div>
                      <div className={`checker-item ${passwordValidations.upper ? 'met' : ''}`}>Upper</div>
                      <div className={`checker-item ${passwordValidations.lower ? 'met' : ''}`}>Lower</div>
                      <div className={`checker-item ${passwordValidations.number ? 'met' : ''}`}>Number</div>
                      <div className={`checker-item ${passwordValidations.special ? 'met' : ''}`}>Special</div>
                    </div>
                  </div>
                )}

                {/* Verification Info */}
                <div className="form-section-title">Identity Verification</div>

                <div className="form-group-custom">
                  <label>ID Proof Type</label>
                  <div className="input-with-icon">
                    <FileText size={18} className="input-icon" />
                    <select name="idProofType" value={formData.idProofType} onChange={handleChange} required>
                      <option value="citizenship">Citizenship</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>Upload ID Proof</label>
                  <label className="file-upload-custom">
                    <Upload size={18} />
                    <span>{idProofImage ? idProofImage.name : "Select Image (JPG/PNG)"}</span>
                    <input type="file" onChange={handleFileChange} required accept="image/*" hidden />
                  </label>
                </div>

                <div className="form-group-custom full-width">
                  <label>Base Address</label>
                  <div className="input-with-icon">
                    <MapPin size={18} className="input-icon" />
                    <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Your current address" />
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-btn btn-primary-auth" disabled={loading}>
                {loading ? "Creating Account..." : <>Sign Up Now <ArrowRight size={18} /></>}
              </button>
            </form>

            <div className="oauth-divider">Or continue with</div>

            <GoogleButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Sign up with Google"
            />

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
