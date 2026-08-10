from pydantic import BaseModel

class JobInput(BaseModel):
    employer: str
    job_role: str
    location: str
    description: str
    source: str