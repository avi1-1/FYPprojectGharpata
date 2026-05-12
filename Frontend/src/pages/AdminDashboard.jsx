import React, { useState, useEffect, useCallback, useRef, Fragment } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  LayoutDashboard,
  Users,
  Home,
  MessageSquare,
  LogOut,
  CheckCircle,
  XCircle,
  CreditCard,
  Building,
  UserCheck,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  User,
  Camera,
  Save,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText
} from "lucide-react"
import "./AdminDashboard.css"
import "./ComplaintStyles.css"

function AdminDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user")
    return saved ? JSON.parse(saved) : initialUser
  })
  const [stats, setStats] = useState(null)
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [allProperties, setAllProperties] = useState([])
  const [complaints, setComplaints] = useState([])
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [complaintsExpanded, setComplaintsExpanded] = useState(null)
  const [usersExpanded, setUsersExpanded] = useState(null)
  const [adminStatusSelections, setAdminStatusSelections] = useState({})
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [notifCounts, setNotifCounts] = useState({ pendingUsers: 0, pendingProperties: 0, complaints: 0 })
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // New states for Payments & Agreements
  const [payments, setPayments] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [contractRequests, setContractRequests] = useState([])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const ADMIN_STATUSES = [
    "PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", "ESCALATED",
    "CLOSED", "FORCE_RESOLVED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED"
  ]

  const COMPLAINT_STATUS_COLORS = {
    PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", RESOLVED: "#10b981",
    REJECTED: "#ef4444", ESCALATED: "#f97316", CLOSED: "#6b7280",
    FORCE_RESOLVED: "#8b5cf6", WARNING_ISSUED: "#d97706", ACCOUNT_SUSPENDED: "#b91c1c"
  }

  // Profile Update State
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || ""
  })
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)

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

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Session expired. Please login again.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const headers = { Authorization: `Bearer ${token}` }
      console.log(`[Admin] Fetching data for: ${activeTab}`)

      if (activeTab === "dashboard") {
        const response = await axios.get("/api/admin/stats", { headers })
        setStats(response.data)
      } else if (activeTab === "pending-users") {
        const response = await axios.get("/api/admin/pending-users", { headers })
        setPendingUsers(response.data)
      } else if (activeTab === "all-users") {
        const response = await axios.get("/api/admin/all-users", { headers })
        setAllUsers(response.data)
      } else if (activeTab === "properties") {
        const response = await axios.get("/api/admin/pending-properties", { headers })
        setPendingProperties(response.data)
      } else if (activeTab === "all-properties") {
        const response = await axios.get("/api/admin/all-properties", { headers })
        setAllProperties(response.data)
      } else if (activeTab === "complaints") {
        const response = await axios.get("/api/admin/complaints", { headers })
        setComplaints(response.data)
      } else if (activeTab === "finance") {
        const [payRes, bookRes] = await Promise.all([
          axios.get("/api/admin/payments", { headers }),
          axios.get("/api/admin/bookings", { headers })
        ])
        setPayments(payRes.data)
        setAllBookings(bookRes.data)
      } else if (activeTab === "profile") {
        await fetchProfile()
      } else if (activeTab === "contracts") {
        const response = await axios.get("/api/bookings/contract-requests/all", { headers })
        setContractRequests(response.data)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      console.error("[Admin] Fetch Error:", msg)
      setError(`Failed to fetch ${activeTab}: ${msg}`)
      if (err.response?.status === 401 || err.response?.status === 403) {
        setTimeout(() => handleLogoutClick(), 3000)
      }
    } finally {
      setLoading(false)
    }
  }, [activeTab, token, fetchProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
    fetchNotifCounts()
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchData, fetchNotifCounts])

  const handleApproveUser = async (userId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/admin/approve-user/${userId}`, {}, { headers })
      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      alert("User approved successfully")
      if (activeTab === "dashboard") fetchData()
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message))
    }
  }

  const handleRejectUser = async (userId) => {
    if (!window.confirm("Reject this user request?")) return
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.delete(`/api/admin/reject-user/${userId}`, { headers })
      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      alert("User rejected")
    } catch (err) {
      alert("Error rejecting user")
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently DELETE this user?")) return
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.delete(`/api/admin/delete-user/${userId}`, { headers })
      setAllUsers(prev => prev.filter(u => u.id !== userId))
      alert("User deleted")
      if (activeTab === "dashboard") fetchData()
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message))
    }
  }

  const handleApproveProperty = async (propertyId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/admin/approve-property/${propertyId}`, {}, { headers })
      setPendingProperties(prev => prev.filter(p => p.id !== propertyId))
      alert("Property approved")
      if (activeTab === "dashboard") fetchData()
    } catch (err) {
      alert("Error approving property")
    }
  }

  const handleRejectProperty = async (propertyId) => {
    if (!window.confirm("Reject and remove this property?")) return
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.delete(`/api/admin/reject-property/${propertyId}`, { headers })
      setPendingProperties(prev => prev.filter(p => p.id !== propertyId))
      alert("Property rejected")
    } catch (err) {
      alert("Error rejecting property")
    }
  }

  const handleViewProperty = (propertyId) => {
    // Open in new tab to preserve dashboard state
    window.open(`/property/${propertyId}`, '_blank')
  }

  const handleComplaintUpdate = async (complaintId, newStatus, adminRemarks) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/admin/complaints/${complaintId}/status`, { status: newStatus, adminRemarks }, { headers })
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: newStatus } : c))
      alert(`Complaint updated to ${newStatus}`)
    } catch (error) {
      alert("Error updating complaint: " + (error.response?.data?.message || error.message))
    }
  }

  const handleAddComment = async (complaintId) => {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    console.log(`[Admin] Sending comment to /api/complaints/${complaintId}/comment`)
    try {
      const res = await axios.post(`/api/complaints/${complaintId}/comment`, { comment: commentText }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, comments: res.data.comments } : c))
      setCommentText("")
    } catch (error) {
      alert("Error adding comment: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleLogoutClick = () => {
    onLogout()
    navigate("/")
  }

  // Profile Specific Handlers
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

    const data = new FormData()
    data.append("profilePicture", file)

    setUploading(true)
    try {
      await axios.post("/api/users/profile-picture", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      })
      alert("Profile picture updated")
      fetchProfile()
    } catch (error) {
      alert("Error uploading photo")
    } finally {
      setUploading(false)
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

  const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => (
    <div className={`stat-card ${onClick ? 'clickable-stat' : ''}`} onClick={onClick}>
      <div className="stat-info">
        <h3>{title}</h3>
        <p className="stat-number">{value !== undefined && value !== null ? value : '0'}</p>
      </div>
      <div className={`stat-icon ${colorClass || ''}`}>
        <Icon size={24} />
      </div>
    </div>
  )

  const renderIdProof = (proofString) => {
    if (!proofString) return <span className="id-proof-text">N/A</span>
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(proofString)
    if (isImage) {
      const imageUrl = `http://localhost:5000/uploads/id_proofs/${proofString}`
      return (
        <img
          src={imageUrl}
          alt="ID Proof"
          className="id-proof-thumbnail clickable"
          onClick={() => setSelectedImage(imageUrl)}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )
    }
    return <span className="id-proof-text">{proofString}</span>
  }

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home className="logo-icon" />
          <h1>GharPata</h1>
        </div>
        <nav className="menu">
          <SidebarItem id="dashboard" label="Overview" icon={LayoutDashboard} />
          <SidebarItem id="pending-users" label="New Users" icon={UserCheck} count={notifCounts.pendingUsers} />
          <SidebarItem id="all-users" label="All Users" icon={Users} />
          <SidebarItem id="properties" label="Property Approvals" icon={AlertTriangle} count={notifCounts.pendingProperties} />
          <SidebarItem id="all-properties" label="Manage Listings" icon={Building} />
          <SidebarItem id="contracts" label="Contract Records" icon={FileText} />
          <SidebarItem id="complaints" label="Complaints" icon={MessageSquare} count={notifCounts.complaints} />
          <SidebarItem id="finance" label="Payments & Agreements" icon={CreditCard} />
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="title-section">
            <h2>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'pending-users' && 'Pending User Approvals'}
              {activeTab === 'all-users' && 'User Management'}
              {activeTab === 'properties' && 'Property Approvals'}
              {activeTab === 'all-properties' && 'Manage All Listings'}
              {activeTab === 'contracts' && 'Contract Renewals & Terminations'}
              {activeTab === 'complaints' && 'User Complaints'}
              {activeTab === 'finance' && 'Payments & Agreements'}
              {activeTab === 'profile' && 'My Profile'}
            </h2>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchData} disabled={loading}><RefreshCw size={18} className={loading ? "spin-icon" : ""} /></button>
            <div className="date-display">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

            <div className="top-bar-user" ref={dropdownRef}>
              <div
                className={`avatar-toggle ${showDropdown ? 'active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="avatar thumb">
                  {(user?.profilePicture || user?.profile_picture) ? (
                    <img
                      src={(user?.profilePicture || user?.profile_picture).startsWith('http')
                        ? (user?.profilePicture || user?.profile_picture)
                        : `http://localhost:5000/uploads/profiles/${user.profilePicture || user.profile_picture}`}
                      alt="P"
                    />
                  ) : (
                    user?.name?.charAt(0) || "A"
                  )}
                </div>
                <ChevronDown size={14} className={`dropdown-arrow ${showDropdown ? 'open' : ''}`} />
              </div>

              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar-large">
                      {(user?.profilePicture || user?.profile_picture) ? (
                        <img
                          src={(user?.profilePicture || user?.profile_picture).startsWith('http')
                            ? (user?.profilePicture || user?.profile_picture)
                            : `http://localhost:5000/uploads/profiles/${user.profilePicture || user.profile_picture}`}
                          alt="P"
                        />
                      ) : (
                        user?.name?.charAt(0) || "A"
                      )}
                    </div>
                    <div className="dropdown-user-info">
                      <span className="dropdown-user-name">{user?.name || "Admin"}</span>
                      <span className="dropdown-user-email">{user?.email || "admin@gharpata.com"}</span>
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
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} /> <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        <div className="tab-content">
          {activeTab === "dashboard" && (
            <>
              {loading && !stats ? (
                <div className="loading-state">Syncing stats...</div>
              ) : stats ? (
                <div className="stats-grid">
                  <StatCard title="Total Active Users" value={stats.totalUsers} icon={Users} onClick={() => setActiveTab('all-users')} colorClass="blue" />
                  <StatCard title="Active Properties" value={stats.totalProperties} icon={Building} colorClass="green" />
                  <StatCard title="Total Bookings" value={stats.totalBookings} icon={CheckCircle} colorClass="purple" />
                  <StatCard title="Total Revenue" value={stats.totalPayments || '0'} icon={CreditCard} colorClass="orange" />
                </div>
              ) : null}
            </>
          )}

          {activeTab === "profile" && (
            <div className="profile-management">
              <div className="profile-header-main">
                <div className="profile-photo-upload">
                  {(user?.profilePicture || user?.profile_picture) ? (
                    <img
                      src={(user?.profilePicture || user?.profile_picture).startsWith('http')
                        ? (user?.profilePicture || user?.profile_picture)
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
                  <h4>{user?.name}</h4>
                  <p>{user?.email} • {user?.role}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                <div className="profile-details-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phone" value={profileData.phone} onChange={handleProfileChange} placeholder="98xxxxxxxx" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Base Address</label>
                    <input type="text" name="address" value={profileData.address} onChange={handleProfileChange} placeholder="Admin Office Location" />
                  </div>
                </div>
                <button type="submit" className="btn-primary-custom btn-save-profile" disabled={updating}>
                  {updating ? "Saving..." : <><Save size={18} /> Update Profile</>}
                </button>
              </form>
            </div>
          )}

          {activeTab === "pending-users" && (
            <div className="table-container">
              {pendingUsers.length === 0 && !loading ? (
                <div className="empty-state"><CheckCircle size={40} /> <p>No pending approvals.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>User</th><th>Role</th><th>Contact</th><th>ID Proof</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.id}>
                        <td><div className="user-name">{u.name}</div><div className="user-email">{u.email}</div></td>
                        <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                        <td>{u.phone}</td>
                        <td><div className="id-proof-wrapper"><span className="id-proof-type">{u.idProofType}</span>{renderIdProof(u.idProof)}</div></td>
                        <td><div className="actions-cell">
                          <button className="btn-action btn-approve" onClick={() => handleApproveUser(u.id)}><CheckCircle size={16} /> Approve</button>
                          <button className="btn-action btn-reject" onClick={() => handleRejectUser(u.id)}><XCircle size={16} /> Reject</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "all-users" && (
            <div className="table-container">
              {allUsers.length === 0 && !loading ? (
                <div className="empty-state"><Users size={40} /> <p>No users found in the system yet.</p></div>
              ) : (
                <table className="user-management-table">
                  <thead>
                    <tr><th>Identity</th><th>Role</th><th>Status</th><th>Verification</th><th>Member Since</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => {
                      const isExpanded = usersExpanded === u.id;
                      return (
                        <Fragment key={u.id}>
                          <tr className={isExpanded ? 'expanded-row-base' : ''}>
                            <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div className="avatar thumb" style={{ width: '36px', height: '36px' }}>
                                     {u.profile_picture || u.profilePicture ? (
                                        <img src={(u.profile_picture || u.profilePicture).startsWith('http') ? (u.profile_picture || u.profile_picture) : `http://localhost:5000/uploads/profiles/${u.profile_picture || u.profilePicture}`} alt="U" />
                                     ) : u.name?.charAt(0)}
                                  </div>
                                  <div>
                                     <div className="user-name">{u.name}</div>
                                     <div className="user-email">{u.email}</div>
                                  </div>
                               </div>
                            </td>
                            <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                            <td><span className={`badge ${u.isApproved ? 'success' : 'warning'}`}>{u.isApproved ? 'Active' : 'Pending Verification'}</span></td>
                            <td><span className="id-proof-type">{u.idProofType}</span></td>
                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                               <div className="actions-cell">
                                  <button 
                                    className={`btn-action btn-view ${isExpanded ? 'btn-active' : ''}`}
                                    onClick={() => setUsersExpanded(isExpanded ? null : u.id)}
                                    style={{ padding: '6px 12px' }}
                                  >
                                    {isExpanded ? 'Hide' : 'Review Details'}
                                  </button>
                                  <button className="action-btn-danger" onClick={() => handleDeleteUser(u.id)} style={{ padding: '8px' }}><Trash2 size={16} /></button>
                               </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="user-detail-row">
                               <td colSpan="6">
                                  <div className="user-full-detail-panel fade-in">
                                     <div className="detail-grid-3">
                                        <div className="detail-item">
                                           <label className="admin-field-label">Primary Contact</label>
                                           <div className="detail-value">{u.phone || 'No phone recorded'}</div>
                                        </div>
                                        <div className="detail-item">
                                           <label className="admin-field-label">Residential/Base Address</label>
                                           <div className="detail-value">{u.address || 'Address not provided'}</div>
                                        </div>
                                        <div className="detail-item">
                                           <label className="admin-field-label">Official ID Evidence</label>
                                           <div className="id-proof-box">
                                              {renderIdProof(u.idProof)}
                                           </div>
                                        </div>
                                     </div>
                                     <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                                        <div className="info-icon" style={{ color: '#4f46e5' }}><AlertTriangle size={18} /></div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                                           <strong>Administrative Note:</strong> This user was registered via 
                                           {u.email.includes('google') ? ' Google OAuth ' : ' standard email registration '} 
                                           and is currently {u.isApproved ? ' fully verified ' : ' awaiting manual ID validation ' } 
                                           by the administrative board.
                                        </div>
                                     </div>
                                  </div>
                               </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "properties" && (
            <div className="table-container">
              {pendingProperties.length === 0 && !loading ? (
                <div className="empty-state"><Home size={40} /> <p>No pending properties.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Property</th><th>Landlord</th><th>Type</th><th>Rent</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {pendingProperties.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="property-preview-cell">
                            {p.images && p.images.length > 0 ? (
                              <img
                                src={`http://localhost:5000/uploads/properties/${p.images[0]}`}
                                alt={p.title}
                                className="admin-prop-thumb"
                              />
                            ) : (
                              <div className="admin-prop-thumb-placeholder"><Home size={16} /></div>
                            )}
                            <div>
                              <div className="user-name">{p.title}</div>
                              <div className="user-email">{p.address}</div>
                            </div>
                          </div>
                        </td>
                        <td>{p.landlordName}</td>
                        <td><span className="badge info">{p.type}</span></td>
                        <td>Rs. {p.rentPrice}</td>
                        <td><div className="actions-cell">
                          <button className="btn-action btn-view" onClick={() => handleViewProperty(p.id)} title="View Details"><Eye size={16} /> View</button>
                          <button className="btn-action btn-approve" onClick={() => handleApproveProperty(p.id)}><CheckCircle size={16} /> Approve</button>
                          <button className="btn-action btn-reject" onClick={() => handleRejectProperty(p.id)}><XCircle size={16} /> Reject</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "all-properties" && (
            <div className="table-container">
              {allProperties.length === 0 && !loading ? (
                <div className="empty-state"><Home size={40} /> <p>No properties found.</p></div>
              ) : (
                <table className="manage-listings-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Landlord</th>
                      <th>Rent / Month</th>
                      <th>Status</th>
                      <th>Approval</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProperties.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="property-preview-cell">
                            {p.images && p.images.length > 0 ? (
                              <img
                                src={`http://localhost:5000/uploads/properties/${p.images[0]}`}
                                alt={p.title}
                                className="admin-prop-thumb"
                              />
                            ) : (
                              <div className="admin-prop-thumb-placeholder"><Home size={16} /></div>
                            )}
                            <div>
                              <div className="user-name">{p.title}</div>
                              <div className="user-email">{p.address}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="user-name">{p.landlordName}</div>
                        </td>
                        <td>
                          <span className="rent-value">Rs. {Number(p.rentPrice || 0).toLocaleString()}</span>
                        </td>
                        <td>
                          <span className={`badge ${p.status === 'available' ? 'success' : 'warning'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.isApproved ? 'success' : 'warning'}`}>
                            {p.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="td-actions">
                          <div className="actions-cell-compact">
                            <button
                              className="btn-action btn-view"
                              onClick={() => handleViewProperty(p.id)}
                              title="View Property"
                            >
                              <Eye size={15} /> View
                            </button>
                            <button
                              className="action-btn-danger"
                              onClick={() => handleRejectProperty(p.id)}
                              title="Remove Listing"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "contracts" && (
            <div className="table-container">
              <div className="header-row" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <div>
                  <h3>Platform Contract Records</h3>
                  <p className="header-subtitle">Digital records of all lease renewal and termination requests</p>
                </div>
              </div>

              {contractRequests.length === 0 && !loading ? (
                <div className="empty-state"><FileText size={40} /> <p>No contract requests on record.</p></div>
              ) : (
                <table className="contracts-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Landlord</th>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractRequests.map(req => (
                      <tr key={req.id}>
                        <td>
                          <div className="contract-user-info">
                            <div className="user-name">{req.tenantName}</div>
                          </div>
                        </td>
                        <td>
                          <div className="contract-user-info">
                            <div className="user-name">{req.landlordName}</div>
                          </div>
                        </td>
                        <td>
                          <div className="property-title" title={req.propertyTitle}>
                            {req.propertyTitle}
                          </div>
                        </td>
                        <td>
                          <span className={`badge contract-type ${req.type === 'renewal' ? 'info' : 'warning'}`}>
                            {req.type === 'renewal' ? 'RENEWAL' : 'TERMINATION'}
                          </span>
                        </td>
                        <td>
                          <div className="contract-details">
                            {req.type === 'renewal' 
                              ? req.renewalYears ? `${req.renewalYears} Year(s)` : 'Not specified' 
                              : req.requestedVacateDate ? new Date(req.requestedVacateDate).toLocaleDateString() : 'Not specified'}
                          </div>
                        </td>
                        <td>
                          <div className="contract-date">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <span className={`badge contract-status ${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'pending'}`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "complaints" && (
            <div className="complaints-tab">
              {/* Stats summary bar */}
              {!loading && complaints.length > 0 && (
                <div className="c-stats-bar">
                  {[
                    { label: 'Total Tickets', val: complaints.length, col: '#4f46e5' },
                    { label: 'Pending Action', val: complaints.filter(x => x.status === 'PENDING').length, col: '#f59e0b' },
                    { label: 'Active Investigation', val: complaints.filter(x => x.status === 'IN_PROGRESS').length, col: '#3b82f6' },
                    { label: 'Resolution Review', val: complaints.filter(x => x.status === 'RESOLVED').length, col: '#10b981' },
                    { label: 'High Priority', val: complaints.filter(x => x.severity === 'high').length, col: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} className="c-stat-chip">
                      <span className="c-stat-num" style={{ color: s.col }}>{s.val}</span>
                      <span className="c-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {complaints.length === 0 && !loading ? (
                <div className="empty-state"><MessageSquare size={40} /><p>No complaints filed yet.</p></div>
              ) : (
                <div className="c-tickets-list">
                  {complaints.map(c => {
                    const isExpanded = complaintsExpanded === c.id
                    const comments = Array.isArray(c.comments) ? c.comments : []
                    const selectedStatus = adminStatusSelections[c.id] || c.status
                    const sevColor = c.severity === 'high' ? '#ef4444' : c.severity === 'medium' ? '#f59e0b' : '#10b981';

                    return (
                      <div key={c.id} className={`c-ticket ${isExpanded ? 'c-ticket-open' : ''}`}>
                        <div className="c-sev-bar" style={{ background: sevColor }} />

                        <div className="c-ticket-header" onClick={() => setComplaintsExpanded(isExpanded ? null : c.id)}>
                          <div className="c-ticket-left">
                            <span className="c-ticket-id">#{c.id.toString().padStart(4, '0')}</span>
                            <div className="c-ticket-title-block">
                              <div className="c-ticket-title" title={c.title}>{c.title}</div>
                              <span className="complaint-cat-badge">{c.category}</span>
                            </div>
                          </div>

                          <div className="c-ticket-date">
                            <Calendar size={14} style={{ color: '#94a3b8' }} />
                            <span className="c-date-text">
                              {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            </span>
                          </div>

                          <div className="c-party">
                            <div className="c-party-ava c-ava-tenant">{(c.tenantName || '?').charAt(0)}</div>
                            <div className="c-party-info">
                              <span className="c-party-role">From</span>
                              <span className="c-party-name">{c.tenantName || 'Tenant'}</span>
                            </div>
                          </div>

                          <span className="c-arrow">→</span>

                          <div className="c-party">
                            <div className="c-party-ava c-ava-landlord">{(c.landlordName || '?').charAt(0)}</div>
                            <div className="c-party-info">
                              <span className="c-party-role">Against</span>
                              <span className="c-party-name">{c.landlordName || 'Owner'}</span>
                            </div>
                          </div>

                          <div className="c-ticket-right" onClick={e => e.stopPropagation()}>
                            <span className={`c-status-badge status-${c.status.toLowerCase().replace(/_/g, '')}`}>
                              {c.status.replace(/_/g, ' ')}
                            </span>
                            
                            <div className="c-override-row">
                                <select
                                  value={selectedStatus}
                                  onChange={e => setAdminStatusSelections(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="c-status-select"
                                  title="Change complaint status"
                                >
                                  {ADMIN_STATUSES.map(s => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
                                </select>
                                <button className={`btn-admin-apply ${selectedStatus !== c.status ? 'status-changed' : 'status-current'}`} 
                                        onClick={() => handleComplaintUpdate(c.id, selectedStatus)} 
                                        disabled={selectedStatus === c.status}>
                                  {selectedStatus !== c.status ? <Save size={14} /> : <CheckCircle size={14} />} 
                                  <span>{selectedStatus !== c.status ? 'Update' : 'Current'}</span>
                                </button>
                              </div>

                            <div className="ticket-exp-icon" style={{ cursor: 'pointer' }} onClick={() => setComplaintsExpanded(isExpanded ? null : c.id)}>
                               {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="c-ticket-body">
                            <div className="detail-audit-grid">
                              <div className="audit-note admin">
                                 <span className="note-title"><UserCheck size={14} /> Participants Context</span>
                                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                       <span className="c-party-role" style={{ fontSize: '0.6rem' }}>Tenant Contact</span>
                                       <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.tenantEmail}</p>
                                    </div>
                                    <div>
                                       <span className="c-party-role" style={{ fontSize: '0.6rem' }}>Owner Contact</span>
                                       <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.landlordEmail}</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="audit-note" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                 <span className="note-title" style={{ color: '#64748b' }}><AlertTriangle size={14} /> Description Reference</span>
                                 <p style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', fontWeight: 600 }}>"{c.description}"</p>
                              </div>
                            </div>

                            <div className="detail-section">
                               <label className="detail-label">Communication & Interventions</label>
                               <div className="comments-thread">
                                  {comments.length === 0 ? (
                                    <p className="no-comments">No record yet.</p>
                                  ) : (
                                    comments.map((cm, idx) => (
                                      <div key={idx} className={`comment-bubble ${cm.role === 'admin' ? 'mine' : 'other'}`}>
                                        <div className="comment-meta">
                                          <span className="bold">{cm.name}</span>
                                          <span className={`role-tag role-${cm.role}`}>{cm.role}</span>
                                          <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="comment-box">{cm.comment}</div>
                                      </div>
                                    ))
                                  )}

                                  <div className="comment-reply-box">
                                    <input
                                      type="text"
                                      placeholder="Official admin record comment…"
                                      value={complaintsExpanded === c.id ? commentText : ''}
                                      onChange={e => setCommentText(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleAddComment(c.id) }}
                                    />
                                    <button className="btn-admin-apply" onClick={() => handleAddComment(c.id)} disabled={submittingComment || !commentText.trim()}>
                                      {submittingComment ? '…' : 'Post'}
                                    </button>
                                  </div>
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
          {activeTab === "finance" && (
            <div className="finance-tab box-container">
              <div className="finance-header-bar">
                <div className="finance-stat">
                  <span className="f-label">Total Volume</span>
                  <span className="f-value">Rs. {payments.reduce((acc, p) => acc + (p.status === 'completed' ? parseFloat(p.amount) : 0), 0).toLocaleString()}</span>
                </div>
                <div className="finance-stat">
                  <span className="f-label">Active Agreements</span>
                  <span className="f-value">{allBookings.filter(b => b.status === 'active' || b.status === 'active_contract').length}</span>
                </div>
                <div className="finance-stat">
                  <span className="f-label">Admin Volume</span>
                  <span className="f-value">Rs. {(payments.reduce((acc, p) => acc + (p.status === 'completed' ? parseFloat(p.amount) : 0), 0) * 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="finance-layout">
                <div className="finance-block">
                  <div className="block-title">Recent Transaction Ledger ({payments.length})</div>
                  <div className="table-wrapper">
                    <table className="f-table">
                      <thead>
                        <tr>
                          <th>TXN ID</th>
                          <th>Property / Asset</th>
                          <th>Tenant Context</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Execution Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan="7" className="empty-text">No transaction logs available.</td></tr>
                        ) : payments.map(p => (
                          <tr key={p.id}>
                            <td className="bold">#{p.id.toString().padStart(4, '0')}</td>
                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.propertyTitle || 'Asset Listing'}</td>
                            <td>
                               <div className="party-stack">
                                  <span className="bold" style={{ fontSize: '0.85rem' }}>{p.tenantEmail.split('@')[0]}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.tenantEmail}</span>
                               </div>
                            </td>
                            <td>
                               <span className={`method-tag ${p.paymentType === 'deposit' ? 'deposit-type' : ''}`}>
                                 {p.paymentType || 'Payment'}
                               </span>
                            </td>
                            <td className="bold" style={{ color: '#4f46e5' }}>Rs. {parseFloat(p.amount).toLocaleString()}</td>
                            <td>
                               <span className={`status-pill status-${p.status.toLowerCase()}`}>
                                 {p.status}
                               </span>
                            </td>
                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="finance-block">
                  <div className="block-title">Lease Agreements & Escrow ({allBookings.length})</div>
                  <div className="table-wrapper">
                    <table className="f-table">
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Stakeholders</th>
                          <th>Escrow/Deposit</th>
                          <th>Status</th>
                          <th>Agreement Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBookings.length === 0 ? (
                          <tr><td colSpan="5" className="empty-text">No active bookings recorded.</td></tr>
                        ) : allBookings.map(b => (
                          <tr key={b.id}>
                            <td className="bold">#{b.id.toString().padStart(4, '0')}</td>
                            <td>
                               <div className="party-stack">
                                  <div className="p-row"><strong>Tenant:</strong> {b.tenantName || 'User'}</div>
                                  <div className="p-row"><strong>Landlord:</strong> {b.landlordName || 'Owner'}</div>
                               </div>
                            </td>
                            <td className="bold" style={{ color: '#4f46e5' }}>Rs. {parseFloat(b.depositAmount).toLocaleString()}</td>
                            <td>
                               <span className={`status-pill status-${b.status.toLowerCase().replace(/_/g, '')}`}>
                                 {b.status.replace(/_/g, ' ')}
                               </span>
                            </td>
                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setSelectedImage(null)}><X size={20} /></button>
            <img src={selectedImage} alt="ID Proof" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
