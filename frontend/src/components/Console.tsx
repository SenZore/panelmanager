import { useState, useEffect, useRef } from 'react'
import { servers } from '../api'
import { Terminal, Send, Loader2 } from 'lucide-react'

interface ConsoleProps {
  serverId: string
  serverIdentifier?: string
}

export default function Console({ serverId, serverIdentifier }: ConsoleProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const id = serverIdentifier || serverId

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [id])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const connectWebSocket = async () => {
    setConnecting(true)
    setError(null)

    try {
      // Get WebSocket credentials from API
      const res = await servers.console(id)
      const { socket, token } = res.data

      if (!socket || !token) {
        setError('Could not get console credentials')
        setConnecting(false)
        return
      }

      // Connect to Pterodactyl WebSocket
      const ws = new WebSocket(socket)
      wsRef.current = ws

      ws.onopen = () => {
        // Authenticate
        ws.send(JSON.stringify({
          event: 'auth',
          args: [token]
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.event === 'auth success') {
            setConnected(true)
            setConnecting(false)
            // Request logs
            ws.send(JSON.stringify({ event: 'send logs', args: [null] }))
          } else if (data.event === 'console output') {
            const line = data.args[0]
            if (line) {
              setLogs(prev => [...prev.slice(-500), line])
            }
          } else if (data.event === 'status') {
            setLogs(prev => [...prev, `[SERVER] Status: ${data.args[0]}`])
          } else if (data.event === 'token expiring') {
            // Reconnect before token expires
            connectWebSocket()
          }
        } catch (e) {
          // Not JSON, treat as log line
          setLogs(prev => [...prev.slice(-500), event.data])
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
        setConnected(false)
        setConnecting(false)
      }

      ws.onclose = () => {
        setConnected(false)
        setConnecting(false)
      }

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to connect to console')
      setConnecting(false)
    }
  }

  const sendCommand = () => {
    if (!command.trim() || !wsRef.current || !connected) return

    wsRef.current.send(JSON.stringify({
      event: 'send command',
      args: [command]
    }))

    setLogs(prev => [...prev, `> ${command}`])
    setCommand('')
  }

  const getLogColor = (log: string) => {
    if (log.includes('WARN')) return 'text-orange-400'
    if (log.includes('ERROR') || log.includes('SEVERE')) return 'text-red-400'
    if (log.includes('joined') || log.includes('left')) return 'text-purple-400'
    if (log.startsWith('>')) return 'text-indigo-400'
    if (log.includes('[SERVER]')) return 'text-blue-400'
    if (log.includes('Paper') || log.includes('Spigot')) return 'text-cyan-400'
    if (log.includes('Done') || log.includes('started')) return 'text-green-400'
    return 'text-green-400/80'
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold flex items-center gap-2">
          <Terminal className="w-5 h-5" /> Server Console
        </span>
        <div className="flex items-center gap-3">
          {connecting ? (
            <span className="text-zinc-500 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
            </span>
          ) : connected ? (
            <span className="text-green-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live • {logs.length} lines
            </span>
          ) : (
            <button
              onClick={connectWebSocket}
              className="text-indigo-400 text-sm hover:text-indigo-300"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-black/40 p-5 h-96 overflow-y-auto font-mono text-sm leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-zinc-600">
            {connecting ? 'Connecting to console...' : 'No console output yet. Start the server to see logs.'}
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={getLogColor(log)}>{log}</div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <div className="p-4 border-t border-white/5 flex gap-3">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
          placeholder={connected ? "Enter command..." : "Connect to send commands..."}
          disabled={!connected}
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
        />
        <button
          onClick={sendCommand}
          disabled={!connected}
          className="btn-primary text-white font-semibold px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>
    </div>
  )
}
