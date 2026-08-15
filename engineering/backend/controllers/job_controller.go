package controllers

import (
	"errors"
	"fmt"
	"marketlens-go-backend/models"
	"marketlens-go-backend/repositories"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)



type JobController struct {
	repo *repositories.JobRepository
}

func NewJobController(repo *repositories.JobRepository) *JobController {
	return &JobController{repo: repo}
}

//This function returns the top hiring employers for a given occupation hierarchy
//level and id, filtered by date range.
func (ctrl *JobController) GetTopHiringEmployersByOccupationLevelHandler(c *gin.Context) {
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for occupation",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetTopHiringEmployersByOccupationLevel(level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top hiring employers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"employers": results,
	})
}

//This function returns all skills (paginated) for a given occupation hierarchy
//level and id, filtered by date range.
func (ctrl *JobController) GetAllSkillsByOccupationLevelHandler(c *gin.Context) {
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for occupation",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	results, total, err := ctrl.repo.GetAllSkillsByOccupationLevel(level, uint(id), fromDate, toDate, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve skills",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"total":     total,
		"limit":     limit,
		"offset":    offset,
		"skills":    results,
	})
}

//This function returns the top 15 skills for a given occupation hierarchy
//level and id, filtered by date range.
func (ctrl *JobController) GetTop15SkillsByOccupationLevelHandler(c *gin.Context) {
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for occupation",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetTop15SkillsByOccupationLevel(level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top 15 skills",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"skills":    results,
	})
}

//This function returns job type breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetJobTypeByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetJobTypeByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job type breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":  standard,
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"job_types": results,
	})
}

//This function returns remote vs on-site job counts for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetRemoteOnSiteByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	result, err := ctrl.repo.GetRemoteOnSiteByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve remote/on-site breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":  standard,
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"remote_vs_onsite": result,
	})
}

//This function returns vocational education breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetVocationalEducationByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetVocationalEducationByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve vocational education breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":               standard,
		"level":                  level,
		"id":                     id,
		"from_date":              fromDateStr,
		"to_date":                toDateStr,
		"count":                  len(results),
		"vocational_educations":  results,
	})
}

//This function returns gender breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetGenderByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetGenderByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve gender breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":  standard,
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"genders":   results,
	})
}

//This function returns formality breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetFormalityByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetFormalityByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve formality breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":     standard,
		"level":        level,
		"id":           id,
		"from_date":    fromDateStr,
		"to_date":      toDateStr,
		"count":        len(results),
		"formalities":  results,
	})
}

//This function returns education level breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetEducationLevelByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetEducationLevelByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve education level breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":          standard,
		"level":             level,
		"id":                id,
		"from_date":         fromDateStr,
		"to_date":           toDateStr,
		"count":             len(results),
		"education_levels":  results,
	})
}

//This function returns province breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetProvinceByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetProvinceByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve province breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":  standard,
		"level":     level,
		"id":        id,
		"from_date": fromDateStr,
		"to_date":   toDateStr,
		"count":     len(results),
		"provinces": results,
	})
}

//This function returns experience-level breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetExperienceByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetExperienceByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve experience breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":    standard,
		"level":       level,
		"id":          id,
		"from_date":   fromDateStr,
		"to_date":     toDateStr,
		"count":       len(results),
		"experiences": results,
	})
}

//This function returns employment sector breakdown for a given occupation/industry
//hierarchy level and id, filtered by date range.
func (ctrl *JobController) GetEmploymentSectorByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetEmploymentSectorByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve employment sector breakdown",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":           standard,
		"level":              level,
		"id":                 id,
		"from_date":          fromDateStr,
		"to_date":            toDateStr,
		"count":              len(results),
		"employment_sectors": results,
	})
}

// leafLevels marks the bottom of each hierarchy, which has no children to return
var leafLevels = map[string]bool{
	"occupation-group":  true,
	"industry-subclass": true,
}

//This function returns the immediate children of a given occupation/industry hierarchy
//level and id, each with its aggregated job count for a given date range.
func (ctrl *JobController) GetLevelChildrenHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	if leafLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("'%s' is a leaf level and has no children", level)})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, childLevel, err := ctrl.repo.GetLevelChildren(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve child level data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":    standard,
		"level":       level,
		"id":          id,
		"child_level": childLevel,
		"from_date":   fromDateStr,
		"to_date":     toDateStr,
		"count":       len(results),
		"children":    results,
	})
}

var validOccupationLevels = map[string]bool{
	"major-group":      true,
	"sub-major-group":  true,
	"minor-group":      true,
	"unit-group":       true,
	"occupation-group": true,
}

var validIndustryLevels = map[string]bool{
	"industry-sector":   true,
	"industry-division": true,
	"industry-group":    true,
	"industry-class":    true,
	"industry-subclass": true,
}

//This function returns the total job count for a given occupation/industry hierarchy level and id,
//filtered by an optional date range.
func (ctrl *JobController) GetTotalJobCountByLevelHandler(c *gin.Context) {
	standard := c.Param("standard")
	level := c.Param("level")
	idStr := c.Param("id")
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if standard != "occupation" && standard != "industry" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid standard, must be 'occupation' or 'industry'"})
		return
	}

	if standard == "occupation" && !validOccupationLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'occupation'",
			"valid_levels": []string{
				"major-group", "sub-major-group", "minor-group", "unit-group", "occupation-group",
			},
		})
		return
	}

	if standard == "industry" && !validIndustryLevels[level] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid level for standard 'industry'",
			"valid_levels": []string{
				"industry-sector", "industry-division", "industry-group", "industry-class", "industry-subclass",
			},
		})
		return
	}

	var id uint64
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter, must be a positive integer"})
		return
	}

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	total, err := ctrl.repo.GetTotalJobCountByLevel(standard, level, uint(id), fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve total job count",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"standard":        standard,
		"level":           level,
		"id":              id,
		"from_date":       fromDateStr,
		"to_date":         toDateStr,
		"total_job_count": total,
	})
}

//This function returns vacancy counts grouped by industry sector, for a given date range
func (ctrl *JobController) GetIndustryJobCountByDateRangeHandler(c *gin.Context) {
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetIndustryJobCountByDateRange(fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industry job counts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"from_date":  fromDateStr,
		"to_date":    toDateStr,
		"count":      len(results),
		"industries": results,
	})
}

//This function returns vacancy counts grouped by major group (occupation), for a given date range
func (ctrl *JobController) GetOccupationJobCountByDateRangeHandler(c *gin.Context) {
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	results, err := ctrl.repo.GetOccupationJobCountByDateRange(fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve occupation job counts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"from_date":   fromDateStr,
		"to_date":     toDateStr,
		"count":       len(results),
		"occupations": results,
	})
}

//This function returns the total number of vacancies posted within a given date range
func (ctrl *JobController) GetTotalVacancyCountHandler(c *gin.Context) {
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	total, err := ctrl.repo.GetTotalVacancyCount(fromDate, toDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve total vacancy count",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.TotalVacancyCount{
		FromDate:       fromDateStr,
		ToDate:         toDateStr,
		TotalVacancies: total,
	})
}

//This function returns vacancy counts over a date range with granularity that adapts
//to the range's length: 7-day set under 60 days, monthly otherwise
func (ctrl *JobController) GetVacancyTrendHandler(c *gin.Context) {
	fromDateStr := c.Query("from-date")
	toDateStr := c.Query("to-date")

	if fromDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from-date query parameter is required"})
		return
	}
	if toDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date query parameter is required"})
		return
	}

	const layout = "2006-01-02"

	fromDate, err := time.Parse(layout, fromDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid from-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	toDate, err := time.Parse(layout, toDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid to-date format, expected YYYY-MM-DD",
			"details": err.Error(),
		})
		return
	}

	if toDate.Before(fromDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to-date must not be before from-date"})
		return
	}

	diffDays := int(toDate.Sub(fromDate).Hours() / 24)

	var (
		results     []models.VacancyTrendPoint
		granularity string
		repoErr     error
	)

	if diffDays < 60 {
		granularity = "weekly"
		results, repoErr = ctrl.repo.GetVacancyTrendDaily(fromDate, toDate)
	} else {
		granularity = "monthly"
		results, repoErr = ctrl.repo.GetVacancyTrendMonthly(fromDate, toDate)
	}

	if repoErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve vacancy trend data",
			"details": repoErr.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"from_date":   fromDateStr,
		"to_date":     toDateStr,
		"granularity": granularity,
		"count":       len(results),
		"data":        results,
	})
}

func (ctrl *JobController) StartCrawlerRunHandler(c *gin.Context) {
	run, err := ctrl.repo.CreateCrawlerRun()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initialize new tracker session initialization block",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusCreated, run)
}

func (ctrl *JobController) CompleteCrawlerRunHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid crawler run ID parameter"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"` // 'COMPLETED' or 'FAILED'
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state status flag criteria"})
		return
	}

	if err := ctrl.repo.CompleteCrawlerRun(id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to execute closure metrics logic sequence",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Crawler run %d finalized with state: %s", id, req.Status)})
}

func (ctrl *JobController) GetJobsByBucketKeysHandler(c *gin.Context) {
	var req struct {
		BucketKeys []string `json:"bucket_keys" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request structure payload mapping",
			"details": err.Error(),
		})
		return
	}

	matchingJobs, err := ctrl.repo.GetJobsByBucketKeys(req.BucketKeys)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "LSH bucket radar execution sequence encountered a processing exception",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, matchingJobs)
}

func (ctrl *JobController) BatchSaveJobsHandler(c *gin.Context) {
	var payload models.BatchSavePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body structural mapping",
			"details": err.Error(),
		})
		return
	}

	if len(payload.NewJobs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "The new_jobs collection buffer cannot be empty"})
		return
	}

	err := ctrl.repo.BatchSaveNewJobs(payload.NewJobs, payload.LshIndexes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Bulk insertion transaction routine failed execution",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Successfully persisted unique job block chunk",
		"inserted_records": len(payload.NewJobs),
	})
}

func (ctrl *JobController) BatchUpdateDuplicatesHandler(c *gin.Context) {
	var payload models.BatchUpdatePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload configuration mapping",
			"details": err.Error(),
		})
		return
	}

	if len(payload.Duplicates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "The duplicates reference buffer cannot be empty"})
		return
	}

	err := ctrl.repo.BatchUpdateDuplicateJobs(payload.Duplicates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Bulk update checkpoint modifications failed execution",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Successfully refreshed duplicate job keep-alive markers",
		"refreshed_records": len(payload.Duplicates),
	})
}

func (ctrl *JobController) ReconcileStaleVacanciesHandler(c *gin.Context) {
	var payload models.ReconciliationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Missing active execution tracking sequence identifier criteria",
			"details": err.Error(),
		})
		return
	}

	closedCount, err := ctrl.repo.ReconcileStaleVacancies(payload.CrawlerRunID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Global snapshot reconciliation sweeping routine failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":               "System-wide stale vacancy cleanup sweep finalized",
		"reconciled_stale_jobs": closedCount,
	})
}


func (ctrl *JobController) DeleteJobHandler(c *gin.Context) {
	
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID format parameter"})
		return
	}

	id, err := ctrl.repo.DeleteJob(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to execute deletion on targeted job profile",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Job post with ID %d has been successfully deleted", id),
	})
}

func (ctrl *JobController) GetActiveJobsHandler(c *gin.Context) {

	// Helper to parse optional uint query params
	parseUintParam := func(key string) (*uint, error) {
		val := c.Query(key)
		if val == "" {
			return nil, nil
		}
		var parsed uint
		if _, err := fmt.Sscanf(val, "%d", &parsed); err != nil {
			return nil, fmt.Errorf("invalid value for query parameter '%s'", key)
		}
		return &parsed, nil
	}

	industryID, err := parseUintParam("industry_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	geoDataID, err := parseUintParam("geo_data_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	jobTypeID, err := parseUintParam("job_type_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	experienceID, err := parseUintParam("experience_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	limit := 20
	if val := c.Query("limit"); val != "" {
		if _, err := fmt.Sscanf(val, "%d", &limit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid value for query parameter 'limit'"})
			return
		}
	}

	offset := 0
	if val := c.Query("offset"); val != "" {
		if _, err := fmt.Sscanf(val, "%d", &offset); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid value for query parameter 'offset'"})
			return
		}
	}

	jobs, err := ctrl.repo.GetActiveJobs(industryID, geoDataID, jobTypeID, experienceID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve active job listings",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(jobs),
		"jobs":  jobs,
	})
}

func (ctrl *JobController) GetAllIndustriesHandler(c *gin.Context) {
	industries, err := ctrl.repo.GetAllIndustries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industries",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":      len(industries),
		"industries": industries,
	})
}

func (ctrl *JobController) GetAllExperiencesHandler(c *gin.Context) {
	experiences, err := ctrl.repo.GetAllExperiences()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve experience levels",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":       len(experiences),
		"experiences": experiences,
	})
}

func (ctrl *JobController) GetAllProvincesHandler(c *gin.Context) {
	provinces, err := ctrl.repo.GetAllProvinces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve provinces",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":     len(provinces),
		"provinces": provinces,
	})
}

func (ctrl *JobController) GetAllJobTypesHandler(c *gin.Context) {
	jobTypes, err := ctrl.repo.GetAllJobTypes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job types",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":     len(jobTypes),
		"job_types": jobTypes,
	})
}

func (ctrl *JobController) GetUniqueSkillsCountByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	count, err := ctrl.repo.GetUniqueSkillsCountByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve unique skills count",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id":         industryID,
		"unique_skills_count": count,
	})
}

func (ctrl *JobController) GetMostDemandingSkillByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	skill, err := ctrl.repo.GetMostDemandingSkillByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve most demanding skill",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id":       industryID,
		"most_in_demand_skill": skill,
	})
}

func (ctrl *JobController) GetTop15SkillsByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	skills, err := ctrl.repo.GetTop15SkillsByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top 15 skills",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"count":       len(skills),
		"skills":      skills,
	})
}

func (ctrl *JobController) GetAllSkillsByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	skills, err := ctrl.repo.GetAllSkillsByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve all skills",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"count":       len(skills),
		"skills":      skills,
	})
}

func (ctrl *JobController) GetTopHiringEmployersByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employers, err := ctrl.repo.GetTopHiringEmployersByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top hiring employers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"count":       len(employers),
		"employers":   employers,
	})
}

// parseIndustryID is a shared helper for all industry-scoped handlers
func parseIndustryID(c *gin.Context) (uint, error) {
	val := c.Query("industry_id")
	if val == "" {
		return 0, fmt.Errorf("industry_id query parameter is required")
	}
	var id uint
	if _, err := fmt.Sscanf(val, "%d", &id); err != nil {
		return 0, fmt.Errorf("invalid industry_id value")
	}
	return id, nil
}

func (ctrl *JobController) GetLastCrawledJobCountHandler(c *gin.Context) {
	count, err := ctrl.repo.GetLastCrawledJobCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve last crawled job count",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"last_crawl_job_count": count,
	})
}

func (ctrl *JobController) GetTimeSinceLastCrawlHandler(c *gin.Context) {
	gap, err := ctrl.repo.GetTimeSinceLastCrawl()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve last crawl time gap",
			"details": err.Error(),
		})
		return
	}

	if gap.LastCrawledAt == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "No completed crawler runs found",
		})
		return
	}

	c.JSON(http.StatusOK, gap)
}

func (ctrl *JobController) GetSourcesWithActiveJobCountHandler(c *gin.Context) {
	sources, err := ctrl.repo.GetSourcesWithActiveJobCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve sources with active job counts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(sources),
		"sources": sources,
	})
}

func (ctrl *JobController) GetAllCrawlerRunsHandler(c *gin.Context) {
	runs, err := ctrl.repo.GetAllCrawlerRuns()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve crawler runs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(runs),
		"runs":  runs,
	})
}

func (ctrl *JobController) GetActiveJobCountWithTrendHandler(c *gin.Context) {
	result, err := ctrl.repo.GetActiveJobCountWithTrend()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve active job count with trend",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (ctrl *JobController) GetActiveJobCountByOccupationHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByOccupation()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by occupation",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":       len(results),
		"occupations": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByIndustryHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByIndustry()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by industry",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":      len(results),
		"industries": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByExperienceHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByExperience()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by experience",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":       len(results),
		"experiences": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByEducationLevelHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByEducationLevel()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by education level",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":            len(results),
		"education_levels": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByFormalityHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByFormality()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by formality",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":       len(results),
		"formalities": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByEmploymentSectorHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByEmploymentSector()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by employment sector",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":              len(results),
		"employment_sectors": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByGenderHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByGender()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by gender",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":   len(results),
		"genders": results,
	})
}

func (ctrl *JobController) GetActiveJobCountByVocationalEducationHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByVocationalEducation()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by vocational education",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":                  len(results),
		"vocational_educations": results,
	})
}

func (ctrl *JobController) GetRemoteVsOnSiteCountHandler(c *gin.Context) {
	result, err := ctrl.repo.GetRemoteVsOnSiteCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve remote vs on-site counts",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (ctrl *JobController) GetActiveJobCountByJobTypeHandler(c *gin.Context) {
	results, err := ctrl.repo.GetActiveJobCountByJobType()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by job type",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"count":     len(results),
		"job_types": results,
	})
}

func parseOccupationID(c *gin.Context) (uint, error) {
	val := c.Query("occupation_id")
	if val == "" {
		return 0, fmt.Errorf("occupation_id query parameter is required")
	}
	var id uint
	if _, err := fmt.Sscanf(val, "%d", &id); err != nil {
		return 0, fmt.Errorf("invalid occupation_id value")
	}
	return id, nil
}

func (ctrl *JobController) GetYearlyJobTrendByOccupationHandler(c *gin.Context) {
	occupationID, err := parseOccupationID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetYearlyJobTrendByOccupation(occupationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve yearly job trend by occupation",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"occupation_id": occupationID,
		"count":         len(results),
		"yearly_trend":  results,
	})
}

func (ctrl *JobController) GetJobCountByFormalityForOccupationAndYearHandler(c *gin.Context) {
	occupationID, year, err := parseOccupationAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetJobCountByFormalityForOccupationAndYear(occupationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by formality",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"major_group_id": occupationID,
		"year":            year,
		"count":           len(results),
		"formalities":     results,
	})
}

func (ctrl *JobController) GetJobCountByGenderForOccupationAndYearHandler(c *gin.Context) {
	occupationID, year, err := parseOccupationAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetJobCountByGenderForOccupationAndYear(occupationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by gender",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"major_group_id": occupationID,
		"year":           year,
		"count":          len(results),
		"genders":        results,
	})
}

func (ctrl *JobController) GetTop3JobRolesByOccupationAndYearHandler(c *gin.Context) {
	occupationID, year, err := parseOccupationAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetTop3JobRolesByOccupationAndYear(occupationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top 3 job roles by occupation",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"occupation_id": occupationID,
		"top_job_roles": results,
	})
}

// Check industry and year
func parseOccupationAndYear(c *gin.Context) (uint, int, error) {
	occupationID, err := parseOccupationID(c)
	if err != nil {
		return 0, 0, err
	}

	yearStr := c.Query("year")
	if yearStr == "" {
		return 0, 0, fmt.Errorf("year query parameter is required")
	}
	var year int
	if _, err := fmt.Sscanf(yearStr, "%d", &year); err != nil {
		return 0, 0, fmt.Errorf("invalid year value")
	}

	return occupationID, year, nil
}

// parseIndustryAndYear is a shared helper for industry + year scoped handlers
func parseIndustryAndYear(c *gin.Context) (uint, int, error) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		return 0, 0, err
	}

	yearStr := c.Query("year")
	if yearStr == "" {
		return 0, 0, fmt.Errorf("year query parameter is required")
	}
	var year int
	if _, err := fmt.Sscanf(yearStr, "%d", &year); err != nil {
		return 0, 0, fmt.Errorf("invalid year value")
	}

	return industryID, year, nil
}

func (ctrl *JobController) GetYearlyJobTrendByIndustryHandler(c *gin.Context) {
	industryID, err := parseIndustryID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetYearlyJobTrendByIndustry(industryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve yearly job trend by industry",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id":  industryID,
		"count":        len(results),
		"yearly_trend": results,
	})
}

func (ctrl *JobController) GetJobCountByExperienceForIndustryAndYearHandler(c *gin.Context) {
	industryID, year, err := parseIndustryAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetJobCountByExperienceForIndustryAndYear(industryID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by experience",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"year":        year,
		"count":       len(results),
		"experiences": results,
	})
}

func (ctrl *JobController) GetProvinceWiseJobCountForIndustryAndYearHandler(c *gin.Context) {
	industryID, year, err := parseIndustryAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetProvinceWiseJobCountForIndustryAndYear(industryID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve province wise job counts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"year":        year,
		"count":       len(results),
		"provinces":   results,
	})
}

func (ctrl *JobController) GetJobCountByEducationLevelForIndustryAndYearHandler(c *gin.Context) {
	industryID, year, err := parseIndustryAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetJobCountByEducationLevelForIndustryAndYear(industryID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by education level",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id":      industryID,
		"year":             year,
		"count":            len(results),
		"education_levels": results,
	})
}

func (ctrl *JobController) GetJobCountByVocationalEducationForIndustryAndYearHandler(c *gin.Context) {
	industryID, year, err := parseIndustryAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetJobCountByVocationalEducationForIndustryAndYear(industryID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve job counts by vocational education",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id":            industryID,
		"year":                   year,
		"count":                  len(results),
		"vocational_educations": results,
	})
}

func (ctrl *JobController) GetTopHiringEmployersForIndustryAndYearHandler(c *gin.Context) {
	industryID, year, err := parseIndustryAndYear(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetTopHiringEmployersForIndustryAndYear(industryID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve top hiring employers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_id": industryID,
		"year":        year,
		"count":       len(results),
		"employers":   results,
	})
}

// EMployment sector analytics
func parseEmploymentSectorID(c *gin.Context) (uint, error) {
	val := c.Query("employment_sector_id")
	if val == "" {
		return 0, fmt.Errorf("employment_sector_id query parameter is required")
	}
	var id uint
	if _, err := fmt.Sscanf(val, "%d", &id); err != nil {
		return 0, fmt.Errorf("invalid employment_sector_id value")
	}
	return id, nil
}

func (ctrl *JobController) GetYearlyTrendByEmploymentSectorHandler(c *gin.Context) {
	employmentSectorID, err := parseEmploymentSectorID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := ctrl.repo.GetYearlyTrendByEmploymentSector(employmentSectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve yearly trend by employment sector",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"employment_sector_id": employmentSectorID,
		"count":                len(results),
		"yearly_trend":         results,
	})
}

// Methods need to multi level filtering in the Crawler
// Occupation levels by parent ids
func (ctrl *JobController) GetSubMajorGroupsByMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major group id parameter"})
		return
	}

	items, err := ctrl.repo.GetSubMajorGroupsByMajorGroup(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve sub major groups",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"major_group_id":   id,
		"count":            len(items),
		"sub_major_groups": items,
	})
}

func (ctrl *JobController) GetMinorGroupsBySubMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sub major group id parameter"})
		return
	}

	items, err := ctrl.repo.GetMinorGroupsBySubMajorGroup(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve minor groups",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sub_major_group_id": id,
		"count":              len(items),
		"minor_groups":       items,
	})
}

func (ctrl *JobController) GetUnitGroupsByMinorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid minor group id parameter"})
		return
	}

	items, err := ctrl.repo.GetUnitGroupsByMinorGroup(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve unit groups",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"minor_group_id": id,
		"count":          len(items),
		"unit_groups":    items,
	})
}

func (ctrl *JobController) GetOccupationGroupsByUnitGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit group id parameter"})
		return
	}

	items, err := ctrl.repo.GetOccupationGroupsByUnitGroup(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve occupation groups",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"unit_group_id":     id,
		"count":             len(items),
		"occupation_groups": items,
	})
}

// Industry levels by parent ids
func (ctrl *JobController) GetIndustryDivisionsByIndustrySectorHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid industry sector id parameter"})
		return
	}

	items, err := ctrl.repo.GetIndustryDivisionsByIndustrySector(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industry divisions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_sector_id": id,
		"count":              len(items),
		"industry_divisions": items,
	})
}

func (ctrl *JobController) GetIndustryGroupsByIndustryDivisionHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid industry division id parameter"})
		return
	}

	items, err := ctrl.repo.GetIndustryGroupsByIndustryDivision(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industry groups",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_division_id": id,
		"count":                len(items),
		"industry_groups":      items,
	})
}

func (ctrl *JobController) GetIndustryClassesByIndustryGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid industry group id parameter"})
		return
	}

	items, err := ctrl.repo.GetIndustryClassesByIndustryGroup(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industry classes",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_group_id": id,
		"count":             len(items),
		"industry_classes":  items,
	})
}

func (ctrl *JobController) GetIndustrySubclassesByIndustryClassHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid industry class id parameter"})
		return
	}

	items, err := ctrl.repo.GetIndustrySubclassesByIndustryClass(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve industry subclasses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"industry_class_id":   id,
		"count":               len(items),
		"industry_subclasses": items,
	})
}

// CRUD Controllers for DB entities
// Geo Data CRUD
func (ctrl *JobController) CreateGeoDataHandler(c *gin.Context) {
	var item models.GeoData
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid request payload", "details":err.Error})
		return
	}
	if err := ctrl.repo.CreateGeoData(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to create geo data", "details":err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (ctrl *JobController) GetAllGeoDataHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllGeoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to fetch geo data", "details":err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count":len(items), "geo_data":items})
}

func (ctrl *JobController) GetGeoDataByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetGeoDataByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Geo data not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch geo data", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (ctrl *JobController) UpdateGeoDataHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateGeoData(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update geo data", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (ctrl *JobController) DeleteGeoDataHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteGeoData(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete geo data", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Geo data deleted successfully"})
}

// Education level CRUD
func (ctrl *JobController) CreateEducationLevelHandler(c *gin.Context) {
	var item models.EducationLevel
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateEducationLevel(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create education level", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllEducationLevelsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllEducationLevels()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch education levels", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "education_levels": items})
}
 
func (ctrl *JobController) GetEducationLevelByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetEducationLevelByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Education level not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch education level", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateEducationLevelHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateEducationLevel(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update education level", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteEducationLevelHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteEducationLevel(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete education level", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Education level deleted successfully"})
}

// Formality CRUD
func (ctrl *JobController) CreateFormalityHandler(c *gin.Context) {
	var item models.Formality
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateFormality(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create formality", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllFormalitiesHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllFormalities()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch formalities", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "formalities": items})
}
 
func (ctrl *JobController) GetFormalityByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetFormalityByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Formality not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch formality", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateFormalityHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateFormality(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update formality", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteFormalityHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteFormality(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete formality", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Formality deleted successfully"})
}

// Gender CRUD
func (ctrl *JobController) CreateGenderHandler(c *gin.Context) {
	var item models.Gender
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateGender(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create gender", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllGendersHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllGenders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch genders", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "genders": items})
}
 
func (ctrl *JobController) GetGenderByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetGenderByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Gender not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch gender", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateGenderHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateGender(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update gender", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteGenderHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteGender(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete gender", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Gender deleted successfully"})
}

// Employment Sector CRUD
func (ctrl *JobController) CreateEmploymentSectorHandler(c *gin.Context) {
	var item models.EmploymentSector
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateEmploymentSector(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create employment sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllEmploymentSectorsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllEmploymentSectors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employment sectors", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "employment_sectors": items})
}
 
func (ctrl *JobController) GetEmploymentSectorByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetEmploymentSectorByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employment sector not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employment sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateEmploymentSectorHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateEmploymentSector(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update employment sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteEmploymentSectorHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteEmploymentSector(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete employment sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Employment sector deleted successfully"})
}

// Vocational Education CRUD
func (ctrl *JobController) CreateVocationalEducationHandler(c *gin.Context) {
	var item models.VocationalEducation
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateVocationalEducation(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vocational education", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllVocationalEducationsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllVocationalEducations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vocational education levels", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "vocational_educations": items})
}
 
func (ctrl *JobController) GetVocationalEducationByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetVocationalEducationByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vocational education not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vocational education", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateVocationalEducationHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateVocationalEducation(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update vocational education", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteVocationalEducationHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteVocationalEducation(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vocational education", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vocational education deleted successfully"})
}

// Experience CRUD
func (ctrl *JobController) CreateExperienceHandler(c *gin.Context) {
	var item models.Experience
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateExperience(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create experience", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetExperienceByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetExperienceByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch experience", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateExperienceHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateExperience(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update experience", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteExperienceHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteExperience(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete experience", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Experience deleted successfully"})
}

// Occupations CRUDS
//Major Group CRUD
func (ctrl *JobController) CreateMajorGroupHandler(c *gin.Context) {
	var item models.MajorGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateMajorGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllMajorGroupsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllMajorGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch major groups", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "major_groups": items})
}
 
func (ctrl *JobController) GetMajorGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetMajorGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Major group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateMajorGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteMajorGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Major group deleted successfully"})
}

// Sub Major Group CRUD
func (ctrl *JobController) CreateSubMajorGroupHandler(c *gin.Context) {
	var item models.SubMajorGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateSubMajorGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sub major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllSubMajorGroupsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllSubMajorGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sub major groups", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "sub_major_groups": items})
}
 
func (ctrl *JobController) GetSubMajorGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetSubMajorGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sub major group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sub major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateSubMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateSubMajorGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update sub major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteSubMajorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteSubMajorGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sub major group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Sub major group deleted successfully"})
}

// Minor Group CRUD
func (ctrl *JobController) CreateMinorGroupHandler(c *gin.Context) {
	var item models.MinorGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateMinorGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create minor group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllMinorGroupsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllMinorGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch minor groups", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "minor_groups": items})
}
 
func (ctrl *JobController) GetMinorGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetMinorGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Minor group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch minor group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateMinorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateMinorGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update minor group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteMinorGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteMinorGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete minor group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Minor group deleted successfully"})
}

// Unit Group CRUD
func (ctrl *JobController) CreateUnitGroupHandler(c *gin.Context) {
	var item models.UnitGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateUnitGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create unit group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllUnitGroupsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllUnitGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch unit groups", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "unit_groups": items})
}
 
func (ctrl *JobController) GetUnitGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetUnitGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Unit group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch unit group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateUnitGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateUnitGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update unit group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteUnitGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteUnitGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete unit group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Unit group deleted successfully"})
}

// Occupation Group CRUD
func (ctrl *JobController) CreateOccupationGroupHandler(c *gin.Context) {
	var item models.OccupationGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateOccupationGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create occupation group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllOccupationGroupsHandler(c *gin.Context) {
	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	items, total, err := ctrl.repo.GetAllOccupationGroups(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch industry subclasses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":               len(items),
		"total":               total,
		"limit":               limit,
		"offset":              offset,
		"occupation_groups":   items,
	})
}
 
func (ctrl *JobController) GetOccupationGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetOccupationGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Occupation group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch occupation group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateOccupationGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateOccupationGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update occupation group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteOccupationGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteOccupationGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete occupation group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Occupation group deleted successfully"})
}

// Industry Sectors CRUDS
// Industry Sctor CRUD
func (ctrl *JobController) CreateIndustrySectorHandler(c *gin.Context) {
	var item models.IndustrySector
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateIndustrySector(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create industry sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllIndustrySectorsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllIndustrySectors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry sectors", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "industry_sectors": items})
}
 
func (ctrl *JobController) GetIndustrySectorByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetIndustrySectorByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Industry sector not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateIndustrySectorHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateIndustrySector(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update industry sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteIndustrySectorHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteIndustrySector(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete industry sector", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Industry sector deleted successfully"})
}

// Industry Division CRUD
func (ctrl *JobController) CreateIndustryDivisionHandler(c *gin.Context) {
	var item models.IndustryDivision
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateIndustryDivision(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create industry division", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllIndustryDivisionsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllIndustryDivisions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry divisions", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "industry_divisions": items})
}
 
func (ctrl *JobController) GetIndustryDivisionByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetIndustryDivisionByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Industry division not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry division", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateIndustryDivisionHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateIndustryDivision(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update industry division", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteIndustryDivisionHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteIndustryDivision(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete industry division", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Industry division deleted successfully"})
}

// Industry Group CRUD
func (ctrl *JobController) CreateIndustryGroupHandler(c *gin.Context) {
	var item models.IndustryGroup
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateIndustryGroup(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create industry group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllIndustryGroupsHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllIndustryGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry groups", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "industry_groups": items})
}
 
func (ctrl *JobController) GetIndustryGroupByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetIndustryGroupByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Industry group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateIndustryGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateIndustryGroup(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update industry group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteIndustryGroupHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteIndustryGroup(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete industry group", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Industry group deleted successfully"})
}

// Industry Class CRUD
func (ctrl *JobController) CreateIndustryClassHandler(c *gin.Context) {
	var item models.IndustryClass
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateIndustryClass(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create industry class", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}
 
func (ctrl *JobController) GetAllIndustryClassesHandler(c *gin.Context) {
	items, err := ctrl.repo.GetAllIndustryClasses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry classes", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(items), "industry_classes": items})
}
 
func (ctrl *JobController) GetIndustryClassByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetIndustryClassByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Industry class not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry class", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateIndustryClassHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateIndustryClass(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update industry class", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteIndustryClassHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteIndustryClass(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete industry class", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Industry class deleted successfully"})
}

// Industry Sub Class CRUD
func (ctrl *JobController) CreateIndustrySubclassHandler(c *gin.Context) {
	var item models.IndustrySubclass
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	if err := ctrl.repo.CreateIndustrySubclass(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create industry subclass", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (ctrl *JobController) GetAllIndustrySubclassesHandler(c *gin.Context) {
	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	items, total, err := ctrl.repo.GetAllIndustrySubclasses(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch industry subclasses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":               len(items),
		"total":               total,
		"limit":               limit,
		"offset":              offset,
		"industry_subclasses": items,
	})
}
 
func (ctrl *JobController) GetIndustrySubclassByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	item, err := ctrl.repo.GetIndustrySubclassByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Industry subclass not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch industry subclass", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) UpdateIndustrySubclassHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}
	item, err := ctrl.repo.UpdateIndustrySubclass(id, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update industry subclass", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}
 
func (ctrl *JobController) DeleteIndustrySubclassHandler(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id parameter"})
		return
	}
	if err := ctrl.repo.DeleteIndustrySubclass(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete industry subclass", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Industry subclass deleted successfully"})
}