import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './config';
import { Client, TeamMember } from '../types';
import { INITIAL_CLIENTS, TEAM_MEMBERS } from '../data/initialData';

const CLIENTS_COLLECTION = 'clients';
const TEAM_COLLECTION = 'teamMembers';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to remove undefined fields which Firestore rejects
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value === undefined) {
      return null;
    }
    return value;
  }));
}

/**
 * Real-time subscription to all clients in Firestore
 */
export function subscribeToClients(
  onUpdate: (clients: Client[]) => void,
  onError?: (err: Error) => void
) {
  const clientsCol = collection(db, CLIENTS_COLLECTION);
  return onSnapshot(
    clientsCol,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const clients: Client[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Client;
        clients.push({
          ...data,
          id: docSnap.id,
          tasks: data.tasks || []
        });
      });
      onUpdate(clients);
    },
    (error) => {
      console.error('Firestore clients subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch all clients once from Firestore
 */
export async function getClientsFromDb(): Promise<Client[]> {
  try {
    const clientsCol = collection(db, CLIENTS_COLLECTION);
    const snapshot = await getDocs(clientsCol);
    if (snapshot.empty) {
      return [];
    }
    const clients: Client[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Client;
      clients.push({
        ...data,
        id: docSnap.id,
        tasks: data.tasks || []
      });
    });
    return clients;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, CLIENTS_COLLECTION);
  }
}

/**
 * Save or update a single client in Firestore
 */
export async function saveClientToDb(client: Client): Promise<void> {
  const clientPath = `${CLIENTS_COLLECTION}/${client.id}`;
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
    const cleanData = sanitizeForFirestore(client);
    await setDoc(clientRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, clientPath);
  }
}

/**
 * Delete a client from Firestore
 */
export async function deleteClientFromDb(clientId: string): Promise<void> {
  const clientPath = `${CLIENTS_COLLECTION}/${clientId}`;
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await deleteDoc(clientRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, clientPath);
  }
}

/**
 * Save multiple clients to Firestore in a single batch
 */
export async function saveMultipleClientsToDb(clientsList: Client[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const client of clientsList) {
      const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
      batch.set(clientRef, sanitizeForFirestore(client), { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CLIENTS_COLLECTION);
  }
}

/**
 * Seeds initial clients and team members into Firestore if empty
 */
export async function seedInitialFirestoreDataIfEmpty(): Promise<boolean> {
  try {
    const clientsCol = collection(db, CLIENTS_COLLECTION);
    const snapshot = await getDocs(clientsCol);

    if (snapshot.empty) {
      console.log('Firestore is empty. Seeding initial consulting clients and team members...');
      const batch = writeBatch(db);

      // Seed clients
      for (const client of INITIAL_CLIENTS) {
        const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
        batch.set(clientRef, sanitizeForFirestore(client));
      }

      // Seed team members
      for (const member of TEAM_MEMBERS) {
        const memberRef = doc(db, TEAM_COLLECTION, member.id);
        batch.set(memberRef, sanitizeForFirestore(member));
      }

      await batch.commit();
      console.log('Firestore seeding completed successfully.');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Error seeding initial data to Firestore, operating with local fallback:', error);
    return false;
  }
}

/**
 * Test or verify database connection
 */
export async function checkFirestoreConnection(): Promise<boolean> {
  try {
    const clientsCol = collection(db, CLIENTS_COLLECTION);
    await getDocs(clientsCol);
    return true;
  } catch (error) {
    console.error('Firestore connection check failed:', error);
    return false;
  }
}

