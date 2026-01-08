// Authentication controller for user registration and login
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const axios = require("axios")
const path = require("path")
const crypto = require("crypto")
const nodemailer = require("nodemailer")

// Generate JWT token for authenticated user
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    )
}

// User registration handler
exports.register = async (req, res) => {
    try {
        const pool = req.app.locals.pool
        const { name, email, password, phone, address, role, idProofType, googleToken, googleId, profilePicture } = req.body

        let hashedPassword = null
        let isGoogleAuth = false

        // Check if this is Google OAuth registration
        if (googleToken && googleId) {
            isGoogleAuth = true
        } else {
            // Validate password for regular registration
            if (!password) {
                return res.status(400).json({ message: "Password is required" })
            }
            // Password must have: lowercase, uppercase, digit, special char, min 8 length
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ message: "Password does not meet complexity requirements." })
            }
            hashedPassword = await bcrypt.hash(password, 10)
        }

        // Validate email based on user role
        const emailLower = email ? email.toLowerCase() : ''
        const isGmailValid = emailLower.endsWith('@gmail.com')
        const isGharPataValid = emailLower.endsWith('@gharpata.com')
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" })
        }
        
        // Admin accounts must use @gharpata.com email
        if (role === 'admin') {
            if (!isGharPataValid) {
                return res.status(400).json({ message: "Admin accounts must use gharpata.com email" })
            }
        } else {
            // Regular users must use Gmail
            if (!isGmailValid) {
                return res.status(400).json({ message: "Please use a valid Gmail address (e.g., name@gmail.com)" })
            }
        }

        // Validate Nepali phone number format (starts with 9, 10 digits total)
        const phoneRegex = /^9\d{9}$/
        if (!phone || !phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Invalid phone number." })
        }

        // Check if user already exists
        const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        if (existing.length > 0) {
            return res.status(400).json({ message: "User already exists" })
        }

        // Handle ID proof file upload
        const idProof = req.file ? req.file.filename : (req.body.idProof || null)
        if (!isGoogleAuth && !idProof) {
            return res.status(400).json({ message: "ID Proof is required" })
        }

        // Insert new user into database
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, address, role, idProof, idProofType, isApproved, google_id, profilePicture, oauth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                name, email, hashedPassword, phone, address, role, idProof, idProofType,
                role === "admin" ? true : false, // Auto-approve admins
                googleId || null, profilePicture || null,
                isGoogleAuth ? 'google' : 'local'
            ]
        )

        res.status(201).json({ message: "User registered successfully" })

    } catch (error) {
        console.error("Register Error:", error)
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.error("DB Schema mismatch")
        }
        res.status(500).json({ message: "Registration failed", error: error.message })
    }
}

// User login handler
exports.login = async (req, res) => {
    try {
        const pool = req.app.locals.pool
        const { email, password, role } = req.body

        // Validate Email - Gmail or GharPata allowed
        if (!email) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        
        const emailLower = email.toLowerCase()
        const isGmailValid = emailLower.endsWith('@gmail.com')
        const isGharPataValid = emailLower.endsWith('@gharpata.com')
        
        if (!isGmailValid && !isGharPataValid) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        if (users.length === 0) return res.status(401).json({ message: "Invalid credentials" })

        const user = users[0]

        if (!user.isApproved && user.role !== "admin") {
            return res.status(403).json({ message: "Account pending approval" })
        }

        // Check Account Suspension
        if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
            const remainingDays = Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60 * 24))
            return res.status(403).json({ 
                message: `Account suspended for 2 weeks. Re-login in ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
                isSuspended: true,
                remainingDays: remainingDays
            })
        }

        // Validate Role if specified
        if (role && user.role !== role) {
            return res.status(401).json({ message: `Access denied. This account is not registered as a ${role}.` })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" })

        const token = generateToken(user)

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, profilePicture: user.profilePicture }
        })

    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message })
    }
}

// GOOGLE AUTH
exports.googleAuth = async (req, res) => {
    try {
        const { access_token, role } = req.body
        if (!access_token) return res.status(400).json({ message: "Token required" })

        let googleUser
        try {
            const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            })
            googleUser = response.data
        } catch (err) {
            return res.status(401).json({ message: "Invalid Google Token" })
        }

        const { email, name, picture, sub: googleId } = googleUser
        const pool = req.app.locals.pool

        const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email])

        if (existing.length > 0) {
            // LOGIN
            const user = existing[0]

            if (!user.isApproved && user.role !== "admin") {
                return res.status(403).json({ message: "Account pending approval. Please wait for admin verification." })
            }

            // Check Account Suspension
            if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
                const remainingDays = Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60 * 24))
                return res.status(403).json({ 
                    message: `Account suspended for 2 weeks. Re-login in ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
                    isSuspended: true,
                    remainingDays: remainingDays
                })
            }

            // Validate Role if specified on the frontend
            if (role && user.role !== role) {
                return res.status(401).json({ message: `Access denied. This account is not registered as a ${role}.` })
            }

            if (!user.google_id) {
                await pool.query("UPDATE users SET google_id = ?, profilePicture = ? WHERE id = ?", [googleId, picture, user.id])
            }

            const token = generateToken(user)

            return res.json({
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address, profilePicture: user.profilePicture, oauth_provider: 'google' },
                message: "Login successful"
            })

        } else {
            // REGISTER PROMPT
            return res.status(200).json({
                isNewUser: true,
                message: "User not registered",
                googleProfile: { name, email, googleId, picture, access_token }
            })
        }

    } catch (error) {
        console.error("Google Auth Error:", error)
        res.status(500).json({ message: "Authentication failed", error: error.message })
    }
}

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) return res.status(400).json({ message: "Email is required" })

        // Validate Email - Gmail or GharPata allowed
        const emailLower = email.toLowerCase()
        const isGmailValid = emailLower.endsWith('@gmail.com')
        const isGharPataValid = emailLower.endsWith('@gharpata.com')
        
        if (!isGmailValid && !isGharPataValid) {
            return res.status(400).json({ message: "Please use a valid Gmail or GharPata email address" })
        }

        const pool = req.app.locals.pool
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        
        if (users.length === 0) {
            return res.status(404).json({ message: "No account found with that email address" })
        }

        const user = users[0]
        
        if (user.oauth_provider === 'google' && !user.password) {
            return res.status(400).json({ message: "This account uses Google Login. Please use Google Login instead." })
        }

        const resetToken = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration

        await pool.query(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            [email, resetToken, expiresAt]
        )

        // Setup Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })

        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending to system email for FYP demonstration
            subject: `GharPata - Password Reset Request for ${email}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <div style="background-color: #fef3c7; color: #92400e; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-weight: bold;">
                        FYP Demonstration Mode: This email was originally intended for ${email} but was routed here for testing.
                    </div>
                    <h2>Password Reset Request</h2>
                    <p>Hello ${user.name},</p>
                    <p>A password reset was requested for the dummy account: <strong>${email}</strong> (Role: ${user.role}).</p>
                    <p>Click the link below to reset the password for this account:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="padding: 12px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="font-size: 0.875rem; color: #64748b;">This link will expire in 1 hour.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 0.75rem; color: #94a3b8; text-align: center;">GharPata FYP Project | System Generated Email</p>
                </div>
            `
        }

        await transporter.sendMail(mailOptions)

        res.json({ message: "Password reset link sent to your email" })

    } catch (error) {
        console.error("Forgot Password Error:", error)
        res.status(500).json({ message: "Failed to process password reset request", error: error.message })
    }
}

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" })
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: "Password does not meet complexity requirements." })
        }

        const pool = req.app.locals.pool

        // Check if token is valid and not expired
        const [resets] = await pool.query(
            "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            [token]
        )

        if (resets.length === 0) {
            return res.status(400).json({ message: "Invalid or expired password reset token" })
        }

        const resetRecord = resets[0]
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update user password
        await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, resetRecord.email])

        // Invalidate token
        await pool.query("DELETE FROM password_resets WHERE email = ?", [resetRecord.email])

        res.json({ message: "Password has been reset successfully" })

    } catch (error) {
        console.error("Reset Password Error:", error)
        res.status(500).json({ message: "Failed to reset password", error: error.message })
    }
}
