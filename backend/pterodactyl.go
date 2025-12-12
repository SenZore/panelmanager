package main

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type PteroClient struct {
	BaseURL    string
	AppKey     string  // Application API key for admin operations
	ClientKey  string  // Client API key for user operations
	Debug      bool
}

type PteroError struct {
	Errors []struct {
		Code   string `json:"code"`
		Status string `json:"status"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

// PteroEnvConfig holds parsed Pterodactyl .env configuration
type PteroEnvConfig struct {
	AppURL     string
	DBHost     string
	DBPort     string
	DBDatabase string
	DBUsername string
	DBPassword string
}

func NewPteroClient(db *sql.DB) (*PteroClient, error) {
	url, err := GetSetting(db, "ptero_url")
	if err != nil || url == "" {
		return nil, fmt.Errorf("pterodactyl URL not configured")
	}
	
	// Application API key (for creating servers, managing users, etc.)
	appKey, _ := GetSetting(db, "ptero_key")
	
	// Client API key (for console, files, power, etc.)
	clientKey, _ := GetSetting(db, "ptero_client_key")
	
	// If no client key, try to use app key (some users might use it for both)
	if clientKey == "" && appKey != "" {
		clientKey = appKey
	}
	
	if appKey == "" && clientKey == "" {
		return nil, fmt.Errorf("no API key configured")
	}
	
	// Check debug mode
	debug, _ := GetSetting(db, "debug_mode")
	
	return &PteroClient{
		BaseURL:   strings.TrimSuffix(url, "/"),
		AppKey:    appKey,
		ClientKey: clientKey,
		Debug:     debug == "true",
	}, nil
}

func (p *PteroClient) doRequest(method, endpoint string, body interface{}, apiKey string) ([]byte, error) {
	var reqBody io.Reader
	var bodyBytes []byte
	
	if body != nil {
		bodyBytes, _ = json.Marshal(body)
		reqBody = bytes.NewBuffer(bodyBytes)
	}

	fullURL := p.BaseURL + endpoint
	
	if p.Debug {
		log.Printf("[DEBUG] %s %s", method, fullURL)
		if bodyBytes != nil {
			log.Printf("[DEBUG] Request Body: %s", string(bodyBytes))
		}
	}

	req, err := http.NewRequest(method, fullURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}
	
	if p.Debug {
		log.Printf("[DEBUG] Response Status: %d", resp.StatusCode)
		log.Printf("[DEBUG] Response Body: %s", string(respBody))
	}

	// Check for error responses
	if resp.StatusCode >= 400 {
		var pteroErr PteroError
		if json.Unmarshal(respBody, &pteroErr) == nil && len(pteroErr.Errors) > 0 {
			return nil, fmt.Errorf("pterodactyl error: %s", pteroErr.Errors[0].Detail)
		}
		return nil, fmt.Errorf("pterodactyl API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// AppRequest makes a request using the Application API key (for admin operations)
func (p *PteroClient) AppRequest(method, endpoint string, body interface{}) ([]byte, error) {
	if p.AppKey == "" {
		return nil, fmt.Errorf("application API key not configured (required for admin operations)")
	}
	return p.doRequest(method, endpoint, body, p.AppKey)
}

// ClientRequest makes a request using the Client API key (for user operations)
func (p *PteroClient) ClientRequest(method, endpoint string, body interface{}) ([]byte, error) {
	if p.ClientKey == "" {
		return nil, fmt.Errorf("client API key not configured (required for console/files/power)")
	}
	return p.doRequest(method, endpoint, body, p.ClientKey)
}

// Request auto-selects the API key based on endpoint (backwards compatibility)
func (p *PteroClient) Request(method, endpoint string, body interface{}) ([]byte, error) {
	// Client API endpoints
	if strings.Contains(endpoint, "/api/client/") {
		return p.ClientRequest(method, endpoint, body)
	}
	// Application API endpoints
	return p.AppRequest(method, endpoint, body)
}

// ReadPterodactylEnv reads and parses the Pterodactyl .env file
func ReadPterodactylEnv() (*PteroEnvConfig, error) {
	envPath := "/var/www/pterodactyl/.env"
	
	// Check if file exists
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("pterodactyl not found at /var/www/pterodactyl")
	}
	
	// Read .env file
	data, err := os.ReadFile(envPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read pterodactyl .env: %v", err)
	}
	
	config := &PteroEnvConfig{
		DBPort: "3306", // default
	}
	
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		
		key := strings.TrimSpace(parts[0])
		value := strings.Trim(strings.TrimSpace(parts[1]), "\"'")
		
		switch key {
		case "APP_URL":
			config.AppURL = value
		case "DB_HOST":
			config.DBHost = value
		case "DB_PORT":
			config.DBPort = value
		case "DB_DATABASE":
			config.DBDatabase = value
		case "DB_USERNAME":
			config.DBUsername = value
		case "DB_PASSWORD":
			config.DBPassword = value
		}
	}
	
	if config.AppURL == "" {
		return nil, fmt.Errorf("APP_URL not found in pterodactyl .env")
	}
	
	return config, nil
}

// DetectPterodactyl checks for local Pterodactyl installation (legacy)
func DetectPterodactyl() (string, string, error) {
	config, err := ReadPterodactylEnv()
	if err != nil {
		return "", "", err
	}
	return config.AppURL, "/var/www/pterodactyl/.env", nil
}

// generateAPIToken creates a random API token
func generateAPIToken(prefix string) string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return prefix + "_" + hex.EncodeToString(bytes)
}

// AutoIntegratePterodactyl connects to local Pterodactyl database and creates API keys
func AutoIntegratePterodactyl(localDB *sql.DB) (string, string, string, error) {
	config, err := ReadPterodactylEnv()
	if err != nil {
		return "", "", "", err
	}
	
	// Connect to Pterodactyl's MySQL database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		config.DBUsername,
		config.DBPassword,
		config.DBHost,
		config.DBPort,
		config.DBDatabase,
	)
	
	pteroDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to connect to pterodactyl database: %v", err)
	}
	defer pteroDB.Close()
	
	// Test connection
	if err := pteroDB.Ping(); err != nil {
		return "", "", "", fmt.Errorf("failed to ping pterodactyl database: %v", err)
	}
	
	// Get the first admin user
	var userID int
	err = pteroDB.QueryRow("SELECT id FROM users WHERE root_admin = 1 LIMIT 1").Scan(&userID)
	if err != nil {
		return "", "", "", fmt.Errorf("no admin user found in pterodactyl: %v", err)
	}
	
	// Generate API tokens (the part after the prefix is the secret)
	appTokenPlain := generateAPIToken("ptla")
	clientTokenPlain := generateAPIToken("ptlc")
	
	// Hash the tokens for database storage (Pterodactyl uses bcrypt)
	appTokenHash, err := bcrypt.GenerateFromPassword([]byte(appTokenPlain), bcrypt.DefaultCost)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to hash app token: %v", err)
	}
	clientTokenHash, err := bcrypt.GenerateFromPassword([]byte(clientTokenPlain), bcrypt.DefaultCost)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to hash client token: %v", err)
	}
	
	// Create Application API Key (key_type 1 = application)
	// identifier = first 16 chars, token = bcrypt hash
	_, err = pteroDB.Exec(`
		INSERT INTO api_keys (user_id, key_type, identifier, token, memo, allowed_ips, created_at, updated_at)
		VALUES (?, 1, ?, ?, 'PanelManager Auto-Generated', '[]', NOW(), NOW())
	`, userID, appTokenPlain[:16], string(appTokenHash))
	if err != nil {
		log.Printf("[WARN] Failed to create application API key: %v", err)
	}
	
	// Create Client API Key (key_type 0 = client)
	_, err = pteroDB.Exec(`
		INSERT INTO api_keys (user_id, key_type, identifier, token, memo, allowed_ips, created_at, updated_at)
		VALUES (?, 0, ?, ?, 'PanelManager Auto-Generated', '[]', NOW(), NOW())
	`, userID, clientTokenPlain[:16], string(clientTokenHash))
	if err != nil {
		log.Printf("[WARN] Failed to create client API key: %v", err)
	}
	
	// Save PLAIN tokens to local database (these are what we use for API calls)
	SetSetting(localDB, "ptero_url", config.AppURL)
	SetSetting(localDB, "ptero_key", appTokenPlain)
	SetSetting(localDB, "ptero_client_key", clientTokenPlain)
	SetSetting(localDB, "ptero_auto_integrated", "true")
	
	log.Printf("[INFO] Auto-integrated with Pterodactyl at %s", config.AppURL)
	
	return config.AppURL, appTokenPlain, clientTokenPlain, nil
}

// CheckAutoIntegration checks if we can auto-integrate on startup
func CheckAutoIntegration(db *sql.DB) {
	// Check if already configured
	if url, _ := GetSetting(db, "ptero_url"); url != "" {
		return
	}
	
	// Check if auto-integration is disabled
	if disabled, _ := GetSetting(db, "ptero_auto_integrate_disabled"); disabled == "true" {
		return
	}
	
	// Try to auto-integrate
	url, appKey, clientKey, err := AutoIntegratePterodactyl(db)
	if err != nil {
		log.Printf("[INFO] Auto-integration not available: %v", err)
		return
	}
	
	log.Printf("[SUCCESS] Auto-integrated with Pterodactyl!")
	log.Printf("  URL: %s", url)
	log.Printf("  App Key: %s...", appKey[:20])
	log.Printf("  Client Key: %s...", clientKey[:20])
}

// TestConnection tests if the Pterodactyl API is accessible
func TestPteroConnection(url, key string) (bool, string, error) {
	client := &PteroClient{
		BaseURL:   strings.TrimSuffix(url, "/"),
		AppKey:    key,
		ClientKey: key,
		Debug:     true,
	}
	
	// Try to get user info (works with both client and application keys)
	data, err := client.AppRequest("GET", "/api/application/users", nil)
	if err != nil {
		// Try client API
		data, err = client.ClientRequest("GET", "/api/client", nil)
		if err != nil {
			return false, "", err
		}
	}
	
	return true, string(data), nil
}

func GetServersHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "debug": "Failed to create Pterodactyl client"})
			return
		}

		data, err := client.Request("GET", "/api/application/servers?include=allocations,egg", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "debug": "Failed to fetch servers from Pterodactyl"})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

func GetServerHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/application/servers/"+id+"?include=allocations,egg", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

type CreateServerRequest struct {
	Name        string `json:"name"`
	EggID       int    `json:"egg_id"`
	NodeID      int    `json:"node_id"`
	Memory      int    `json:"memory"`
	Disk        int    `json:"disk"`
	CPU         int    `json:"cpu"`
	Databases   int    `json:"databases"`
	Allocations int    `json:"allocations"`
}

func CreateServerHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateServerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "debug": "Invalid request body"})
			return
		}

		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get available allocation or create one
		allocationID, err := getOrCreateAllocation(client, req.NodeID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "debug": "Failed to get/create allocation"})
			return
		}

		// Get egg info for startup command and docker image
		eggData, err := client.Request("GET", fmt.Sprintf("/api/application/nests/1/eggs/%d?include=variables", req.EggID), nil)
		if err != nil {
			// Use defaults if egg fetch fails
			log.Printf("[DEBUG] Failed to fetch egg: %v, using defaults", err)
		}
		
		dockerImage := "ghcr.io/pterodactyl/yolks:java_21"
		startup := "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar"
		
		if eggData != nil {
			var eggResult struct {
				Attributes struct {
					DockerImage string `json:"docker_image"`
					Startup     string `json:"startup"`
				} `json:"attributes"`
			}
			if json.Unmarshal(eggData, &eggResult) == nil {
				if eggResult.Attributes.DockerImage != "" {
					dockerImage = eggResult.Attributes.DockerImage
				}
				if eggResult.Attributes.Startup != "" {
					startup = eggResult.Attributes.Startup
				}
			}
		}

		serverData := map[string]interface{}{
			"name":         req.Name,
			"user":         1,
			"egg":          req.EggID,
			"docker_image": dockerImage,
			"startup":      startup,
			"environment": map[string]string{
				"SERVER_JARFILE": "server.jar",
				"BUILD_NUMBER":   "latest",
			},
			"limits": map[string]int{
				"memory": req.Memory,
				"swap":   0,
				"disk":   req.Disk,
				"io":     500,
				"cpu":    req.CPU,
			},
			"feature_limits": map[string]int{
				"databases":   req.Databases,
				"allocations": req.Allocations,
				"backups":     3,
			},
			"allocation": map[string]int{
				"default": allocationID,
			},
		}

		data, err := client.Request("POST", "/api/application/servers", serverData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "debug": "Failed to create server"})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusCreated, result)
	}
}

// getOrCreateAllocation finds an available allocation or creates one
func getOrCreateAllocation(client *PteroClient, nodeID int) (int, error) {
	// First, try to find an existing unassigned allocation
	allocData, err := client.Request("GET", fmt.Sprintf("/api/application/nodes/%d/allocations", nodeID), nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get allocations: %v", err)
	}
	
	var allocResult struct {
		Data []struct {
			Attributes struct {
				ID       int  `json:"id"`
				Port     int  `json:"port"`
				Assigned bool `json:"assigned"`
			} `json:"attributes"`
		} `json:"data"`
	}
	
	if err := json.Unmarshal(allocData, &allocResult); err != nil {
		return 0, fmt.Errorf("failed to parse allocations: %v", err)
	}
	
	// Find first unassigned allocation
	for _, a := range allocResult.Data {
		if !a.Attributes.Assigned {
			log.Printf("[DEBUG] Found available allocation: ID=%d Port=%d", a.Attributes.ID, a.Attributes.Port)
			return a.Attributes.ID, nil
		}
	}
	
	// No free allocation found, create one
	log.Printf("[DEBUG] No free allocations, creating new one...")
	
	// Get node info for IP
	nodeData, err := client.Request("GET", fmt.Sprintf("/api/application/nodes/%d", nodeID), nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get node info: %v", err)
	}
	
	var nodeResult struct {
		Attributes struct {
			FQDN string `json:"fqdn"`
		} `json:"attributes"`
	}
	json.Unmarshal(nodeData, &nodeResult)
	
	// Find the highest port in use and add 1
	nextPort := 25565
	for _, a := range allocResult.Data {
		if a.Attributes.Port >= nextPort {
			nextPort = a.Attributes.Port + 1
		}
	}
	
	// Create new allocation
	newAlloc := map[string]interface{}{
		"ip":    "0.0.0.0",
		"ports": []string{fmt.Sprintf("%d", nextPort)},
	}
	
	_, err = client.Request("POST", fmt.Sprintf("/api/application/nodes/%d/allocations", nodeID), newAlloc)
	if err != nil {
		return 0, fmt.Errorf("failed to create allocation: %v", err)
	}
	
	// Fetch allocations again to get the new one's ID
	allocData, err = client.Request("GET", fmt.Sprintf("/api/application/nodes/%d/allocations", nodeID), nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get updated allocations: %v", err)
	}
	
	json.Unmarshal(allocData, &allocResult)
	
	// Find the allocation we just created (should be unassigned with port = nextPort)
	for _, a := range allocResult.Data {
		if a.Attributes.Port == nextPort && !a.Attributes.Assigned {
			log.Printf("[DEBUG] Created new allocation: ID=%d Port=%d", a.Attributes.ID, a.Attributes.Port)
			return a.Attributes.ID, nil
		}
	}
	
	return 0, fmt.Errorf("failed to find newly created allocation")
}

func DeleteServerHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = client.Request("DELETE", "/api/application/servers/"+id, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Server deleted"})
	}
}

func PowerActionHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req struct {
			Signal string `json:"signal"`
		}
		c.ShouldBindJSON(&req)

		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = client.Request("POST", "/api/client/servers/"+id+"/power", map[string]string{"signal": req.Signal})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Power action sent"})
	}
}
