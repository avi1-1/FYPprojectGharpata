// Main React application component with routing and authentication
import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { GoogleOAuthProvider } from '@react-oauth/google'
import "./App.css"

// Import all page components
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import LandingPage from "./pages/LandingPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import TenantDashboard from "./pages/TenantDashboard"
import LandlordDashboard from "./pages/LandlordDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import PropertyDetails from "./pages/PropertyDetails"
import EsewaSuccess from "./pages/EsewaSuccess"
import EsewaFailure from "./pages/EsewaFailure"
import KhaltiSuccess from "./pages/KhaltiSuccess"

function App() {
  // Get authentication state from localStorage
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user")
    return storedUser ? JSON.parse(storedUser) : null
  })

  // Handle user logout
  const handleLogout = () => {
    if (user?.name) {
      alert(`Successfully logged out ${user.name}`)
    }
    // Clear authentication data
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    if (token && user && ['tenant', 'landlord', 'admin'].includes(user.role)) {
      return `/${user.role}`
    }
    return null
  }

  const redirectPath = getRedirectPath()

  return (
    // Wrap app with Google OAuth provider for authentication
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Home route - redirect to dashboard if authenticated, otherwise show landing page */}
          <Route path="/" element={redirectPath ? <Navigate to={redirectPath} /> : <LandingPage />} />
          <Route
            path="/login"
            element={redirectPath ? <Navigate to={redirectPath} /> : <LoginPage setToken={setToken} setUser={setUser} />}
          />
          <Route path="/register" element={redirectPath ? <Navigate to={redirectPath} /> : <RegisterPage setToken={setToken} setUser={setUser} />} />
          <Route path="/forgot-password" element={redirectPath ? <Navigate to={redirectPath} /> : <ForgotPasswordPage />} />
          <Route path="/reset-password" element={redirectPath ? <Navigate to={redirectPath} /> : <ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/tenant"
            element={
              token && user?.role === "tenant" ? (
                <TenantDashboard onLogout={handleLogout} user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/landlord"
            element={
              token && user?.role === "landlord" ? (
                <LandlordDashboard onLogout={handleLogout} user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin"
            element={
              token && user?.role === "admin" ? (
                <AdminDashboard onLogout={handleLogout} user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="/property/:id" element={<PropertyDetails />} />

          {/* eSewa Payment Callback Routes */}
          <Route path="/payment/success" element={<EsewaSuccess />} />
          <Route path="/payment/failure" element={<EsewaFailure />} />

          {/* Khalti Payment Callback Route */}
          <Route path="/payment/khalti/success" element={<KhaltiSuccess />} />

          {/* Catch-all Route for 404s (e.g. /staff) */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  )
}

export default App
