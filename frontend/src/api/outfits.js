import apiClient from './client.js';

export async function listOutfits() {
  return apiClient.get('/api/outfits');
}

export async function createOutfit({ name, item_ids }) {
  return apiClient.post('/api/outfits', JSON.stringify({ name, item_ids }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getOutfit(id) {
  return apiClient.get(`/api/outfits/${id}`);
}

export async function updateOutfit(id, { name, item_ids }) {
  return apiClient.put(`/api/outfits/${id}`, JSON.stringify({ name, item_ids }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteOutfit(id) {
  return apiClient.delete(`/api/outfits/${id}`);
}
