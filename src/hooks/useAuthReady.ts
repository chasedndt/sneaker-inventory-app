import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuthReady = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthReady must be used within an AuthProvider');
  }
  // The AuthContext now provides authReady as (!loading) and currentUser.
  // The 'loading' state itself isn't directly exposed by useAuthReady by default.
  const { authReady, currentUser, getAuthToken } = context;
  return { authReady, currentUser, getAuthToken };
};
