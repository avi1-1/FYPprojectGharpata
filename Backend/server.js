// Main server file for Gharpata rental management system
const express = require("express")
const cors = require("cors")
require("dotenv").config()

const { pool, testConnection } = require("./config/database")

const app = express()

// Enable CORS for cross-origin requests
app.use(cors())
// Parse JSON and URL-encoded data
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Serve static files for uploads
app.use("/uploads", express.static("public/uploads"))
app.use("/uploads/profiles", express.static("public/uploads/profiles"))

// Log all incoming requests with timestamp
app.use((req, res, next) => {
  res.set("X-GharPata-Debug", "True")
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Make database pool available to all routes
app.locals.pool = pool

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "GharPata Server Running", port: process.env.PORT || 5000 })
})

// Debug endpoint to check database connection
app.get("/debug/pool", (req, res) => {
  res.json({
    poolExists: !!app.locals.pool,
    poolType: typeof app.locals.pool,
    timestamp: new Date().toISOString()
  })
})

// Register all API routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/properties", require("./routes/properties"))
app.use("/api/bookings", require("./routes/bookings"))
app.use("/api/payments", require("./routes/payments"))
app.use("/api/complaints", require("./routes/complaints"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/users", require("./routes/users"))
// Test route for API connectivity
app.get("/api/test-route", (req, res) => res.json({ message: "Test route working" }))
// Load and register notification routes
const notifRouter = require("./routes/notifications")
console.log("[Server] Notification Router loaded:", !!notifRouter)
app.use("/api/notifications", notifRouter)

// 404 handler
app.use((req, res) => {
  console.log(`[Server] 404 - Not Found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ message: "Route not found - GHARPATA-DEBUG" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)

  // Log to file for deep diagnosis
  const fs = require('fs');
  const logData = `[${new Date().toISOString()}] GLOBAL ERROR: ${err.message}\nStack: ${err.stack}\nURL: ${req.url}\n\n`;
  try {
    fs.appendFileSync('server_error.log', logData);
  } catch (e) { }

  res.status(500).json({ message: "Internal server error", error: err.message })
})

const PORT = process.env.PORT || 5000

// Only start the HTTP server when this file is run directly (not when required by tests)
if (require.main === module) {
  testConnection().then(() => {
    app.listen(PORT, () => {
      console.log(`\n GharPata Backend Server running on http://localhost:${PORT}`)
      console.log(` Health check: http://localhost:${PORT}/health`)
      console.log(` API Base URL: http://localhost:${PORT}/api\n`)
    })
  })
}

module.exports = app
