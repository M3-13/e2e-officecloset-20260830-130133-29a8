import apiClient from './client.js';

const BASE = '/api/wardrobe/items';

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listItems(params = {}) {
  return apiClient.get(`${BASE}${buildQuery(params)}`);
}

export async function createItem(formData) {
  return apiClient.post(BASE, formData);
}

export async function getItem(id) {
  return apiClient.get(`${BASE}/${id}`);
}

export async function updateItem(id, formData) {
  return apiClient.put(`${BASE}/${id}`, formData);
}

export async function deleteItem(id) {
  return apiClient.delete(`${BASE}/${id}`);
}
