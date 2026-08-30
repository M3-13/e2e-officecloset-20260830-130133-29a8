VERDICT: CHANGES_REQUESTED

# Rechts- und Marktkonformitätsbericht

Bewertet wird das zusammengeführte Produkt **„OfficeCloset – Glamouröser Kleiderschrank-Manager“** auf Basis der **aktuell sichtbaren Dateien**.  
Der Bericht ist nach Rechtsbereichen gegliedert. Schweregrade: `kritisch`, `hoch`, `mittel`, `niedrig`.

---

## 1. DSGVO / Datenschutz

### 1.1 Datenschutzerklärung ist inhaltlich unvollständig
- **Schweregrad:** hoch
- **Betroffene Datei:** `frontend/src/pages/Privacy.jsx`
- **Befund:**  
  Die Seite benennt zwar Verantwortlichen, Kategorien, Zwecke und Löschung, erfüllt aber **nicht die Informationspflichten nach Art. 13 DSGVO**. Es fehlen insbesondere:
  - die **Rechtsgrundlagen** der Verarbeitung (Art. 6 Abs. 1 DSGVO),
  - die **Speicherdauer** bzw. Kriterien für die Festlegung der Speicherdauer,
  - die **Betroffenenrechte** (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Widerruf einer Einwilligung),
  - ein Hinweis auf das **Beschwerderecht bei einer Aufsichtsbehörde**,
  - Angaben zu **Empfängern oder Kategorien von Empfängern**,
  - Angaben zu einer **Datenschutzaufsicht/Verantwortlichkeit** mit ladungsfähigen Kontaktdaten.
- **Konkrete Abhilfe:**  
  `Privacy.jsx` um die Abschnitte ergänzen, z. B.:
  - „Rechtsgrundlagen: Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung des Kontos und der Garderobenfunktion; Art. 6 Abs. 1 lit. f DSGVO für technisch notwendige Sicherheitsmaßnahmen; Art. 6 Abs. 1 lit. a DSGVO, sofern künftig eine Einwilligung eingeholt wird.“
  - „Speicherdauer: Die Daten werden gespeichert, bis Sie Ihr Konto löschen oder ein Löschungsgrund nach Art. 17 DSGVO vorliegt; Bilddateien werden mit dem zugehörigen Kleidungsstück entfernt.“
  - „Ihre Rechte: Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch und Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde.“
  - „Empfänger: Eine Übermittlung an Dritte findet nicht statt; die Daten bleiben auf dem von Ihnen betriebenen Server.“

### 1.2 Backend erzwingt keine Mindestanforderungen für Passwörter
- **Schweregrad:** mittel
- **Betroffene Datei:** `backend/app/schemas.py`, betroffen ist `class UserCreate`
- **Befund:**  
  Das Schema akzeptiert ein beliebiges `password: str`, einschließlich leerer oder sehr kurzer Passwörter. Die Mindestlänge von 8 Zeichen wird nur im Frontend (`Register.jsx`) geprüft. Direkte API-Aufrufe können diese Prüfung umgehen. Das beeinträchtigt die **Integrität und Vertraulichkeit** nach Art. 5 Abs. 1 lit. f DSGVO und widerspricht dem Grundsatz „data protection by default“.
- **Konkrete Abhilfe:**  
  In `backend/app/schemas.py` das Passwortfeld restriktiv validieren, z. B.:
  ```python
  from pydantic import Field

  class UserCreate(BaseModel):
      email: str
      password: str = Field(..., min_length=8, max_length=128)
  ```
  Zusätzlich im Login-/Registrierungs-Endpunkt keine kürzeren Passwörter akzeptieren. Die Frontend-Prüfung bleibt erhalten, ist aber keine alleinige Sicherheitsmaßnahme.

### 1.3 Upload-Grenze wird nicht zuverlässig vor dem Einlesen des gesamten Bodys erzwungen
- **Schweregrad:** hoch
- **Betroffene Datei:** `backend/app/routers/wardrobe.py`, insbesondere `_check_content_length`, `_read_and_validate_image` und `create_item`
- **Befund:**  
  Die Prüfung `_check_content_length` greift nur, wenn ein `Content-Length`-Header gesendet wird und dieser die Grenze überschreitet. Bei:
  - fehlendem Header,
  - irreführendem Header,
  - Chunked Transfer Encoding
  wird der Body dennoch vollständig durch `request.form()` bzw. `await image.read()` **in den Arbeitsspeicher** eingelesen, bevor die Größenprüfung stattfindet.  
  Das verletzt AC-13 und die Datensparsamkeit/Sicherheit (Art. 5 Abs. 1 lit. c und f DSGVO, CRA). Bei sehr großen Dateien droht Speichererschöpfung.
- **Konkrete Abhilfe:**  
  `create_item`/`update_item` so umbauen, dass die Multipart-Daten **streamend** gelesen und gezählt werden. Die Maximalgröße muss während des Lesens erzwungen werden, nicht erst nach dem vollständigen Einlesen.  
  Beispielskizze:
  ```python
  async def read_limited(file: UploadFile, limit: int) -> bytes:
      chunks = []
      total = 0
      while chunk := await file.read(1024 * 64):
          total += len(chunk)
          if total > limit:
              raise HTTPException(status_code=413, detail="...")
          chunks.append(chunk)
      return b"".join(chunks)
  ```
  Die Header-Prüfung kann als zusätzliche schnelle Abweisung bleiben, ist aber **nicht ausreichend**.

### 1.4 Keine Normalisierung der E-Mail-Adresse
- **Schweregrad:** niedrig
- **Betroffene Datei:** `backend/app/models.py` und `backend/app/routers/auth.py`
- **Befund:**  
  E-Mails werden nicht normalisiert (Groß-/Kleinschreibung). SQLite speichert Text standardmäßig case-sensitiv. Dadurch können z. B. `anna@example.com` und `ANNA@example.com` zwei getrennte Konten sein, was die Datenrichtigkeit (Art. 5 Abs. 1 lit. d DSGVO) beeinträchtigt.
- **Konkrete Abhilfe:**  
  E-Mail bei Registrierung und Login konsequent normalisieren, z. B. `email.strip().lower()` im Schema oder im Endpunkt. Alternativ das Modell auf eine case-insensitive Collation umstellen.

### 1.5 Löschpflicht und Datenminimierung – positive Befunde
- Die Kontolöschung (`DELETE /api/users/me` in `backend/app/routers/account.py`) entfernt Benutzer, Kleidungsstücke, Outfits, Zuordnungen und Bilddateien. Dies ist geeignet, Art. 17 DSGVO und die Löschpflicht aus der Datenschutzerklärung umzusetzen.
- Passwörter werden mit bcrypt gehasht gespeichert; kein Klartext sichtbar.
- Der globale Exception-Handler `backend/app/main.py` protokolliert nur Methode und Pfad, **nicht** E-Mail, Passwort, Körper oder Bildinhalte. Kein PII-Leak in Logs sichtbar.

---

## 2. EU Cyber Resilience Act (CRA)

### 2.1 Fehlende Security-Header
- **Schweregrad:** hoch
- **Betroffene Datei:** `backend/app/main.py` (und optional `frontend/index.html`)
- **Befund:**  
  Die Anwendung setzt keine sicherheitsrelevanten HTTP-Header. Es fehlen z. B.:
  - Content-Security-Policy (CSP)
  - X-Content-Type-Options: nosniff
  - Referrer-Policy
  - X-Frame-Options / frame-ancestors
  - Permissions-Policy
- **Konkrete Abhilfe:**  
  In `backend/app/main.py` eine Middleware für Sicherheits-Header ergänzen, die mit den **eigenen Ressourcenflüssen** kompatibel ist.  
  Beispiel-CSP, die das Produkt nicht bricht:
  ```python
  @app.middleware("http")
  async def security_headers(request, call_next):
      response = await call_next(request)
      response.headers["Content-Security-Policy"] = (
          "default-src 'self'; "
          "img-src 'self' blob:; "
          "script-src 'self'; "
          "style-src 'self' 'unsafe-inline'; "
          "connect-src 'self'; "
          "font-src 'self'; "
          "object-src 'none'; "
          "base-uri 'self'; "
          "frame-ancestors 'none'"
      )
      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
      response.headers["X-Frame-Options"] = "DENY"
      return response
  ```
  **Reconciliation-Hinweis:**  
  Die Anwendung nutzt `URL.createObjectURL(blob)` für Bilder (`frontend/src/api/client.js`). Deshalb muss `img-src 'self' blob:` enthalten sein.  
  `style-src 'unsafe-inline'` ist derzeit nötig, weil `frontend/src/pages/Settings.jsx` ein `<style>`-Element inline einbettet. Für eine striktere CSP diese Regeln nach `frontend/src/pages/outfits.css` bzw. eine neue `settings.css` auslagern und dann `style-src 'self'` verwenden.

### 2.2 Fehlende serverseitige Eingabelängengrenzen
- **Schweregrad:** mittel
- **Betroffene Datei:** `backend/app/schemas.py`
- **Befund:**  
  Textfelder (`name`, `category`, `color`, `brand`, `notes`, `email`) sind nicht auf Maximallängen beschränkt. Sehr lange Eingaben können Datenbank, Speicher und API unverhältnismäßig belasten.
- **Konkrete Abhilfe:**  
  In den Pydantic-Schemas explizite `max_length`-Werte setzen, z. B.:
  - `email`: `max_length=254`
  - `name`: `max_length=100`
  - `category`: `max_length=30`
  - `color`, `brand`: `max_length=50`
  - `notes`: `max_length=2000`

### 2.3 Bildvalidierung nur anhand der Dateiendung
- **Schweregrad:** mittel
- **Betroffene Datei:** `backend/app/routers/wardrobe.py`
- **Befund:**  
  `_read_and_validate_image` prüft nur die Endung (`.jpg`, `.jpeg`, `.png`, `.webp`). Schadcode kann unter erlaubter Endung hochgeladen werden. Das ist ein Sicherheitsrisiko im Sinne des CRA (security by design).
- **Konkrete Abhilfe:**  
  Zusätzlich den **Dateiinhalt** validieren, z. B. mit Pillow:
  ```python
  from PIL import Image
  from io import BytesIO

  def validate_image_content(content: bytes) -> None:
      try:
          with Image.open(BytesIO(content)) as img:
              if img.format not in {"JPEG", "PNG", "WEBP"}:
                  raise HTTPException(status_code=400, detail="Unzulässiger Bildinhalt.")
              img.verify()
      except Exception:
          raise HTTPException(status_code=400, detail="Ungültige Bilddatei.")
  ```
  Die Prüfung muss mit der Größenbegrenzung aus 1.3 kombiniert werden.

### 2.4 SBOM / Dependency-Transparenz nicht sichtbar
- **Schweregrad:** mittel
- **Betroffene Datei:** `backend/requirements.txt`, `frontend/package.json`
- **Befund:**  
  Eine maschinenlesbare SBOM (Software Bill of Materials) ist in den sichtbaren Dateien nicht vorhanden. Der CRA verlangt für Produkte mit digitalen Elementen eine dokumentierte, nachvollziehbare Abhängigkeitsliste.
- **Konkrete Abhilfe:**  
  Eine SBOM im CycloneDX- oder SPDX-Format erzeugen und im Repo ablegen, z. B. `backend/sbom.cdx.json` und `frontend/sbom.cdx.json`. Zusätzlich einen Prozess oder Hinweis in `README.md`/`AGENTS.md` ergänzen, wie Aktualisierungen und Schwachstellenprüfungen (z. B. `pip-audit`, `npm audit`) durchgeführt werden.

### 2.5 Rate-Limiting als In-Memory-Lösung
- **Schweregrad:** niedrig
- **Betroffene Datei:** `backend/app/routers/auth.py`
- **Befund:**  
  Die Rate-Limit-Zähler liegen nur im Prozessspeicher und werden nicht automatisch bereinigt. Bei mehreren Uvicorn-Workern wirkt das Limit pro Worker unterschiedlich.
- **Konkrete Abhilfe:**  
  Für Produktivbetrieb ein persistentes/geteiltes Limit (z. B. Redis) oder ein sauberes Ablaufverfahren (periodisches Entfernen alter Einträge) vorsehen. Für eine Einzelprozess-Demo ist die aktuelle Lösung funktional, aber nicht skalierbar.

---

## 3. EU AI Act

- **Schweregrad:** entfällt
- **Prüfung:** keine KI-/ML-Funktion im Produkt erkennbar. Es sind keine automatisierten Entscheidungen, keine biometrischen Auswertungen oder generative KI-Systeme sichtbar.
- **Konkrete Abhilfe:** keine erforderlich.

---

## 4. Pflichttexte und Benutzeroberfläche

### 4.1 Impressum enthält Platzhalterangaben
- **Schweregrad:** hoch
- **Betroffene Datei:** `frontend/src/pages/Imprint.jsx`
- **Befund:**  
  Das Impressum benennt Musteradresse, Mustervertreter und eine Beispiel-E-Mail (`kontakt@officecloset.example`) und erklärt selbst, alle Angaben seien „beispielhaft“. Für einen **öffentlichen Web-Auftritt** sind fiktive Angaben keine ausreichende Anbieterkennzeichnung nach § 5 DDG bzw. § 18 Abs. 2 MStV.
- **Konkrete Abhilfe:**  
  Vor Veröffentlichung die Platzhalter durch die **tatsächlichen** ladungsfähigen Angaben ersetzen. Idealerweise als konfigurierbare Konstanten/Umgebungsvariablen auslagern und die Demo-Werte nur im lokalen Entwicklungsmodus anzeigen.

### 4.2 Datenschutzerklärung inhaltlich erweitern
- **Schweregrad:** hoch
- **Betroffene Datei:** `frontend/src/pages/Privacy.jsx`
- **Befund:**  
  Wie in 1.1 dargestellt, fehlen Rechtsgrundlagen, Speicherdauer, Betroffenenrechte, Beschwerdehinweis und Empfängerangaben.
- **Konkrete Abhilfe:**  
  Die in 1.1 genannten Inhalte ergänzen.

### 4.3 Cookie-/Consent-Banner nicht erforderlich
- **Schweregrad:** entfällt / positiv
- **Befund:**  
  Die Anwendung verwendet keine Tracking-Cookies, keine Drittressourcen und keine nicht-technisch notwendigen Cookies. Der JWT wird in `localStorage` gespeichert, was für die technisch notwendige Authentifizierung erforderlich ist und keine Einwilligungspflicht auslöst.
- **Konkrete Abhilfe:** keine Consent-Banner erforderlich.

### 4.4 Kein Widerrufsrecht / kein Shop
- **Schweregrad:** entfällt / positiv
- **Befund:**  
  Es sind keine Verkaufstransaktionen, Preise oder Bestellprozesse sichtbar. Eine Widerrufsbelehrung ist daher nicht nötig.

---

## 5. Barrierefreiheit / WCAG / BITV / EAA

### 5.1 Grundlegende Barrierefreiheitsmerkmale sind vorhanden
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/index.html`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`
- **Befund:**  
  Positiv sichtbar:
  - `lang="de"` in `index.html`,
  - semantische Überschriften (`h1`, `h2`),
  - verknüpfte Labels über `htmlFor`/`id` bei Login- und Registrierformular,
  - Fehlerboxen mit `role="alert"` bzw. `role="status"`,
  - responsive Grundstruktur,
  - Buttons mit Textinhalten.
- **Konkrete Abhilfe:**  
  Keine akute Pflicht. Bei vollständiger Sichtung der gekürzten Dateien wäre noch auf durchgängige Alt-Texte in `Wardrobe.jsx`/`Outfits.jsx` zu achten.

### 5.2 Kein Skip-Link und keine dokumentierte Tastaturfokus-Sichtbarkeit
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/App.jsx`, `frontend/src/styles/app.css`
- **Befund:**  
  Ein „Navigation überspringen“-Link fehlt. Deutliche Fokus-Styles sind in `app.css` nicht sichtbar; interaktive Elemente könnten für Tastaturnutzer schwer erkennbar sein.
- **Konkrete Abhilfe:**
  - In `frontend/src/App.jsx` vor der Hauptnavigation einen Skip-Link ergänzen:
    ```jsx
    <a href="#main-content" className="skip-link">Zum Inhalt springen</a>
    ```
  - In `frontend/src/styles/app.css` Fokus-Stile ergänzen:
    ```css
    :focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    ```

### 5.3 Inline-Style in Settings beeinträchtigt CSP und Wartbarkeit
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/pages/Settings.jsx`
- **Befund:**  
  Die Komponente enthält ein `<style>{styles}</style>`-Element. Das verhindert eine strikte CSP (`style-src 'self'`) und erschwert die Prüfung von Styling.
- **Konkrete Abhilfe:**  
  Die Styles in eine eigene Datei `frontend/src/pages/settings.css` auslagern und in `Settings.jsx` importieren, damit die CSP auf `style-src 'self'` gesetzt werden kann.

---

## 6. Abstimmung mit bestehenden Produktflüssen

Bei der Umsetzung der geforderten Sicherheitsmaßnahmen ist sicherzustellen, dass die eigenen Funktionen weiterhin funktionieren:

- **CSP:** `img-src 'self' blob:` zulassen, da `fetchImageAsObjectUrl` Blob-URLs für Bilder verwendet.
- **Security-Header:** Middleware darf PDF/Bild-Downloads oder API-Antworten nicht blockieren; keine restriktiven `Cross-Origin-Embedder-Policy`-Header einführen, solange keine Vollisolierung erforderlich ist.
- **Upload-Limit:** Die Streaming-Lösung muss weiterhin `multipart/form-data` mit den Feldern `name`, `category`, `color`, `brand`, `notes`, `image` akzeptieren.
- **Passwort-Validierung:** Die im Backend gesetzte Mindestlänge muss mit der Frontend-Validierung übereinstimmen (8 Zeichen), damit Anwender nicht eine im Frontend akzeptierte Eingabe machen, die das Backend ablehnt.

---

## 7. Ergebnis

- **Vollzugsfähige technische Blocker** wurden nicht gefunden.
- **Mehrere behebbare Lücken** bestehen, vor allem bei den Informationspflichten, der serverseitigen Passwort-Validierung, der Upload-Begrenzung sowie den CRA-Sicherheitsanforderungen.
- Eine Freigabe als **marktreif für öffentliche Nutzer** sollte erst nach Umsetzung der als `hoch` markierten Punkte erfolgen.

**Veredict im Detail: CHANGES_REQUESTED**