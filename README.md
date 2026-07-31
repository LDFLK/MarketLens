# MarketLens

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/TVECLK/MarketLens#Apache-2.0-1-ov-file)
[![Deployment](https://img.shields.io/badge/Deploy-Docker%20Compose%20%2F%20Rancher-0075A8.svg)](https://www.rancher.com/)

The MarketLens project is an open-source initiative designed to crawl, process, and analyze labour market data in Sri Lanka. By transforming unstructured job postings into structured intelligence, this platform provides actionable insights into industry trends, skill demands, and occupational shifts.

---

## 🚀 Key Functionalities

- **National Market Overview** — Real-time metrics on vacancies, trends, and distributions by occupation, industry, and education.
- **Skill Intelligence** — Deep-dive analysis into industry-specific skill demands and top hiring employers.
- **Historical Trends** — Three-year longitudinal analysis to track hiring momentum.
- **Deep Analytics** — Spatial and demographic insights into job market allocation.

---

## 🏛 Data Standards & Methodology

To ensure our labour market analytics are accurate, professional, and locally relevant, we align our data processing and classification with official Sri Lankan national standards:

- **Occupational Classification** — We use the Sri Lanka Standard Classification of Occupations (SLSCO), based on the International Standard Classification of Occupations (ISCO-08) framework. This allows us to map vacancies across the 10 standard occupational bands effectively.
- **Industrial Classification** — All industry-level insights are categorized according to the Sri Lanka Standard Industrial Classification (SLSIC), which is fully aligned with ISIC Rev. 4. This ensures our industry divisions are consistent with national economic reporting.

---

## 🏗 Architecture

The system is built as a modular, containerized application designed for scalability and deployment on Kubernetes.

**Crawler System** — Our custom crawler, powered by Crawl4AI and enriched via the DeepSeek API, extracts and standardizes job data.

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| Database | PostgreSQL |
| Backend | Golang (REST API) |
| BFF (Backend for Frontend) | Next.js |
| Frontend | Next.js (4-view dashboard) |
| ORM | GORM |
| Data Intelligence | Crawl4AI + DeepSeek API |
| Deployment | Docker Compose (Rancher) |

---

## 🚀 Running the Application

### 1. Set environment variables

Define the following environment variables in their relevant folders:

**backend/.env**
```env
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_HOST=
DB_PORT=

POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
```

**bff/.env**
```env
GO_BACKEND_URL=
```

**crawler/.env**
```env
DEEPSEEK_API_KEY=
BACKEND_URL=
```

**frontend/.env**
```env
NEXT_PUBLIC_API_BASE_URL=
```

### 2. Restore the database

Restore the dump file called `market_lens_database_backup`.

### 3. Deploy the stack

Ensure you have Docker and Docker Compose installed. From the root directory of the project, run:

```bash
docker compose up --build
```

---

## 📜 License

This project is licensed under the [Apache-2.0 License](https://github.com/TVECLK/MarketLens#Apache-2.0-1-ov-file).