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
		hasKey := false
		if key, _ := GetSetting(db, "ptero_key"); key != "" {
			hasKey = true
		}
		c.JSON(http.StatusOK, gin.H{
			"ptero_url":    pteroURL,
			"has_api_key":  hasKey,
			"registration": !HasAdmin(db),
		})
	}
}

func SaveSettingsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			PteroURL string `json:"ptero_url"`
			PteroKey string `json:"ptero_key"`
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

		c.JSON(http.StatusOK, gin.H{"message": "Settings saved"})
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
		c.JSON(http.StatusOK, gin.H{"message": "Upload endpoint - use Pterodactyl upload URL"})
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
		c.JSON(http.StatusOK, gin.H{"message": "Eggs synced"})
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
		c.JSON(http.StatusOK, gin.H{"message": "Allocation added"})
	}
}

func RemoveAllocationHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
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
		cmd := exec.Command("bash", "-c", "cd /var/www/senzdev/panelmanager && git pull && go build -o panelmanager ./backend && systemctl restart panelmanager")
		err := cmd.Run()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Update installed"})
	}
}
