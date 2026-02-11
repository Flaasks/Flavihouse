import api from '../api'

export const fetchReminders = () => api.get('/reminders').then(r=>r.data)
export const createReminder = (p) => api.post('/reminders', p).then(r=>r.data)
export const markReminderDone = (id) => api.post(`/reminders/${id}/done`).then(r=>r.data)
export const deleteReminder = (id) => api.delete(`/reminders/${id}`).then(r=>r.data)
