import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchReminders, createReminder, markReminderDone, deleteReminder } from '../services/reminders'
import { useToast } from '../hooks/useToast'

export default function Reminders(){
  const auth = useAuth()
  const [items, setItems] = useState([])
  const [doneItems, setDoneItems] = useState([])
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [shared, setShared] = useState(false)
  const [creating, setCreating] = useState(false)

  const toast = useToast()
  useEffect(()=>{
    if (!auth?.user) return
    fetchReminders().then(d=>{
      if (d && d.active !== undefined) {
        setItems(d.active || [])
        setDoneItems(d.done || [])
      } else {
        // backwards compatibility
        setItems(d || [])
        setDoneItems([])
      }
    }).catch(()=>{})
  }, [auth?.user])

  const doCreate = async (e) => {
    e.preventDefault()
    if (!title || !remindAt) {
      toast.push({ message: 'Titolo e data/ora richiesti', level: 'warning' })
      return
    }
    setCreating(true)
    try {
      await createReminder({ title, remindAt, shared })
      // refetch authoritative lists
      const d = await fetchReminders()
      if (d && d.active !== undefined) {
        setItems(d.active || [])
        setDoneItems(d.done || [])
      } else {
        setItems(d || [])
        setDoneItems([])
      }
      setTitle('')
      setRemindAt('')
      setShared(false)
      toast.push({ message: 'Reminder creato' })
    } catch (err) {
      console.error('create reminder failed', err)
      const serverMsg = err?.response?.data?.message || err?.message || 'Errore creazione reminder'
      toast.push({ message: serverMsg, level: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const doMark = async (id) => {
    const item = items.find(i=>i.id===id)
    const ok = window.confirm(`Segnare come completato: "${item?.title || ''}" ?`)
    if (!ok) return
    const res = await markReminderDone(id)
    // move to done
    setItems(items.filter(i=>i.id!==id))
    setDoneItems([res, ...doneItems])
  }

  const doDelete = async (id) => {
    try{
      const item = items.find(i=>i.id===id) || doneItems.find(i=>i.id===id)
      const ok = window.confirm(`Eliminare definitivamente: "${item?.title || ''}" ?`)
      if (!ok) return
      await deleteReminder(id)
      setItems(items.filter(i=>i.id!==id))
      setDoneItems(doneItems.filter(i=>i.id!==id))
      toast.push({ message: 'Reminder eliminata' })
    }catch(err){ toast.push({ message: 'Errore eliminazione', level: 'error' }) }
  }

  return (
    <div className="container">
      <div className="card"><h2>Reminders</h2>
        <form onSubmit={doCreate} style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input placeholder="Titolo" value={title} onChange={e=>setTitle(e.target.value)} />
          <input type="datetime-local" value={remindAt} onChange={e=>setRemindAt(e.target.value)} />
          <label><input type="checkbox" checked={shared} onChange={e=>setShared(e.target.checked)} /> Shared</label>
          <button type="submit" disabled={creating}>{creating ? 'Creando...' : 'Crea'}</button>
        </form>
      </div>

      <div style={{ marginTop:12 }}>
        <h3>Active reminders</h3>
        {items.length===0 && <div className="card">Nessun reminder attivo</div>}
        {items.map(i => (
          <div key={i.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700 }}>{i.title}</div>
              <div style={{ fontSize:13, color:'#555' }}>{i.shared ? 'Shared' : 'Private'} — {new Date(i.remindAt).toLocaleString()}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>doMark(i.id)}>Mark done</button>
              <button onClick={()=>doDelete(i.id)}>Delete</button>
            </div>
          </div>
        ))}

        <h3 style={{ marginTop:20 }}>Done reminders</h3>
        {doneItems.length===0 && <div className="card">Nessun reminder completato</div>}
        {doneItems.map(i => (
          <div key={i.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700 }}>{i.title}</div>
              <div style={{ fontSize:13, color:'#555' }}>{i.shared ? 'Shared' : 'Private'} — {new Date(i.remindAt).toLocaleString()}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>doDelete(i.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
