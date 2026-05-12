JOB_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "employer": {"type": "string"},
        "job_role": {"type": "string"},
        "job_type": {"type": "string"},
        "key_responsibilities": {"type": "string"},
        "qualifications": {"type": "string"},
        "location": {"type": "string"},
        "offers": {"type": "string"}
    },
    "required": ["employer", "job_role", "location"]
}



BASE_JOB_INSTRUCTION = """
            This is a specific job detail page. Extract:
            1. Employer
            2. Job role
            3. Job type(part time or full time)
            4. Key responsibilities
            5. Qualifications
            6. Location
            7. Offers / Benefits
            8. Requirements: Summarize the description, duties, and qualifications.
        """