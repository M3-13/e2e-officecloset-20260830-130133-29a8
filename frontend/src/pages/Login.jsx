import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

function mapError(error) {
  if (error && error.status === 401) {
    return 'E-Mail oder Passwort ist falsch.';
  }
  if (error && error.status === 429) {
    return 'Zu viele Anmeldeversuche. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
  }
  return error?.message || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      errors.password = 'Bitte geben Sie Ihr Passwort ein.';
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
      await login({ email: email.trim(), password });
      setSuccess('Anmeldung erfolgreich.');
      setTimeout(() => navigate('/wardrobe', { replace: true }), 600);
    } catch (error) {
      setSubmitError(mapError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <h1 className="page-title">Anmelden</h1>
      <p className="page-description">
        Melden Sie sich an, um Ihre Garderobe zu verwalten.
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
            <label className="form-label" htmlFor="login-email">
              E-Mail
            </label>
            <input
              id="login-email"
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
            <label className="form-label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              className={`form-input ${fieldErrors.password ? 'invalid' : ''}`}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="form-field-error">{fieldErrors.password}</p>
            )}
          </div>

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Wird angemeldet …' : 'Anmelden'}
          </button>
        </form>

        <p className="auth-links">
          Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
        </p>
      </div>
    </section>
  );
}
