import os
 
BACKEND_BASE_URL = os.getenv("BACKEND_URL", "http://backend:8080/api/v1/crawler")
BACKEND_URL_FOR_FETCHING = os.getenv("BACKEND_URL_FOR_FETCHING", "http://backend:8080/api/v1")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
BATCH_SIZE = 10