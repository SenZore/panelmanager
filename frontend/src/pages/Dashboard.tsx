import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { servers, updates } from '../api'
import { Server, Wifi, MemoryStick, Network, Plus, Rocket } from 'lucide-react'

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

export default function Dashboard() {
  const [serverList, setServerList] = useState<ServerData[]>([])
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  const stats = [
    { label: 'Total Servers', value: serverList.length, color: 'text-blue-500', icon: Server },
    { label: 'Online', value: serverList.length, color: 'text-green-500', icon: Wifi },
    { label: 'Total RAM', value: `${serverList.reduce((acc, s) => acc + s.attributes.limits.memory, 0) / 1024}GB`, color: 'text-purple-500', icon: MemoryStick },
    { label: 'Allocations', value: serverList.reduce((acc, s) => acc + (s.attributes.relationships?.allocations?.data?.length || 0), 0), color: 'text-orange-500', icon: Network },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button className="btn-primary text-white font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2">
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
    </div>
  )
}
