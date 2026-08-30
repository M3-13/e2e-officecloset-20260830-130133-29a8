// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Settings from './Settings.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { deleteAccount } from '../api/account.js';

vi.mock('../api/account.js', () => ({
  deleteAccount: vi.fn(),
}));

function RegisterStub() {
  return <div>register-page</div>;
}

function renderSettings() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/register" element={<RegisterStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Settings account deletion', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'abc');
    deleteAccount.mockResolvedValue(null);
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deletes the account, logs the user out and navigates to register', async () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }));

    expect(await screen.findByText('register-page')).toBeTruthy();
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
