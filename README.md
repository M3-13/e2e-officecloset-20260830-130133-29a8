# Glamouröser Kleiderschrank-Manager

Ein vollwertiger Kleiderschrank-Manager mit Hollywood-/Red-Carpet-Optik. Benutzer
registrieren sich, verwalten ihre Kleidungsstücke mit Bildern und Kategorien,
durchstöbern ihre Garderobe und stellen im Outfit-Creator Outfits aus Einzelteilen
zusammen, die sie speichern, bearbeiten und wieder löschen können.

## Tech Stack

- **Backend**: FastAPI (Python 3.11), SQLAlchemy + SQLite, JWT + bcrypt, Uvicorn
- **Frontend**: React mit Vite (ruft die API über den Vite-Proxy `/api` → `http://localhost:8000` auf)
- **Auth**: Bearer-Token im `Authorization`-Header

## Installation

```bash
cd backend
py -m pip install -r requirements.txt
```

## Start (Entwicklung)

Der Backend-Server wird aus dem `backend/`-Verzeichnis gestartet:

```powershell
cd backend
$env:DATABASE_URL = "sqlite:///./wardrobe.db"
$env:CORS_ORIGIN  = "http://localhost:5173"
$env:UPLOAD_DIR   = "uploads"
$env:JWT_SECRET   = "<zufälliger Wert, z. B. 32 Byte hex>"
py -m uvicorn app.main:app --port 8000
```

Unter Linux/macOS entsprechend mit `export DATABASE_URL=...` usw.

Beim Start wird das Datenbank-Schema automatisch angelegt (`create_all`), eine
manuelle Migration ist nicht nötig. Der Server läuft anschließend unter
`http://localhost:8000`.

## Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen (deklariert in `RUN.json`):

| Variable       | Bedeutung                                        | Standard / Herkunft          |
| -------------- | ------------------------------------------------ | ---------------------------- |
| `DATABASE_URL` | SQLAlchemy-URL der Datenbank                     | `sqlite:///./wardrobe.db`    |
| `CORS_ORIGIN`  | Erlaubter Frontend-Origin (CORS)                 | `http://localhost:5173`      |
| `UPLOAD_DIR`   | Verzeichnis für hochgeladene Bilder              | `uploads`                    |
| `JWT_SECRET`   | Signaturgeheimnis für JWT-Tokens (kein Literal!) | pro Lauf generiert (`RUN.json`) |

`JWT_SECRET` ist **kein** Literal im Repository. Der Runner (`RUN.json`) erzeugt ihn
pro Lauf (`generate: hex, 32 bytes`); beim lokalen Start muss er manuell gesetzt
werden (siehe oben).

## API-Endpunkte

Alle Fehlerantworten haben die Form `{"detail": "<Meldung>"}`.

| Methode | Pfad                          | Body                                          | Erfolg                          |
| ------- | ----------------------------- | --------------------------------------------- | ------------------------------- |
| GET     | `/api/health`                 | –                                             | `200 {"status":"ok"}`           |
| POST    | `/api/auth/register`          | `{email, password}`                           | `201 {access_token, token_type}` |
| POST    | `/api/auth/login`             | `{email, password}`                           | `200 {access_token, token_type}` / `401` |
| GET     | `/api/wardrobe/items`         | Query: `category`, `search`                   | `200 [ClothingItemOut]`         |
| POST    | `/api/wardrobe/items`         | multipart (`name`, `category`, optional `color/brand/notes/image`) | `201 ClothingItemOut` |
| GET     | `/api/wardrobe/items/{id}`    | –                                             | `200 ClothingItemOut` / `404`   |
| PUT     | `/api/wardrobe/items/{id}`    | multipart (optionale Felder + `image`)        | `200 ClothingItemOut` / `404`   |
| DELETE  | `/api/wardrobe/items/{id}`    | –                                             | `204`                           |
| GET     | `/api/wardrobe/images/{filename}` | –                                         | `200` (Bild-Bytes) / `404`      |
| GET     | `/api/outfits`                | –                                             | `200 [OutfitOut]`               |
| POST    | `/api/outfits`                | `{name, item_ids: [int]}`                     | `201 OutfitOut`                 |
| GET     | `/api/outfits/{id}`           | –                                             | `200 OutfitOut` / `404`         |
| PUT     | `/api/outfits/{id}`           | `{name, item_ids: [int]}`                     | `200 OutfitOut` / `404`         |
| DELETE  | `/api/outfits/{id}`           | –                                             | `204`                           |
| DELETE  | `/api/users/me`               | –                                             | `204`                           |

### Datenformen

- `ClothingItemOut` — `{id: int, name: str, category: str, color: str|null, brand: str|null, notes: str|null, image_url: str}`
- `OutfitOut` — `{id: int, name: str, items: [ClothingItemOut]}`
- `category` ∈ `{top, bottom, dress, shoes, accessory}`
- `image_url` = `/api/wardrobe/images/{filename}`

### Fehlerstatus

- `401` fehlender/ungültiger Token
- `404` fremde oder nicht existierende Ressource
- `400` Validierungsfehler
- `413` Upload zu groß

## Features

- Registrierung und Anmeldung (JWT + bcrypt)
- Garderobe: Kleidungsstücke mit Bild, Kategorie und Details anlegen, durchsuchen und filtern
- Bilder-Upload mit Größen- und Typ-Prüfung
- Outfit-Creator: Outfits aus eigenen Kleidungsstücken zusammenstellen und verwalten
- Kontolöschung inklusive aller zugehörigen Daten und Bilder
