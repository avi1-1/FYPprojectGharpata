"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  Wallet,
  MapPin,
  LogOut,
  BedDouble,
  Filter,
  ArrowRight,
  User,
  Camera,
  Save,
  CheckCircle,
  XCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle,
  Clock,
  Settings,
  UserCheck,
  ShieldCheck,
  FileText,
  X
} from "lucide-react"
import RentalAgreementModal from "../components/RentalAgreementModal"
import "./TenantDashboard.css"
import "./ComplaintStyles.css"

const STATUS_COLORS = {
  PENDING: "status-pending",
  IN_PROGRESS: "status-inprogress",
  RESOLVED: "status-resolved",
  REJECTED: "status-rejected",
  ESCALATED: "status-escalated",
  CLOSED: "status-closed",
  FORCE_RESOLVED: "status-force",
  WARNING_ISSUED: "status-warning",
  ACCOUNT_SUSPENDED: "status-suspended",
}

function TenantDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user")
    return saved ? JSON.parse(saved) : initialUser
  })
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [activeTab, setActiveTab] = useState("properties")
  const [loading, setLoading] = useState(true)
  const [searchFilters, setSearchFilters] = useState({ city: "", priceMin: "", priceMax: "" })
  const [showContractModal, setShowContractModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [paymentSubTab, setPaymentSubTab] = useState("details")
  const [showViewContractMode, setShowViewContractMode] = useState(false)
  const [contractRequests, setContractRequests] = useState([])
  const [showRequestModal, setShowRequestModal] = useState(null) // 'renewal' or 'termination'
  const [requestNotes, setRequestNotes] = useState("")
  const [renewalYears, setRenewalYears] = useState(1)
  const [vacateDate, setVacateDate] = useState("")

  // Profile Update State
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || ""
  })
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Complaint State
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [complaints, setComplaints] = useState([])
  const [activeBookings, setActiveBookings] = useState([])
  const [expandedComplaint, setExpandedComplaint] = useState(null)
  const [submittingComplaint, setSubmittingComplaint] = useState(false)
  const [complaintForm, setComplaintForm] = useState({ bookingId: "", title: "", description: "", category: "maintenance", severity: "medium" })
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  // Receipt State
  const [activeReceipt, setActiveReceipt] = useState(null)
  const [statusActionId, setStatusActionId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [notifCounts, setNotifCounts] = useState({ bookings: 0, complaints: 0 })
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const token = localStorage.getItem("token")

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data)
      localStorage.setItem("user", JSON.stringify(response.data))
      setProfileData({
        name: response.data.name,
        phone: response.data.phone || "",
        address: response.data.address || ""
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }, [token])

  const fetchActiveBookings = useCallback(async () => {
    try {
      const response = await axios.get(`/api/bookings/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const active = response.data.filter(b => ["approved", "active", "contract_agreed", "confirmed"].includes(b.status))
      setActiveBookings(active)
      if (active.length > 0) setComplaintForm(f => ({ ...f, bookingId: active[0].id }))
    } catch (error) {
      console.error("Error fetching bookings for complaint form:", error)
    }
  }, [token, user.id])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }

      if (activeTab === "properties") {
        const response = await axios.get("/api/properties", { headers, params: searchFilters })
        setProperties(response.data)
      } else if (activeTab === "bookings") {
        const response = await axios.get(`/api/bookings/user/${user.id}`, { headers })
        setBookings(response.data)
      } else if (activeTab === "complaints") {
        const response = await axios.get("/api/complaints", { headers })
        setComplaints(response.data)
        await fetchActiveBookings() // Restore this call
      } else if (activeTab === "payments") {
        const response = await axios.get("/api/payments", { headers })
        setPayments(response.data)
        await fetchActiveBookings()
      } else if (activeTab === "profile") {
        await fetchProfile()
      } else if (activeTab === "contracts") {
        const [bkRes, crRes] = await Promise.all([
          axios.get(`/api/bookings/user/${user.id}`, { headers }),
          axios.get("/api/bookings/contract-requests/all", { headers })
        ])
        setBookings(bkRes.data)
        setContractRequests(crRes.data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, token, user.id, searchFilters, fetchProfile])

  const fetchNotifCounts = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get("/api/notifications/counts", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifCounts(res.data)
    } catch (error) {
      console.error("Error fetching notif counts:", error)
    }
  }, [token])

  useEffect(() => {
    fetchData()
    fetchNotifCounts()
    const interval = setInterval(fetchNotifCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchData, fetchNotifCounts])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchData()
  }

  const handleLogoutClick = () => {
    onLogout()
    navigate("/")
  }

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value })
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      await axios.put("/api/users/profile", profileData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Profile updated successfully")
      fetchProfile()
    } catch (error) {
      alert("Error updating profile")
    } finally {
      setUpdating(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append("profilePicture", file)
    setUploading(true)
    try {
      await axios.post("/api/users/profile-picture", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      })
      alert("Profile picture updated")
      fetchProfile()
    } catch (error) {
      alert("Error uploading photo: " + (error.response?.data?.message || error.message))
    } finally {
      setUploading(false)
    }
  }

  // ── Complaint Handlers ──────────────────────────────────────────────────
  const handleSubmitComplaint = async (e) => {
    e.preventDefault()
    if (!complaintForm.bookingId) return alert("Please select a booking first")
    setSubmittingComplaint(true)
    try {
      await axios.post("/api/complaints", complaintForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Complaint submitted successfully")
      setShowComplaintForm(false)
      setComplaintForm({ bookingId: activeBookings[0]?.id || "", title: "", description: "", category: "maintenance", severity: "medium" })
      fetchData()
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmittingComplaint(false)
    }
  }


  const handleStatusChange = async (complaintId, status, extra = {}) => {
    setStatusActionId(complaintId + status)
    try {
      await axios.put(`/api/complaints/${complaintId}/status`, { status, ...extra }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status, ...extra } : c))
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message))
    } finally {
      setStatusActionId(null)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return alert("Please provide a reason for rejection")
    await handleStatusChange(rejectModal, "REJECTED", { rejectionReason: rejectReason })
    setRejectModal(null)
    setRejectReason("")
  }

  const handleAddComment = async (complaintId) => {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await axios.post(`/api/complaints/${complaintId}/comment`, { comment: commentText }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, comments: res.data.comments } : c))
      setCommentText("")
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmittingComment(false)
    }
  }

  const SidebarItem = ({ id, label, icon: Icon, count }) => (
    <button
      className={`menu-item ${activeTab === id ? "active" : ""}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={20} />
      <span>{label}</span>
      {count > 0 && (
        <span className={`nav-badge ${id === 'complaints' ? 'urgent' : ''}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )

  return (
    <div className="tenant-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home className="logo-icon" style={{ color: 'var(--primary)' }} />
          <h1 className="brand-title">GharPata</h1>
        </div>

        <nav className="menu">
          <SidebarItem id="properties" label="Find Home" icon={Search} />
          <SidebarItem id="bookings" label="My Bookings" icon={Calendar} count={notifCounts.bookings} />
          <SidebarItem id="contracts" label="Contracts & Renewals" icon={FileText} />
          <SidebarItem id="complaints" label="Complaints" icon={MessageSquare} count={notifCounts.complaints} />
          <SidebarItem id="payments" label="Payments" icon={Wallet} />
        </nav>

      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h2>
            {activeTab === 'properties' && 'Find Your Perfect Home'}
            {activeTab === 'bookings' && 'My Rental Bookings'}
            {activeTab === 'contracts' && 'Contract Renewals & Terminations'}
            {activeTab === 'complaints' && 'Support & Complaints'}
            {activeTab === 'payments' && 'Payment History'}
            {activeTab === 'profile' && 'Manage Profile'}
          </h2>

          <div className="top-bar-right" ref={dropdownRef}>
            <div
              className={`avatar-toggle ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="profile-avatar-mini">
                {(user.profilePicture || user.profile_picture) ? (
                  <img
                    src={(user.profilePicture || user.profile_picture).startsWith('http')
                      ? (user.profilePicture || user.profile_picture)
                      : `http://localhost:5000/uploads/profiles/${user.profilePicture || user.profile_picture}`}
                    alt="P"
                  />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <ChevronDown size={14} className={`dropdown-arrow ${showDropdown ? 'open' : ''}`} />
            </div>

            {showDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar-large">
                    {(user.profilePicture || user.profile_picture) ? (
                      <img
                        src={(user.profilePicture || user.profile_picture).startsWith('http')
                          ? (user.profilePicture || user.profile_picture)
                          : `http://localhost:5000/uploads/profiles/${user.profilePicture || user.profile_picture}`}
                        alt="P"
                      />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-user-name">{user.name}</span>
                    <span className="dropdown-user-email">{user.email || "tenant@gharpata.com"}</span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={() => { setActiveTab('profile'); setShowDropdown(false); }}>
                  <User size={16} /> <span>My Profile</span>
                </button>
                <button className="dropdown-item logout" onClick={handleLogoutClick}>
                  <LogOut size={16} /> <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {activeTab === "properties" && (
          <div className="tab-content">
            <div className="search-section">
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                  <MapPin size={18} className="search-icon-input" />
                  <input
                    type="text"
                    placeholder="Search by City, Location..."
                    value={searchFilters.city}
                    onChange={(e) => setSearchFilters({ ...searchFilters, city: e.target.value })}
                  />
                </div>
                <div className="search-input-group search-group-sm">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={searchFilters.priceMin}
                    onChange={(e) => setSearchFilters({ ...searchFilters, priceMin: e.target.value })}
                  />
                </div>
                <div className="search-input-group search-group-sm">
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={searchFilters.priceMax}
                    onChange={(e) => setSearchFilters({ ...searchFilters, priceMax: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  <Filter size={18} /> Search
                </button>
              </form>
            </div>

            {loading ? (
              <div className="empty-state">Loading properties...</div>
            ) : properties.length === 0 ? (
              <div className="empty-state">
                <Home size={48} color="var(--text-muted)" />
                <p>No properties found matching your criteria.</p>
              </div>
            ) : (
              <div className="properties-grid">
                {properties.map((property) => (
                  <div key={property.id} className="property-card">
                    <div className="property-image-container">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={`http://localhost:5000/uploads/properties/${property.images[0]}`}
                          alt={property.title}
                          className="property-card-img"
                        />
                      ) : (
                        <div className="property-image-placeholder">
                          <Home size={48} opacity={0.5} />
                        </div>
                      )}
                    </div>
                    <div className="property-content">
                      <div className="property-header">
                        <div>
                          <h3 className="property-title">{property.title}</h3>
                          <div className="property-location">
                            <MapPin size={14} /> {property.address}
                          </div>
                        </div>
                      </div>

                      <div className="property-features">
                        <span className="feature">{property.type}</span>
                        <span className="feature"><BedDouble size={14} /> {property.bedrooms} Beds</span>
                      </div>

                      <div className="property-price">
                        <span className="price-tag">Rs. {property.rentPrice.toLocaleString()}</span>
                        <button className="btn-primary btn-sm" onClick={() => navigate(`/property/${property.id}`)}>
                          View <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="tab-content">
            <div className="profile-management">
              <div className="profile-header-main">
                <div className="profile-photo-upload">
                  {(user.profilePicture || user.profile_picture) ? (
                    <img
                      src={(user.profilePicture || user.profile_picture).startsWith('http')
                        ? (user.profilePicture || user.profile_picture)
                        : `http://localhost:5000/uploads/profiles/${user.profilePicture || user.profile_picture}`}
                      alt="Profile"
                      className="current-profile-img"
                    />
                  ) : (
                    <div className="profile-img-placeholder">
                      <User size={48} />
                    </div>
                  )}
                  <label className="upload-overlay">
                    <Camera size={18} />
                    <input type="file" onChange={handlePhotoUpload} accept="image/*" hidden />
                  </label>
                  {uploading && <div className="upload-spinner">...</div>}
                </div>
                <div className="profile-info-display">
                  <h4>{user.name}</h4>
                  <p>{user.email} • {user.role}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                <div className="profile-details-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="Your phone number"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Current Address</label>
                    <input
                      type="text"
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      placeholder="Your current address"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary btn-save-profile" disabled={updating}>
                  {updating ? "Saving..." : <><Save size={18} /> Update Profile</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="tab-content">
            {/* Bookings Summary Strip */}
            {!loading && bookings.length > 0 && (
              <div className="bookings-summary-strip">
                <div className="summary-stat">
                  <span className="summary-num">{bookings.length}</span>
                  <span className="summary-label">Total Bookings</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-num">{bookings.filter(b => b.status === 'active').length}</span>
                  <span className="summary-label">Active</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-num">{bookings.filter(b => b.status === 'pending').length}</span>
                  <span className="summary-label">Pending</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-num">
                    Rs. {bookings.filter(b => b.status === 'active').reduce((s, b) => s + Number(b.monthlyRent || 0), 0).toLocaleString()}
                  </span>
                  <span className="summary-label">Monthly Commitment</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="empty-state"><Calendar size={48} color="var(--text-muted)" /><p>Loading your bookings...</p></div>
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} color="var(--text-muted)" />
                <p>You haven't made any bookings yet.</p>
              </div>
            ) : (
              <div className="booking-cards-list">
                {bookings.map((booking) => {
                  // Robust image parsing — handles JSON string, raw array, or null
                  let images = []
                  if (Array.isArray(booking.images)) {
                    images = booking.images
                  } else if (typeof booking.images === 'string' && booking.images.trim()) {
                    try { images = JSON.parse(booking.images) } catch (_) { }
                  }
                  const thumb = images.length > 0
                    ? `http://localhost:5000/uploads/properties/${images[0]}`
                    : null

                  const STATUS_META = {
                    pending: { label: 'Pending Approval', cls: 'chip-pending' },
                    approved: { label: 'Approved', cls: 'chip-approved' },
                    rejected: { label: 'Rejected', cls: 'chip-rejected' },
                    contract_agreed: { label: 'Pending Deposit', cls: 'chip-deposit' },
                    active: { label: 'Active Tenant', cls: 'chip-active' },
                    confirmed: { label: 'Confirmed', cls: 'chip-confirmed' },
                  }
                  const sm = STATUS_META[booking.status] || { label: booking.status, cls: 'chip-pending' }

                  return (
                    <div key={booking.id} className="bk-card">

                      {/* ── LEFT: Property Photo ── */}
                      <div className="bk-photo-col">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={booking.title}
                            className="bk-photo"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div className="bk-photo-placeholder" style={{ display: thumb ? 'none' : 'flex' }}>
                          {/* Decorative house illustration */}
                          <svg className="bk-house-svg" viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                            {/* Sky gradient */}
                            <defs>
                              <linearGradient id={`sky-${booking.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#1e1b4b" />
                                <stop offset="100%" stopColor="#4f46e5" />
                              </linearGradient>
                              <linearGradient id={`wall-${booking.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#e2e8f0" />
                                <stop offset="100%" stopColor="#cbd5e1" />
                              </linearGradient>
                              <linearGradient id={`roof-${booking.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#1e293b" />
                                <stop offset="100%" stopColor="#334155" />
                              </linearGradient>
                            </defs>
                            {/* Sky */}
                            <rect width="260" height="220" fill={`url(#sky-${booking.id})`} />
                            {/* Stars */}
                            <circle cx="30" cy="25" r="1.2" fill="white" opacity="0.7" />
                            <circle cx="70" cy="15" r="0.9" fill="white" opacity="0.5" />
                            <circle cx="120" cy="28" r="1.1" fill="white" opacity="0.6" />
                            <circle cx="170" cy="12" r="0.8" fill="white" opacity="0.5" />
                            <circle cx="220" cy="22" r="1.3" fill="white" opacity="0.7" />
                            <circle cx="245" cy="38" r="0.9" fill="white" opacity="0.4" />
                            <circle cx="50" cy="45" r="0.8" fill="white" opacity="0.4" />
                            <circle cx="195" cy="50" r="1.0" fill="white" opacity="0.5" />
                            {/* Moon */}
                            <circle cx="220" cy="35" r="14" fill="#fef3c7" opacity="0.9" />
                            <circle cx="227" cy="30" r="11" fill={`url(#sky-${booking.id})`} opacity="0.85" />
                            {/* Ground */}
                            <rect x="0" y="170" width="260" height="50" fill="#1e293b" />
                            <rect x="0" y="168" width="260" height="6" fill="#0f172a" opacity="0.5" />
                            {/* Grass strips */}
                            <ellipse cx="50" cy="170" rx="40" ry="5" fill="#166534" opacity="0.6" />
                            <ellipse cx="210" cy="172" rx="35" ry="4" fill="#166534" opacity="0.5" />
                            {/* House body */}
                            <rect x="55" y="105" width="150" height="68" fill={`url(#wall-${booking.id})`} rx="2" />
                            {/* Roof */}
                            <polygon points="45,108 130,55 215,108" fill={`url(#roof-${booking.id})`} />
                            {/* Roof ridge highlight */}
                            <line x1="45" y1="108" x2="130" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                            <line x1="130" y1="55" x2="215" y2="108" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                            {/* Chimney */}
                            <rect x="155" y="60" width="16" height="30" fill="#334155" rx="2" />
                            <rect x="153" y="57" width="20" height="6" fill="#1e293b" rx="2" />
                            {/* Smoke wisps */}
                            <path d="M163 55 Q161 47 165 41 Q169 35 163 30" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <path d="M158 54 Q156 44 160 37 Q164 30 158 24" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            {/* Front door */}
                            <rect x="110" y="128" width="30" height="45" fill="#7c3aed" rx="3" />
                            <rect x="112" y="130" width="26" height="41" fill="#6d28d9" rx="2" />
                            {/* Door window */}
                            <rect x="118" y="138" width="14" height="12" fill="rgba(255,255,255,0.25)" rx="2" />
                            {/* Door knob */}
                            <circle cx="136" cy="153" r="2" fill="#fbbf24" />
                            {/* Left window */}
                            <rect x="68" y="118" width="32" height="28" fill="rgba(255,255,255,0.15)" rx="3" />
                            <rect x="70" y="120" width="28" height="24" fill="#bfdbfe" opacity="0.6" rx="2" />
                            <line x1="84" y1="120" x2="84" y2="144" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                            <line x1="70" y1="132" x2="98" y2="132" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                            {/* Right window */}
                            <rect x="160" y="118" width="32" height="28" fill="rgba(255,255,255,0.15)" rx="3" />
                            <rect x="162" y="120" width="28" height="24" fill="#bfdbfe" opacity="0.6" rx="2" />
                            <line x1="176" y1="120" x2="176" y2="144" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                            <line x1="162" y1="132" x2="190" y2="132" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                            {/* Window glow */}
                            <rect x="70" y="120" width="28" height="24" fill="#fef08a" opacity="0.15" rx="2" />
                            <rect x="162" y="120" width="28" height="24" fill="#fef08a" opacity="0.15" rx="2" />
                            {/* Path to house */}
                            <rect x="118" y="170" width="24" height="5" fill="#475569" opacity="0.6" rx="1" />
                            {/* Small bushes */}
                            <ellipse cx="68" cy="171" rx="10" ry="6" fill="#15803d" opacity="0.8" />
                            <ellipse cx="192" cy="171" rx="10" ry="6" fill="#15803d" opacity="0.8" />
                            <ellipse cx="80" cy="169" rx="7" ry="4" fill="#16a34a" opacity="0.7" />
                            <ellipse cx="180" cy="169" rx="7" ry="4" fill="#16a34a" opacity="0.7" />
                            {/* Property name banner */}
                            <rect x="55" y="185" width="150" height="22" fill="rgba(79,70,229,0.7)" rx="4" />
                            <text x="130" y="200" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
                              {booking.title?.length > 22 ? booking.title.slice(0, 22) + '…' : (booking.title || 'Rental Property')}
                            </text>
                          </svg>
                        </div>
                        <span className={`bk-status-chip ${sm.cls}`}>{sm.label}</span>
                        <div className="bk-id-badge">Booking #{booking.id}</div>
                      </div>

                      {/* ── RIGHT: Content ── */}
                      <div className="bk-content-col">

                        {/* Header */}
                        <div className="bk-header">
                          <div className="bk-title-block">
                            <h3 className="bk-title">{booking.title}</h3>
                            <div className="bk-address"><MapPin size={13} />{booking.address}</div>
                          </div>
                          <div className="bk-tags">
                            {booking.type && <span className="bk-tag">{booking.type}</span>}
                            {booking.bedrooms && <span className="bk-tag"><BedDouble size={12} />{booking.bedrooms} Bed</span>}
                          </div>
                        </div>

                        <div className="bk-rule" />

                        {/* Details grid — 3 columns */}
                        <div className="bk-details-grid">
                          <div className="bk-field">
                            <span className="bk-field-label"><Calendar size={12} />Move-in</span>
                            <span className="bk-field-val">{new Date(booking.moveInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {booking.moveOutDate && (
                            <div className="bk-field">
                              <span className="bk-field-label"><Calendar size={12} />Move-out</span>
                              <span className="bk-field-val">{new Date(booking.moveOutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          )}
                          <div className="bk-field">
                            <span className="bk-field-label"><Clock size={12} />Duration</span>
                            <span className="bk-field-val">{booking.durationYears ? `${booking.durationYears} Year(s)` : '—'}</span>
                          </div>
                          <div className="bk-field bk-field-accent">
                            <span className="bk-field-label"><Wallet size={12} />Monthly Rent</span>
                            <span className="bk-field-val bk-price">Rs. {Number(booking.monthlyRent).toLocaleString()}</span>
                          </div>
                          <div className="bk-field">
                            <span className="bk-field-label"><Wallet size={12} />Security Deposit</span>
                            <span className="bk-field-val">Rs. {Number(booking.depositAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="bk-rule" />

                        {/* Footer: landlord + actions */}
                        <div className="bk-footer">
                          <div className="bk-landlord">
                            <div className="bk-landlord-ava">{booking.landlordName?.charAt(0).toUpperCase()}</div>
                            <div className="bk-landlord-info">
                              <span className="bk-landlord-name">{booking.landlordName}</span>
                              <span className="bk-landlord-sub">
                                {booking.landlordEmail}{booking.landlordPhone ? ` · ${booking.landlordPhone}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="bk-actions">
                            <button
                              className="bk-btn bk-btn-outline"
                              onClick={() => navigate(`/property/${booking.propertyId}`)}
                            >
                              <Home size={14} /> View Property
                            </button>
                            {booking.status === 'approved' && (
                              <button
                                className="bk-btn bk-btn-primary"
                                onClick={() => { setSelectedBooking(booking); setShowContractModal(true) }}
                              >
                                View Contract
                              </button>
                            )}
                            {booking.status === 'contract_agreed' && (
                              <button
                                className="bk-btn bk-btn-success"
                                onClick={() => { setSelectedBooking(booking); setShowContractModal(true) }}
                              >
                                <Wallet size={14} /> Pay Deposit
                              </button>
                            )}
                            {booking.status === 'active' && (
                              <span className="bk-active-badge"><CheckCircle size={15} /> Active</span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="tab-content">
            <div className="header-row">
              <div>
                <h3>Manage Contracts</h3>
                <p className="header-subtitle">Request renewal or termination for your active bookings</p>
              </div>
            </div>

            <div className="active-contracts-section" style={{ marginBottom: '2rem' }}>
              <h4>Active Bookings Eligible for Request</h4>
              {bookings.filter(b => b.status === 'active').length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <FileText size={40} color="var(--text-muted)" />
                  <p>You have no active bookings to renew or terminate.</p>
                </div>
              ) : (
                <div className="properties-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
                  {bookings.filter(b => b.status === 'active').map(booking => {
                    const moveOutDate = new Date(booking.moveOutDate);
                    const today = new Date();
                    const daysUntilMoveOut = Math.ceil((moveOutDate - today) / (1000 * 60 * 60 * 24));
                    const isRenewable = daysUntilMoveOut <= 30;

                    return (
                      <div key={booking.id} className="property-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>{booking.title}</h4>
                          <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                            <MapPin size={14} style={{ marginRight: '6px' }} /> {booking.address}
                          </div>
                        </div>

                        <div style={{ padding: '1.5rem', flexGrow: 1 }}>
                          <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Contract Timeline</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Move-In Date</div>
                              <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>{new Date(booking.moveInDate).toLocaleDateString()}</div>
                            </div>
                            <div style={{ backgroundColor: isRenewable ? '#fef2f2' : '#f1f5f9', padding: '0.75rem', borderRadius: '8px', border: isRenewable ? '1px solid #fecaca' : '1px solid transparent' }}>
                              <div style={{ fontSize: '0.75rem', color: isRenewable ? '#ef4444' : '#64748b', marginBottom: '4px' }}>End Date</div>
                              <div style={{ fontWeight: '600', color: isRenewable ? '#dc2626' : '#334155', fontSize: '0.9rem' }}>{new Date(booking.moveOutDate).toLocaleDateString()}</div>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1.5rem' }}>
                            <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '1rem' }}>Contract Actions</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <button
                                  className={`btn-primary ${!isRenewable ? 'disabled' : ''}`}
                                  style={{ width: '100%', justifyContent: 'center', opacity: isRenewable ? 1 : 0.6, cursor: isRenewable ? 'pointer' : 'not-allowed' }}
                                  disabled={!isRenewable}
                                  onClick={() => {
                                    if (isRenewable) {
                                      setSelectedBooking(booking);
                                      setShowRequestModal('renewal');
                                      setRequestNotes('');
                                      setRenewalYears(1);
                                    }
                                  }}
                                >
                                  <FileText size={16} /> Request Renewal
                                </button>
                                {!isRenewable && (
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                                    Available 30 days before contract ends ({daysUntilMoveOut} days left)
                                  </span>
                                )}
                              </div>

                              <button
                                className="btn-secondary"
                                style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowRequestModal('termination');
                                  setRequestNotes('');
                                  const nextMonth = new Date();
                                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                                  setVacateDate(nextMonth.toISOString().split('T')[0]);
                                }}
                              >
                                <XCircle size={16} /> Request Early Termination
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="contract-requests-section">
              <h4>Request History</h4>
              {contractRequests.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <Clock size={40} color="var(--text-muted)" />
                  <p>No contract requests submitted yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Date Submitted</th>
                        <th>Details (Yrs / Date)</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractRequests.map(req => (
                        <tr key={req.id}>
                          <td>{req.propertyTitle}</td>
                          <td><span className={`badge ${req.type === 'renewal' ? 'info' : 'warning'}`}>{req.type.toUpperCase()}</span></td>
                          <td>
                            <span className={`badge ${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'pending'}`}>
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td>
                            {req.type === 'renewal'
                              ? req.renewalYears ? `${req.renewalYears} Year(s)` : '-'
                              : req.requestedVacateDate ? new Date(req.requestedVacateDate).toLocaleDateString() : '-'}
                          </td>
                          <td>{req.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {showRequestModal && selectedBooking && (
              <div className="modal-overlay" onClick={() => setShowRequestModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s ease-out' }}>

                  <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: showRequestModal === 'termination' ? '#fef2f2' : '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: showRequestModal === 'termination' ? '#b91c1c' : '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {showRequestModal === 'renewal' ? <FileText size={20} /> : <XCircle size={20} />}
                      {showRequestModal === 'renewal' ? 'Request Contract Renewal' : 'Request Early Termination'}
                    </h3>
                    <button className="close-btn" onClick={() => setShowRequestModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <X size={20} />
                    </button>
                  </div>

                  <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      You are requesting a <strong style={{ color: '#1e293b' }}>{showRequestModal}</strong> for <strong style={{ color: '#1e293b' }}>{selectedBooking.title}</strong>. This request will be sent to your landlord for approval.
                    </p>

                    {showRequestModal === 'renewal' && (
                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Renewal Duration (Years)</label>
                        <select
                          value={renewalYears}
                          onChange={(e) => setRenewalYears(parseInt(e.target.value))}
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                          onFocus={e => e.target.style.borderColor = '#4f46e5'}
                          onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                        >
                          <option value={1}>1 Year Extension</option>
                          <option value={2}>2 Years Extension</option>
                          <option value={3}>3 Years Extension</option>
                          <option value={5}>5 Years Extension</option>
                        </select>
                      </div>
                    )}

                    {showRequestModal === 'termination' && (
                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Expected Vacate Date</label>
                        <input
                          type="date"
                          value={vacateDate}
                          onChange={(e) => setVacateDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                          onFocus={e => e.target.style.borderColor = '#ef4444'}
                          onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                          required
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>Additional Notes / Reason</label>
                      <textarea
                        rows="4"
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                        placeholder={showRequestModal === 'renewal' ? 'E.g., I love the property and want to continue my stay.' : 'E.g., I am relocating for work by the end of next month.'}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', fontSize: '0.95rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = showRequestModal === 'renewal' ? '#4f46e5' : '#ef4444'}
                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>
                  </div>

                  <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                      onClick={() => setShowRequestModal(null)}
                      style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const payload = { type: showRequestModal, notes: requestNotes };
                          if (showRequestModal === 'renewal') payload.renewalYears = renewalYears;
                          if (showRequestModal === 'termination') payload.requestedVacateDate = vacateDate;

                          await axios.post(`/api/bookings/${selectedBooking.id}/contract-request`,
                            payload,
                            { headers: { Authorization: `Bearer ${token}` } }
                          )
                          alert(`${showRequestModal} request submitted successfully`)
                          setShowRequestModal(null)
                          fetchData() // Refresh
                        } catch (error) {
                          alert(error.response?.data?.message || 'Error submitting request')
                        }
                      }}
                      style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', backgroundColor: showRequestModal === 'termination' ? '#dc2626' : '#4f46e5', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }}
                    >
                      {showRequestModal === 'renewal' ? 'Submit Renewal Request' : 'Submit Termination'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <RentalAgreementModal
          show={showContractModal}
          onClose={() => {
            setShowContractModal(false);
            setShowViewContractMode(false);
          }}
          booking={selectedBooking}
          user={user}
          onUpdate={fetchData}
          isReadOnly={showViewContractMode}
        />

        {/* ── COMPLAINTS TAB ── */}
        {activeTab === "complaints" && (
          <div className="tab-content">
            {/* File New Complaint Button */}
            <div className="complaints-header">
              <div>
                <h3>My Complaints</h3>
                <p className="header-subtitle">Track and manage your complaints with landlord</p>
              </div>
              <button
                className={`btn-primary ${showComplaintForm ? 'btn-secondary' : ''}`}
                onClick={() => setShowComplaintForm(!showComplaintForm)}
              >
                {showComplaintForm ? <><XCircle size={18} /> Cancel</> : <><PlusCircle size={18} /> File Complaint</>}
              </button>
            </div>

            {/* Dashboard Quick Stats */}
            <div className="complaint-status-stats">
              <div className="c-stat-box">
                <span className="c-stat-label">Total Tickets</span>
                <span className="c-stat-val">{complaints.length}</span>
              </div>
              <div className="c-stat-box accent-orange">
                <span className="c-stat-label">Under Review</span>
                <span className="c-stat-val">{complaints.filter(c => ['PENDING', 'IN_PROGRESS'].includes(c.status)).length}</span>
              </div>
              <div className="c-stat-box accent-green">
                <span className="c-stat-label">Resolved Cases</span>
                <span className="c-stat-val">{complaints.filter(c => c.status === 'RESOLVED').length}</span>
              </div>
              <div className="c-stat-box accent-gray">
                <span className="c-stat-label">Closed Archive</span>
                <span className="c-stat-val">{complaints.filter(c => c.status === 'CLOSED').length}</span>
              </div>
            </div>

            {/* New Complaint Form */}
            {showComplaintForm && (
              <div className="complaint-form-card">
                <h4 className="complaint-form-title"><AlertTriangle size={18} /> New Complaint Information</h4>
                {activeBookings.length === 0 ? (
                  <div className="complaint-no-booking">
                    <XCircle size={32} />
                    <p>You need an active booking to file a complaint. Please book a property first.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitComplaint} className="complaint-form">
                    <div className="complaint-form-grid">
                      <div className="form-group">
                        <label>Select Booking / Property</label>
                        <select
                          value={complaintForm.bookingId}
                          onChange={e => setComplaintForm({ ...complaintForm, bookingId: e.target.value })}
                          required
                        >
                          {activeBookings.map(b => (
                            <option key={b.id} value={b.id}>{b.title} (Booking #{b.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Category</label>
                        <select
                          value={complaintForm.category}
                          onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value })}
                        >
                          <option value="maintenance">Maintenance</option>
                          <option value="payment">Payment</option>
                          <option value="behavior">Behavior</option>
                          <option value="noise">Noise</option>
                          <option value="harassment">Harassment</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Severity</label>
                        <select
                          value={complaintForm.severity}
                          onChange={e => setComplaintForm({ ...complaintForm, severity: e.target.value })}
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>

                      <div className="form-group form-group-full">
                        <label>Complaint Title</label>
                        <input
                          type="text"
                          placeholder="Brief title for your complaint"
                          value={complaintForm.title}
                          onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
                          required
                          maxLength={255}
                        />
                      </div>

                      <div className="form-group form-group-full">
                        <label>Description</label>
                        <textarea
                          placeholder="Describe your complaint in detail..."
                          value={complaintForm.description}
                          onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                          required
                          rows={4}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={submittingComplaint}>
                      {submittingComplaint ? "Submitting..." : <><Send size={16} /> Submit Complaint</>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Complaint List Rendering State */}
            {loading && (
              <div className="empty-state">
                <Clock size={40} />
                <p>Loading ticket data...</p>
              </div>
            )}

            {!loading && complaints.length === 0 && (
              <div className="empty-state">
                <MessageSquare size={40} />
                <p>No complaints filed yet.</p>
                <span className="text-soft">Use the "File Complaint" button to start.</span>
              </div>
            )}

            {!loading && complaints.length > 0 && (
              <div className="complaints-ticket-list">
                {complaints.map(c => {
                  const isExpanded = expandedComplaint === c.id
                  const comments = Array.isArray(c.comments) ? c.comments : []
                  const severityColor = c.severity === 'high' ? '#ef4444' : c.severity === 'medium' ? '#f59e0b' : '#10b981';

                  return (
                    <div key={c.id} className={`complaint-ticket ${isExpanded ? 'expanded' : ''}`}>
                      <div className="ticket-severity-bar" style={{ backgroundColor: severityColor }} />

                      <div className="ticket-main-row" onClick={() => setExpandedComplaint(isExpanded ? null : c.id)}>
                        <div className="ticket-meta-left">
                          <span className="ticket-id">#{c.id.toString().padStart(4, '0')}</span>
                          <div className="c-ticket-title-block">
                            <h4 className="ticket-title">{c.title}</h4>
                            <div className="ticket-sub-row">
                              <span className="ticket-cat">{c.category}</span>
                              <span className="dot" />
                              <span className="ticket-date"><Clock size={12} /> {new Date(c.createdAt).toLocaleDateString()}</span>
                              <span className="dot" />
                              <span className="text-soft" style={{ fontSize: '0.75rem', fontWeight: 700 }}>vs. {c.landlordName || 'Owner'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ticket-meta-right">
                          <div className={`ticket-status-bubble status-${c.status.toLowerCase().replace(/_/g, '')}`}>
                            {c.status.replace(/_/g, ' ')}
                          </div>
                          <div className="ticket-exp-icon">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ticket-detail-body">
                          <div className="detail-section">
                            <label className="detail-label">Issue Description</label>
                            <div className="detail-content">{c.description}</div>
                          </div>

                          <div className="detail-audit-grid">
                            {c.rejectionReason && (
                              <div className="audit-note rejection">
                                <span className="note-title"><XCircle size={14} /> Rejection Reason</span>
                                <p>{c.rejectionReason}</p>
                              </div>
                            )}

                            {c.resolution && (
                              <div className="audit-note resolution">
                                <span className="note-title"><CheckCircle size={14} /> Official Resolution</span>
                                <p>{c.resolution}</p>
                              </div>
                            )}

                            {c.adminRemarks && (
                              <div className="audit-note admin">
                                <span className="note-title"><UserCheck size={14} /> Admin Intervention</span>
                                <p>{c.adminRemarks}</p>
                              </div>
                            )}
                          </div>

                          {c.status === 'RESOLVED' && (
                            <div className="resolution-verification-bar">
                              <div className="verify-info">
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <AlertTriangle size={20} style={{ color: '#d97706' }} />
                                  <h4>Action Required: Resolution Verification</h4>
                                </div>
                                <p>Please confirm if the problem has been solved to your satisfaction.</p>
                              </div>
                              <div className="verify-buttons" style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-verify-accept" onClick={() => handleStatusChange(c.id, 'CLOSED')}>
                                  <CheckCircle size={16} /> Accept & Close
                                </button>
                                <button className="btn-verify-escalate" onClick={() => handleStatusChange(c.id, 'ESCALATED')}>
                                  <AlertTriangle size={16} /> Still an issue (Escalate)
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="comments-section">
                            <div className="section-title">
                              <MessageSquare size={16} /> Discussion Thread ({comments.length})
                            </div>
                            <div className="comments-thread">
                              {comments.length === 0 ? <p className="no-comments">No messages yet.</p> : comments.map((cm, idx) => (
                                <div key={idx} className={`comment-bubble ${cm.role === 'tenant' ? 'mine' : 'other'}`}>
                                  <div className="comment-meta">
                                    <span className="bold">{cm.name}</span>
                                    <span className={`role-tag role-${cm.role}`}>{cm.role}</span>
                                    <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="comment-box">
                                    {cm.comment}
                                  </div>
                                </div>
                              ))}
                              {!['CLOSED', 'RESOLVED'].includes(c.status) && (
                                <div className="comment-reply-box">
                                  <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={expandedComplaint === c.id ? commentText : ''}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment(c.id)}
                                  />
                                  <button className="btn-verify-accept" style={{ padding: '0 1.5rem' }} onClick={() => handleAddComment(c.id)}>
                                    <Send size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}


        {activeTab === "payments" && (
          <div className="tab-content">
            {loading && (
              <div className="empty-state-card"><Wallet size={48} /><p>Loading payment dashboard...</p></div>
            )}
            {!loading && (
              <div className="payment-overhaul-container">
                {/* ── Payment Sub-Tabs Switcher ── */}
                <div className="payment-sub-tabs">
                  <button className={`sub-tab-btn ${paymentSubTab === 'details' ? 'active' : ''}`} onClick={() => setPaymentSubTab('details')}>
                    <Wallet size={16} /> Payment Details
                  </button>
                  <button className={`sub-tab-btn ${paymentSubTab === 'history' ? 'active' : ''}`} onClick={() => setPaymentSubTab('history')}>
                    <Clock size={16} /> Payment History
                  </button>
                </div>

                <div className="payment-overhaul">
                  {/* ── Section 1: Payment Details (Visible if sub-tab is details) ── */}
                  {paymentSubTab === 'details' && (
                    <div className="payment-grid-main">
                      {activeBookings.length === 0 ? (
                        <div className="payment-empty-panel">
                          <AlertTriangle size={32} />
                          <p>You have no active bookings to track payments for.</p>
                          <button className="btn-primary" onClick={() => setActiveTab('properties')}>Find a Home</button>
                        </div>
                      ) : activeBookings.map(bk => {
                        const now = new Date()
                        const monthlyRent = parseFloat(bk.monthlyRent || 0)
                        const securityDeposit = parseFloat(bk.depositAmount || 0)

                        // Check payment history for this specific booking
                        const bookingPayments = payments.filter(p => p.bookingId === bk.id && p.status === 'completed')
                        const isDepositPaid = bookingPayments.some(p => p.paymentType === 'deposit')

                        // Check if rent for the CURRENT month is paid
                        const isRentPaidThisMonth = bookingPayments.some(p => {
                          if (p.paymentType !== 'rent') return false
                          const pDate = new Date(p.paymentDate || p.createdAt)
                          return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()
                        })

                        const needsDeposit = !isDepositPaid
                        const needsRent = !isRentPaidThisMonth
                        const pendingAmount = needsDeposit ? securityDeposit : (needsRent ? monthlyRent : 0)

                        const moveInDate = new Date(bk.moveInDate)
                        const dueDate = new Date(now.getFullYear(), now.getMonth(), moveInDate.getDate())

                        const monthName = now.toLocaleString('default', { month: 'short' }).toUpperCase()

                        // If current rent is paid, show next month's due date
                        let displayDueDate = dueDate
                        if (!needsRent && !needsDeposit) {
                          displayDueDate = new Date(now.getFullYear(), now.getMonth() + 1, moveInDate.getDate())
                        }

                        const remainingDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
                        const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)))
                        const lateFee = (daysOverdue > 7 && pendingAmount > 0) ? (pendingAmount * 0.05) : 0
                        const totalPayable = pendingAmount + lateFee

                        return (
                          <div key={bk.id} className="bill-card-premium">
                            <div className="bill-top-accent" />
                            <div className="bill-main-header">
                              <div className="bill-header-text">
                                <span className="over-label">Tenancy Billing</span>
                                <h4>{bk.title}</h4>
                                <span className="bk-ref-pill">Booking ID: #{bk.id}</span>
                              </div>
                              <div className="bill-status-indicator">
                                {pendingAmount === 0 ? (
                                  <div className="status-label paid"><CheckCircle size={14} /> ALL PAID ({monthName})</div>
                                ) : needsDeposit ? (
                                  <div className="status-label deposit-needed"><Wallet size={14} /> DEPOSIT DUE</div>
                                ) : daysOverdue > 0 ? (
                                  <div className="status-label overdue"><AlertTriangle size={14} /> {daysOverdue} DAYS OVERDUE</div>
                                ) : (
                                  <div className="status-label upcoming"><Clock size={14} /> RENT DUE IN {remainingDays} DAYS</div>
                                )}
                              </div>
                            </div>
                            <div className="bill-card-body">
                              <div className="bill-audit-grid">
                                <div className="audit-col">
                                  <span className="audit-section-name">Tenancy Commitments</span>
                                  <div className="audit-item">
                                    <span className="ai-label">Monthly Rent</span>
                                    <span className="ai-val">Rs. {monthlyRent.toLocaleString()}</span>
                                  </div>
                                  <div className="audit-item">
                                    <span className="ai-label">Security Deposit</span>
                                    <span className="ai-val">Rs. {securityDeposit.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="audit-col accent-left">
                                  <span className="audit-section-name">Live Breakdown</span>
                                  <div className="audit-item">
                                    <span className="ai-label">{needsDeposit ? 'Deposit Status' : 'Rent Status'}</span>
                                    <span className={`ai-val ${pendingAmount === 0 ? 'green' : 'orange'}`}>
                                      {pendingAmount === 0 ? 'Settled' : 'Unpaid'}
                                    </span>
                                  </div>
                                  <div className="audit-item">
                                    <span className="ai-label">Late Penalties</span>
                                    <span className={`ai-val ${lateFee > 0 ? 'red bold underline' : ''}`}>+ Rs. {lateFee.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bill-summary-footer">
                                <div className="total-payable-bar">
                                  <div className="tp-text">
                                    <span className="tp-label">Amount Payable Now</span>
                                    <span className="tp-date"><Calendar size={12} /> {pendingAmount === 0 ? 'Next' : ''} Due Date: {displayDueDate.toLocaleDateString()}</span>
                                  </div>
                                  <div className="tp-amount">Rs. {totalPayable.toLocaleString()}</div>
                                </div>

                                <div className="bill-actions-row">
                                  {totalPayable > 0 && (
                                    <button className="btn-pay-master" onClick={() => {
                                      setSelectedBooking({ ...bk, customAmount: totalPayable });
                                      setShowViewContractMode(false);
                                      setShowContractModal(true);
                                    }}>
                                      <Wallet size={14} /> Pay Total Balance
                                    </button>
                                  )}
                                  <button className="btn-view-terms" onClick={() => {
                                    setSelectedBooking(bk);
                                    setShowViewContractMode(true);
                                    setShowContractModal(true);
                                  }}>
                                    <FileText size={14} /> Review Terms
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Section 2: Payment History (Visible if sub-tab is history) ── */}
                  {paymentSubTab === 'history' && (
                    <div className="payment-history-block">
                      <div className="section-title-row">
                        <h3>Transaction History Logs</h3>
                        <button className="btn-refresh-sm" onClick={fetchData}><Clock size={14} /> Refresh</button>
                      </div>
                      <div className="table-container history-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Method</th>
                              <th>TX ID</th>
                              <th>Status</th>
                              <th>Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.length === 0 ? (
                              <tr><td colSpan="6" className="table-empty-msg">No logs found.</td></tr>
                            ) : payments.map(p => {
                              const isPartial = p.status === 'completed' && p.paymentType === 'rent' && p.amount < (activeBookings.find(b => b.id === p.bookingId)?.monthlyRent || 0)
                              return (
                                <tr key={p.id}>
                                  <td>{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</td>
                                  <td className="bold">Rs. {p.amount.toLocaleString()}</td>
                                  <td className="table-cell-cap" style={{ fontWeight: '600', color: '#4f46e5' }}>
                                    {p.paymentType === 'deposit' ? 'Security Deposit' : 'Monthly Rent'}
                                  </td>
                                  <td className="tx-id-cell">{p.transactionId || '—'}</td>
                                  <td><span className={`status-badge status-${p.status}`}>{p.status === 'completed' ? (isPartial ? 'Partial' : 'Paid') : (p.status === 'pending' ? 'Unpaid (Issued)' : p.status)}</span></td>
                                  <td>
                                    <button className="btn-receipt" onClick={() => {
                                      const bk = activeBookings.find(b => b.id === p.bookingId);
                                      setActiveReceipt({
                                        ...p,
                                        propertyTitle: bk?.title,
                                        tenantName: user.name,
                                        landlordName: bk?.landlordName || 'Property Owner',
                                        landlordPhone: bk?.landlordPhone || 'N/A'
                                      });
                                      setTimeout(() => window.print(), 300);
                                    }}>
                                      <Wallet size={14} /> Download
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Printable Receipt Overlay ── */}
                {activeReceipt && (
                  <div className="printable-receipt-wrap">
                    <div className="receipt-thermal">
                      <div className="receipt-header">
                        <div className="receipt-logo">GHARPATA</div>
                        <p>Official Payment Receipt</p>
                      </div>

                      <div className="receipt-divider-dash" />

                      <div className="receipt-info-grid">
                        <div className="r-item">
                          <span className="r-label">Transaction ID</span>
                          <span className="r-val mono">{activeReceipt.transactionId}</span>
                        </div>
                        <div className="r-item">
                          <span className="r-label">Status</span>
                          <span className="r-val" style={{
                            color: activeReceipt.status === 'completed' ? '#059669' :
                              activeReceipt.status === 'pending' ? '#d97706' : '#dc2626',
                            textTransform: 'uppercase'
                          }}>
                            {activeReceipt.status === 'completed' ? (activeReceipt.paymentType === 'deposit' ? 'Deposited' : 'Paid') : activeReceipt.status}
                          </span>
                        </div>
                      </div>

                      <div className="receipt-property">
                        <span className="r-label">Property / Room</span>
                        <span className="r-val-large">{activeReceipt.propertyTitle || 'N/A'}</span>
                      </div>

                      <div className="receipt-divider-dash" />

                      <div className="receipt-parties">
                        <div className="party">
                          <span className="r-label">Received From (Tenant)</span>
                          <span className="r-val">{activeReceipt.tenantName}</span>
                        </div>
                        <div className="party">
                          <span className="r-label">Paid To (Receiver)</span>
                          <span className="r-val">{activeReceipt.landlordName}</span>
                          <span className="r-val-sm" style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            {activeReceipt.landlordPhone}
                          </span>
                        </div>
                      </div>

                      <div className="receipt-divider-dash" />

                      <div className="receipt-info-grid">
                        <div className="r-item">
                          <span className="r-label">Issue Date</span>
                          <span className="r-val">{new Date(activeReceipt.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="r-item">
                          <span className="r-label">Payment Category</span>
                          <span className="r-val-cap">{activeReceipt.paymentType === 'deposit' ? 'Security Deposit' : 'Monthly Rent'}</span>
                        </div>
                      </div>

                      <div className="receipt-divider-dash" />

                      <div className="receipt-amount-block">
                        <span className="total-text">Total Transaction Amount</span>
                        <span className="total-amount">Rs. {activeReceipt.amount.toLocaleString()}</span>
                        <span className="status-verify">VERIFIED BY GHARPATA eSEWA GATEWAY</span>
                      </div>

                      <div className="receipt-footer">
                        <p>This is a computer-generated receipt.</p>
                        <div className="qr-placeholder">G-SECURITY VERIFIED</div>
                      </div>

                      <button className="btn-close-receipt no-print" onClick={() => setActiveReceipt(null)}>Close Preview</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal-content reject-modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3><XCircle size={20} style={{ color: '#ef4444' }} /> Reject Complaint</h3>
              <button onClick={() => setRejectModal(null)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.2rem' }}>
                Please provide a reason why you are rejecting this complaint. This will be visible to the Filer and Admin.
              </p>
              <textarea
                className="reject-textarea"
                rows={4}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.25rem' }}>
              <button className="btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn-primary btn-danger" style={{ background: '#ef4444' }} onClick={handleRejectSubmit}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TenantDashboard
