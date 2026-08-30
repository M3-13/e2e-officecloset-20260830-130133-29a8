import { Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Wardrobe from './pages/Wardrobe.jsx';
import Outfits from './pages/Outfits.jsx';
import Settings from './pages/Settings.jsx';
import Imprint from './pages/Imprint.jsx';
import Privacy from './pages/Privacy.jsx';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          OfficeCloset
        </Link>
        <ul className="nav-links">
          <li>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
              Anmelden
            </NavLink>
          </li>
          <li>
            <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : '')}>
              Registrieren
            </NavLink>
          </li>
          <li>
            <NavLink to="/wardrobe" className={({ isActive }) => (isActive ? 'active' : '')}>
              Garderobe
            </NavLink>
          </li>
          <li>
            <NavLink to="/outfits" className={({ isActive }) => (isActive ? 'active' : '')}>
              Outfits
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              Einstellungen
            </NavLink>
          </li>
          <li>
            <NavLink to="/impressum" className={({ isActive }) => (isActive ? 'active' : '')}>
              Impressum
            </NavLink>
          </li>
          <li>
            <NavLink to="/datenschutz" className={({ isActive }) => (isActive ? 'active' : '')}>
              Datenschutz
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>© {new Date().getFullYear()} OfficeCloset</span>
        <ul className="footer-links">
          <li>
            <Link to="/impressum">Impressum</Link>
          </li>
          <li>
            <Link to="/datenschutz">Datenschutz</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/wardrobe" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/outfits" element={<Outfits />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/impressum" element={<Imprint />} />
            <Route path="/datenschutz" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/wardrobe" replace />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return <Layout />;
}
