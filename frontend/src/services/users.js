import api from '../api'

export const fetchHouseholdUsers = (householdId) => api.get(`/admin/${householdId}/users`).then(r=>r.data)
