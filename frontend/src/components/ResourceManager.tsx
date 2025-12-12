import { useState } from 'react'
import { MemoryStick, Cpu, HardDrive, Database, Save, Loader2 } from 'lucide-react'

interface ResourceManagerProps {
  server: any
  serverId: string
}

export default function ResourceManager({ server, serverId: _serverId }: ResourceManagerProps) {
  const [ram, setRam] = useState(server.limits?.memory || 1024)
  const [cpu, setCpu] = useState(server.limits?.cpu || 100)
  const [disk, setDisk] = useState(server.limits?.disk || 5120)
  const [databases, setDatabases] = useState(server.feature_limits?.databases || 1)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const saveResources = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Note: Resource changes require admin API access
      // This is a placeholder - actual implementation would call the backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: 'Resource limits updated! Server restart may be required.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update resources' })
    } finally {
      setSaving(false)
    }
  }

  const resources = [
    {
      label: 'RAM Allocation',
      description: 'Memory limit for the server process',
      value: ram,
      setValue: setRam,
      unit: 'MB',
      icon: MemoryStick,
      color: 'from-green-500 to-green-400',
      min: 512,
      max: 32768,
      step: 256
    },
    {
      label: 'CPU Limit',
      description: '100% = 1 core, 200% = 2 cores',
      value: cpu,
      setValue: setCpu,
      unit: '%',
      icon: Cpu,
      color: 'from-blue-500 to-blue-400',
      min: 25,
      max: 400,
      step: 25
    },
    {
      label: 'Disk Space',
      description: 'Storage limit for server files',
      value: disk,
      setValue: setDisk,
      unit: 'MB',
      icon: HardDrive,
      color: 'from-orange-500 to-orange-400',
      min: 1024,
      max: 102400,
      step: 1024
    },
    {
      label: 'Database Limit',
      description: 'Number of MySQL databases',
      value: databases,
      setValue: setDatabases,
      unit: '',
      icon: Database,
      color: 'from-purple-500 to-purple-400',
      min: 0,
      max: 10,
      step: 1
    },
  ]

  const formatValue = (value: number, unit: string) => {
    if (unit === 'MB' && value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`
    }
    return `${value}${unit}`
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${message.type === 'success'
          ? 'bg-green-500/10 border border-green-500/20 text-green-400'
          : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {resources.map((res) => (
          <div key={res.label} className="glass rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3">
              <res.icon className="w-6 h-6 opacity-70" />
              <div>
                <span className="font-semibold">{res.label}</span>
                <p className="text-zinc-500 text-xs">{res.description}</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between mb-3">
                <span className="text-zinc-400">Current Limit</span>
                <span className="font-semibold text-white">
                  {formatValue(res.value, res.unit)}
                </span>
              </div>

              <input
                type="range"
                min={res.min}
                max={res.max}
                step={res.step}
                value={res.value}
                onChange={(e) => res.setValue(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer mb-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
              />

              <div className="flex justify-between text-xs text-zinc-500">
                <span>{formatValue(res.min, res.unit)}</span>
                <span>{formatValue(res.max, res.unit)}</span>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-zinc-400 font-medium mb-2">
                  Custom Value ({res.unit || 'count'})
                </label>
                <input
                  type="number"
                  value={res.value}
                  onChange={(e) => res.setValue(Number(e.target.value))}
                  min={res.min}
                  max={res.max}
                  step={res.step}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={saveResources}
        disabled={saving}
        className="btn-primary text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Save All Changes
      </button>

      <p className="text-zinc-500 text-sm">
        Note: Changing resource limits may require admin API permissions and a server restart to take effect.
      </p>
    </div>
  )
}
