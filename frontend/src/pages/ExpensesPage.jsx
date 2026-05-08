// ExpensesPage.jsx — Expenses module
// Lets users add, edit, delete, filter, and summarise their expenses
// Assumes user is already authenticated and JWT token is in localStorage

import { useState, useEffect } from 'react';
import {
  createExpense,
  getExpenses,
  getMonthlySummary,
  getCategorySummary,
  updateExpense,
  deleteExpense,
} from '../services/expenseService';
import './ExpensesPage.css';
import '../styles/global.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ['Food', 'Transport', 'Health', 'Utilities', 'Shopping', 'Entertainment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Wallet', 'Card', 'Bank Transfer', 'Other'];

// Default blank form state
const EMPTY_FORM = {
  title: '',
  amount: '',
  category: '',
  paymentMethod: 'Cash',
  date: new Date().toISOString().split('T')[0], // today's date in YYYY-MM-DD
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [expenses, setExpenses]             = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [editingId, setEditingId]           = useState(null);   // null = creating new
  const [showModal, setShowModal]           = useState(false);
  const [loading, setLoading]               = useState(true);
  const [submitLoading, setSubmitLoading]   = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [filters, setFilters]               = useState({ category: '', startDate: '', endDate: '' });

  // ── Data Fetching ──────────────────────────────────────────────────────────
  // Called on mount and whenever filters change
  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      // Run all three requests in parallel for speed
      const [expRes, monthRes, catRes] = await Promise.all([
        getExpenses(filters),
        getMonthlySummary(),
        getCategorySummary(),
      ]);
      setExpenses(expRes.data.data);
      setMonthlySummary(monthRes.data.data);
      setCategorySummary(catRes.data.data);
    } catch (err) {
      setError('Failed to load expenses. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchAll();
  }, [filters]);

  // ── Auto-dismiss success message after 3 seconds ───────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ── Form Handlers ──────────────────────────────────────────────────────────

  // Handle any form input change generically
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit handler — creates or updates depending on editingId
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      if (editingId) {
        await updateExpense(editingId, form);
        setSuccess('Expense updated successfully');
      } else {
        await createExpense(form);
        setSuccess('Expense added successfully');
      }
      // Reset and close modal
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowModal(false);
      fetchAll(); // refresh the list
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Pre-fill the form with existing expense data for editing
  const handleEdit = (expense) => {
    setForm({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      date: new Date(expense.date).toISOString().split('T')[0],
      notes: expense.notes || '',
    });
    setEditingId(expense._id);
    setError('');
    setShowModal(true);
  };

  // Delete an expense after confirmation
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      setSuccess('Expense deleted');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  // Open modal for adding a new expense
  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  // ── Derived Values ──────────────────────────────────────────────────────────
  // Sum of currently displayed expenses
  const totalShown = expenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="expenses-page">
      <div className="expenses-page__inner">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="expenses-page__header">
          <h1 className="expenses-page__title">Expenses</h1>
          <button className="btn btn--primary" onClick={openAddModal}>
            + Add Expense
          </button>
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {error   && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">{success}</div>}

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <div className="expenses-summary-grid">

          {/* Total of filtered expenses */}
          <div className="summary-card">
            <p className="summary-card__label">Total Shown</p>
            <p className="summary-card__value">PKR {totalShown.toLocaleString()}</p>
          </div>

          {/* Count of filtered expenses */}
          <div className="summary-card">
            <p className="summary-card__label">Transactions</p>
            <p className="summary-card__value" style={{ color: 'var(--color-teal)' }}>
              {expenses.length}
            </p>
          </div>

          {/* Top 2 categories by spending */}
          {categorySummary.slice(0, 2).map((cat) => (
            <div key={cat.category} className="summary-card">
              <p className="summary-card__label">{cat.category}</p>
              <p className="summary-card__value">PKR {cat.totalSpent.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="expenses-filters">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />

          <button
            className="btn btn--secondary"
            onClick={() => setFilters({ category: '', startDate: '', endDate: '' })}
          >
            Clear Filters
          </button>
        </div>

        {/* ── Expense Table ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="expenses-loading">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="expenses-empty">
            <p>No expenses found</p>
            <p>Add your first expense using the button above</p>
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp._id}>
                    <td>{exp.title}</td>
                    <td>
                      <span className="badge badge--safe">{exp.category}</span>
                    </td>
                    <td className="amount-cell">PKR {exp.amount.toLocaleString()}</td>
                    <td className="method-cell">{exp.paymentMethod}</td>
                    <td className="date-cell">
                      {new Date(exp.date).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn--teal btn--sm" onClick={() => handleEdit(exp)}>
                        Edit
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(exp._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2 className="modal__title">
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </h2>

              {error && <div className="alert alert--error">{error}</div>}

              <form onSubmit={handleSubmit}>

                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Grocery shopping"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="amount">Amount (PKR)</label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 1500"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="paymentMethod">Payment Method</label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleFormChange}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes (optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Any extra details..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={submitLoading}>
                    {submitLoading ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={closeModal}>
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}