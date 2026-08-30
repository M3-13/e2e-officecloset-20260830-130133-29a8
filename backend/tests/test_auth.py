from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.routers import auth as auth_module
from app.security import ALGORITHM, get_current_user


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-for-authentication-32bytes!!")


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(engine):
    session = sessionmaker(bind=engine)
    db = session()
    yield db
    db.close()


@pytest.fixture()
def client(engine):
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = session()
        try:
            yield db
        finally:
            db.close()

    auth_module._request_times.clear()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    auth_module._request_times.clear()


def _register(client, email="anna@example.com", password="geheim123"):
    return client.post("/api/auth/register", json={"email": email, "password": password})


def test_register_returns_201_with_token(client):
    response = _register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_register_duplicate_email_returns_400(client):
    assert _register(client).status_code == 201
    response = _register(client)
    assert response.status_code == 400
    assert "detail" in response.json()


def test_login_ok_returns_200(client):
    _register(client)
    response = client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "geheim123"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client):
    _register(client)
    response = client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "falsch"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_login_unknown_email_returns_401(client):
    response = client.post(
        "/api/auth/login", json={"email": "unbekannt@example.com", "password": "x"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_get_current_user_no_token_returns_401(db_session):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, db=db_session)
    assert exc_info.value.status_code == 401


def test_get_current_user_expired_token_returns_401(db_session):
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        "test-secret-key-for-authentication-32bytes!!",
        algorithm=ALGORITHM,
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=expired)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, db=db_session)
    assert exc_info.value.status_code == 401


def test_get_current_user_valid_token_returns_user(client, db_session):
    response = _register(client)
    assert response.status_code == 201
    token = response.json()["access_token"]
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = get_current_user(credentials=credentials, db=db_session)
    assert user.email == "anna@example.com"


def test_token_expiry_is_24h(client):
    _register(client)
    token = client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "geheim123"}
    ).json()["access_token"]
    payload = jwt.decode(
        token, "test-secret-key-for-authentication-32bytes!!", algorithms=[ALGORITHM]
    )
    exp = datetime.fromtimestamp(payload["exp"], tz=UTC)
    iat = datetime.fromtimestamp(payload["iat"], tz=UTC)
    assert exp - iat == timedelta(hours=24)


def test_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(auth_module, "AUTH_RATE_LIMIT", 3)
    for _ in range(3):
        response = client.post(
            "/api/auth/login", json={"email": "x@example.com", "password": "wrong"}
        )
        assert response.status_code == 401
    response = client.post("/api/auth/login", json={"email": "x@example.com", "password": "wrong"})
    assert response.status_code == 429
    assert "detail" in response.json()
