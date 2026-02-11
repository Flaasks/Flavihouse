import React, { useEffect, useState } from 'react'
import api from '../api'

// Dev-only component that pings the backend root or /health to show status.
export default function BackendStatus(){
  const [status, setStatus] = useState({ ok: null, loading: true, text: '' })

  useEffect(() => {
    let mounted = true
    const ping = async () => {
      setStatus({ ok: null, loading: true, text: 'Checking...' })
      try {
        // try /health then /
        await api.get('/health').then(() => {
          if (!mounted) return
          setStatus({ ok: true, loading: false, text: 'Backend OK (/health)' })
        }).catch(async () => {
          // fallback to root
          try {
            await api.get('/').then(() => {
              if (!mounted) return
              setStatus({ ok: true, loading: false, text: 'Backend OK (/)' })
            }).catch(() => {
              if (!mounted) return
              setStatus({ ok: false, loading: false, text: 'No backend response' })
            })
          } catch (e) {
            if (!mounted) return
            setStatus({ ok: false, loading: false, text: 'No backend response' })
          }
        })
      } catch (e) {
        if (!mounted) return
        setStatus({ ok: false, loading: false, text: 'No backend response' })
      }
    }
    ping()
    const id = setInterval(ping, 10_000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div style={{ fontSize:12, opacity:0.9, marginTop:8 }}>
      <strong>Backend:</strong> {status.loading ? 'checking...' : status.ok ? <span style={{color:'green'}}>{status.text}</span> : <span style={{color:'crimson'}}>{status.text}</span>}
    </div>
  )
}
