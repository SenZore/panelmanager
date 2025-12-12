import { useState, useEffect } from 'react'
import { plugins } from '../api'
import { Download, Trash2, RefreshCw, FileDown, Search, Loader2, AlertCircle } from 'lucide-react'

interface PluginManagerProps {
  serverId: string
  serverVersion: string
}

interface Plugin {
  name: string
  description: string
  downloads: number
  source: string
  slug: string
  icon_url?: string
  installed?: boolean
  version?: string
  hasUpdate?: boolean
  installed_at?: string
}

export default function PluginManager({ serverId, serverVersion }: PluginManagerProps) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('hangar')
  const [results, setResults] = useState<Plugin[]>([])
  const [installed, setInstalled] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingInstalled, setLoadingInstalled] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInstalledPlugins()
  }, [serverId])

  const loadInstalledPlugins = async () => {
    setLoadingInstalled(true)
    try {
      const res = await plugins.list(serverId)
      setInstalled(res.data.plugins || [])
    } catch (err) {
      console.error('Failed to load installed plugins:', err)
    } finally {
      setLoadingInstalled(false)
    }
  }

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await plugins.search(query, source, serverVersion)
      setResults(res.data.results || [])
      if ((res.data.results || []).length === 0) {
        setError('No plugins found. Try a different search term.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const installPlugin = async (plugin: Plugin) => {
    setInstalling(plugin.slug)
    setError(null)
    try {
      await plugins.install(serverId, plugin.source, plugin.slug, 'latest')
      // Add to installed list
      setInstalled(prev => [...prev, {
        ...plugin,
        installed: true,
        version: 'latest',
        installed_at: new Date().toISOString()
      }])
      // Remove from search results
      setResults(prev => prev.filter(p => p.slug !== plugin.slug))
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to install ${plugin.name}`)
    } finally {
      setInstalling(null)
    }
  }

  const removePlugin = async (plugin: Plugin) => {
    if (!confirm(`Remove ${plugin.name}?`)) return

    setRemoving(plugin.name)
    try {
      await plugins.remove(serverId, plugin.name)
      setInstalled(prev => prev.filter(p => p.name !== plugin.name))
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to remove ${plugin.name}`)
    } finally {
      setRemoving(null)
    }
  }

  const formatDownloads = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold">Plugin Manager</span>
        <div className="flex gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="hangar">🔵 Hangar (PaperMC)</option>
            <option value="modrinth">🟢 Modrinth</option>
            <option value="spigot">🟠 SpigotMC</option>
          </select>
          <button className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-1.5">
            <FileDown className="w-4 h-4" /> Import JAR
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-white/5">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder={`Search plugins for Paper ${serverVersion}...`}
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="btn-primary text-white font-semibold px-6 rounded-xl disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="p-5">
        {/* Installed Plugins */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-zinc-400 text-sm font-semibold">
              Installed Plugins ({installed.length})
            </h4>
            <button
              onClick={loadInstalledPlugins}
              className="text-zinc-500 hover:text-white text-sm flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loadingInstalled ? (
            <div className="text-center py-4 text-zinc-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : installed.length === 0 ? (
            <div className="text-center py-4 text-zinc-600">
              No plugins installed yet. Search and install some!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {installed.map((plugin) => (
                <div key={plugin.name} className="bg-white/2 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <strong>{plugin.name}</strong>
                    <span className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Installed
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm mb-3">{plugin.description || 'Plugin installed via PanelManager'}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs">
                      {plugin.source} • {plugin.version || 'latest'}
                    </span>
                    <button
                      onClick={() => removePlugin(plugin)}
                      disabled={removing === plugin.name}
                      className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {removing === plugin.name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <>
            <h4 className="text-zinc-400 text-sm font-semibold mb-4">Search Results ({results.length})</h4>
            <div className="grid grid-cols-2 gap-4">
              {results.map((plugin) => (
                <div key={plugin.slug} className="bg-white/2 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {plugin.icon_url && (
                        <img src={plugin.icon_url} alt="" className="w-8 h-8 rounded" />
                      )}
                      <strong>{plugin.name}</strong>
                    </div>
                    <span className="bg-green-500/15 text-green-500 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Compatible
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{plugin.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs flex items-center gap-1">
                      <Download className="w-3 h-3" /> {formatDownloads(plugin.downloads)} downloads
                    </span>
                    <button
                      onClick={() => installPlugin(plugin)}
                      disabled={installing === plugin.slug}
                      className="btn-primary text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {installing === plugin.slug ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Install
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
