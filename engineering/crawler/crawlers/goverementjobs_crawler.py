import os
import asyncio
import io
import json
import logging
import re
import pytesseract
import httpx

from io import BytesIO
from typing import List, Dict, Any
from crawl4ai import AsyncWebCrawler,LLMExtractionStrategy, LLMConfig
from bs4 import BeautifulSoup
from PIL import Image
from playwright.async_api import async_playwright
from crawlers.base_crawler import BaseJobCrawler
from utils.dedup_utils import JobDuplicationCheck
from parsers.goverementjobs_parser import GoverementJobsParser
from utils.occupation_classifier import OccupationClassifier
from utils.industry_classifier import IndustryClassifier
from config import BACKEND_BASE_URL, BATCH_SIZE

#pytesseract path setup in docker container
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

#Configuration variable setup
TESSERACT_LANG = "eng+sin+tam"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("goverementjobs_crawler")

class GoverementJobsCrawler(BaseJobCrawler):

    def __init__(self):
        self._parser = GoverementJobsParser()
        self.duplication_checker = JobDuplicationCheck()
        self.async_client = httpx.AsyncClient()

    def _remove_sinhala_control_chars(self, text):
        cleaned_text = text.replace('\u200c', '').replace('\u200d', '')
        return cleaned_text

    async def _perform_ocr(self, image_url):
        try:
            response = await self.async_client.get(image_url, timeout=10)
            img = Image.open(BytesIO(response.content)).convert('L') # Convert to grayscale for better OCR
            return " ".join(pytesseract.image_to_string(img, lang=TESSERACT_LANG).split())
        except Exception as e:
            return f"OCR Error: {e}"

    async def _fetch_job_details(self):
        base_url = "https://governmentjobs.lk/index.php?page={}&ipp=25&"
        jobs_data = []
        
        # Open the crawler once for the whole process
        async with AsyncWebCrawler() as crawler:
            
            result = await crawler.arun(url="https://governmentjobs.lk/index.php?page=1&ipp=25&")
            soup = BeautifulSoup(result.html, 'html.parser')

            pagination_text = soup.select_one('.category-results .paginate').text
            #total_pages = int(pagination_text.split()[-1])
            total_pages = 2
            print(total_pages)
            
            for page_num in range(1, total_pages + 1):
                current_url = base_url.format(page_num)
                print(f"Crawling: {current_url}")
                
                # Fetch the specific page
                page_result = await crawler.arun(url=current_url)
                page_soup = BeautifulSoup(page_result.html, 'html.parser')

                #Iterate through each job
                for job_div in page_soup.select('.grid-view.product'):
                    try:
                        title = job_div.select_one('h5 strong').text.strip()
                        employer = job_div.select_one('a[href*="vtag"]').text.strip()
                        
                        # Get the link to the detailed image page
                        image_page_link = job_div.select_one('a[href*="image-view.php"]')['href']
                        full_image_page_url = "https://governmentjobs.lk/" + image_page_link
                        
                        # Visit the detail page using the same crawler session
                        # MUST use await and arun()
                        img_res = await crawler.arun(url=full_image_page_url)
                        img_soup = BeautifulSoup(img_res.html, 'html.parser')
                        # img_tag = img_soup.select_one('.page-content img')
                        
                        # description = ""
                        # if img_tag and 'src' in img_tag.attrs:
                        #     description = perform_ocr(img_tag['src'])

                        img_tags = img_soup.select('.page-content img')

                        description = ""
                        for img_tag in img_tags:
                            src = img_tag.get('src')
                            if src and "amazonaws.com/mytutor.lk/vacancy" in src:
                                description = description + await self._perform_ocr(src)

                        description = self._remove_sinhala_control_chars(description)
                        
                        jobs_data.append({
                            "title": title,
                            "employer": employer,
                            "location": "Sri Lanka",
                            "description": description.strip()
                        })
                        
                    except Exception as e:
                        print(f"Error parsing job: {e}")
                        continue
                
        return jobs_data

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

        logger.info("Goverement jobs crawl started.")
        
        job_data_list = await self._fetch_job_details()

        new_jobs_buffer: List[Dict[str, Any]] = []
        lsh_index_buffer: List[Dict[str, Any]] = []
        updated_jobs_buffer: List[Dict[str, Any]] = []

        detail_extraction_strategy = LLMExtractionStrategy(
            llm_config=LLMConfig(
                provider="deepseek/deepseek-chat",
                api_token=os.getenv("DEEPSEEK_API_KEY"),
            ),
            instruction=instruction,
            schema=json.dumps(schema),
            extraction_type="schema", 
            apply_chunking=False,          
            extra_args={"base_url": "https://api.deepseek.com", "temperature": 0.0},
        )

        for result in job_data_list:

            temp_payload = self._parser.parse_rule_based_fields(result)

            raw_text = json.dumps(result)

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
                logger.info(f"Unique entry found. Calling LLM to parse entire schema")
                llm_res = await asyncio.to_thread(
                    detail_extraction_strategy.run, url="", sections=[raw_text]
                )

                if llm_res and isinstance(llm_res, list) and len(llm_res) > 0:
                    try:
                        extracted_job = llm_res[0]

                        job_text = f"{extracted_job.get('job_role', '')} {extracted_job.get('job_description', '')}"
                        occupation_group_id = await occupation_classifier.classify(job_text)
                        industry_subclass_id = await industry_classifier.classify(job_text)

                        extracted_job["meta_data"]["crawler_run_id"] = crawler_run_id
                        extracted_job["meta_data"]["minhash_signature"] = minhash_sig
                        extracted_job["meta_data"]["occupation_group_id"] = occupation_group_id
                        extracted_job["meta_data"]["industry_subclass_id"] = industry_subclass_id
                        extracted_job["meta_data"]["source"] = {"source": "GovernmentJobs.lk"}

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

        logger.info("Goverement jobs crawl pass concluded.") 