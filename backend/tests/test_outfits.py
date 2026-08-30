import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import ClothingItem, User
from app.security import get_current_user


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        c.testing_session = testing_session_local
        yield c

    app.dependency_overrides.clear()


def _seed_user(session_factory, email: str) -> User:
    db = session_factory()
    user = User(email=email, password_hash="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def _seed_item(session_factory, user_id: int, name: str, category: str) -> ClothingItem:
    db = session_factory()
    item = ClothingItem(user_id=user_id, name=name, category=category)
    db.add(item)
    db.commit()
    db.refresh(item)
    db.close()
    return item


def _override_current_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def test_create_outfit_returns_201_with_items(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    item = _seed_item(client.testing_session, user.id, "Kleid", "dress")
    _override_current_user(user)

    response = client.post("/api/outfits", json={"name": "Abendlook", "item_ids": [item.id]})

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Abendlook"
    assert [i["id"] for i in data["items"]] == [item.id]
    assert data["items"][0]["name"] == "Kleid"


def test_create_outfit_with_foreign_item_returns_400(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    other = _seed_user(client.testing_session, "bob@example.com")
    foreign_item = _seed_item(client.testing_session, other.id, "Fremdes Teil", "top")
    _override_current_user(user)

    response = client.post("/api/outfits", json={"name": "Look", "item_ids": [foreign_item.id]})

    assert response.status_code == 400


def test_create_outfit_with_missing_item_returns_400(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    _override_current_user(user)

    response = client.post("/api/outfits", json={"name": "Look", "item_ids": [9999]})

    assert response.status_code == 400


def test_list_outfits_returns_only_own(client) -> None:
    user_a = _seed_user(client.testing_session, "anna@example.com")
    user_b = _seed_user(client.testing_session, "bob@example.com")
    item_a = _seed_item(client.testing_session, user_a.id, "Kleid", "dress")
    item_b = _seed_item(client.testing_session, user_b.id, "Hemd", "top")
    _override_current_user(user_a)

    client.post("/api/outfits", json={"name": "Mein Look", "item_ids": [item_a.id]})

    _override_current_user(user_b)
    client.post("/api/outfits", json={"name": "Bobs Look", "item_ids": [item_b.id]})

    _override_current_user(user_a)
    response = client.get("/api/outfits")

    assert response.status_code == 200
    names = [o["name"] for o in response.json()]
    assert names == ["Mein Look"]


def test_get_outfit_returns_its_clothing_items(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    item1 = _seed_item(client.testing_session, user.id, "Kleid", "dress")
    item2 = _seed_item(client.testing_session, user.id, "Schuhe", "shoes")
    _override_current_user(user)

    created = client.post(
        "/api/outfits", json={"name": "Look", "item_ids": [item1.id, item2.id]}
    ).json()

    response = client.get(f"/api/outfits/{created['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Look"
    assert {i["id"] for i in data["items"]} == {item1.id, item2.id}


def test_get_foreign_outfit_returns_404(client) -> None:
    user_a = _seed_user(client.testing_session, "anna@example.com")
    user_b = _seed_user(client.testing_session, "bob@example.com")
    item = _seed_item(client.testing_session, user_a.id, "Kleid", "dress")
    _override_current_user(user_a)
    created = client.post("/api/outfits", json={"name": "Look", "item_ids": [item.id]}).json()

    _override_current_user(user_b)
    response = client.get(f"/api/outfits/{created['id']}")

    assert response.status_code == 404


def test_get_missing_outfit_returns_404(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    _override_current_user(user)

    response = client.get("/api/outfits/9999")

    assert response.status_code == 404


def test_update_outfit_replaces_name_and_items(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    item1 = _seed_item(client.testing_session, user.id, "Kleid", "dress")
    item2 = _seed_item(client.testing_session, user.id, "Schuhe", "shoes")
    item3 = _seed_item(client.testing_session, user.id, "Hut", "accessory")
    _override_current_user(user)
    created = client.post("/api/outfits", json={"name": "Alt", "item_ids": [item1.id]}).json()

    response = client.put(
        f"/api/outfits/{created['id']}",
        json={"name": "Neu", "item_ids": [item2.id, item3.id]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Neu"
    assert {i["id"] for i in data["items"]} == {item2.id, item3.id}


def test_update_foreign_outfit_returns_404(client) -> None:
    user_a = _seed_user(client.testing_session, "anna@example.com")
    user_b = _seed_user(client.testing_session, "bob@example.com")
    item = _seed_item(client.testing_session, user_a.id, "Kleid", "dress")
    _override_current_user(user_a)
    created = client.post("/api/outfits", json={"name": "Look", "item_ids": [item.id]}).json()

    _override_current_user(user_b)
    response = client.put(f"/api/outfits/{created['id']}", json={"name": "Geändert"})

    assert response.status_code == 404


def test_delete_outfit_returns_204(client) -> None:
    user = _seed_user(client.testing_session, "anna@example.com")
    item = _seed_item(client.testing_session, user.id, "Kleid", "dress")
    _override_current_user(user)
    created = client.post("/api/outfits", json={"name": "Look", "item_ids": [item.id]}).json()

    response = client.delete(f"/api/outfits/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/outfits/{created['id']}").status_code == 404


def test_delete_foreign_outfit_returns_404(client) -> None:
    user_a = _seed_user(client.testing_session, "anna@example.com")
    user_b = _seed_user(client.testing_session, "bob@example.com")
    item = _seed_item(client.testing_session, user_a.id, "Kleid", "dress")
    _override_current_user(user_a)
    created = client.post("/api/outfits", json={"name": "Look", "item_ids": [item.id]}).json()

    _override_current_user(user_b)
    response = client.delete(f"/api/outfits/{created['id']}")

    assert response.status_code == 404


def test_outfits_require_auth() -> None:
    with TestClient(app) as client:
        response = client.get("/api/outfits")

    assert response.status_code >= 400
