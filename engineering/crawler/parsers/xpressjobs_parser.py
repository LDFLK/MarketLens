from parsers.base_parser import BaseJobParser

class XpressJobsParser(BaseJobParser):

    def parse_rule_based_fields(self, job: dict) -> dict:
        return {
            "employer": job.get("employer"),
            "job_role": job.get("job_title"),
            "location": job.get("location"),
            "description": job.get("description")
        }