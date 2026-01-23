"use client"

import { useState, useEffect, useCallback } from "react"
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
  XCircle
} from "lucide-react"
import "./TenantDashboard.css"

function TenantDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(initialUser)
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [complaints, setComplaints] = useState([])
  const [payments, setPayments] = useState([])
  const [activeTab, setActiveTab] = useState("properties")
  const [loading, setLoading] = useState(true)
  const [searchFilters, setSearchFilters] = useState({ city: "", priceMin: "", priceMax: "" })

  // Profile Update State
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || ""
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
      } else if (activeTab === "payments") {
        const response = await axios.get("/api/payments", { headers })
        setPayments(response.data)
      } else if (activeTab === "profile") {
        await fetchProfile()
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, token, user.id, searchFilters, fetchProfile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      const response = await axios.post("/api/users/profile-picture", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      })
      alert("Profile picture updated")
      fetchProfile()
    } catch (error) {
      alert("Error uploading photo: " + (error.response?.data?.message || error.message))
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

  return (
    <div className="tenant-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home className="logo-icon" style={{ color: 'var(--primary)' }} />
          <h1 className="brand-title">GharPata</h1>
        </div>

        <nav className="menu">
          <SidebarItem id="properties" label="Find Home" icon={Search} />
          <SidebarItem id="bookings" label="My Bookings" icon={Calendar} />
          <SidebarItem id="complaints" label="Complaints" icon={MessageSquare} />
          <SidebarItem id="payments" label="Payments" icon={Wallet} />
          <SidebarItem id="profile" label="My Profile" icon={User} />
        </nav>

        <div className="profile-section">
          <div className="profile-content">
            <div className="profile-avatar">
              {user.profilePicture ? (
                <img
                  src={`http://localhost:5000/uploads/profiles/${user.profilePicture}`}
                  alt="P"
                  className="sidebar-avatar-img"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div>
              <div className="profile-name">{user.name}</div>
              <div className="profile-role">Tenant Account</div>
            </div>
          </div>
          <button onClick={handleLogoutClick} className="logout-button-custom">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h2>
            {activeTab === 'properties' && 'Find Your Perfect Home'}
            {activeTab === 'bookings' && 'My Rental Bookings'}
            {activeTab === 'complaints' && 'Support & Complaints'}
            {activeTab === 'payments' && 'Payment History'}
            {activeTab === 'profile' && 'Manage Profile'}
          </h2>
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
                  {user.profilePicture ? (
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
            {loading ? <p>Loading...</p> : bookings.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} color="var(--text-muted)" />
                <p>You haven't made any bookings yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Move In Date</th>
                      <th>Monthly Rent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="table-cell-title">{booking.title}</td>
                        <td>{new Date(booking.moveInDate).toLocaleDateString()}</td>
                        <td className="table-cell-price">Rs. {booking.monthlyRent.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${booking.status}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "complaints" && (
          <div className="tab-content">
            {loading ? <p>Loading...</p> : (
              <div className="complaints-grid">
                {complaints.map((c) => (
                  <div key={c.id} className="complaint-card">
                    <div className="complaint-header">
                      <h4 className="complaint-title">{c.title}</h4>
                      <span className={`badge ${c.status === 'resolved' ? 'active' : 'pending'}`}>{c.status}</span>
                    </div>
                    <p className="complaint-desc">{c.description}</p>
                    <div className="complaint-meta">
                      Category: {c.category} • Severity: {c.severity}
                    </div>
                  </div>
                ))}
                {complaints.length === 0 && (
                  <div className="empty-state-card">
                    <MessageSquare size={48} />
                    <p>No complaints filed.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="tab-content">
            {loading ? <p>Loading...</p> : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="table-cell-cap">{p.paymentType}</td>
                        <td className="table-cell-price">Rs. {p.amount.toLocaleString()}</td>
                        <td><span className={`badge ${p.status === 'completed' ? 'active' : 'pending'}`}>{p.status}</span></td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan="4" className="table-empty-msg">No payment records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default TenantDashboard
