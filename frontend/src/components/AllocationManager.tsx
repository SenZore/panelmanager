import { useState, useEffect } from 'react'
import { allocations } from '../api'
import { Plus, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

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
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAllocations()
  }, [serverId])

  const loadAllocations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await allocations.list(serverId)
      const data = res.data.data || []
      setAllocs(data.map((a: any) => a.attributes))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load allocations')
    } finally {
      setLoading(false)
    }
  }

  const addAllocation = async () => {
    setAdding(true)
    setError(null)
    try {
      await allocations.add(serverId)
      loadAllocations()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add allocation')
    } finally {
      setAdding(false)
    }
  }

  const removeAllocation = async (allocId: number) => {
    if (!confirm('Remove this allocation?')) return

    setRemoving(allocId)
    setError(null)
    try {
      await allocations.remove(serverId, allocId.toString())
      loadAllocations()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove allocation')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold">Server Allocations</span>
        <div className="flex gap-2">
          <button
            onClick={loadAllocations}
            className="bg-white/5 border border-white/10 text-white font-semibold px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={addAllocation}
            disabled={adding}
            className="btn-primary text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Allocation
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading allocations...
        </div>
      ) : allocs.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          No allocations found. Add one to get started.
        </div>
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
                <td className="p-4 font-mono font-semibold text-indigo-400">{alloc.port}</td>
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
                    <span className="text-zinc-600 text-sm">Cannot remove primary</span>
                  ) : (
                    <button
                      onClick={() => removeAllocation(alloc.id)}
                      disabled={removing === alloc.id}
                      className="bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {removing === alloc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Remove
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
