import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LogIn, AlertCircle, CheckCircle } from 'lucide-react';

const DirectLogin = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Common email domains to try
  const emailDomains = ['@gmail.com', '@test.com', '@example.com', '@outlook.com', '@yahoo.com'];

  useEffect(() => {
    // Check if already logged in
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Active session found:', session.user.email);
        handleSuccessfulLogin(session);
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const handleSuccessfulLogin = async (session) => {
    const userProfile = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.email?.split('@')[0],
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
    };
    
    setUser(userProfile, session.access_token);
    setMessage('Login successful! Redirecting...');
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  const tryLogin = async (emailToTry, pwd) => {
    console.log(`Attempting login with: ${emailToTry}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToTry,
      password: pwd,
    });

    if (!error && data.session) {
      return data;
    }
    
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage('');

    const pwd = password || 'qwerqwer'; // Default password if not provided
    let loginEmail = email;

    try {
      // If email doesn't contain @, try different domains
      if (!email.includes('@')) {
        setMessage('Trying different email domains...');
        
        for (const domain of emailDomains) {
          const emailToTry = email + domain;
          const result = await tryLogin(emailToTry, pwd);
          
          if (result) {
            console.log('Login successful with:', emailToTry);
            await handleSuccessfulLogin(result.session);
            return;
          }
        }
        
        throw new Error('Could not find account. Please enter full email address.');
      } else {
        // Direct login with provided email
        const result = await tryLogin(email, pwd);
        
        if (result) {
          await handleSuccessfulLogin(result.session);
        } else {
          throw new Error('Invalid email or password');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login for your account
  const quickLogin = async () => {
    setEmail('test');
    setPassword('qwerqwer');
    
    // Trigger login
    setTimeout(() => {
      document.getElementById('login-form').requestSubmit();
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Direct Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Simple authentication for your Family Planner
          </p>
        </div>

        <form id="login-form" onSubmit={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-blue-50 border border-blue-300 text-blue-700 px-4 py-3 rounded-md flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter 'test' or your email"
                autoComplete="username"
              />
              <p className="mt-1 text-xs text-gray-500">
                Just enter username without @domain, we'll find your account
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your password (qwerqwer)"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={quickLogin}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Quick Login (Your Account)
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>This will connect to your real Supabase data</p>
            <p>Your calendar events and settings will load automatically</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DirectLogin;