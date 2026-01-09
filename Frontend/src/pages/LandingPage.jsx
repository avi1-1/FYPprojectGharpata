import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import { useState, useEffect } from "react"
import {
  Home,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  Search,
  MapPin,
  Star,
  BedDouble,
  Bath,
  Maximize2,
  Zap,
  CreditCard,
  MessageSquare,
  CheckCircle2
} from "lucide-react"
import "./LandingPage.css"

function LandingPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get("/api/properties")
        setProperties(response.data.slice(0, 6)) // Show top 6
      } catch (error) {
        console.error("Error fetching properties:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProperties()
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="landing-page">
      <nav className="navbar">
        <Link to="/" className="logo-container">
          <Home size={32} />
          <span className="logo-text">GharPata</span>
        </Link>
        <div className="nav-links">
          <button onClick={() => scrollToSection('hero')} className="nav-link btn-link"><b>Home</b></button>
          <button onClick={() => scrollToSection('properties-section')} className="nav-link btn-link"><b>Properties</b></button>
          <Link to="/register" className="nav-link"><b>Sign Up</b></Link>
          <Link to="/login" className="nav-link"><b>Login</b></Link>
        </div>
      </nav>

      <main>
        <section id="hero" className="hero">
          <div className="hero-orb orb-1"></div>
          <div className="hero-orb orb-2"></div>

          <div className="hero-content">
            <div className="hero-tagline">
              <ShieldCheck size={18} />
              <span>Trusted by 5000+ Tenants in Nepal</span>
            </div>
            <h1>Find Your Next <br /><span>Perfect Home</span></h1>
            <p>The most advanced house rental management system in Nepal. Connect with verified landlords, pay securely, and move in with peace of mind.</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start Searching <ArrowRight size={22} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Landlord Portal
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Properties Section */}
        <section id="properties-section" className="properties-section">
          <div className="section-header">
            <div className="tagline"><b>Explore Homes</b></div>
            <h2>Featured Properties</h2>
            <p>Hand-picked premium listings in your favorite locations. Approved and verified for your peace of mind.</p>
          </div>

          <div className="container">
            {loading ? (
              <div className="loading-grid">
                {[1, 2, 3].map(i => <div key={i} className="property-skeleton"></div>)}
              </div>
            ) : properties.length === 0 ? (
              <div className="empty-properties">
                <Home size={48} />
                <p>No verified properties available at the moment. Check back soon!</p>
              </div>
            ) : (
              <div className="properties-grid-main">
                {properties.map((property) => (
                  <div key={property.id} className="property-card-prime">
                    <div className="card-image-wrap">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={`http://localhost:5000/uploads/properties/${property.images[0]}`}
                          alt={property.title}
                        />
                      ) : (
                        <div className="image-placeholder-prime"><Home size={40} /></div>
                      )}
                      <div className="price-overlay">Rs. {property.rentPrice.toLocaleString()}</div>
                    </div>
                    <div className="card-content-prime">
                      <div className="property-meta-prime">
                        <span className="type-badge">{property.type}</span>
                        <div className="location-prime">
                          <MapPin size={14} /> {property.city}
                        </div>
                      </div>
                      <h3>{property.title}</h3>
                      <div className="features-prime">
                        <span><BedDouble size={16} /> {property.bedrooms} Bed</span>
                        <span><Bath size={16} /> {property.bathrooms} Bath</span>
                        <span><Maximize2 size={16} /> {property.area} sqft</span>
                      </div>
                      <button
                        className="btn-view-prime"
                        onClick={() => navigate('/login')}
                      >
                        View Details <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="view-all-center">
              <Link to="/login" className="btn btn-secondary">
                View All Listings <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-header">
            <h2>Why GharPata?</h2>
            <p>We've built a platform that solves the common headaches of house hunting and rental management.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={32} />
              </div>
              <h3>Verified Listings</h3>
              <p>Every property is manually reviewed by our team to ensure what you see is what you get.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Zap size={32} />
              </div>
              <h3>Instant Booking</h3>
              <p>No more back-and-forth. Book your preferred visit time or secure the room instantly.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <CreditCard size={32} />
              </div>
              <h3>Secure Payments</h3>
              <p>Integrated payment gateway with digital receipts and automated rent reminders.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <MessageSquare size={32} />
              </div>
              <h3>Direct Support</h3>
              <p>Built-in complaint system and direct communication with landlords for quick fixes.</p>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <div className="section-header">
            <h2>Simple 4-Step Process</h2>
            <p>Getting your dream home is now easier than ever.</p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number-badge">01</div>
              <div className="feature-icon-wrapper" style={{ margin: '0 auto 2rem' }}>
                <UserPlus size={28} />
              </div>
              <h3>Create Profile</h3>
              <p>Sign up as a tenant or landlord and complete your verification.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">02</div>
              <div className="feature-icon-wrapper" style={{ margin: '0 auto 2rem' }}>
                <Search size={28} />
              </div>
              <h3>Search & Filter</h3>
              <p>Use our advanced filters to find homes by location, price, and type.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">03</div>
              <div className="feature-icon-wrapper" style={{ margin: '0 auto 2rem' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3>Digital Agreement</h3>
              <p>Sign legally binding rental contracts digitally through the platform.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">04</div>
              <div className="feature-icon-wrapper" style={{ margin: '0 auto 2rem' }}>
                <MapPin size={28} />
              </div>
              <h3>Move In</h3>
              <p>Pay your first month rent and security deposit to get your keys!</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>GharPata</h2>
            <p>Nepal's first comprehensive house rental management platform. Dedicated to making renting easier for everyone.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/login">Browse Homes</Link></li>
              <li><Link to="/register">Become a Landlord</Link></li>
              <li><Link to="/login">Help Center</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Rental Rules</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <ul>
              <li>Kathmandu, Nepal</li>
              <li>info@gharpata.com</li>
              <li>+977-9847836829</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} GharPata Nepal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
