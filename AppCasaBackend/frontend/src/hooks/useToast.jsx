import React, { createContext, useState, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const push = (t) => {
    const id = Date.now()
    setToasts(prev=>[...prev, { id, ...t }])
    setTimeout(()=> setToasts(prev => prev.filter(x=>x.id!==id)), 4000)
  }
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position:'fixed', right:12, bottom:12, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background:'#111', color:'#fff', padding:8, borderRadius:6 }}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
