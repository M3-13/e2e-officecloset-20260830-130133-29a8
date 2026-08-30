VERDICT: CHANGES_REQUESTED

## Scanner-Lage
Die vorgesehenen automatischen Scanner `bandit` und `semgrep` wurden als `[skipped]` gemeldet; es liegen keine SAST-Ergebnisse vor. Auch `pip-audit`/`npm audit` sind nicht gelaufen. Die folgende Bewertung stützt sich daher auf manuelle Codeanalyse der vorgelegten Dateien.

## Befunde

### [Mittel] Upload-Größenprüfung umgehbar / Ressourcen-DoS
- **Datei:** `backend/app/routers/wardrobe.py` (`_check_content_length`, `_read_and_validate_image`)
- **Beschreibung:** `_check_content_length` prüft ausschließlich den `Content-Length`-Header. Fehlt dieser Header oder ist er ungültig, wird der gesamte Multipart-Body durch `await request.form()` und anschließend `await image.read()` vollständig eingelesen. Erst danach wird die Dateigröße geprüft. Ein authentifizierter Angreifer kann so sehr große Uploads ohne gültigen `Content-Length`-Header senden und Arbeitsspeicher bzw. Plattenplatz stark belasten.
- **Konkreter Fix:** Die Bilddatei in Chunks lesen und sofort abbrechen, sobald die maximale Größe überschritten ist:
  ```python
  max_size = _max_upload_size()
  content = b""
  while chunk := await image.read(8192):
      content += chunk
      if len(content) > max_size:
          raise HTTPException(status_code=413, detail="Datei überschreitet die maximal zulässige Größe.")
  ```
  Zusätzlich sollte der Multipart-Parser selbst ein maximales Limit erhalten, damit bereits `request.form()` keine beliebig großen Bodies verarbeitet.

### [Mittel] Fehlende serverseitige Validierung von E-Mail und Passwortlänge; bcrypt-Fehler führt zu 500
- **Dateien:** `backend/app/schemas.py` (`UserCreate`), `backend/app/routers/auth.py` (`register`, `login`)
- **Beschreibung:** `UserCreate` erlaubt beliebig lange Strings für `email` und `password`. Aktuelle Python-bcrypt-Versionen verarbeiten Passwörter über 72 Byte nicht sauber; `bcrypt.hashpw`/`bcrypt.checkpw` kann mit `ValueError` abbrechen. Über den globalen Exception-Handler wird daraus ein generischer HTTP 500. Es fehlt eine serverseitige E-Mail-Validierung und eine Passwortlängenbegrenzung.
- **Konkreter Fix:**
  ```python
  from pydantic import BaseModel, EmailStr, Field, ConfigDict

  class UserCreate(BaseModel):
      email: EmailStr
      password: str = Field(min_length=8, max_length=72)
  ```
  Zusätzlich in `auth.py` den bcrypt-Aufruf gegen `ValueError` absichern und als verständlichen HTTP 400 zurückgeben.

### [Niedrig] Dateityp-Validierung nur anhand Dateiendung
- **Datei:** `backend/app/routers/wardrobe.py` (`_read_and_validate_image`)
- **Beschreibung:** Es wird ausschließlich die Dateiendung aus `image.filename` gegen eine Whitelist geprüft. Der tatsächliche Dateiinhalt wird nicht verifiziert. Dadurch kann z. B. eine Datei mit beliebigem Inhalt und der Endung `.jpg` gespeichert werden.
- **Konkreter Fix:** Magische Bytes/Signatur prüfen, z. B. mit `filetype`, `python-magic` oder `PIL.Image.verify()`, und nur echte JPEG-, PNG- bzw. WebP-Dateien akzeptieren.

### [Niedrig] Fehlende Security-Header
- **Datei:** `backend/app/main.py`
- **Beschreibung:** Es werden keine `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy` oder vergleichbare Header gesetzt. Besonders das Fehlen von `X-Content-Type-Options: nosniff` kann in älteren Browsern MIME-Sniffing begünstigen.
- **Konkreter Fix:** Eine Middleware ergänzen, die `X-Content-Type-Options: nosniff` sowie eine passende CSP setzt. Dabei die produktiv genutzten Ressourcen erlauben, damit die Anwendung funktionsfähig bleibt:
  ```
  default-src 'self';
  img-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  connect-src 'self';
  ```
  Die Freigabe von `style-src 'unsafe-inline'` ist erforderlich, weil `Settings.jsx` ein inline `<style>`-Element verwendet und die SPA die eigenen lokalen Ressourcen weiterhin laden muss.

### [Niedrig] Rate-Limiting nur im Prozessspeicher und nicht proxy-aware
- **Datei:** `backend/app/routers/auth.py` (`_request_times`, `_client_ip`)
- **Beschreibung:** `_request_times` liegt im Prozessspeicher. Bei mehreren Uvicorn-Workern greift das Limit nur pro Worker und nicht global. `_client_ip` nutzt ausschließlich `request.client.host`; hinter einem Reverse-Proxy sehen dadurch alle Clients so aus, als hätten sie dieselbe IP.
- **Konkreter Fix:** Gemeinsamen Store (z. B. Redis) verwenden oder das Rate-Limiting auf Gateway-/Proxy-Ebene umsetzen. Falls ein Reverse-Proxy verwendet wird, `X-Forwarded-For` nur aus vertrauenswürdigen Proxies auswerten.

### [Niedrig] LIKE-Suche erlaubt Wildcard-Zeichen
- **Datei:** `backend/app/routers/wardrobe.py` (`list_items`)
- **Beschreibung:** `search` wird in `ClothingItem.name.ilike(f"%{search}%")` eingesetzt. Eine SQL-Injection liegt nicht vor, weil SQLAlchemy den Wert bindet. Benutzer können jedoch `%` oder `_` als Wildcards verwenden und so die Suchsemantik ungewollt verändern.
- **Konkreter Fix:**
  ```python
  escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
  query = query.filter(ClothingItem.name.ilike(f"%{escaped}%", escape="\\"))
  ```

### [Hinweis] Nicht vollständig einsehbare Dateiteile / Scanner-Lücke
- **Dateien:** `backend/app/routers/wardrobe.py` (insbesondere der Bild-Auslieferungs-Endpunkt ab der abgeschnittenen Stelle), `frontend/src/pages/Wardrobe.jsx`, `frontend/src/pages/Outfits.jsx`, `frontend/src/pages/outfits.css`
- **Beschreibung:** Die vorgelegten Inhalte sind teilweise abgeschnitten. Der tatsächliche Bild-Endpunkt `/api/wardrobe/images/{filename}` ist im sichtbaren Ausschnitt nicht enthalten; er muss separat auf Besitzer-Zuordnung und Path-Traversal geprüft werden.
- **Konkreter Fix:** Vor dem Ship den vollständigen Quelltext dieses Endpunkts reviewen. In der CI `pip-audit`, `npm audit`, `bandit` und `semgrep` fest einbauen, damit die derzeit übersprungenen Prüfungen künftig laufen.

## Positive Sicherheitsmerkmale
- Kein hartkodiertes JWT-Secret sichtbar; `_jwt_secret()` lädt `JWT_SECRET` aus der Umgebung.
- CORS ist auf den konfigurierten Frontend-Origin begrenzt; `Access-Control-Allow-Origin` ist nicht `*`.
- Besitzer-Zuordnung ist bei Kleidungsstücken und Outfits in den sichtbaren CRUD-Teilen umgesetzt; fremde Ressourcen liefern 404.
- Login- und Registrierungs-Endpunkte sind rate-limitiert.
- Kontolöschung entfernt eigene Datensätze und zugehörige Bilddateien.
- Datenbankzugriffe verwenden SQLAlchemy-gebundene Parameter; die sichtbaren Such-/Filterabfragen sind nicht SQL-injizierbar.