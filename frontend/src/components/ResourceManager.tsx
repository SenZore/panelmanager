import { useState } from 'react'
import { MemoryStick, Cpu, HardDrive, Database } from 'lucide-react'

interface ResourceManagerProps {
  server: any
}

export default function ResourceManager({ server }: ResourceManagerProps) {
  const [ram, setRam] = useState(server.limits?.memory || 6144)
  const [cpu, setCpu] = useState(server.limits?.cpu || 200)
  const [disk, setDisk] = useState(server.limits?.disk || 25600)
  const [databases, setDatabases] = useState(server.feature_limits?.databases || 5)

  const resources = [
    {
      label: 'RAM Allocation',
      current: '4.2 GB',
      max: `${ram / 1024} GB`,
      percent: 70,
      color: 'from-green-500 to-green-400',
      value: ram,
      setValue: setRam,
      unit: 'MB',
      icon: MemoryStick
    },
    {
      label: 'CPU Allocation',
      current: '35%',
      max: `${cpu}%`,
      percent: 35,
      color: 'from-blue-500 to-blue-400',
      value: cpu,
      setValue: setCpu,
      unit: '%',
      icon: Cpu
    },
    {
      label: 'Disk Space',
      current: '12.4 GB',
      max: `${disk / 1024} GB`,
      percent: 50,
      color: 'from-orange-500 to-orange-400',
      value: disk,
      setValue: setDisk,
      unit: 'MB',
      icon: HardDrive
    },
    {
      label: 'Database Limit',
      current: '2',
      max: databases.toString(),
      percent: 40,
      color: 'from-purple-500 to-purple-400',
      value: databases,
      setValue: setDatabases,
      unit: '',
      icon: Database
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-5">
      {resources.map((res) => (
        <div key={res.label} className="glass rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center gap-3">
            <res.icon className="w-6 h-6 opacity-70" />
            <span className="font-semibold">{res.label}</span>
          </div>
          <div className="p-6">
            <div className="flex justify-between mb-2">
              <span className="text-zinc-400">Current Usage</span>
              <span className={`font-semibold ${res.percent > 80 ? 'text-red-400' : res.percent > 60 ? 'text-orange-400' : 'text-green-400'}`}>
                {res.current} / {res.max}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-5">
              <div 
                className={`h-full bg-gradient-to-r ${res.color} rounded-full transition-all`}
                style={{ width: `${res.percent}%` }}
              />
            </div>
            <label className="block text-sm text-zinc-400 font-medium mb-2">
              {res.label.split(' ')[0]} Limit {res.unit && `(${res.unit})`}
            </label>
            <input
              type="number"
              value={res.value}
              onChange={(e) => res.setValue(Number(e.target.value))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all mb-4"
            />
            <button className="w-full btn-primary text-white font-semibold py-2.5 rounded-xl transition-all">
              Apply Changes
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
