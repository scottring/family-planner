const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Development mode - auto-authenticate as test user
  if (process.env.NODE_ENV === 'development' || !process.env.JWT_SECRET) {
    req.user = { id: 1, email: 'test@example.com', full_name: 'Test User' };
    return next();
  }
  
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};