import { useState, useEffect } from 'react'
import { settings } from '../api'
import { Eye, EyeOff, Save, Link2 } from 'lucide-react'

export default function Settings() {
  const [pteroUrl, setPteroUrl] = useState('')
  const [pteroKey, setPteroKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connected, setConnected] = useState(false)
  const [autoIntegrate, setAutoIntegrate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await settings.get()
      setPteroUrl(res.data.ptero_url || '')
      setConnected(res.data.has_api_key)
    } catch (err) {
      console.error(err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await settings.save({ ptero_url: pteroUrl, ptero_key: pteroKey })
      setConnected(true)
      setPteroKey('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">API Settings</h2>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold flex items-center gap-2"><Link2 className="w-5 h-5" /> Pterodactyl Connection</div>
        
        <div className="p-7">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 font-medium mb-2">Panel URL</label>
              <input
                type="text"
                value={pteroUrl}
                onChange={(e) => setPteroUrl(e.target.value)}
                placeholder="https://panel.example.com"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 font-medium mb-2">Application API Key</label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={pteroKey}
                  onChange={(e) => setPteroKey(e.target.value)}
                  placeholder={connected ? '••••••••••••••••••••' : 'ptlc_xxxxxxxxxxxx'}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="bg-white/5 border border-white/10 px-4 rounded-xl hover:bg-white/10 transition-all"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {connected && (
            <div className="flex items-center gap-4 p-5 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
              <div>
                <strong className="text-green-400">Connected</strong>
                <br />
                <span className="text-zinc-500 text-sm">Last sync: 2 minutes ago</span>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-6">
            <label className="flex items-center gap-4 cursor-pointer p-4 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition-all">
              <input
                type="checkbox"
                checked={autoIntegrate}
                onChange={(e) => setAutoIntegrate(e.target.checked)}
                className="w-5 h-5 accent-indigo-500"
              />
              <div>
                <strong>Auto-integrate with local installation</strong>
                <br />
                <span className="text-zinc-500 text-sm">Automatically detect Pterodactyl on this server</span>
              </div>
            </label>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary text-white font-semibold px-6 py-3 rounded-xl mt-6 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
