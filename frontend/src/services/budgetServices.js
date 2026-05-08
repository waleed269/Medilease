// budgetService.js — All API calls related to budgets

import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Budget API Functions ─────────────────────────────────────────────────────

export const createBudget      = (data) => API.post('/budgets', data);
export const getBudgets        = ()     => API.get('/budgets');
export const getCurrentBudget  = ()     => API.get('/budgets/current');
export const updateBudget      = (id, data) => API.put(`/budgets/${id}`, data);
export const deleteBudget      = (id)   => API.delete(`/budgets/${id}`);