import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthCard from '../components/AuthCard'
import { Link } from 'react-router-dom'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const auth = useAuth()
  const nav = useNavigate()

  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try{
      await auth.login(email, password)
      nav('/')
    }catch(err){ setErr('Login fallito') } finally { setLoading(false) }
  }

  return (
    <AuthCard title="Welcome Back" subText={(<>Don't have an account yet? <Link to="/register">Sign up</Link></>)}>
      <form onSubmit={submit} className="auth-form">
        <input placeholder="email address" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit" className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        {err && <div className="auth-error">{err}</div>}
      </form>
    </AuthCard>
  )
}
