"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Building,
  Home,
  PlusCircle,
  ClipboardList,
  Wallet,
  LogOut,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Camera,
  Save,
  Edit
} from "lucide-react"
import "./LandlordDashboard.css"

function LandlordDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(initialUser)
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [activeTab, setActiveTab] = useState("properties")
  const [loading, setLoading] = useState(true)
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    district: "",
    type: "apartment",
    bhkType: "1BHK",
    bedrooms: 1,
    bathrooms: 1,
    area: "",
    rentPrice: "",
    depositAmount: "",
    amenities: [],
    facilities: {
      homeFacilities: [],
      surroundingFacilities: []
    },
    rules: "",
  })
  const [propertyImages, setPropertyImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [verificationDocs, setVerificationDocs] = useState([])
  const [docPreviews, setDocPreviews] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [existingDocs, setExistingDocs] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editPropertyId, setEditPropertyId] = useState(null)

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
        const response = await axios.get("/api/users/my-properties", { headers })
        setProperties(response.data)
      } else if (activeTab === "bookings") {
        const response = await axios.get(`/api/bookings/user/${user.id}`, { headers })
        setBookings(response.data)
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
  }, [activeTab, token, user.id, fetchProfile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + propertyImages.length > 5) {
      alert("You can only upload up to 5 images per property.")
      return
    }

    setPropertyImages([...propertyImages, ...files])

    const newPreviews = files.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index) => {
    const newImages = propertyImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setPropertyImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleDocChange = (e) => {
    const files = Array.from(e.target.files)
    setVerificationDocs([...verificationDocs, ...files])
    const newPreviews = files.map(file => ({
      name: file.name,
      type: file.type,
      url: file.type.includes('image') ? URL.createObjectURL(file) : null
    }))
    setDocPreviews([...docPreviews, ...newPreviews])
  }

  const removeDoc = (index) => {
    const newDocs = verificationDocs.filter((_, i) => i !== index)
    const newPreviews = docPreviews.filter((_, i) => i !== index)
    setVerificationDocs(newDocs)
    setDocPreviews(newPreviews)
  }

  const handleFacilityToggle = (category, facility) => {
    const currentFacilities = { ...formData.facilities }
    const index = currentFacilities[category].indexOf(facility)
    if (index === -1) {
      currentFacilities[category].push(facility)
    } else {
      currentFacilities[category].splice(index, 1)
    }
    setFormData({ ...formData, facilities: currentFacilities })
  }

  const handleAddProperty = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = new FormData()
      Object.keys(formData).forEach(key => {
        if (key === 'amenities' || key === 'facilities') {
          data.append(key, JSON.stringify(formData[key]))
        } else {
          data.append(key, formData[key])
        }
      })

      propertyImages.forEach(image => {
        data.append('images', image)
      })

      verificationDocs.forEach(doc => {
        data.append('documents', doc)
      })

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }

      if (isEditing) {
        await axios.put(`/api/properties/${editPropertyId}`, data, { headers })
        alert("Property updated successfully!")
      } else {
        await axios.post("/api/properties", data, { headers })
        alert("Property listed successfully! Pending admin approval.")
      }

      setShowNewPropertyForm(false)
      setIsEditing(false)
      setEditPropertyId(null)
      setFormData({
        title: "", description: "", address: "", city: "", district: "",
        type: "apartment", bhkType: "1BHK", bedrooms: 1, bathrooms: 1, area: "",
        rentPrice: "", depositAmount: "", amenities: [], rules: "",
        facilities: { homeFacilities: [], surroundingFacilities: [] }
      })
      setPropertyImages([])
      setImagePreviews([])
      setVerificationDocs([])
      setDocPreviews([])
      setExistingDocs([])
      fetchData()
    } catch (error) {
      alert(`Error ${isEditing ? 'updating' : 'adding'} property: ` + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (property) => {
    setFormData({
      title: property.title,
      description: property.description || "",
      address: property.address,
      city: property.city || "",
      district: property.district || "",
      type: property.type,
      bhkType: property.bhkType || (property.type === 'apartment' || property.type === 'house' ? '1BHK' : ''),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      rentPrice: property.rentPrice,
      depositAmount: property.depositAmount || "",
      amenities: property.amenities || [],
      facilities: typeof property.facilities === 'string' ? JSON.parse(property.facilities) : (property.facilities || { homeFacilities: [], surroundingFacilities: [] }),
      rules: property.rules || "",
    })
    setEditPropertyId(property.id)
    setIsEditing(true)
    setShowNewPropertyForm(true)
    // Clear image selections when starting edit (backend keeps old ones if no new ones sent)
    setPropertyImages([])
    setImagePreviews([])
    setVerificationDocs([])
    setDocPreviews([])
    setExistingImages(property.images || [])
    setExistingDocs(property.verificationDocuments || [])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelForm = () => {
    setShowNewPropertyForm(false)
    setIsEditing(false)
    setEditPropertyId(null)
    setFormData({
      title: "", description: "", address: "", city: "", district: "",
      type: "apartment", bhkType: "1BHK", bedrooms: 1, bathrooms: 1, area: "",
      rentPrice: "", depositAmount: "", amenities: [], rules: "",
      facilities: { homeFacilities: [], surroundingFacilities: [] }
    })
    setPropertyImages([])
    setImagePreviews([])
    setExistingImages([])
    setVerificationDocs([])
    setDocPreviews([])
    setExistingDocs([])
  }

  const handleApproveBooking = async (bookingId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/bookings/${bookingId}/status`, { status: "approved" }, { headers })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'approved' } : b))
      alert("Booking approved")
    } catch (error) {
      alert("Error approving booking")
    }
  }

  const handleRejectBooking = async (bookingId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`/api/bookings/${bookingId}/status`, { status: "rejected" }, { headers })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b))
      alert("Booking rejected")
    } catch (error) {
      alert("Error rejecting booking")
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

  return (
    <div className="landlord-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home className="logo-icon" style={{ color: 'var(--primary)' }} />
          <h1 className="brand-title">GharPata</h1>
        </div>

        <nav className="menu">
          <SidebarItem id="properties" label="Properties" icon={Building} />
          <SidebarItem id="bookings" label="Booking Requests" icon={ClipboardList} />
          <SidebarItem id="payments" label="Rent Received" icon={Wallet} />
          <SidebarItem id="profile" label="My Profile" icon={User} />
        </nav>

        <div className="profile-section">
          <div className="profile-content">
            <div className="profile-avatar">
              {user.profilePicture ? (
                <img
                  src={`http://localhost:5000/uploads/profiles/${user.profilePicture}`}
                  alt="P"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div>
              <div className="profile-name">{user.name}</div>
              <div className="profile-role">Landlord Account</div>
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
            {activeTab === 'properties' && 'Manage Properties'}
            {activeTab === 'bookings' && 'Booking Management'}
            {activeTab === 'payments' && 'Financial Overview'}
            {activeTab === 'profile' && 'My Profile'}
          </h2>
        </header>

        {activeTab === "properties" && (
          <div className="tab-content">
            <div className="header-row">
              <div>
                <h3>Your Listings</h3>
                <p className="header-subtitle">Manage and track your property status</p>
              </div>
              <button className="btn-primary" onClick={showNewPropertyForm ? cancelForm : () => setShowNewPropertyForm(true)}>
                {showNewPropertyForm ? <XCircle size={18} /> : <PlusCircle size={18} />}
                {showNewPropertyForm ? "Cancel" : "Add Property"}
              </button>
            </div>

            {showNewPropertyForm && (
              <form onSubmit={handleAddProperty} className="property-form">
                <h3 className="section-title">{isEditing ? "Edit Property" : "List New Property"}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Property Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleFormChange} required placeholder="e.g. Sunny Apartment in Kathmandu" />
                  </div>
                  <div className="form-group">
                    <label>Property Type</label>
                    <select name="type" value={formData.type} onChange={handleFormChange}>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="room">Room</option>
                      <option value="land">Land</option>
                    </select>
                  </div>

                  {(formData.type === 'apartment' || formData.type === 'house') && (
                    <div className="form-group">
                      <label>BHK Type</label>
                      <div className="bhk-input-group">
                        <select
                          name="bhkTypeSelect"
                          value={['1BHK', '2BHK', '3BHK', '4BHK'].includes(formData.bhkType) ? formData.bhkType : 'Custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'Custom') {
                              setFormData({ ...formData, bhkType: e.target.value })
                            } else {
                              setFormData({ ...formData, bhkType: '' })
                            }
                          }}
                        >
                          <option value="1BHK">1 BHK</option>
                          <option value="2BHK">2 BHK</option>
                          <option value="3BHK">3 BHK</option>
                          <option value="4BHK">4 BHK</option>
                          <option value="Custom">Custom BHK</option>
                        </select>
                        {!['1BHK', '2BHK', '3BHK', '4BHK'].includes(formData.bhkType) && (
                          <input
                            type="text"
                            name="bhkType"
                            placeholder="e.g. 5BHK or Studio"
                            value={formData.bhkType}
                            onChange={handleFormChange}
                            required
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group form-mb">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Describe the property features..." rows="3"></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Bedrooms</label>
                    <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label>Bathrooms</label>
                    <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label>Area (sq ft)</label>
                    <input type="number" name="area" value={formData.area} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Monthly Rent (Rs.)</label>
                    <input type="number" name="rentPrice" value={formData.rentPrice} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label>Deposit Amount (Rs.)</label>
                    <input type="number" name="depositAmount" value={formData.depositAmount} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-group form-mb-lg">
                  <label>House Rules</label>
                  <textarea name="rules" value={formData.rules} onChange={handleFormChange} rows="2"></textarea>
                </div>

                <div className="facilities-selection-section form-mb-lg">
                  <h4 className="subsection-title">Home Facilities</h4>
                  <div className="facilities-grid">
                    {['AC', 'Heater', 'WiFi', 'Swimming Pool', 'Gym', 'Security', 'Elevator', 'Balcony', 'Parking', 'Garden', 'Non Furnished', 'Semi-Furnished', 'Fully Furnished'].map(facility => (
                      <label key={facility} className="facility-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.facilities.homeFacilities.includes(facility)}
                          onChange={() => handleFacilityToggle('homeFacilities', facility)}
                        />
                        <span>{facility}</span>
                      </label>
                    ))}
                  </div>

                  <h4 className="subsection-title" style={{ marginTop: '20px' }}>Surrounding Facilities</h4>
                  <div className="facilities-grid">
                    {['Hospital', 'School', 'College', 'Shopping Mall', 'Public Transport', 'Restaurant', 'Bank', 'Pharmacy', 'Police Station'].map(facility => (
                      <label key={facility} className="facility-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.facilities.surroundingFacilities.includes(facility)}
                          onChange={() => handleFacilityToggle('surroundingFacilities', facility)}
                        />
                        <span>{facility}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group form-mb-lg">
                  <label>Property Verification Documents (Lalpurja / Lease Agreement) *</label>
                  <p className="field-hint">Please provide legal proof of ownership. This will be verified by the admin.</p>

                  {isEditing && existingDocs.length > 0 && verificationDocs.length === 0 && (
                    <div className="existing-docs-preview">
                      <p className="preview-label">Current Documents:</p>
                      <div className="doc-pills">
                        {existingDocs.map((doc, idx) => (
                          <div key={idx} className="doc-pill">
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="multi-image-upload-wrapper">
                    <label className="image-upload-box">
                      <ClipboardList size={24} />
                      <span>Upload Documents</span>
                      <input type="file" multiple onChange={handleDocChange} accept="image/*,application/pdf" hidden />
                    </label>

                    <div className="doc-previews-list">
                      {docPreviews.map((preview, index) => (
                        <div key={index} className="doc-preview-item">
                          {preview.type.includes('image') ? (
                            <img src={preview.url} alt={`Doc ${index}`} className="doc-thumb" />
                          ) : (
                            <div className="doc-icon-placeholder"><ClipboardList size={20} /></div>
                          )}
                          <span className="doc-name">{preview.name}</span>
                          <button type="button" className="remove-preview" onClick={() => removeDoc(index)}>
                            <XCircle size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group form-mb-lg">
                  <label>Property Images {isEditing ? "(Upload new images to REPLACE existing ones)" : "(Max 5)"}</label>

                  {isEditing && existingImages.length > 0 && propertyImages.length === 0 && (
                    <div className="existing-images-preview">
                      <p className="preview-label">Current Images:</p>
                      <div className="image-previews-grid">
                        {existingImages.map((img, idx) => (
                          <div key={idx} className="preview-item">
                            <img src={`http://localhost:5000/uploads/properties/${img}`} alt={`Current ${idx}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="multi-image-upload-wrapper">
                    <label className="image-upload-box">
                      <Camera size={24} />
                      <span>Add Photos</span>
                      <input type="file" multiple onChange={handleImageChange} accept="image/*" hidden />
                    </label>

                    <div className="image-previews-grid">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="preview-item">
                          <img src={preview} alt={`Preview ${index}`} />
                          <button type="button" className="remove-preview" onClick={() => removeImage(index)}>
                            <XCircle size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary btn-lg" disabled={loading}>
                    <Save size={20} /> {isEditing ? "Update Property" : "List Property"}
                  </button>
                </div>
              </form>
            )}

            {loading ? <p>Loading...</p> : properties.length === 0 ? (
              <div className="empty-state-card">
                <Building size={48} />
                <p>No properties listed. Add your first one above!</p>
              </div>
            ) : (
              <div className="grid">
                {properties.map((property) => (
                  <div key={property.id} className="property-card">
                    <div className="property-image-container">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={`http://localhost:5000/uploads/properties/${property.images[0]}`}
                          alt={property.title}
                          className="property-main-img"
                        />
                      ) : (
                        <div className="property-img-placeholder">
                          <Home size={32} />
                        </div>
                      )}
                      <div className="property-status">
                        {property.isApproved ? (
                          <span className="badge approved">Approved</span>
                        ) : (
                          <span className="badge pending">Pending Approval</span>
                        )}
                      </div>
                    </div>
                    <div className="property-info-body">
                      <h3 className="property-title">{property.title}</h3>
                      <p className="property-address">
                        <MapPin size={14} /> {property.address}
                      </p>
                      <div className="property-footer">
                        <span className="property-price-tag">Rs. {property.rentPrice}/mo</span>
                        <div className="action-buttons">
                          <button className="btn-icon-edit" onClick={() => handleEditClick(property)}>
                            <Edit size={16} />
                          </button>
                        </div>
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
                    <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phone" value={profileData.phone} onChange={handleProfileChange} placeholder="98xxxxxxxx" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Business Address</label>
                    <input type="text" name="address" value={profileData.address} onChange={handleProfileChange} placeholder="Your business address" />
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
              <div className="empty-state-card">
                <ClipboardList size={48} />
                <p>No booking requests found.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Tenant Details</th>
                      <th>Timeline</th>
                      <th>Rent</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="table-cell-title">{booking.title}</td>
                        <td>
                          <div>Tenant ID: {booking.tenantId}</div>
                        </td>
                        <td>
                          <div className="timeline-cell">
                            <Clock size={14} /> Move In: {new Date(booking.moveInDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="table-cell-amount">Rs. {booking.monthlyRent}</td>
                        <td>
                          <span className={`badge ${booking.status}`}>{booking.status}</span>
                        </td>
                        <td>
                          {booking.status === "pending" && (
                            <div className="action-buttons">
                              <button className="btn-success" onClick={() => handleApproveBooking(booking.id)} title="Approve">
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn-danger" onClick={() => handleRejectBooking(booking.id)} title="Reject">
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <th>Tenant</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td>Tenant #{p.tenantId}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.paymentType}</td>
                        <td className="table-cell-revenue">+ Rs. {p.amount.toLocaleString()}</td>
                        <td><span className="badge approved">{p.status}</span></td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan="5" className="table-empty-msg">No revenue records</td></tr>
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

export default LandlordDashboard
