import json
import httpx
import os
from typing import Optional, List, Dict, Any

from config import BACKEND_URL_FOR_FETCHING, DEEPSEEK_API_KEY

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"


class IndustryClassifier:
    """
    Classifies a job into the industry hierarchy by walking down:
    Industry Sector -> Industry Division -> Industry Group -> Industry Class -> Industry Subclass
    At each level, fetches the options from the backend and asks the LLM
    to pick the single best match, then uses that id to fetch the next level.
    """

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    # Fetches a list from the backend 
    async def _get(self, path: str) -> List[Dict[str, Any]]:
        response = await self.client.get(f"{BACKEND_URL_FOR_FETCHING}{path}")
        response.raise_for_status()
        data = response.json()
        for value in data.values():
            if isinstance(value, list):
                return value
        return []

    # Asks the LLM to pick one id from a list of options
    async def _ask_llm_to_pick(self, job_text: str, options: List[Dict[str, Any]], level_name: str) -> Optional[int]:
        if not options:
            return None

        options_text = "\n".join(f"{o['id']}: {o['name']}" for o in options)

        prompt = f"""
        You are classifying a job posting into an {level_name}.

        Job details:
        {job_text}

        Choose the single best matching {level_name} from this list:
        {options_text}

        Respond ONLY with JSON in this exact format:
        {{"id": <chosen id as integer>}}
        """

        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }
        # headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}"}
        headers = {"Authorization": f'Bearer {os.getenv("DEEPSEEK_API_KEY")}'}

        response = await self.client.post(DEEPSEEK_API_URL, json=payload, headers=headers)
        response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        return result.get("id")

    # Walks all 5 levels and returns the final industry_subclass_id (or None)
    async def classify(self, job_text: str) -> Optional[int]:
        industry_sectors = await self._get("/industry-sectors")
        sector_id = await self._ask_llm_to_pick(job_text, industry_sectors, "Industry Sector")
        if not sector_id:
            return None

        industry_divisions = await self._get(f"/industry-sectors/{sector_id}/industry-divisions")
        division_id = await self._ask_llm_to_pick(job_text, industry_divisions, "Industry Division")
        if not division_id:
            return None

        industry_groups = await self._get(f"/industry-divisions/{division_id}/industry-groups")
        group_id = await self._ask_llm_to_pick(job_text, industry_groups, "Industry Group")
        if not group_id:
            return None

        industry_classes = await self._get(f"/industry-groups/{group_id}/industry-classes")
        class_id = await self._ask_llm_to_pick(job_text, industry_classes, "Industry Class")
        if not class_id:
            return None

        industry_subclasses = await self._get(f"/industry-classes/{class_id}/industry-subclasses")
        subclass_id = await self._ask_llm_to_pick(job_text, industry_subclasses, "Industry Subclass")
        return subclass_id