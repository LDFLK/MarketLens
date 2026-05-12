import os
import json
from pathlib import Path

def save_jobs_to_file(jobs: list, file_path: str = "storage/jobs/jobs.json"):
    if not jobs:
        print("No jobs found to save. Skipping file update.")
        return

    path = Path(file_path)
    
    path.parent.mkdir(parents=True, exist_ok=True)

    
    if path.exists():
        os.remove(path)
        print(f"Existing data cleared at {file_path}")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully saved {len(jobs)} new jobs to {file_path}")