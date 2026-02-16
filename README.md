## Gira

## Setup Instructions

**Prerequisites**
- Git
- Node.js
- Python 3.11+
- Docker Desktop

**Check versions**
- node -v
- npm -v
- python --version
- docker --version

**Download the project from Github**

**Start database** <br>
`docker compose up -d` <br>
`docker ps` <br>

**Backend setup** <br>
`cd backend` <br>
`python -m venv gira` <br>
`gira\Scripts\activate` <br>

**Install dependencies in backend folder** <br>
`pip install -r requirements.txt` <br>

**Create a .env file in backend folderand insert this line there** <br>
`DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/giradb` <br>

**Run migrations in backend folder** <br>
`alembic upgrade head` <br>

**Start the backend server** <br>
`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` <br>

**Frontend setup** <br>
From root folder do `cd frontend` <br>
`npm install` <br>
`npm run dev` <br>

