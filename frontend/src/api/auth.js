import apiClient from './client.js';

export async function register({ email, password }) {
  return apiClient.post(
    '/api/auth/register',
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

export async function login({ email, password }) {
  return apiClient.post(
    '/api/auth/login',
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
