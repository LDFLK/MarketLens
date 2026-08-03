export interface ActiveJobStats {
  active_job_count: number;
  last_month_count: number;
  change_percent: number;
  trend: "up" | "down" | "stable";
}

export interface OccupationStat {
  id: number;
  name: string;
  open_job_count: number;
}

export interface IndustryStat {
  id: number;
  name: string;
  open_job_count: number;
}

export interface ExperienceStat {
  id: number;
  name: string;
  open_job_count: number;
}

export interface EducationStat {
  id: number;
  level: string;
  open_job_count: number;
}

export interface FormalityStat {
  id: number;
  formality_type: string;
  open_job_count: number;
}

export interface EmploymentSectorStat {
  id: number;
  sector: string;
  open_job_count: number;
}

export interface GenderStat {
  id: number;
  gender_type: string;
  open_job_count: number;
}

export interface VocationalEducationStat {
  id: number;
  level: string;
  open_job_count: number;
}

export interface RemoteOnSiteStat {
  remote_count: number;
  on_site_count: number;
}

export interface JobTypeStat {
  id: number;
  type: string;
  open_job_count: number;
}

export interface DashboardOverview {
  active_jobs:                ActiveJobStats;
  by_occupation:              { count: number; occupations: OccupationStat[] };
  by_industry:                { count: number; industries: IndustryStat[] };
  by_experience:              { count: number; experiences: ExperienceStat[] };
  by_education:               { count: number; education_levels: EducationStat[] };
  by_formality:               { count: number; formalities: FormalityStat[] };
  by_employment_sector:       { count: number; employment_sectors: EmploymentSectorStat[] };
  by_gender:                  { count: number; genders: GenderStat[] };
  by_vocational_education:    { count: number; vocational_educations: VocationalEducationStat[] };
  remote_vs_onsite:           RemoteOnSiteStat;
  by_job_type:                { count: number; job_types: JobTypeStat[] };
}

export interface YearlyTrend {
  year: number;
  open_job_count: number;
}

export interface TopJobRole {
  id: number;
  name: string;
  open_job_count: number;
}

export interface OccupationAnalytics {
  occupation_id: number;
  yearly_trend: {
    occupation_id: number;
    count: number;
    yearly_trend: YearlyTrend[];
  };
  by_formality: {
    major_group_id: number;
    year: number;
    count: number;
    formalities: FormalityStat[];
  };
  by_gender: {
    major_group_id: number;
    year: number;
    count: number;
    genders: GenderStat[];
  };
  top_job_roles: {
    occupation_id: number;
    top_job_roles: TopJobRole[];
  };
}

export interface IndustryProvince {
  id: number;
  province: string;
  lat: number;
  lng: number;
  open_job_count: number;
}

export interface IndustryEmployer {
  id: number;
  name: string;
  open_job_count: number;
}

export interface IndustryAnalytics {
  industry_id: number;
  year: number;
  yearly_trend: {
    industry_id: number;
    count: number;
    yearly_trend: YearlyTrend[];
  };
  by_experience: {
    industry_id: number;
    year: number;
    count: number;
    experiences: ExperienceStat[];
  };
  by_province: {
    industry_id: number;
    year: number;
    count: number;
    provinces: IndustryProvince[];
  };
  by_education: {
    industry_id: number;
    year: number;
    count: number;
    education_levels: EducationStat[];
  };
  by_vocational_education: {
    industry_id: number;
    year: number;
    count: number;
    vocational_educations: VocationalEducationStat[];
  };
  top_employers: {
    industry_id: number;
    year: number;
    count: number;
    employers: IndustryEmployer[];
  };
}

export interface EmploymentSectorAnalytics {
  employment_sector_id: number;
  yearly_trend: {
    count: number;
    employment_sector_id: number;
    yearly_trend: YearlyTrend[] | null;
  }
}