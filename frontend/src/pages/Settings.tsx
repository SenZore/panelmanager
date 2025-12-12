import { useState, useEffect } from 'react'
import { settings } from '../api'
import { Eye, EyeOff, Save, Link2, TestTube, Bug, Check, X, Loader2, Key, Shield, Zap } from 'lucide-react'

export default function Settings() {
  const [pteroUrl, setPteroUrl] = useState('')
  const [appKey, setAppKey] = useState('')
  const [clientKey, setClientKey] = useState('')
  const [showAppKey, setShowAppKey] = useState(false)
  const [showClientKey, setShowClientKey] = useState(false)
  const [hasAppKey, setHasAppKey] = useState(false)
  const [hasClientKey, setHasClientKey] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [integrating, setIntegrating] = useState(false)
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
      setHasAppKey(res.data.has_app_key || false)
      setHasClientKey(res.data.has_client_key || false)
      setDebugMode(res.data.debug_mode || false)
      addDebug('Settings loaded')

      // Show auto-integrated status
      if (res.data.has_app_key && res.data.has_client_key) {
        addDebug('API keys already configured')
      }
    } catch (err: any) {
      addDebug(`Error: ${err.message}`)
    }
  }

  const autoIntegrate = async () => {
    setIntegrating(true)
    setMessage(null)
    addDebug('Starting auto-integration...')
    addDebug('Reading /var/www/pterodactyl/.env')
    addDebug('Connecting to Pterodactyl database...')
    try {
      const res = await settings.autoIntegrate()
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message })
        addDebug('SUCCESS: API keys created automatically!')
        addDebug(`URL: ${res.data.url}`)
        setPteroUrl(res.data.url)
        setHasAppKey(res.data.has_app_key)
        setHasClientKey(res.data.has_client_key)
      } else {
        setMessage({ type: 'error', text: res.data.error })
        addDebug(`Failed: ${res.data.error}`)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Error: ${errMsg}`)
    } finally {
      setIntegrating(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    addDebug('Saving settings...')
    try {
      await settings.save({
        ptero_url: pteroUrl,
        ptero_key: appKey || undefined,
        ptero_client_key: clientKey || undefined,
        debug_mode: debugMode
      })
      if (appKey) setHasAppKey(true)
      if (clientKey) setHasClientKey(true)
      setAppKey('')
      setClientKey('')
      setMessage({ type: 'success', text: 'Settings saved!' })
      addDebug('Settings saved')
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Error: ${errMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setMessage(null)
    addDebug('Testing connection...')
    try {
      const res = await settings.test(pteroUrl, appKey || undefined)
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Connection successful!' })
        addDebug('Connection test: SUCCESS')
      } else {
        setMessage({ type: 'error', text: res.data.error })
        addDebug(`Failed: ${res.data.error}`)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message
      setMessage({ type: 'error', text: errMsg })
      addDebug(`Error: ${errMsg}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {/* Auto-Integration Card */}
      <div className="glass rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Zap className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Auto-Integrate with Pterodactyl</h3>
              <p className="text-zinc-400 text-sm mb-4">
                If Pterodactyl is installed on this server (/var/www/pterodactyl), click below to automatically connect.
                API keys will be created for you - no manual setup needed!
              </p>
              <button
                onClick={autoIntegrate}
                disabled={integrating}
                className="btn-primary text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                {integrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {integrating ? 'Connecting...' : 'Auto-Integrate Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Manual Configuration */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5" /> Manual Configuration
        </div>

        <div className="p-7">
          {/* Panel URL */}
          <div className="mb-6">
            <label className="block text-sm text-zinc-400 font-medium mb-2">Panel URL</label>
            <input
              type="text"
              value={pteroUrl}
              onChange={(e) => setPteroUrl(e.target.value)}
              placeholder="https://panel.example.com"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Application API Key */}
          <div className="mb-6 p-5 bg-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <label className="text-sm text-purple-300 font-semibold">Application API Key</label>
              {hasAppKey && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">✓</span>}
            </div>
            <div className="flex gap-2">
              <input
                type={showAppKey ? 'text' : 'password'}
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                placeholder={hasAppKey ? '••••••••' : 'ptla_...'}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <button onClick={() => setShowAppKey(!showAppKey)} className="bg-white/5 border border-white/10 px-4 rounded-xl hover:bg-white/10">
                {showAppKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Admin → Application API → Create Key</p>
          </div>

          {/* Client API Key */}
          <div className="mb-6 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-blue-400" />
              <label className="text-sm text-blue-300 font-semibold">Client API Key</label>
              {hasClientKey && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">✓</span>}
            </div>
            <div className="flex gap-2">
              <input
                type={showClientKey ? 'text' : 'password'}
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                placeholder={hasClientKey ? '••••••••' : 'ptlc_...'}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <button onClick={() => setShowClientKey(!showClientKey)} className="bg-white/5 border border-white/10 px-4 rounded-xl hover:bg-white/10">
                {showClientKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Account Settings → API Credentials → Create Key</p>
          </div>

          {/* Status */}
          {(hasAppKey && hasClientKey) && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
              <span className="text-green-400 font-medium">Connected to Pterodactyl</span>
            </div>
          )}

          {/* Debug Mode */}
          <label className="flex items-center gap-4 cursor-pointer p-4 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 mb-6">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="w-5 h-5 accent-indigo-500"
            />
            <div>
              <strong className="flex items-center gap-2"><Bug className="w-4 h-4" /> Debug Mode</strong>
              <span className="text-zinc-500 text-sm">Show API logs</span>
            </div>
          </label>

          <div className="flex gap-3">
            <button onClick={testConnection} disabled={testing || !pteroUrl} className="bg-white/5 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 disabled:opacity-50 flex items-center gap-2">
              {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TestTube className="w-5 h-5" />}
              Test
            </button>
            <button onClick={saveSettings} disabled={saving} className="btn-primary text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Debug Console */}
      {debugMode && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Bug className="w-5 h-5" /> Debug</span>
            <button onClick={() => setDebugOutput([])} className="text-xs text-zinc-500 hover:text-white">Clear</button>
          </div>
          <div className="p-4 bg-black/50 font-mono text-xs max-h-48 overflow-y-auto">
            {debugOutput.length === 0 ? (
              <div className="text-zinc-600">No output</div>
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
