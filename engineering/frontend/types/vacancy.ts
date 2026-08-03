export interface VacancyMetadataIndustry {
  id: number;
  name: string;
}

export interface VacancyMetadataProvince {
  id: number;
  province: string;
  lat: number;
  lng: number;
}

export interface VacancyMetadataExperience {
  id: number;
  name: string;
}

export interface VacancyMetadataJobType {
  id: number;
  type: string;
}

export interface VacancyMetadata {
  industries:  VacancyMetadataIndustry[];
  experiences: VacancyMetadataExperience[];
  provinces:   VacancyMetadataProvince[];
  job_types:   VacancyMetadataJobType[];
}

export interface VacancySkill {
  id:    number;
  skill: string;
}

export interface VacancyEmployer {
  id:   number;
  name: string;
}

export interface VacancyJobType {
  id:   number;
  type: string;
}

export interface VacancyGeoData {
  id:       number;
  province: string;
  lat:      number;
  lng:      number;
}

export interface VacancyIndustry {
  id:   number;
  name: string;
}

export interface VacancyExperience {
  id:   number;
  name: string;
}

export interface VacancyMetaData {
  geo_data:   VacancyGeoData;
  industry:   VacancyIndustry;
  experience: VacancyExperience;
  posted_at:  string;
  end_date:   string | null;
}

export interface Vacancy {
  id:              number;
  employer:        VacancyEmployer;
  job_type:        VacancyJobType;
  job_role:        string;
  is_remote:       boolean;
  job_description: string;
  location:        string;
  meta_data:       VacancyMetaData;
  skills:          VacancySkill[];
}

export interface VacancyListParams {
  industry_id?:   number;
  geo_data_id?:   number;
  job_type_id?:   number;
  experience_id?: number;
  limit?: number;
  offset?: number;
}

export interface VacancyListResponse {
  count: number;
  jobs:  Vacancy[];
}