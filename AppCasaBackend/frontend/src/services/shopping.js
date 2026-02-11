import api from '../api'

export const fetchShopping = (householdId, includeTotal=false) => api.get('/shopping', { params: { householdId, includeTotal } }).then(r=>r.data)
export const createShoppingItem = (payload) => api.post('/shopping', payload).then(r=>r.data)
export const toggleShoppingItem = (id) => api.post(`/shopping/${id}/toggle`).then(r=>r.data)
export const deleteShoppingItem = (id) => api.delete(`/shopping/${id}`).then(r=>r.data)
