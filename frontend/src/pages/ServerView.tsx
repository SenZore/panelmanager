import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { servers } from '../api'
import Console from '../components/Console'
import FileManager from '../components/FileManager'
import PluginManager from '../components/PluginManager'
import ResourceManager from '../components/ResourceManager'
import AllocationManager from '../components/AllocationManager'
import { Play, Square, RotateCcw, Zap, Loader2, AlertCircle } from 'lucide-react'

const tabs = ['Console', 'Files', 'Plugins', 'Mods', 'Allocations', 'Resources']

export default function ServerView() {
  const { id } = useParams<{ id: string }>()
  const [server, setServer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('Console')
  const [loading, setLoading] = useState(true)
  const [powerLoading, setPowerLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('offline')

  useEffect(() => {
    loadServer()
  }, [id])

  const loadServer = async () => {
    try {
      const res = await servers.get(id!)
      setServer(res.data.attributes)
      // Determine status from server data
      if (res.data.attributes?.status) {
        setStatus(res.data.attributes.status)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load server')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePower = async (signal: string) => {
    setPowerLoading(signal)
    setError(null)
    try {
      // Use server identifier for client API
      const identifier = server?.identifier || server?.uuid || id
      await servers.power(identifier, signal)

      // Update status based on action
      if (signal === 'start') setStatus('starting')
      else if (signal === 'stop') setStatus('stopping')
      else if (signal === 'restart') setStatus('restarting')
      else if (signal === 'kill') setStatus('offline')

      // Refresh server data after a delay
      setTimeout(loadServer, 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${signal} server`)
    } finally {
      setPowerLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading server...
      </div>
    )
  }

  if (!server) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <div className="text-zinc-500">{error || 'Server not found'}</div>
      </div>
    )
  }

  const alloc = server.relationships?.allocations?.data?.[0]?.attributes
  const egg = server.relationships?.egg?.attributes?.name || 'Unknown'
  const identifier = server?.identifier || server?.uuid || id

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-green-500/15 text-green-500'
      case 'starting': return 'bg-yellow-500/15 text-yellow-500'
      case 'stopping': return 'bg-orange-500/15 text-orange-500'
      case 'offline': return 'bg-zinc-500/15 text-zinc-400'
      default: return 'bg-green-500/15 text-green-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'Online'
      case 'starting': return 'Starting...'
      case 'stopping': return 'Stopping...'
      case 'offline': return 'Offline'
      default: return 'Online'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h2 className="text-2xl font-bold">{server.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
              {egg}
            </span>
            <span className="text-zinc-500 text-sm font-mono">
              {alloc ? `${alloc.ip}:${alloc.port}` : 'No allocation'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${getStatusColor()}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : status === 'offline' ? 'bg-zinc-500' : 'bg-yellow-500 animate-pulse'}`} />
              {getStatusText()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePower('start')}
            disabled={powerLoading !== null}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-green-500/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            {powerLoading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
          </button>
          <button
            onClick={() => handlePower('stop')}
            disabled={powerLoading !== null}
            className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            {powerLoading === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
          </button>
          <button
            onClick={() => handlePower('restart')}
            disabled={powerLoading !== null}
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-amber-500/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            {powerLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Restart
          </button>
          <button
            onClick={() => handlePower('kill')}
            disabled={powerLoading !== null}
            className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:bg-white/10 flex items-center gap-1.5 disabled:opacity-50"
          >
            {powerLoading === 'kill' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Kill
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="glass rounded-2xl p-1.5 w-fit mb-6 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === tab
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-zinc-400 hover:text-white'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Console' && <Console serverId={identifier} />}
      {activeTab === 'Files' && <FileManager serverId={identifier} />}
      {activeTab === 'Plugins' && <PluginManager serverId={identifier} serverVersion="1.21.4" />}
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
      {activeTab === 'Allocations' && <AllocationManager serverId={identifier} />}
      {activeTab === 'Resources' && <ResourceManager server={server} serverId={identifier} />}
    </div>
  )
}
