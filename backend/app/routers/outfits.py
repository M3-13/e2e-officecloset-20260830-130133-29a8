from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ClothingItem, Outfit, OutfitItem, User
from ..schemas import ClothingItemOut, OutfitCreate, OutfitOut, OutfitUpdate
from ..security import get_current_user

router = APIRouter()


def _to_clothing_item_out(item: ClothingItem) -> ClothingItemOut:
    image_url = f"/api/wardrobe/images/{item.image_filename}" if item.image_filename else ""
    return ClothingItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        color=item.color,
        brand=item.brand,
        notes=item.notes,
        image_url=image_url,
    )


def _to_outfit_out(outfit: Outfit) -> OutfitOut:
    items = [_to_clothing_item_out(oi.clothing_item) for oi in outfit.items]
    return OutfitOut(id=outfit.id, name=outfit.name, items=items)


def _owned_items(db: Session, user: User, item_ids: list[int]) -> list[ClothingItem]:
    items_by_id = {
        item.id: item
        for item in db.query(ClothingItem)
        .filter(ClothingItem.id.in_(set(item_ids)), ClothingItem.user_id == user.id)
        .all()
    }
    result: list[ClothingItem] = []
    for item_id in item_ids:
        item = items_by_id.get(item_id)
        if item is None:
            raise HTTPException(
                status_code=400,
                detail="Eines oder mehrere Kleidungsstücke gehören nicht dem Benutzer",
            )
        result.append(item)
    return result


def _get_owned_outfit(db: Session, user: User, outfit_id: int) -> Outfit:
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.user_id != user.id:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    return outfit


@router.post("", response_model=OutfitOut, status_code=201)
def create_outfit(
    payload: OutfitCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    items = _owned_items(db, user, payload.item_ids)
    outfit = Outfit(user_id=user.id, name=payload.name)
    db.add(outfit)
    db.flush()
    for item in items:
        db.add(OutfitItem(outfit_id=outfit.id, clothing_item_id=item.id))
    db.commit()
    db.refresh(outfit)
    return _to_outfit_out(outfit)


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutfitOut]:
    outfits = db.query(Outfit).filter(Outfit.user_id == user.id).order_by(Outfit.id).all()
    return [_to_outfit_out(outfit) for outfit in outfits]


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = _get_owned_outfit(db, user, outfit_id)
    return _to_outfit_out(outfit)


@router.put("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    payload: OutfitUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = _get_owned_outfit(db, user, outfit_id)
    if payload.name is not None:
        outfit.name = payload.name
    if payload.item_ids is not None:
        items = _owned_items(db, user, payload.item_ids)
        outfit.items.clear()
        for item in items:
            outfit.items.append(OutfitItem(clothing_item_id=item.id))
    db.commit()
    db.refresh(outfit)
    return _to_outfit_out(outfit)


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = _get_owned_outfit(db, user, outfit_id)
    db.delete(outfit)
    db.commit()
