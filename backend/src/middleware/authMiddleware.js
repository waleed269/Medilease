// authMiddleware.js — Protects routes by verifying the JWT token
// This is a DUMMY middleware provided for Waleed's module
// The real auth system is being built by Umar
// This middleware does the same job: it reads the token, verifies it,
// and attaches the decoded user object to req.user

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // JWT tokens are sent in the Authorization header as: "Bearer <token>"
  // We check if the header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract just the token part (index 1 after splitting by space)
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the secret key stored in .env
      // If the token is invalid or expired, this will throw an error
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the decoded user payload to req.user
      // This makes req.user._id available in all protected route controllers
      req.user = decoded;

      // Move on to the actual controller
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token is invalid or expired',
      });
    }
  }

  // If no token was found in the header at all
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }
};

module.exports = { protect };