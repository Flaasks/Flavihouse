import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import { useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Analytics from './pages/Analytics'
import Tasks from './pages/Tasks'
import Reminders from './pages/Reminders'
import Shopping from './pages/Shopping'
import NotificationsPage from './pages/Notifications'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App(){
  const location = useLocation()
  const hideHeader = location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className="app">
      {!hideHeader && <Header />}
      <main>
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />

          <Route path="/" element={<Protected><Home/></Protected>} />
          <Route path="/analytics" element={<Protected><Analytics/></Protected>} />
          <Route path="/tasks" element={<Protected><Tasks/></Protected>} />
          <Route path="/reminders" element={<Protected><Reminders/></Protected>} />
          <Route path="/shopping" element={<Protected><Shopping/></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage/></Protected>} />
          <Route path="/settings" element={<Protected><Settings/></Protected>} />
        </Routes>
      </main>
    </div>
  )
}

function Protected({ children }){
  const auth = useAuth()
  if (auth.loading) return <div className="container"><div className="card">Caricamento...</div></div>
  if (!auth.user) return <Navigate to="/login" replace />
  return children
}
