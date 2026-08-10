import asyncio
import json
import os
import logging

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import src.api_client as api

app = Server("marketlens-mcp")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mcp")


def ok(data: dict) -> list[TextContent]:
    """Wrap any dict as a successful MCP text response."""
    return [TextContent(type="text", text=json.dumps(data, indent=2, ensure_ascii=False))]


def err(message: str) -> list[TextContent]:
    """Wrap an error message as an MCP text response."""
    return [TextContent(type="text", text=json.dumps({"error": message}, indent=2))]


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [

        #Manual vacancy upload
        Tool(
            name="submit_vacancies",
            description=(
                "Submit a list of extracted job vacancies (e.g. from a scanned newspaper) "
                "for deduplication and classification into the job market database. "
                "Each job must include employer, job_role, location, description, and source."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "jobs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "employer":    {"type": "string"},
                                "job_role":    {"type": "string"},
                                "location":    {"type": "string"},
                                "description": {"type": "string"},
                                "source":      {"type": "string"},
                            },
                            "required": ["employer", "job_role", "location", "description", "source"],
                        },
                    },
                },
                "required": ["jobs"],
            },
        ),

        #Reference data
        Tool(
            name="get_industries",
            description="Get all 21 SLSIC industry classifications with their IDs and active job counts.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_occupations",
            description="Get all 10 SLSO occupation bands with their IDs and active job counts.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_provinces",
            description="Get all 9 Sri Lankan provinces with their IDs and coordinates.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_experiences",
            description="Get all experience level classifications with their IDs.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_job_types",
            description="Get all job type classifications such as Full Time and Part Time with their IDs.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_sources",
            description="Get all registered crawl sources with their active job post counts.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),

        #Active jobs
        Tool(
            name="get_active_jobs",
            description=(
                "Get active job listings with optional filters. "
                "All filters are optional — omit any to get all values for that dimension. "
                "Use get_industries, get_provinces, get_job_types, get_experiences first to find valid IDs."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "industry_id":   {"type": "integer", "description": "Filter by industry ID"},
                    "geo_data_id":   {"type": "integer", "description": "Filter by province ID"},
                    "job_type_id":   {"type": "integer", "description": "Filter by job type ID"},
                    "experience_id": {"type": "integer", "description": "Filter by experience level ID"},
                },
                "required": [],
            },
        ),

        #National market overview
        Tool(
            name="get_market_overview",
            description=(
                "Get a complete national labour market snapshot in one call: "
                "active vacancy count with month-over-month trend, "
                "distribution by industry, occupation, experience, education, "
                "remote vs onsite split, and job type breakdown."
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_active_job_count_with_trend",
            description=(
                "Get total active job count and percentage change compared to last month "
                "with trend direction: up, down, or stable."
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="get_remote_vs_onsite_split",
            description="Get the count of remote-eligible vs on-site-only active job postings.",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),

        #Industry analytics
        Tool(
            name="get_industry_skill_summary",
            description=(
                "Get skill analytics for a specific industry: "
                "unique skill count, most in-demand skill, top 15 skills, and top hiring employers. "
                "Use get_industries first to find the correct industry_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "industry_id": {"type": "integer", "description": "Industry ID from get_industries"},
                },
                "required": ["industry_id"],
            },
        ),
        Tool(
            name="get_industry_all_skills",
            description=(
                "Get the complete ranked list of all skills and their active job post counts "
                "for a specific industry. Use get_industries first to find the correct industry_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "industry_id": {"type": "integer", "description": "Industry ID from get_industries"},
                },
                "required": ["industry_id"],
            },
        ),
        Tool(
            name="get_industry_yearly_trend",
            description=(
                "Get the 3-year historical job posting trend for a specific industry "
                "(current year and 2 prior years). Use get_industries first to find the correct industry_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "industry_id": {"type": "integer", "description": "Industry ID from get_industries"},
                },
                "required": ["industry_id"],
            },
        ),
        Tool(
            name="get_industry_deep_dive",
            description=(
                "Get a full year-scoped breakdown for a specific industry: "
                "experience distribution, province allocation, education distribution, "
                "and top hiring employers for that year. "
                "Use get_industries first to find the correct industry_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "industry_id": {"type": "integer", "description": "Industry ID from get_industries"},
                    "year":        {"type": "integer", "description": "Calendar year e.g. 2026"},
                },
                "required": ["industry_id", "year"],
            },
        ),

        #Occupation analytics
        Tool(
            name="get_occupation_analytics",
            description=(
                "Get analytics for a specific occupation band: "
                "3-year job posting trend, formality breakdown, gender breakdown, "
                "and top 3 most in-demand job roles for a given year. "
                "Use get_occupations first to find the correct occupation_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "occupation_id": {"type": "integer", "description": "Occupation ID from get_occupations"},
                    "year": {"type": "integer", "description": "Calendar year e.g. 2026"},
                },
                "required": ["occupation_id", "year"],
            },
        ),

        Tool(
            name="get_occupation_yearly_trend",
            description=(
                "Get the 3-year historical job posting trend for a specific occupation "
                "(current year and 2 prior years). Use get_occupations first to find the correct occupation_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "occupation_id": {"type": "integer", "description": "Occupation ID from get_occupations"},
                },
                "required": ["occupation_id"],
            },
        ),

        #Crawler monitoring
        Tool(
            name="get_crawler_status",
            description=(
                "Get the current crawler health: "
                "how many jobs were collected in the last run, "
                "how long ago the last crawl ran, "
                "and the full crawler run history with statuses."
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]



@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:

        #Manual vacancy ingestion
        if name == "submit_vacancies":
            return ok(await api.submit_vacancies_manually(arguments["jobs"]))

        #Reference data
        if name == "get_industries":
            return ok(await api.get_industries())

        if name == "get_occupations":
            return ok(await api.get_occupations())

        if name == "get_provinces":
            return ok(await api.get_provinces())

        if name == "get_experiences":
            return ok(await api.get_experiences())

        if name == "get_job_types":
            return ok(await api.get_job_types())

        if name == "get_sources":
            return ok(await api.get_sources())

        #Active jobs
        if name == "get_active_jobs":
            return ok(await api.get_active_jobs(
                industry_id=arguments.get("industry_id"),
                geo_data_id=arguments.get("geo_data_id"),
                job_type_id=arguments.get("job_type_id"),
                experience_id=arguments.get("experience_id"),
            ))

        #National market overview
        if name == "get_market_overview":
            active_jobs, by_industry, by_occupation, by_experience, by_education, remote_onsite, by_job_type = await asyncio.gather(
                api.get_active_job_stats(),
                api.get_stats_by_industry(),
                api.get_stats_by_occupation(),
                api.get_stats_by_experience(),
                api.get_stats_by_education(),
                api.get_remote_vs_onsite(),
                api.get_stats_by_job_type(),
            )
            return ok({
                "active_jobs":      active_jobs,
                "by_industry":      by_industry,
                "by_occupation":    by_occupation,
                "by_experience":    by_experience,
                "by_education":     by_education,
                "remote_vs_onsite": remote_onsite,
                "by_job_type":      by_job_type,
            })

        if name == "get_active_job_count_with_trend":
            return ok(await api.get_active_job_stats())

        if name == "get_remote_vs_onsite_split":
            return ok(await api.get_remote_vs_onsite())

        #Industry analytics
        if name == "get_industry_skill_summary":
            industry_id = arguments["industry_id"]
            skills_count, top_demand, top15, top_employers = await asyncio.gather(
                api.get_industry_skills_count(industry_id),
                api.get_industry_top_demand_skill(industry_id),
                api.get_industry_top15_skills(industry_id),
                api.get_industry_top_employers(industry_id),
            )
            return ok({
                "unique_skills_count":  skills_count,
                "most_in_demand_skill": top_demand,
                "top_15_skills":        top15,
                "top_employers":        top_employers,
            })

        if name == "get_industry_all_skills":
            return ok(await api.get_industry_all_skills(arguments["industry_id"]))

        if name == "get_industry_yearly_trend":
            return ok(await api.get_industry_yearly_trend(arguments["industry_id"]))

        if name == "get_industry_deep_dive":
            industry_id = arguments["industry_id"]
            year        = arguments["year"]
            by_experience, by_province, by_education, top_employers = await asyncio.gather(
                api.get_industry_by_experience(industry_id, year),
                api.get_industry_by_province(industry_id, year),
                api.get_industry_by_education(industry_id, year),
                api.get_industry_top_employers_by_year(industry_id, year),
            )
            return ok({
                "industry_id":  industry_id,
                "year":         year,
                "by_experience": by_experience,
                "by_province":   by_province,
                "by_education":  by_education,
                "top_employers": top_employers,
            })

        #Occupation analytics
        if name == "get_occupation_analytics":
            if "occupation_id" not in arguments or "year" not in arguments:
                return err(
                    "get_occupation_analytics requires both 'occupation_id' and 'year'. "
                    f"Received arguments: {list(arguments.keys())}"
                )
            occupation_id = arguments["occupation_id"]
            year = arguments["year"]
            by_formality, by_gender, top_job_roles = await asyncio.gather(
                api.get_occupation_by_formality(occupation_id, year),
                api.get_occupation_by_gender(occupation_id, year),
                api.get_occupation_top_job_roles(occupation_id, year),
            )
            return ok({
                "occupation_id": occupation_id,
                "year":          year,
                "by_formality":  by_formality,
                "by_gender":     by_gender,
                "top_job_roles": top_job_roles,
            })

        if name == "get_occupation_yearly_trend":
            return ok(await api.get_occupation_yearly_trend(arguments["occupation_id"]))

        #Crawler monitoring
        if name == "get_crawler_status":
            last_job_count, time_gap, runs = await asyncio.gather(
                api.get_crawler_last_job_count(),
                api.get_crawler_time_gap(),
                api.get_crawler_runs(),
            )
            return ok({
                "last_crawl_job_count":  last_job_count,
                "time_since_last_crawl": time_gap,
                "crawler_run_history":   runs,
            })

        return err(f"Unknown tool: {name}")

    except Exception as e:
        return err(f"Tool '{name}' failed: {str(e)}")



async def main():
    logger.info(f"MCP server is started")
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())