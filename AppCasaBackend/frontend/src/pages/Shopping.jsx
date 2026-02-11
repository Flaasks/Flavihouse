import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchShopping, createShoppingItem, toggleShoppingItem } from '../services/shopping'
import { useToast } from '../hooks/useToast'

export default function Shopping(){
  const auth = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [total, setTotal] = useState(null)

  useEffect(()=>{
    if (!auth?.user) return
    load()
  }, [auth?.user])

  const load = async () => {
    try{
      const res = await fetchShopping(auth.user.householdId, true)
      // server may return { items, total }
      if (Array.isArray(res)) { setItems(res); setTotal(null) }
      else { setItems(res.items || []); setTotal(res.total) }
    }catch(err){ }
  }

  const doCreate = async (e) =>{
    e.preventDefault()
    try{
      const payload = { householdId: auth.user.householdId, name, amount: amount? parseFloat(amount) : undefined }
      const it = await createShoppingItem(payload)
      setItems([it, ...items])
      setName(''); setAmount('')
      toast.push({ message: 'Item aggiunto' })
      await load()
    }catch(err){
      console.error(err)
      toast.push({ message: 'Errore creazione', level:'error' })
    }
  }

  const doToggle = async (id) => {
    try{
      const res = await toggleShoppingItem(id)
      // toggleShoppingItem returns created expense; remove item from UI
      setItems(items.filter(i=>i.id!==id))
      toast.push({ message: 'Item marcato e spesa creata' })
      await load()
    }catch(err){ toast.push({ message: 'Errore toggle', level:'error' }) }
  }

  return (
    <div className="container">
      <div className="card"><h2>Shopping</h2>
        <form onSubmit={doCreate} style={{ display:'flex', gap:8 }}>
          <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Importo (opzionale)" value={amount} onChange={e=>setAmount(e.target.value)} />
          <button type="submit">Aggiungi</button>
        </form>
        <div style={{ marginTop:12 }}>
          {total!==null && <div style={{ marginBottom:8 }}>Totale stimato non checkato: {total}</div>}
          {items.map(it => (
            <div key={it.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{it.name}</div>
                <div style={{ fontSize:13, color:'#555' }}>{it.amount ? `${it.amount}` : ''}</div>
              </div>
              <div>
                <button onClick={()=>doToggle(it.id)}>Segna come comprato</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
