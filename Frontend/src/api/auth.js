import api from "./axios"

export const login = async (credentials) => {
    const response = await api.post("/api/auth/login", credentials)
    return response.data
}

export const register = async (userData) => {
    // Use generic axios because we're sending FormData (multipart)
    // or use api instance but let browser set content-type for FormData?
    // Axios automatically sets Content-Type to multipart/form-data if data is FormData
    const response = await api.post("/api/auth/register", userData)
    return response.data
}

export const googleAuth = async (token) => {
    const response = await api.post("/api/auth/google", { access_token: token })
    return response.data
}
