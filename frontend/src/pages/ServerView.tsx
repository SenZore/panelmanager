import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { servers } from '../api'
import Console from '../components/Console'
import FileManager from '../components/FileManager'
import PluginManager from '../components/PluginManager'
import ResourceManager from '../components/ResourceManager'
import AllocationManager from '../components/AllocationManager'
import { Play, Square, RotateCcw, Zap } from 'lucide-react'

const tabs = ['Console', 'Files', 'Plugins', 'Mods', 'Allocations', 'Resources']

export default function ServerView() {
  const { id } = useParams<{ id: string }>()
  const [server, setServer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('Console')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServer()
  }, [id])

  const loadServer = async () => {
    try {
      const res = await servers.get(id!)
      setServer(res.data.attributes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePower = async (signal: string) => {
    try {
      await servers.power(id!, signal)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-zinc-500">Loading server...</div>
  }

  if (!server) {
    return <div className="text-center py-12 text-zinc-500">Server not found</div>
  }

  const alloc = server.relationships?.allocations?.data?.[0]?.attributes
  const egg = server.relationships?.egg?.attributes?.name || 'Unknown'

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h2 className="text-2xl font-bold">{server.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
              {egg}
            </span>
            <span className="text-zinc-500 text-sm">
              {alloc ? `${alloc.ip}:${alloc.port}` : 'No allocation'}
            </span>
            <span className="bg-green-500/15 text-green-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow" />
              Online
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handlePower('start')} className="bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-green-500/30 flex items-center gap-1.5">
            <Play className="w-4 h-4" /> Start
          </button>
          <button onClick={() => handlePower('stop')} className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-1.5">
            <Square className="w-4 h-4" /> Stop
          </button>
          <button onClick={() => handlePower('restart')} className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-amber-500/30 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button onClick={() => handlePower('kill')} className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:bg-white/10 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Kill
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-1.5 w-fit mb-6 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Console' && <Console serverId={id!} />}
      {activeTab === 'Files' && <FileManager serverId={id!} />}
      {activeTab === 'Plugins' && <PluginManager serverId={id!} serverVersion="1.21.4" />}
      {activeTab === 'Mods' && (
        <div className="glass rounded-2xl p-6">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <strong className="text-orange-400">Plugin Server Detected</strong>
              <p className="text-zinc-400 text-sm">This server uses Paper (plugins). Switch to a Forge or Fabric egg to install mods.</p>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Allocations' && <AllocationManager serverId={id!} />}
      {activeTab === 'Resources' && <ResourceManager server={server} />}
    </div>
  )
}
