import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteAccount } from '../api/account.js';
import { useAuth } from '../context/AuthContext.jsx';

const styles = `
  .settings-danger-zone {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    max-width: 520px;
  }
  .settings-danger-zone h2 {
    margin: 0 0 var(--space-2);
    font-size: 24px;
  }
  .settings-danger-description {
    color: var(--color-muted);
    margin: 0 0 var(--space-3);
    font-size: 14px;
  }
  .settings-error {
    color: var(--color-danger);
    margin: 0 0 var(--space-3);
    font-size: 14px;
  }
  .settings-confirm {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }
  .settings-confirm-text {
    color: var(--color-fg);
    margin: 0 0 var(--space-3);
    font-size: 14px;
  }
  .settings-confirm-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .settings-btn {
    min-height: 44px;
    padding: 12px 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 14px;
    transition: 120ms;
    cursor: pointer;
  }
  .settings-btn-danger {
    background: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
  }
  .settings-btn-danger:hover {
    background: var(--color-danger);
    color: #161211;
  }
  .settings-btn-secondary {
    background: transparent;
    color: var(--color-fg);
    border: 1px solid var(--color-border);
  }
  .settings-btn-secondary:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .settings-btn:disabled {
    opacity: 0.45;
    pointer-events: none;
  }
`;

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      logout();
      navigate('/register', { replace: true });
    } catch (err) {
      setError(err.message || 'Das Konto konnte nicht gelöscht werden.');
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <style>{styles}</style>
      <h1 className="page-title">Einstellungen</h1>
      <p className="page-description">Verwalte dein Konto.</p>

      <div className="settings-danger-zone">
        <h2>Konto löschen</h2>
        <p className="settings-danger-description">
          Das Löschen deines Kontos entfernt dauerhaft alle deine Kleidungsstücke, Outfits und
          hochgeladenen Bilder. Dieser Schritt kann nicht rückgängig gemacht werden.
        </p>

        {error && <p className="settings-error">{error}</p>}

        {!confirming ? (
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={() => setConfirming(true)}
          >
            Konto löschen
          </button>
        ) : (
          <div className="settings-confirm">
            <p className="settings-confirm-text">
              Bist du sicher? Alle deine Daten werden unwiderruflich gelöscht.
            </p>
            <div className="settings-confirm-actions">
              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                onClick={handleDelete}
                disabled={busy}
              >
                {busy ? 'Wird gelöscht…' : 'Konto endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
