import api from '../api'

export const fetchTasks = (householdId) => api.get('/tasks', { params: { householdId } }).then(r=>r.data)
export const createTask = (payload) => api.post('/tasks', payload).then(r=>r.data)
export const assignTask = (id, assignedTo) => api.post(`/tasks/${id}/assign`, { assignedTo }).then(r=>r.data)
export const completeTask = (id) => api.post(`/tasks/${id}/complete`).then(r=>r.data)
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then(r=>r.data)
