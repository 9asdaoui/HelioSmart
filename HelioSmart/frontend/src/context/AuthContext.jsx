import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // { id, email, role, company_name }
  const [token, setToken] = useState(() => localStorage.getItem('hs_token'))
  const [loading, setLoading] = useState(true)

  // On mount: if token exists, verify it and restore user
  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(({ data }) => setUser(data))
        .catch(() => { logout() })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const _persist = (tokenValue, userData) => {
    localStorage.setItem('hs_token', tokenValue)
    setToken(tokenValue)
    setUser(userData)
  }

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    _persist(data.access_token, { id: data.user_id, email: data.email, role: data.role })
    return data
  }, [])

  const register = useCallback(async (email, password, role, company_name) => {
    const { data } = await authAPI.register({ email, password, role, company_name })
    _persist(data.access_token, { id: data.user_id, email: data.email, role: data.role })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('hs_token')
    setToken(null)
    setUser(null)
  }, [])

  const isVendor = user?.role === 'vendor' || user?.role === 'admin'
  const isAdmin  = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, isVendor, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
