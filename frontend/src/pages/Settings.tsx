import { useState, useEffect } from 'react'
import { settings } from '../api'
import { Eye, EyeOff, Save, Link2, Search, TestTube, Bug, Check, X, Loader2 } from 'lucide-react'

export default function Settings() {
  const [pteroUrl, setPteroUrl] = useState('')
  const [pteroKey, setPteroKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connected, setConnected] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [debugOutput, setDebugOutput] = useState<string[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const addDebug = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setDebugOutput(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)])
  }

  const loadSettings = async () => {
    try {
      addDebug('Loading settings...')
      const res = await settings.get()
      setPteroUrl(res.data.ptero_url || '')
      setConnected(res.data.has_api_key)
      setDebugMode(res.data.debug_mode || false)
      addDebug('Settings loaded successfully')
    } catch (err: any) {
      addDebug(`Error loading settings: ${err.message}`)
      console.error(err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    addDebug('Saving settings...')
    try {
      await settings.save({
        ptero_url: pteroUrl,
        ptero_key: pteroKey || undefined,
        debug_mode: debugMode
      })
      setConnected(true)
      setPteroKey('')
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      addDebug('Settings saved successfully')
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Error saving settings: ${errMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const detectPterodactyl = async () => {
    setDetecting(true)
    setMessage(null)
    addDebug('Detecting Pterodactyl installation...')
    addDebug('Checking /var/www/pterodactyl/.env')
    try {
      const res = await settings.detect()
      if (res.data.detected) {
        setPteroUrl(res.data.url)
        setMessage({ type: 'success', text: `Found Pterodactyl at ${res.data.url}` })
        addDebug(`Detected: ${res.data.url}`)
        addDebug(`Env path: ${res.data.env_path}`)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Detection failed: ${errMsg}`)
    } finally {
      setDetecting(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setMessage(null)
    addDebug('Testing Pterodactyl connection...')
    addDebug(`URL: ${pteroUrl}`)
    addDebug('Sending API request...')
    try {
      const res = await settings.test(pteroUrl, pteroKey || undefined)
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Connection successful! API is working.' })
        addDebug('Connection test: SUCCESS')
        setConnected(true)
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Connection failed' })
        addDebug(`Connection test failed: ${res.data.error}`)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Connection error: ${errMsg}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">API Settings</h2>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold flex items-center gap-2"><Link2 className="w-5 h-5" /> Pterodactyl Connection</div>

        <div className="p-7">
          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 font-medium mb-2">Panel URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pteroUrl}
                  onChange={(e) => setPteroUrl(e.target.value)}
                  placeholder="https://panel.example.com"
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  onClick={detectPterodactyl}
                  disabled={detecting}
                  className="bg-white/5 border border-white/10 px-4 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Auto-detect from /var/www/pterodactyl"
                >
                  {detecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">Click the search icon to auto-detect from this server</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 font-medium mb-2">Application API Key</label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={pteroKey}
                  onChange={(e) => setPteroKey(e.target.value)}
                  placeholder={connected ? '••••••••••••••••••••' : 'ptla_xxxxxxxxxxxx'}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="bg-white/5 border border-white/10 px-4 rounded-xl hover:bg-white/10 transition-all"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">Get from Admin → API → Application API → Create Key</p>
            </div>
          </div>

          {connected && (
            <div className="flex items-center gap-4 p-5 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
              <div>
                <strong className="text-green-400">Connected</strong>
                <br />
                <span className="text-zinc-500 text-sm">API key is configured</span>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-6">
            <label className="flex items-center gap-4 cursor-pointer p-4 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition-all">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="w-5 h-5 accent-indigo-500"
              />
              <div>
                <strong className="flex items-center gap-2"><Bug className="w-4 h-4" /> Debug Mode</strong>
                <br />
                <span className="text-zinc-500 text-sm">Show detailed logs for all API operations</span>
              </div>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={testConnection}
              disabled={testing || !pteroUrl}
              className="bg-white/5 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:bg-white/10 disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TestTube className="w-5 h-5" />}
              Test Connection
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary text-white font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Debug Console */}
      {debugMode && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Bug className="w-5 h-5" /> Debug Console</span>
            <button
              onClick={() => setDebugOutput([])}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="p-4 bg-black/50 font-mono text-xs max-h-64 overflow-y-auto">
            {debugOutput.length === 0 ? (
              <div className="text-zinc-600">No debug output yet. Try detecting or testing connection.</div>
            ) : (
              debugOutput.map((line, i) => (
                <div key={i} className="text-green-400/80 py-0.5">{line}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
