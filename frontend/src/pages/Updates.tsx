import { useState, useEffect } from 'react'
import { updates } from '../api'
import { Download, Info, Terminal } from 'lucide-react'

export default function Updates() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    checkUpdates()
  }, [])

  const checkUpdates = async () => {
    try {
      const res = await updates.check()
      setUpdateInfo(res.data)
    } catch (err) {
      setUpdateInfo({ current: '1.0.0', latest: '1.0.0', update_available: false })
    }
  }

  const installUpdate = async () => {
    setInstalling(true)
    try {
      await updates.install()
      alert('Update installed! The application will restart.')
    } catch (err) {
      console.error(err)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <h2 className="text-2xl font-bold">Updates</h2>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 font-semibold flex items-center gap-2"><Info className="w-5 h-5" /> Version Information</div>
        
        <div className="p-7">
          {updateInfo?.update_available && (
            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl mb-6">
              <div>
                <strong className="text-lg">Update Available!</strong>
                <br />
                <span className="text-zinc-500">{updateInfo.latest} is ready to install from github.com/senzore/panelmanager</span>
              </div>
              <button
                onClick={installUpdate}
                disabled={installing}
                className="btn-primary text-white font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="w-5 h-5" /> {installing ? 'Installing...' : 'Install Update'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="p-5 bg-white/2 rounded-xl border border-white/5">
              <div className="text-zinc-500 text-sm mb-1">Current Version</div>
              <strong className="text-xl">{updateInfo?.current || 'v1.0.0'}</strong>
            </div>
            <div className="p-5 bg-white/2 rounded-xl border border-white/5">
              <div className="text-zinc-500 text-sm mb-1">Latest Version</div>
              <strong className={`text-xl ${updateInfo?.update_available ? 'text-green-400' : ''}`}>
                {updateInfo?.latest || 'v1.0.0'}
              </strong>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Terminal className="w-5 h-5" /> CLI Commands</h4>
            <div className="bg-black/30 rounded-xl p-5 font-mono text-sm text-zinc-400 space-y-2">
              <div><span className="text-green-400">$</span> panelmanager update</div>
              <div><span className="text-green-400">$</span> panelmanager restart</div>
              <div><span className="text-green-400">$</span> panelmanager reinstall</div>
              <div><span className="text-green-400">$</span> panelmanager uninstall</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
