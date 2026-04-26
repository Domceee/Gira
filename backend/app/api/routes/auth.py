from datetime import timedelta
from urllib.parse import urlencode
import httpx
import base64
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
import sys

from app.db.session import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.schemas.user import UserCreate, UserRead, UserLogin
from app.core.email import send_registration_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


async def claim_pending_invitations(db: AsyncSession, user: User) -> None:
    normalized_email = user.email.strip().lower()
    result = await db.execute(
        select(Invitation).where(
            Invitation.is_accepted == False,
            Invitation.is_declined == False,
            func.lower(Invitation.invited_email) == normalized_email,
        )
    )

    changed = False
    for invitation in result.scalars().all():
        if invitation.fk_userid_user == user.id_user:
            continue
        invitation.fk_userid_user = user.id_user
        invitation.invited_email = normalized_email
        db.add(invitation)
        changed = True

    if changed:
        await db.commit()


def user_to_dict(user: User) -> dict:
    """Convert user to dict with base64 encoded picture"""
    data = {
        "id_user": user.id_user,
        "name": user.name,
        "email": user.email,
        "country": user.country,
        "city": user.city,
        "picture": None,
    }
    if user.picture:
        data["picture"] = base64.b64encode(user.picture).decode('utf-8')
    return data


@router.post("/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    sys.stdout.flush()
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        country=payload.country,
        city=payload.city,
        password=hash_password(payload.password),
        auth_provider="local",
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    await claim_pending_invitations(db, user)
    background_tasks.add_task(send_registration_email, user.email, user.name)
    return UserRead(**user_to_dict(user))

@router.post("/login", response_model=UserRead)
async def login(payload: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.password:
        raise HTTPException(status_code=401, detail="User registered with Google. Please log in with Google.")
    
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    await claim_pending_invitations(db, user)
    
    access_token = create_access_token(
        data={"sub": str(user.id_user)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    use_secure_cookie = settings.FRONTEND_URL.startswith("https://")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=use_secure_cookie,
        samesite="none" if use_secure_cookie else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return UserRead(**user_to_dict(user))

@router.get("/google/login")
async def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }

    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data = {
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    
    if not token_resp.is_success:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    token_data = token_resp.json()
    google_access_token = token_data.get("access_token")

    if not google_access_token:
        raise HTTPException(status_code=400, detail="Google login failed")
    
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )

    if not userinfo_resp.is_success:
        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
    
    google_user = userinfo_resp.json()

    email = google_user.get("email")
    name = google_user.get("name") or "Google User"
    google_sub = google_user.get("sub")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Invalid user info from Google")
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            name=name,
            email=email,
            country="",
            city="",
            password=None,
            google_sub=google_sub,
            auth_provider="google",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.google_sub = user.google_sub or google_sub
        user.auth_provider = user.auth_provider or "google"
        await db.commit()
        await db.refresh(user)

    await claim_pending_invitations(db, user)
    access_token = create_access_token(
        data={"sub": str(user.id_user)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/google/callback?token={access_token}",
        status_code=302,
    )

@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)):
    user_dict = {
        "id_user": current_user.id_user,
        "name": current_user.name,
        "email": current_user.email,
        "country": current_user.country,
        "city": current_user.city,
        "picture": None,
    }
    if current_user.picture:
        user_dict["picture"] = base64.b64encode(current_user.picture).decode('utf-8')
    return UserRead(**user_dict)

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token", 
        path="/",
        secure=True,
        samesite="none",
        )
    return {"message": "Logged out"}
