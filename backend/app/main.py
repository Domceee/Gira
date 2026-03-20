from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.task import router as task_router   
from app.api.routes import user
app = FastAPI(title="Gira API")

origins = [
    "http://localhost:3000",
    "https://gira.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router)
app.include_router(projects_router, prefix="/api")
app.include_router(task_router, prefix="/api")          
app.include_router(user.router, prefix="/api")