import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "../services/auth";
import { supabase } from "../services/supabase";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Initialize auth state from Supabase
      initialize: async () => {
        // Prevent double initialization
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
          // Get current session from Supabase without timeout
          console.log("Checking Supabase session...");
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Session error:", sessionError);
            throw sessionError;
          }

          console.log(
            "Session check complete:",
            session ? "Found session" : "No session",
          );

          if (session) {
            // Try to get user profile, but don't fail if table doesn't exist
            try {
              const { data: profile, error: profileError } = await supabase
                .from("users")
                .select("*")
                .eq("auth_id", session.user.id)
                .single();

              if (profile && !profileError) {
                set({
                  user: profile,
                  token: session.access_token,
                  isLoading: false,
                  error: null,
                });
              } else {
                // Use session user data as fallback
                set({
                  user: {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.email?.split("@")[0],
                  },
                  token: session.access_token,
                  isLoading: false,
                  error: null,
                });
              }
            } catch (profileError) {
              console.warn(
                "Profile fetch failed, using session data:",
                profileError,
              );
              // Use session user data as fallback
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email,
                  username: session.user.email?.split("@")[0],
                },
                token: session.access_token,
                isLoading: false,
                error: null,
              });
            }
          } else {
            set({ isLoading: false, user: null, token: null });
          }
        } catch (error) {
          console.warn("Auth initialization warning:", error.message);
          // Don't treat timeout as fatal error - just continue without auth
          set({
            isLoading: false,
            error: null, // Clear error to allow app to load
            user: null,
            token: null,
          });
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_OUT") {
            set({ user: null, token: null });
          } else if (session) {
            // Get updated user profile
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("auth_id", session.user.id)
              .single();

            set({
              user: profile,
              token: session.access_token,
            });
          }
        });
      },

      // Login function - Updated to use Supabase
      login: async (username, password) => {
        set({ isLoading: true, error: null });

        try {
          // Try login with email (username might be email)
          let email = username;

          // If no @ symbol, try common email domains
          if (!username.includes("@")) {
            // Try with gmail first, then example.com
            const domains = ["gmail.com", "example.com", "test.com"];
            let loginSuccess = false;

            for (const domain of domains) {
              email = `${username}@${domain}`;
              console.log(`Trying login with email: ${email}`);

              const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
              });

              if (!error && data.session) {
                loginSuccess = true;

                // Successfully logged in
                let userProfile = null;
                if (data.session) {
                  try {
                    const { data: profile } = await supabase
                      .from("users")
                      .select("*")
                      .eq("auth_id", data.session.user.id)
                      .single();

                    userProfile = profile;
                  } catch (profileError) {
                    console.warn("Profile not found, using session data");
                    userProfile = {
                      id: data.session.user.id,
                      email: data.session.user.email,
                      username: username,
                    };
                  }
                }

                set({
                  user: userProfile,
                  token: data.session?.access_token,
                  isLoading: false,
                  error: null,
                });

                return { user: userProfile, token: data.session?.access_token };
              }
            }

            if (!loginSuccess) {
              throw new Error(
                "Invalid username or password. Please check your credentials.",
              );
            }
          } else {
            // Email provided directly
            console.log(`Logging in with email: ${email}`);
            const { data, error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (error) throw error;

            // Try to get user profile
            let userProfile = null;
            if (data.session) {
              try {
                const { data: profile } = await supabase
                  .from("users")
                  .select("*")
                  .eq("auth_id", data.session.user.id)
                  .single();

                userProfile = profile;
              } catch (profileError) {
                console.warn("Profile not found, using session data");
                userProfile = {
                  id: data.session.user.id,
                  email: data.session.user.email,
                  username: username,
                };
              }
            }

            set({
              user: userProfile,
              token: data.session?.access_token,
              isLoading: false,
              error: null,
            });

            return { user: userProfile, token: data.session?.access_token };
          }
        } catch (error) {
          const errorMessage = error.message || "Login failed";
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Register function
      register: async (username, email, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.register({
            username,
            email,
            password,
          });
          const { user, token } = response.data;

          set({
            user,
            token,
            isLoading: false,
            error: null,
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.message || "Registration failed";
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Logout function - Updated to use Supabase
      logout: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } catch (error) {
          console.error("Logout error:", error);
        }

        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });

        // Redirect to login page
        window.location.href = "/login";
      },

      // Set user method for OAuth callbacks
      setUser: (user, token) => {
        set({ user, token, isLoading: false, error: null });
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.updateProfile(profileData);
          const updatedUser = response.data;

          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error.message || "Profile update failed";
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user is authenticated
      isAuthenticated: () => {
        const state = get();
        return !!(state.user && state.token);
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        // Supabase handles session persistence, we don't need to store tokens
      }),
    },
  ),
);

// Don't auto-initialize - let App.jsx handle it
// This prevents double initialization and race conditions
