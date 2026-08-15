package main

import (
	"marketlens-go-backend/config"
	"marketlens-go-backend/controllers"
	"marketlens-go-backend/repositories"
	mcpserver "marketlens-go-backend/mcp"

	"github.com/gin-gonic/gin"
	"log"
)


func main() { 
	
	config.ConnectDatabase()

	r := gin.Default()

	jobRepo := repositories.NewJobRepository(config.DB)
	jobCtrl := controllers.NewJobController(jobRepo)

	mcpServer := mcpserver.New(jobRepo)
    go func() {
        log.Println("MCP server listening on :9090/mcp")
        if err := mcpserver.StartHTTP(mcpServer, ":9090"); err != nil {
            log.Fatalf("MCP server failed: %v", err)
        }
    }()

	v1 := r.Group("/api/v1")
	{
		// Dashboard endpoints
		v1.GET("/vacancy-trend", jobCtrl.GetVacancyTrendHandler)
		v1.GET("/vacancy-total", jobCtrl.GetTotalVacancyCountHandler)
		v1.GET("/occupations/by-date-range", jobCtrl.GetOccupationJobCountByDateRangeHandler)
		v1.GET("/industries/by-date-range", jobCtrl.GetIndustryJobCountByDateRangeHandler)
		v1.GET("/:standard/:level/:id/total-job-count", jobCtrl.GetTotalJobCountByLevelHandler)
		v1.GET("/:standard/:level/:id/children", jobCtrl.GetLevelChildrenHandler)
		v1.GET("/:standard/:level/:id/employment-sector", jobCtrl.GetEmploymentSectorByLevelHandler)
		v1.GET("/:standard/:level/:id/experience", jobCtrl.GetExperienceByLevelHandler)
		v1.GET("/:standard/:level/:id/province", jobCtrl.GetProvinceByLevelHandler)
		v1.GET("/:standard/:level/:id/education", jobCtrl.GetEducationLevelByLevelHandler)
		v1.GET("/:standard/:level/:id/formality", jobCtrl.GetFormalityByLevelHandler)
		v1.GET("/:standard/:level/:id/gender", jobCtrl.GetGenderByLevelHandler)
		v1.GET("/:standard/:level/:id/vocational-education", jobCtrl.GetVocationalEducationByLevelHandler)
		v1.GET("/:standard/:level/:id/remote-onsite", jobCtrl.GetRemoteOnSiteByLevelHandler)
		v1.GET("/:standard/:level/:id/job-type", jobCtrl.GetJobTypeByLevelHandler)
		v1.GET("/occupation/:level/:id/top-15-skills", jobCtrl.GetTop15SkillsByOccupationLevelHandler)
		v1.GET("/occupation/:level/:id/all-skills", jobCtrl.GetAllSkillsByOccupationLevelHandler)
		v1.GET("/occupation/:level/:id/top-hiring-employers", jobCtrl.GetTopHiringEmployersByOccupationLevelHandler)

		v1.DELETE("/jobs/:id", jobCtrl.DeleteJobHandler)
		v1.GET("/jobs", jobCtrl.GetActiveJobsHandler)
		v1.GET("/industries", jobCtrl.GetAllIndustriesHandler)
		v1.GET("/experiences", jobCtrl.GetAllExperiencesHandler)
		v1.GET("/provinces", jobCtrl.GetAllProvincesHandler)
		v1.GET("/job-types", jobCtrl.GetAllJobTypesHandler)
		v1.GET("/industries/skills/count",      jobCtrl.GetUniqueSkillsCountByIndustryHandler)
		v1.GET("/industries/skills/top-demand", jobCtrl.GetMostDemandingSkillByIndustryHandler)
		v1.GET("/industries/skills/top15",      jobCtrl.GetTop15SkillsByIndustryHandler)
		v1.GET("/industries/skills",            jobCtrl.GetAllSkillsByIndustryHandler)
		v1.GET("/industries/employers",         jobCtrl.GetTopHiringEmployersByIndustryHandler)
		v1.GET("/crawler/last-job-count", jobCtrl.GetLastCrawledJobCountHandler)
		v1.GET("/crawler/time-gap",       jobCtrl.GetTimeSinceLastCrawlHandler)
		v1.GET("/crawler/runs",           jobCtrl.GetAllCrawlerRunsHandler)
		v1.GET("/sources",                jobCtrl.GetSourcesWithActiveJobCountHandler)
		v1.GET("/stats/active-jobs",       jobCtrl.GetActiveJobCountWithTrendHandler)
		v1.GET("/stats/by-occupation",     jobCtrl.GetActiveJobCountByOccupationHandler)
		v1.GET("/stats/by-industry",       jobCtrl.GetActiveJobCountByIndustryHandler)
		v1.GET("/stats/by-experience",     jobCtrl.GetActiveJobCountByExperienceHandler)
		v1.GET("/stats/by-education",      jobCtrl.GetActiveJobCountByEducationLevelHandler)
		v1.GET("/stats/by-formality", jobCtrl.GetActiveJobCountByFormalityHandler)
		v1.GET("/stats/by-employment-sector", jobCtrl.GetActiveJobCountByEmploymentSectorHandler)
		v1.GET("/stats/by-gender", jobCtrl.GetActiveJobCountByGenderHandler)
		v1.GET("/stats/by-vocational-education", jobCtrl.GetActiveJobCountByVocationalEducationHandler)
		v1.GET("/stats/remote-vs-onsite",  jobCtrl.GetRemoteVsOnSiteCountHandler)
		v1.GET("/stats/by-job-type",       jobCtrl.GetActiveJobCountByJobTypeHandler)
		v1.GET("/occupations/yearly-trend", jobCtrl.GetYearlyJobTrendByOccupationHandler)
		v1.GET("/occupations/by-formality", jobCtrl.GetJobCountByFormalityForOccupationAndYearHandler)
		v1.GET("/occupations/by-gender", jobCtrl.GetJobCountByGenderForOccupationAndYearHandler)
		v1.GET("/occupations/top-job-roles", jobCtrl.GetTop3JobRolesByOccupationAndYearHandler)
		v1.GET("/industries/yearly-trend",        jobCtrl.GetYearlyJobTrendByIndustryHandler)
		v1.GET("/industries/by-experience",       jobCtrl.GetJobCountByExperienceForIndustryAndYearHandler)
		v1.GET("/industries/by-province",         jobCtrl.GetProvinceWiseJobCountForIndustryAndYearHandler)
		v1.GET("/industries/by-education",        jobCtrl.GetJobCountByEducationLevelForIndustryAndYearHandler)
		v1.GET("/industries/by-vocational-education", jobCtrl.GetJobCountByVocationalEducationForIndustryAndYearHandler)
		v1.GET("/industries/top-employers",       jobCtrl.GetTopHiringEmployersForIndustryAndYearHandler)
		v1.GET("/employment-sectors/yearly-trend", jobCtrl.GetYearlyTrendByEmploymentSectorHandler)

		crawler := v1.Group("/crawler")
		{
			crawler.POST("/runs", jobCtrl.StartCrawlerRunHandler)
			crawler.POST("/runs/:id/complete", jobCtrl.CompleteCrawlerRunHandler)

			crawler.POST("/radar/lookup", jobCtrl.GetJobsByBucketKeysHandler)

			crawler.POST("/jobs/batch-save", jobCtrl.BatchSaveJobsHandler)
			crawler.POST("/jobs/batch-update", jobCtrl.BatchUpdateDuplicatesHandler)
			crawler.POST("/jobs/reconcile", jobCtrl.ReconcileStaleVacanciesHandler)
		}

		geoData := v1.Group("/geo-data")
		{
			geoData.POST("", jobCtrl.CreateGeoDataHandler)
			geoData.GET("", jobCtrl.GetAllGeoDataHandler)
			geoData.GET("/:id", jobCtrl.GetGeoDataByIDHandler)
			geoData.PUT("/:id", jobCtrl.UpdateGeoDataHandler)
			geoData.DELETE("/:id", jobCtrl.DeleteGeoDataHandler)
		}

		educationLevels := v1.Group("/education-levels")
		{
			educationLevels.POST("", jobCtrl.CreateEducationLevelHandler)
			educationLevels.GET("", jobCtrl.GetAllEducationLevelsHandler)
			educationLevels.GET("/:id", jobCtrl.GetEducationLevelByIDHandler)
			educationLevels.PUT("/:id", jobCtrl.UpdateEducationLevelHandler)
			educationLevels.DELETE("/:id", jobCtrl.DeleteEducationLevelHandler)
		}


		formalities := v1.Group("/formalities")
		{
			formalities.POST("", jobCtrl.CreateFormalityHandler)
			formalities.GET("", jobCtrl.GetAllFormalitiesHandler)
			formalities.GET("/:id", jobCtrl.GetFormalityByIDHandler)
			formalities.PUT("/:id", jobCtrl.UpdateFormalityHandler)
			formalities.DELETE("/:id", jobCtrl.DeleteFormalityHandler)
		}

		genders := v1.Group("/genders")
		{
			genders.POST("", jobCtrl.CreateGenderHandler)
			genders.GET("", jobCtrl.GetAllGendersHandler)
			genders.GET("/:id", jobCtrl.GetGenderByIDHandler)
			genders.PUT("/:id", jobCtrl.UpdateGenderHandler)
			genders.DELETE("/:id", jobCtrl.DeleteGenderHandler)
		}

		employmentSectors := v1.Group("/employment-sectors")
		{
			employmentSectors.POST("", jobCtrl.CreateEmploymentSectorHandler)
			employmentSectors.GET("", jobCtrl.GetAllEmploymentSectorsHandler)
			employmentSectors.GET("/:id", jobCtrl.GetEmploymentSectorByIDHandler)
			employmentSectors.PUT("/:id", jobCtrl.UpdateEmploymentSectorHandler)
			employmentSectors.DELETE("/:id", jobCtrl.DeleteEmploymentSectorHandler)
		}

		vocationalEducations := v1.Group("/vocational-educations")
		{
			vocationalEducations.POST("", jobCtrl.CreateVocationalEducationHandler)
			vocationalEducations.GET("", jobCtrl.GetAllVocationalEducationsHandler)
			vocationalEducations.GET("/:id", jobCtrl.GetVocationalEducationByIDHandler)
			vocationalEducations.PUT("/:id", jobCtrl.UpdateVocationalEducationHandler)
			vocationalEducations.DELETE("/:id", jobCtrl.DeleteVocationalEducationHandler)
		}

		experiences := v1.Group("/experiences")
		{
			experiences.POST("", jobCtrl.CreateExperienceHandler)
			experiences.GET("/:id", jobCtrl.GetExperienceByIDHandler)
			experiences.PUT("/:id", jobCtrl.UpdateExperienceHandler)
			experiences.DELETE("/:id", jobCtrl.DeleteExperienceHandler)
		}

		majorGroups := v1.Group("/major-groups")
		{
			majorGroups.POST("", jobCtrl.CreateMajorGroupHandler)
			majorGroups.GET("", jobCtrl.GetAllMajorGroupsHandler)
			majorGroups.GET("/:id", jobCtrl.GetMajorGroupByIDHandler)
			majorGroups.PUT("/:id", jobCtrl.UpdateMajorGroupHandler)
			majorGroups.DELETE("/:id", jobCtrl.DeleteMajorGroupHandler)
			majorGroups.GET("/:id/sub-major-groups", jobCtrl.GetSubMajorGroupsByMajorGroupHandler)
		}

		subMajorGroups := v1.Group("/sub-major-groups")
		{
			subMajorGroups.POST("", jobCtrl.CreateSubMajorGroupHandler)
			subMajorGroups.GET("", jobCtrl.GetAllSubMajorGroupsHandler)
			subMajorGroups.GET("/:id", jobCtrl.GetSubMajorGroupByIDHandler)
			subMajorGroups.PUT("/:id", jobCtrl.UpdateSubMajorGroupHandler)
			subMajorGroups.DELETE("/:id", jobCtrl.DeleteSubMajorGroupHandler)
			subMajorGroups.GET("/:id/minor-groups", jobCtrl.GetMinorGroupsBySubMajorGroupHandler)
		}

		minorGroups := v1.Group("/minor-groups")
		{
			minorGroups.POST("", jobCtrl.CreateMinorGroupHandler)
			minorGroups.GET("", jobCtrl.GetAllMinorGroupsHandler)
			minorGroups.GET("/:id", jobCtrl.GetMinorGroupByIDHandler)
			minorGroups.PUT("/:id", jobCtrl.UpdateMinorGroupHandler)
			minorGroups.DELETE("/:id", jobCtrl.DeleteMinorGroupHandler)
			minorGroups.GET("/:id/unit-groups", jobCtrl.GetUnitGroupsByMinorGroupHandler)
		}

		unitGroups := v1.Group("/unit-groups")
		{
			unitGroups.POST("", jobCtrl.CreateUnitGroupHandler)
			unitGroups.GET("", jobCtrl.GetAllUnitGroupsHandler)
			unitGroups.GET("/:id", jobCtrl.GetUnitGroupByIDHandler)
			unitGroups.PUT("/:id", jobCtrl.UpdateUnitGroupHandler)
			unitGroups.DELETE("/:id", jobCtrl.DeleteUnitGroupHandler)
			unitGroups.GET("/:id/occupation-groups", jobCtrl.GetOccupationGroupsByUnitGroupHandler)
		}

		occupationGroups := v1.Group("/occupation-groups")
		{
			occupationGroups.POST("", jobCtrl.CreateOccupationGroupHandler)
			occupationGroups.GET("", jobCtrl.GetAllOccupationGroupsHandler)
			occupationGroups.GET("/:id", jobCtrl.GetOccupationGroupByIDHandler)
			occupationGroups.PUT("/:id", jobCtrl.UpdateOccupationGroupHandler)
			occupationGroups.DELETE("/:id", jobCtrl.DeleteOccupationGroupHandler)
		}

		industrySectors := v1.Group("/industry-sectors")
		{
			industrySectors.POST("", jobCtrl.CreateIndustrySectorHandler)
			industrySectors.GET("", jobCtrl.GetAllIndustrySectorsHandler)
			industrySectors.GET("/:id", jobCtrl.GetIndustrySectorByIDHandler)
			industrySectors.PUT("/:id", jobCtrl.UpdateIndustrySectorHandler)
			industrySectors.DELETE("/:id", jobCtrl.DeleteIndustrySectorHandler)
			industrySectors.GET("/:id/industry-divisions", jobCtrl.GetIndustryDivisionsByIndustrySectorHandler)
		}

		industryDivisions := v1.Group("/industry-divisions")
		{
			industryDivisions.POST("", jobCtrl.CreateIndustryDivisionHandler)
			industryDivisions.GET("", jobCtrl.GetAllIndustryDivisionsHandler)
			industryDivisions.GET("/:id", jobCtrl.GetIndustryDivisionByIDHandler)
			industryDivisions.PUT("/:id", jobCtrl.UpdateIndustryDivisionHandler)
			industryDivisions.DELETE("/:id", jobCtrl.DeleteIndustryDivisionHandler)
			industryDivisions.GET("/:id/industry-groups", jobCtrl.GetIndustryGroupsByIndustryDivisionHandler)
		}

		industryGroups := v1.Group("/industry-groups")
		{
			industryGroups.POST("", jobCtrl.CreateIndustryGroupHandler)
			industryGroups.GET("", jobCtrl.GetAllIndustryGroupsHandler)
			industryGroups.GET("/:id", jobCtrl.GetIndustryGroupByIDHandler)
			industryGroups.PUT("/:id", jobCtrl.UpdateIndustryGroupHandler)
			industryGroups.DELETE("/:id", jobCtrl.DeleteIndustryGroupHandler)
			industryGroups.GET("/:id/industry-classes", jobCtrl.GetIndustryClassesByIndustryGroupHandler)
		}

		industryClasses := v1.Group("/industry-classes")
		{
			industryClasses.POST("", jobCtrl.CreateIndustryClassHandler)
			industryClasses.GET("", jobCtrl.GetAllIndustryClassesHandler)
			industryClasses.GET("/:id", jobCtrl.GetIndustryClassByIDHandler)
			industryClasses.PUT("/:id", jobCtrl.UpdateIndustryClassHandler)
			industryClasses.DELETE("/:id", jobCtrl.DeleteIndustryClassHandler)
			industryClasses.GET("/:id/industry-subclasses", jobCtrl.GetIndustrySubclassesByIndustryClassHandler)
		}

		industrySubclasses := v1.Group("/industry-subclasses")
		{
			industrySubclasses.POST("", jobCtrl.CreateIndustrySubclassHandler)
			industrySubclasses.GET("", jobCtrl.GetAllIndustrySubclassesHandler)
			industrySubclasses.GET("/:id", jobCtrl.GetIndustrySubclassByIDHandler)
			industrySubclasses.PUT("/:id", jobCtrl.UpdateIndustrySubclassHandler)
			industrySubclasses.DELETE("/:id", jobCtrl.DeleteIndustrySubclassHandler)
		}
	}

	r.Run(":8080")
}
