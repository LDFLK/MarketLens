import httpx

from config import BACKEND_URL_FOR_FETCHING


class MetadataSchemaBuilder:
    """
    Fetches formality, gender, vocational_education, employment_sector,
    education_level, and experience from the backend, then builds the
    JSON schema + instruction text for the LLM extraction step.

    Industry, occupation, crawler run and minhash are handled separately, so they are not included here.
    """

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    # Fetches a list from the backend 
    async def _get(self, path: str) -> list:
        response = await self.client.get(f"{BACKEND_URL_FOR_FETCHING}{path}")
        response.raise_for_status()
        data = response.json()
        for value in data.values():
            if isinstance(value, list):
                return value
        return []

    # Turns a list 
    def _format_options(self, items: list, label_field: str) -> str:
        lines = [f"{item['id']}: {item[label_field]}" for item in items]
        return "\n".join(lines)

    async def build(self):
        formalities = await self._get("/formalities")
        genders = await self._get("/genders")
        vocational_educations = await self._get("/vocational-educations")
        employment_sectors = await self._get("/employment-sectors")
        education_levels = await self._get("/education-levels")
        experiences = await self._get("/experiences")

        formality_options = self._format_options(formalities, "formality_type")
        gender_options = self._format_options(genders, "gender_type")
        vocational_education_options = self._format_options(vocational_educations, "level")
        employment_sector_options = self._format_options(employment_sectors, "sector")
        education_level_options = self._format_options(education_levels, "level")
        experience_options = self._format_options(experiences, "name")

        schema = {
            "type": "object",
            "properties": {
                "employer": {
                    "type": "object",
                    "properties": {"name": {"type": "string"}},
                    "required": ["name"],
                },
                "job_role": {"type": "string"},
                "job_type": {
                    "type": "object",
                    "properties": {"type": {"type": "string"}},
                    "required": ["type"],
                },
                "job_description": {"type": "string"},
                "location": {"type": "string"},
                "is_remote": {"type": "boolean"},
                "no_of_vacancies": {"type": "integer"},
                "meta_data": {
                    "type": "object",
                    "properties": {
                        "geo_data": {
                            "type": "object",
                            "properties": {"province": {"type": "string"}},
                            "required": ["province"],
                        },
                        "source": {
                            "type": "object",
                            "properties": {"source": {"type": "string"}},
                            "required": ["source"],
                        },
                        "ai_version": {
                            "type": "object",
                            "properties": {"version": {"type": "string"}},
                            "required": ["version"],
                        },
                        "posted_at": {
                            "type": "string",
                            "pattern": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$",
                        },
                        "confidence_score": {"type": "number"},
                        "formality_id": {"type": "integer"},
                        "gender_id": {"type": "integer"},
                        "vocational_education_id": {"type": "integer"},
                        "employment_sector_id": {"type": "integer"},
                        "education_level_id": {"type": "integer"},
                        "experience_id": {"type": "integer"},
                    },
                    "required": [
                        "geo_data", "source", "ai_version", "posted_at", "confidence_score",
                        "formality_id", "gender_id", "vocational_education_id",
                        "employment_sector_id", "education_level_id", "experience_id", 
                    ],
                },
                "skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"skill": {"type": "string"}},
                        "required": ["skill"],
                    },
                },
            },
            "required": [
                "employer", "job_role", "job_type", "job_description",
                "location", "is_remote", "no_of_vacancies", "meta_data", "skills",
            ],
        }

        instruction = f"""
            Extract structural data from the raw job text into the specified JSON format.
            CRITICAL: If a field is missing, use the strict default provided. Do not hallucinate.

            Fields & Defaults:

            1. 'employer': Object with company name.
            Format: {{"name": "Company Name"}}
            Default: {{"name": ""}}

            2. 'job_role': Vacancy title string.
            Default: ""

            3. 'job_type': Object with contract type.
            Format: {{"type": "Full Time"}} or {{"type": "Part Time"}} or {{"type": "Contract"}} or {{"type": "Internship"}}
            Default: {{"type": "Full Time"}}

            4. 'job_description': Combined summary of responsibilities, qualifications, and any offered benefits. Single string.
            Default: ""

            5. 'location': City/region string (e.g. "Colombo 03, Sri Lanka").
            Default: "Sri Lanka"

            6. 'no_of_vacancies': Number of open positions for this role, if stated.
            Default: 1

            7. 'is_remote': true ONLY if explicit remote wording exists, else false.

            8. 'meta_data': Object containing all metadata fields:

            - 'geo_data': Infer the Sri Lankan province from the location text.
                Format: {{"province": "<province>"}}
                Must match EXACTLY ONE from this list:
                ["Western", "Central", "Northern", "Eastern", "North Western",
                    "North Central", "Uva", "Southern", "Sabaragamuwa"]
                Default: {{"province": "Western"}}

            - 'source': The website or platform this job was crawled from.
                Format: {{"source": "<source name>"}}
                Example: {{"source": "Ikman"}} or {{"source": "TopJobs"}}
                Default: {{"source": "Unknown"}}

            - 'ai_version': The AI model version used for extraction.
                Format: {{"version": "deepseek-v1"}}
                Always use: {{"version": "deepseek-v1"}}

            - 'posted_at': ISO 8601 timestamp of when the job was posted, if detectable from the page.
                Format: "YYYY-MM-DDTHH:MM:SSZ"
                Default: current UTC timestamp.

            - 'confidence_score': Your confidence in the extraction accuracy.
                Float between 0.00 and 1.00. Use 1.00 if all fields are clearly present.
                Default: 0.80

            - 'formality_id': Must be one of these ids:
            {formality_options}

            - 'gender_id': Must be one of these ids:
            {gender_options}

            - 'vocational_education_id': Must be one of these ids:
            {vocational_education_options}

            - 'employment_sector_id': Must be one of these ids:
            {employment_sector_options}

            - 'education_level_id': Must be one of these ids:
            {education_level_options}

            - 'experience_id': Must be one of these ids:
            {experience_options}

            9. 'skills': Array of skill objects extracted from the job description.
            Format: [{{"skill": "Skill Name"}}, ...]
            Extract only concrete technical or professional skills mentioned.
            Default: []
            """

        return schema, instruction