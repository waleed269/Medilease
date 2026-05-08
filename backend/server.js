const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables from .env file into process.env
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Allow requests from the React frontend (running on a different port)
app.use(cors());

// Development helper auth route
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// Register the expense and budget routes
// All expense endpoints will be prefixed with /api/expenses
// All budget endpoints will be prefixed with /api/budgets
app.use('/api/expenses', require('./src/routes/expenseRoutes'));
app.use('/api/budgets', require('./src/routes/budgetRoutes'));

// Health check route — just to confirm the server is running
app.get('/', (req, res) => {
  res.json({ message: 'MediLease API is running' });
});

// Start the server on the port defined in .env (default 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});