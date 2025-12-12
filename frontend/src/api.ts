import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const auth = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string) => 
    api.post('/auth/register', { username, password }),
}

export const settings = {
  get: () => api.get('/settings'),
  save: (data: { ptero_url?: string; ptero_key?: string }) => 
    api.post('/settings', data),
}

export const servers = {
  list: () => api.get('/servers'),
  get: (id: string) => api.get(`/servers/${id}`),
  create: (data: any) => api.post('/servers', data),
  delete: (id: string) => api.delete(`/servers/${id}`),
  power: (id: string, signal: string) => 
    api.post(`/servers/${id}/power`, { signal }),
  console: (id: string) => api.get(`/servers/${id}/console`),
}

export const files = {
  list: (serverId: string, directory: string = '/') => 
    api.get(`/servers/${serverId}/files`, { params: { directory } }),
  delete: (serverId: string, root: string, files: string[]) => 
    api.delete(`/servers/${serverId}/files`, { data: { root, files } }),
  download: (serverId: string, file: string) => 
    api.get(`/servers/${serverId}/files/download`, { params: { file } }),
}

export const plugins = {
  search: (q: string, source: string, version: string) => 
    api.get('/plugins/search', { params: { q, source, version } }),
  install: (serverId: string, source: string, slug: string, version: string) => 
    api.post(`/servers/${serverId}/plugins/install`, { source, slug, version }),
  list: (serverId: string) => api.get(`/servers/${serverId}/plugins`),
  remove: (serverId: string, plugin: string) => 
    api.delete(`/servers/${serverId}/plugins/${plugin}`),
}

export const eggs = {
  list: () => api.get('/eggs'),
  sync: () => api.post('/eggs/sync'),
  import: (data: any) => api.post('/eggs/import', data),
}

export const allocations = {
  list: (serverId: string) => api.get(`/servers/${serverId}/allocations`),
  add: (serverId: string) => api.post(`/servers/${serverId}/allocations`),
  remove: (serverId: string, allocId: string) => 
    api.delete(`/servers/${serverId}/allocations/${allocId}`),
}

export const updates = {
  check: () => api.get('/updates/check'),
  install: () => api.post('/updates/install'),
}

export default api
