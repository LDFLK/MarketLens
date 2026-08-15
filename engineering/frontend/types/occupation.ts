export interface HierarchyNode {
  id: number;
  name: string;
  code: string;
}

export interface MajorGroupListResponse {
  count: number;
  major_groups: HierarchyNode[];
}
export interface SubMajorGroupChildrenResponse {
  major_group_id: number;
  count: number;
  sub_major_groups: HierarchyNode[];
}
export interface MinorGroupChildrenResponse {
  sub_major_group_id: number;
  count: number;
  minor_groups: HierarchyNode[];
}
export interface UnitGroupChildrenResponse {
  minor_group_id: number;
  count: number;
  unit_groups: HierarchyNode[];
}
export interface OccupationGroupChildrenResponse {
  unit_group_id: number;
  count: number;
  occupation_groups: HierarchyNode[];
}

export interface TotalJobCountResult {
  standard: string;
  level: string;
  id: number;
  total_job_count: number;
}

export interface ChildJobCount {
  id: number;
  name: string;
  code: string;
  open_job_count: number;
}

export interface ChildrenResult {
  standard: string;
  level: string;
  id: number;
  child_level: string;
  count: number;
  children: ChildJobCount[];
}

export interface EmploymentSectorStat { id: number; sector: string; open_job_count: number; }
export interface ExperienceStat { id: number; name: string; open_job_count: number; }
export interface ProvinceStat { id: number; province: string; lat: number; lng: number; open_job_count: number; }
export interface EducationLevelStat { id: number; level: string; open_job_count: number; }
export interface FormalityStat { id: number; formality_type: string; open_job_count: number; }
export interface GenderStat { id: number; gender_type: string; open_job_count: number; }
export interface VocationalEducationStat { id: number; level: string; open_job_count: number; }
export interface JobTypeStat { id: number; type: string; open_job_count: number; }
export interface RemoteOnSiteStat { remote_count: number; on_site_count: number; }

export interface OccupationAnalysisResponse {
  standard: string;
  level: string;
  id: string;
  from_date: string | null;
  to_date: string | null;
  total_job_count: TotalJobCountResult;
  children: ChildrenResult | null;
  employment_sector: { employment_sectors: EmploymentSectorStat[] };
  experience: { experiences: ExperienceStat[] };
  province: { provinces: ProvinceStat[] };
  education: { education_levels: EducationLevelStat[] };
  formality: { formalities: FormalityStat[] };
  gender: { genders: GenderStat[] };
  vocational_education: { vocational_educations: VocationalEducationStat[] };
  remote_onsite: { remote_vs_onsite: RemoteOnSiteStat };
  job_type: { job_types: JobTypeStat[] };
}

export interface SkillStat { id: number; skill: string; open_job_count: number; }
export interface EmployerStat { id: number; name: string; open_job_count: number; }

export interface Top15SkillsResponse {
  level: string; id: number; from_date: string; to_date: string;
  count: number; skills: SkillStat[];
}
export interface AllSkillsResponse {
  level: string; id: number; from_date: string; to_date: string;
  count: number; total: number; limit: number; offset: number; skills: SkillStat[];
}
export interface TopHiringEmployersResponse {
  level: string; id: number; from_date: string; to_date: string;
  count: number; employers: EmployerStat[];
}
export interface OccupationSkillsResponse {
  level: string; id: string; from_date: string | null; to_date: string | null;
  top_15_skills: Top15SkillsResponse;
  all_skills: AllSkillsResponse;
  top_hiring_employers: TopHiringEmployersResponse;
}