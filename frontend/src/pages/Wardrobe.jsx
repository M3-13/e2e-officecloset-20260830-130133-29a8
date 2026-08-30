import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
} from '../api/wardrobe.js';
import { fetchImageAsObjectUrl } from '../api/client.js';

const CATEGORIES = [
  { value: 'top', label: 'Oberteil' },
  { value: 'bottom', label: 'Unterteil' },
  { value: 'dress', label: 'Kleid' },
  { value: 'shoes', label: 'Schuhe' },
  { value: 'accessory', label: 'Accessoire' },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EMPTY_FORM = {
  name: '',
  category: 'top',
  color: '',
  brand: '',
  notes: '',
};

function categoryLabel(value) {
  const found = CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
}

function friendlyError(err) {
  if (err && err.status === 413) {
    return 'Das Bild ist zu groß. Bitte wähle eine kleinere Datei.';
  }
  if (err && err.status === 401) {
    return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';
  }
  if (err && err.status === 400) {
    return err.message || 'Ungültige Eingabe.';
  }
  return (err && err.message) || 'Etwas ist schiefgelaufen.';
}

const STYLES = `
.wardrobe-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-4);
}
.wardrobe-search {
  flex: 1 1 240px;
  min-width: 200px;
}
.wardrobe-add {
  margin-left: auto;
}
.wardrobe-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}
.filter-chip {
  min-height: 36px;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 120ms;
}
.filter-chip:hover {
  border-color: var(--color-accent);
}
.filter-chip.active {
  background: var(--color-accent);
  color: #161211;
  border-color: var(--color-accent);
}
.wardrobe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4);
}
.wardrobe-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  transition: 120ms;
}
.wardrobe-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.wardrobe-card-img {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface_raised);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
}
.wardrobe-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.wardrobe-card-body {
  padding: var(--space-2) 0 var(--space-1);
}
.wardrobe-card-name {
  font-weight: 600;
  color: var(--color-fg);
  font-size: 16px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wardrobe-card-category {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0;
}
.wardrobe-card-meta {
  color: var(--color-muted);
  font-size: 13px;
  margin: 0;
}
.wardrobe-card-actions {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.wardrobe-empty {
  text-align: center;
  padding: var(--space-6) var(--space-4);
}
.wardrobe-empty-title {
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-weight: 600;
  color: var(--color-fg);
  margin: 0 0 var(--space-1);
}
.wardrobe-empty-desc {
  color: var(--color-muted);
  margin: 0 0 var(--space-3);
}
.wardrobe-feedback {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  font-size: 14px;
}
.wardrobe-feedback.error {
  background: var(--color-surface_raised);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}
.form-error {
  color: var(--color-danger);
  font-size: 14px;
  margin: var(--space-2) 0 0;
}
.btn {
  min-height: 44px;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 120ms;
  border: 1px solid transparent;
}
.btn:disabled {
  opacity: 0.45;
  pointer-events: none;
}
.btn-primary {
  background: var(--color-accent);
  color: #161211;
  border: 1px solid var(--color-accent);
}
.btn-primary:hover {
  background: var(--color-accent_hover);
}
.btn-primary:active {
  background: var(--color-accent_active);
  transform: translateY(1px);
}
.btn-secondary {
  background: transparent;
  color: var(--color-fg);
  border: 1px solid var(--color-border);
}
.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.btn-secondary:active {
  background: var(--color-surface_raised);
}
.btn-danger {
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}
.btn-danger:hover {
  background: var(--color-danger);
  color: #161211;
}
.btn-small {
  min-height: 36px;
  padding: 6px 12px;
  flex: 1;
}
.input,
.select,
.textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: var(--color-surface_raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  font-size: 14px;
  font-family: inherit;
}
.input::placeholder,
.textarea::placeholder {
  color: var(--color-muted);
}
.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.18);
}
.input.invalid {
  border-color: var(--color-danger);
}
.textarea {
  resize: vertical;
  min-height: 88px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.field label {
  color: var(--color-muted);
  font-size: 14px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
.file-preview {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface_raised);
  margin-top: var(--space-1);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: var(--space-4);
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.modal-title {
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-weight: 600;
  color: var(--color-fg);
  font-size: 20px;
  margin: 0;
}
.modal-close {
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 20px;
  cursor: pointer;
}
.modal-close:hover {
  color: var(--color-fg);
}
.toast {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  background: var(--color-surface_raised);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  color: var(--color-fg);
  font-size: 14px;
  z-index: 60;
  max-width: 360px;
}
.toast.success {
  border-left-color: var(--color-success);
}
.toast.error {
  border-left-color: var(--color-danger);
}
@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .form-grid .field-full {
    grid-column: 1 / -1;
  }
}
@media (max-width: 640px) {
  .wardrobe-grid {
    gap: var(--space-3);
  }
}
`;

function AuthedImage({ imageUrl, alt, className, loading, fallback = null, ...rest }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url = null;

    async function load() {
      setFailed(false);
      setObjectUrl(null);

      if (!imageUrl) {
        setFailed(true);
        return;
      }

      try {
        url = await fetchImageAsObjectUrl(imageUrl);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setObjectUrl(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageUrl]);

  if (failed || !objectUrl) {
    return fallback;
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      loading={loading}
      {...rest}
    />
  );
}

export default function Wardrobe() {
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await listItems();
        if (!cancelled) setItems(data || []);
      } catch (err) {
        if (!cancelled) setLoadError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, authLoading, navigate]);

  const filtered = useMemo(() => {
    let result = items;
    if (category !== 'all') {
      result = result.filter((it) => it.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((it) =>
        (it.name || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, category, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setPreview(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      category: item.category || 'top',
      color: item.color || '',
      brand: item.brand || '',
      notes: item.notes || '',
    });
    setFile(null);
    setPreview(null);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (formSubmitting) return;
    setFormOpen(false);
    setEditing(null);
    setFile(null);
    setPreview(null);
    setFormError(null);
  }

  function handleFileChange(e) {
    const selected = e.target.files && e.target.files[0];
    setFormError(null);
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!selected.type.startsWith('image/')) {
      setFile(null);
      setPreview(null);
      setFormError('Bitte wähle eine Bilddatei (z. B. JPEG oder PNG).');
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setPreview(null);
      setFormError('Das Bild ist zu groß (maximal 5 MB).');
      e.target.value = '';
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError('Bitte gib einen Namen ein.');
      return;
    }
    if (!editing && !file) {
      setFormError('Bitte wähle ein Bild aus.');
      return;
    }

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('category', form.category);
    if (form.color && form.color.trim()) fd.append('color', form.color.trim());
    if (form.brand && form.brand.trim()) fd.append('brand', form.brand.trim());
    if (form.notes && form.notes.trim()) fd.append('notes', form.notes.trim());
    if (file) fd.append('image', file);

    setFormSubmitting(true);
    try {
      if (editing) {
        const updated = await updateItem(editing.id, fd);
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it)),
        );
        setToast({ type: 'success', message: 'Kleidungsstück aktualisiert.' });
      } else {
        const created = await createItem(fd);
        setItems((prev) => [created, ...prev]);
        setToast({ type: 'success', message: 'Kleidungsstück angelegt.' });
      }
      closeForm();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await deleteItem(target.id);
      setItems((prev) => prev.filter((it) => it.id !== target.id));
      setToast({ type: 'success', message: 'Kleidungsstück gelöscht.' });
    } catch (err) {
      setToast({ type: 'error', message: friendlyError(err) });
    }
  }

  if (authLoading || loading) {
    return (
      <section className="page">
        <h1 className="page-title">Garderobe</h1>
        <p className="page-description">Wird geladen …</p>
      </section>
    );
  }

  return (
    <section className="page">
      <style>{STYLES}</style>

      <h1 className="page-title">Garderobe</h1>

      <div className="wardrobe-toolbar">
        <div className="wardrobe-search">
          <input
            type="text"
            className="input"
            placeholder="Nach Name suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Nach Name suchen"
          />
        </div>
        <button type="button" className="btn btn-primary wardrobe-add" onClick={openCreate}>
          Kleidungsstück hinzufügen
        </button>
      </div>

      <div className="wardrobe-filters">
        <button
          type="button"
          className={`filter-chip ${category === 'all' ? 'active' : ''}`}
          onClick={() => setCategory('all')}
        >
          Alle
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`filter-chip ${category === c.value ? 'active' : ''}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="wardrobe-feedback error" role="alert">
          {loadError}
        </div>
      )}

      {!loadError && filtered.length === 0 && (
        <div className="wardrobe-empty">
          <h2 className="wardrobe-empty-title">
            {items.length === 0
              ? 'Noch keine Kleidungsstücke'
              : 'Keine Treffer'}
          </h2>
          <p className="wardrobe-empty-desc">
            {items.length === 0
              ? 'Füge dein erstes Kleidungsstück hinzu, um deine Garderobe zu füllen.'
              : 'Passe Filter oder Suche an, um passende Stücke zu sehen.'}
          </p>
          {items.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Erstes Kleidungsstück hinzufügen
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="wardrobe-grid">
          {filtered.map((item) => (
            <article key={item.id} className="wardrobe-card">
              <div className="wardrobe-card-img">
                <AuthedImage
                  imageUrl={item.image_url}
                  alt={item.name}
                  loading="lazy"
                  fallback={<span>Kein Bild</span>}
                />
              </div>
              <div className="wardrobe-card-body">
                <p className="wardrobe-card-name">{item.name}</p>
                <p className="wardrobe-card-category">
                  {categoryLabel(item.category)}
                </p>
                {item.color && <p className="wardrobe-card-meta">{item.color}</p>}
                {item.brand && <p className="wardrobe-card-meta">{item.brand}</p>}
              </div>
              <div className="wardrobe-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => openEdit(item)}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => setDeleting(item)}
                >
                  Löschen
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="modal-overlay" onClick={closeForm}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editing ? 'Kleidungsstück bearbeiten' : 'Kleidungsstück anlegen'}
              </h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Schließen"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field field-full">
                  <label htmlFor="wardrobe-name">Name</label>
                  <input
                    id="wardrobe-name"
                    name="name"
                    type="text"
                    className={`input ${formError && !form.name.trim() ? 'invalid' : ''}`}
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="wardrobe-category">Kategorie</label>
                  <select
                    id="wardrobe-category"
                    name="category"
                    className="select"
                    value={form.category}
                    onChange={handleChange}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="wardrobe-color">Farbe</label>
                  <input
                    id="wardrobe-color"
                    name="color"
                    type="text"
                    className="input"
                    value={form.color}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="wardrobe-brand">Marke</label>
                  <input
                    id="wardrobe-brand"
                    name="brand"
                    type="text"
                    className="input"
                    value={form.brand}
                    onChange={handleChange}
                  />
                </div>

                <div className="field field-full">
                  <label htmlFor="wardrobe-notes">Notiz</label>
                  <textarea
                    id="wardrobe-notes"
                    name="notes"
                    className="textarea"
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>

                <div className="field field-full">
                  <label htmlFor="wardrobe-image">Bild</label>
                  <input
                    id="wardrobe-image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {preview && (
                    <img
                      className="file-preview"
                      src={preview}
                      alt="Vorschau"
                    />
                  )}
                  {!preview && editing && editing.image_url && (
                    <AuthedImage
                      imageUrl={editing.image_url}
                      alt="Vorschau"
                      className="file-preview"
                    />
                  )}
                  {editing && !file && (
                    <p className="wardrobe-card-meta">
                      Kein neues Bild ausgewählt — das bisherige Bild bleibt erhalten.
                    </p>
                  )}
                </div>
              </div>

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeForm}
                  disabled={formSubmitting}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? 'Wird gespeichert …'
                    : editing
                      ? 'Speichern'
                      : 'Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Kleidungsstück löschen</h2>
            </div>
            <p>
              Möchtest du <strong>{deleting.name}</strong> wirklich löschen?
              Das Bild wird dabei ebenfalls entfernt.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleting(null)}
              >
                Abbrechen
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </section>
  );
}
