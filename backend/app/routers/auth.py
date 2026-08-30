import time
from collections import defaultdict, deque

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import TokenResponse, UserCreate
from ..security import create_access_token

router = APIRouter()

AUTH_RATE_LIMIT = 5
AUTH_RATE_WINDOW_SECONDS = 60

_request_times: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host


def _enforce_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    queue = _request_times[client_ip]
    while queue and now - queue[0] > AUTH_RATE_WINDOW_SECONDS:
        queue.popleft()
    if len(queue) >= AUTH_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )
    queue.append(now)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    _enforce_rate_limit(_client_ip(request))
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )
    user = User(email=payload.email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=TokenResponse)
def login(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    _enforce_rate_limit(_client_ip(request))
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not bcrypt.checkpw(payload.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, token_type="bearer")
