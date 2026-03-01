import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/authApi'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [vendor, setVendor] = useState(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching current user
          const response = await authAPI.getMe()
          setUser(response.data)
          setIsAuthenticated(true)
          
          // If user is vendor, fetch vendor profile
          if (response.data.role === 'vendor') {
            try {
              const vendorResponse = await authAPI.getVendorProfile()
              setVendor(vendorResponse.data)
            } catch (error) {
              console.error('Failed to fetch vendor profile:', error)
            }
          }
        } catch (error) {
          // Token expired or invalid
          logout()
        }
      }
      
      setIsLoading(false)
    }
    
    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { access_token, user: userData } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      setUser(userData)
      setIsAuthenticated(true)
      
      // Fetch vendor profile if applicable
      if (userData.role === 'vendor') {
        try {
          const vendorResponse = await authAPI.getVendorProfile()
          setVendor(vendorResponse.data)
        } catch (error) {
          console.error('Failed to fetch vendor profile:', error)
        }
      }
      
      return { success: true, user: userData }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      }
    }
  }, [])

  const register = useCallback(async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { access_token, user: newUser } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(newUser))
      
      setUser(newUser)
      setIsAuthenticated(true)
      
      return { success: true, user: newUser }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      setUser(null)
      setVendor(null)
      setIsAuthenticated(false)
    }
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData)
      setUser(response.data)
      localStorage.setItem('user', JSON.stringify(response.data))
      return { success: true, user: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Update failed' 
      }
    }
  }, [])

  const registerAsVendor = useCallback(async (vendorData) => {
    try {
      const response = await authAPI.registerAsVendor(vendorData)
      setVendor(response.data)
      
      // Update user role
      const updatedUser = { ...user, role: 'vendor' }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      return { success: true, vendor: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Vendor registration failed' 
      }
    }
  }, [user])

  const updateVendorProfile = useCallback(async (vendorData) => {
    try {
      const response = await authAPI.updateVendorProfile(vendorData)
      setVendor(response.data)
      return { success: true, vendor: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Update failed' 
      }
    }
  }, [])

  const refreshVendorProfile = useCallback(async () => {
    if (user?.role === 'vendor') {
      try {
        const response = await authAPI.getVendorProfile()
        setVendor(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to refresh vendor profile:', error)
        return null
      }
    }
  }, [user])

  // Role-based helpers
  const isGuest = user?.role === 'guest'
  const isUser = user?.role === 'user'
  const isVendor = user?.role === 'vendor'
  const isEngineer = user?.role === 'engineer'
  const isAdmin = user?.role === 'admin'

  const value = {
    user,
    vendor,
    isAuthenticated,
    isLoading,
    isGuest,
    isUser,
    isVendor,
    isEngineer,
    isAdmin,
    login,
    register,
    logout,
    updateProfile,
    registerAsVendor,
    updateVendorProfile,
    refreshVendorProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
