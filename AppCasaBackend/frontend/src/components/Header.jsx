import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchNotifications, markAllRead } from '../services/notifications'
import { Link } from 'react-router-dom'

export default function Header(){
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const auth = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!auth?.user) return
    setLoadingNotifs(true)
    const hid = auth.user.householdId
    const fetcher = hid ? fetchNotifications(hid) : fetchNotifications(null)
    fetcher.then(data => { setNotifications(data); setUnreadCount((data && data.length) || 0) }).catch(()=>{}).finally(()=>setLoadingNotifs(false))
  }, [auth?.user])

  useEffect(() => {
    const handler = () => {
      const hid = auth?.user?.householdId
      const fetcher = hid ? fetchNotifications(hid) : fetchNotifications(null)
      fetcher.then(data => { setNotifications(data); setUnreadCount((data && data.length) || 0) }).catch(()=>{})
    }
    window.addEventListener('notifications:changed', handler)
    return () => window.removeEventListener('notifications:changed', handler)
  }, [auth?.user])

  return (
    <header>
      <div className="header-left">
        <div className="hamburger" onClick={() => setOpen(!open)} aria-label="menu">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#111" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg>
        </div>
        <div className="brand"><Link to="/">AppCasa</Link></div>
      </div>

      <nav style={{ display: open ? 'block' : 'none', position: 'absolute', left:8, top:56, background:'#fff', padding:8, borderRadius:6 }}>
        <div><Link to="/">Home</Link></div>
        <div><Link to="/analytics">Analytics</Link></div>
        <div><Link to="/tasks">Tasks</Link></div>
        <div><Link to="/reminders">Reminders</Link></div>
        <div><Link to="/shopping">Shopping</Link></div>
        <div><Link to="/notifications">Notifications</Link></div>
        <div><Link to="/settings">Settings</Link></div>
      </nav>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {auth?.user ? (
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div>{auth.user.name}</div>
            <button onClick={() => auth.logout()}>Logout</button>
          </div>
        ) : (
          <div style={{display:'flex', gap:8}}>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
        <div className="notifications-toggle" onClick={() => setNotifOpen(!notifOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#111" d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zM18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"/></svg>
        </div>
      </div>

      {notifOpen && (
        <div style={{ position:'absolute', right:12, top:56, width:360 }} className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontWeight:700 }}>Notifiche</div>
            <div style={{ fontSize:12 }}>
              <button disabled={markingAll} onClick={async ()=>{ try{ setMarkingAll(true); await markAllRead(); setNotifications([]); setUnreadCount(0) }catch(e){ console.error(e) }finally{ setMarkingAll(false) } }}>Segna tutte lette</button>
            </div>
          </div>
          {loadingNotifs && <div style={{ color:'#666' }}>Caricamento...</div>}
          {!loadingNotifs && notifications.length===0 && <div style={{ color:'#666' }}>Nessuna notifica</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {notifications.map(n => (
              <div key={n.id} style={{ borderBottom: '1px solid #eee', paddingBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{n.title || n.type}</div>
                <div style={{ fontSize:12, color:'#555' }}>{n.message || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
