import os
from contextlib import suppress
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.datastructures import FormData, UploadFile

from ..db import get_db
from ..models import ClothingItem, User
from ..schemas import ClothingItemOut
from ..security import get_current_user

router = APIRouter()

CATEGORIES = {"top", "bottom", "dress", "shoes", "accessory"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024


def _upload_dir() -> Path:
    return Path(os.environ.get("UPLOAD_DIR", "uploads"))


def _max_upload_size() -> int:
    return int(os.environ.get("MAX_UPLOAD_SIZE", str(DEFAULT_MAX_UPLOAD_SIZE)))


def _check_content_length(request: Request) -> None:
    header = request.headers.get("content-length")
    if header is None:
        return
    try:
        length = int(header)
    except ValueError:
        return
    if length > _max_upload_size():
        raise HTTPException(
            status_code=413,
            detail="Datei überschreitet die maximal zulässige Größe.",
        )


def _optional_str(form: FormData, key: str) -> str | None:
    value = form.get(key)
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return None


def _required_str(form: FormData, key: str) -> str:
    value = _optional_str(form, key)
    if value is None:
        raise HTTPException(status_code=400, detail=f"Feld '{key}' fehlt.")
    return value


async def _read_and_validate_image(image: UploadFile) -> tuple[bytes, str]:
    original = image.filename or ""
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unzulässiger Bildtyp. Erlaubt sind jpg, png und webp.",
        )
    content = await image.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Die Bilddatei ist leer.")
    if len(content) > _max_upload_size():
        raise HTTPException(
            status_code=413,
            detail="Datei überschreitet die maximal zulässige Größe.",
        )
    return content, ext


def _save_image(content: bytes, ext: str) -> str:
    upload_dir = _upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = uuid4().hex + ext
    (upload_dir / filename).write_bytes(content)
    return filename


def _delete_image(filename: str | None) -> None:
    if not filename:
        return
    with suppress(OSError):
        (_upload_dir() / filename).unlink(missing_ok=True)


def _get_owned_item(db: Session, item_id: int, user_id: int) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Kleidungsstück nicht gefunden.")
    return item


def _to_out(item: ClothingItem) -> ClothingItemOut:
    return ClothingItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        color=item.color,
        brand=item.brand,
        notes=item.notes,
        image_url=f"/api/wardrobe/images/{item.image_filename}" if item.image_filename else "",
    )


@router.post("/items", status_code=201, response_model=ClothingItemOut)
async def create_item(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    _check_content_length(request)
    form = await request.form()

    name = _required_str(form, "name")
    category = _required_str(form, "category")
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Ungültige Kategorie.")
    color = _optional_str(form, "color")
    brand = _optional_str(form, "brand")
    notes = _optional_str(form, "notes")

    image = form.get("image")
    if not isinstance(image, UploadFile):
        raise HTTPException(status_code=400, detail="Ein Bild ist erforderlich.")

    content, ext = await _read_and_validate_image(image)
    filename = _save_image(content, ext)

    item = ClothingItem(
        user_id=user.id,
        name=name,
        category=category,
        color=color,
        brand=brand,
        notes=notes,
        image_filename=filename,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.get("/items", response_model=list[ClothingItemOut])
def list_items(
    category: str | None = None,
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClothingItemOut]:
    query = db.query(ClothingItem).filter(ClothingItem.user_id == user.id)
    if category:
        query = query.filter(ClothingItem.category == category)
    if search:
        query = query.filter(ClothingItem.name.ilike(f"%{search}%"))
    items = query.order_by(ClothingItem.id).all()
    return [_to_out(item) for item in items]


@router.get("/items/{item_id}", response_model=ClothingItemOut)
def get_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    item = _get_owned_item(db, item_id, user.id)
    return _to_out(item)


@router.put("/items/{item_id}", response_model=ClothingItemOut)
async def update_item(
    item_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    _check_content_length(request)
    item = _get_owned_item(db, item_id, user.id)
    form = await request.form()

    for key in ("name", "color", "brand", "notes"):
        if key in form:
            value = _optional_str(form, key)
            if value is not None:
                setattr(item, key, value)

    if "category" in form:
        category = _optional_str(form, "category")
        if category is not None:
            if category not in CATEGORIES:
                raise HTTPException(status_code=400, detail="Ungültige Kategorie.")
            item.category = category

    image = form.get("image")
    if isinstance(image, UploadFile):
        content, ext = await _read_and_validate_image(image)
        new_filename = _save_image(content, ext)
        _delete_image(item.image_filename)
        item.image_filename = new_filename

    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    item = _get_owned_item(db, item_id, user.id)
    filename = item.image_filename
    db.delete(item)
    db.commit()
    _delete_image(filename)


@router.get("/images/{filename}")
def get_image(
    filename: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    safe_name = Path(filename).name
    item = db.query(ClothingItem).filter(ClothingItem.image_filename == safe_name).first()
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    path = _upload_dir() / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    return FileResponse(path)
