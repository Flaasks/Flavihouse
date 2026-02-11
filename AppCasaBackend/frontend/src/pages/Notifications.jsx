import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchNotifications, markNotificationRead, markAllRead } from '../services/notifications'
import { useToast } from '../hooks/useToast'

export default function Notifications(){
  const auth = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!auth?.user) return
    setLoading(true)
    const hid = auth.user.householdId
    const p = hid ? fetchNotifications(hid) : fetchNotifications(null)
    p.then(d=>setItems(d || [])).catch((err)=>{ console.error(err); toast.push({ message: 'Errore caricamento notifiche', level:'error' }) }).finally(()=>setLoading(false))
  }, [auth?.user])

  return (
    <div className="container">
      <div className="card">
        <h2>Notifications</h2>
        {loading && <div>Caricamento...</div>}
        {!loading && items.length===0 && <div>Nessuna notifica</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
          {items.map(n => {
            const payload = n.payload || {};
            const title = payload.title || n.title || n.type;
            const state = payload.state || '';
            const formatItalian = (iso) => {
              if (!iso) return '';
              try {
                const d = new Date(iso);
                const fmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return fmt.format(d);
              } catch (e) { return new Date(iso).toLocaleString(); }
            };
            const message = payload.reminderId ? (state ? `${state} — ${formatItalian(payload.remindAt)}` : formatItalian(payload.remindAt)) : (n.message || '');
            return (
            <div key={n.id} className="card" style={{ padding:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{title}</div>
                  <div style={{ fontSize:13, color:'#444' }}>
                    {state && <span style={{ fontWeight:600, marginRight:8 }}>{state}</span>}
                    <span>{formatItalian(payload.remindAt) || n.message}</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button onClick={async ()=>{ try{ await markNotificationRead(n.id); setItems(items.filter(i=>i.id!==n.id)); toast.push({ message:'Notifica segnata' }); window.dispatchEvent(new Event('notifications:changed')) }catch(err){ console.error(err); toast.push({ message:'Errore', level:'error' }) } }}>Segna letta</button>
                  
                  {/* notify others (header) that notifications changed */}
                  <script dangerouslySetInnerHTML={{__html: `// no-op`}} />
                </div>
              </div>
            </div>
            );
          })}
        </div>
        <div style={{ marginTop:12 }}>
          <button onClick={async ()=>{ try{ await markAllRead(); setItems([]); toast.push({ message: 'Tutte segnate' }); window.dispatchEvent(new Event('notifications:changed')) }catch(err){ console.error(err); toast.push({ message:'Errore', level:'error' }) } }}>Segna tutte lette</button>
        </div>
      </div>
    </div>
  )
}
