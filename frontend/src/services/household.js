import api from '../api'

export const fetchHousehold = (id) => api.get(`/households/${id}`).then(r=>r.data)
export const fetchBudget = (id) => api.get(`/admin/${id}/budget`).then(r=>r.data)
export const setBudget = (id, value) => api.put(`/admin/${id}/budget`, { monthlyBudget: value }).then(r=>r.data)
