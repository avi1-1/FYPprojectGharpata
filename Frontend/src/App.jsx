import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { GoogleOAuthProvider } from '@react-oauth/google'
import "./App.css"

// Pages
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import LandingPage from "./pages/LandingPage"
import TenantDashboard from "./pages/TenantDashboard"
import LandlordDashboard from "./pages/LandlordDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import PropertyDetails from "./pages/PropertyDetails"

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user")
    return storedUser ? JSON.parse(storedUser) : null
  })

  const handleLogout = () => {
    if (user?.name) {
      alert(`Successfully logged out ${user.name}`)
    }
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={token ? <Navigate to={`/${user?.role}`} /> : <LandingPage />} />
          <Route
            path="/login"
            element={token ? <Navigate to={`/${user?.role}`} /> : <LoginPage setToken={setToken} setUser={setUser} />}
          />
          <Route path="/register" element={token ? <Navigate to={`/${user?.role}`} /> : <RegisterPage setToken={setToken} setUser={setUser} />} />

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
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  )
}

export default App
