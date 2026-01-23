import { useState, useEffect, useCallback } from "react"
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
  Eye
} from "lucide-react"
import "./AdminDashboard.css"

function AdminDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(initialUser)
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
      setProfileData({
        name: response.data.name,
        phone: response.data.phone || "",
        address: response.data.address || ""
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
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
      } else if (activeTab === "profile") {
        await fetchProfile()
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
  }, [fetchData])

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

  const handleComplaintUpdate = async (complaintId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/complaints/${complaintId}/status`, { status: "resolved" }, { headers })
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: 'resolved' } : c))
      alert("Marked as resolved")
    } catch (error) {
      alert("Error updating complaint")
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

  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button
      className={`menu-item ${activeTab === id ? "active" : ""}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={20} />
      <span>{label}</span>
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
          <SidebarItem id="pending-users" label="New Users" icon={UserCheck} />
          <SidebarItem id="all-users" label="All Users" icon={Users} />
          <SidebarItem id="properties" label="Property Approvals" icon={AlertTriangle} />
          <SidebarItem id="all-properties" label="Manage Listings" icon={Building} />
          <SidebarItem id="complaints" label="Complaints" icon={MessageSquare} />
          <SidebarItem id="profile" label="My Profile" icon={User} />
        </nav>
        <div className="user-profile">
          <div className="avatar">
            {user?.profilePicture ? (
              <img
                src={`http://localhost:5000/uploads/profiles/${user.profilePicture}`}
                alt="P"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              user?.name?.charAt(0) || "A"
            )}
          </div>
          <div className="user-info">
            <h4>{user?.name || "Admin"}</h4>
            <span>Administrator</span>
          </div>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <button onClick={handleLogoutClick} className="logout-btn">
            <LogOut size={18} /> Logout
          </button>
        </div>
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
              {activeTab === 'complaints' && 'User Complaints'}
              {activeTab === 'profile' && 'My Profile'}
            </h2>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchData} disabled={loading}><RefreshCw size={18} className={loading ? "spin-icon" : ""} /></button>
            <div className="date-display">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
                  {user?.profilePicture ? (
                    <img
                      src={`http://localhost:5000/uploads/profiles/${user.profilePicture}`}
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
                <div className="empty-state"><Users size={40} /> <p>No users found.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>User Credentials</th><th>Role</th><th>Contact</th><th>ID Proof</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td><div className="user-name">{u.name}</div><div className="user-email">{u.email}</div></td>
                        <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                        <td>{u.phone}</td>
                        <td><div className="id-proof-wrapper"><span className="id-proof-type">{u.idProofType}</span>{renderIdProof(u.idProof)}</div></td>
                        <td><span className={`badge ${u.isApproved ? 'success' : 'warning'}`}>{u.isApproved ? 'Active' : 'Pending'}</span></td>
                        <td><button className="action-btn-danger" onClick={() => handleDeleteUser(u.id)}><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
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
                <table>
                  <thead>
                    <tr><th>Property</th><th>Landlord</th><th>Status</th><th>Approval</th><th>Action</th></tr>
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
                        <td>{p.landlordName}</td>
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
                        <td>
                          <div className="actions-cell">
                            <button className="btn-action btn-view" onClick={() => handleViewProperty(p.id)} title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className="action-btn-danger" onClick={() => handleRejectProperty(p.id)} title="Remove Listing">
                              <Trash2 size={16} />
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

          {activeTab === "complaints" && (
            <div className="table-container">
              {complaints.length === 0 && !loading ? (
                <div className="empty-state"><MessageSquare size={40} /> <p>No complaints.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Issue</th><th>Category</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {complaints.map(c => (
                      <tr key={c.id}>
                        <td><div className="user-name">{c.title}</div><div className="user-email">{c.severity}</div></td>
                        <td>{c.category}</td>
                        <td><span className={`badge ${c.status === 'resolved' ? 'success' : 'danger'}`}>{c.status}</span></td>
                        <td>{c.status !== 'resolved' && <button className="btn-action btn-approve" onClick={() => handleComplaintUpdate(c.id)}><CheckCircle size={16} /> Resolve</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
