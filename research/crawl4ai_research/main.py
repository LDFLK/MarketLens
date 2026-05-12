import asyncio
import os

from pathlib import Path
from dotenv import load_dotenv
from crawlers.ikman_jobs_crawler import ikman_jobs_extraction, get_last_page_from_text
from storage_handlers.handler import save_jobs_to_file
from crawlers.schemas.job_schema import JOB_EXTRACTION_SCHEMA, BASE_JOB_INSTRUCTION

env_path = Path(__file__).resolve().parent.parent.parent / '.env'

load_dotenv(dotenv_path=env_path)

print(f"API Key Loaded: {os.getenv('DEEPSEEK_API_KEY') is not None}")

async def main():
    print("=== Starting Multi-Site Crawl... ===")



    ikman_task = ikman_jobs_extraction()

    ikman_jobs = await ikman_task

    all_combined_jobs = ikman_jobs

    save_jobs_to_file(all_combined_jobs)



    print("\n=== Crawling Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nCrawling stopped by user.")