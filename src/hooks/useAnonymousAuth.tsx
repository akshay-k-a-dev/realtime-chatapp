import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export const useAnonymousAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          // User is signed in
          setAuthState({ user, loading: false, error: null });
        } else {
          // No user is signed in, attempt anonymous sign in
          signInAnonymously(auth)
            .catch((error) => {
              setAuthState({ user: null, loading: false, error });
              console.error('Error signing in anonymously:', error);
            });
        }
      },
      (error) => {
        setAuthState({ user: null, loading: false, error });
        console.error('Auth state change error:', error);
      }
    );

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  return authState;
};