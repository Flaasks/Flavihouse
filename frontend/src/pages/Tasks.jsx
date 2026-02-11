import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchTasks, createTask, assignTask, completeTask, deleteTask } from '../services/tasks'
import { useToast } from '../hooks/useToast'
import { fetchHouseholdUsers } from '../services/users'

export default function Tasks(){
  const auth = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const toast = useToast()
  useEffect(()=>{
    if (!auth?.user) return
    const hid = auth.user.householdId
    fetchTasks(hid).then(d=>setTasks(d)).catch(()=>{})
    fetchHouseholdUsers(hid).then(d=>setUsers(d)).catch(()=>{})
  }, [auth?.user])

  const doCreate = async (e) =>{
    e.preventDefault()
    try{
      const payload = { householdId: auth.user.householdId, title, assignedTo: assignedTo || null }
      const t = await createTask(payload)
      setTasks([t, ...tasks])
      setTitle('')
      setAssignedTo('')
      toast.push({ message: 'Task creata' })
    }catch(err){
      console.error(err)
      toast.push({ message: 'Errore creazione task', level: 'error' })
    }
  }

  const doAssign = async (id, userId) => {
    try{
      await assignTask(id, userId)
      setTasks(tasks.map(t=> t.id===id ? {...t, assignedTo: userId} : t))
      toast.push({ message: 'Assegnazione aggiornata' })
    }catch(err){
      console.error(err)
      toast.push({ message: 'Errore assegnazione', level: 'error' })
    }
  }

  const doComplete = async (id) => {
    try{
      const res = await completeTask(id)
      setTasks(tasks.map(t=> t.id===id ? res : t))
      toast.push({ message: 'Task completata' })
    }catch(err){
      console.error(err)
      toast.push({ message: 'Errore completamento', level: 'error' })
    }
  }

  const doDelete = async (id) => {
    try{
      await deleteTask(id)
      setTasks(tasks.filter(t=>t.id!==id))
      toast.push({ message: 'Task eliminata' })
    }catch(err){ toast.push({ message: 'Errore eliminazione', level: 'error' }) }
  }

  return (
    <div className="container">
      <div className="card"><h2>Tasks</h2>
        <form onSubmit={doCreate} style={{ display:'flex', gap:8, marginTop:8 }}>
          <input placeholder="Titolo" value={title} onChange={e=>setTitle(e.target.value)} />
          <select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
            <option value="">Assegna a (opzionale)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
          <button type="submit">Crea</button>
        </form>
      </div>

      <div style={{ marginTop:12 }}>
        {tasks.map(t => (
          <div key={t.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700 }}>{t.title} {t.status==='done' && <span style={{color:'green'}}>✓</span>}</div>
              <div style={{ fontSize:13, color:'#555' }}>Assegnato a: {t.assignedTo || '—'}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <select onChange={e=>doAssign(t.id, e.target.value)} defaultValue="">
                <option value="">Assign</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button onClick={()=>doComplete(t.id)}>Complete</button>
              <button onClick={()=>doDelete(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
