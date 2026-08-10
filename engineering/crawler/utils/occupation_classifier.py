import json
import httpx
import os
from typing import Optional, List, Dict, Any

from config import BACKEND_URL_FOR_FETCHING, DEEPSEEK_API_KEY

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"


class OccupationClassifier:
    """
    Classifies a job into the occupation hierarchy by walking down:
    Major Group -> Sub Major Group -> Minor Group -> Unit Group -> Occupation Group
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
        You are classifying a job posting into a {level_name}.

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

    # Walks all 5 levels and returns the final occupation_group_id (or None)
    async def classify(self, job_text: str) -> Optional[int]:
        major_groups = await self._get("/major-groups")
        major_id = await self._ask_llm_to_pick(job_text, major_groups, "Major Group")
        if not major_id:
            return None

        sub_major_groups = await self._get(f"/major-groups/{major_id}/sub-major-groups")
        sub_major_id = await self._ask_llm_to_pick(job_text, sub_major_groups, "Sub Major Group")
        if not sub_major_id:
            return None

        minor_groups = await self._get(f"/sub-major-groups/{sub_major_id}/minor-groups")
        minor_id = await self._ask_llm_to_pick(job_text, minor_groups, "Minor Group")
        if not minor_id:
            return None

        unit_groups = await self._get(f"/minor-groups/{minor_id}/unit-groups")
        unit_id = await self._ask_llm_to_pick(job_text, unit_groups, "Unit Group")
        if not unit_id:
            return None

        occupation_groups = await self._get(f"/unit-groups/{unit_id}/occupation-groups")
        occupation_group_id = await self._ask_llm_to_pick(job_text, occupation_groups, "Occupation Group")
        return occupation_group_id