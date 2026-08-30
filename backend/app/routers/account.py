import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ClothingItem, Outfit, OutfitItem, User
from ..security import get_current_user

router = APIRouter()


@router.delete("/me", status_code=204)
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    image_filenames = [
        filename
        for (filename,) in db.query(ClothingItem.image_filename)
        .filter(ClothingItem.user_id == user.id)
        .all()
        if filename
    ]

    upload_dir = Path(os.environ.get("UPLOAD_DIR", "uploads"))
    for filename in image_filenames:
        try:
            (upload_dir / filename).unlink(missing_ok=True)
        except OSError:
            continue

    outfit_ids = [
        outfit_id for (outfit_id,) in db.query(Outfit.id).filter(Outfit.user_id == user.id).all()
    ]

    if outfit_ids:
        db.query(OutfitItem).filter(OutfitItem.outfit_id.in_(outfit_ids)).delete(
            synchronize_session=False
        )

    db.query(Outfit).filter(Outfit.user_id == user.id).delete(synchronize_session=False)
    db.query(ClothingItem).filter(ClothingItem.user_id == user.id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()
