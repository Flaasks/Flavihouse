import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchAnalyticsSnapshot } from '../services/analytics'
import { fetchTasks } from '../services/tasks'
import { fetchReminders } from '../services/reminders'
import { fetchBudget } from '../services/household'

export default function Home(){
  const auth = useAuth()
  const [budget, setBudget] = useState(null)
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    if (!auth?.user) return
    const hid = auth.user.householdId
    fetchBudget(hid).then(d => setBudget(d)).catch(()=>{})
    fetchTasks(hid).then(d=>setTasks(d)).catch(()=>{})
    fetchReminders().then(d=>setReminders(d)).catch(()=>{})
    fetchAnalyticsSnapshot({ range: 'current_month' }).then(d=>setAnalytics(d)).catch(()=>{})
  }, [auth?.user])

  return (
    <div className="container">
      <div className="card">
        <h2>Dashboard</h2>
        <p>Panoramica: budget mensile rimanente, task prioritari e reminder imminenti</p>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Budget mensile</h3>
          <div>{budget ? (`Budget: ${budget.monthlyBudget || '—'}`) : 'Caricamento...'}</div>
        </div>
        <div className="card">
          <h3>Task prioritari</h3>
          <div>{tasks.length ? tasks.slice(0,5).map(t=> <div key={t.id}>{t.title}</div>) : 'Nessuna task'}</div>
        </div>
        <div className="card">
          <h3>Reminder imminenti</h3>
          <div>{reminders.length ? reminders.slice(0,5).map(r=> <div key={r.id}>{r.title} — {new Date(r.remindAt).toLocaleString()}</div>) : 'Nessun reminder'}</div>
        </div>
        <div className="card">
          <h3>Analytics veloce</h3>
          <div>{analytics ? (`Totale mese: ${analytics.total || 0}`) : 'Caricamento...'}</div>
        </div>
      </div>
    </div>
  )
}
