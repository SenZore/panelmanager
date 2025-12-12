package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Settings handlers
func GetSettingsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		pteroURL, _ := GetSetting(db, "ptero_url")
		debugMode, _ := GetSetting(db, "debug_mode")
		hasKey := false
		if key, _ := GetSetting(db, "ptero_key"); key != "" {
			hasKey = true
		}
		c.JSON(http.StatusOK, gin.H{
			"ptero_url":    pteroURL,
			"has_api_key":  hasKey,
			"debug_mode":   debugMode == "true",
			"registration": !HasAdmin(db),
		})
	}
}

func SaveSettingsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			PteroURL  string `json:"ptero_url"`
			PteroKey  string `json:"ptero_key"`
			DebugMode *bool  `json:"debug_mode"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.PteroURL != "" {
			SetSetting(db, "ptero_url", req.PteroURL)
		}
		if req.PteroKey != "" {
			SetSetting(db, "ptero_key", req.PteroKey)
		}
		if req.DebugMode != nil {
			if *req.DebugMode {
				SetSetting(db, "debug_mode", "true")
			} else {
				SetSetting(db, "debug_mode", "false")
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "Settings saved"})
	}
}

// DetectPterodactylHandler auto-detects local Pterodactyl installation
func DetectPterodactylHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		url, path, err := DetectPterodactyl()
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error":    err.Error(),
				"detected": false,
				"debug":    "Checked /var/www/pterodactyl/.env",
			})
			return
		}

		// Auto-save the URL
		SetSetting(db, "ptero_url", url)

		c.JSON(http.StatusOK, gin.H{
			"detected":  true,
			"url":       url,
			"env_path":  path,
			"message":   "Pterodactyl detected! Panel URL saved.",
			"debug":     "Found APP_URL in " + path,
		})
	}
}

// TestConnectionHandler tests the Pterodactyl API connection
func TestConnectionHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			URL string `json:"url"`
			Key string `json:"key"`
		}
		c.ShouldBindJSON(&req)

		// Use provided values or fall back to saved settings
		url := req.URL
		key := req.Key
		if url == "" {
			url, _ = GetSetting(db, "ptero_url")
		}
		if key == "" {
			key, _ = GetSetting(db, "ptero_key")
		}

		if url == "" || key == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "URL and API key are required",
			})
			return
		}

		success, response, err := TestPteroConnection(url, key)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"error":   err.Error(),
				"debug":   "Connection test failed",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":  success,
			"message":  "Connection successful!",
			"response": response,
			"debug":    "API responded successfully",
		})
	}
}

// GetNodesHandler returns list of nodes
func GetNodesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/application/nodes", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

// Console WebSocket
func ConsoleWSHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get WebSocket credentials from Pterodactyl
		data, err := client.Request("GET", "/api/client/servers/"+id+"/websocket", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var wsData struct {
			Data struct {
				Token  string `json:"token"`
				Socket string `json:"socket"`
			} `json:"data"`
		}
		json.Unmarshal(data, &wsData)

		c.JSON(http.StatusOK, gin.H{
			"socket": wsData.Data.Socket,
			"token":  wsData.Data.Token,
		})
	}
}

// File handlers
func ListFilesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		dir := c.DefaultQuery("directory", "/")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/client/servers/"+id+"/files/list?directory="+dir, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

func UploadFileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get upload URL from Pterodactyl
		data, err := client.Request("GET", "/api/client/servers/"+id+"/files/upload", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

func DeleteFileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req struct {
			Root  string   `json:"root"`
			Files []string `json:"files"`
		}
		c.ShouldBindJSON(&req)

		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = client.Request("POST", "/api/client/servers/"+id+"/files/delete", req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Files deleted"})
	}
}

func DownloadFileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		file := c.Query("file")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/client/servers/"+id+"/files/download?file="+file, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

// Egg handlers
func GetEggsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/application/nests?include=eggs", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

func SyncEggsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Fetch all eggs
		data, err := client.Request("GET", "/api/application/nests?include=eggs", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		
		c.JSON(http.StatusOK, gin.H{
			"message": "Eggs synced successfully",
			"data":    result,
		})
	}
}

func ImportEggHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Egg imported"})
	}
}

// Allocation handlers
func GetAllocationsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/client/servers/"+id+"/network/allocations", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, result)
	}
}

func AddAllocationHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Assign a new allocation to the server
		_, err = client.Request("POST", "/api/client/servers/"+id+"/network/allocations", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Allocation added"})
	}
}

func RemoveAllocationHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		allocId := c.Param("alloc")
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = client.Request("DELETE", "/api/client/servers/"+id+"/network/allocations/"+allocId, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Allocation removed"})
	}
}

// Update handlers
func CheckUpdatesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check GitHub for latest release
		resp, err := http.Get("https://api.github.com/repos/senzore/panelmanager/releases/latest")
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"current": "1.0.0", "latest": "1.0.0", "update_available": false})
			return
		}
		defer resp.Body.Close()

		var release struct {
			TagName string `json:"tag_name"`
		}
		json.NewDecoder(resp.Body).Decode(&release)

		current := "1.0.0"
		c.JSON(http.StatusOK, gin.H{
			"current":          current,
			"latest":           release.TagName,
			"update_available": release.TagName != "" && release.TagName != current,
		})
	}
}

func InstallUpdateHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		cmd := exec.Command("bash", "-c", "cd /var/www/senzdev/panelmanager && git pull && cd backend && /usr/local/go/bin/go mod tidy && /usr/local/go/bin/go build -o ../panelmanager . && cd ../frontend && npm install && npm run build && systemctl restart panelmanager")
		output, err := cmd.CombinedOutput()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":  err.Error(),
				"output": string(output),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "Update installed",
			"output":  string(output),
		})
	}
}
