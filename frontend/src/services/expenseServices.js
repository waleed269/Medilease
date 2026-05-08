// expenseService.js — All API calls related to expenses
// Uses Axios to communicate with the backend
// Automatically attaches the JWT token from localStorage to every request

import axios from 'axios';

// Create an Axios instance pointing to our backend base URL
// VITE_API_URL should be defined in a .env file as: VITE_API_URL=http://localhost:5000/api
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request interceptor — runs before every API call
// Reads the JWT token from localStorage and adds it to the Authorization header
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Expense API Functions ────────────────────────────────────────────────────

export const createExpense   = (data)         => API.post('/expenses', data);
export const getExpenses     = (params = {})  => API.get('/expenses', { params });
export const updateExpense   = (id, data)     => API.put(`/expenses/${id}`, data);
export const deleteExpense   = (id)           => API.delete(`/expenses/${id}`);
export const getMonthlySummary   = ()         => API.get('/expenses/summary/monthly');
export const getCategorySummary  = (month)    => API.get('/expenses/summary/categories', { params: { month } });