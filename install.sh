#!/bin/bash

# PanelManager Installer
# https://github.com/senzore/panelmanager

set -e

INSTALL_DIR="/var/www/senzdev/panelmanager"
REPO_URL="https://github.com/senzore/panelmanager.git"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║         PanelManager Installer            ║"
    echo "║     Pterodactyl Server Management         ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

install_dependencies() {
    print_status "Installing dependencies..."
    
    apt-get update -qq
    apt-get install -y -qq curl git build-essential

    # Install Node.js 20
    if ! command -v node &> /dev/null; then
        print_status "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
    fi

    # Install Go
    if ! command -v go &> /dev/null; then
        print_status "Installing Go..."
        wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
        rm -rf /usr/local/go
        tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
        rm go1.21.5.linux-amd64.tar.gz
        export PATH=$PATH:/usr/local/go/bin
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    fi

    print_status "Dependencies installed"
}

create_directories() {
    print_status "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p /var/www/senzdev
}

clone_repository() {
    print_status "Cloning repository..."
    if [ -d "$INSTALL_DIR/.git" ]; then
        cd "$INSTALL_DIR"
        git pull
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi
}

build_backend() {
    print_status "Building backend..."
    cd "$INSTALL_DIR/backend"
    /usr/local/go/bin/go mod download
    /usr/local/go/bin/go build -o "$INSTALL_DIR/panelmanager" .
}

build_frontend() {
    print_status "Building frontend..."
    cd "$INSTALL_DIR/frontend"
    npm install --silent
    npm run build
}

create_service() {
    print_status "Creating systemd service..."
    cat > /etc/systemd/system/panelmanager.service << EOF
[Unit]
Description=PanelManager - Pterodactyl Server Management
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/panelmanager
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable panelmanager
    systemctl start panelmanager
}

create_cli() {
    print_status "Creating CLI command..."
    cat > /usr/local/bin/panelmanager << 'EOF'
#!/bin/bash

INSTALL_DIR="/var/www/senzdev/panelmanager"

case "$1" in
    update)
        echo "Updating PanelManager..."
        cd "$INSTALL_DIR"
        git pull
        cd backend && go build -o "$INSTALL_DIR/panelmanager" .
        cd ../frontend && npm install && npm run build
        systemctl restart panelmanager
        echo "Update complete!"
        ;;
    restart)
        echo "Restarting PanelManager..."
        systemctl restart panelmanager
        echo "Restarted!"
        ;;
    stop)
        echo "Stopping PanelManager..."
        systemctl stop panelmanager
        echo "Stopped!"
        ;;
    start)
        echo "Starting PanelManager..."
        systemctl start panelmanager
        echo "Started!"
        ;;
    status)
        systemctl status panelmanager
        ;;
    reinstall)
        echo "Reinstalling PanelManager..."
        $0 uninstall
        curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/install.sh | bash
        ;;
    uninstall)
        echo "Uninstalling PanelManager..."
        systemctl stop panelmanager 2>/dev/null || true
        systemctl disable panelmanager 2>/dev/null || true
        rm -f /etc/systemd/system/panelmanager.service
        rm -rf "$INSTALL_DIR"
        rm -f /usr/local/bin/panelmanager
        systemctl daemon-reload
        echo "Uninstalled!"
        ;;
    *)
        echo "PanelManager CLI"
        echo ""
        echo "Usage: panelmanager <command>"
        echo ""
        echo "Commands:"
        echo "  update     - Update to latest version"
        echo "  restart    - Restart the service"
        echo "  stop       - Stop the service"
        echo "  start      - Start the service"
        echo "  status     - Show service status"
        echo "  reinstall  - Clean reinstall"
        echo "  uninstall  - Remove PanelManager"
        ;;
esac
EOF
    chmod +x /usr/local/bin/panelmanager
}

main() {
    print_banner
    check_root
    install_dependencies
    create_directories
    clone_repository
    build_backend
    build_frontend
    create_service
    create_cli

    echo ""
    print_status "Installation complete!"
    echo ""
    echo -e "  ${GREEN}PanelManager is now running at:${NC}"
    echo -e "  ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo ""
    echo -e "  ${YELLOW}CLI Commands:${NC}"
    echo "  panelmanager update    - Update to latest version"
    echo "  panelmanager restart   - Restart the service"
    echo "  panelmanager uninstall - Remove PanelManager"
    echo ""
}

main
