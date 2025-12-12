package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PteroClient struct {
	BaseURL string
	APIKey  string
}

func NewPteroClient(db *sql.DB) (*PteroClient, error) {
	url, err := GetSetting(db, "ptero_url")
	if err != nil {
		return nil, fmt.Errorf("pterodactyl URL not configured")
	}
	key, err := GetSetting(db, "ptero_key")
	if err != nil {
		return nil, fmt.Errorf("pterodactyl API key not configured")
	}
	return &PteroClient{BaseURL: url, APIKey: key}, nil
}

func (p *PteroClient) Request(method, endpoint string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, p.BaseURL+endpoint, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

func GetServersHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		data, err := client.Request("GET", "/api/application/servers?include=allocations,egg", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		client, err := NewPteroClient(db)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get available allocation
		allocData, _ := client.Request("GET", fmt.Sprintf("/api/application/nodes/%d/allocations", req.NodeID), nil)
		var allocResult map[string]interface{}
		json.Unmarshal(allocData, &allocResult)

		// Find first unassigned allocation
		var allocationID int
		if data, ok := allocResult["data"].([]interface{}); ok {
			for _, a := range data {
				alloc := a.(map[string]interface{})["attributes"].(map[string]interface{})
				if alloc["assigned"].(bool) == false {
					allocationID = int(alloc["id"].(float64))
					break
				}
			}
		}

		if allocationID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No available allocations"})
			return
		}

		serverData := map[string]interface{}{
			"name":         req.Name,
			"user":         1,
			"egg":          req.EggID,
			"docker_image": "ghcr.io/pterodactyl/yolks:java_21",
			"startup":      "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar",
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusCreated, result)
	}
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
