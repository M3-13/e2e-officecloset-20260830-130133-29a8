import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listOutfits,
  createOutfit,
  getOutfit,
  updateOutfit,
  deleteOutfit,
} from '../api/outfits.js';
import apiClient from '../api/client.js';
import './outfits.css';

const CATEGORY_LABELS = {
  top: 'Oberteil',
  bottom: 'Unterteil',
  dress: 'Kleid',
  shoes: 'Schuhe',
  accessory: 'Accessoire',
};

export default function Outfits() {
  const { token, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]);
  const [outfits, setOutfits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [outfitList, itemList] = await Promise.all([
        listOutfits(),
        apiClient.get('/api/wardrobe/items'),
      ]);
      setOutfits(outfitList);
      setItems(itemList);
    } catch (err) {
      setLoadError(err.message || 'Laden fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && token) {
      loadAll();
    }
  }, [authLoading, token, loadAll]);

  const clearSuccess = useCallback(() => {
    setSuccess('');
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setFormError('Bitte einen Namen für das Outfit angeben.');
        return;
      }
      if (selectedIds.length === 0) {
        setFormError('Bitte mindestens ein Kleidungsstück auswählen.');
        return;
      }

      setSaving(true);
      setFormError('');
      setSuccess('');
      try {
        if (editingId === null) {
          await createOutfit({ name: trimmed, item_ids: selectedIds });
          setSuccess('Outfit gespeichert.');
        } else {
          await updateOutfit(editingId, { name: trimmed, item_ids: selectedIds });
          setSuccess('Outfit aktualisiert.');
        }
        setName('');
        setSelectedIds([]);
        setEditingId(null);
        await loadAll();
      } catch (err) {
        setFormError(err.message || 'Speichern fehlgeschlagen.');
      } finally {
        setSaving(false);
      }
    },
    [name, selectedIds, editingId, loadAll],
  );

  const toggleItem = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }, []);

  const startEdit = useCallback((outfit) => {
    setEditingId(outfit.id);
    setName(outfit.name);
    setSelectedIds(outfit.items.map((item) => item.id));
    setDetailId(null);
    setDetail(null);
    setFormError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openDetail = useCallback(async (id) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const outfit = await getOutfit(id);
      setDetail(outfit);
    } catch (err) {
      setDetail(null);
      setLoadError(err.message || 'Outfit konnte nicht geladen werden.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
  }, []);

  const handleDelete = useCallback(
    async (outfit) => {
      const confirmed = window.confirm(
        `Outfit „${outfit.name}“ wirklich löschen?`,
      );
      if (!confirmed) {
        return;
      }
      setFormError('');
      try {
        await deleteOutfit(outfit.id);
        setSuccess('Outfit gelöscht.');
        if (detailId === outfit.id) {
          closeDetail();
        }
        if (editingId === outfit.id) {
          setEditingId(null);
          setName('');
          setSelectedIds([]);
        }
        await loadAll();
      } catch (err) {
        setFormError(err.message || 'Löschen fehlgeschlagen.');
      }
    },
    [loadAll, detailId, editingId, closeDetail],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  if (!authLoading && !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="page">
      <h1 className="page-title">Outfit-Creator</h1>
      <p className="page-description">
        Kombiniere mehrere Kleidungsstücke zu einem Outfit und speichere es unter
        einem Namen.
      </p>

      {success && (
        <div className="toast toast-success" role="status">
          {success}
          <button
            type="button"
            className="toast-close"
            onClick={clearSuccess}
            aria-label="Hinweis schließen"
          >
            ×
          </button>
        </div>
      )}

      <div className="outfit-grid">
        <div className="outfit-form-card">
          <h2 className="section-title">
            {editingId === null ? 'Neues Outfit' : 'Outfit bearbeiten'}
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Name</span>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Gala-Abend"
                disabled={saving}
              />
            </label>

            <div className="field">
              <span className="field-label">
                Kleidungsstücke auswählen ({selectedIds.length} ausgewählt)
              </span>
              {items.length === 0 && !loading ? (
                <p className="muted">
                  Deine Garderobe ist noch leer. Lege zuerst Kleidungsstücke an.
                </p>
              ) : (
                <ul className="item-grid">
                  {items.map((item) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`item-tile${selected ? ' selected' : ''}`}
                          onClick={() => toggleItem(item.id)}
                          aria-pressed={selected}
                          disabled={saving}
                        >
                          {item.image_url ? (
                            <img
                              className="item-image"
                              src={item.image_url}
                              alt={item.name}
                            />
                          ) : (
                            <div className="item-image item-image-placeholder" />
                          )}
                          <span className="item-name">{item.name}</span>
                          <span className="item-category">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="selection-preview">
                <span className="field-label">Auswahl</span>
                <ul className="selection-list">
                  {selectedItems.map((item) => (
                    <li key={item.id}>
                      {item.image_url ? (
                        <img
                          className="selection-thumb"
                          src={item.image_url}
                          alt={item.name}
                        />
                      ) : null}
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formError && (
              <p className="error-message" role="alert">
                {formError}
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Speichert …' : editingId === null ? 'Speichern' : 'Änderungen speichern'}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setName('');
                    setSelectedIds([]);
                    setFormError('');
                  }}
                  disabled={saving}
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="outfit-list">
          <h2 className="section-title">Gespeicherte Outfits</h2>

          {loading ? (
            <div className="loading-block" aria-label="Lade Outfits" />
          ) : loadError ? (
            <div className="empty-state">
              <p className="error-message" role="alert">
                {loadError}
              </p>
              <button type="button" className="btn btn-secondary" onClick={loadAll}>
                Erneut versuchen
              </button>
            </div>
          ) : outfits.length === 0 ? (
            <div className="empty-state">
              <h3>Noch keine Outfits</h3>
              <p className="muted">
                Speichere dein erstes Outfit, um es hier zu sehen.
              </p>
            </div>
          ) : (
            <ul className="outfit-list-items">
              {outfits.map((outfit) => (
                <li key={outfit.id} className="outfit-card">
                  <div className="outfit-card-body">
                    <h3 className="outfit-name">{outfit.name}</h3>
                    <p className="muted">
                      {outfit.items.length}{' '}
                      {outfit.items.length === 1 ? 'Teil' : 'Teile'}
                    </p>
                    <div className="outfit-thumbs">
                      {outfit.items.slice(0, 5).map((item) =>
                        item.image_url ? (
                          <img
                            key={item.id}
                            className="outfit-thumb"
                            src={item.image_url}
                            alt={item.name}
                          />
                        ) : null,
                      )}
                    </div>
                  </div>
                  <div className="outfit-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openDetail(outfit.id)}
                    >
                      Öffnen
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(outfit)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(outfit)}
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {detailId !== null && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {detail ? detail.name : 'Outfit'}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeDetail}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            {detailLoading ? (
              <div className="loading-block" aria-label="Lade Outfit" />
            ) : detail && detail.items.length > 0 ? (
              <ul className="detail-items">
                {detail.items.map((item) => (
                  <li key={item.id} className="detail-item">
                    {item.image_url ? (
                      <img
                        className="detail-image"
                        src={item.image_url}
                        alt={item.name}
                      />
                    ) : (
                      <div className="detail-image detail-image-placeholder" />
                    )}
                    <div className="detail-meta">
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {CATEGORY_LABELS[item.category] || item.category}
                        {item.color ? ` · ${item.color}` : ''}
                      </span>
                      {item.brand ? (
                        <span className="muted">Marke: {item.brand}</span>
                      ) : null}
                      {item.notes ? (
                        <span className="muted">{item.notes}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Dieses Outfit enthält keine Teile.</p>
            )}
            <div className="modal-actions">
              {detail && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => startEdit(detail)}
                >
                  Bearbeiten
                </button>
              )}
              {detail && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDelete(detail)}
                >
                  Löschen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
