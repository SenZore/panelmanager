import { Link, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { LayoutDashboard, Egg, Settings, Download, LogOut, Server } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/eggs', label: 'Egg Manager', icon: Egg },
  { path: '/settings', label: 'API Settings', icon: Settings },
  { path: '/updates', label: 'Updates', icon: Download },
]

export default function Layout({ children, onLogout }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-72 glass border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">PanelManager</h1>
            <span className="text-xs text-zinc-500">v1.0.0 • Pterodactyl</span>
          </div>
        </div>

        <div className="text-xs uppercase tracking-wider text-zinc-600 font-semibold mb-3 px-3">
          Overview
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.slice(0, 1).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.3)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 opacity-80" />
              {item.label}
            </Link>
          ))}

          <div className="text-xs uppercase tracking-wider text-zinc-600 font-semibold mb-3 px-3 mt-6">
            Management
          </div>

          {navItems.slice(1).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.3)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 opacity-80" />
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all font-medium mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
