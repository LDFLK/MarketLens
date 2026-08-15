package repositories

import (
	"database/sql"
	"errors"
	"fmt"
	"marketlens-go-backend/models"
	"time"
	"math"

	"gorm.io/gorm"
)



type JobRepository struct {
	db *gorm.DB
}

func NewJobRepository(db *gorm.DB) *JobRepository {
	return &JobRepository{db: db}
}

//This function builds a subquery of job_post.ids that fall under the given
//occupation/industry hierarchy level and id — used to scope other aggregations
//(like employment sector breakdown) to that level.
func (r *JobRepository) buildJobPostIDsForLevel(standard, level string, id uint) (*gorm.DB, error) {
	if standard == "occupation" {
		switch level {
		case "major-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
				Joins("JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
				Where("sub_major_group.major_group_id = ?", id), nil

		case "sub-major-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
				Where("minor_group.sub_major_group_id = ?", id), nil

		case "minor-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Where("unit_group.minor_group_id = ?", id), nil

		case "unit-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Where("occupation_group.unit_group_id = ?", id), nil

		case "occupation-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Where("meta_data.occupation_group_id = ?", id), nil

		default:
			return nil, fmt.Errorf("invalid level '%s' for standard 'occupation'", level)
		}
	} else if standard == "industry" {
		switch level {
		case "industry-sector":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
				Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
				Where("industry_division.industry_sector_id = ?", id), nil

		case "industry-division":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
				Where("industry_group.industry_division_id = ?", id), nil

		case "industry-group":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Where("industry_class.industry_group_id = ?", id), nil

		case "industry-class":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Where("industry_subclass.industry_class_id = ?", id), nil

		case "industry-subclass":
			return r.db.Table("job_post").
				Select("job_post.id").
				Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
				Where("meta_data.industry_subclass_id = ?", id), nil

		default:
			return nil, fmt.Errorf("invalid level '%s' for standard 'industry'", level)
		}
	}

	return nil, fmt.Errorf("invalid standard '%s', must be 'occupation' or 'industry'", standard)
}

//This function returns the top hiring employers (by summed vacancy count) for jobs
//under the given occupation hierarchy level and id, filtered by date range.
func (r *JobRepository) GetTopHiringEmployersByOccupationLevel(level string, id uint, fromDate, toDate time.Time) ([]models.EmployerDemand, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel("occupation", level, id)
	if err != nil {
		return nil, err
	}

	var results []models.EmployerDemand
	err = r.db.Table("employer").
		Select("employer.id, employer.name, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post ON job_post.employer_id = employer.id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("job_post.id IN (?)", jobPostIDs).
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Group("employer.id, employer.name").
		Order("open_job_count DESC").
		Limit(5).
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query top hiring employers for occupation/%s/%d: %w", level, id, err)
	}

	return results, nil
}

//This function returns all skills (paginated, by summed vacancy count) for jobs
//under the given occupation hierarchy level and id, filtered by date range.
func (r *JobRepository) GetAllSkillsByOccupationLevel(level string, id uint, fromDate, toDate time.Time, limit, offset int) ([]models.SkillDemand, int64, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel("occupation", level, id)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := r.db.Table("skills").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("job_post.id IN (?)", jobPostIDs).
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate)

	var total int64
	if err := baseQuery.Session(&gorm.Session{}).
		Distinct("skills.id").
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count skills for occupation/%s/%d: %w", level, id, err)
	}

	var results []models.SkillDemand
	query := baseQuery.Session(&gorm.Session{}).
		Select("skills.id, skills.skill, SUM(job_post.no_of_vacancies) AS open_job_count").
		Group("skills.id, skills.skill").
		Order("open_job_count DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Scan(&results).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to query all skills for occupation/%s/%d: %w", level, id, err)
	}

	return results, total, nil
}

//This function returns the top 15 skills (by summed vacancy count) for jobs
//under the given occupation hierarchy level and id, filtered by date range.
func (r *JobRepository) GetTop15SkillsByOccupationLevel(level string, id uint, fromDate, toDate time.Time) ([]models.SkillDemand, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel("occupation", level, id)
	if err != nil {
		return nil, err
	}

	var results []models.SkillDemand
	err = r.db.Table("skills").
		Select("skills.id, skills.skill, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("job_post.id IN (?)", jobPostIDs).
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Group("skills.id, skills.skill").
		Order("open_job_count DESC").
		Limit(15).
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query top 15 skills for occupation/%s/%d: %w", level, id, err)
	}

	return results, nil
}

//This function returns job type breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetJobTypeByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.JobTypeJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.JobTypeJobCount
	err = r.db.Table("job_type").
		Select("job_type.id, job_type.type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN job_post ON job_post.job_type_id = job_type.id AND job_post.id IN (?)",
			jobPostIDs,
		).
		Joins("LEFT JOIN meta_data ON meta_data.job_post_id = job_post.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Group("job_type.id, job_type.type").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query job type breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns remote vs on-site job counts for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetRemoteOnSiteByLevel(standard, level string, id uint, fromDate, toDate time.Time) (models.RemoteOnSiteCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return models.RemoteOnSiteCount{}, err
	}

	type remoteOnSiteRow struct {
		IsRemote bool
		Count    int64
	}
	var rows []remoteOnSiteRow

	err = r.db.Table("job_post").
		Select("job_post.is_remote, COALESCE(SUM(job_post.no_of_vacancies), 0) AS count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Where("job_post.id IN (?)", jobPostIDs).
		Group("job_post.is_remote").
		Scan(&rows).Error

	if err != nil {
		return models.RemoteOnSiteCount{}, fmt.Errorf("failed to query remote/on-site breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	var result models.RemoteOnSiteCount
	for _, row := range rows {
		if row.IsRemote {
			result.RemoteCount = row.Count
		} else {
			result.OnSiteCount = row.Count
		}
	}

	return result, nil
}

//This function returns vocational education breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetVocationalEducationByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.VocationalEducationJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.VocationalEducationJobCount
	err = r.db.Table("vocational_education").
		Select("vocational_education.id, vocational_education.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.vocational_education_id = vocational_education.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("vocational_education.id, vocational_education.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query vocational education breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns gender breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetGenderByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.GenderJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.GenderJobCount
	err = r.db.Table("gender").
		Select("gender.id, gender.gender_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.gender_id = gender.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("gender.id, gender.gender_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query gender breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns formality breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetFormalityByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.FormalityJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.FormalityJobCount
	err = r.db.Table("formality").
		Select("formality.id, formality.formality_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.formality_id = formality.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("formality.id, formality.formality_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query formality breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns education level breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetEducationLevelByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.EducationLevelJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.EducationLevelJobCount
	err = r.db.Table("education_level").
		Select("education_level.id, education_level.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.education_level_id = education_level.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("education_level.id, education_level.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query education level breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns province breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetProvinceByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.ProvinceJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.ProvinceJobCount
	err = r.db.Table("geo_data").
		Select("geo_data.id, geo_data.province, geo_data.latitude, geo_data.longitude, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.geo_data_id = geo_data.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("geo_data.id, geo_data.province, geo_data.latitude, geo_data.longitude").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query province breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns experience-level breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetExperienceByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.ExperienceJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.ExperienceJobCount
	err = r.db.Table("experience").
		Select("experience.id, experience.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.experience_id = experience.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("experience.id, experience.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query experience breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns employment sector breakdown (with job counts) for the given
//occupation/industry hierarchy level and id, filtered by date range.
func (r *JobRepository) GetEmploymentSectorByLevel(standard, level string, id uint, fromDate, toDate time.Time) ([]models.EmploymentSectorJobCount, error) {
	jobPostIDs, err := r.buildJobPostIDsForLevel(standard, level, id)
	if err != nil {
		return nil, err
	}

	var results []models.EmploymentSectorJobCount
	err = r.db.Table("employment_sector").
		Select("employment_sector.id, employment_sector.sector, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins(
			"LEFT JOIN meta_data ON meta_data.employment_sector_id = employment_sector.id "+
				"AND meta_data.posted_at::date BETWEEN ? AND ? "+
				"AND meta_data.job_post_id IN (?)",
			fromDate, toDate, jobPostIDs,
		).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("employment_sector.id, employment_sector.sector").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query employment sector breakdown for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, nil
}

//This function returns the immediate child-level entities under a given occupation/industry
//hierarchy level and id, each with its aggregated job count for the given date range.
func (r *JobRepository) GetLevelChildren(standard, level string, id uint, fromDate, toDate time.Time) ([]models.LevelChildJobCount, string, error) {
	var results []models.LevelChildJobCount
	var childLevel string
	var query *gorm.DB

	if standard == "occupation" {
		switch level {
		case "major-group":
			childLevel = "sub-major-group"
			query = r.db.Table("sub_major_group").
				Select("sub_major_group.id, sub_major_group.name, sub_major_group.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN minor_group ON minor_group.sub_major_group_id = sub_major_group.id").
				Joins("LEFT JOIN unit_group ON unit_group.minor_group_id = minor_group.id").
				Joins("LEFT JOIN occupation_group ON occupation_group.unit_group_id = unit_group.id").
				Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("sub_major_group.major_group_id = ?", id).
				Group("sub_major_group.id, sub_major_group.name, sub_major_group.code")

		case "sub-major-group":
			childLevel = "minor-group"
			query = r.db.Table("minor_group").
				Select("minor_group.id, minor_group.name, minor_group.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN unit_group ON unit_group.minor_group_id = minor_group.id").
				Joins("LEFT JOIN occupation_group ON occupation_group.unit_group_id = unit_group.id").
				Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("minor_group.sub_major_group_id = ?", id).
				Group("minor_group.id, minor_group.name, minor_group.code")

		case "minor-group":
			childLevel = "unit-group"
			query = r.db.Table("unit_group").
				Select("unit_group.id, unit_group.name, unit_group.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN occupation_group ON occupation_group.unit_group_id = unit_group.id").
				Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("unit_group.minor_group_id = ?", id).
				Group("unit_group.id, unit_group.name, unit_group.code")

		case "unit-group":
			childLevel = "occupation-group"
			query = r.db.Table("occupation_group").
				Select("occupation_group.id, occupation_group.name, occupation_group.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("occupation_group.unit_group_id = ?", id).
				Group("occupation_group.id, occupation_group.name, occupation_group.code")

		case "occupation-group":
			return nil, "", fmt.Errorf("'occupation-group' is a leaf level and has no children")

		default:
			return nil, "", fmt.Errorf("invalid level '%s' for standard 'occupation'", level)
		}
	} else if standard == "industry" {
		switch level {
		case "industry-sector":
			childLevel = "industry-division"
			query = r.db.Table("industry_division").
				Select("industry_division.id, industry_division.name, industry_division.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN industry_group ON industry_group.industry_division_id = industry_division.id").
				Joins("LEFT JOIN industry_class ON industry_class.industry_group_id = industry_group.id").
				Joins("LEFT JOIN industry_subclass ON industry_subclass.industry_class_id = industry_class.id").
				Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("industry_division.industry_sector_id = ?", id).
				Group("industry_division.id, industry_division.name, industry_division.code")

		case "industry-division":
			childLevel = "industry-group"
			query = r.db.Table("industry_group").
				Select("industry_group.id, industry_group.name, industry_group.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN industry_class ON industry_class.industry_group_id = industry_group.id").
				Joins("LEFT JOIN industry_subclass ON industry_subclass.industry_class_id = industry_class.id").
				Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("industry_group.industry_division_id = ?", id).
				Group("industry_group.id, industry_group.name, industry_group.code")

		case "industry-group":
			childLevel = "industry-class"
			query = r.db.Table("industry_class").
				Select("industry_class.id, industry_class.name, industry_class.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN industry_subclass ON industry_subclass.industry_class_id = industry_class.id").
				Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("industry_class.industry_group_id = ?", id).
				Group("industry_class.id, industry_class.name, industry_class.code")

		case "industry-class":
			childLevel = "industry-subclass"
			query = r.db.Table("industry_subclass").
				Select("industry_subclass.id, industry_subclass.name, industry_subclass.code, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
				Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
				Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
				Where("industry_subclass.industry_class_id = ?", id).
				Group("industry_subclass.id, industry_subclass.name, industry_subclass.code")

		case "industry-subclass":
			return nil, "", fmt.Errorf("'industry-subclass' is a leaf level and has no children")

		default:
			return nil, "", fmt.Errorf("invalid level '%s' for standard 'industry'", level)
		}
	} else {
		return nil, "", fmt.Errorf("invalid standard '%s', must be 'occupation' or 'industry'", standard)
	}

	err := query.Order("open_job_count DESC").Scan(&results).Error
	if err != nil {
		return nil, "", fmt.Errorf("failed to query children for %s/%s/%d: %w", standard, level, id, err)
	}

	return results, childLevel, nil
}

//This function returns the total job count for a given occupation/industry hierarchy level and id,
//filtered by date range. standard is "occupation" or "industry"; level depends on the standard.
func (r *JobRepository) GetTotalJobCountByLevel(standard, level string, id uint, fromDate, toDate time.Time) (int64, error) {
	query := r.db.Table("job_post").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate)

	if standard == "occupation" {
		switch level {
		case "major-group":
			query = query.
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
				Joins("JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
				Where("sub_major_group.major_group_id = ?", id)

		case "sub-major-group":
			query = query.
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
				Where("minor_group.sub_major_group_id = ?", id)

		case "minor-group":
			query = query.
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
				Where("unit_group.minor_group_id = ?", id)

		case "unit-group":
			query = query.
				Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
				Where("occupation_group.unit_group_id = ?", id)

		case "occupation-group":
			query = query.Where("meta_data.occupation_group_id = ?", id)

		default:
			return 0, fmt.Errorf("invalid level '%s' for standard 'occupation'", level)
		}
	} else if standard == "industry" {
		switch level {
		case "industry-sector":
			query = query.
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
				Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
				Where("industry_division.industry_sector_id = ?", id)

		case "industry-division":
			query = query.
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
				Where("industry_group.industry_division_id = ?", id)

		case "industry-group":
			query = query.
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
				Where("industry_class.industry_group_id = ?", id)

		case "industry-class":
			query = query.
				Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
				Where("industry_subclass.industry_class_id = ?", id)

		case "industry-subclass":
			query = query.Where("meta_data.industry_subclass_id = ?", id)

		default:
			return 0, fmt.Errorf("invalid level '%s' for standard 'industry'", level)
		}
	} else {
		return 0, fmt.Errorf("invalid standard '%s', must be 'occupation' or 'industry'", standard)
	}

	var total int64
	err := query.Select("COALESCE(SUM(job_post.no_of_vacancies), 0)").Scan(&total).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query total job count for %s/%s/%d: %w", standard, level, id, err)
	}

	return total, nil
}

//This function returns vacancy counts grouped by industry sector, for jobs posted within the given date range
func (r *JobRepository) GetIndustryJobCountByDateRange(fromDate, toDate time.Time) ([]models.IndustryJobCount, error) {
	var results []models.IndustryJobCount

	err := r.db.Table("industry_sector").
		Select("industry_sector.id, industry_sector.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN industry_division ON industry_division.industry_sector_id = industry_sector.id").
		Joins("LEFT JOIN industry_group ON industry_group.industry_division_id = industry_division.id").
		Joins("LEFT JOIN industry_class ON industry_class.industry_group_id = industry_group.id").
		Joins("LEFT JOIN industry_subclass ON industry_subclass.industry_class_id = industry_class.id").
		Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("industry_sector.id, industry_sector.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query industry job count by date range: %w", err)
	}

	return results, nil
}

//This function returns vacancy counts grouped by major group (occupation), for jobs posted within the given date range
func (r *JobRepository) GetOccupationJobCountByDateRange(fromDate, toDate time.Time) ([]models.OccupationJobCount, error) {
	var results []models.OccupationJobCount

	err := r.db.Table("major_group").
		Select("major_group.id, major_group.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN sub_major_group ON sub_major_group.major_group_id = major_group.id").
		Joins("LEFT JOIN minor_group ON minor_group.sub_major_group_id = sub_major_group.id").
		Joins("LEFT JOIN unit_group ON unit_group.minor_group_id = minor_group.id").
		Joins("LEFT JOIN occupation_group ON occupation_group.unit_group_id = unit_group.id").
		Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("major_group.id, major_group.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query occupation job count by date range: %w", err)
	}

	return results, nil
}

//This function returns the total sum of no_of_vacancies for jobs posted within the given date range
func (r *JobRepository) GetTotalVacancyCount(fromDate, toDate time.Time) (int64, error) {
	var total int64

	err := r.db.Table("job_post").
		Select("COALESCE(SUM(job_post.no_of_vacancies), 0)").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Scan(&total).Error

	if err != nil {
		return 0, fmt.Errorf("failed to query total vacancy count: %w", err)
	}

	return total, nil
}

// Get vacancy trend for a selected date range
//This function returns job counts grouped day by day within the given date range
func (r *JobRepository) GetVacancyTrendDaily(fromDate, toDate time.Time) ([]models.VacancyTrendPoint, error) {
	var rows []struct {
		PeriodStart  time.Time
		OpenJobCount int64
	}

	err := r.db.Table("job_post").
		Select("meta_data.posted_at::date AS period_start, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Group("period_start").
		Order("period_start ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query daily vacancy trend: %w", err)
	}

	results := make([]models.VacancyTrendPoint, 0, len(rows))
	for _, row := range rows {
		results = append(results, models.VacancyTrendPoint{
			Label:        formatWeekLabel(row.PeriodStart),
			OpenJobCount: row.OpenJobCount,
		})
	}

	return results, nil
}

//This function returns job counts grouped month by month within the given date range
func (r *JobRepository) GetVacancyTrendMonthly(fromDate, toDate time.Time) ([]models.VacancyTrendPoint, error) {
	var rows []struct {
		PeriodStart  time.Time
		OpenJobCount int64
	}

	err := r.db.Table("job_post").
		Select("date_trunc('month', meta_data.posted_at)::date AS period_start, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.posted_at::date BETWEEN ? AND ?", fromDate, toDate).
		Group("period_start").
		Order("period_start ASC").
		Scan(&rows).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query monthly vacancy trend: %w", err)
	}

	results := make([]models.VacancyTrendPoint, 0, len(rows))
	for _, row := range rows {
		results = append(results, models.VacancyTrendPoint{
			Label:        row.PeriodStart.Format("Jan 2006"),
			OpenJobCount: row.OpenJobCount,
		})
	}

	n := len(rows)
	if n == 0 {
		return results, nil
	}

	firstBucketStart := rows[0].PeriodStart
	firstBucketNaturalEnd := firstBucketStart.AddDate(0, 1, 0).AddDate(0, 0, -1)
	lastBucketStart := rows[n-1].PeriodStart
	lastBucketNaturalEnd := lastBucketStart.AddDate(0, 1, 0).AddDate(0, 0, -1)

	firstIsPartial := fromDate.After(firstBucketStart)   
	lastIsPartial := toDate.Before(lastBucketNaturalEnd) 

	switch {
	case n == 1 && firstIsPartial && lastIsPartial:
		results[0].Label = fmt.Sprintf("%s - %s", fromDate.Format("Jan 2"), toDate.Format("Jan 2, 2006"))

	default:
		if firstIsPartial {
			results[0].Label = fmt.Sprintf("%s - %s", fromDate.Format("Jan 2"), firstBucketNaturalEnd.Format("Jan 2, 2006"))
		}
		if lastIsPartial {
			results[n-1].Label = fmt.Sprintf("%s - %s", lastBucketStart.Format("Jan 2"), toDate.Format("Jan 2, 2006"))
		}
	}

	return results, nil
}

func formatWeekLabel(t time.Time) string {
	return t.Format("Jan 2")
}

func (r *JobRepository) CreateCrawlerRun() (models.CrawlerRun, error) {
	now := time.Now()
	run := models.CrawlerRun{
		StartedAt: &now,
		Status:    "RUNNING",
	}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		err := tx.Model(&models.CrawlerRun{}).
			Where("status = ?", "RUNNING").
			Updates(map[string]interface{}{
				"status":      "FAILED",
				"finished_at": &now,
			}).Error
		if err != nil {
			return err
		}

		if err := tx.Create(&run).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return models.CrawlerRun{}, err
	}

	return run, nil
}

func (r *JobRepository) CompleteCrawlerRun(id uint, status string) error {
	now := time.Now()
	return r.db.Model(&models.CrawlerRun{}).Where("id = ?", id).Updates(map[string]interface{}{
		"finished_at": &now,
		"status":      status, // 'COMPLETED' or 'FAILED'
	}).Error
}

func (r *JobRepository) GetJobsByBucketKeys(bucketKeys []string) ([]models.JobPost, error) {
	var jobs []models.JobPost

	err := r.db.Distinct("job_post.*").
		Joins("JOIN lsh_index ON lsh_index.job_post_id = job_post.id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("lsh_index.bucket_key IN ? AND meta_data.end_date IS NULL", bucketKeys).
		Preload("Employer").
		Preload("JobType").
		Preload("Skills").
		Preload("MetaData"). 
		Preload("MetaData.AiVersion").
		Preload("MetaData.EducationLevel").
		Preload("MetaData.GeoData").
		Preload("MetaData.Industry").
		Preload("MetaData.Occupation").
		Preload("MetaData.Source").
		Preload("MetaData.Experience").
		Preload("MetaData.CrawlerRun").
		Find(&jobs).Error

	if err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *JobRepository) BatchSaveNewJobs(jobs []models.JobPost, lshIndexRecords []models.LshIndex) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		generatedJobIDs := make(map[int]uint)

		for i := range jobs {
			job := &jobs[i]

			// Employer (FirstOrCreate)
			if job.Employer != nil && job.Employer.Name != "" {
				var employer models.Employer
				if err := tx.Where(models.Employer{Name: job.Employer.Name}).
					FirstOrCreate(&employer).Error; err != nil {
					return fmt.Errorf("job[%d] employer lookup failed: %w", i, err)
				}
				job.EmployerID = &employer.ID
				job.Employer = nil
			}

			// JobType (FirstOrCreate)
			if job.JobType != nil && job.JobType.Type != "" {
				var jt models.JobType
				if err := tx.Where(models.JobType{Type: job.JobType.Type}).
					FirstOrCreate(&jt).Error; err != nil {
					return fmt.Errorf("job[%d] job_type lookup failed: %w", i, err)
				}
				job.JobTypeID = &jt.ID
				job.JobType = nil
			}

			// Skills (FirstOrCreate per skill)
			var linkedSkills []models.Skill
			for _, s := range job.Skills {
				if s.Skill == "" {
					continue
				}
				var skill models.Skill
				if err := tx.Where(models.Skill{Skill: s.Skill}).
					FirstOrCreate(&skill).Error; err != nil {
					return fmt.Errorf("job[%d] skill '%s' lookup failed: %w", i, s.Skill, err)
				}
				linkedSkills = append(linkedSkills, skill)
			}
			job.Skills = linkedSkills

			// Geo (lookup only, no create)
			if job.MetaData.GeoData != nil && job.MetaData.GeoData.Province != "" {
				var geo models.GeoData
				err := tx.Where("province = ?", job.MetaData.GeoData.Province).
					First(&geo).Error
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("job[%d] province '%s' not registered in geo_data",
						i, job.MetaData.GeoData.Province)
				} else if err != nil {
					return fmt.Errorf("job[%d] geo lookup failed: %w", i, err)
				}
				job.MetaData.GeoDataID = &geo.ID
				job.MetaData.GeoData = nil
			}

			// Industry (lookup only, no create)
			// if job.MetaData.Industry != nil && job.MetaData.Industry.Name != "" {
			// 	var industry models.Industry
			// 	err := tx.Where("name = ?", job.MetaData.Industry.Name).
			// 		First(&industry).Error
			// 	if errors.Is(err, gorm.ErrRecordNotFound) {
			// 		return fmt.Errorf("job[%d] industry '%s' not registered",
			// 			i, job.MetaData.Industry.Name)
			// 	} else if err != nil {
			// 		return fmt.Errorf("job[%d] industry lookup failed: %w", i, err)
			// 	}
			// 	job.MetaData.IndustryID = &industry.ID
			// 	job.MetaData.Industry = nil
			// }

			// Occupation (lookup only, no create)
			// if job.MetaData.Occupation != nil && job.MetaData.Occupation.Name != "" {
			// 	var occupation models.Occupation
			// 	err := tx.Where("name = ?", job.MetaData.Occupation.Name).
			// 		First(&occupation).Error
			// 	if errors.Is(err, gorm.ErrRecordNotFound) {
			// 		return fmt.Errorf("job[%d] occupation '%s' not registered",
			// 			i, job.MetaData.Occupation.Name)
			// 	} else if err != nil {
			// 		return fmt.Errorf("job[%d] occupation lookup failed: %w", i, err)
			// 	}
			// 	job.MetaData.OccupationID = &occupation.ID
			// 	job.MetaData.Occupation = nil
			// }

			// EducationLevel (lookup only, no create)
			// if job.MetaData.EducationLevel != nil && job.MetaData.EducationLevel.Level != "" {
			// 	var edu models.EducationLevel
			// 	err := tx.Where("level = ?", job.MetaData.EducationLevel.Level).
			// 		First(&edu).Error
			// 	if errors.Is(err, gorm.ErrRecordNotFound) {
			// 		return fmt.Errorf("job[%d] education_level '%s' not registered",
			// 			i, job.MetaData.EducationLevel.Level)
			// 	} else if err != nil {
			// 		return fmt.Errorf("job[%d] education_level lookup failed: %w", i, err)
			// 	}
			// 	job.MetaData.EducationLevelID = &edu.ID
			// 	job.MetaData.EducationLevel = nil
			// }

			// Experience (lookup only, no create)
			// if job.MetaData.Experience != nil && job.MetaData.Experience.Name != "" {
			// 	var exp models.Experience
			// 	err := tx.Where("name = ?", job.MetaData.Experience.Name).
			// 		First(&exp).Error
			// 	if errors.Is(err, gorm.ErrRecordNotFound) {
			// 		return fmt.Errorf("job[%d] experience '%s' not registered",
			// 			i, job.MetaData.Experience.Name)
			// 	} else if err != nil {
			// 		return fmt.Errorf("job[%d] experience lookup failed: %w", i, err)
			// 	}
			// 	job.MetaData.ExperienceID = &exp.ID
			// 	job.MetaData.Experience = nil
			// }

			// Source (FirstOrCreate)
			if job.MetaData.Source != nil && job.MetaData.Source.Source != "" {
				var source models.Source
				if err := tx.Where(models.Source{Source: job.MetaData.Source.Source}).
					FirstOrCreate(&source).Error; err != nil {
					return fmt.Errorf("job[%d] source lookup failed: %w", i, err)
				}
				job.MetaData.SourceID = &source.ID
				job.MetaData.Source = nil
			}

			// AiVersion (FirstOrCreate)
			if job.MetaData.AiVersion != nil && job.MetaData.AiVersion.Version != "" {
				var av models.AiVersion
				if err := tx.Where(models.AiVersion{Version: job.MetaData.AiVersion.Version}).
					FirstOrCreate(&av).Error; err != nil {
					return fmt.Errorf("job[%d] ai_version lookup failed: %w", i, err)
				}
				job.MetaData.AiVersionID = &av.ID
				job.MetaData.AiVersion = nil
			}

			// Save JobPost (cascades MetaData + join table)
			if err := tx.Create(job).Error; err != nil {
				return fmt.Errorf("job[%d] insert failed: %w", i, err)
			}
			generatedJobIDs[i] = job.ID
		}

		// Map true DB IDs onto LSH records
		for idx := range lshIndexRecords {
			jobGroupIndex := idx / 8
			trueID, exists := generatedJobIDs[jobGroupIndex]
			if !exists {
				return fmt.Errorf("lsh_index[%d] has no matching generated job ID", idx)
			}
			lshIndexRecords[idx].JobPostID = trueID
		}

		// Bulk insert LSH records
		if len(lshIndexRecords) > 0 {
			if err := tx.Omit("JobPost").CreateInBatches(&lshIndexRecords, 500).Error; err != nil {
				return fmt.Errorf("lsh_index bulk insert failed: %w", err)
			}
		}

		return nil
	})
}

func (r *JobRepository) BatchUpdateDuplicateJobs(updates []models.JobMetaData) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, up := range updates {
			err := tx.Table("meta_data").
				Where("job_post_id = ?", up.JobPostID).
				Update("crawler_run_id", up.CrawlerRunID).Error
				
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *JobRepository) ReconcileStaleVacancies(currentRunID uint) (int64, error) {
	var affectedRows int64
	now := time.Now()

	err := r.db.Transaction(func(tx *gorm.DB) error {

		var staleJobIDs []uint
		err := tx.Model(&models.JobMetaData{}).
			Where("crawler_run_id <> ? AND end_date IS NULL", currentRunID).
			Pluck("job_post_id", &staleJobIDs).Error
		if err != nil {
			return err
		}

		if len(staleJobIDs) == 0 {
			return nil
		}

		if err := tx.Where("job_post_id IN ?", staleJobIDs).Delete(&models.LshIndex{}).Error; err != nil {
			return err
		}

		result := tx.Model(&models.JobMetaData{}).
			Where("job_post_id IN ?", staleJobIDs).
			Updates(map[string]interface{}{
				"end_date": &now,
			})
		if result.Error != nil {
			return result.Error
		}

		affectedRows = result.RowsAffected
		return nil
	})

	if err != nil {
		return 0, err
	}

	return affectedRows, nil
}


//job delete API
func (r *JobRepository) DeleteJob(id uint) (uint, error) {

	var job models.JobPost

	//check whether job post exists or not
	if err := r.db.First(&job, id).Error; err != nil {
		return 0,err
	}

	if err := r.db.Select("Skills").Delete(&job).Error; err != nil {
		return 0,err
	}

	return job.ID, nil
}

//get active jobs by industry, province, experience, job type
func (r *JobRepository) GetActiveJobs(industryID, geoDataID, jobTypeID, experienceID *uint, limit, offset int) ([]models.JobPost, error) {
	var jobs []models.JobPost

	query := r.withFullPreloads().
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.end_date IS NULL")

	if industryID != nil {
		query = query.
			Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
			Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
			Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
			Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
			Where("industry_division.industry_sector_id = ?", *industryID)
	}
	if geoDataID != nil {
		query = query.Where("meta_data.geo_data_id = ?", *geoDataID)
	}
	if jobTypeID != nil {
		query = query.Where("job_post.job_type_id = ?", *jobTypeID)
	}
	if experienceID != nil {
		query = query.Where("meta_data.experience_id = ?", *experienceID)
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *JobRepository) withFullPreloads() *gorm.DB {
	return r.db.
		Preload("Employer").
		Preload("JobType").
		Preload("Skills").
		Preload("MetaData").
		Preload("MetaData.AiVersion").
		Preload("MetaData.EducationLevel").
		Preload("MetaData.GeoData").
		Preload("MetaData.Industry").
		Preload("MetaData.Occupation").
		Preload("MetaData.Source").
		Preload("MetaData.Experience").
		Preload("MetaData.CrawlerRun")
}

func (r *JobRepository) GetAllIndustries() ([]models.Industry, error) {
	var industries []models.Industry
	if err := r.db.Find(&industries).Error; err != nil {
		return nil, err
	}
	return industries, nil
}

func (r *JobRepository) GetAllExperiences() ([]models.Experience, error) {
	var experiences []models.Experience
	if err := r.db.Find(&experiences).Error; err != nil {
		return nil, err
	}
	return experiences, nil
}

func (r *JobRepository) GetAllProvinces() ([]models.GeoData, error) {
	var provinces []models.GeoData
	if err := r.db.Find(&provinces).Error; err != nil {
		return nil, err
	}
	return provinces, nil
}

// Job type CRUD
func (r *JobRepository) CreateJobType(item *models.JobType) error {
	return r.db.Create(item).Error
}

func (r *JobRepository) GetAllJobTypes() ([]models.JobType, error) {
	var jobTypes []models.JobType
	if err := r.db.Find(&jobTypes).Error; err != nil {
		return nil, err
	}
	return jobTypes, nil
}

func (r *JobRepository) GetJobTypeByID(id uint) (models.JobType, error) {
	var item models.JobType
	err := r.db.First(&item, id).Error
	return item, err
}

func (r *JobRepository) UpdateJobType(id uint, updates map[string]interface{}) (models.JobType, error) {
	var item models.JobType
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}

func (r *JobRepository) DeleteJobType(id uint) error {
	return r.db.Delete(&models.JobType{}, id).Error
}

func (r *JobRepository) GetUniqueSkillsCountByIndustry(industryID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Skill{}).
		Distinct("skills.id").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.end_date IS NULL", industryID).
		Count(&count).Error
	return count, err
}

func (r *JobRepository) GetMostDemandingSkillByIndustry(industryID uint) (models.SkillDemand, error) {
	var result models.SkillDemand
	err := r.db.Table("skills").
		Select("skills.id, skills.skill, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.end_date IS NULL", industryID).
		Group("skills.id, skills.skill").
		Order("open_job_count DESC").
		Limit(1).
		Scan(&result).Error
	return result, err
}

func (r *JobRepository) GetTop15SkillsByIndustry(industryID uint) ([]models.SkillDemand, error) {
	var results []models.SkillDemand
	err := r.db.Table("skills").
		Select("skills.id, skills.skill, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.end_date IS NULL", industryID).
		Group("skills.id, skills.skill").
		Order("open_job_count DESC").
		Limit(15).
		Scan(&results).Error
	return results, err
}

func (r *JobRepository) GetAllSkillsByIndustry(industryID uint) ([]models.SkillDemand, error) {
	var results []models.SkillDemand
	err := r.db.Table("skills").
		Select("skills.id, skills.skill, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post_skills ON job_post_skills.skill_id = skills.id").
		Joins("JOIN job_post ON job_post.id = job_post_skills.job_post_id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.end_date IS NULL", industryID).
		Group("skills.id, skills.skill").
		Order("open_job_count DESC").
		Scan(&results).Error
	return results, err
}

func (r *JobRepository) GetTopHiringEmployersByIndustry(industryID uint) ([]models.EmployerDemand, error) {
	var results []models.EmployerDemand
	err := r.db.Table("employer").
		Select("employer.id, employer.name, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post ON job_post.employer_id = employer.id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.end_date IS NULL", industryID).
		Group("employer.id, employer.name").
		Order("open_job_count DESC").
		Limit(5).
		Scan(&results).Error
	return results, err
}

func (r *JobRepository) GetLastCrawledJobCount() (int64, error) {
	var count int64

	// Get the latest completed crawler run ID first
	var lastRun models.CrawlerRun
	if err := r.db.Where("status = ?", "COMPLETED").
		Order("finished_at DESC").
		First(&lastRun).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}

	// Count job posts created under that crawler run
	var totalVacancies sql.NullInt64
	err := r.db.Table("meta_data").
		Select("SUM(job_post.no_of_vacancies)").
		Joins("JOIN job_post ON job_post.id = meta_data.job_post_id").
		Where("meta_data.crawler_run_id = ?", lastRun.ID).
		Scan(&totalVacancies).Error
	if err != nil {
		return 0, err
	}

	if totalVacancies.Valid {
		count = totalVacancies.Int64
	}

	return count, err
}

func (r *JobRepository) GetTimeSinceLastCrawl() (models.CrawlTimeGap, error) {
	var lastRun models.CrawlerRun

	err := r.db.Where("status = ?", "COMPLETED").
		Order("finished_at DESC").
		First(&lastRun).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CrawlTimeGap{}, nil
	}
	if err != nil {
		return models.CrawlTimeGap{}, err
	}

	now := time.Now()
	gap := now.Sub(*lastRun.FinishedAt)

	return models.CrawlTimeGap{
		LastCrawledAt: lastRun.FinishedAt,
		GapSeconds:    gap.Seconds(),
		GapHuman:      formatDuration(gap),
	}, nil
}

func (r *JobRepository) GetSourcesWithActiveJobCount() ([]models.SourceJobCount, error) {
	var results []models.SourceJobCount

	err := r.db.Table("source").
		Select("source.id, source.source, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.source_id = source.id").
		Joins("JOIN job_post ON job_post.id = meta_data.job_post_id").
		Where("meta_data.end_date IS NULL").
		Group("source.id, source.source").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetAllCrawlerRuns() ([]models.CrawlerRun, error) {
	var runs []models.CrawlerRun

	err := r.db.Order("created_at DESC").
		Limit(5).
		Find(&runs).Error

	return runs, err
}

// formatDuration converts a duration into a human readable string
func formatDuration(d time.Duration) string {
	if d.Hours() >= 24 {
		days := int(d.Hours()) / 24
		hours := int(d.Hours()) % 24
		return fmt.Sprintf("%d day(s) %d hour(s) ago", days, hours)
	}
	if d.Hours() >= 1 {
		return fmt.Sprintf("%d hour(s) %d minute(s) ago", int(d.Hours()), int(d.Minutes())%60)
	}
	if d.Minutes() >= 1 {
		return fmt.Sprintf("%d minute(s) %d second(s) ago", int(d.Minutes()), int(d.Seconds())%60)
	}
	return fmt.Sprintf("%d second(s) ago", int(d.Seconds()))
}

func (r *JobRepository) GetActiveJobCountWithTrend() (models.JobCountWithTrend, error) {
	var currentCount int64
	var lastMonthCount int64

	now := time.Now()
	firstDayThisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	firstDayLastMonth := firstDayThisMonth.AddDate(0, -1, 0)

	// Current active job count
	var currentVacancies sql.NullInt64
	if err := r.db.Table("meta_data").
		Select("SUM(job_post.no_of_vacancies)").
		Joins("JOIN job_post ON job_post.id = meta_data.job_post_id").
		Where("meta_data.end_date IS NULL").
		Scan(&currentVacancies).Error; err != nil {
		return models.JobCountWithTrend{}, err
	}
	if currentVacancies.Valid {
		currentCount = currentVacancies.Int64
	}

	// Last month active job count — jobs that were active during last month window
	var lastMonthVacancies sql.NullInt64
	if err := r.db.Table("meta_data").
		Select("SUM(job_post.no_of_vacancies)").
		Joins("JOIN job_post ON job_post.id = meta_data.job_post_id").
		Where("meta_data.posted_at >= ? AND meta_data.posted_at < ?", firstDayLastMonth, firstDayThisMonth).
		Scan(&lastMonthVacancies).Error; err != nil {
		return models.JobCountWithTrend{}, err
	}
	if lastMonthVacancies.Valid {
		lastMonthCount = lastMonthVacancies.Int64
	}

	var changePercent float64
	var trend string

	if lastMonthCount == 0 {
		if currentCount > 0 {
			changePercent = 100.0
			trend = "up"
		} else {
			changePercent = 0.0
			trend = "stable"
		}
	} else {
		changePercent = float64(currentCount-lastMonthCount) / float64(lastMonthCount) * 100
		if changePercent > 0 {
			trend = "up"
		} else if changePercent < 0 {
			trend = "down"
		} else {
			trend = "stable"
		}
	}

	return models.JobCountWithTrend{
		ActiveJobCount: currentCount,
		LastMonthCount: lastMonthCount,
		ChangePercent:  math.Round(changePercent*100) / 100,
		Trend:          trend,
	}, nil
}

func (r *JobRepository) GetActiveJobCountByOccupation() ([]models.OccupationJobCount, error) {
	var results []models.OccupationJobCount

	err := r.db.Table("major_group").
		Select("major_group.id, major_group.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN sub_major_group ON sub_major_group.major_group_id = major_group.id").
		Joins("LEFT JOIN minor_group ON minor_group.sub_major_group_id = sub_major_group.id").
		Joins("LEFT JOIN unit_group ON unit_group.minor_group_id = minor_group.id").
		Joins("LEFT JOIN occupation_group ON occupation_group.unit_group_id = unit_group.id").
		Joins("LEFT JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("major_group.id, major_group.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByIndustry() ([]models.IndustryJobCount, error) {
	var results []models.IndustryJobCount

	err := r.db.Table("industry_sector").
		Select("industry_sector.id, industry_sector.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN industry_division ON industry_division.industry_sector_id = industry_sector.id").
		Joins("LEFT JOIN industry_group ON industry_group.industry_division_id = industry_division.id").
		Joins("LEFT JOIN industry_class ON industry_class.industry_group_id = industry_group.id").
		Joins("LEFT JOIN industry_subclass ON industry_subclass.industry_class_id = industry_class.id").
		Joins("LEFT JOIN meta_data ON meta_data.industry_subclass_id = industry_subclass.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("industry_sector.id, industry_sector.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByExperience() ([]models.ExperienceJobCount, error) {
	var results []models.ExperienceJobCount

	err := r.db.Table("experience").
		Select("experience.id, experience.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.experience_id = experience.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("experience.id, experience.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByEducationLevel() ([]models.EducationLevelJobCount, error) {
	var results []models.EducationLevelJobCount

	err := r.db.Table("education_level").
		Select("education_level.id, education_level.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.education_level_id = education_level.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("education_level.id, education_level.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByFormality() ([]models.FormalityJobCount, error) {
	var results []models.FormalityJobCount

	err := r.db.Table("formality").
		Select("formality.id, formality.formality_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.formality_id = formality.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("formality.id, formality.formality_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByEmploymentSector() ([]models.EmploymentSectorJobCount, error) {
	var results []models.EmploymentSectorJobCount

	err := r.db.Table("employment_sector").
		Select("employment_sector.id, employment_sector.sector, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.employment_sector_id = employment_sector.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("employment_sector.id, employment_sector.sector").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByGender() ([]models.GenderJobCount, error) {
	var results []models.GenderJobCount

	err := r.db.Table("gender").
		Select("gender.id, gender.gender_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.gender_id = gender.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("gender.id, gender.gender_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetActiveJobCountByVocationalEducation() ([]models.VocationalEducationJobCount, error) {
	var results []models.VocationalEducationJobCount

	err := r.db.Table("vocational_education").
		Select("vocational_education.id, vocational_education.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.vocational_education_id = vocational_education.id AND meta_data.end_date IS NULL").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id").
		Group("vocational_education.id, vocational_education.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetRemoteVsOnSiteCount() (models.RemoteOnSiteCount, error) {
	var result models.RemoteOnSiteCount

	type row struct {
		IsRemote bool
		Count    int64
	}
	var rows []row

	err := r.db.Table("job_post").
		Select("job_post.is_remote, SUM(job_post.no_of_vacancies) AS count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.end_date IS NULL").
		Group("job_post.is_remote").
		Scan(&rows).Error

	if err != nil {
		return models.RemoteOnSiteCount{}, err
	}

	for _, r := range rows {
		if r.IsRemote {
			result.RemoteCount = r.Count
		} else {
			result.OnSiteCount = r.Count
		}
	}

	return result, nil
}

func (r *JobRepository) GetActiveJobCountByJobType() ([]models.JobTypeJobCount, error) {
	var results []models.JobTypeJobCount

	err := r.db.Table("job_type").
		Select("job_type.id, job_type.type, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post ON job_post.job_type_id = job_type.id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.end_date IS NULL").
		Group("job_type.id, job_type.type").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetYearlyJobTrendByOccupation(occupationID uint) ([]models.OccupationYearlyTrend, error) {
	var results []models.OccupationYearlyTrend

	now := time.Now()
	startOfTwoYearsAgo := time.Date(now.Year()-2, time.January, 1, 0, 0, 0, 0, now.Location())

	err := r.db.Table("job_post").
		Select("EXTRACT(YEAR FROM meta_data.posted_at)::int AS year, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
		Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
		Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
		Joins("JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
		Where("sub_major_group.major_group_id = ? AND meta_data.posted_at IS NOT NULL AND meta_data.posted_at >= ?", occupationID, startOfTwoYearsAgo).
		Group("EXTRACT(YEAR FROM meta_data.posted_at)").
		Order("year ASC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetJobCountByFormalityForOccupationAndYear(occupationID uint, year int) ([]models.FormalityYearlyJobCount, error) {
	var results []models.FormalityYearlyJobCount

	err := r.db.Table("formality").
		Select("formality.id, formality.formality_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.formality_id = formality.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
		Joins("LEFT JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
		Joins("LEFT JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
		Joins("LEFT JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND sub_major_group.major_group_id = ?", occupationID).
		Group("formality.id, formality.formality_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetJobCountByGenderForOccupationAndYear(occupationID uint, year int) ([]models.GenderYearlyJobCount, error) {
	var results []models.GenderYearlyJobCount

	err := r.db.Table("gender").
		Select("gender.id, gender.gender_type, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.gender_id = gender.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN occupation_group ON occupation_group.id = meta_data.occupation_group_id").
		Joins("LEFT JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
		Joins("LEFT JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
		Joins("LEFT JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND sub_major_group.major_group_id = ?", occupationID).
		Group("gender.id, gender.gender_type").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetTop3JobRolesByOccupationAndYear(occupationID uint, year int) ([]models.TopJobRole, error) {
	var results []models.TopJobRole

	err := r.db.Table("occupation_group").
		Select("occupation_group.id, occupation_group.name, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN unit_group ON unit_group.id = occupation_group.unit_group_id").
		Joins("JOIN minor_group ON minor_group.id = unit_group.minor_group_id").
		Joins("JOIN sub_major_group ON sub_major_group.id = minor_group.sub_major_group_id").
		Joins("JOIN meta_data ON meta_data.occupation_group_id = occupation_group.id").
		Joins("JOIN job_post ON job_post.id = meta_data.job_post_id").
		Where("sub_major_group.major_group_id = ? AND meta_data.end_date IS NULL AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", occupationID, year).
		Group("occupation_group.id, occupation_group.name").
		Order("open_job_count DESC").
		Limit(3).
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetYearlyJobTrendByIndustry(industryID uint) ([]models.IndustryYearlyTrend, error) {
	var results []models.IndustryYearlyTrend

	now := time.Now()
	startOfTwoYearsAgo := time.Date(now.Year()-2, time.January, 1, 0, 0, 0, 0, now.Location())

	err := r.db.Table("job_post").
		Select("EXTRACT(YEAR FROM meta_data.posted_at)::int AS year, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND meta_data.posted_at IS NOT NULL AND meta_data.posted_at >= ?", industryID, startOfTwoYearsAgo).
		Group("EXTRACT(YEAR FROM meta_data.posted_at)").
		Order("year ASC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetJobCountByExperienceForIndustryAndYear(industryID uint, year int) ([]models.ExperienceYearlyJobCount, error) {
	var results []models.ExperienceYearlyJobCount

	err := r.db.Table("experience").
		Select("experience.id, experience.name, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.experience_id = experience.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("LEFT JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("LEFT JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("LEFT JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND industry_division.industry_sector_id = ?", industryID).
		Group("experience.id, experience.name").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetProvinceWiseJobCountForIndustryAndYear(industryID uint, year int) ([]models.ProvinceJobCount, error) {
	var results []models.ProvinceJobCount

	err := r.db.Table("geo_data").
		Select("geo_data.id, geo_data.province, geo_data.latitude, geo_data.longitude, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.geo_data_id = geo_data.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("LEFT JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("LEFT JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("LEFT JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND industry_division.industry_sector_id = ?", industryID).
		Group("geo_data.id, geo_data.province, geo_data.latitude, geo_data.longitude").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetJobCountByEducationLevelForIndustryAndYear(industryID uint, year int) ([]models.EducationLevelYearlyJobCount, error) {
	var results []models.EducationLevelYearlyJobCount

	err := r.db.Table("education_level").
		Select("education_level.id, education_level.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.education_level_id = education_level.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("LEFT JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("LEFT JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("LEFT JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND industry_division.industry_sector_id = ?", industryID).
		Group("education_level.id, education_level.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetJobCountByVocationalEducationForIndustryAndYear(industryID uint, year int) ([]models.VocationalEducationYearlyJobCount, error) {
	var results []models.VocationalEducationYearlyJobCount

	err := r.db.Table("vocational_education").
		Select("vocational_education.id, vocational_education.level, COALESCE(SUM(job_post.no_of_vacancies), 0) AS open_job_count").
		Joins("LEFT JOIN meta_data ON meta_data.vocational_education_id = vocational_education.id AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", year).
		Joins("LEFT JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("LEFT JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("LEFT JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("LEFT JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Joins("LEFT JOIN job_post ON job_post.id = meta_data.job_post_id AND industry_division.industry_sector_id = ?", industryID).
		Group("vocational_education.id, vocational_education.level").
		Order("open_job_count DESC").
		Scan(&results).Error

	return results, err
}

func (r *JobRepository) GetTopHiringEmployersForIndustryAndYear(industryID uint, year int) ([]models.TopEmployerByIndustryYear, error) {
	var results []models.TopEmployerByIndustryYear

	err := r.db.Table("employer").
		Select("employer.id, employer.name, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN job_post ON job_post.employer_id = employer.id").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Joins("JOIN industry_subclass ON industry_subclass.id = meta_data.industry_subclass_id").
		Joins("JOIN industry_class ON industry_class.id = industry_subclass.industry_class_id").
		Joins("JOIN industry_group ON industry_group.id = industry_class.industry_group_id").
		Joins("JOIN industry_division ON industry_division.id = industry_group.industry_division_id").
		Where("industry_division.industry_sector_id = ? AND EXTRACT(YEAR FROM meta_data.posted_at) = ?", industryID, year).
		Group("employer.id, employer.name").
		Order("open_job_count DESC").
		Limit(10).
		Scan(&results).Error

	return results, err
}

// Employment sector analytics
func (r *JobRepository) GetYearlyTrendByEmploymentSector(employmentSectorID uint) ([]models.EmploymentSectorYearlyTrend, error) {
	var results []models.EmploymentSectorYearlyTrend

	now := time.Now()
	startOfTwoYearsAgo := time.Date(now.Year()-2, time.January, 1, 0, 0, 0, 0, now.Location())

	err := r.db.Table("job_post").
		Select("EXTRACT(YEAR FROM meta_data.posted_at)::int AS year, SUM(job_post.no_of_vacancies) AS open_job_count").
		Joins("JOIN meta_data ON meta_data.job_post_id = job_post.id").
		Where("meta_data.employment_sector_id = ? AND meta_data.posted_at IS NOT NULL AND meta_data.posted_at >= ?", employmentSectorID, startOfTwoYearsAgo).
		Group("EXTRACT(YEAR FROM meta_data.posted_at)").
		Order("year ASC").
		Scan(&results).Error

	return results, err
}

// Methods need to multi level filtering in the Crawler
// Occupation levels by parent ids
func (r *JobRepository) GetSubMajorGroupsByMajorGroup(majorGroupID uint) ([]models.SubMajorGroup, error) {
	var items []models.SubMajorGroup
	err := r.db.Where("major_group_id = ?", majorGroupID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetMinorGroupsBySubMajorGroup(subMajorGroupID uint) ([]models.MinorGroup, error) {
	var items []models.MinorGroup
	err := r.db.Where("sub_major_group_id = ?", subMajorGroupID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetUnitGroupsByMinorGroup(minorGroupID uint) ([]models.UnitGroup, error) {
	var items []models.UnitGroup
	err := r.db.Where("minor_group_id = ?", minorGroupID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetOccupationGroupsByUnitGroup(unitGroupID uint) ([]models.OccupationGroup, error) {
	var items []models.OccupationGroup
	err := r.db.Where("unit_group_id = ?", unitGroupID).Find(&items).Error
	return items, err
}

// Industry levels by parent ids
func (r *JobRepository) GetIndustryDivisionsByIndustrySector(industrySectorID uint) ([]models.IndustryDivision, error) {
	var items []models.IndustryDivision
	err := r.db.Where("industry_sector_id = ?", industrySectorID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetIndustryGroupsByIndustryDivision(industryDivisionID uint) ([]models.IndustryGroup, error) {
	var items []models.IndustryGroup
	err := r.db.Where("industry_division_id = ?", industryDivisionID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetIndustryClassesByIndustryGroup(industryGroupID uint) ([]models.IndustryClass, error) {
	var items []models.IndustryClass
	err := r.db.Where("industry_group_id = ?", industryGroupID).Find(&items).Error
	return items, err
}

func (r *JobRepository) GetIndustrySubclassesByIndustryClass(industryClassID uint) ([]models.IndustrySubclass, error) {
	var items []models.IndustrySubclass
	err := r.db.Where("industry_class_id = ?", industryClassID).Find(&items).Error
	return items, err
}

// CRUD for database entities
// Geo data CRUD
func (r *JobRepository) CreateGeoData(item *models.GeoData) error {
	return r.db.Create(item).Error
}

func (r *JobRepository) GetAllGeoData() ([]models.GeoData, error) {
	var items []models.GeoData
	err := r.db.Find(&items).Error
	return items, err
}

func (r *JobRepository) GetGeoDataByID(id uint) (models.GeoData, error) {
	var item models.GeoData
	err := r.db.First(&item, id).Error
	return item, err
}

func (r *JobRepository) UpdateGeoData(id uint, updates map[string]interface{}) (models.GeoData, error) {
	var item models.GeoData
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}

func (r *JobRepository) DeleteGeoData(id uint) error {
	return r.db.Delete(&models.GeoData{}, id).Error
}

// Education level CRUD
func (r *JobRepository) CreateEducationLevel(item *models.EducationLevel) error {
	return r.db.Create(item).Error
}

func (r *JobRepository) GetAllEducationLevels() ([]models.EducationLevel, error) {
	var items []models.EducationLevel
	err := r.db.Find(&items).Error
	return items, err
}

func (r *JobRepository) GetEducationLevelByID(id uint) (models.EducationLevel, error) {
	var item models.EducationLevel
	err := r.db.First(&item, id).Error
	return item, err
}

func (r *JobRepository) UpdateEducationLevel(id uint, updates map[string]interface{}) (models.EducationLevel, error) {
	var item models.EducationLevel
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}

func (r *JobRepository) DeleteEducationLevel(id uint) error {
	return r.db.Delete(&models.EducationLevel{}, id).Error
}

// Formality CRUD
func (r *JobRepository) CreateFormality(item *models.Formality) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllFormalities() ([]models.Formality, error) {
	var items []models.Formality
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetFormalityByID(id uint) (models.Formality, error) {
	var item models.Formality
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateFormality(id uint, updates map[string]interface{}) (models.Formality, error) {
	var item models.Formality
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteFormality(id uint) error {
	return r.db.Delete(&models.Formality{}, id).Error
}

// Gender CRUD
func (r *JobRepository) CreateGender(item *models.Gender) error {
	return r.db.Create(item).Error
}

func (r *JobRepository) GetAllGenders() ([]models.Gender, error) {
	var items []models.Gender
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetGenderByID(id uint) (models.Gender, error) {
	var item models.Gender
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateGender(id uint, updates map[string]interface{}) (models.Gender, error) {
	var item models.Gender
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteGender(id uint) error {
	return r.db.Delete(&models.Gender{}, id).Error
}

// Employment Sector CRUD
func (r *JobRepository) CreateEmploymentSector(item *models.EmploymentSector) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllEmploymentSectors() ([]models.EmploymentSector, error) {
	var items []models.EmploymentSector
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetEmploymentSectorByID(id uint) (models.EmploymentSector, error) {
	var item models.EmploymentSector
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateEmploymentSector(id uint, updates map[string]interface{}) (models.EmploymentSector, error) {
	var item models.EmploymentSector
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteEmploymentSector(id uint) error {
	return r.db.Delete(&models.EmploymentSector{}, id).Error
}

// Vocational Education CRUD
func (r *JobRepository) CreateVocationalEducation(item *models.VocationalEducation) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllVocationalEducations() ([]models.VocationalEducation, error) {
	var items []models.VocationalEducation
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetVocationalEducationByID(id uint) (models.VocationalEducation, error) {
	var item models.VocationalEducation
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateVocationalEducation(id uint, updates map[string]interface{}) (models.VocationalEducation, error) {
	var item models.VocationalEducation
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteVocationalEducation(id uint) error {
	return r.db.Delete(&models.VocationalEducation{}, id).Error
}

// Experience CRUD
func (r *JobRepository) CreateExperience(item *models.Experience) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetExperienceByID(id uint) (models.Experience, error) {
	var item models.Experience
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateExperience(id uint, updates map[string]interface{}) (models.Experience, error) {
	var item models.Experience
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteExperience(id uint) error {
	return r.db.Delete(&models.Experience{}, id).Error
}

// Major Group CRUD
func (r *JobRepository) CreateMajorGroup(item *models.MajorGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllMajorGroups() ([]models.MajorGroup, error) {
	var items []models.MajorGroup
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetMajorGroupByID(id uint) (models.MajorGroup, error) {
	var item models.MajorGroup
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateMajorGroup(id uint, updates map[string]interface{}) (models.MajorGroup, error) {
	var item models.MajorGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteMajorGroup(id uint) error {
	return r.db.Delete(&models.MajorGroup{}, id).Error
}

// Sub Major Group CRUD
func (r *JobRepository) CreateSubMajorGroup(item *models.SubMajorGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllSubMajorGroups() ([]models.SubMajorGroup, error) {
	var items []models.SubMajorGroup
	err := r.db.Preload("MajorGroup").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetSubMajorGroupByID(id uint) (models.SubMajorGroup, error) {
	var item models.SubMajorGroup
	err := r.db.Preload("MajorGroup").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateSubMajorGroup(id uint, updates map[string]interface{}) (models.SubMajorGroup, error) {
	var item models.SubMajorGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteSubMajorGroup(id uint) error {
	return r.db.Delete(&models.SubMajorGroup{}, id).Error
}

// Minor Group CRUD
func (r *JobRepository) CreateMinorGroup(item *models.MinorGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllMinorGroups() ([]models.MinorGroup, error) {
	var items []models.MinorGroup
	err := r.db.Preload("SubMajorGroup").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetMinorGroupByID(id uint) (models.MinorGroup, error) {
	var item models.MinorGroup
	err := r.db.Preload("SubMajorGroup").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateMinorGroup(id uint, updates map[string]interface{}) (models.MinorGroup, error) {
	var item models.MinorGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteMinorGroup(id uint) error {
	return r.db.Delete(&models.MinorGroup{}, id).Error
}

// Unit Group CRUD
func (r *JobRepository) CreateUnitGroup(item *models.UnitGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllUnitGroups() ([]models.UnitGroup, error) {
	var items []models.UnitGroup
	err := r.db.Preload("MinorGroup").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetUnitGroupByID(id uint) (models.UnitGroup, error) {
	var item models.UnitGroup
	err := r.db.Preload("MinorGroup").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateUnitGroup(id uint, updates map[string]interface{}) (models.UnitGroup, error) {
	var item models.UnitGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteUnitGroup(id uint) error {
	return r.db.Delete(&models.UnitGroup{}, id).Error
}

// Ocation Group CRUD
func (r *JobRepository) CreateOccupationGroup(item *models.OccupationGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllOccupationGroups(limit, offset int) ([]models.OccupationGroup, int64, error) {
	var items []models.OccupationGroup
	var total int64

	if err := r.db.Model(&models.OccupationGroup{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := r.db.Preload("UnitGroup")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("id ASC").Find(&items).Error

	return items, total, err
}
 
func (r *JobRepository) GetOccupationGroupByID(id uint) (models.OccupationGroup, error) {
	var item models.OccupationGroup
	err := r.db.Preload("UnitGroup").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateOccupationGroup(id uint, updates map[string]interface{}) (models.OccupationGroup, error) {
	var item models.OccupationGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteOccupationGroup(id uint) error {
	return r.db.Delete(&models.OccupationGroup{}, id).Error
}

// Industry sector CRUD
func (r *JobRepository) CreateIndustrySector(item *models.IndustrySector) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllIndustrySectors() ([]models.IndustrySector, error) {
	var items []models.IndustrySector
	err := r.db.Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetIndustrySectorByID(id uint) (models.IndustrySector, error) {
	var item models.IndustrySector
	err := r.db.First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateIndustrySector(id uint, updates map[string]interface{}) (models.IndustrySector, error) {
	var item models.IndustrySector
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteIndustrySector(id uint) error {
	return r.db.Delete(&models.IndustrySector{}, id).Error
}

// Industry division CRUD
func (r *JobRepository) CreateIndustryDivision(item *models.IndustryDivision) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllIndustryDivisions() ([]models.IndustryDivision, error) {
	var items []models.IndustryDivision
	err := r.db.Preload("IndustrySector").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetIndustryDivisionByID(id uint) (models.IndustryDivision, error) {
	var item models.IndustryDivision
	err := r.db.Preload("IndustrySector").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateIndustryDivision(id uint, updates map[string]interface{}) (models.IndustryDivision, error) {
	var item models.IndustryDivision
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteIndustryDivision(id uint) error {
	return r.db.Delete(&models.IndustryDivision{}, id).Error
}

// Industry group CRUD
func (r *JobRepository) CreateIndustryGroup(item *models.IndustryGroup) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllIndustryGroups() ([]models.IndustryGroup, error) {
	var items []models.IndustryGroup
	err := r.db.Preload("IndustryDivision").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetIndustryGroupByID(id uint) (models.IndustryGroup, error) {
	var item models.IndustryGroup
	err := r.db.Preload("IndustryDivision").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateIndustryGroup(id uint, updates map[string]interface{}) (models.IndustryGroup, error) {
	var item models.IndustryGroup
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteIndustryGroup(id uint) error {
	return r.db.Delete(&models.IndustryGroup{}, id).Error
}

// Industry class CRUD
func (r *JobRepository) CreateIndustryClass(item *models.IndustryClass) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllIndustryClasses() ([]models.IndustryClass, error) {
	var items []models.IndustryClass
	err := r.db.Preload("IndustryGroup").Find(&items).Error
	return items, err
}
 
func (r *JobRepository) GetIndustryClassByID(id uint) (models.IndustryClass, error) {
	var item models.IndustryClass
	err := r.db.Preload("IndustryGroup").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateIndustryClass(id uint, updates map[string]interface{}) (models.IndustryClass, error) {
	var item models.IndustryClass
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteIndustryClass(id uint) error {
	return r.db.Delete(&models.IndustryClass{}, id).Error
}

// Industry sub class CRUD
func (r *JobRepository) CreateIndustrySubclass(item *models.IndustrySubclass) error {
	return r.db.Create(item).Error
}
 
func (r *JobRepository) GetAllIndustrySubclasses(limit, offset int) ([]models.IndustrySubclass, int64, error) {
	var items []models.IndustrySubclass
	var total int64

	if err := r.db.Model(&models.IndustrySubclass{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := r.db.Preload("IndustryClass")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("id ASC").Find(&items).Error
	return items, total, err
}
 
func (r *JobRepository) GetIndustrySubclassByID(id uint) (models.IndustrySubclass, error) {
	var item models.IndustrySubclass
	err := r.db.Preload("IndustryClass").First(&item, id).Error
	return item, err
}
 
func (r *JobRepository) UpdateIndustrySubclass(id uint, updates map[string]interface{}) (models.IndustrySubclass, error) {
	var item models.IndustrySubclass
	if err := r.db.First(&item, id).Error; err != nil {
		return item, err
	}
	if err := r.db.Model(&item).Updates(updates).Error; err != nil {
		return item, err
	}
	return item, nil
}
 
func (r *JobRepository) DeleteIndustrySubclass(id uint) error {
	return r.db.Delete(&models.IndustrySubclass{}, id).Error
}