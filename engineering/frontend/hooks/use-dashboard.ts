import { useQuery } from "@tanstack/react-query";
import { ENV } from "@/config/env";
import {
  DashboardOverview,
  OccupationAnalytics,
  IndustryAnalytics,
  EmploymentSectorAnalytics,
} from "@/types/dashboard";

const BASE = ENV.NEXT_PUBLIC_API_BASE_URL;

//Overview (on page load)
async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${BASE}/dashboard/overview`);
  if (!res.ok) throw new Error("Failed to fetch dashboard overview");
  return res.json();
}

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn:  fetchDashboardOverview,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

//Occupation analytics
async function fetchOccupationAnalytics(occupationId: number, year: number): Promise<OccupationAnalytics> {
  const res = await fetch(`${BASE}/dashboard/occupation-analytics?occupation_id=${occupationId}&year=${year}`);
  if (!res.ok) throw new Error("Failed to fetch occupation analytics");
  return res.json();
}

export function useOccupationAnalytics(occupationId: number | null, year: number) {
  return useQuery<OccupationAnalytics>({
    queryKey: ["dashboard", "occupation-analytics", occupationId, year],
    queryFn:  () => fetchOccupationAnalytics(occupationId!, year),
    enabled:  occupationId !== null,
    staleTime: 1000 * 60 * 5,
  });
}

//Industry analytics
async function fetchIndustryAnalytics(
  industryId: number,
  year: number
): Promise<IndustryAnalytics> {
  const res = await fetch(
    `${BASE}/dashboard/industry-analytics?industry_id=${industryId}&year=${year}`
  );
  if (!res.ok) throw new Error("Failed to fetch industry analytics");
  return res.json();
}

export function useIndustryAnalytics(industryId: number | null, year: number) {
  return useQuery<IndustryAnalytics>({
    queryKey: ["dashboard", "industry-analytics", industryId, year],
    queryFn:  () => fetchIndustryAnalytics(industryId!, year),
    enabled:  industryId !== null,
    staleTime: 1000 * 60 * 5,
  });
}

// Employment sector analytics
async function fetchEmploymentSectorAnalytics(employmentSectorId: number): Promise<EmploymentSectorAnalytics> {
  const res = await fetch(`${BASE}/dashboard/employment-sector-analytics?employment_sector_id=${employmentSectorId}`)
  if (!res.ok) throw new Error("Failed to fetch employment sector analytics");
  return res.json();
}

export function useEmploymentSectorAnalytics(employmentSectorId: number | null) {
  return useQuery<EmploymentSectorAnalytics>({
    queryKey: ["employment-sector-analytics", employmentSectorId],
    queryFn: () => fetchEmploymentSectorAnalytics(employmentSectorId!),
    enabled: employmentSectorId !== null,
    staleTime: 1000 * 60 * 5,
  });
}