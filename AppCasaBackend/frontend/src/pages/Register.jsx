import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthCard from '../components/AuthCard'
import { Link } from 'react-router-dom'
import { useToast } from '../hooks/useToast'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const auth = useAuth()
  const nav = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    // client-side validation
    if (!name || !email || !password) {
      toast.push({ message: 'Name, email and password are required', level: 'error' })
      return
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      toast.push({ message: 'Inserisci una email valida', level: 'error' })
      return
    }
    setLoading(true)
    try{
      await auth.register({ email, password, name, householdName: householdName || undefined })
      nav('/')
    }catch(err){
      console.error(err)
      toast.push({ message: err?.response?.data?.message || 'Errore registrazione', level: 'error' })
    }finally{ setLoading(false) }
  }

  return (
    <AuthCard title="Create account" subText={(<>Already registered? <Link to="/login">Sign In</Link></>)}>
      <form onSubmit={submit} className="auth-form" aria-busy={loading}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="email address" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input placeholder="Household name (optional)" value={householdName} onChange={e=>setHouseholdName(e.target.value)} />
        <button type="submit" className="primary" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
      </form>
    </AuthCard>
  )
}
