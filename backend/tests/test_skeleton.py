from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_200() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_models_importable() -> None:
    from app.models import ClothingItem, Outfit, OutfitItem, User

    assert User.__tablename__ == "users"
    assert ClothingItem.__tablename__ == "clothing_items"
    assert Outfit.__tablename__ == "outfits"
    assert OutfitItem.__tablename__ == "outfit_items"


def test_schemas_importable() -> None:
    from app.schemas import (
        ClothingItemCreate,
        ClothingItemOut,
        ClothingItemUpdate,
        OutfitCreate,
        OutfitOut,
        OutfitUpdate,
        TokenResponse,
        UserCreate,
        UserOut,
    )

    user = UserCreate(email="anna@example.com", password="geheim")
    assert user.email == "anna@example.com"

    token = TokenResponse(access_token="abc", token_type="bearer")
    assert token.token_type == "bearer"

    item = ClothingItemCreate(name="Kleid", category="dress")
    assert item.category == "dress"

    outfit = OutfitCreate(name="Abendlook", item_ids=[1, 2])
    assert outfit.item_ids == [1, 2]

    item_out = ClothingItemOut(
        id=1, name="Kleid", category="dress", image_url="/api/wardrobe/images/x.png"
    )
    assert item_out.image_url.startswith("/api/wardrobe/images/")

    outfit_out = OutfitOut(id=1, name="Abendlook", items=[item_out])
    assert outfit_out.items[0].id == 1

    assert UserOut(id=1, email="a@b.c").id == 1
    assert ClothingItemUpdate(name="Neu").name == "Neu"
    assert OutfitUpdate(name="Neu").name == "Neu"
