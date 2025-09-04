import api from './api';

export const authAPI = {
  // Login user
  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },

  // Register new user
  register: (userData) => {
    return api.post('/auth/register', userData);
  },

  // Logout user
  logout: () => {
    return api.post('/auth/logout');
  },

  // Get current user profile
  getProfile: () => {
    return api.get('/auth/profile');
  },

  // Update user profile
  updateProfile: (profileData) => {
    return api.put('/auth/profile', profileData);
  },

  // Change password
  changePassword: (passwordData) => {
    return api.put('/auth/change-password', passwordData);
  },

  // Forgot password
  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: (token, newPassword) => {
    return api.post('/auth/reset-password', { token, password: newPassword });
  },

  // Verify email
  verifyEmail: (token) => {
    return api.post('/auth/verify-email', { token });
  },

  // Resend verification email
  resendVerification: () => {
    return api.post('/auth/resend-verification');
  },

  // Refresh token
  refreshToken: () => {
    return api.post('/auth/refresh');
  },

  // Delete account
  deleteAccount: (password) => {
    return api.delete('/auth/account', { data: { password } });
  },

  // Get user preferences
  getPreferences: () => {
    return api.get('/auth/preferences');
  },

  // Update user preferences
  updatePreferences: (preferences) => {
    return api.put('/auth/preferences', { preferences });
  },

  // Update dashboard preferences specifically
  updateDashboardPreferences: (dashboardPreferences) => {
    return api.put('/auth/profile', { dashboard_preferences: dashboardPreferences });
  },
};