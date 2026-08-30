from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import get_current_user


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, tmp_path) -> Iterator[tuple[TestClient, dict]]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    test_session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))

    def override_get_db() -> Iterator[Session]:
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    state: dict = {"current_user": None}

    def override_get_current_user() -> User | None:
        return state["current_user"]

    app.dependency_overrides[get_current_user] = override_get_current_user

    def create_user(email: str = "anna@example.com") -> User:
        db = test_session()
        user = User(email=email, password_hash="x")
        db.add(user)
        db.commit()
        db.refresh(user)
        db.close()
        return user

    state["create_user"] = create_user

    with TestClient(app) as c:
        yield c, state

    app.dependency_overrides.clear()


def _image_files(name: str = "shirt.jpg", content: bytes = b"fake-image-bytes") -> dict:
    return {"image": (name, content, "image/jpeg")}


def _create_item(client: TestClient, data: dict | None = None, files: dict | None = None) -> dict:
    data = data or {"name": "Shirt", "category": "top"}
    files = files or _image_files()
    response = client.post("/api/wardrobe/items", data=data, files=files)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_item_returns_201_with_image_url(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    body = _create_item(c)

    assert body["id"] == 1
    assert body["name"] == "Shirt"
    assert body["category"] == "top"
    assert body["color"] is None
    assert body["image_url"].startswith("/api/wardrobe/images/")
    assert body["image_url"].endswith(".jpg")


def test_list_items_returns_only_own_items(client) -> None:
    c, state = client
    user = state["create_user"]()
    other = state["create_user"]("bob@example.com")

    state["current_user"] = user
    _create_item(c, {"name": "Eigenes", "category": "top"})

    state["current_user"] = other
    _create_item(c, {"name": "Fremdes", "category": "dress"})

    state["current_user"] = user
    response = c.get("/api/wardrobe/items")
    assert response.status_code == 200
    items = response.json()
    assert [i["name"] for i in items] == ["Eigenes"]


def test_list_items_filters_by_category(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    _create_item(c, {"name": "Hemd", "category": "top"})
    _create_item(c, {"name": "Hose", "category": "bottom"})

    response = c.get("/api/wardrobe/items", params={"category": "top"})
    assert response.status_code == 200
    items = response.json()
    assert [i["name"] for i in items] == ["Hemd"]


def test_list_items_searches_by_name(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    _create_item(c, {"name": "Rotes Kleid", "category": "dress"})
    _create_item(c, {"name": "Hemd", "category": "top"})

    response = c.get("/api/wardrobe/items", params={"search": "kleid"})
    assert response.status_code == 200
    items = response.json()
    assert [i["name"] for i in items] == ["Rotes Kleid"]


def test_get_item_own_returns_200(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    created = _create_item(c)

    response = c.get(f"/api/wardrobe/items/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Shirt"


def test_get_foreign_item_returns_404(client) -> None:
    c, state = client
    owner = state["create_user"]()
    state["current_user"] = owner
    created = _create_item(c)

    other = state["create_user"]("bob@example.com")
    state["current_user"] = other
    response = c.get(f"/api/wardrobe/items/{created['id']}")
    assert response.status_code == 404


def test_get_nonexistent_item_returns_404(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()
    response = c.get("/api/wardrobe/items/9999")
    assert response.status_code == 404


def test_update_item_replaces_image_and_deletes_old(client, tmp_path) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    created = _create_item(c)
    old_filename = created["image_url"].rsplit("/", 1)[-1]
    upload_dir = tmp_path / "uploads"
    assert (upload_dir / old_filename).is_file()

    response = c.put(
        f"/api/wardrobe/items/{created['id']}",
        data={"name": "Neues Hemd", "color": "rot"},
        files=_image_files("new.png", b"new-image-content"),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "Neues Hemd"
    assert body["color"] == "rot"
    assert body["image_url"].endswith(".png")

    new_filename = body["image_url"].rsplit("/", 1)[-1]
    assert (upload_dir / new_filename).is_file()
    assert not (upload_dir / old_filename).exists()


def test_update_foreign_item_returns_404(client) -> None:
    c, state = client
    owner = state["create_user"]()
    state["current_user"] = owner
    created = _create_item(c)

    state["current_user"] = state["create_user"]("bob@example.com")
    response = c.put(f"/api/wardrobe/items/{created['id']}", data={"name": "X"})
    assert response.status_code == 404


def test_delete_item_removes_image_file(client, tmp_path) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    created = _create_item(c)
    filename = created["image_url"].rsplit("/", 1)[-1]
    upload_dir = tmp_path / "uploads"
    assert (upload_dir / filename).is_file()

    response = c.delete(f"/api/wardrobe/items/{created['id']}")
    assert response.status_code == 204
    assert not (upload_dir / filename).exists()

    response = c.get(f"/api/wardrobe/items/{created['id']}")
    assert response.status_code == 404


def test_delete_foreign_item_returns_404(client) -> None:
    c, state = client
    owner = state["create_user"]()
    state["current_user"] = owner
    created = _create_item(c)

    state["current_user"] = state["create_user"]("bob@example.com")
    response = c.delete(f"/api/wardrobe/items/{created['id']}")
    assert response.status_code == 404


def test_create_item_rejects_invalid_image_type(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    response = c.post(
        "/api/wardrobe/items",
        data={"name": "X", "category": "top"},
        files={"image": ("malware.exe", b"bytes", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "detail" in response.json()


def test_create_item_rejects_oversized_upload(client, monkeypatch: pytest.MonkeyPatch) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()
    monkeypatch.setenv("MAX_UPLOAD_SIZE", "1000")

    response = c.post(
        "/api/wardrobe/items",
        data={"name": "X", "category": "top"},
        files=_image_files("shirt.jpg", b"x" * 5000),
    )
    assert response.status_code == 413
    assert "detail" in response.json()


def test_get_image_own_returns_file(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()

    created = _create_item(c)
    response = c.get(created["image_url"])
    assert response.status_code == 200
    assert response.content == b"fake-image-bytes"


def test_get_image_foreign_returns_404(client) -> None:
    c, state = client
    owner = state["create_user"]()
    state["current_user"] = owner
    created = _create_item(c)

    state["current_user"] = state["create_user"]("bob@example.com")
    response = c.get(created["image_url"])
    assert response.status_code == 404


def test_get_image_nonexistent_returns_404(client) -> None:
    c, state = client
    state["current_user"] = state["create_user"]()
    response = c.get("/api/wardrobe/images/doesnotexist.jpg")
    assert response.status_code == 404
