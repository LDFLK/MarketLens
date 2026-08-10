import os
import asyncio
import io
import json
import logging
import re
import pytesseract
import httpx

from typing import List, Dict, Any
from bs4 import BeautifulSoup
from PIL import Image
from playwright.async_api import async_playwright
from crawl4ai import LLMExtractionStrategy, LLMConfig
from crawlers.base_crawler import BaseJobCrawler
from utils.dedup_utils import JobDuplicationCheck
from parsers.topjobs_parser import TopJobsParser
from utils.occupation_classifier import OccupationClassifier
from utils.industry_classifier import IndustryClassifier
from config import BACKEND_BASE_URL, BATCH_SIZE


#pytesseract path setup in docker container
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

#Configuration variable setup
LISTING_URL = "https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=&jst=OPEN&sQut=&txtKeyWord=&chkGovt=&chkParttime=&chkWalkin=&chkNGO="
TESSERACT_LANG = "eng+sin+tam"
POPUP_WAIT_TIMEOUT = 15000 
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("topjobs_crawler")

class TopJobsCrawler(BaseJobCrawler):

    def __init__(self):
        self._parser = TopJobsParser()
        self.duplication_checker = JobDuplicationCheck()

    async def _get_total_pages(self, html: str) -> int:
        soup = BeautifulSoup(html, "html.parser")
        pagination_div = soup.find("div", class_="pagin-block page-show")
        
        if pagination_div:
            text = pagination_div.get_text(strip=True)
            match = re.search(r'(\d+)\s*page\(s\)', text)
            if match:
                return int(match.group(1))
        
        return 1

    async def _parse_listing_html(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        jobs = []
        rows = soup.find_all("tr", attrs={"onclick": re.compile(r"createAlert")})
        
        for row in rows:
            row_id = row.get("id")
            tds = row.find_all("td", recursive=False)
            if len(tds) < 6: continue
            
            jobs.append({
                "row_id": row_id,
                "title": tds[2].find("h2").text.strip() if tds[2].find("h2") else "N/A",
                "employer": tds[2].find("h1").text.strip() if tds[2].find("h1") else "N/A",
                "location": tds[6].text.strip() if len(tds) > 6 else (tds[5].text.strip() if len(tds) > 5 else "N/A"),
                "ocr_text": None,
                "error": None
            })
        return jobs

    async def _extract_complete_jobs_details(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent=USER_AGENT)
            page = await context.new_page()

            await page.goto(f"{LISTING_URL}&pageNo=1", wait_until="networkidle")
            #total_pages = await self._get_total_pages(await page.content())
            total_pages = 1
            logger.info(f"Total pages detected: {total_pages}")


            all_jobs = []
            
            for page_num in range(1, total_pages + 1):
                # log.info("Navigating to listings...")
                # await page.goto(LISTING_URL, wait_until="networkidle")

                logger.info(f"Scraping page {page_num} of {total_pages}...")
                if page_num > 1:
                    await page.goto(f"{LISTING_URL}&pageNo={page_num}", wait_until="networkidle")
                
                content = await page.content()
                jobs = await self._parse_listing_html(content)
                logger.info(f"Found {len(jobs)} jobs. Starting popup processing...")

                for i, job in enumerate(jobs):

                    if len(all_jobs) >= 30:
                        logger.info(f"Reached job limit for this page — stopping.")
                        break

                    try:
                        logger.info(f"[{i+1}/{len(jobs)}] Processing {job['employer']}")

                        await asyncio.sleep(3)
                        
                        async with context.expect_page(timeout=POPUP_WAIT_TIMEOUT) as popup_info:
                            await page.evaluate(f"document.getElementById('{job['row_id']}').click()")
                        
                        popup = await popup_info.value
                        await popup.wait_for_load_state("networkidle")

                        all_images = popup.locator("img")
                        img_locator = None
                        
                        for count in range(await all_images.count()):
                            candidate = all_images.nth(count)
                            box = await candidate.bounding_box()
                            if box and box['width'] > 500:
                                img_locator = candidate
                                break
                        
                        if not img_locator:
                            logger.error("Could not find a large advertisement image.")
                            await popup.close()
                            continue
                            #raise Exception("Could not find a large advertisement image.")

                        await img_locator.wait_for(state="visible", timeout=POPUP_WAIT_TIMEOUT)
                        screenshot_bytes = await img_locator.screenshot()
                        await popup.close()

                        # OCR Processing
                        image = Image.open(io.BytesIO(screenshot_bytes)).convert("L")
                        if image.width < 1400:
                            scale = 1400 / image.width
                            image = image.resize((int(image.width * scale), int(image.height * scale)))
                        
                        image = image.point(lambda x: 0 if x < 180 else 255, '1')
                        #job["ocr_text"] = pytesseract.image_to_string(image, lang=TESSERACT_LANG).strip()
                        job["ocr_text"] = " ".join(pytesseract.image_to_string(image, lang=TESSERACT_LANG).split())

                        all_jobs.append(job)
                        
                    except Exception as e:
                        logger.error(f"Failed to process {job['row_id']}: {e}")
                        job["error"] = str(e)

            await browser.close()
            
            # with open("vacancies.json", "w", encoding="utf-8") as f:
            #     json.dump(jobs, f, ensure_ascii=False, indent=2)
            #print(all_jobs)
            logger.info("Done! Data saved to vacancies.json")
            return all_jobs


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

        logger.info("Top jobs crawl started.")
        
        job_data_list = await self._extract_complete_jobs_details()

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
                        extracted_job["meta_data"]["source"] = {"source": "TopJobs"}

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

        logger.info("Top jobs crawl pass concluded.") 