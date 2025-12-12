import { useState, useEffect } from 'react'
import { files } from '../api'
import { Folder, File, Upload, FolderPlus, ArrowLeft, Download, Trash2 } from 'lucide-react'

interface FileManagerProps {
  serverId: string
}

interface FileItem {
  name: string
  mode: string
  size: number
  is_file: boolean
  is_symlink: boolean
  mimetype: string
  created_at: string
  modified_at: string
}

export default function FileManager({ serverId }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [currentPath])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const res = await files.list(serverId, currentPath)
      setFileList(res.data.data || [])
    } catch (err) {
      // Mock data for demo
      setFileList([
        { name: 'plugins', mode: 'drwxr-xr-x', size: 0, is_file: false, is_symlink: false, mimetype: 'inode/directory', created_at: '', modified_at: 'Dec 9, 2025' },
        { name: 'world', mode: 'drwxr-xr-x', size: 156000000, is_file: false, is_symlink: false, mimetype: 'inode/directory', created_at: '', modified_at: 'Dec 9, 2025' },
        { name: 'server.jar', mode: '-rw-r--r--', size: 45200000, is_file: true, is_symlink: false, mimetype: 'application/java-archive', created_at: '', modified_at: 'Dec 8, 2025' },
        { name: 'server.properties', mode: '-rw-r--r--', size: 1200, is_file: true, is_symlink: false, mimetype: 'text/plain', created_at: '', modified_at: 'Dec 9, 2025' },
        { name: 'bukkit.yml', mode: '-rw-r--r--', size: 2800, is_file: true, is_symlink: false, mimetype: 'text/yaml', created_at: '', modified_at: 'Dec 8, 2025' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const navigateTo = (folder: string) => {
    setCurrentPath(currentPath === '/' ? `/${folder}` : `${currentPath}/${folder}`)
  }

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath('/' + parts.join('/'))
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-zinc-500" />
          <span className="font-mono text-sm">{currentPath}</span>
          {currentPath !== '/' && (
            <button onClick={goUp} className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500">Loading files...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-zinc-500">
              <th className="text-left p-4 font-semibold">Name</th>
              <th className="text-left p-4 font-semibold">Size</th>
              <th className="text-left p-4 font-semibold">Modified</th>
              <th className="text-right p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fileList.map((file) => (
              <tr key={file.name} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                <td className="p-4">
                  {file.is_file ? (
                    <span className="flex items-center gap-2"><File className="w-4 h-4 text-zinc-500" /> {file.name}</span>
                  ) : (
                    <button onClick={() => navigateTo(file.name)} className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                      <Folder className="w-4 h-4 text-yellow-500" /> <strong>{file.name}</strong>
                    </button>
                  )}
                </td>
                <td className="p-4 text-zinc-500">{formatSize(file.size)}</td>
                <td className="p-4 text-zinc-500">{file.modified_at}</td>
                <td className="p-4 text-right">
                  <div className="flex gap-1 justify-end">
                    {file.is_file && (
                      <button className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
