import { apiClient } from './client.js';

export async function deleteAccount() {
  return apiClient.delete('/api/users/me');
}
