import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { servers, updates, eggs, nodes } from '../api'
import { Server, Wifi, MemoryStick, Network, Plus, Rocket, X, Loader2 } from 'lucide-react'

interface ServerData {
  attributes: {
    id: number
    name: string
    description: string
    limits: { memory: number; disk: number; cpu: number }
    relationships?: {
      allocations?: { data: Array<{ attributes: { ip: string; port: number } }> }
      egg?: { attributes: { name: string } }
    }
  }
}

interface NodeData {
  attributes: {
    id: number
    name: string
    location_id: number
  }
}

interface EggData {
  attributes: {
    id: number
    name: string
    relationships?: {
      eggs?: { data: Array<{ attributes: { id: number; name: string } }> }
    }
  }
}

export default function Dashboard() {
  const [serverList, setServerList] = useState<ServerData[]>([])
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [nodeList, setNodeList] = useState<NodeData[]>([])
  const [nestList, setNestList] = useState<EggData[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create server form
  const [newServer, setNewServer] = useState({
    name: '',
    node_id: 0,
    egg_id: 0,
    memory: 1024,
    disk: 5120,
    cpu: 100,
    databases: 1,
    allocations: 1
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [serversRes, updatesRes] = await Promise.all([
        servers.list(),
        updates.check()
      ])
      setServerList(serversRes.data.data || [])
      setUpdateInfo(updatesRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = async () => {
    setShowCreateModal(true)
    setError(null)
    try {
      const [nodesRes, eggsRes] = await Promise.all([
        nodes.list(),
        eggs.list()
      ])
      setNodeList(nodesRes.data.data || [])
      setNestList(eggsRes.data.data || [])

      // Set defaults
      if (nodesRes.data.data?.length > 0) {
        setNewServer(prev => ({ ...prev, node_id: nodesRes.data.data[0].attributes.id }))
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load nodes/eggs. Check your API connection in Settings.')
    }
  }

  const createServer = async () => {
    if (!newServer.name || !newServer.node_id || !newServer.egg_id) {
      setError('Please fill in all required fields')
      return
    }

    setCreating(true)
    setError(null)
    try {
      await servers.create(newServer)
      setShowCreateModal(false)
      setNewServer({
        name: '',
        node_id: 0,
        egg_id: 0,
        memory: 1024,
        disk: 5120,
        cpu: 100,
        databases: 1,
        allocations: 1
      })
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create server')
    } finally {
      setCreating(false)
    }
  }

  const stats = [
    { label: 'Total Servers', value: serverList.length, color: 'text-blue-500', icon: Server },
    { label: 'Online', value: serverList.length, color: 'text-green-500', icon: Wifi },
    { label: 'Total RAM', value: `${(serverList.reduce((acc, s) => acc + s.attributes.limits.memory, 0) / 1024).toFixed(1)}GB`, color: 'text-purple-500', icon: MemoryStick },
    { label: 'Allocations', value: serverList.reduce((acc, s) => acc + (s.attributes.relationships?.allocations?.data?.length || 0), 0), color: 'text-orange-500', icon: Network },
  ]

  // Get all eggs from nests
  const allEggs: { id: number; name: string; nestName: string }[] = []
  nestList.forEach(nest => {
    nest.attributes.relationships?.eggs?.data?.forEach(egg => {
      allEggs.push({
        id: egg.attributes.id,
        name: egg.attributes.name,
        nestName: nest.attributes.name
      })
    })
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button
          onClick={openCreateModal}
          className="btn-primary text-white font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create Server
        </button>
      </div>

      {updateInfo?.update_available && (
        <div className="glass rounded-2xl p-5 mb-6 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-indigo-500/20">
          <span className="text-indigo-300 font-medium flex items-center gap-2">
            <Rocket className="w-5 h-5" /> New version available: {updateInfo.latest} from github.com/senzore/panelmanager
          </span>
          <Link to="/updates" className="btn-primary text-white font-semibold px-4 py-2 rounded-lg text-sm">
            Update Now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <stat.icon className="w-8 h-8 mb-3 opacity-70" />
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">{stat.label}</div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold text-lg">Your Servers</div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading servers...</div>
        ) : serverList.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No servers yet. Create your first server!</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="text-left p-4 font-semibold">Server Name</th>
                <th className="text-left p-4 font-semibold">Type</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Resources</th>
                <th className="text-left p-4 font-semibold">Connection</th>
              </tr>
            </thead>
            <tbody>
              {serverList.map((server) => {
                const alloc = server.attributes.relationships?.allocations?.data?.[0]?.attributes
                const egg = server.attributes.relationships?.egg?.attributes?.name || 'Unknown'
                return (
                  <tr key={server.attributes.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <Link to={`/server/${server.attributes.id}`} className="hover:text-indigo-400 transition-colors">
                        <strong>{server.attributes.name}</strong>
                        <br />
                        <span className="text-xs text-zinc-500">{server.attributes.description || 'No description'}</span>
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                        {egg}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-green-500/15 text-green-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow" />
                        Online
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: '60%' }} />
                        </div>
                        <span className="text-xs text-zinc-500">{server.attributes.limits.memory}MB</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-zinc-500 text-sm">
                      {alloc ? `${alloc.ip}:${alloc.port}` : 'N/A'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Create Server</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Server Name *</label>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Minecraft Server"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Node *</label>
                  <select
                    value={newServer.node_id}
                    onChange={(e) => setNewServer(prev => ({ ...prev, node_id: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Select node...</option>
                    {nodeList.map(node => (
                      <option key={node.attributes.id} value={node.attributes.id}>
                        {node.attributes.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Egg *</label>
                  <select
                    value={newServer.egg_id}
                    onChange={(e) => setNewServer(prev => ({ ...prev, egg_id: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Select egg...</option>
                    {allEggs.map(egg => (
                      <option key={egg.id} value={egg.id}>
                        {egg.nestName} - {egg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Memory (MB)</label>
                  <input
                    type="number"
                    value={newServer.memory}
                    onChange={(e) => setNewServer(prev => ({ ...prev, memory: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Disk (MB)</label>
                  <input
                    type="number"
                    value={newServer.disk}
                    onChange={(e) => setNewServer(prev => ({ ...prev, disk: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">CPU (%)</label>
                  <input
                    type="number"
                    value={newServer.cpu}
                    onChange={(e) => setNewServer(prev => ({ ...prev, cpu: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                Port will be allocated automatically. No need to create allocations manually.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createServer}
                  disabled={creating}
                  className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Create Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
