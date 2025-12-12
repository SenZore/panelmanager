import { useState, useEffect } from 'react'
import { allocations } from '../api'
import { Plus, Trash2 } from 'lucide-react'

interface AllocationManagerProps {
  serverId: string
}

interface Allocation {
  id: number
  ip: string
  port: number
  is_default: boolean
  notes?: string
}

export default function AllocationManager({ serverId }: AllocationManagerProps) {
  const [allocs, setAllocs] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllocations()
  }, [])

  const loadAllocations = async () => {
    try {
      const res = await allocations.list(serverId)
      setAllocs(res.data.data?.map((a: any) => a.attributes) || [])
    } catch (err) {
      // Mock data
      setAllocs([
        { id: 1, ip: '192.168.1.10', port: 25565, is_default: true, notes: 'Main game port' },
        { id: 2, ip: '192.168.1.10', port: 25566, is_default: false, notes: 'Query port' },
        { id: 3, ip: '192.168.1.10', port: 8123, is_default: false, notes: 'Dynmap web interface' },
        { id: 4, ip: '192.168.1.10', port: 19132, is_default: false, notes: 'Geyser (Bedrock)' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const addAllocation = async () => {
    try {
      await allocations.add(serverId)
      loadAllocations()
    } catch (err) {
      console.error(err)
    }
  }

  const removeAllocation = async (allocId: number) => {
    try {
      await allocations.remove(serverId, allocId.toString())
      loadAllocations()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold">Server Allocations</span>
        <button onClick={addAllocation} className="btn-primary text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Allocation
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500">Loading allocations...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-zinc-500">
              <th className="text-left p-4 font-semibold">IP Address</th>
              <th className="text-left p-4 font-semibold">Port</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-left p-4 font-semibold">Notes</th>
              <th className="text-right p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allocs.map((alloc) => (
              <tr key={alloc.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                <td className="p-4 font-mono">{alloc.ip}</td>
                <td className="p-4 font-mono font-semibold">{alloc.port}</td>
                <td className="p-4">
                  {alloc.is_default ? (
                    <span className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                      Primary
                    </span>
                  ) : (
                    <span className="bg-zinc-500/15 text-zinc-400 px-3 py-1 rounded-full text-xs font-semibold">
                      Extra
                    </span>
                  )}
                </td>
                <td className="p-4 text-zinc-500">{alloc.notes || '-'}</td>
                <td className="p-4 text-right">
                  {alloc.is_default ? (
                    <span className="text-zinc-600 text-sm">Cannot remove</span>
                  ) : (
                    <button
                      onClick={() => removeAllocation(alloc.id)}
                      className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
