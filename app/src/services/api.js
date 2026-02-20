const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiService {
  async request(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: {},
    }
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    const res = await fetch(`${BASE}${path}`, opts)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('audio')) return res.arrayBuffer()
    return res.json()
  }

  get(path) { return this.request('GET', path) }
  post(path, body) { return this.request('POST', path, body) }
  put(path, body) { return this.request('PUT', path, body) }
  delete(path) { return this.request('DELETE', path) }

  async postAudio(path, audioBlob, params = {}) {
    const url = new URL(`${BASE}${path}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': audioBlob.type },
      body: audioBlob,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    return res.json()
  }
}

export const api = new ApiService()