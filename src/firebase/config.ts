import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ 
  prompt: 'select_account',
  hd: 'chapter3.ca'
});

/**
 * Sign in with Google Popup - strictly restricted to @chapter3.ca Google tenant accounts
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user && user.email) {
      const emailLower = user.email.toLowerCase();
      if (!emailLower.endsWith('@chapter3.ca')) {
        await signOut(auth);
        throw new Error(
          `Access restricted: "${user.email}" is not an authorized Chapter 3 Google tenant account. Only @chapter3.ca accounts can sign in.`
        );
      }
    }
    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.log('Google Sign-In popup closed by user.');
      return null;
    }
    console.error('Google Sign-In error:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

export { firebaseConfig, onAuthStateChanged, FirebaseUser };

