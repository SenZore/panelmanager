package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	db := InitDB()
	defer db.Close()

	r := gin.Default()
	r.Use(CORSMiddleware())

	// Auth routes
	r.POST("/api/auth/register", RegisterHandler(db))
	r.POST("/api/auth/login", LoginHandler(db))

	// Protected routes
	api := r.Group("/api")
	api.Use(AuthMiddleware(db))
	{
		// Settings
		api.GET("/settings", GetSettingsHandler(db))
		api.POST("/settings", SaveSettingsHandler(db))

		// Pterodactyl proxy
		api.GET("/servers", GetServersHandler(db))
		api.POST("/servers", CreateServerHandler(db))
		api.GET("/servers/:id", GetServerHandler(db))
		api.DELETE("/servers/:id", DeleteServerHandler(db))
		api.POST("/servers/:id/power", PowerActionHandler(db))

		// Console WebSocket
		api.GET("/servers/:id/console", ConsoleWSHandler(db))

		// Files
		api.GET("/servers/:id/files", ListFilesHandler(db))
		api.POST("/servers/:id/files/upload", UploadFileHandler(db))
		api.DELETE("/servers/:id/files", DeleteFileHandler(db))
		api.GET("/servers/:id/files/download", DownloadFileHandler(db))

		// Plugins
		api.GET("/plugins/search", SearchPluginsHandler())
		api.POST("/servers/:id/plugins/install", InstallPluginHandler(db))
		api.GET("/servers/:id/plugins", ListInstalledPluginsHandler(db))
		api.DELETE("/servers/:id/plugins/:plugin", RemovePluginHandler(db))

		// Eggs
		api.GET("/eggs", GetEggsHandler(db))
		api.POST("/eggs/sync", SyncEggsHandler(db))
		api.POST("/eggs/import", ImportEggHandler(db))

		// Allocations
		api.GET("/servers/:id/allocations", GetAllocationsHandler(db))
		api.POST("/servers/:id/allocations", AddAllocationHandler(db))
		api.DELETE("/servers/:id/allocations/:alloc", RemoveAllocationHandler(db))

		// Updates
		api.GET("/updates/check", CheckUpdatesHandler())
		api.POST("/updates/install", InstallUpdateHandler())
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("PanelManager starting on :%s", port)
	r.Run(":" + port)
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
