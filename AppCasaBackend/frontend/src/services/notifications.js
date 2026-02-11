import api from '../api'

export const fetchNotifications = (householdId, opts = {}) => {
	if (!householdId) return api.get('/notifications', { params: opts }).then(r => r.data)
	return api.get(`/households/${householdId}/notifications`, { params: opts }).then(r => r.data.notifications || r.data)
}

export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`).then(r=>r.data)

// mark all notifications for current user as read
export const markAllRead = () => api.post('/notifications/read-all').then(r=>r.data)

export const fetchUnreadCount = (householdId) => {
	// backend doesn't expose a direct count endpoint; fetch list and count
	if (!householdId) return api.get('/notifications').then(r=>Array.isArray(r.data)? r.data.length : 0)
	return api.get(`/households/${householdId}/notifications`).then(r=> (r.data.notifications || r.data).length )
}
