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

const rawConfig = firebaseConfig as Record<string, any>;
const firestoreDbId = rawConfig.firestoreDatabaseId || 'ai-studio-chapter3projectm-b3373ba2-6eb8-414b-8fbb-2024b69da832';

export const db = firestoreDbId && firestoreDbId !== '(default)'
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

export const auth = getAuth(app);

// Google Drive Workspace Scopes
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly'
];

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ 
  prompt: 'select_account',
  hd: 'chapter3.ca'
});

// Add Drive scope to provider
DRIVE_SCOPES.forEach(scope => googleProvider.addScope(scope));

// In-memory cache for OAuth access token (strictly memory-only, not localStorage)
let cachedAccessToken: string | null = null;

export function getCachedDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedDriveAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

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
        cachedAccessToken = null;
        throw new Error(
          `Access restricted: "${user.email}" is not an authorized Chapter 3 Google tenant account. Only @chapter3.ca accounts can sign in.`
        );
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
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
 * Obtain or re-prompt for Google Drive access token from authorized session
 */
export async function getOrRequestDriveAccessToken(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // Trigger popup to get OAuth credential with Drive scope
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google Drive access token was not returned. Please grant Drive permissions.');
  }
  cachedAccessToken = credential.accessToken;
  return cachedAccessToken;
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser(): Promise<void> {
  try {
    cachedAccessToken = null;
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Clear token on auth state change if logged out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

export { firebaseConfig, onAuthStateChanged, FirebaseUser };

