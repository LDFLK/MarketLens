import os
import json
import asyncio
import httpx
import logging
from typing import List
from fastapi import FastAPI
from crawl4ai import LLMExtractionStrategy, LLMConfig

from utils.dedup_utils import JobDuplicationCheck
from utils.schema_builder import MetadataSchemaBuilder
from utils.occupation_classifier import OccupationClassifier
from utils.industry_classifier import IndustryClassifier
from config import BACKEND_BASE_URL, BATCH_SIZE

from manual_upload.models import JobInput

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("manual-upload")

app = FastAPI()

@app.post("/manual-upload-jobs")
async def manual_upload_jobs(jobs: List[JobInput]):
    duplication_checker = JobDuplicationCheck()

    async with httpx.AsyncClient(timeout=30.0) as client:

        runs_res = await client.get(f"{BACKEND_BASE_URL}/runs")
        runs = runs_res.json().get("runs", [])
        crawler_run_id = runs[0]["id"] if runs else 1

        schema_builder = MetadataSchemaBuilder(client)
        schema, instruction = await schema_builder.build()

        occupation_classifier = OccupationClassifier(client)
        industry_classifier = IndustryClassifier(client)

        extraction_strategy = LLMExtractionStrategy(
            llm_config=LLMConfig(provider="deepseek/deepseek-chat", api_token=os.getenv("DEEPSEEK_API_KEY")),
            instruction=instruction,
            schema=json.dumps(schema),
            # extraction_type="schema",
            # apply_chunking=False,
            extra_args={"base_url": "https://api.deepseek.com", "temperature": 0.0},
        )

        new_jobs_buffer = []
        lsh_index_buffer = []
        updated_jobs_buffer = []

        for job in jobs:
            temp_payload = job.model_dump()

            minhash_sig, lsh_indexes = duplication_checker.generate_production_minhash_and_lsh(temp_payload)
            is_duplicate, matched_id = await duplication_checker.check_duplicate_via_backend(
                client,
                BACKEND_BASE_URL,
                lsh_indexes,
                minhash_sig,
                incoming_location=temp_payload.get("location", ""),
            )

            if is_duplicate:
                updated_jobs_buffer.append({
                    "job_post_id": matched_id,
                    "crawler_run_id": crawler_run_id,
                })

                if len(updated_jobs_buffer) >= BATCH_SIZE:
                    await client.post(f"{BACKEND_BASE_URL}/jobs/batch-update", json={"duplicates": updated_jobs_buffer})
                    updated_jobs_buffer.clear()

                continue

            raw_text = json.dumps(temp_payload)
            llm_res = await asyncio.to_thread(extraction_strategy.run, url="", sections=[raw_text])

            if llm_res and isinstance(llm_res, list) and len(llm_res) > 0:
                try:
                    extracted_job = llm_res[0]
                    logger.info(f"extracted job is: {extracted_job}")

                    job_text = f"{extracted_job.get('job_role', '')} {extracted_job.get('job_description', '')}"
                    occupation_group_id = await occupation_classifier.classify(job_text)
                    industry_subclass_id = await industry_classifier.classify(job_text)

                    extracted_job["meta_data"]["crawler_run_id"] = crawler_run_id
                    extracted_job["meta_data"]["minhash_signature"] = minhash_sig
                    extracted_job["meta_data"]["occupation_group_id"] = occupation_group_id
                    extracted_job["meta_data"]["industry_subclass_id"] = industry_subclass_id
                    extracted_job["meta_data"]["source"] = {"source": job.source}

                    new_jobs_buffer.append(extracted_job)
                    lsh_index_buffer.extend(lsh_indexes)

                except Exception:
                    continue

                if len(new_jobs_buffer) >= BATCH_SIZE:
                    await client.post(
                        f"{BACKEND_BASE_URL}/jobs/batch-save",
                        json={"new_jobs": new_jobs_buffer, "lsh_indexes": lsh_index_buffer},
                    )
                    new_jobs_buffer.clear()
                    lsh_index_buffer.clear()

        if updated_jobs_buffer:
            await client.post(f"{BACKEND_BASE_URL}/jobs/batch-update", json={"duplicates": updated_jobs_buffer})

        if new_jobs_buffer:
            await client.post(
                f"{BACKEND_BASE_URL}/jobs/batch-save",
                json={"new_jobs": new_jobs_buffer, "lsh_indexes": lsh_index_buffer},
            )

    return {"status": "completed", "processed": len(jobs), "crawler_run_id": crawler_run_id}