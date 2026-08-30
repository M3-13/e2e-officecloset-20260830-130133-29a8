from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class ClothingItemCreate(BaseModel):
    name: str
    category: str
    color: str | None = None
    brand: str | None = None
    notes: str | None = None


class ClothingItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    color: str | None = None
    brand: str | None = None
    notes: str | None = None


class ClothingItemOut(BaseModel):
    id: int
    name: str
    category: str
    color: str | None = None
    brand: str | None = None
    notes: str | None = None
    image_url: str


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitUpdate(BaseModel):
    name: str | None = None
    item_ids: list[int] | None = None


class OutfitOut(BaseModel):
    id: int
    name: str
    items: list[ClothingItemOut]
