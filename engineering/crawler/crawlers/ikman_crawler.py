import os
import json
import httpx
import logging
from typing import List, Dict, Any

from crawlers.base_crawler import BaseJobCrawler
from utils.dedup_utils import JobDuplicationCheck
from parsers.ikman_parser import IkmanParser
from utils.occupation_classifier import OccupationClassifier
from utils.industry_classifier import IndustryClassifier
from config import BACKEND_BASE_URL, BATCH_SIZE

from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    BrowserConfig,
    LLMConfig,
    LLMExtractionStrategy,
    MemoryAdaptiveDispatcher,
)

logger = logging.getLogger(__name__)

class IkmanCrawler(BaseJobCrawler):

    def __init__(self):
        self.parser = IkmanParser()
        self.duplication_checker = JobDuplicationCheck()

    #This function returns the last page number from the site
    async def _get_last_page_from_text(self) -> int:
        import re
        import math

        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url="https://ikman.lk/en/ads/sri-lanka/jobs")
            html_content = result.html
            match = re.search(r'of ([\d,]+) ads', html_content)
            if match:
                total_ads = int(match.group(1).replace(',', ''))
                ads_per_page = 25
                last_page = math.ceil(total_ads / ads_per_page)
                logger.info(f"Total Ads: {total_ads}, Calculated Last Page: {last_page}")
                return last_page
            else:
                logger.warning("Could not find the total ad count text.")
                return 1

    #This funtion starts the crawler and save or update the job after checking whether job already exists or not
    async def crawl_jobs(
        self,
        crawler_run_id: int,
        async_client: httpx.AsyncClient,
        schema: dict,
        instruction: str,
        occupation_classifier: OccupationClassifier,
        industry_classifier: IndustryClassifier,
    ) -> None:

        count = 1
        #max_pages = await self._get_last_page_from_text()
        max_pages = 1

        new_jobs_buffer: List[Dict[str, Any]] = []
        lsh_index_buffer: List[Dict[str, Any]] = []
        updated_jobs_buffer: List[Dict[str, Any]] = []

        browser_config = BrowserConfig(headless=True, extra_args=["--disable-gpu", "--no-sandbox"])
        dispatcher = MemoryAdaptiveDispatcher(memory_threshold_percent=80.0, max_session_permit=10)

        llm_extraction_strategy = LLMExtractionStrategy(
            llm_config=LLMConfig(provider="deepseek/deepseek-chat", api_token=os.getenv("DEEPSEEK_API_KEY")),
            instruction=instruction,
            schema=json.dumps(schema),
            extra_args={"base_url": "https://api.deepseek.com", "temperature": 0.0},
        )

        async with AsyncWebCrawler(config=browser_config) as crawler:
            all_detail_urls = []

            for page in range(1, max_pages + 1):
                url = f"https://ikman.lk/en/ads/sri-lanka/jobs?page={page}"
                logger.info(f"Scanning Listing Page Index: {page}")
                res = await crawler.arun(url=url, config=CrawlerRunConfig(cache_mode="BYPASS"))
                if res.success:
                    links = [
                        f"https://ikman.lk{l['href']}" if l['href'].startswith('/') else l['href']
                        for l in res.links.get("internal", []) if "/en/ad/" in l['href']
                    ]
                    all_detail_urls.extend(links)

            unique_urls = list(set(all_detail_urls))
            logger.info(f"Processing structural extraction queue for {len(unique_urls)} links.")

            detail_config = CrawlerRunConfig(cache_mode="BYPASS", stream=True)
            results_generator = await crawler.arun_many(urls=unique_urls, config=detail_config, dispatcher=dispatcher)

            async for result in results_generator:
                logger.info(f"Ikman jobs count: {count}")
                count = count + 1
                
                if not result.success or not result.markdown:
                    continue

                temp_payload = self.parser.parse_rule_based_fields(markdown=result.markdown.raw_markdown)

                minhash_sig, lsh_indexes = self.duplication_checker.generate_production_minhash_and_lsh(temp_payload)
                is_duplicate, matched_id = await self.duplication_checker.check_duplicate_via_backend(
                    async_client,
                    BACKEND_BASE_URL,
                    lsh_indexes,
                    minhash_sig,
                    incoming_location=temp_payload.get("location", ""),
                )

                if is_duplicate:
                    logger.info(f"Duplicate Match Found: Routing job reference {matched_id} to keep-alive updates.")
                    updated_jobs_buffer.append({
                        "job_post_id": matched_id,
                        "crawler_run_id": crawler_run_id,
                    })

                    if len(updated_jobs_buffer) >= BATCH_SIZE:
                        await async_client.post(f"{BACKEND_BASE_URL}/jobs/batch-update", json={"duplicates": updated_jobs_buffer})
                        updated_jobs_buffer.clear()
                else:
                    logger.info(f"Unique entry found. Calling LLM to parse entire schema: {result.url}")
                    llm_res = await crawler.arun(
                        url=result.url,
                        config=CrawlerRunConfig(extraction_strategy=llm_extraction_strategy, cache_mode="BYPASS"),
                    )

                    if llm_res.success and llm_res.extracted_content:
                        try:
                            extracted_job = json.loads(llm_res.extracted_content)
                            if isinstance(extracted_job, list) and len(extracted_job) > 0:
                                extracted_job = extracted_job[0]

                            job_text = f"{extracted_job.get('job_role', '')} {extracted_job.get('job_description', '')}"
                            occupation_group_id = await occupation_classifier.classify(job_text)
                            industry_subclass_id = await industry_classifier.classify(job_text)

                            extracted_job["meta_data"]["crawler_run_id"] = crawler_run_id
                            extracted_job["meta_data"]["minhash_signature"] = minhash_sig
                            extracted_job["meta_data"]["occupation_group_id"] = occupation_group_id
                            extracted_job["meta_data"]["industry_subclass_id"] = industry_subclass_id
                            extracted_job["meta_data"]["source"] = {"source": "Ikman"}

                            new_jobs_buffer.append(extracted_job)

                            for idx_item in lsh_indexes:
                                lsh_index_buffer.append(idx_item)

                        except Exception as e:
                            logger.error(f"Failed to unmarshal LLM response into schema format: {e}")

                    if len(new_jobs_buffer) >= BATCH_SIZE:
                        payload = {"new_jobs": new_jobs_buffer, "lsh_indexes": lsh_index_buffer}
                        await async_client.post(f"{BACKEND_BASE_URL}/jobs/batch-save", json=payload)
                        new_jobs_buffer.clear()
                        lsh_index_buffer.clear()

            if updated_jobs_buffer:
                logger.info(f"Flushing remaining {len(updated_jobs_buffer)} update records to backend.")
                await async_client.post(f"{BACKEND_BASE_URL}/jobs/batch-update", json={"duplicates": updated_jobs_buffer})
                updated_jobs_buffer.clear()

            if new_jobs_buffer:
                logger.info(f"Flushing remaining {len(new_jobs_buffer)} insertion records to backend.")
                payload = {"new_jobs": new_jobs_buffer, "lsh_indexes": lsh_index_buffer}
                await async_client.post(f"{BACKEND_BASE_URL}/jobs/batch-save", json=payload)
                new_jobs_buffer.clear()
                lsh_index_buffer.clear()

        logger.info("ikman.lk crawl pass concluded.")