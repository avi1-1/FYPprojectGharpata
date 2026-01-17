const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const axios = require("axios")
const path = require("path")

// Helper function to generate token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    )
}

// REGISTER
exports.register = async (req, res) => {
    try {
        const pool = req.app.locals.pool
        const { name, email, password, phone, address, role, idProofType, googleToken, googleId, profilePicture } = req.body

        let hashedPassword = null
        let isGoogleAuth = false

        // Check Google Auth
        if (googleToken && googleId) {
            isGoogleAuth = true
        } else {
            // Validate Password
            if (!password) {
                return res.status(400).json({ message: "Password is required" })
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ message: "Password does not meet complexity requirements." })
            }
            hashedPassword = await bcrypt.hash(password, 10)
        }

        // Validate Phone
        const phoneRegex = /^9\d{9}$/
        if (!phone || !phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Invalid phone number." })
        }

        // Check Existing User
        const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        if (existing.length > 0) {
            return res.status(400).json({ message: "User already exists" })
        }

        // Handle ID Proof File
        const idProof = req.file ? req.file.filename : (req.body.idProof || null)
        if (!isGoogleAuth && !idProof) {
            return res.status(400).json({ message: "ID Proof is required" })
        }

        // Insert User
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, address, role, idProof, idProofType, isApproved, google_id, profile_picture, oauth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                name, email, hashedPassword, phone, address, role, idProof, idProofType,
                role === "admin" ? true : false,
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

// LOGIN
exports.login = async (req, res) => {
    try {
        const pool = req.app.locals.pool
        const { email, password } = req.body

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        if (users.length === 0) return res.status(401).json({ message: "Invalid credentials" })

        const user = users[0]

        if (!user.isApproved && user.role !== "admin") {
            return res.status(403).json({ message: "Account pending approval" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" })

        const token = generateToken(user)

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        })

    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message })
    }
}

// GOOGLE AUTH
exports.googleAuth = async (req, res) => {
    try {
        const { access_token } = req.body
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

            if (!user.google_id) {
                await pool.query("UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?", [googleId, picture, user.id])
            }

            const token = generateToken(user)

            return res.json({
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address, profile_picture: user.profile_picture, oauth_provider: 'google' },
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
