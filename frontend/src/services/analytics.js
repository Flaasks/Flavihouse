import api from '../api'

export const fetchAnalyticsSnapshot = (params) => api.get('/analytics', { params }).then(r=>r.data)
