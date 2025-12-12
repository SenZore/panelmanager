import { useState, useEffect } from 'react'
import { eggs } from '../api'
import { Download, RefreshCw, Edit } from 'lucide-react'

interface Egg {
  id: number
  name: string
  description: string
  docker_image: string
  nest: string
  servers_count?: number
}

export default function EggManager() {
  const [eggList, setEggList] = useState<Egg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEggs()
  }, [])

  const loadEggs = async () => {
    try {
      const res = await eggs.list()
      // Parse nested structure
      const allEggs: Egg[] = []
      res.data.data?.forEach((nest: any) => {
        nest.attributes.relationships?.eggs?.data?.forEach((egg: any) => {
          allEggs.push({
            id: egg.attributes.id,
            name: egg.attributes.name,
            description: egg.attributes.description,
            docker_image: egg.attributes.docker_image,
            nest: nest.attributes.name,
          })
        })
      })
      setEggList(allEggs)
    } catch (err) {
      // Mock data
      setEggList([
        { id: 1, name: 'Paper', description: 'High performance Minecraft', docker_image: 'ghcr.io/pterodactyl/yolks:java_21', nest: 'Minecraft', servers_count: 8 },
        { id: 2, name: 'Purpur', description: 'Paper fork with extras', docker_image: 'ghcr.io/pterodactyl/yolks:java_21', nest: 'Minecraft', servers_count: 2 },
        { id: 3, name: 'Forge', description: 'Modded Minecraft', docker_image: 'ghcr.io/pterodactyl/yolks:java_17', nest: 'Minecraft', servers_count: 1 },
        { id: 4, name: 'Fabric', description: 'Lightweight modding', docker_image: 'ghcr.io/pterodactyl/yolks:java_21', nest: 'Minecraft', servers_count: 1 },
      ])
    } finally {
      setLoading(false)
    }
  }

  const syncEggs = async () => {
    try {
      await eggs.sync()
      loadEggs()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">Egg Manager</h2>
        <div className="flex gap-2">
          <button className="btn-primary text-white font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2">
            <Download className="w-5 h-5" /> Import Egg
          </button>
          <button onClick={syncEggs} className="bg-white/5 border border-white/10 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> Sync from Pterodactyl
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold">Available Eggs</div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading eggs...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="text-left p-4 font-semibold">Egg Name</th>
                <th className="text-left p-4 font-semibold">Nest</th>
                <th className="text-left p-4 font-semibold">Docker Image</th>
                <th className="text-left p-4 font-semibold">Servers Using</th>
                <th className="text-right p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eggList.map((egg) => (
                <tr key={egg.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    <strong>{egg.name}</strong>
                    <br />
                    <span className="text-xs text-zinc-500">{egg.description}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                      {egg.nest}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-zinc-500">{egg.docker_image}</td>
                  <td className="p-4">{egg.servers_count || 0} servers</td>
                  <td className="p-4 text-right">
                    <button className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-1.5">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
