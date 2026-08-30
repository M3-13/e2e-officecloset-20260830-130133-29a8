import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

function mapError(error) {
  if (error && error.status === 401) {
    return 'Anmeldung nicht möglich. Bitte prüfen Sie Ihre Zugangsdaten.';
  }
  if (error && error.status === 429) {
    return 'Zu viele Registrierungsversuche. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
  }
  return error?.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    }
    if (!password) {
      errors.password = 'Bitte geben Sie ein Passwort ein.';
    } else if (password.length < 8) {
      errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    }
    if (!confirm) {
      errors.confirm = 'Bitte wiederholen Sie das Passwort.';
    } else if (confirm !== password) {
      errors.confirm = 'Die Passwörter stimmen nicht überein.';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSuccess('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await register({ email: email.trim(), password });
      setSuccess('Registrierung erfolgreich. Sie sind jetzt angemeldet.');
      setTimeout(() => navigate('/wardrobe', { replace: true }), 900);
    } catch (error) {
      setSubmitError(mapError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <h1 className="page-title">Registrieren</h1>
      <p className="page-description">
        Erstellen Sie ein Konto, um Ihre Garderobe zu verwalten.
      </p>

      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="alert alert-error" role="alert">
              {submitError}
            </div>
          )}
          {success && (
            <div className="alert alert-success" role="status">
              {success}
            </div>
          )}

          <div className="form-field">
            <label className="form-label" htmlFor="register-email">
              E-Mail
            </label>
            <input
              id="register-email"
              className={`form-input ${fieldErrors.email ? 'invalid' : ''}`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="form-field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="register-password">
              Passwort
            </label>
            <input
              id="register-password"
              className={`form-input ${fieldErrors.password ? 'invalid' : ''}`}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="form-field-error">{fieldErrors.password}</p>
            )}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="register-confirm">
              Passwort wiederholen
            </label>
            <input
              id="register-confirm"
              className={`form-input ${fieldErrors.confirm ? 'invalid' : ''}`}
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.confirm && (
              <p className="form-field-error">{fieldErrors.confirm}</p>
            )}
          </div>

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Wird registriert …' : 'Registrieren'}
          </button>
        </form>

        <p className="auth-links">
          Bereits ein Konto? <Link to="/login">Jetzt anmelden</Link>
        </p>
      </div>
    </section>
  );
}
