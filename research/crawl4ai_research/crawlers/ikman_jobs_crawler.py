import json
import asyncio
import re
import math
from typing import List
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig, LLMConfig, LLMExtractionStrategy
from crawlers.schemas.job_schema import JOB_EXTRACTION_SCHEMA, BASE_JOB_INSTRUCTION

async def get_last_page_from_text():
    async with AsyncWebCrawler() as crawler:
        
        result = await crawler.arun(url="https://ikman.lk/en/ads/sri-lanka/jobs")
        
        html_content = result.html
        
        match = re.search(r'of ([\d,]+) ads', html_content)
        
        if match:
            
            total_ads = int(match.group(1).replace(',', ''))
            ads_per_page = 25
            last_page = math.ceil(total_ads / ads_per_page)
            
            print(f"Total Ads: {total_ads}")
            print(f"Calculated Last Page: {last_page}")
            return last_page
        else:
            print("Could not find the total ad count text.")
            return 1
        



async def ikman_jobs_extraction(max_pages: int = 1):

    max_pages = await get_last_page_from_text()
    extracted_jobs_list = []
    
    detail_extraction_strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(
            provider="deepseek/deepseek-chat",
            api_token="env:DEEPSEEK_API_KEY",
        ),
        instruction=BASE_JOB_INSTRUCTION,
        schema=json.dumps(JOB_EXTRACTION_SCHEMA),
        extra_args={"base_url": "https://api.deepseek.com", "temperature": 0.0},
    )

    browser_config = BrowserConfig(headless=True)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        all_job_urls = []
        
        for page in range(1, max_pages + 1):
            
            url = f"https://ikman.lk/en/ads/sri-lanka/jobs?page={page}"
            print(f"Crawling listing page {page}: {url}")
            
            listing_result = await crawler.arun(
                url=url,
                config=CrawlerRunConfig(cache_mode="BYPASS")
            )

            if listing_result.success:
                
                current_page_links = [
                    link['href'] for link in listing_result.links.get("internal", []) 
                    if "/en/ad/" in link['href']
                ]
                all_job_urls.extend(current_page_links)
                print(f"Found {len(current_page_links)} links on page {page}.")
            else:
                print(f"Failed to crawl page {page}")

        unique_urls = list(set(all_job_urls))
        full_urls = [f"https://ikman.lk{url}" if url.startswith('/') else url for url in unique_urls]

        if not full_urls:
            print("No job URLs found across all pages!")
            return

        #limit_urls = full_urls[:] 
        print(f"Total jobs found: {len(full_urls)}.")
        
        detail_config = CrawlerRunConfig(
            extraction_strategy=detail_extraction_strategy,
            cache_mode="BYPASS"
        )

        results = await crawler.arun_many(urls=full_urls, config=detail_config)

        for result in results:
            if result.success:
                try:
                    data = json.loads(result.extracted_content)
                    print(json.dumps(data, indent=2))

                    if isinstance(data, list):
                        extracted_jobs_list.extend(data)
                    else:
                        extracted_jobs_list.append(data)
                except json.JSONDecodeError:
                    # Sometimes LLM output needs cleaning
                    print(f"Error parsing JSON for {result.url}")

        return extracted_jobs_list
