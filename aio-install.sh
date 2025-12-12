#!/bin/bash

# PanelManager All-In-One Installer
# One-command installation script
# Usage: curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/senzore/panelmanager/master/install.sh"
TEMP_INSTALL_SCRIPT="/tmp/panelmanager-install.sh"

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║                                                   ║"
    echo "║        PanelManager AIO Installer v1.0            ║"
    echo "║                                                   ║"
    echo "║     Pterodactyl Server Management Panel           ║"
    echo "║                                                   ║"
    echo "║     One-Command Complete Installation             ║"
    echo "║                                                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${MAGENTA}[→]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        echo ""
        echo "Please run with sudo:"
        echo "  sudo bash $0"
        echo ""
        echo "Or use the one-liner:"
        echo "  curl -sSL https://raw.githubusercontent.com/senzore/panelmanager/master/aio-install.sh | sudo bash"
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
            ubuntu)
                if [[ "$VER" < "20.04" ]]; then
                    print_warning "Ubuntu version $VER detected. Recommended: 20.04+"
                else
                    print_status "Ubuntu $VER detected"
                fi
                ;;
            debian)
                if [[ "$VER" < "11" ]]; then
                    print_warning "Debian version $VER detected. Recommended: 11+"
                else
                    print_status "Debian $VER detected"
                fi
                ;;
            *)
                print_warning "Unsupported OS: $OS. Proceeding anyway..."
                ;;
        esac
    else
        print_warning "Cannot detect OS version. Proceeding anyway..."
    fi
    echo ""
}

check_internet() {
    print_step "Checking internet connectivity..."
    
    if ! ping -c 1 google.com &> /dev/null && ! ping -c 1 8.8.8.8 &> /dev/null; then
        print_error "No internet connection detected"
        exit 1
    fi
    
    print_status "Internet connection OK"
    echo ""
}

show_info() {
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}What will be installed:${NC}"
    echo ""
    echo "  • Node.js 20.x (if not installed)"
    echo "  • Go 1.21.5 (if not installed)"
    echo "  • PanelManager Backend (Go)"
    echo "  • PanelManager Frontend (React + TypeScript)"
    echo "  • Systemd Service"
    echo "  • CLI Management Tool"
    echo ""
    echo -e "${YELLOW}Installation Directory:${NC}"
    echo "  /var/www/senzdev/panelmanager"
    echo ""
    echo -e "${YELLOW}Service Port:${NC}"
    echo "  3000 (HTTP)"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
}

confirm_installation() {
    echo -e "${YELLOW}Do you want to proceed with the installation? [Y/n]${NC} "
    read -r response
    
    case "$response" in
        [nN][oO]|[nN])
            print_info "Installation cancelled by user"
            exit 0
            ;;
        *)
            echo ""
            ;;
    esac
}

download_installer() {
    print_step "Downloading installation script..."
    
    if command -v curl &> /dev/null; then
        curl -sSL "$INSTALL_SCRIPT_URL" -o "$TEMP_INSTALL_SCRIPT"
    elif command -v wget &> /dev/null; then
        wget -q "$INSTALL_SCRIPT_URL" -O "$TEMP_INSTALL_SCRIPT"
    else
        print_error "Neither curl nor wget is installed"
        print_info "Installing curl..."
        apt-get update -qq
        apt-get install -y -qq curl
        curl -sSL "$INSTALL_SCRIPT_URL" -o "$TEMP_INSTALL_SCRIPT"
    fi
    
    if [ ! -f "$TEMP_INSTALL_SCRIPT" ]; then
        print_error "Failed to download installation script"
        exit 1
    fi
    
    chmod +x "$TEMP_INSTALL_SCRIPT"
    print_status "Installation script downloaded"
    echo ""
}

run_installer() {
    print_step "Running PanelManager installer..."
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    bash "$TEMP_INSTALL_SCRIPT"
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo ""
}

cleanup() {
    if [ -f "$TEMP_INSTALL_SCRIPT" ]; then
        rm -f "$TEMP_INSTALL_SCRIPT"
    fi
}

show_completion() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                   ║${NC}"
    echo -e "${GREEN}║          Installation Completed! 🎉               ║${NC}"
    echo -e "${GREEN}║                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Access your panel at:${NC}"
    echo -e "  ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo ""
    echo -e "${CYAN}Quick Commands:${NC}"
    echo -e "  ${YELLOW}panelmanager status${NC}     - Check service status"
    echo -e "  ${YELLOW}panelmanager restart${NC}    - Restart the service"
    echo -e "  ${YELLOW}panelmanager update${NC}     - Update to latest version"
    echo -e "  ${YELLOW}panelmanager${NC}            - Show all commands"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Open the panel in your browser"
    echo "  2. Register the first admin account"
    echo "  3. Configure your Pterodactyl Panel URL and API key"
    echo "  4. Start managing your servers!"
    echo ""
    echo -e "${GREEN}Thank you for using PanelManager!${NC}"
    echo ""
}

main() {
    print_banner
    check_root
    check_os
    check_internet
    show_info
    confirm_installation
    download_installer
    run_installer
    cleanup
    show_completion
}

# Trap errors and cleanup
trap cleanup EXIT

main
