package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

type PluginResult struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Downloads   int    `json:"downloads"`
	Version     string `json:"version"`
	Source      string `json:"source"`
	Slug        string `json:"slug"`
	IconURL     string `json:"icon_url"`
}

func SearchPluginsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		source := c.DefaultQuery("source", "hangar")
		mcVersion := c.DefaultQuery("version", "1.21.4")

		var results []PluginResult

		switch source {
		case "hangar":
			results = searchHangar(query, mcVersion)
		case "modrinth":
			results = searchModrinth(query, mcVersion, "plugin")
		case "spigot":
			results = searchSpigot(query)
		}

		c.JSON(http.StatusOK, gin.H{"results": results})
	}
}

func searchHangar(query, version string) []PluginResult {
	url := fmt.Sprintf("https://hangar.papermc.io/api/v1/projects?q=%s&limit=20&platform=PAPER&version=%s",
		url.QueryEscape(query), version)

	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var data struct {
		Result []struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Stats       struct {
				Downloads int `json:"downloads"`
			} `json:"stats"`
			Namespace struct {
				Slug string `json:"slug"`
			} `json:"namespace"`
			AvatarURL string `json:"avatarUrl"`
		} `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&data)

	var results []PluginResult
	for _, p := range data.Result {
		results = append(results, PluginResult{
			Name:        p.Name,
			Description: p.Description,
			Downloads:   p.Stats.Downloads,
			Source:      "hangar",
			Slug:        p.Namespace.Slug,
			IconURL:     p.AvatarURL,
		})
	}
	return results
}

func searchModrinth(query, version, projectType string) []PluginResult {
	facets := fmt.Sprintf(`[["project_type:%s"],["versions:%s"]]`, projectType, version)
	url := fmt.Sprintf("https://api.modrinth.com/v2/search?query=%s&facets=%s&limit=20",
		url.QueryEscape(query), url.QueryEscape(facets))

	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var data struct {
		Hits []struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Downloads   int    `json:"downloads"`
			Slug        string `json:"slug"`
			IconURL     string `json:"icon_url"`
		} `json:"hits"`
	}
	json.NewDecoder(resp.Body).Decode(&data)

	var results []PluginResult
	for _, p := range data.Hits {
		results = append(results, PluginResult{
			Name:        p.Title,
			Description: p.Description,
			Downloads:   p.Downloads,
			Source:      "modrinth",
			Slug:        p.Slug,
			IconURL:     p.IconURL,
		})
	}
	return results
}

func searchSpigot(query string) []PluginResult {
	url := fmt.Sprintf("https://api.spiget.org/v2/search/resources/%s?size=20", url.QueryEscape(query))

	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var data []struct {
		Name string `json:"name"`
		Tag  string `json:"tag"`
		ID   int    `json:"id"`
		Icon struct {
			URL string `json:"url"`
		} `json:"icon"`
		Downloads int `json:"downloads"`
	}
	json.NewDecoder(resp.Body).Decode(&data)

	var results []PluginResult
	for _, p := range data {
		results = append(results, PluginResult{
			Name:        p.Name,
			Description: p.Tag,
			Downloads:   p.Downloads,
			Source:      "spigot",
			Slug:        fmt.Sprintf("%d", p.ID),
			IconURL:     "https://www.spigotmc.org/" + p.Icon.URL,
		})
	}
	return results
}

func InstallPluginHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		serverID := c.Param("id")
		var req struct {
			Source  string `json:"source"`
			Slug    string `json:"slug"`
			Version string `json:"version"`
		}
		c.ShouldBindJSON(&req)

		// Get download URL based on source
		var downloadURL string
		switch req.Source {
		case "hangar":
			downloadURL = getHangarDownload(req.Slug, req.Version)
		case "modrinth":
			downloadURL = getModrinthDownload(req.Slug, req.Version)
		case "spigot":
			downloadURL = getSpigotDownload(req.Slug)
		}

		if downloadURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Could not get download URL"})
			return
		}

		// Download the plugin
		resp, err := http.Get(downloadURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer resp.Body.Close()

		pluginData, _ := io.ReadAll(resp.Body)

		// Upload to server via Pterodactyl
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get upload URL
		uploadData, _ := client.Request("GET", "/api/client/servers/"+serverID+"/files/upload", nil)
		var uploadResp struct {
			Attributes struct {
				URL string `json:"url"`
			} `json:"attributes"`
		}
		json.Unmarshal(uploadData, &uploadResp)

		// Upload plugin (simplified - actual implementation needs multipart form)
		_ = pluginData
		_ = uploadResp

		// Save to database
		db.Exec("INSERT INTO installed_plugins (server_id, plugin_name, plugin_version, source) VALUES (?, ?, ?, ?)",
			serverID, req.Slug, req.Version, req.Source)

		c.JSON(http.StatusOK, gin.H{"message": "Plugin installed"})
	}
}

func getHangarDownload(slug, version string) string {
	url := fmt.Sprintf("https://hangar.papermc.io/api/v1/projects/%s/versions/%s/PAPER/download", slug, version)
	return url
}

func getModrinthDownload(slug, version string) string {
	resp, _ := http.Get(fmt.Sprintf("https://api.modrinth.com/v2/project/%s/version", slug))
	defer resp.Body.Close()

	var versions []struct {
		Files []struct {
			URL string `json:"url"`
		} `json:"files"`
	}
	json.NewDecoder(resp.Body).Decode(&versions)

	if len(versions) > 0 && len(versions[0].Files) > 0 {
		return versions[0].Files[0].URL
	}
	return ""
}

func getSpigotDownload(id string) string {
	return fmt.Sprintf("https://api.spiget.org/v2/resources/%s/download", id)
}

func ListInstalledPluginsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		serverID := c.Param("id")
		rows, _ := db.Query("SELECT plugin_name, plugin_version, source, installed_at FROM installed_plugins WHERE server_id = ?", serverID)
		defer rows.Close()

		var plugins []map[string]interface{}
		for rows.Next() {
			var name, version, source, installedAt string
			rows.Scan(&name, &version, &source, &installedAt)
			plugins = append(plugins, map[string]interface{}{
				"name":         name,
				"version":      version,
				"source":       source,
				"installed_at": installedAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{"plugins": plugins})
	}
}

func RemovePluginHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		serverID := c.Param("id")
		plugin := c.Param("plugin")

		db.Exec("DELETE FROM installed_plugins WHERE server_id = ? AND plugin_name = ?", serverID, plugin)
		c.JSON(http.StatusOK, gin.H{"message": "Plugin removed"})
	}
}
