import { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from './firebase';
import { saveUserPreferences } from './firestoreService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          try {
            await saveUserPreferences(
              currentUser.uid,
              {},
              {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
              }
            );
          } catch (e) {
            console.warn('Could not sync user profile to Firestore:', e);
          }
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await saveUserPreferences(
          result.user.uid,
          {},
          {
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          }
        );
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError(
          'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup
      } else {
        setAuthError(err.message || 'Failed to sign in with Google');
      }
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  return {
    user,
    loading,
    authError,
    setAuthError,
    signInWithGoogle,
    logOut,
  };
}
