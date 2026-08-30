VERDICT: BUGS_FOUND

Ich kann die angehängten Screenshots nicht sehen; ich beurteile anhand des Textreports.

**Bug 1:**

- **Title:** E2E-Smoke-Test schlägt im Playwright-Gesamtlauf fehl – Auth-Endpunkte liefern 429 durch Test-Rate-Limit-Kollision
- **Symptom:** Der primäre Benutzerfluss (Registrieren + Anmelden) kann im Playwright-Gesamtlauf keine Session aufbauen; die Auth-Endpunkte antworten mit `429 Too Many Requests`, obwohl die Anwendung isoliert funktioniert. Aus Benutzersicht würde ein Nutzer, der nach mehreren Versuchen von derselben IP kommt (z. B. in einer geteilten Testumgebung), blockiert und kann sich nicht anmelden.
- **Repro:** `playwright test` mit 14 Tests und 4 Workern ausführen. Der Test `e2e/_smoke.spec.cjs:11:1` läuft nach mehreren anderen Auth-Tests und erhält `429` für `/api/auth/register` und `/api/auth/login`.
- **Evidence:**
  ```
  [account-probe] POST /api/auth/register -> 429
  [account-probe] POST /api/auth/login -> 429
  [account-probe] session after sign-up + sign-in: NONE
  1) e2e\_smoke.spec.cjs:11:1 › app loads and survives an interaction crawl without runtime errors ─
      Error: the primary user flow does not work: signing up and signing in produced no session, and the server answered:
      POST /api/auth/register -> 429
      POST /api/auth/login -> 429
  ```
- **Suspected file(s):** Nicht eindeutig einem einzelnen Produktfile zuzuordnen – die Ursache liegt in der Interaktion zwischen dem niedrigen Rate-Limit (`AUTH_RATE_LIMIT = 5` in `backend/app/routers/auth.py`), der geteilten Client-IP in der Testumgebung und dem parallelen Testlauf. Der Test selbst (`frontend/e2e/_smoke.spec.cjs`) verlangt eine Session und behandelt 429 nicht als erwartbaren Zustand. Mögliche Fixansätze: Rate-Limit im Testmodus erhöhen/deaktivieren, Tests mit separaten IPs/Ports isolieren oder die Smoke-Spec so anpassen, dass 429 als „denied“ akzeptiert wird, wenn keine Session erwartet wird.
- **Severity:** medium (Produkt selbst funktioniert im isolierten Smoke-Lauf, der erste Bericht zeigt `session established`; der Fehler betrifft die Testsuite-Isolation und nicht die Kernfunktion der Anwendung).