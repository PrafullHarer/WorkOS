const adminAuth = (req, res, next) => {
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin';

  // Option 1: Basic Authentication Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');
      if (username === adminUser && password === adminPass) {
        return next();
      }
    } catch (err) {
      // Decode failed
    }
  }

  // Option 2: Custom headers
  const headerUser = req.headers['x-admin-username'];
  const headerPass = req.headers['x-admin-password'];
  if (headerUser === adminUser && headerPass === adminPass) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized: Invalid admin credentials.' });
};

module.exports = adminAuth;
