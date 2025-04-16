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
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';

// Define the shape of our auth context
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
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

  // Effect to handle auth state changes
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Create the value object for our context provider
  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    updateUserEmail,
    updateUserPassword,
    reauthenticate
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};