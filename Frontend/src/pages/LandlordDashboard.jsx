"use client"

import { useState, useEffect, useCallback, useRef, Fragment } from "react"
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
  Edit,
  MessageSquare,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  UserCheck,
  Search,
  Download,
  FileText,
  History,
  RefreshCcw
} from "lucide-react"
import "./LandlordDashboard.css"
import "./ComplaintStyles.css"

function LandlordDashboard({ onLogout, user: initialUser }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user")
    return saved ? JSON.parse(saved) : initialUser
  })
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [complaints, setComplaints] = useState([])
  const [activeTab, setActiveTab] = useState("properties")
  const [loading, setLoading] = useState(true)
  const [contractRequests, setContractRequests] = useState([])

  // Complaint-specific state
  const [showLandlordComplaintForm, setShowLandlordComplaintForm] = useState(false)
  const [activeBookings, setActiveBookings] = useState([])
  const [landlordComplaintForm, setLandlordComplaintForm] = useState({
    bookingId: "", title: "", description: "", category: "behavior", severity: "medium"
  })
  const [submittingLComplaint, setSubmittingLComplaint] = useState(false)
  const [expandedComplaint, setExpandedComplaint] = useState(null)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [statusActionId, setStatusActionId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null) // complaintId or null
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

  const STATUS_COLORS = {
    PENDING: "status-pending", IN_PROGRESS: "status-inprogress",
    RESOLVED: "status-resolved", REJECTED: "status-rejected",
    ESCALATED: "status-escalated", CLOSED: "status-closed",
    FORCE_RESOLVED: "status-force", WARNING_ISSUED: "status-warning",
    ACCOUNT_SUSPENDED: "status-suspended",
  }
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
  const [expandedBooking, setExpandedBooking] = useState(null)

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

  const exportGlobalLedger = useCallback(() => {
    const activeBookings = bookings.filter(b => ['active', 'contract_agreed', 'confirmed', 'approved'].includes(b.status))
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Booking ID,Tenant Name,Property,Total Commitment,Received,Pending,Status\n"
    
    activeBookings.forEach(b => {
      const rent = parseFloat(b.monthlyRent || 0)
      const deposit = parseFloat(b.depositAmount || 0)
      const totalCommitment = rent + deposit
      const paid = payments.filter(p => p.bookingId === b.id && p.status === 'completed').reduce((acc, p) => acc + parseFloat(p.amount), 0)
      const pending = Math.max(0, totalCommitment - paid)
      const now = new Date()
      const moveInDate = new Date(b.moveInDate)
      const dueDate = new Date(now.getFullYear(), now.getMonth(), moveInDate.getDate())
      const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)))
      const status = pending === 0 ? 'Settled' : (daysOverdue > 7 ? 'Defaulted' : 'Pending')
      csvContent += `${b.id},"${b.tenantName}","${b.title}",${totalCommitment},${paid},${pending},${status}\n`
    })
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `landlord_ledger_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [bookings, payments])

  const printReceipt = useCallback((payment, booking) => {
    const receiptHtml = `
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #4f46e5; margin: 0; font-size: 1.5rem; }
            .receipt-details { margin-bottom: 40px; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 12px 0; }
            .total-row { font-size: 1.25rem; font-weight: 800; border-top: 2px solid #0f172a; border-bottom: none; margin-top: 20px; padding-top: 20px; }
            .footer { text-align: center; color: #64748b; font-size: 0.85rem; margin-top: 50px; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>GharPata Digital Receipt</h1>
              <p>Official Record of Payment</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
              <p><strong>Txn ID:</strong> ${payment.transactionId || payment.id}</p>
            </div>
          </div>
          
          <div class="receipt-details">
            <div class="row"><span>Property</span> <strong>${booking.title}</strong></div>
            <div class="row"><span>Tenant</span> <strong>${booking.tenantName}</strong></div>
            <div class="row"><span>Payment Type</span> <strong>${payment.paymentType ? payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1) : 'Rent Installment'}</strong></div>
            <div class="row"><span>Status</span> <strong style="color: #059669;">Settled (Cleared)</strong></div>
            <div class="row total-row"><span>Amount Paid</span> <span>Rs. ${parseFloat(payment.amount).toLocaleString()}</span></div>
          </div>
          
          <div class="footer">
            <p>Thank you for using GharPata. This is an auto-generated digital receipt.</p>
            <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">Print Receipt</button>
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    printWindow.document.write(receiptHtml)
    printWindow.document.close()
  }, [])

  const issuePaymentNotice = async (bookingId, amount, dueDate) => {
    try {
      await axios.post("/api/payments", {
        bookingId,
        amount,
        paymentType: "rent",
        paymentMethod: "esewa",
        dueDate: dueDate.toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Payment Notice Issued Successfully! The tenant will see this newly issued bill on their dashboard.")
      fetchData()
    } catch (error) {
      console.error("Error issuing notice:", error)
      alert("Failed to issue payment notice.")
    }
  }

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
      } else if (activeTab === "finance") {
        const [pRes, bRes] = await Promise.all([
          axios.get("/api/payments", { headers }),
          axios.get(`/api/bookings/user/${user.id}`, { headers })
        ])
        setPayments(pRes.data)
        setBookings(bRes.data)
      } else if (activeTab === "profile") {
        await fetchProfile()
      } else if (activeTab === "complaints") {
        const [cRes, bRes] = await Promise.all([
          axios.get("/api/complaints", { headers }),
          axios.get(`/api/bookings/user/${user.id}`, { headers })
        ])
        setComplaints(cRes.data)
        const active = bRes.data.filter(b => ["approved", "active", "contract_agreed"].includes(b.status))
        setActiveBookings(active)
        if (active.length > 0) setLandlordComplaintForm(f => ({ ...f, bookingId: active[0].id }))
      } else if (activeTab === "contracts") {
        const response = await axios.get("/api/bookings/contract-requests/all", { headers })
        setContractRequests(response.data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, token, user.id, fetchProfile])

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

    const parsedRent = Number(formData.rentPrice)
    const parsedDeposit = Number(formData.depositAmount)
    const parsedArea = Number(formData.area)
    const parsedBedrooms = Number(formData.bedrooms)
    const parsedBathrooms = Number(formData.bathrooms)

    if (Number.isNaN(parsedRent) || parsedRent < 0) {
      return alert("Monthly rent must be a valid non-negative number.")
    }
    if (formData.depositAmount !== "" && (Number.isNaN(parsedDeposit) || parsedDeposit < 0)) {
      return alert("Deposit amount must be a valid non-negative number.")
    }
    if (formData.area !== "" && (Number.isNaN(parsedArea) || parsedArea < 0)) {
      return alert("Area must be a valid non-negative number.")
    }
    if (!Number.isNaN(parsedBedrooms) && parsedBedrooms < 0) {
      return alert("Bedrooms must be a valid non-negative number.")
    }
    if (!Number.isNaN(parsedBathrooms) && parsedBathrooms < 0) {
      return alert("Bathrooms must be a valid non-negative number.")
    }

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

  // ── Complaint Handlers ──────────────────────────────────────────────────
  const handleSubmitLandlordComplaint = async (e) => {
    e.preventDefault()
    if (!landlordComplaintForm.bookingId) return alert("Select a booking first")
    setSubmittingLComplaint(true)
    try {
      await axios.post("/api/complaints/landlord", landlordComplaintForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Complaint filed against tenant")
      setShowLandlordComplaintForm(false)
      setLandlordComplaintForm({ bookingId: activeBookings[0]?.id || "", title: "", description: "", category: "behavior", severity: "medium" })
      fetchData()
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmittingLComplaint(false)
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

  return (
    <div className="landlord-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home className="logo-icon" style={{ color: 'var(--primary)' }} />
          <h1 className="brand-title">GharPata</h1>
        </div>

        <nav className="menu">
          <SidebarItem id="properties" label="My Properties" icon={Building} />
          <SidebarItem id="bookings" label="Rental Bookings" icon={ClipboardList} count={notifCounts.bookings} />
          <SidebarItem id="contracts" label="Contract Requests" icon={FileText} />
          <SidebarItem id="complaints" label="Tenant Complaints" icon={AlertTriangle} count={notifCounts.complaints} />
          <SidebarItem id="finance" label="Revenue & Payments" icon={Wallet} />
        </nav>

      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h2>
            {activeTab === 'properties' && 'Manage Properties'}
            {activeTab === 'bookings' && 'Booking Management'}
            {activeTab === 'contracts' && 'Contract Requests'}
            {activeTab === 'complaints' && 'Complaint Management'}
            {activeTab === 'finance' && 'Financial Overview'}
            {activeTab === 'profile' && 'My Profile'}
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
                    <span className="dropdown-user-email">{user.email || "landlord@gharpata.com"}</span>
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
                    <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleFormChange} min="0" step="1" />
                  </div>
                  <div className="form-group">
                    <label>Bathrooms</label>
                    <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleFormChange} min="0" step="1" />
                  </div>
                  <div className="form-group">
                    <label>Area (sq ft)</label>
                    <input type="number" name="area" value={formData.area} onChange={handleFormChange} min="0" step="0.01" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Monthly Rent (Rs.)</label>
                    <input type="number" name="rentPrice" value={formData.rentPrice} onChange={handleFormChange} required min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Deposit Amount (Rs.)</label>
                    <input type="number" name="depositAmount" value={formData.depositAmount} onChange={handleFormChange} min="0" step="0.01" />
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
                        {property.status !== 'available' && property.status != null ? (
                          <span className="badge booked" style={{ background: '#4f46e5', color: '#ffffff' }}>Booked</span>
                        ) : property.isApproved ? (
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
          <div className="tab-content finance-tab">
            <div className="pro-section-header" style={{ marginBottom: '1.5rem', marginTop: '1rem', padding: '0 10px' }}>
              <div className="pro-header-titles">
                  <h3>Rental Bookings Management</h3>
                  <p>Review, approve, and manage incoming tenancy applications and active contracts.</p>
              </div>
            </div>

            {loading ? <p>Loading...</p> : bookings.length === 0 ? (
              <div className="empty-state-card">
                <ClipboardList size={48} />
                <p>No booking requests found.</p>
              </div>
            ) : (
              <div className="pro-table-wrapper">
                <table className="pro-finance-table">
                  <thead>
                    <tr>
                      <th>Property Asset</th>
                      <th>Applicant / Tenant</th>
                      <th>Contract Terms</th>
                      <th>Status Check</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                       const isExpanded = expandedBooking === booking.id;
                       return (
                         <Fragment key={booking.id}>
                           <tr className={isExpanded ? 'pro-row-active' : 'pro-row'}>
                              <td>
                                <div className="pro-entity-cell">
                                   <div className="pro-avatar" style={{ borderRadius: '8px', background: '#f1f5f9' }}>
                                     <ClipboardList size={20} color="#64748b" />
                                   </div>
                                   <div className="pro-entity-info">
                                      <span className="pro-entity-name">{booking.title || 'Property Asset'}</span>
                                      <span className="pro-entity-sub">Booking ID: {booking.id.toString().padStart(4, '0')}</span>
                                   </div>
                                </div>
                              </td>
                              <td>
                                 <div className="pro-entity-info">
                                    <span className="pro-entity-name">{booking.tenantName || `Applicant #${booking.tenantId}`}</span>
                                    <span className="pro-entity-sub" style={{ color: '#475569' }}>Registered Profile</span>
                                 </div>
                              </td>
                              <td>
                                 <div className="pro-entity-info">
                                    <span className="pro-entity-name">Rs. {Number(booking.monthlyRent).toLocaleString()}/mo</span>
                                    <span className="pro-entity-sub"><Clock size={12}/> Move In: {new Date(booking.moveInDate).toLocaleDateString()}</span>
                                 </div>
                              </td>
                              <td>
                                <span className={`pro-badge pro-badge-${booking.status === 'pending' ? 'pending' : (['contract_agreed', 'approved'].includes(booking.status) ? 'success' : 'settled')}`}>
                                  {booking.status === 'contract_agreed' ? 'Contract Agreed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                   {booking.status === "pending" && (
                                     <>
                                       <button className="btn-success" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleApproveBooking(booking.id)}>
                                         <CheckCircle size={14} /> Approve
                                       </button>
                                       <button className="btn-danger" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleRejectBooking(booking.id)}>
                                         <XCircle size={14} /> Reject
                                       </button>
                                     </>
                                   )}
                                   <button className={`pro-toggle-btn ${isExpanded ? 'active' : ''}`} onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}>
                                     {isExpanded ? "Close" : "View Details"}
                                   </button>
                                 </div>
                              </td>
                           </tr>
                           {isExpanded && (
                             <tr className="pro-statement-row">
                               <td colSpan="5">
                                 <div className="pro-statement-panel" style={{ padding: '1.5rem', background: '#f8fafc', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                                       <div>
                                          <h5 className="stmt-section-title">Application Dossier</h5>
                                          <div className="stmt-summary-box" style={{ background: '#fff' }}>
                                             <div className="stmt-row"><span>Applicant Name</span> <strong>{booking.tenantName || 'Standard User'}</strong></div>
                                             <div className="stmt-row"><span>Target Move-in Date</span> <strong>{new Date(booking.moveInDate).toLocaleDateString()}</strong></div>
                                             <div className="stmt-row"><span>Contract Duration Length</span> <strong>{booking.durationYears ? `${booking.durationYears} Year(s)` : 'Standard'}</strong></div>
                                             <div className="stmt-divider" />
                                             <div className="stmt-row text-soft"><span style={{ fontSize: '0.8rem' }}>Trust Note: This tenant profile forms part of the verified GharPata ecosystem.</span></div>
                                          </div>
                                       </div>
                                       <div>
                                          <h5 className="stmt-section-title">Financial & Terms Breakdown</h5>
                                          <div className="stmt-summary-box" style={{ background: '#fff' }}>
                                             <div className="stmt-row"><span>Monthly Base Rent</span> <strong>Rs. {Number(booking.monthlyRent).toLocaleString()}</strong></div>
                                             <div className="stmt-row"><span>Upfront Security Deposit</span> <strong>Rs. {Number(booking.depositAmount || 0).toLocaleString()}</strong></div>
                                             <div className="stmt-divider" />
                                             <div className="stmt-row total"><span>Total Initial Commitment</span> <strong>Rs. {(Number(booking.monthlyRent) + Number(booking.depositAmount || 0)).toLocaleString()}</strong></div>
                                          </div>
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
              </div>
            )}
          </div>
        )}

        {activeTab === "finance" && (
          <div className="tab-content finance-tab">
            {loading ? (
              <div className="loading-state">Loading financial records...</div>
            ) : (
              <div className="finance-dashboard">
                {/* ── Section: Earnings Summary ── */}
                {(() => {
                  const now = new Date()
                  const currentMonth = now.getMonth()
                  const currentYear = now.getFullYear()
                  
                  const activeBookings = bookings.filter(b => ['active', 'contract_agreed', 'confirmed', 'approved'].includes(b.status))
                  const collectedThisMonth = payments.filter(p => {
                    const d = new Date(p.createdAt)
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.status === 'completed'
                  }).reduce((acc, p) => acc + parseFloat(p.amount), 0)
                  
                  const totalMonthlyRentTarget = activeBookings.reduce((acc, b) => {
                    const base = parseFloat(b.monthlyRent || 0)
                    const d = new Date(b.createdAt)
                    const isNewThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear
                    return acc + base + (isNewThisMonth ? parseFloat(b.depositAmount || 0) : 0)
                  }, 0)
                  const pendingTotal = Math.max(0, totalMonthlyRentTarget - collectedThisMonth)
                  const overdueCount = activeBookings.filter(b => {
                    const moveInDate = new Date(b.moveInDate)
                    const dueDate = new Date(now.getFullYear(), now.getMonth(), moveInDate.getDate())
                    // Simple check: if now is past due date and they haven't paid the full commitment
                    const paid = payments
                      .filter(p => p.bookingId === b.id && p.status === 'completed')
                      .reduce((acc, p) => acc + parseFloat(p.amount), 0)
                    return now > dueDate && paid < (parseFloat(b.monthlyRent) + parseFloat(b.depositAmount || 0))
                  }).length

                  return (
                    <div className="pro-earnings-grid">
                      <div className="pro-stat-card">
                         <div className="pro-stat-icon"><FileText size={24} /></div>
                         <div className="pro-stat-content">
                           <span className="pro-label">Total Monthly Target</span>
                           <span className="pro-value">Rs. {totalMonthlyRentTarget.toLocaleString()}</span>
                         </div>
                      </div>
                      <div className="pro-stat-card success">
                         <div className="pro-stat-icon"><Wallet size={24} /></div>
                         <div className="pro-stat-content">
                           <span className="pro-label">Net Revenue Received</span>
                           <span className="pro-value">Rs. {collectedThisMonth.toLocaleString()}</span>
                         </div>
                      </div>
                      <div className="pro-stat-card danger">
                         <div className="pro-stat-icon"><AlertTriangle size={24} /></div>
                         <div className="pro-stat-content">
                           <span className="pro-label">Total Outstanding Balance</span>
                           <span className="pro-value">Rs. {pendingTotal.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  )
                })()}

                {/* ── Section: Professional Finance Ledger ── */}
                <div className="pro-finance-section">
                  <div className="pro-section-header">
                    <div className="pro-header-titles">
                       <h3>Financial Performance Ledger</h3>
                       <p>Comprehensive tracking of all active tenancies and revenue streams</p>
                    </div>
                    <div className="pro-header-actions">
                       <button className="pro-btn-outline" onClick={() => fetchData()}><RefreshCcw size={14} /> Sync Data</button>
                       <button className="pro-btn-primary" onClick={exportGlobalLedger}><Download size={14} /> Export Report</button>
                    </div>
                  </div>
                  
                  <div className="pro-table-wrapper">
                    <table className="pro-finance-table">
                      <thead>
                        <tr>
                          <th>Tenant & Property</th>
                          <th>Commitment (Rent + Dep)</th>
                          <th>Balance Overview</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Management</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.filter(b => ['active', 'contract_agreed', 'confirmed', 'approved'].includes(b.status)).length === 0 ? (
                          <tr><td colSpan="5" className="pro-empty-state">No active financial records available.</td></tr>
                        ) : bookings.filter(b => ['active', 'contract_agreed', 'confirmed', 'approved'].includes(b.status)).map(b => {
                          const now = new Date()
                          const rent = parseFloat(b.monthlyRent || 0)
                          const deposit = parseFloat(b.depositAmount || 0)
                          const totalCommitment = rent + deposit
                          
                          const paidForThisBooking = payments
                            .filter(p => p.bookingId === b.id && p.status === 'completed')
                            .reduce((acc, p) => acc + parseFloat(p.amount), 0)
                          
                          const pending = Math.max(0, totalCommitment - paidForThisBooking)
                          
                          const moveInDate = new Date(b.moveInDate)
                          const dueDate = new Date(now.getFullYear(), now.getMonth(), moveInDate.getDate())
                          
                          let timeBadge = ''
                          if (pending > 0) {
                              if (now > dueDate) {
                                  const days = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
                                  timeBadge = `${days} days overdue`
                              } else {
                                  const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
                                  timeBadge = `Due in ${diffDays} days`
                              }
                          }

                          const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)))
                          const lateFee = (daysOverdue > 7 && pending > 0) ? (pending * 0.05) : 0
                          
                          const status = pending === 0 ? 'Settled' : (daysOverdue > 7 ? 'Defaulted' : 'Pending')
                          
                          const verifiedTxs = payments.filter(p => p.bookingId === b.id && p.status === 'completed')
                          const uniqueVerifiedTxs = Array.from(new Map(verifiedTxs.map(p => [p.transactionId || p.id, p])).values())
                          
                          const isExpanded = expandedComplaint === b.id

                          return (
                            <Fragment key={b.id}>
                              <tr className={isExpanded ? 'pro-row-active' : 'pro-row'}>
                                <td style={{ paddingLeft: '1.75rem' }}>
                                  <div className="pro-entity-cell">
                                     <div className="pro-avatar">
                                       {b.tenantProfilePic ? (
                                         <img 
                                           src={b.tenantProfilePic.startsWith('http') ? b.tenantProfilePic : `http://localhost:5000/uploads/profiles/${b.tenantProfilePic}`} 
                                           alt={b.tenantName} 
                                           style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                         />
                                       ) : (
                                         b.tenantName?.charAt(0)
                                       )}
                                     </div>
                                     <div className="pro-entity-info">
                                        <span className="pro-entity-name">{b.tenantName}</span>
                                        <span className="pro-entity-sub" style={{ color: '#475569' }}>
                                          Contact: {b.tenantPhone || b.tenantEmail || 'N/A'}
                                        </span>
                                        <span className="pro-entity-sub"><strong>Asset:</strong> {b.title} <span className="pro-id">ID: {b.id.toString().padStart(4, '0')}</span></span>
                                     </div>
                                  </div>
                                </td>
                                <td className="pro-financial-value">Rs. {totalCommitment.toLocaleString()}</td>
                                <td>
                                   <div className="pro-balance-bars">
                                      <div className="pro-bar-item">
                                         <span className="lbl text-success">Rec:</span> <span className="val">Rs. {paidForThisBooking.toLocaleString()}</span>
                                      </div>
                                      <div className="pro-bar-item">
                                         <span className={`lbl ${pending > 0 ? 'text-danger' : 'text-muted'}`}>Due:</span> <span className={`val ${pending > 0 ? 'bold text-danger' : ''}`}>Rs. {pending.toLocaleString()}</span>
                                      </div>
                                   </div>
                                </td>
                                <td>
                                  <span className={`pro-badge pro-badge-${status.toLowerCase()}`}>
                                    {status}
                                  </span>
                                  {timeBadge && (
                                    <div style={{ fontSize: '0.75rem', color: now > dueDate ? '#e11d48' : '#64748b', marginTop: '6px', fontWeight: '700' }}>
                                      🕒 {timeBadge}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button 
                                      className={`pro-toggle-btn ${isExpanded ? 'active' : ''}`} 
                                      onClick={() => setExpandedComplaint(isExpanded ? null : b.id)} 
                                    >
                                      {isExpanded ? "Hide Details" : "View Ledger"}
                                    </button>
                                </td>
                              </tr>

                              {/* ── Professional Digital Statement ── */}
                              {isExpanded && (
                                <tr className="pro-statement-row">
                                  <td colSpan="5">
                                    <div className="pro-statement-panel">
                                       <div className="stmt-header">
                                          <div className="stmt-brand">
                                            <Building size={20} className="brand-icon" />
                                            <h4>Official Digital Statement</h4>
                                          </div>
                                          <div className="stmt-meta">
                                             <div className="meta-item"><span>Contract Ref:</span> <strong>#{b.id.toString().padStart(4, '0')}</strong></div>
                                             <div className="meta-divider" />
                                             <div className="meta-item"><span>Commencement:</span> <strong>{new Date(b.moveInDate).toLocaleDateString()}</strong></div>
                                          </div>
                                       </div>

                                       <div className="stmt-body-grid">
                                          <div className="stmt-transactions">
                                             <h5 className="stmt-section-title">Verified Transactions</h5>
                                             <table className="stmt-table">
                                                <thead>
                                                  <tr>
                                                    <th>Processed Date</th>
                                                    <th>Narration</th>
                                                    <th>Amount</th>
                                                    <th style={{ textAlign: 'right' }}>Document</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {uniqueVerifiedTxs.length === 0 ? (
                                                    <tr><td colSpan="4" className="stmt-empty">No cleared transactions found on record.</td></tr>
                                                  ) : uniqueVerifiedTxs.map(p => (
                                                    <tr key={p.id}>
                                                      <td>{new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                                      <td>{p.paymentType ? p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1) : 'Rent'} Installment</td>
                                                      <td className="bold">Rs. {parseFloat(p.amount).toLocaleString()}</td>
                                                      <td style={{ textAlign: 'right' }}>
                                                        <button className="stmt-doc-link" onClick={() => printReceipt(p, b)}><Download size={12} /> Receipt</button>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                          </div>
                                          <div className="stmt-summary">
                                             <h5 className="stmt-section-title">Financial Summary</h5>
                                             <div className="stmt-summary-box">
                                                <div className="stmt-row"><span>Base Contracting Rent</span> <span>Rs. {rent.toLocaleString()}</span></div>
                                                <div className="stmt-row"><span>Security Deposit</span> <span>Rs. {deposit.toLocaleString()}</span></div>
                                                {lateFee > 0 && <div className="stmt-row danger"><span>Penalties (Late Fee)</span> <span>Rs. {lateFee.toLocaleString()}</span></div>}
                                                <div className="stmt-divider" />
                                                <div className="stmt-row total"><span>Gross Commitment</span> <span>Rs. {totalCommitment.toLocaleString()}</span></div>
                                                <div className="stmt-divider" />
                                                <div className="stmt-row success"><span>Total Realized</span> <span>Rs. {paidForThisBooking.toLocaleString()}</span></div>
                                                <div className="stmt-row outstanding"><span>Net Outstanding</span> <span>Rs. {pending.toLocaleString()}</span></div>
                                             </div>
                                             {pending > 0 && (
                                               <button className="pro-btn-danger-block" onClick={() => issuePaymentNotice(b.id, pending + lateFee, dueDate)}>
                                                 <AlertTriangle size={16} /> Issue Payment Notice
                                               </button>
                                             )}
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
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="tab-content">
            <div className="header-row">
              <div>
                <h3>Contract Requests</h3>
                <p className="header-subtitle">Review tenant requests for renewal or termination</p>
              </div>
            </div>

            {contractRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <FileText size={40} color="var(--text-muted)" />
                <p>No contract requests from tenants.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Details (Yrs / Date)</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractRequests.map(req => (
                      <tr key={req.id}>
                        <td>{req.tenantName}</td>
                        <td>{req.propertyTitle}</td>
                        <td><span className={`badge ${req.type === 'renewal' ? 'info' : 'warning'}`}>{req.type.toUpperCase()}</span></td>
                        <td>
                          {req.type === 'renewal' 
                            ? req.renewalYears ? `${req.renewalYears} Year(s)` : '-' 
                            : req.requestedVacateDate ? new Date(req.requestedVacateDate).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <span className={`badge ${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'pending'}`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{req.reason || '-'}</td>
                        <td>
                          {req.status === 'pending' ? (
                            <div className="actions-cell">
                              <button 
                                className="btn-action btn-approve"
                                onClick={async () => {
                                  try {
                                    await axios.put(`/api/bookings/contract-request/${req.id}`, 
                                      { status: 'approved' },
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    )
                                    alert("Request approved")
                                    fetchData()
                                  } catch (error) {
                                    alert("Error approving request")
                                  }
                                }}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>
                              <button 
                                className="btn-action btn-reject"
                                onClick={async () => {
                                  try {
                                    await axios.put(`/api/bookings/contract-request/${req.id}`, 
                                      { status: 'rejected' },
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    )
                                    alert("Request rejected")
                                    fetchData()
                                  } catch (error) {
                                    alert("Error rejecting request")
                                  }
                                }}
                              >
                                <XCircle size={16} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(req.updatedAt).toLocaleDateString()}</span>
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

        {/* ── COMPLAINTS TAB ── */}
        {activeTab === "complaints" && (
          <div className="tab-content">

            {/* Reject Reason Modal */}
            {rejectModal && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '450px' }}>
                  <div className="modal-header">
                    <h3>{rejectModal && complaints.find(c => c.id === rejectModal)?.filedBy === user.id ? "Withdraw Complaint" : "Reject Complaint"}</h3>
                    <button className="close-btn" onClick={() => { setRejectModal(null); setRejectReason("") }}><XCircle size={20} /></button>
                  </div>
                  <div className="modal-body">
                    <p className="text-soft" style={{ marginBottom: '1rem' }}>
                      {rejectModal && complaints.find(c => c.id === rejectModal)?.filedBy === user.id ? "Explain why you are withdrawing this complaint..." : "Explain why you are rejecting this complaint..."}
                    </p>
                    <textarea
                      rows={4}
                      className="comment-reply-box"
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
                      placeholder="Enter reason..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                  </div>
                  <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem' }}>
                    <button className="btn-secondary" onClick={() => { setRejectModal(null); setRejectReason("") }}>Cancel</button>
                    <button className="btn-admin-reject" onClick={handleRejectSubmit}>Confirm</button>
                  </div>
                </div>
              </div>
            )}

            {/* Section: Tenant Complaints Against Me */}
            <div className="complaints-section-wrapper">
              <div className="complaints-header">
                <div>
                  <h3>Complaints From My Tenants</h3>
                  <p className="header-subtitle">Issues filed by tenants for your attention</p>
                </div>
              </div>

              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : (() => {
                const tenantComplaints = complaints.filter(c => c.filedBy !== user.id)
                return tenantComplaints.length === 0 ? (
                  <div className="empty-state">
                    <CheckCircle size={40} />
                    <p>No complaints from tenants.</p>
                  </div>
                ) : (
                  <div className="complaints-list">
                    {tenantComplaints.map(c => {
                      const isExpanded = expandedComplaint === c.id
                      const comments = Array.isArray(c.comments) ? c.comments : []
                      const sevColor = c.severity === 'high' ? '#ef4444' : c.severity === 'medium' ? '#f59e0b' : '#10b981';
                      
                      return (
                        <div key={c.id} className={`complaint-ticket ${isExpanded ? 'expanded' : ''}`}>
                          <div className="ticket-severity-bar" style={{ backgroundColor: sevColor }} />
                          
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
                                  <span className="text-soft bold" style={{ fontSize: '0.75rem' }}>From: {c.tenantName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="ticket-meta-right">
                              <span className={`ticket-status-bubble status-${c.status.toLowerCase().replace(/_/g, '')}`}>
                                {c.status.replace(/_/g, ' ')}
                              </span>
                              <div className="ticket-exp-icon">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="ticket-detail-body">
                              <div className="detail-section">
                                <label className="detail-label">Incident Description</label>
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
                                    <span className="note-title"><CheckCircle size={14} /> My Resolution Note</span>
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

                              {/* Landlord Management Panel */}
                              {(c.status === 'PENDING' || c.status === 'IN_PROGRESS') && (
                                <div className="complaint-action-panel">
                                  <div className="verify-info">
                                    <h4>Management Tools</h4>
                                    <p>Update investigation status or mark as resolved for tenant verification.</p>
                                  </div>
                                  <div className="verify-buttons" style={{ display: 'flex', gap: '12px' }}>
                                    {c.status === 'PENDING' && (
                                      <button className="btn-admin-apply" style={{ background: '#3b82f6', border: 'none' }} onClick={() => handleStatusChange(c.id, 'IN_PROGRESS')}>
                                        <Clock size={14} /> Investigating
                                      </button>
                                    )}
                                    <button className="btn-admin-apply" onClick={() => handleStatusChange(c.id, 'RESOLVED')}>
                                      <CheckCircle size={14} /> Mark Resolved
                                    </button>
                                    {c.status === 'PENDING' && (
                                      <button className="btn-admin-reject" onClick={() => setRejectModal(c.id)}>
                                        <XCircle size={14} /> Reject Issue
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="comments-section">
                                <div className="section-title">
                                  <MessageSquare size={16} /> Discussion thread ({comments.length})
                                </div>
                                <div className="comments-thread">
                                  {comments.length === 0 ? <p className="no-comments">No messages yet.</p> : comments.map((cm, idx) => (
                                    <div key={idx} className={`comment-bubble ${cm.role === 'landlord' ? 'mine' : 'other'}`}>
                                      <div className="comment-meta">
                                        <span className="bold">{cm.name}</span>
                                        <span className={`role-tag role-${cm.role}`}>{cm.role}</span>
                                        <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <div className="comment-box">{cm.comment}</div>
                                    </div>
                                  ))}
                                  {!['CLOSED', 'RESOLVED'].includes(c.status) && (
                                    <div className="comment-reply-box">
                                      <input
                                        type="text"
                                        placeholder="Type your reply..."
                                        value={expandedComplaint === c.id ? commentText : ''}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment(c.id)}
                                      />
                                      <button className="btn-admin-apply" style={{ padding: '0 1.5rem' }} onClick={() => handleAddComment(c.id)}>
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
                )
              })()}
            </div>

            {/* Section: My Complaints Against Tenants */}
            <div className="complaints-section-wrapper" style={{ marginTop: '3rem' }}>
              <div className="complaints-header">
                <div>
                  <h3>My Complaints Against Tenants</h3>
                  <p className="header-subtitle">Track issues you've reported regarding tenant conduct</p>
                </div>
                <button
                  className={`btn-primary ${showLandlordComplaintForm ? 'btn-secondary' : ''}`}
                  onClick={() => setShowLandlordComplaintForm(!showLandlordComplaintForm)}
                >
                  {showLandlordComplaintForm ? <><XCircle size={18} /> Cancel</> : <><PlusCircle size={18} /> File Complaint</>}
                </button>
              </div>

              {showLandlordComplaintForm && (
                <div className="complaint-form-card">
                  <h4 className="complaint-form-title"><AlertTriangle size={18} /> New Incident Report</h4>
                  {activeBookings.length === 0 ? (
                    <div className="empty-state">
                      <XCircle size={32} />
                      <p>No active tenancies found to file a complaint against.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitLandlordComplaint} className="complaint-form">
                      <div className="complaint-form-grid">
                        <div className="form-group">
                          <label>Select Tenant / Booking</label>
                          <select
                            value={landlordComplaintForm.bookingId}
                            onChange={e => setLandlordComplaintForm({ ...landlordComplaintForm, bookingId: e.target.value })}
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
                            value={landlordComplaintForm.category}
                            onChange={e => setLandlordComplaintForm({ ...landlordComplaintForm, category: e.target.value })}
                          >
                            <option value="behavior">Behavior</option>
                            <option value="payment">Payment</option>
                            <option value="noise">Noise</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Severity</label>
                          <select
                            value={landlordComplaintForm.severity}
                            onChange={e => setLandlordComplaintForm({ ...landlordComplaintForm, severity: e.target.value })}
                          >
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🔴 High</option>
                          </select>
                        </div>
                        <div className="form-group form-group-full">
                          <label>Report Title</label>
                          <input
                            type="text" placeholder="Short summary of the issue"
                            value={landlordComplaintForm.title}
                            onChange={e => setLandlordComplaintForm({ ...landlordComplaintForm, title: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group form-group-full">
                          <label>Detailed Evidence/Description</label>
                          <textarea
                            rows={4} placeholder="Provide details about the incident..."
                            value={landlordComplaintForm.description}
                            onChange={e => setLandlordComplaintForm({ ...landlordComplaintForm, description: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={submittingLComplaint}>
                        {submittingLComplaint ? "Submitting..." : <><Send size={16} /> File Official Complaint</>}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!loading && (() => {
                const myComplaints = complaints.filter(c => c.filedBy === user.id)
                return myComplaints.length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare size={40} />
                    <p>You haven't filed any complaints against tenants.</p>
                  </div>
                ) : (
                  <div className="complaints-list">
                    {myComplaints.map(c => {
                      const isExpanded = expandedComplaint === 'my-' + c.id
                      const comments = Array.isArray(c.comments) ? c.comments : []
                      const sevColor = c.severity === 'high' ? '#ef4444' : c.severity === 'medium' ? '#f59e0b' : '#10b981';
                      
                      return (
                        <div key={c.id} className={`complaint-ticket ${isExpanded ? 'expanded' : ''}`}>
                          <div className="ticket-severity-bar" style={{ backgroundColor: sevColor }} />
                          
                          <div className="ticket-main-row" onClick={() => setExpandedComplaint(isExpanded ? null : 'my-' + c.id)}>
                            <div className="ticket-meta-left">
                              <span className="ticket-id">#{c.id.toString().padStart(4, '0')}</span>
                              <div className="c-ticket-title-block">
                                <h4 className="ticket-title">{c.title}</h4>
                                <div className="ticket-sub-row">
                                  <span className="ticket-cat">{c.category}</span>
                                  <span className="dot" />
                                  <span className="ticket-date"><Clock size={12} /> {new Date(c.createdAt).toLocaleDateString()}</span>
                                  <span className="dot" />
                                  <span className="text-soft bold" style={{ fontSize: '0.75rem' }}>Against: {c.filedAgainstName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="ticket-meta-right">
                              <span className={`ticket-status-bubble status-${c.status.toLowerCase().replace(/_/g, '')}`}>
                                {c.status.replace(/_/g, ' ')}
                              </span>
                              <div className="ticket-exp-icon">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="ticket-detail-body">
                              <div className="detail-section">
                                <label className="detail-label">Complaint Details</label>
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
                                    <span className="note-title"><CheckCircle size={14} /> Resolution Summary</span>
                                    <p>{c.resolution}</p>
                                  </div>
                                )}
                                {c.adminRemarks && (
                                  <div className="audit-note admin">
                                    <span className="note-title"><UserCheck size={14} /> Admin Review Note</span>
                                    <p>{c.adminRemarks}</p>
                                  </div>
                                )}
                              </div>

                              {/* Own Complaint Management */}
                              {(c.status === 'PENDING' || c.status === 'IN_PROGRESS') && (
                                <div className="complaint-action-panel">
                                  <div className="verify-info">
                                    <h4>Filer Controls</h4>
                                    <p>As the reporter, you can update internal investigation status or close this manually.</p>
                                  </div>
                                  <div className="verify-buttons" style={{ display: 'flex', gap: '12px' }}>
                                    {c.status === 'PENDING' && (
                                      <button className="btn-admin-apply" style={{ background: '#3b82f6', border: 'none' }} onClick={() => handleStatusChange(c.id, 'IN_PROGRESS')}>
                                        <Clock size={14} /> Update Process
                                      </button>
                                    )}
                                    <button className="btn-admin-apply" style={{ background: '#059669', border: 'none' }} onClick={() => handleStatusChange(c.id, 'CLOSED')}>
                                      <CheckCircle size={14} /> Fix & Close
                                    </button>
                                    <button className="btn-admin-reject" onClick={() => setRejectModal(c.id)}>
                                      <XCircle size={14} /> Withdraw Case
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="comments-section">
                                <div className="section-title">
                                  <MessageSquare size={16} /> Official Discussion
                                </div>
                                <div className="comments-thread">
                                  {comments.length === 0 ? <p className="no-comments">No messages yet.</p> : comments.map((cm, idx) => (
                                    <div key={idx} className={`comment-bubble ${cm.role === 'landlord' ? 'mine' : 'other'}`}>
                                      <div className="comment-meta">
                                        <span className="bold">{cm.name}</span>
                                        <span className={`role-tag role-${cm.role}`}>{cm.role}</span>
                                        <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <div className="comment-box">{cm.comment}</div>
                                    </div>
                                  ))}
                                  {!['CLOSED', 'FORCE_RESOLVED'].includes(c.status) && (
                                    <div className="comment-reply-box">
                                      <input
                                        type="text"
                                        placeholder="Add to discussion..."
                                        value={expandedComplaint === 'my-' + c.id ? commentText : ''}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment(c.id)}
                                      />
                                      <button className="btn-admin-apply" style={{ padding: '0 1.5rem' }} onClick={() => handleAddComment(c.id)}>
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
                )
              })()}
            </div>
          </div>
        )}


      </main>
    </div>
  )
}

export default LandlordDashboard
