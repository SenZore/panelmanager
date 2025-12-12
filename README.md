# PanelManager

A modern, elegant web panel for managing Pterodactyl game servers.

![PanelManager](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🎮 **Server Management** - Create, start, stop, restart servers easily
- 📟 **Live Console** - Real-time server console with command input
- 📁 **File Manager** - Upload, download, delete server files
- 🔌 **Plugin Installer** - Search and install from Hangar, Modrinth, SpigotMC
- 📦 **Modpack Support** - Install modpacks from Modrinth
- 🥚 **Egg Manager** - Import and sync Pterodactyl eggs
- 🌐 **Allocation Manager** - Add/remove IP:port allocations
- 📊 **Resource Management** - Adjust RAM, CPU, disk limits
- 🔄 **Auto Updates** - One-click updates from GitHub
- 🌙 **Dark Theme** - Elegant, professional dark interface

## Quick Install

```bash
curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/install.sh | bash
```

## Requirements

- Ubuntu 20.04+ / Debian 11+
- Root access
- Pterodactyl Panel installed

## CLI Commands

```bash
panelmanager update     # Update to latest version
panelmanager restart    # Restart the service
panelmanager stop       # Stop the service
panelmanager start      # Start the service
panelmanager status     # Show service status
panelmanager reinstall  # Clean reinstall
panelmanager uninstall  # Remove PanelManager
```

## Manual Installation

```bash
# Clone repository
git clone https://github.com/senzore/panelmanager.git /var/www/senzdev/panelmanager
cd /var/www/senzdev/panelmanager

# Build backend
cd backend
go mod download
go build -o ../panelmanager .

# Build frontend
cd ../frontend
npm install
npm run build

# Start
./panelmanager
```

## Configuration

1. Open PanelManager in your browser
2. Register the admin account (first user becomes admin)
3. Go to Settings and enter your Pterodactyl Panel URL and API key
4. Start managing your servers!

## Tech Stack

- **Backend**: Go + Gin
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: SQLite
- **APIs**: Pterodactyl, Hangar, Modrinth, SpigotMC

## License

MIT License - see LICENSE file

## Author

Made by [senzore](https://github.com/senzore)
