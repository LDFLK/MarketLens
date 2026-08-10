from abc import ABC, abstractmethod
import httpx

from utils.occupation_classifier import OccupationClassifier
from utils.industry_classifier import IndustryClassifier


class BaseJobCrawler(ABC):

    @abstractmethod
    async def crawl_jobs(
        self,
        crawler_run_id: int,
        async_client: httpx.AsyncClient,
        schema: dict,
        instruction: str,
        occupation_classifier: OccupationClassifier,
        industry_classifier: IndustryClassifier,
    ) -> None:
        pass