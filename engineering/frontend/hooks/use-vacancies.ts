import { useQuery } from "@tanstack/react-query";
import { ENV } from "@/config/env";
import {
  VacancyMetadata,
  VacancyListParams,
  VacancyListResponse,
} from "@/types/vacancy";

const BASE = ENV.NEXT_PUBLIC_API_BASE_URL;

// Metadata (industries, provinces, job types, experiences)
async function fetchVacancyMetadata(): Promise<VacancyMetadata> {
  const res = await fetch(`${BASE}/vacancies/metadata`);
  if (!res.ok) throw new Error("Failed to fetch vacancy metadata");
  return res.json();
}

export function useVacancyMetadata() {
  return useQuery<VacancyMetadata>({
    queryKey: ["vacancies", "metadata"],
    queryFn:  fetchVacancyMetadata,
    staleTime: 1000 * 60 * 10, // 10 minutes — filter options rarely change
  });
}

// Vacancies list (with optional filters) 
async function fetchVacancies(params: VacancyListParams): Promise<VacancyListResponse> {
  const query = new URLSearchParams();
  if (params.industry_id)   query.set("industry_id",   String(params.industry_id));
  if (params.geo_data_id)   query.set("geo_data_id",   String(params.geo_data_id));
  if (params.job_type_id)   query.set("job_type_id",   String(params.job_type_id));
  if (params.experience_id) query.set("experience_id", String(params.experience_id));
  if (params.limit !== undefined)  query.set("limit",  String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const qs = query.toString();
  const res = await fetch(`${BASE}/vacancies${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch vacancies");
  return res.json();
}

export function useVacancies(params: VacancyListParams) {
  return useQuery<VacancyListResponse>({
    queryKey: ["vacancies", "list", params],
    queryFn:  () => fetchVacancies(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}