"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { ChevronLeft, ChevronRight, X, Maximize2, ArrowLeft, MapPin } from "lucide-react"
import "./PropertyDetails.css"

function PropertyDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingData, setBookingData] = useState({
    moveInDate: "",
    durationYears: "1",
    isCustomDuration: false
  })

  // Gallery State
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  const token = localStorage.getItem("token")

  useEffect(() => {
    fetchProperty()
  }, [id])

  const fetchProperty = async () => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const response = await axios.get(`/api/properties/${id}`, config)
      setProperty(response.data)
    } catch (error) {
      console.error("Error fetching property:", error)
    } finally {
      setLoading(false)
    }
  }

  // Check if current user is admin
  const userStr = localStorage.getItem("user")
  const user = userStr ? JSON.parse(userStr) : null
  const isAdmin = user && user.role === 'admin'

  const handleBooking = async (e) => {
    e.preventDefault()

    if (!token) {
      alert("Please login to book a property")
      navigate("/login")
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.post(
        "/api/bookings",
        {
          propertyId: id,
          ...bookingData,
          monthlyRent: property.rentPrice,
          depositAmount: property.depositAmount,
        },
        { headers },
      )
      alert("Booking request sent! Waiting for landlord approval.")
      setShowBookingForm(false)
    } catch (error) {
      alert("Error creating booking: " + (error.response?.data?.message || "Something went wrong"))
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading property details...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="error-container">
        <h2>Property Not Found</h2>
        <p>The property you are looking for might have been removed or is unavailable.</p>
        <button onClick={() => navigate("/")} className="btn-primary">Back to Home</button>
      </div>
    )
  }

  const safeParse = (val) => {
    if (!val) return []
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch (e) {
        console.error("Error parsing JSON:", e)
        return []
      }
    }
    return val
  }

  const facilities = safeParse(property.facilities)
  const images = safeParse(property.images)
  const verificationDocs = safeParse(property.verificationDocuments)

  return (
    <div className="property-details-page">
      <div className="details-container">
        <div className="navigation-header">
          <button onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              navigate(-1)
            } else {
              if (user) {
                navigate(`/${user.role}`)
              } else {
                navigate("/")
              }
            }
          }} className="back-nav-link">
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        <div className="property-header-minimal">
          <h1>{property.title} {property.bhkType ? `- ${property.bhkType}` : ""}</h1>
          <div className="location-badge">
            <MapPin size={16} />
            {property.address}, {property.city}
          </div>
        </div>

        {images && images.length > 0 && (
          <>
            <div className="property-images-gallery">
              <div
                className="main-image-wrap"
                onClick={() => setShowLightbox(true)}
                title="Click to expand"
              >
                <img
                  src={`http://localhost:5000/uploads/properties/${images[activeImageIndex]}`}
                  alt={property.title}
                  className="details-main-img"
                />
                <div className="expand-hint">
                  <Maximize2 size={24} color="white" />
                </div>
              </div>

              {images.length > 1 && (
                <div className="thumbnail-grid">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`thumbnail-wrapper ${idx === activeImageIndex ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <img
                        src={`http://localhost:5000/uploads/properties/${img}`}
                        alt={`Thumbnail ${idx + 1}`}
                        className="details-thumb-img"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lightbox Modal */}
            {showLightbox && (
              <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
                <button className="lightbox-close"><X size={32} /></button>

                <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                  <button
                    className="lightbox-nav prev"
                    onClick={() => setActiveImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                  >
                    <ChevronLeft size={48} />
                  </button>

                  <img
                    src={`http://localhost:5000/uploads/properties/${images[activeImageIndex]}`}
                    alt="Full View"
                    className="lightbox-img"
                  />

                  <button
                    className="lightbox-nav next"
                    onClick={() => setActiveImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                  >
                    <ChevronRight size={48} />
                  </button>
                </div>

                <div className="lightbox-counter">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </div>
            )}
          </>
        )}

        <div className="details-grid">
          <div className="main-info">
            <div className="info-section">
              <h2>Property Details</h2>
              <div className="details-specs">
                <div className="spec-item"><strong>Type:</strong> <span>{property.type}</span></div>
                {property.bhkType && <div className="spec-item"><strong>BHK:</strong> <span>{property.bhkType}</span></div>}
                <div className="spec-item"><strong>Bedrooms:</strong> <span>{property.bedrooms}</span></div>
                <div className="spec-item"><strong>Bathrooms:</strong> <span>{property.bathrooms}</span></div>
                <div className="spec-item"><strong>Area:</strong> <span>{property.area} sq ft</span></div>
                <div className="spec-item"><strong>Location:</strong> <span>{property.city}, {property.district}</span></div>
              </div>
            </div>

            {facilities && (facilities.homeFacilities?.length > 0 || facilities.surroundingFacilities?.length > 0) && (
              <div className="info-section">
                <h2>Facilities & Amenities</h2>
                <div className="facilities-detail-grid">
                  {facilities.homeFacilities?.length > 0 && (
                    <div className="facility-group">
                      <h3>Home Facilities</h3>
                      <div className="facility-pills">
                        {facilities.homeFacilities.map(f => <span key={f} className="f-pill">{f}</span>)}
                      </div>
                    </div>
                  )}
                  {facilities.surroundingFacilities?.length > 0 && (
                    <div className="facility-group">
                      <h3>Surrounding Facilities</h3>
                      <div className="facility-pills">
                        {facilities.surroundingFacilities.map(f => <span key={f} className="f-pill">{f}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {property.description && (
              <div className="info-section">
                <h2>Description</h2>
                <p className="description-text">{property.description}</p>
              </div>
            )}

            {property.rules && (
              <div className="info-section">
                <h2>House Rules</h2>
                <p className="rules-text">{property.rules}</p>
              </div>
            )}

            {isAdmin && verificationDocs && verificationDocs.length > 0 && (
              <div className="info-section admin-verification-section">
                <h2>Landlord Verification Documents</h2>
                <div className="verification-docs-grid">
                  {verificationDocs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={`http://localhost:5000/uploads/property-documents/${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="verif-doc-link"
                    >
                      {doc.toLowerCase().endsWith('.pdf') ? 'View PDF Document' : <img src={`http://localhost:5000/uploads/property-documents/${doc}`} alt="Doc" />}
                      <span>{doc}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-info">
            <div className="pricing-card">
              <h3>Rental Terms</h3>
              <div className="price-row">
                <span>Monthly Rent:</span>
                <strong className="main-price">Rs. {property.rentPrice}</strong>
              </div>
              <div className="price-row">
                <span>Deposit Amount:</span>
                <strong>Rs. {property.depositAmount}</strong>
              </div>

              {!isAdmin ? (
                <>
                  <button className="btn-primary" onClick={() => setShowBookingForm(!showBookingForm)}>
                    {showBookingForm ? "Cancel" : "Book Now"}
                  </button>

                  {showBookingForm && (
                    <form onSubmit={handleBooking} className="booking-form">
                      <div className="form-group">
                        <label>Move-in Date</label>
                        <input
                          type="date"
                          name="moveInDate"
                          value={bookingData.moveInDate}
                          onChange={(e) => setBookingData({ ...bookingData, moveInDate: e.target.value })}
                          required
                          min={new Date().toLocaleDateString('en-CA')}
                        />
                      </div>

                      <div className="form-group">
                        <label>Duration</label>
                        <select
                          className="form-control"
                          onChange={(e) => {
                            const val = e.target.value
                            setBookingData(prev => ({
                              ...prev,
                              durationYears: val === 'custom' ? '' : val,
                              isCustomDuration: val === 'custom'
                            }))
                          }}
                          defaultValue="1"
                        >
                          <option value="1">1 Year</option>
                          <option value="2">2 Years</option>
                          <option value="3">3 Years</option>
                          <option value="custom">Custom Years</option>
                        </select>
                      </div>

                      {bookingData.isCustomDuration && (
                        <div className="form-group">
                          <label>Enter Years</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            placeholder="e.g. 5"
                            onChange={(e) => setBookingData({ ...bookingData, durationYears: e.target.value })}
                            required
                          />
                        </div>
                      )}

                      <button type="submit" className="btn-success">
                        Request Booking
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="admin-status-badge">
                  <span>Status: <strong>{property.isApproved ? 'Approved' : 'Pending Approval'}</strong></span>
                </div>
              )}
            </div>

            <div className="landlord-card">
              <h3>Landlord Info</h3>
              <p className="landlord-name">
                <strong>{property.landlordName}</strong>
              </p>
              <p className="landlord-contact">{property.landlordPhone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetails
