const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authenticateToken = (req, res, next) => {
  let token = null;

  // 1. Check HTTP-only cookies first
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  } 
  // 2. Check Authorization Bearer header as fallback
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token is missing'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Contains id, email, role
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired authentication token'
    });
  }
};

module.exports = { authenticateToken };
