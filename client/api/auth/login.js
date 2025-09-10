export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Hardcoded users - itineraries2024
  const users = {
    'scott': { id: 1, email: 'smkaufman@gmail.com', full_name: 'Scott Kaufman' },
    'wife': { id: 2, email: 'wife@example.com', full_name: 'Wife' }
  };

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  // Simple password check
  if (password !== 'itineraries2024' || !users[username]) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = users[username];
  
  // Generate simple token (no JWT for now to avoid dependencies)
  const token = Buffer.from(`${user.id}:${username}:${Date.now()}`).toString('base64');

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      username: username,
      email: user.email,
      full_name: user.full_name
    }
  });
}