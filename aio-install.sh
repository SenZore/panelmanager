#!/bin/bash

# PanelManager All-In-One Installer
# One-command installation script
# Usage: bash <(curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

INSTALL_DIR="/var/www/senzdev/panelmanager"
REPO_URL="https://github.com/senzore/panelmanager.git"
DEFAULT_PORT=3000
SELECTED_PORT=$DEFAULT_PORT
DOMAIN=""
USE_SSL=false

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║                                                   ║"
    echo "║        PanelManager AIO Installer v2.0            ║"
    echo "║                                                   ║"
    echo "║     Pterodactyl Server Management Panel           ║"
    echo "║                                                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[X]${NC} $1"
}

print_step() {
    echo -e "${MAGENTA}[>]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        echo ""
        echo "Run it like this:"
        echo "  sudo bash <(curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh)"
        exit 1
    fi
}

check_os() {
    print_step "Checking operating system..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        
        case $OS in
            ubuntu|debian)
                print_status "$OS $VER detected"
                ;;
            *)
                print_warning "OS $OS might not be fully supported, but we'll try anyway"
                ;;
        esac
    else
        print_warning "Can't detect OS, continuing anyway..."
    fi
}

check_internet() {
    print_step "Checking internet..."
    
    if ! ping -c 1 google.com &> /dev/null && ! ping -c 1 8.8.8.8 &> /dev/null; then
        print_error "No internet connection"
        exit 1
    fi
    
    print_status "Internet is working"
}

check_port() {
    local port=$1
    if ss -tuln | grep -q ":$port "; then
        return 1
    else
        return 0
    fi
}

find_available_port() {
    local port=$1
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt 65535 ]; then
            port=3001
        fi
    done
    echo $port
}

ask_port() {
    echo ""
    print_step "Port Configuration"
    echo ""
    
    if check_port $DEFAULT_PORT; then
        print_info "Default port $DEFAULT_PORT is available"
    else
        print_warning "Default port $DEFAULT_PORT is already in use"
        local suggested=$(find_available_port $((DEFAULT_PORT + 1)))
        print_info "Suggested available port: $suggested"
    fi
    
    echo ""
    echo -e "${YELLOW}What port do you want to use? (default: $DEFAULT_PORT)${NC}"
    echo -n "> "
    read -r user_port </dev/tty
    
    if [ -z "$user_port" ]; then
        user_port=$DEFAULT_PORT
    fi
    
    # Validate port number
    if ! [[ "$user_port" =~ ^[0-9]+$ ]] || [ "$user_port" -lt 1 ] || [ "$user_port" -gt 65535 ]; then
        print_error "Invalid port number. Using default $DEFAULT_PORT"
        user_port=$DEFAULT_PORT
    fi
    
    if check_port $user_port; then
        SELECTED_PORT=$user_port
        print_status "Using port $SELECTED_PORT"
    else
        print_warning "Port $user_port is in use"
        local available=$(find_available_port $user_port)
        echo -e "${YELLOW}Use port $available instead? [Y/n]${NC}"
        echo -n "> "
        read -r response </dev/tty
        case "$response" in
            [nN]|[nN][oO])
                print_error "Can't continue without an available port"
                exit 1
                ;;
            *)
                SELECTED_PORT=$available
                print_status "Using port $SELECTED_PORT"
                ;;
        esac
    fi
}

ask_domain() {
    echo ""
    print_step "Domain Configuration (optional)"
    echo ""
    print_info "If you have a domain pointing to this server, we can set up SSL for you"
    print_info "Leave empty to skip SSL setup and just use IP:port"
    echo ""
    echo -e "${YELLOW}Enter your domain (or press Enter to skip):${NC}"
    echo -n "> "
    read -r user_domain </dev/tty
    
    if [ -n "$user_domain" ]; then
        DOMAIN=$user_domain
        print_status "Domain set to: $DOMAIN"
        check_dns
    else
        print_info "Skipping domain/SSL setup"
    fi
}

check_dns() {
    print_step "Checking DNS for $DOMAIN..."
    
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null)
    local domain_ip=$(dig +short "$DOMAIN" 2>/dev/null | head -n1)
    
    if [ -z "$domain_ip" ]; then
        print_warning "Can't resolve $DOMAIN - DNS might not be set up yet"
        echo -e "${YELLOW}Continue anyway? [y/N]${NC}"
        echo -n "> "
        read -r response </dev/tty
        case "$response" in
            [yY]|[yY][eE][sS])
                print_info "Continuing without DNS verification"
                ;;
            *)
                DOMAIN=""
                print_info "Skipping domain/SSL setup"
                return
                ;;
        esac
    elif [ "$domain_ip" != "$server_ip" ]; then
        print_warning "DNS mismatch!"
        print_info "Domain points to: $domain_ip"
        print_info "This server is: $server_ip"
        echo -e "${YELLOW}Continue anyway? [y/N]${NC}"
        echo -n "> "
        read -r response </dev/tty
        case "$response" in
            [yY]|[yY][eE][sS])
                print_info "Continuing anyway"
                ;;
            *)
                DOMAIN=""
                print_info "Skipping domain/SSL setup"
                return
                ;;
        esac
    else
        print_status "DNS is correctly pointing to this server"
        USE_SSL=true
    fi
}

show_info() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}What will be installed:${NC}"
    echo ""
    echo "  - Node.js 20.x (if not installed)"
    echo "  - Go 1.21.5 (if not installed)"
    echo "  - PanelManager Backend"
    echo "  - PanelManager Frontend"
    echo "  - Systemd Service (auto-start on boot)"
    if [ -n "$DOMAIN" ]; then
        echo "  - Nginx reverse proxy"
        echo "  - SSL certificate (Let's Encrypt)"
    fi
    echo ""
    echo -e "${YELLOW}Settings:${NC}"
    echo "  Port: $SELECTED_PORT"
    if [ -n "$DOMAIN" ]; then
        echo "  Domain: $DOMAIN"
        echo "  SSL: Enabled"
    else
        echo "  Domain: None (using IP)"
        echo "  SSL: Disabled"
    fi
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
}

confirm_installation() {
    echo -e "${YELLOW}Ready to install. Continue? [Y/n]${NC}"
    echo -n "> "
    read -r response </dev/tty
    
    case "$response" in
        [nN]|[nN][oO])
            print_info "Installation cancelled"
            exit 0
            ;;
        *)
            echo ""
            ;;
    esac
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    apt-get update -qq
    apt-get install -y -qq curl git build-essential wget dnsutils

    # Install Node.js 20
    if ! command -v node &> /dev/null; then
        print_step "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
    fi
    print_status "Node.js $(node --version) installed"

    # Install Go
    if ! command -v go &> /dev/null && [ ! -f /usr/local/go/bin/go ]; then
        print_step "Installing Go..."
        wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
        rm -rf /usr/local/go
        tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
        rm go1.21.5.linux-amd64.tar.gz
        export PATH=$PATH:/usr/local/go/bin
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    fi
    print_status "Go installed"

    print_status "All dependencies installed"
}

clone_repository() {
    print_step "Getting PanelManager code..."
    
    mkdir -p /var/www/senzdev
    
    if [ -d "$INSTALL_DIR/.git" ]; then
        cd "$INSTALL_DIR"
        git pull -q
    else
        rm -rf "$INSTALL_DIR"
        git clone -q "$REPO_URL" "$INSTALL_DIR"
    fi
    
    print_status "Code downloaded"
}

build_backend() {
    print_step "Building backend..."
    cd "$INSTALL_DIR/backend"
    /usr/local/go/bin/go mod tidy
    /usr/local/go/bin/go build -o "$INSTALL_DIR/panelmanager" .
    print_status "Backend built"
}

build_frontend() {
    print_step "Building frontend..."
    cd "$INSTALL_DIR/frontend"
    npm install --silent 2>/dev/null
    npm run build 2>/dev/null
    print_status "Frontend built"
}

create_service() {
    print_step "Creating systemd service..."
    
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
Environment=PORT=$SELECTED_PORT
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable panelmanager >/dev/null 2>&1
    systemctl start panelmanager
    
    print_status "Service created and enabled (starts on boot)"
}

setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        return
    fi
    
    print_step "Setting up Nginx and SSL..."
    
    # Install nginx and certbot
    apt-get install -y -qq nginx certbot python3-certbot-nginx
    
    # Create nginx config
    cat > /etc/nginx/sites-available/panelmanager << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$SELECTED_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/panelmanager /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    nginx -t >/dev/null 2>&1
    systemctl restart nginx
    systemctl enable nginx >/dev/null 2>&1
    
    print_status "Nginx configured"
    
    # Get SSL certificate
    if [ "$USE_SSL" = true ]; then
        print_step "Getting SSL certificate..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect >/dev/null 2>&1 && {
            print_status "SSL certificate installed"
        } || {
            print_warning "SSL setup failed - you can try manually with: certbot --nginx -d $DOMAIN"
        }
    fi
}

create_cli() {
    print_step "Creating CLI tool..."
    
    cat > /usr/local/bin/panelmanager << 'EOF'
#!/bin/bash

INSTALL_DIR="/var/www/senzdev/panelmanager"

case "$1" in
    update)
        echo "Updating PanelManager..."
        cd "$INSTALL_DIR"
        git pull
        cd backend && /usr/local/go/bin/go mod tidy && /usr/local/go/bin/go build -o "$INSTALL_DIR/panelmanager" .
        cd ../frontend && npm install && npm run build
        systemctl restart panelmanager
        echo "Updated!"
        ;;
    restart)
        systemctl restart panelmanager
        echo "Restarted!"
        ;;
    stop)
        systemctl stop panelmanager
        echo "Stopped!"
        ;;
    start)
        systemctl start panelmanager
        echo "Started!"
        ;;
    status)
        systemctl status panelmanager
        ;;
    logs)
        journalctl -u panelmanager -f
        ;;
    reinstall)
        $0 uninstall
        curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh | bash
        ;;
    uninstall)
        echo "Uninstalling..."
        systemctl stop panelmanager 2>/dev/null || true
        systemctl disable panelmanager 2>/dev/null || true
        rm -f /etc/systemd/system/panelmanager.service
        rm -rf "$INSTALL_DIR"
        rm -f /usr/local/bin/panelmanager
        rm -f /etc/nginx/sites-enabled/panelmanager
        rm -f /etc/nginx/sites-available/panelmanager
        systemctl daemon-reload
        systemctl restart nginx 2>/dev/null || true
        echo "Uninstalled!"
        ;;
    port)
        if [ -z "$2" ]; then
            grep "PORT=" /etc/systemd/system/panelmanager.service | cut -d= -f3
        else
            sed -i "s/Environment=PORT=.*/Environment=PORT=$2/" /etc/systemd/system/panelmanager.service
            systemctl daemon-reload
            systemctl restart panelmanager
            echo "Port changed to $2"
        fi
        ;;
    *)
        echo "PanelManager CLI"
        echo ""
        echo "Commands:"
        echo "  update     - update to latest version"
        echo "  restart    - restart the service"
        echo "  stop       - stop the service"
        echo "  start      - start the service"
        echo "  status     - check if running"
        echo "  logs       - view live logs"
        echo "  port       - show current port"
        echo "  port 8080  - change port to 8080"
        echo "  reinstall  - reinstall everything"
        echo "  uninstall  - remove panelmanager"
        ;;
esac
EOF
    chmod +x /usr/local/bin/panelmanager
    print_status "CLI tool created"
}

show_completion() {
    local access_url=""
    
    if [ -n "$DOMAIN" ] && [ "$USE_SSL" = true ]; then
        access_url="https://$DOMAIN"
    elif [ -n "$DOMAIN" ]; then
        access_url="http://$DOMAIN"
    else
        local server_ip=$(hostname -I | awk '{print $1}')
        access_url="http://$server_ip:$SELECTED_PORT"
    fi
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                   ║${NC}"
    echo -e "${GREEN}║            Installation Complete!                 ║${NC}"
    echo -e "${GREEN}║                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Access your panel at:"
    echo -e "  ${BLUE}$access_url${NC}"
    echo ""
    echo -e "Commands:"
    echo -e "  ${YELLOW}panelmanager status${NC}   - check if running"
    echo -e "  ${YELLOW}panelmanager logs${NC}     - view live logs"
    echo -e "  ${YELLOW}panelmanager restart${NC}  - restart service"
    echo -e "  ${YELLOW}panelmanager update${NC}   - update to latest"
    echo ""
    echo -e "Next steps:"
    echo "  1. Open the panel in your browser"
    echo "  2. Create your admin account"
    echo "  3. Add your Pterodactyl panel URL and API key in settings"
    echo ""
    echo -e "${GREEN}The service will start automatically when your VPS reboots.${NC}"
    echo ""
}

main() {
    print_banner
    check_root
    check_os
    check_internet
    ask_port
    ask_domain
    show_info
    confirm_installation
    install_dependencies
    clone_repository
    build_backend
    build_frontend
    create_service
    setup_ssl
    create_cli
    show_completion
}

main
