import { NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET() {
  try {
    const [
      activeJobs,
      byOccupation,
      byIndustry,
      byExperience,
      byEducation,
      byFormality,
      byEmploymentSector,
      byGender,
      byVocationalEducation,
      remoteVsOnsite,
      byJobType,
    ] = await Promise.all([
      fetch(`${GO_API}/stats/active-jobs`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-occupation`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-industry`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-experience`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-education`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-formality`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-employment-sector`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-gender`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-vocational-education`).then((r) => r.json()),
      fetch(`${GO_API}/stats/remote-vs-onsite`).then((r) => r.json()),
      fetch(`${GO_API}/stats/by-job-type`).then((r) => r.json()),
    ]);

    return NextResponse.json({
      active_jobs: activeJobs,
      by_occupation: byOccupation,
      by_industry: byIndustry,
      by_experience: byExperience,
      by_education: byEducation,
      by_formality: byFormality,
      by_employment_sector: byEmploymentSector,
      by_gender: byGender,
      by_vocational_education: byVocationalEducation,
      remote_vs_onsite: remoteVsOnsite,
      by_job_type: byJobType,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dashboard overview data" },
      { status: 500 }
    );
  }
}