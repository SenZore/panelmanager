import { useState } from 'react'
import { plugins } from '../api'
import { Download, Trash2, RefreshCw, FileDown } from 'lucide-react'

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
}

export default function PluginManager({ serverId, serverVersion }: PluginManagerProps) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('hangar')
  const [results, setResults] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  const [installed] = useState<Plugin[]>([
    { name: 'Vault', description: 'Economy API', downloads: 0, source: 'spigot', slug: 'vault', installed: true, version: '1.7.3', hasUpdate: true },
    { name: 'WorldEdit', description: 'Map editor', downloads: 0, source: 'hangar', slug: 'worldedit', installed: true, version: '7.3.0' },
  ])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await plugins.search(query, source, serverVersion)
      setResults(res.data.results || [])
    } catch (err) {
      // Mock data
      setResults([
        { name: 'EssentialsX', description: 'The essential plugin suite for Minecraft servers. Provides over 130 commands.', downloads: 2500000, source: 'hangar', slug: 'essentialsx' },
        { name: 'LuckPerms', description: 'Advanced permissions plugin. Web editor, verbose, migration tools.', downloads: 3100000, source: 'hangar', slug: 'luckperms' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const installPlugin = async (plugin: Plugin) => {
    try {
      await plugins.install(serverId, plugin.source, plugin.slug, 'latest')
      alert(`Installing ${plugin.name}...`)
    } catch (err) {
      console.error(err)
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
        <span className="font-semibold">Plugin Installer</span>
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
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder={`🔍 Search plugins compatible with Paper ${serverVersion}...`}
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <button onClick={search} className="btn-primary text-white font-semibold px-6 rounded-xl">
            Search
          </button>
        </div>
      </div>

      <div className="p-5">
        {installed.length > 0 && (
          <>
            <h4 className="text-zinc-400 text-sm font-semibold mb-4">Installed Plugins</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {installed.map((plugin) => (
                <div key={plugin.slug} className="bg-white/2 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <strong>{plugin.name}</strong>
                    {plugin.hasUpdate ? (
                      <span className="bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full text-xs font-semibold">Update Available</span>
                    ) : (
                      <span className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full text-xs font-semibold">Installed</span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm mb-3">{plugin.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs">v{plugin.version}</span>
                    {plugin.hasUpdate ? (
                      <button className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4" /> Update
                      </button>
                    ) : (
                      <button className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <div className="text-center py-8 text-zinc-500">Searching plugins...</div>
        ) : results.length > 0 ? (
          <>
            <h4 className="text-zinc-400 text-sm font-semibold mb-4">Search Results</h4>
            <div className="grid grid-cols-2 gap-4">
              {results.map((plugin) => (
                <div key={plugin.slug} className="bg-white/2 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <strong>{plugin.name}</strong>
                    <span className="bg-green-500/15 text-green-500 px-2 py-0.5 rounded-full text-xs font-semibold">Compatible</span>
                  </div>
                  <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{plugin.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs flex items-center gap-1"><Download className="w-3 h-3" /> {formatDownloads(plugin.downloads)} downloads</span>
                    <button onClick={() => installPlugin(plugin)} className="btn-primary text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> Install
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : query && !loading ? (
          <div className="text-center py-8 text-zinc-500">No plugins found. Try a different search.</div>
        ) : null}
      </div>
    </div>
  )
}
