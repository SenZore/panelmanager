# PanelManager

A web panel for managing Pterodactyl game servers.

![PanelManager](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What it does

- Manage servers - create, start, stop, restart
- Live console - see server output and run commands
- File manager - upload, download, delete files
- Plugin installer - search and install from Hangar, Modrinth, SpigotMC
- Modpack support - install modpacks from Modrinth
- Egg manager - import and sync Pterodactyl eggs
- Allocation manager - add or remove IP:port allocations
- Resource management - change RAM, CPU, disk limits
- Auto updates - update from GitHub with one click
- Dark theme - easy on the eyes

## How to install

### Easy way (recommended)

Copy and paste this into your terminal:

```bash
sudo bash <(curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh)
```

This will:
- Ask you what port to use (checks if port is available)
- Ask for your domain (optional, for SSL)
- Check if DNS is set up correctly
- Set up SSL automatically with Let's Encrypt
- Make it auto-start when your VPS reboots

### Quick way (no questions asked)

```bash
curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/install.sh | sudo bash
```


### What you need

- Ubuntu 20.04 or newer (or Debian 11+)
- Root access
- Pterodactyl Panel already installed

## Using the CLI

After installing, you can use these commands:

```bash
panelmanager update     # update to latest version
panelmanager restart    # restart the service
panelmanager stop       # stop the service
panelmanager start      # start the service
panelmanager status     # check if it's running
panelmanager reinstall  # reinstall everything
panelmanager uninstall  # remove panelmanager
```

## Manual installation

If you want to do it yourself:

```bash
# get the code
git clone https://github.com/senzore/panelmanager.git /var/www/senzdev/panelmanager
cd /var/www/senzdev/panelmanager

# build backend
cd backend
go mod download
go build -o ../panelmanager .

# build frontend
cd ../frontend
npm install
npm run build

# run it
./panelmanager
```

## Setup

1. Open the panel in your browser (it runs on port 3000)
2. Make an account (first account becomes admin)
3. Go to settings and put in your Pterodactyl panel URL and API key
4. Done, you can now manage servers

## What it's built with

- Backend: Go with Gin framework
- Frontend: React with TypeScript, Vite, and Tailwind CSS
- Database: SQLite
- APIs: Pterodactyl, Hangar, Modrinth, SpigotMC

## License

MIT License

## Made by

[senzore](https://github.com/senzore)
