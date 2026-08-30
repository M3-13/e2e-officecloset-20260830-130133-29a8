from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)

    clothing_items: Mapped[list["ClothingItem"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    outfits: Mapped[list["Outfit"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    brand: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    image_filename: Mapped[str | None] = mapped_column(String, nullable=True)

    owner: Mapped["User"] = relationship(back_populates="clothing_items")
    outfit_items: Mapped[list["OutfitItem"]] = relationship(
        back_populates="clothing_item", cascade="all, delete-orphan"
    )


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)

    owner: Mapped["User"] = relationship(back_populates="outfits")
    items: Mapped[list["OutfitItem"]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    outfit_id: Mapped[int] = mapped_column(ForeignKey("outfits.id"), index=True)
    clothing_item_id: Mapped[int] = mapped_column(ForeignKey("clothing_items.id"), index=True)

    outfit: Mapped["Outfit"] = relationship(back_populates="items")
    clothing_item: Mapped["ClothingItem"] = relationship(back_populates="outfit_items")
