import { useState, useEffect, useRef } from 'react'
import { Terminal, Send } from 'lucide-react'

interface ConsoleProps {
  serverId: string
}

export default function Console({ serverId: _serverId }: ConsoleProps) {
  const [logs, setLogs] = useState<string[]>([
    '[12:34:56 INFO]: Starting minecraft server version 1.21.4',
    '[12:34:57 INFO]: Loading properties',
    '[12:34:57 INFO]: This server is running Paper version git-Paper-123 (MC: 1.21.4)',
    '[12:34:58 INFO]: Preparing level "world"',
    '[12:35:02 WARN]: Can\'t keep up! Is the server overloaded?',
    '[12:35:05 INFO]: Done (9.234s)! For help, type "help"',
  ])
  const [command, setCommand] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const sendCommand = async () => {
    if (!command.trim()) return
    setLogs([...logs, `> ${command}`])
    setCommand('')
    // In real implementation, send via WebSocket
  }

  const getLogColor = (log: string) => {
    if (log.includes('WARN')) return 'text-orange-400'
    if (log.includes('ERROR')) return 'text-red-400'
    if (log.includes('joined') || log.includes('left')) return 'text-purple-400'
    if (log.startsWith('>')) return 'text-indigo-400'
    if (log.includes('Paper') || log.includes('Spigot')) return 'text-blue-400'
    return 'text-green-400'
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold flex items-center gap-2"><Terminal className="w-5 h-5" /> Server Console</span>
        <span className="text-zinc-500 text-sm">Live • {logs.length} lines</span>
      </div>
      
      <div className="bg-black/40 p-5 h-96 overflow-y-auto font-mono text-sm leading-relaxed">
        {logs.map((log, i) => (
          <div key={i} className={getLogColor(log)}>{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <div className="p-4 border-t border-white/5 flex gap-3">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
          placeholder="Enter command..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
        <button
          onClick={sendCommand}
          className="btn-primary text-white font-semibold px-6 rounded-xl transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>
    </div>
  )
}
