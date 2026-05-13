import os
import json
from pathlib import Path

def save_jobs_to_file(jobs: list):
    if not jobs:
        print("No jobs found to save. Skipping file update.")
        return

    script_dir = Path(__file__).parent.absolute().parent

    file_path = script_dir / "storage" / "jobs" / "jobs.json"
    
    file_path.parent.mkdir(parents=True, exist_ok=True)

    
    if file_path.exists():
        os.remove(file_path)
        print(f"Existing data cleared at {file_path}")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully saved {len(jobs)} new jobs to {file_path}")