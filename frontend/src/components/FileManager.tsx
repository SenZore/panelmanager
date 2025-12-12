import { useState, useEffect } from 'react'
import { files } from '../api'
import { Folder, File, Upload, FolderPlus, ArrowLeft, Download, Trash2, RefreshCw, Loader2, AlertCircle } from 'lucide-react'

interface FileManagerProps {
  serverId: string
}

interface FileItem {
  attributes: {
    name: string
    mode: string
    size: number
    is_file: boolean
    is_symlink: boolean
    mimetype: string
    created_at: string
    modified_at: string
  }
}

export default function FileManager({ serverId }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [currentPath, serverId])

  const loadFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await files.list(serverId, currentPath)
      setFileList(res.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files. Check your Pterodactyl API connection.')
      setFileList([])
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const navigateTo = (folder: string) => {
    const newPath = currentPath === '/' ? `/${folder}` : `${currentPath}/${folder}`
    setCurrentPath(newPath)
  }

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath('/' + parts.join('/'))
  }

  const deleteFile = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return

    setDeleting(fileName)
    try {
      await files.delete(serverId, currentPath, [fileName])
      loadFiles()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete file')
    } finally {
      setDeleting(null)
    }
  }

  const downloadFile = async (fileName: string) => {
    try {
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`
      const res = await files.download(serverId, filePath)
      if (res.data.attributes?.url) {
        window.open(res.data.attributes.url, '_blank')
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to get download URL')
    }
  }

  const handleUpload = async () => {
    try {
      const res = await files.upload(serverId)
      if (res.data.attributes?.url) {
        // Open upload URL in new window (Pterodactyl's upload endpoint)
        window.open(res.data.attributes.url + `&directory=${encodeURIComponent(currentPath)}`, '_blank')
        // Refresh after potential upload
        setTimeout(loadFiles, 3000)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to get upload URL')
    }
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
          <button
            onClick={loadFiles}
            className="bg-white/5 border border-white/10 text-white font-semibold px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleUpload}
            className="btn-primary text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button className="bg-white/5 border border-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4" /> New Folder
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
          <Loader2 className="w-5 h-5 animate-spin" /> Loading files...
        </div>
      ) : fileList.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          {error ? 'Could not load files' : 'This folder is empty'}
        </div>
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
            {fileList.map((file) => {
              const f = file.attributes
              return (
                <tr key={f.name} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    {f.is_file ? (
                      <span className="flex items-center gap-2">
                        <File className="w-4 h-4 text-zinc-500" /> {f.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigateTo(f.name)}
                        className="hover:text-indigo-400 transition-colors flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4 text-yellow-500" /> <strong>{f.name}</strong>
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-zinc-500">{formatSize(f.size)}</td>
                  <td className="p-4 text-zinc-500">{formatDate(f.modified_at)}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-1 justify-end">
                      {f.is_file && (
                        <button
                          onClick={() => downloadFile(f.name)}
                          className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteFile(f.name)}
                        disabled={deleting === f.name}
                        className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all text-red-400 disabled:opacity-50"
                      >
                        {deleting === f.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
