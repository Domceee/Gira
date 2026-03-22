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

**Create a `.env` file in backend folderand insert this there** <br>
```env
# Database URL
APP_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/giradb

# SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# AUTH settings
SECRET_KEY=your_very_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

**Run migrations in backend folder** <br>
`alembic upgrade head` <br>

**Start the backend server** <br>
`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` <br>

**Frontend setup** <br>

**Create a `.env.local` file in the frontend folder and insert this there** <br>
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

From root folder do `cd frontend` <br>
`npm install` <br>
`npm run dev` <br>
