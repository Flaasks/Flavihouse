import { useState, useEffect, createContext, useContext } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token){ setLoading(false); return }
    // try to fetch /auth/me or /users/me
    api.get('/auth/me').then(res => {
      setUser(res.data.user)
    }).catch(()=>{
      localStorage.removeItem('token')
    }).finally(()=>setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    const me = await api.get('/auth/me')
    setUser(me.data.user)
    return res
  }
  const register = async (payload) => {
    const res = await api.post('/auth/register', payload)
    localStorage.setItem('token', res.data.token)
    const me = await api.get('/auth/me')
    setUser(me.data.user)
    return res
  }
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
