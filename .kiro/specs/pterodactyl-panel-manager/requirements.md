# Requirements Document

## Introduction

PanelManager is a self-hosted web application that provides a simplified interface for managing Pterodactyl game servers. The system integrates with the Pterodactyl API to enable server creation, resource management, and console access through an elegant dark-themed interface. The application is deployed at `/var/www/senzdev/panelmanager` and includes an all-in-one shell installer for easy deployment.

## Glossary

- **PanelManager**: The web application being developed for managing Pterodactyl servers
- **Pterodactyl**: An open-source game server management panel
- **Pterodactyl_API**: The REST API provided by Pterodactyl for programmatic access
- **Admin**: The first registered user who has full system access
- **Server**: A game server instance managed through Pterodactyl
- **Allocation**: An IP:port combination assigned to a server
- **Node**: A Pterodactyl node that hosts game servers
- **Wings**: The Pterodactyl server daemon that runs on nodes
- **API_Key**: An authentication token for accessing the Pterodactyl API
- **Egg**: A Pterodactyl configuration template that defines how a game server runs
- **Nest**: A category grouping of eggs in Pterodactyl
- **Hangar_API**: The API for PaperMC's plugin repository (hangar.papermc.io)
- **Modrinth_API**: The API for Modrinth mod/plugin repository
- **SpigotMC_API**: The API for SpigotMC plugin repository
- **PaperMC_API**: The API for downloading Paper/Purpur server jars
- **Plugin**: A server-side extension for Minecraft servers (Paper, Spigot, Purpur)
- **Mod**: A modification for modded Minecraft servers (Forge, Fabric)
- **Modpack**: A curated collection of mods bundled together

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to install PanelManager using a single shell script, so that I can quickly deploy the application without complex manual configuration.

#### Acceptance Criteria

1. WHEN the administrator executes the installer script THEN PanelManager SHALL create the directory structure at `/var/www/senzdev/panelmanager`
2. WHEN the installer script runs THEN PanelManager SHALL install all required dependencies including Go, Node.js, and database components
3. WHEN the installer completes THEN PanelManager SHALL configure and start the web server automatically
4. WHEN the administrator executes the uninstaller option THEN PanelManager SHALL remove all application files and configurations cleanly
5. WHEN the installer completes THEN PanelManager SHALL register the `panelmanager` CLI command globally

### Requirement 11

**User Story:** As a system administrator, I want CLI commands to manage PanelManager, so that I can update, restart, or reinstall the application easily.

#### Acceptance Criteria

1. WHEN an administrator runs `panelmanager update` THEN PanelManager SHALL pull the latest changes from the configured GitHub repository and rebuild the application
2. WHEN an administrator runs `panelmanager uninstall` THEN PanelManager SHALL stop services and remove all application files
3. WHEN an administrator runs `panelmanager reinstall` THEN PanelManager SHALL perform a clean uninstall followed by a fresh installation
4. WHEN an administrator runs `panelmanager restart` THEN PanelManager SHALL stop and start the application services
5. WHEN an update is available on GitHub THEN PanelManager SHALL display a notification in the admin dashboard

### Requirement 12

**User Story:** As a system administrator, I want automatic updates from GitHub, so that I always have the latest features and security fixes.

#### Acceptance Criteria

1. WHEN PanelManager checks for updates THEN the system SHALL compare local version against the latest release from `github.com/senzore/panelmanager`
2. WHEN a new version is detected THEN PanelManager SHALL notify the admin through the dashboard
3. WHEN an admin triggers update from the dashboard THEN PanelManager SHALL pull changes from `github.com/senzore/panelmanager` and rebuild
4. WHEN the update completes THEN PanelManager SHALL restart services automatically and display the new version

### Requirement 2

**User Story:** As the first visitor, I want to register as the admin account, so that I can secure and manage the panel.

#### Acceptance Criteria

1. WHEN no admin account exists and a user visits the registration page THEN PanelManager SHALL display a registration form requesting username and password
2. WHEN the first user completes registration THEN PanelManager SHALL create an admin account and disable further registration
3. WHEN registration is disabled and a user attempts to access the registration page THEN PanelManager SHALL redirect the user to the login page
4. WHEN an admin logs in with valid credentials THEN PanelManager SHALL grant full system access

### Requirement 3

**User Story:** As an admin, I want to configure the Pterodactyl API connection, so that PanelManager can communicate with my Pterodactyl installation.

#### Acceptance Criteria

1. WHEN an admin accesses API settings THEN PanelManager SHALL display the current API key status with options to view, change, or toggle visibility
2. WHEN an admin enters a new API key THEN PanelManager SHALL validate the key against the Pterodactyl_API before saving
3. WHEN an admin saves a valid API key THEN PanelManager SHALL store the key securely and establish connection to Pterodactyl
4. WHEN auto-integration mode is enabled THEN PanelManager SHALL attempt to retrieve API credentials from the local Pterodactyl installation

### Requirement 4

**User Story:** As an admin, I want to create new game servers easily, so that I can provision servers without navigating complex Pterodactyl interfaces.

#### Acceptance Criteria

1. WHEN an admin initiates server creation THEN PanelManager SHALL display a simplified form with server name, game type, and resource allocation options
2. WHEN an admin submits server creation THEN PanelManager SHALL automatically allocate an available IP:port combination
3. WHEN server creation succeeds THEN PanelManager SHALL display the new server in the server list with its connection details
4. IF server creation fails due to resource constraints THEN PanelManager SHALL display a specific error message indicating the limitation

### Requirement 5

**User Story:** As an admin, I want to manage server resources, so that I can adjust RAM, CPU, and disk allocations as needed.

#### Acceptance Criteria

1. WHEN an admin views a server THEN PanelManager SHALL display current resource allocations including RAM, CPU percentage, and disk space
2. WHEN an admin modifies resource values THEN PanelManager SHALL validate the values against node capacity before applying
3. WHEN resource changes are applied THEN PanelManager SHALL update the server configuration through the Pterodactyl_API
4. WHEN an admin views resource usage THEN PanelManager SHALL display real-time statistics from the server

### Requirement 6

**User Story:** As an admin, I want an integrated server console, so that I can view output and send commands without leaving PanelManager.

#### Acceptance Criteria

1. WHEN an admin opens the console for a server THEN PanelManager SHALL display a real-time console output stream via WebSocket
2. WHEN an admin types a command in the console input THEN PanelManager SHALL send the command to the server through Pterodactyl_API
3. WHEN an admin clicks the Start button THEN PanelManager SHALL send a start signal to the server
4. WHEN an admin clicks the Stop button THEN PanelManager SHALL send a stop signal to the server
5. WHEN an admin clicks the Restart button THEN PanelManager SHALL send a restart signal to the server
6. WHEN console output is received THEN PanelManager SHALL display formatted output with timestamps and color coding

### Requirement 7

**User Story:** As an admin, I want automatic IP and port allocation management, so that I can create servers without manually tracking available allocations.

#### Acceptance Criteria

1. WHEN an admin creates a server THEN PanelManager SHALL query available allocations from the Pterodactyl_API
2. WHEN no allocations are available THEN PanelManager SHALL create a new allocation on the target node automatically
3. WHEN allocations are created THEN PanelManager SHALL use sequential port numbering within configured ranges
4. WHEN a server is deleted THEN PanelManager SHALL release the allocation for reuse

### Requirement 8

**User Story:** As an admin, I want an elegant dark-themed interface, so that the panel is visually appealing and easy to use.

#### Acceptance Criteria

1. WHEN a user loads PanelManager THEN the system SHALL display a dark-themed interface with consistent styling
2. WHEN displaying server information THEN PanelManager SHALL use clear visual hierarchy and readable typography
3. WHEN users interact with controls THEN PanelManager SHALL provide visual feedback through hover states and transitions
4. WHEN displaying data tables THEN PanelManager SHALL use alternating row colors and clear column headers

### Requirement 9

**User Story:** As an admin, I want to view and manage all servers in a dashboard, so that I can monitor my infrastructure at a glance.

#### Acceptance Criteria

1. WHEN an admin accesses the dashboard THEN PanelManager SHALL display a list of all servers with status indicators
2. WHEN viewing the server list THEN PanelManager SHALL show server name, game type, resource usage, and online status
3. WHEN an admin selects a server THEN PanelManager SHALL display detailed server information and management options
4. WHEN server status changes THEN PanelManager SHALL update the dashboard display within 30 seconds

### Requirement 10

**User Story:** As an admin, I want to store application data persistently, so that configurations and settings survive restarts.

#### Acceptance Criteria

1. WHEN PanelManager stores configuration data THEN the system SHALL persist data to a local SQLite database
2. WHEN PanelManager reads stored data THEN the system SHALL retrieve data from the SQLite database
3. WHEN serializing configuration objects THEN PanelManager SHALL encode data using JSON format
4. WHEN deserializing stored data THEN PanelManager SHALL decode JSON and reconstruct equivalent configuration objects

### Requirement 13

**User Story:** As an admin, I want a file manager for each server, so that I can upload, download, and delete server files easily.

#### Acceptance Criteria

1. WHEN an admin opens the file manager for a server THEN PanelManager SHALL display the server's file directory structure
2. WHEN an admin clicks on a folder THEN PanelManager SHALL navigate into that folder and display its contents
3. WHEN an admin uploads a file THEN PanelManager SHALL transfer the file to the server through Pterodactyl_API
4. WHEN an admin deletes a file or folder THEN PanelManager SHALL remove the item after confirmation
5. WHEN an admin downloads a file THEN PanelManager SHALL retrieve the file from the server and initiate browser download
6. WHEN an admin creates a new folder THEN PanelManager SHALL create the directory on the server

### Requirement 14

**User Story:** As an admin, I want to install plugins from Hangar, Modrinth, and SpigotMC, so that I can easily extend server functionality.

#### Acceptance Criteria

1. WHEN an admin opens the plugin installer THEN PanelManager SHALL display a search interface with source selection for Hangar_API, Modrinth_API, and SpigotMC_API
2. WHEN an admin searches for a plugin THEN PanelManager SHALL query the selected API and display matching results with name, description, and download count
3. WHEN an admin selects a plugin to install THEN PanelManager SHALL automatically detect the server's Minecraft version and select the compatible plugin version
4. WHEN installing a plugin THEN PanelManager SHALL download the plugin jar and upload it to the server's plugins folder
5. WHEN an admin views installed plugins THEN PanelManager SHALL display a list with options to update or delete each plugin
6. WHEN a plugin update is available THEN PanelManager SHALL indicate the update and allow one-click updating
7. WHEN an admin imports a plugin jar file THEN PanelManager SHALL upload the file directly to the plugins folder

### Requirement 15

**User Story:** As an admin, I want to install mods and modpacks, so that I can set up modded Minecraft servers easily.

#### Acceptance Criteria

1. WHEN an admin opens the mod installer THEN PanelManager SHALL display a search interface querying Modrinth_API for mods
2. WHEN an admin selects a mod to install THEN PanelManager SHALL detect the server's mod loader type and Minecraft version for compatibility
3. WHEN installing a mod THEN PanelManager SHALL download and upload the mod to the server's mods folder
4. WHEN an admin creates a new server with modpack option THEN PanelManager SHALL display available modpacks from Modrinth_API
5. WHEN an admin installs a modpack on a new server THEN PanelManager SHALL create the server and install all modpack files automatically
6. WHEN an admin installs a modpack on an existing server THEN PanelManager SHALL add modpack files to the existing server after confirmation

### Requirement 16

**User Story:** As an admin, I want to manage Pterodactyl eggs, so that I can use the correct server configurations for different game types.

#### Acceptance Criteria

1. WHEN an admin accesses egg management THEN PanelManager SHALL display all available eggs synced from Pterodactyl nests
2. WHEN an admin imports an egg THEN PanelManager SHALL upload the egg JSON to Pterodactyl through the API
3. WHEN an admin creates a Paper server THEN PanelManager SHALL use the Paper egg and fetch the latest jar from PaperMC_API
4. WHEN an admin creates a Purpur server THEN PanelManager SHALL use the Purpur egg and fetch the latest jar from PaperMC_API
5. WHEN eggs are updated in Pterodactyl THEN PanelManager SHALL sync the changes automatically

### Requirement 17

**User Story:** As an admin, I want smart version detection for plugins and mods, so that I always install compatible versions.

#### Acceptance Criteria

1. WHEN an admin installs a plugin THEN PanelManager SHALL read the server's Minecraft version from server properties or startup configuration
2. WHEN querying plugin APIs THEN PanelManager SHALL filter results to show only versions compatible with the server's Minecraft version
3. WHEN the server uses Paper egg THEN PanelManager SHALL search for Paper-compatible plugins
4. WHEN the server uses Purpur egg THEN PanelManager SHALL search for Purpur-compatible plugins with Paper fallback
5. WHEN no compatible version exists THEN PanelManager SHALL display a warning and suggest the closest available version

### Requirement 18

**User Story:** As an admin, I want to add extra allocations to a server, so that I can assign additional IP:port combinations when needed.

#### Acceptance Criteria

1. WHEN an admin views server allocations THEN PanelManager SHALL display all assigned IP:port combinations
2. WHEN an admin adds an allocation to a server THEN PanelManager SHALL assign an available allocation from the node
3. WHEN no allocations are available THEN PanelManager SHALL create a new allocation automatically
4. WHEN an admin removes an extra allocation THEN PanelManager SHALL unassign it from the server and release it for reuse
