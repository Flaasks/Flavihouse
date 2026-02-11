import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
  return config
})

// No dev mocks are used. The frontend talks to the real backend at /api.

export default api
