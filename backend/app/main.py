from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.invitations import router as invitations_router
from app.api.routes.projects import router as projects_router
from app.api.routes.task import router as task_router   
from app.api.routes.news import router as news_router
from app.api.routes import user
from app.api.routes import sprint
app = FastAPI(title="Gira API")

origins = [
    "http://localhost:3000",
    settings.FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router)
app.include_router(invitations_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(task_router, prefix="/api")          
app.include_router(news_router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(sprint.router, prefix="/api")
