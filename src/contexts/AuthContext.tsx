// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import { initializeApi, setAuthTokenGetter as setAuthTokenGetterForApi } from '../services/api'; // Import initializeApi and setAuthTokenGetter
import { safeLog } from '../utils/logger';

// Create the auth context with a default undefined value first
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

let authReadyResolver: (() => void) | null = null;
export const authReadyPromise: Promise<void> = new Promise(res => {
  authReadyResolver = res;
});

// Define AppUser interface extending Firebase User
export interface AppUser extends User {
  accountTier: 'free' | 'starter' | 'professional' | 'admin';
  customClaims?: {
    accountTierSet?: boolean; // Flag to indicate if tier was set via admin tool
    planTier?: 'free' | 'starter' | 'professional' | 'admin';
    accountTier?: 'free' | 'starter' | 'professional' | 'admin';
    admin?: boolean;
    [key: string]: any; // For any other custom claims
  };
}

// Define the shape of our auth context
export interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  token: string | null;
  tokenExpiration: Date | null;
  accountTier: 'free' | 'starter' | 'professional' | 'admin' | undefined;
  signup: (email: string, password: string) => Promise<AppUser>;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  authReady: boolean;
}

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
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);

  // Function to sign up a new user
  const signup = async (email: string, password: string): Promise<AppUser> => {
    return new Promise((resolve, reject) => {
      createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          // Default to 'Free' tier on new signup, backend will eventually set this via claims
          const appUser: AppUser = {
            ...userCredential.user,
            uid: userCredential.user.uid, // Ensure all User properties are spread
            email: userCredential.user.email,
            emailVerified: userCredential.user.emailVerified,
            isAnonymous: userCredential.user.isAnonymous,
            metadata: userCredential.user.metadata,
            providerData: userCredential.user.providerData,
            refreshToken: userCredential.user.refreshToken,
            tenantId: userCredential.user.tenantId,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            phoneNumber: userCredential.user.phoneNumber,
            providerId: userCredential.user.providerId,
            accountTier: 'free', // Default tier on signup
            customClaims: { accountTier: 'free', accountTierSet: false } // Initialize customClaims
          };
          resolve(appUser);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  // Function to log in an existing user
  const login = async (email: string, password: string): Promise<AppUser> => {
    return new Promise((resolve, reject) => {
      signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          const tokenResult = await userCredential.user.getIdTokenResult();
          const tier = (tokenResult.claims.accountTier as AppUser['accountTier']) || 'Free';
          const appUser: AppUser = {
            ...userCredential.user,
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            emailVerified: userCredential.user.emailVerified,
            isAnonymous: userCredential.user.isAnonymous,
            metadata: userCredential.user.metadata,
            providerData: userCredential.user.providerData,
            refreshToken: userCredential.user.refreshToken,
            tenantId: userCredential.user.tenantId,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            phoneNumber: userCredential.user.phoneNumber,
            providerId: userCredential.user.providerId,
            accountTier: tier,
            customClaims: {
              accountTier: tier,
              accountTierSet: tokenResult.claims.accountTierSet as boolean || false,
              admin: tokenResult.claims.admin as boolean || false,
              ...tokenResult.claims // Spread all claims to capture any other custom ones
            }
          };
          resolve(appUser);
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
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!currentUser) {
      console.log('No user is logged in, cannot get token');
      return null;
    }

    try {
      // Check if we have a valid token already
      if (token && tokenExpiration && new Date() < tokenExpiration) {
        safeLog.debug('Using cached token, still valid');
        return token;
      }

      // Get a fresh token using the user method
      safeLog.debug('Getting fresh token from Firebase');
      const newToken = await currentUser.getIdToken(true); // force refresh
      const tokenResult = await currentUser.getIdTokenResult();
      
      // Set token and its expiration
      setToken(newToken);
      if (tokenResult.expirationTime) {
        setTokenExpiration(new Date(tokenResult.expirationTime));
      }
      
      return newToken;
    } catch (error) {
      safeLog.error('Error getting auth token:', error);
      return null;
    }
  }, [currentUser, token, tokenExpiration]);

  // Function to refresh the token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!currentUser) return null;
    
    try {
      const newToken = await currentUser.getIdToken(true); // force refresh
      const tokenResult = await currentUser.getIdTokenResult();
      
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
  }, [currentUser]);

  // Get initial token when user logs in
  useEffect(() => {
    if (currentUser) {
      getAuthToken();
    } else {
      setToken(null);
      setTokenExpiration(null);
    }
  }, [currentUser, getAuthToken]);

  // Set up listener for auth state changes
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult(); // Fetch token result once
        // Check for planTier first (new system), then fallback to accountTier, then default to 'free'
        const planTier = tokenResult.claims.planTier as AppUser['accountTier'];
        const accountTier = tokenResult.claims.accountTier as AppUser['accountTier'];
        const isAdmin = tokenResult.claims.admin as boolean;
        
        // Determine final tier: admin takes precedence, then planTier, then accountTier, then default
        const tier = isAdmin ? 'admin' : (planTier || accountTier || 'free');
        
        const appUser: AppUser = {
          ...user,
          accountTier: tier,
          customClaims: {
            planTier: planTier || tier,
            accountTier: tier,
            accountTierSet: tokenResult.claims.accountTierSet as boolean || false,
            admin: isAdmin || false,
            ...tokenResult.claims
          }
        };
        setCurrentUser(appUser);

        // Set token and expiration from the fetched tokenResult
        try {
          const newToken = await user.getIdToken(); // This ensures we get the raw token string
          setToken(newToken);
          if (tokenResult.expirationTime) {
            setTokenExpiration(new Date(tokenResult.expirationTime));
          }
        } catch (error) {
          console.error('Error getting initial token string:', error);
          setToken(null);
          setTokenExpiration(null);
        }
      } else {
        setCurrentUser(null);
        setToken(null);
        setTokenExpiration(null);
      }
      
      setLoading(false);
      if (authReadyResolver) authReadyResolver(); // Signal ready AFTER currentUser/token and loading are set
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Initialize the API service with the getAuthToken function as early as possible.
  // This runs once when AuthProvider mounts, before child components that might make API calls.
  useEffect(() => {
    initializeApi(authReadyPromise);
  }, []); // authReadyPromise is stable, this should only run once

  // Effect that wires API service to always have the latest getAuthToken
  useEffect(() => {
    const authIsReady = !loading; // authReady is derived from !loading
    if (authIsReady) { 
      console.log('[AuthContext] Auth ready, providing fresh getAuthToken to api.ts');
      setAuthTokenGetterForApi(getAuthToken);
    }
  }, [getAuthToken, loading]); // loading effectively represents authReady state here

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
  }, [token, tokenExpiration, refreshToken]);

  // Create the value object for our context provider
  // Create the value object for our context provider
  const accountTier = currentUser?.customClaims?.admin ? 'admin' : currentUser?.accountTier;
  const value: AuthContextType = {
    currentUser,
    loading,
    token,
    tokenExpiration,
    accountTier, // Added accountTier to context value
    signup,
    login,
    logout,
    updateUserEmail,
    updateUserPassword,
    reauthenticate,
    getAuthToken,
    refreshToken,
    authReady: !loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};