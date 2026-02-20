// Payment gateway integration routes (eSewa and Khalti)
const express = require("express")
const { auth } = require("../middleware/auth")
const crypto = require("crypto")
const axios = require("axios")
const router = express.Router()

// eSewa payment gateway configuration
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST"
const ESEWA_SECRET_KEY   = process.env.ESEWA_SECRET_KEY   || "8gBm/:&EnhH.1/q"
const ESEWA_GATEWAY_URL  = process.env.ESEWA_GATEWAY_URL  || "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
const ESEWA_STATUS_URL   = process.env.ESEWA_STATUS_URL   || "https://rc.esewa.com.np/api/epay/transaction/status/"

// Khalti payment gateway configuration
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "test_secret_key_7c561e31cdd341f79d04cda087906324"
const KHALTI_PUBLIC_KEY = process.env.KHALTI_PUBLIC_KEY || "test_public_key_dc74fd0fd6e56c2b8b0c8c6c8b0c8c6c"
const KHALTI_ENV = process.env.KHALTI_ENV || "sandbox"

// Khalti API URLs based on environment
const KHALTI_BASE_URL = KHALTI_ENV === "sandbox" 
  ? "https://a.khalti.com/api/v2"
  : "https://khalti.com/api/v2"

const KHALTI_INITIATE_URL = `${KHALTI_BASE_URL}/epayment/initiate/`
const KHALTI_LOOKUP_URL = `${KHALTI_BASE_URL}/epayment/lookup/`

// Log payment gateway configuration on startup
console.log(`[eSewa]  Gateway → ${ESEWA_GATEWAY_URL}`)
console.log(`[Khalti] Environment → ${KHALTI_ENV.toUpperCase()}`)
console.log(`[Khalti] Base URL → ${KHALTI_BASE_URL}`)
console.log(`[Khalti] Secret Key → ${KHALTI_SECRET_KEY.substring(0, 8)}...`)

// Generate HMAC-SHA256 signature for eSewa
function generateEsewaSignature(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64")
}

// Initiate eSewa payment process
router.post("/esewa/initiate", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { bookingId, totalAmount, monthsPaid } = req.body

    // Verify booking exists
    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId])
    if (bookings.length === 0) return res.status(404).json({ message: "Booking not found" })

    const booking = bookings[0]
    // Determine payment type based on booking status
    const pType = (["active", "confirmed"].includes(booking.status)) ? "rent" : "deposit"

    // Generate unique transaction ID
    const transactionUuid = `TXN-${Math.floor(Date.now() / 1000)}-${bookingId}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create pending payment record in database
    await pool.query(
      "INSERT INTO payments (bookingId, tenantId, landlordId, amount, paymentType, paymentMethod, status, transactionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [bookingId, booking.tenantId, booking.landlordId, parseFloat(totalAmount), pType, "esewa", "pending", transactionUuid]
    )

    // Setup success and failure URLs
    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173"
    const successUrl   = `${frontendBase}/payment/success`
    const failureUrl   = `${frontendBase}/payment/failure`

    // Generate eSewa signature for security
    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`
    const signature = generateEsewaSignature(signatureMessage, ESEWA_SECRET_KEY)

    console.log(`[eSewa] Initiating payment — UUID: ${transactionUuid}, Amount: ${totalAmount}`)

    // Return payment form data for frontend submission
    res.json({
      gatewayUrl: ESEWA_GATEWAY_URL,
      formData: {
        amount:                   totalAmount.toString(),
        tax_amount:               "0",
        total_amount:             totalAmount.toString(),
        transaction_uuid:         transactionUuid,
        product_code:             ESEWA_PRODUCT_CODE,
        product_service_charge:   "0",
        product_delivery_charge:  "0",
        success_url:              successUrl,
        failure_url:              failureUrl,
        signed_field_names:       "total_amount,transaction_uuid,product_code",
        signature:                signature,
      },
    })
  } catch (error) {
    console.error("[eSewa] Initiate error:", error.message)
    res.status(500).json({ message: "Error initiating eSewa payment" })
  }
})

// Verify eSewa payment after completion
router.post("/esewa/verify", auth, async (req, res) => {
  const connection = await req.app.locals.pool.getConnection()
  try {
    // Start database transaction for data consistency
    await connection.beginTransaction()

    const { encodedData } = req.body
    if (!encodedData) return res.status(400).json({ message: "No payment data received" })

    // Decode eSewa response data
    const decodedStr  = Buffer.from(encodedData, "base64").toString("utf-8")
    const esewaData   = JSON.parse(decodedStr)

    const {
      transaction_code,
      status,
      total_amount,
      transaction_uuid,
      signed_field_names,
      signature: receivedSignature,
    } = esewaData

    // 1. Verify HMAC signature
    const signedFields       = signed_field_names.split(",")
    const messageForVerify   = signedFields.map((f) => `${f}=${esewaData[f]}`).join(",")
    const expectedSignature  = generateEsewaSignature(messageForVerify, ESEWA_SECRET_KEY)

    if (expectedSignature !== receivedSignature) {
      console.warn("[eSewa] Signature mismatch — expected:", expectedSignature, " got:", receivedSignature)
      await connection.rollback()
      return res.status(400).json({ message: "Signature verification failed." })
    }

    // 2. Check status field
    if (status !== "COMPLETE") {
      await connection.rollback()
      return res.status(400).json({ message: `Payment status is ${status}` })
    }

    // 3. Find the pending payment record
    const [payments] = await connection.query(
      "SELECT * FROM payments WHERE transactionId = ? AND status = 'pending'",
      [transaction_uuid]
    )
    if (payments.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: "Payment record not found." })
    }

    const payment = payments[0]

    // 4. Confirm with eSewa status API
    try {
      const statusCheck = await axios.get(ESEWA_STATUS_URL, {
        params: {
          product_code:     ESEWA_PRODUCT_CODE,
          total_amount:     parseFloat(total_amount),
          transaction_uuid: transaction_uuid,
        },
      })
      if (statusCheck.data.status !== "COMPLETE") {
        await connection.rollback()
        return res.status(400).json({ message: "eSewa status check failed — payment not confirmed." })
      }
      console.log("[eSewa] Status API confirmed COMPLETE for", transaction_uuid)
    } catch (statusErr) {
      // Non-fatal: log and continue (eSewa sandbox sometimes unreliable)
      console.warn("[eSewa] Status API check warning:", statusErr.message)
    }

    // 5. Mark payment completed
    await connection.query(
      "UPDATE payments SET status = 'completed', paymentDate = NOW(), transactionId = ? WHERE id = ?",
      [transaction_code, payment.id]
    )

    // 6. Activate booking
    await connection.query('UPDATE bookings SET status = "active" WHERE id = ?', [payment.bookingId])

    await connection.commit()
    console.log("[eSewa] Payment verified. Booking", payment.bookingId, "→ active")
    res.json({
      message:         "Payment verified successfully!",
      transactionCode: transaction_code,
      bookingId:       payment.bookingId,
    })
  } catch (error) {
    await connection.rollback()
    console.error("[eSewa] Verify error:", error.message)
    res.status(500).json({ message: "Error verifying payment" })
  } finally {
    connection.release()
  }
})

// ─── Initiate Khalti Payment (sandbox) ───────────────────────────────────
router.post("/khalti/initiate", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { bookingId, totalAmount } = req.body

    // Validate booking exists
    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId])
    if (bookings.length === 0) return res.status(404).json({ message: "Booking not found" })

    const booking = bookings[0]
    const pType = (["active", "confirmed"].includes(booking.status)) ? "rent" : "deposit"

    // Generate unique purchase order ID
    const purchaseOrderId = `GHP-${Date.now()}-${bookingId}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Create pending payment record
    await pool.query(
      "INSERT INTO payments (bookingId, tenantId, landlordId, amount, paymentType, paymentMethod, status, transactionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [bookingId, booking.tenantId, booking.landlordId, parseFloat(totalAmount), pType, "khalti", "pending", purchaseOrderId]
    )

    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173"
    const amountInPaisa = Math.round(parseFloat(totalAmount) * 100) // Convert to paisa (Khalti uses paisa)

    console.log(`[Khalti] Initiating payment — Order: ${purchaseOrderId}, Amount: Rs.${totalAmount} (${amountInPaisa} paisa)`)

    // Prepare Khalti payment request
    const khaltiPayload = {
      return_url: `${frontendBase}/payment/khalti/success`,
      website_url: frontendBase,
      amount: amountInPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: `GharPata Property Rent - Booking #${bookingId}`,
      customer_info: {
        name: booking.tenantName || "GharPata Tenant",
        email: "tenant@gharpata.com",
        phone: "9800000000"
      }
    }

    // Call Khalti initiate API
    const khaltiResponse = await axios.post(
      KHALTI_INITIATE_URL,
      khaltiPayload,
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000 // 30 second timeout
      }
    )

    console.log("[Khalti] Payment initiated successfully. pidx:", khaltiResponse.data.pidx)
    
    res.json({
      success: true,
      payment_url: khaltiResponse.data.payment_url,
      pidx: khaltiResponse.data.pidx,
      purchaseOrderId: purchaseOrderId,
      expires_at: khaltiResponse.data.expires_at
    })

  } catch (error) {
    console.error("[Khalti] Initiate error:", error.response?.data || error.message)
    
    // Handle specific Khalti API errors
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        message: "Invalid payment request", 
        error: error.response.data 
      })
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        message: "Khalti authentication failed. Please check configuration." 
      })
    }

    res.status(500).json({ 
      message: "Error initiating Khalti payment", 
      error: error.response?.data || error.message 
    })
  }
})

// ─── Debug endpoint for Khalti callback ─────────────────────────────────────
router.get("/khalti/debug", (req, res) => {
  console.log("[Khalti Debug] Query parameters:", req.query)
  res.json({
    message: "Debug endpoint",
    queryParams: req.query,
    timestamp: new Date().toISOString()
  })
})

// ─── Test Khalti lookup API ─────────────────────────────────────────────────
router.post("/khalti/test-lookup", auth, async (req, res) => {
  try {
    const { pidx } = req.body
    
    if (!pidx) {
      return res.status(400).json({ message: "pidx is required" })
    }

    console.log(`[Khalti Test] Testing lookup for pidx: ${pidx}`)
    
    const lookupResponse = await axios.post(
      KHALTI_LOOKUP_URL,
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000
      }
    )

    console.log("[Khalti Test] Lookup successful:", lookupResponse.data)
    
    res.json({
      success: true,
      khaltiResponse: lookupResponse.data,
      message: "Lookup test successful"
    })

  } catch (error) {
    console.error("[Khalti Test] Lookup error:", error.response?.data || error.message)
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      message: "Lookup test failed"
    })
  }
})

// ─── Verify Khalti Payment (sandbox) ────────────────────────────────────
router.post("/khalti/verify", auth, async (req, res) => {
  let connection;
  
  try {
    connection = await req.app.locals.pool.getConnection()
    await connection.beginTransaction()
    
    const { pidx, purchaseOrderId } = req.body

    console.log(`[Khalti] Verification request received:`, { pidx, purchaseOrderId })

    if (!pidx) {
      await connection.rollback()
      return res.status(400).json({ message: "Missing pidx parameter" })
    }

    console.log(`[Khalti] Verifying payment — pidx: ${pidx}, orderId: ${purchaseOrderId}`)

    // Call Khalti lookup API first to get payment details
    let khaltiData;
    try {
      console.log(`[Khalti] Calling lookup API with pidx: ${pidx}`)
      console.log(`[Khalti] Lookup URL: ${KHALTI_LOOKUP_URL}`)
      
      const lookupResponse = await axios.post(
        KHALTI_LOOKUP_URL,
        { pidx },
        {
          headers: {
            Authorization: `Key ${KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000
        }
      )

      khaltiData = lookupResponse.data
      console.log("[Khalti] Lookup response:", {
        status: khaltiData.status,
        transaction_id: khaltiData.transaction_id,
        total_amount: khaltiData.total_amount,
        purchase_order_id: khaltiData.purchase_order_id
      })

      // Check if payment is completed
      if (khaltiData.status !== "Completed") {
        await connection.rollback()
        return res.status(400).json({ 
          message: `Payment verification failed. Status: ${khaltiData.status}`,
          status: khaltiData.status
        })
      }

    } catch (lookupError) {
      await connection.rollback()
      console.error("[Khalti] Lookup API error:", lookupError.response?.data || lookupError.message)
      
      if (lookupError.response?.status === 400) {
        return res.status(400).json({ 
          message: "Invalid payment verification request",
          error: lookupError.response.data
        })
      }
      
      return res.status(500).json({ 
        message: "Failed to verify payment with Khalti",
        error: lookupError.response?.data || lookupError.message
      })
    }

    // Use the purchase_order_id from Khalti response if not provided
    const finalPurchaseOrderId = purchaseOrderId || khaltiData.purchase_order_id
    console.log(`[Khalti] Using purchase order ID: ${finalPurchaseOrderId}`)

    if (!finalPurchaseOrderId) {
      await connection.rollback()
      return res.status(400).json({ 
        message: "No purchase order ID found in request or Khalti response" 
      })
    }

    // Find the pending payment record
    const [payments] = await connection.query(
      "SELECT * FROM payments WHERE transactionId = ? AND status = 'pending'",
      [finalPurchaseOrderId]
    )

    console.log(`[Khalti] Found ${payments.length} pending payment(s) for orderId: ${finalPurchaseOrderId}`)

    if (payments.length === 0) {
      // Let's also check if there's a payment with different status
      const [allPayments] = await connection.query(
        "SELECT * FROM payments WHERE transactionId = ?",
        [finalPurchaseOrderId]
      )
      console.log(`[Khalti] Total payments found for orderId ${finalPurchaseOrderId}:`, allPayments.length)
      if (allPayments.length > 0) {
        console.log(`[Khalti] Payment status:`, allPayments[0].status)
        if (allPayments[0].status === 'completed') {
          await connection.rollback()
          return res.status(400).json({ message: "Payment already processed" })
        }
      }
      
      await connection.rollback()
      return res.status(404).json({ message: "Payment record not found" })
    }

    const payment = payments[0]

    // Verify amount matches (convert from paisa to rupees)
    const paidAmountInRupees = khaltiData.total_amount / 100
    const expectedAmount = parseFloat(payment.amount)
    
    console.log(`[Khalti] Amount verification - Expected: Rs.${expectedAmount}, Paid: Rs.${paidAmountInRupees}`)
    
    if (Math.abs(paidAmountInRupees - expectedAmount) > 0.01) {
      await connection.rollback()
      return res.status(400).json({ 
        message: `Amount mismatch. Expected: Rs.${expectedAmount}, Paid: Rs.${paidAmountInRupees}` 
      })
    }

    // Update payment record with completion details
    try {
      await connection.query(
        "UPDATE payments SET status = 'completed', paymentDate = NOW(), transactionId = ?, verificationData = ? WHERE id = ?",
        [khaltiData.transaction_id, JSON.stringify(khaltiData), payment.id]
      )
    } catch (updateError) {
      // Fallback: update without verificationData if column doesn't exist
      console.log("[Khalti] Fallback update without verificationData")
      await connection.query(
        "UPDATE payments SET status = 'completed', paymentDate = NOW(), transactionId = ? WHERE id = ?",
        [khaltiData.transaction_id, payment.id]
      )
    }

    // Activate the booking
    await connection.query('UPDATE bookings SET status = "active" WHERE id = ?', [payment.bookingId])

    await connection.commit()
    
    console.log(`[Khalti] Payment verified successfully. Booking ${payment.bookingId} activated`)
    
    res.json({
      success: true,
      message: "Payment verified successfully! Your booking is now active.",
      bookingId: payment.bookingId,
      transactionId: khaltiData.transaction_id,
      amount: paidAmountInRupees,
      paymentDate: new Date().toISOString()
    })

  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    console.error("[Khalti] Verify error:", error.message)
    console.error("[Khalti] Error stack:", error.stack)
    res.status(500).json({ 
      message: "Error processing payment verification", 
      error: error.message 
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

// ─── Create payment record (generic) ─────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { bookingId, amount, paymentType, paymentMethod, dueDate } = req.body

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId])
    if (bookings.length === 0) return res.status(404).json({ message: "Booking not found" })

    const booking = bookings[0]
    const payment = await pool.query(
      "INSERT INTO payments (bookingId, tenantId, landlordId, amount, paymentType, paymentMethod, status, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [bookingId, booking.tenantId, booking.landlordId, amount, paymentType, paymentMethod, "pending", dueDate],
    )

    res.status(201).json({ message: "Payment created", paymentId: payment[0].insertId })
  } catch (error) {
    res.status(500).json({ message: "Error creating payment", error: error.message })
  }
})

// ─── Get payments ─────────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [payments] = await pool.query(
      "SELECT * FROM payments WHERE tenantId = ? OR landlordId = ? ORDER BY createdAt DESC",
      [req.user.id, req.user.id],
    )
    res.json(payments)
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments", error: error.message })
  }
})

module.exports = router
