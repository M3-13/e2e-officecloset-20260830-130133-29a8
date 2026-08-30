from pathlib import Path

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import ClothingItem, Outfit, OutfitItem, User
from app.security import get_current_user

TARGET_EMAIL = "anna@example.com"

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _override_get_current_user(db: Session = Depends(get_db)) -> User:
    return db.query(User).filter(User.email == TARGET_EMAIL).one()


app.dependency_overrides[get_db] = _override_get_db
app.dependency_overrides[get_current_user] = _override_get_current_user


@pytest.fixture(autouse=True)
def _setup(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_delete_account_removes_user_items_outfits_and_files(tmp_path: Path) -> None:
    with TestingSessionLocal() as db:
        anna = User(email=TARGET_EMAIL, password_hash="hash")
        db.add(anna)
        db.flush()

        item_with_image = ClothingItem(
            user_id=anna.id, name="Abendkleid", category="dress", image_filename="a1.jpg"
        )
        item_without_image = ClothingItem(
            user_id=anna.id, name="Clutch", category="accessory", image_filename=None
        )
        db.add_all([item_with_image, item_without_image])
        db.flush()

        outfit = Outfit(user_id=anna.id, name="Abendlook")
        db.add(outfit)
        db.flush()
        db.add(OutfitItem(outfit_id=outfit.id, clothing_item_id=item_with_image.id))
        db.commit()

    (tmp_path / "a1.jpg").write_bytes(b"image-a")

    with TestClient(app) as client:
        response = client.delete("/api/users/me")

    assert response.status_code == 204

    with TestingSessionLocal() as db:
        assert db.query(User).filter(User.email == TARGET_EMAIL).count() == 0
        assert db.query(ClothingItem).count() == 0
        assert db.query(Outfit).count() == 0
        assert db.query(OutfitItem).count() == 0

    assert not (tmp_path / "a1.jpg").exists()


def test_delete_account_leaves_other_users_data_untouched(tmp_path: Path) -> None:
    with TestingSessionLocal() as db:
        anna = User(email=TARGET_EMAIL, password_hash="hash")
        bob = User(email="bob@example.com", password_hash="hash")
        db.add_all([anna, bob])
        db.flush()

        anna_item = ClothingItem(
            user_id=anna.id, name="Abendkleid", category="dress", image_filename="a1.jpg"
        )
        bob_item = ClothingItem(
            user_id=bob.id, name="Hose", category="bottom", image_filename="b1.jpg"
        )
        db.add_all([anna_item, bob_item])
        db.flush()

        bob_outfit = Outfit(user_id=bob.id, name="Alltag")
        db.add(bob_outfit)
        db.flush()
        db.add(OutfitItem(outfit_id=bob_outfit.id, clothing_item_id=bob_item.id))
        db.commit()

    (tmp_path / "a1.jpg").write_bytes(b"image-a")
    (tmp_path / "b1.jpg").write_bytes(b"image-b")

    with TestClient(app) as client:
        response = client.delete("/api/users/me")

    assert response.status_code == 204

    with TestingSessionLocal() as db:
        assert db.query(User).filter(User.email == TARGET_EMAIL).count() == 0
        assert db.query(User).filter(User.email == "bob@example.com").count() == 1
        remaining_items = db.query(ClothingItem).all()
        assert len(remaining_items) == 1
        assert remaining_items[0].name == "Hose"
        assert db.query(Outfit).count() == 1
        assert db.query(OutfitItem).count() == 1

    assert not (tmp_path / "a1.jpg").exists()
    assert (tmp_path / "b1.jpg").exists()
