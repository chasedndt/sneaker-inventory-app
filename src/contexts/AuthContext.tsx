// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  getIdToken,
  getIdTokenResult
} from 'firebase/auth';
import { auth } from '../firebase';

// Define the shape of our auth context
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  token: string | null;
  tokenExpiration: Date | null;
  signup: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
}

// Create the auth context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);

  // Function to sign up a new user
  const signup = (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          resolve(userCredential.user);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  // Function to log in an existing user
  const login = (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          resolve(userCredential.user);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  // Function to log out the current user
  const logout = (): Promise<void> => {
    return signOut(auth);
  };

  const updateUserEmail = async (email: string): Promise<void> => {
    if (!currentUser) throw new Error('No user logged in');
    await updateEmail(currentUser, email);
  };

  const updateUserPassword = async (password: string): Promise<void> => {
    if (!currentUser) throw new Error('No user logged in');
    await updatePassword(currentUser, password);
  };

  const reauthenticate = async (password: string): Promise<void> => {
    if (!currentUser || !currentUser.email) throw new Error('No user logged in');
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
  };

  // Function to get the current auth token
  const getAuthToken = async (): Promise<string | null> => {
    if (!currentUser) {
      console.log('No user is logged in, cannot get token');
      return null;
    }

    try {
      // Check if we have a valid token already
      if (token && tokenExpiration && new Date() < tokenExpiration) {
        console.log('Using cached token, still valid');
        return token;
      }

      // Get a fresh token
      console.log('Getting fresh token from Firebase');
      const newToken = await getIdToken(currentUser, true); // force refresh
      const tokenResult = await getIdTokenResult(currentUser);
      
      // Set token and its expiration
      setToken(newToken);
      if (tokenResult.expirationTime) {
        setTokenExpiration(new Date(tokenResult.expirationTime));
      }
      
      return newToken;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Function to refresh the token
  const refreshToken = async (): Promise<string | null> => {
    if (!currentUser) return null;
    
    try {
      const newToken = await getIdToken(currentUser, true); // force refresh
      const tokenResult = await getIdTokenResult(currentUser);
      
      // Update token state
      setToken(newToken);
      if (tokenResult.expirationTime) {
        setTokenExpiration(new Date(tokenResult.expirationTime));
      }
      
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  // Get initial token when user logs in
  useEffect(() => {
    if (currentUser) {
      getAuthToken();
    } else {
      setToken(null);
      setTokenExpiration(null);
    }
  }, [currentUser]);

  // Set up listener for auth state changes
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // If user is logged in, get token
      if (user) {
        try {
          const newToken = await getIdToken(user);
          const tokenResult = await getIdTokenResult(user);
          
          setToken(newToken);
          if (tokenResult.expirationTime) {
            setTokenExpiration(new Date(tokenResult.expirationTime));
          }
        } catch (error) {
          console.error('Error getting initial token:', error);
        }
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Set up token refresh timer
  useEffect(() => {
    if (!token || !tokenExpiration) return;
    
    // Calculate time until token needs refresh (5 minutes before expiration)
    const timeUntilRefresh = tokenExpiration.getTime() - new Date().getTime() - (5 * 60 * 1000);
    
    // Set timer to refresh token
    const refreshTimer = setTimeout(() => {
      console.log('Token refresh timer triggered');
      refreshToken();
    }, Math.max(0, timeUntilRefresh));
    
    return () => clearTimeout(refreshTimer);
  }, [token, tokenExpiration]);

  // Create the value object for our context provider
  const value: AuthContextType = {
    currentUser,
    loading,
    token,
    tokenExpiration,
    signup,
    login,
    logout,
    updateUserEmail,
    updateUserPassword,
    reauthenticate,
    getAuthToken,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};