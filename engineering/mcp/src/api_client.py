import httpx
import os

GO_API_URL = os.getenv("GO_API_URL", "http://localhost:8080/api/v1")
CRAWLER_API_URL = os.getenv("CRAWLER_API_URL", "http://localhost:8000")

_client = httpx.AsyncClient(base_url=GO_API_URL, timeout=10.0)
_crawler_client = httpx.AsyncClient(base_url=CRAWLER_API_URL, timeout=300.0)


async def get(path: str, params: dict = None) -> dict:
    """Base GET helper — raises on non-2xx responses."""
    response = await _client.get(path, params=params)
    response.raise_for_status()
    return response.json()

#Manual vacancy submission (newspaper uploads via crawler service)
async def submit_vacancies_manually(jobs: list[dict]) -> dict:
    response = await _crawler_client.post("/manual-upload-jobs", json=jobs)
    response.raise_for_status()
    return response.json()


#Reference data 

async def get_industries():
    return await get("/industries")

async def get_occupations():
    return await get("/stats/by-occupation")

async def get_provinces():
    return await get("/provinces")

async def get_experiences():
    return await get("/experiences")

async def get_job_types():
    return await get("/job-types")

async def get_sources():
    return await get("/sources")


#Active jobs

async def get_active_jobs(
    industry_id:   int = None,
    geo_data_id:   int = None,
    job_type_id:   int = None,
    experience_id: int = None,
):
    params = {}
    if industry_id:   params["industry_id"]   = industry_id
    if geo_data_id:   params["geo_data_id"]   = geo_data_id
    if job_type_id:   params["job_type_id"]   = job_type_id
    if experience_id: params["experience_id"] = experience_id
    return await get("/jobs", params=params)


#Dashboard / national stats

async def get_active_job_stats():
    return await get("/stats/active-jobs")

async def get_stats_by_industry():
    return await get("/stats/by-industry")

async def get_stats_by_occupation():
    return await get("/stats/by-occupation")

async def get_stats_by_experience():
    return await get("/stats/by-experience")

async def get_stats_by_education():
    return await get("/stats/by-education")

async def get_remote_vs_onsite():
    return await get("/stats/remote-vs-onsite")

async def get_stats_by_job_type():
    return await get("/stats/by-job-type")


#Industry skill analytics

async def get_industry_skills_count(industry_id: int):
    return await get("/industries/skills/count", params={"industry_id": industry_id})

async def get_industry_top_demand_skill(industry_id: int):
    return await get("/industries/skills/top-demand", params={"industry_id": industry_id})

async def get_industry_top15_skills(industry_id: int):
    return await get("/industries/skills/top15", params={"industry_id": industry_id})

async def get_industry_all_skills(industry_id: int):
    return await get("/industries/skills", params={"industry_id": industry_id})

async def get_industry_top_employers(industry_id: int):
    return await get("/industries/employers", params={"industry_id": industry_id})

async def get_industry_yearly_trend(industry_id: int):
    return await get("/industries/yearly-trend", params={"industry_id": industry_id})


#Industry year-scoped analytics

async def get_industry_by_experience(industry_id: int, year: int):
    return await get("/industries/by-experience", params={"industry_id": industry_id, "year": year})

async def get_industry_by_province(industry_id: int, year: int):
    return await get("/industries/by-province", params={"industry_id": industry_id, "year": year})

async def get_industry_by_education(industry_id: int, year: int):
    return await get("/industries/by-education", params={"industry_id": industry_id, "year": year})

async def get_industry_top_employers_by_year(industry_id: int, year: int):
    return await get("/industries/top-employers", params={"industry_id": industry_id, "year": year})


#Occupation analytics

async def get_occupation_yearly_trend(occupation_id: int):
    return await get("/occupations/yearly-trend", params={"occupation_id": occupation_id})

async def get_occupation_by_formality(occupation_id: int, year: int):
    return await get("/occupations/by-formality", params={"occupation_id": occupation_id, "year": year})

async def get_occupation_by_gender(occupation_id: int, year: int):
    return await get("/occupations/by-gender", params={"occupation_id": occupation_id, "year": year})

async def get_occupation_top_job_roles(occupation_id: int, year: int):
    return await get("/occupations/top-job-roles", params={"occupation_id": occupation_id, "year": year})


#Crawler monitoring

async def get_crawler_last_job_count():
    return await get("/crawler/last-job-count")

async def get_crawler_time_gap():
    return await get("/crawler/time-gap")

async def get_crawler_runs():
    return await get("/crawler/runs")