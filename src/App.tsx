import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  FolderKanban, 
  Repeat, 
  Building, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  Upload
} from 'lucide-react';
import { 
  Client, 
  TeamMember, 
  ClientCategoryFilter, 
  TaskStatus, 
  Task, 
  TaskPriority 
} from './types';
import { TEAM_MEMBERS, INITIAL_CLIENTS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { ClientCard } from './components/ClientCard';
import { PriorityTasksFeed } from './components/PriorityTasksFeed';
import { ClientDetailView } from './components/ClientDetailView';
import { AddClientModal } from './components/AddClientModal';
import { SOWUploadModal } from './components/SOWUploadModal';
import { LoginScreen } from './components/LoginScreen';
import { 
  subscribeToClients, 
  saveClientToDb, 
  deleteClientFromDb,
  saveMultipleClientsToDb, 
  seedInitialFirestoreDataIfEmpty,
  saveUserClientOrder,
  getUserClientOrder
} from './firebase/firestoreService';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  onAuthStateChanged, 
  FirebaseUser 
} from './firebase/config';
import { AlertCircle, LogIn, X, CheckCircle, RotateCcw, GripVertical } from 'lucide-react';

const STORAGE_KEY = 'chapter3_consulting_clients_v2';
const USER_STORAGE_KEY = 'chapter3_active_user_v2';

export default function App() {
  // State for team members & current active user
  const [teamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Current active user - strictly locked to verified Google tenant account
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.email) {
            return parsed;
          }
        } catch {
          // If stored as legacy id string, check if member exists
          const found = TEAM_MEMBERS.find(m => m.id === saved);
          if (found) return found;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved user', e);
    }
    return null;
  });

  // Listen to Firebase Auth state - strictly enforce @chapter3.ca Google tenant
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userEmailLower = user.email.toLowerCase();
        
        // Strict tenant barrier: only @chapter3.ca accounts are permitted
        if (!userEmailLower.endsWith('@chapter3.ca')) {
          console.warn('Unauthorized domain attempted login:', user.email);
          await signOutUser();
          setFirebaseUser(null);
          setCurrentUser(null);
          localStorage.removeItem(USER_STORAGE_KEY);
          setAuthError(
            `Access restricted: "${user.email}" is not an authorized Chapter 3 Google tenant account. Only @chapter3.ca accounts can sign in.`
          );
          setIsAuthInitializing(false);
          return;
        }

        setFirebaseUser(user);
        setAuthError(null);

        // Match against existing team members directory
        const matchedMember = teamMembers.find(m => m.email.toLowerCase() === userEmailLower);
        let activePerson: TeamMember;
        if (matchedMember) {
          activePerson = {
            ...matchedMember,
            id: user.uid || matchedMember.id
          };
        } else {
          // Dynamic team member for authenticated account from @chapter3.ca
          const name = user.displayName || user.email.split('@')[0];
          const initials = user.displayName
            ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : user.email.slice(0, 2).toUpperCase();
          activePerson = {
            id: user.uid,
            name,
            email: user.email,
            role: userEmailLower.endsWith('@chapter3.ca') ? 'Admin' : 'User',
            title: 'Consultant',
            avatarColor: 'from-sky-500 to-indigo-600',
            initials
          };
        }

        // Tag permanently to this person
        setCurrentUser(activePerson);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(activePerson));
        } catch (e) {
          console.warn('Failed to cache user identity', e);
        }
      } else {
        setFirebaseUser(null);
        try {
          const saved = localStorage.getItem(USER_STORAGE_KEY);
          if (!saved) {
            setCurrentUser(null);
          }
        } catch {
          // ignore
        }
      }
      setIsAuthInitializing(false);
    });

    return () => unsubscribe();
  }, [teamMembers]);

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      const user = await signInWithGoogle();
      if (user) {
        setCloudStatus('connected');
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Google Sign Out / Logout handler
  const handleGoogleSignOut = async () => {
    try {
      await signOutUser();
      setFirebaseUser(null);
      setCurrentUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // State for client cards data
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse localStorage clients', e);
    }
    return INITIAL_CLIENTS;
  });

  // Subscribe to real-time Firestore database & seed initial consulting projects on first run
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initFirestore() {
      try {
        setCloudStatus('syncing');
        // Check and seed default data if database is fresh
        await seedInitialFirestoreDataIfEmpty();

        // Subscribe to live Firestore updates
        unsubscribe = subscribeToClients(
          (liveClients) => {
            if (!isMounted) return;
            if (liveClients && liveClients.length > 0) {
              setClients(liveClients);
            }
            setCloudStatus('connected');
          },
          (err) => {
            if (!isMounted) return;
            console.warn('Firestore subscription fallback:', err);
            setCloudStatus('offline');
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.error('Firestore init error:', err);
        setCloudStatus('offline');
      }
    }

    initFirestore();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync to local storage as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.warn('Failed to save clients to localStorage', e);
    }
  }, [clients]);

  // Save active user safely
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } catch (e) {
        console.warn('Failed to save user to localStorage', e);
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  // Firestore sync helper for individual client writes
  const persistClient = (updatedClient: Client) => {
    setCloudStatus('syncing');
    saveClientToDb(updatedClient)
      .then(() => setCloudStatus('connected'))
      .catch((err) => {
        console.error('Failed to sync client to Firestore:', err);
        setCloudStatus('offline');
      });
  };

  // Dashboard filter & view states
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<ClientCategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);
  const [wonProspectToConvert, setWonProspectToConvert] = useState<Partial<Client> | null>(null);
  const [isSOWModalOpen, setIsSOWModalOpen] = useState<boolean>(false);
  const [sowTargetClientId, setSowTargetClientId] = useState<string | undefined>(undefined);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Per-user custom card order state
  const [userCardOrder, setUserCardOrder] = useState<string[]>(() => {
    if (currentUser?.email) {
      try {
        const saved = localStorage.getItem(`chapter3_user_client_order_${currentUser.email.toLowerCase()}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse saved client card order', e);
      }
    }
    return [];
  });

  // Drag and drop tracking state
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Sync user card order when active user changes, and fetch from Firestore
  useEffect(() => {
    if (!currentUser?.email) {
      setUserCardOrder([]);
      return;
    }
    const userKey = currentUser.email.toLowerCase();
    const localKey = `chapter3_user_client_order_${userKey}`;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setUserCardOrder(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to read local client card order', e);
    }

    getUserClientOrder(userKey).then(remoteOrder => {
      if (remoteOrder && remoteOrder.length > 0) {
        setUserCardOrder(remoteOrder);
        try {
          localStorage.setItem(localKey, JSON.stringify(remoteOrder));
        } catch {}
      }
    }).catch(err => {
      console.warn('Could not fetch remote card order:', err);
    });
  }, [currentUser?.email]);

  const handleCardDragStart = (e: React.DragEvent, clientId: string) => {
    setDraggedClientId(clientId);
  };

  const handleCardDragOver = (e: React.DragEvent, targetId: string) => {
    if (!draggedClientId || draggedClientId === targetId) {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDropTargetId(targetId);
    setDropPosition(pos);
  };

  const handleCardDragLeave = (e: React.DragEvent, targetId: string) => {
    if (dropTargetId === targetId) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedClientId || draggedClientId === targetId) {
      setDraggedClientId(null);
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const finalPos = dropPosition || 'before';

    setUserCardOrder((prevOrder) => {
      const allClientIds = clients.map(c => c.id);
      let masterList = prevOrder && prevOrder.length > 0 ? [...prevOrder] : [...allClientIds];

      // Ensure any newly added client is in masterList
      allClientIds.forEach(id => {
        if (!masterList.includes(id)) {
          masterList.push(id);
        }
      });

      // Remove draggedClientId
      masterList = masterList.filter(id => id !== draggedClientId);

      // Find target index
      const targetIdx = masterList.indexOf(targetId);
      if (targetIdx === -1) {
        masterList.push(draggedClientId);
      } else {
        const insertIdx = finalPos === 'after' ? targetIdx + 1 : targetIdx;
        masterList.splice(insertIdx, 0, draggedClientId);
      }

      // Persist to user's localStorage
      if (currentUser?.email) {
        const userKey = currentUser.email.toLowerCase();
        try {
          localStorage.setItem(`chapter3_user_client_order_${userKey}`, JSON.stringify(masterList));
        } catch (err) {
          console.warn('Failed to save user card order locally', err);
        }
        // Persist to Firestore
        saveUserClientOrder(userKey, masterList).catch(err => {
          console.warn('Failed to save user card order to Firestore:', err);
        });
      }

      return masterList;
    });

    setDraggedClientId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleCardDragEnd = () => {
    setDraggedClientId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleResetUserOrder = () => {
    setUserCardOrder([]);
    if (currentUser?.email) {
      const userKey = currentUser.email.toLowerCase();
      localStorage.removeItem(`chapter3_user_client_order_${userKey}`);
      saveUserClientOrder(userKey, []).catch(console.warn);
    }
  };

  // Sync selectedClient with live clients state
  const currentSelectedClient = selectedClient 
    ? clients.find(c => c.id === selectedClient.id) || selectedClient 
    : null;

  // Handler to update a client (Strictly blocks non-admin accounts from archiving active clients or reactivating inactive clients)
  const handleUpdateClient = (updatedClient: Client) => {
    const existingClient = clients.find(c => c.id === updatedClient.id);
    if (
      existingClient && 
      existingClient.status === 'Active' && 
      updatedClient.status === 'Inactive' && 
      currentUser?.role !== 'Admin'
    ) {
      console.warn('Unauthorized: Non-admin users are not permitted to archive active clients.');
      setAuthError('Permission denied: Non-admin users are not permitted to archive active clients.');
      return;
    }

    if (
      existingClient && 
      existingClient.status === 'Inactive' && 
      updatedClient.status === 'Active' && 
      currentUser?.role !== 'Admin'
    ) {
      console.warn('Unauthorized: Regular users are not permitted to reactivate inactive clients.');
      setAuthError('Permission denied: Only Admin accounts are permitted to reactivate an inactive client.');
      return;
    }

    if (
      existingClient && 
      existingClient.name !== updatedClient.name && 
      currentUser?.role !== 'Admin'
    ) {
      console.warn('Unauthorized: Non-admin users are not permitted to rename client engagements.');
      setAuthError('Permission denied: Only Admin accounts can change the name of an engagement.');
      return;
    }

    // Set feedback toast if status changed
    if (existingClient && existingClient.status !== updatedClient.status) {
      if (updatedClient.status === 'Inactive') {
        setStatusNotification(`Moved "${updatedClient.name}" to archive. All associated deliverables have been moved to the Archive Queue.`);
      } else {
        setStatusNotification(`Reactivated "${updatedClient.name}". Open deliverables are now active in the Deliverables Queue.`);
      }
      setTimeout(() => setStatusNotification(null), 4500);
    }

    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    persistClient(updatedClient);
  };

  // Handler to permanently delete a client (Admin only)
  const handleDeleteClient = async (clientId: string) => {
    if (currentUser?.role !== 'Admin') {
      setAuthError('Permission denied: Only Admin accounts can permanently delete a client.');
      return;
    }

    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;

    // Deselect if currently open in drill-down view
    if (selectedClient?.id === clientId) {
      setSelectedClient(null);
    }

    // Optimistically remove from state
    setClients(prev => prev.filter(c => c.id !== clientId));

    try {
      setCloudStatus('syncing');
      await deleteClientFromDb(clientId);
      setCloudStatus('connected');
    } catch (err: any) {
      console.error('Failed to permanently delete client from Firestore:', err);
      setCloudStatus('offline');
      setAuthError(`Failed to delete client: ${err?.message || err}`);
      // Revert if database delete failed
      setClients(prev => [clientToDelete, ...prev]);
    }
  };

  // Handler when a prospecting deal is Won to prompt creating a new client card
  const handlePromptWonProspect = (prospectClient: Client) => {
    setWonProspectToConvert({
      name: prospectClient.name,
      industry: prospectClient.industry,
      leadConsultant: prospectClient.leadConsultant,
      projectSummary: prospectClient.projectSummary,
      type: 'Project'
    });
    setIsAddClientModalOpen(true);
  };

  // Handler to add a new client
  const handleAddClient = (newClientData: Omit<Client, 'id' | 'tasks'>) => {
    const newId = `c-${Date.now().toString(36)}`;
    const newClient: Client = {
      ...newClientData,
      id: newId,
      tasks: []
    };
    setClients(prev => [newClient, ...prev]);
    persistClient(newClient);
  };

  // SOW Modal triggers and creation handlers
  const handleOpenSOWModal = (clientId?: string) => {
    setSowTargetClientId(clientId);
    setIsSOWModalOpen(true);
  };

  const handleClientCreatedFromSOW = (newClient: Client) => {
    setClients(prev => [newClient, ...prev.filter(c => c.id !== newClient.id)]);
    persistClient(newClient);
    setSelectedClient(newClient);
  };

  const handleClientUpdatedFromSOW = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    persistClient(updatedClient);
    setSelectedClient(updatedClient);
  };

  // Handler to add a task to a client
  const handleAddTask = (clientId: string, taskData: Omit<Task, 'id' | 'clientId' | 'notes'>) => {
    const taskId = `t-${Date.now().toString(36)}`;
    const newTask: Task = {
      ...taskData,
      id: taskId,
      clientId,
      notes: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: [newTask, ...client.tasks]
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update a task's status
  const handleUpdateTaskStatus = (clientId: string, taskId: string, status: TaskStatus) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                status,
                completedAt: status === 'Complete' ? new Date().toISOString().split('T')[0] : task.completedAt
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update task assignee
  const handleUpdateTaskAssignee = (clientId: string, taskId: string, assigneeEmail: string | null) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                assignedTo: assigneeEmail
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update task priority (Admin editable)
  const handleUpdateTaskPriority = (clientId: string, taskId: string, priority: TaskPriority) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                priority
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update task due date (Admin editable)
  const handleUpdateTaskDueDate = (clientId: string, taskId: string, dueDate: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                dueDate
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update task SOW phase
  const handleUpdateTaskPhase = (clientId: string, taskId: string, phase?: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                phase: phase ? phase : undefined
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to add note to task
  const handleAddNote = (clientId: string, taskId: string, text: string) => {
    if (!currentUser) return;
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newNote = {
      id: `n-${Date.now().toString(36)}`,
      authorEmail: currentUser.email,
      authorName: currentUser.name,
      text,
      timestamp
    };

    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                notes: [newNote, ...(task.notes || [])]
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to update deliverable URL
  const handleUpdateDeliverableUrl = (clientId: string, taskId: string, url: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                deliverableUrl: url
              };
            }
            return task;
          })
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to delete task
  const handleDeleteTask = (clientId: string, taskId: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const updated = {
          ...client,
          tasks: client.tasks.filter(t => t.id !== taskId)
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Handler to reset a recurring task manually
  const handleResetRecurringTask = (clientId: string, taskId: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const sourceTask = client.tasks.find(t => t.id === taskId);
        if (!sourceTask) return client;

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 7);

        const resetCopy: Task = {
          id: `t-${Date.now().toString(36)}`,
          clientId,
          description: sourceTask.description,
          priority: sourceTask.priority,
          dueDate: nextDueDate.toISOString().split('T')[0],
          status: 'Not Started',
          assignedTo: null, // Fresh unassigned copy
          deliverableUrl: sourceTask.deliverableUrl,
          isRecurring: true,
          notes: []
        };

        const updated = {
          ...client,
          tasks: [resetCopy, ...client.tasks]
        };
        persistClient(updated);
        return updated;
      }
      return client;
    }));
  };

  // Workday Archival Logic (End-of-Day Cleanup)
  // When run, archives all completed/cancelled tasks out of the live dashboard feed
  // while permanently preserving them in the client's internal card history.
  // For recurring tasks in Retainer/Internal clients, automatically resets a fresh unassigned copy back into the Client Card's open task list!
  const handleRunEndOfDayCleanup = () => {
    const updatedClients = clients.map(client => {
      const isRetainerOrInternal = client.type === 'Retainer' || client.type === 'Internal';
      const newlyResetRecurringTasks: Task[] = [];

      const updatedTasks = client.tasks.map(task => {
        const isFinished = task.status === 'Complete' || task.status === 'Cancelled';
        
        // If finished and not yet archived from feed
        if (isFinished && !task.isArchivedFromFeed) {
          // If this is a recurring task in a retainer or internal client, generate a fresh copy
          if (task.isRecurring && isRetainerOrInternal && task.status === 'Complete') {
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + 7);

            newlyResetRecurringTasks.push({
              id: `t-rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              clientId: client.id,
              description: task.description,
              priority: task.priority,
              dueDate: nextDueDate.toISOString().split('T')[0],
              status: 'Not Started',
              assignedTo: null, // Fresh unassigned copy per requirement
              deliverableUrl: task.deliverableUrl,
              isRecurring: true,
              notes: []
            });
          }

          return {
            ...task,
            status: (task.status === 'Cancelled' ? 'Cancelled' : 'Complete') as TaskStatus,
            completedAt: task.completedAt || new Date().toISOString().split('T')[0],
            isArchivedFromFeed: true
          };
        }
        return task;
      });

      return {
        ...client,
        tasks: [...newlyResetRecurringTasks, ...updatedTasks]
      };
    });

    setClients(updatedClients);
    setCloudStatus('syncing');
    saveMultipleClientsToDb(updatedClients)
      .then(() => setCloudStatus('connected'))
      .catch((err) => {
        console.error('Failed to batch sync cleanup to Firestore:', err);
        setCloudStatus('offline');
      });
  };

  // Filter clients based on Active / Inactive toggle, category pills, and search
  const activeClientsCount = clients.filter(c => c.status === 'Active').length;
  const inactiveClientsCount = clients.filter(c => c.status === 'Inactive').length;

  // 1. Order all clients according to current user's custom master card order
  const orderedClients = React.useMemo(() => {
    if (!userCardOrder || userCardOrder.length === 0) {
      return clients;
    }
    const orderMap = new Map<string, number>();
    userCardOrder.forEach((id, idx) => {
      orderMap.set(id, idx);
    });
    return [...clients].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
      return idxA - idxB;
    });
  }, [clients, userCardOrder]);

  const filteredClients = orderedClients.filter(client => {
    // 1. Active vs Inactive toggle rule: Default displays Active. Inactive displays only when filter is enabled.
    if (showInactive) {
      if (client.status !== 'Inactive') return false;
    } else {
      if (client.status !== 'Active') return false;
    }

    // 2. Category filter: All, Project, Retainer, Project & Retainer, Internal, Prospecting
    if (categoryFilter === 'Project & Retainer') {
      if (client.type !== 'Project' && client.type !== 'Retainer') {
        return false;
      }
    } else if (categoryFilter !== 'All' && client.type !== categoryFilter) {
      return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = client.name.toLowerCase().includes(q);
      const matchIndustry = client.industry?.toLowerCase().includes(q);
      const matchSummary = client.projectSummary.toLowerCase().includes(q);
      if (!matchName && !matchIndustry && !matchSummary) return false;
    }

    return true;
  });

  // Calculate total open tasks for the top navbar indicator (active clients only)
  const totalOpenAssignedTasks = clients
    .filter(c => c.status === 'Active')
    .reduce((acc, c) => {
      return acc + c.tasks.filter(t => t.assignedTo && !t.isArchivedFromFeed && t.status !== 'Complete' && t.status !== 'Cancelled').length;
    }, 0);

  // 1. Initializing auth check splash screen
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-md font-serif text-2xl">
            3
          </div>
          <div className="text-center">
            <h2 className="text-lg font-serif tracking-tight text-stone-900">Chapter 3 Advisory</h2>
            <p className="text-xs text-stone-500 mt-0.5 font-mono">Verifying tenant credentials...</p>
          </div>
          <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: Must be authenticated with an authorized @chapter3.ca Google tenant account
  if (!currentUser) {
    return (
      <LoginScreen
        onSignIn={handleGoogleSignIn}
        onSelectConsultant={(member) => {
          setCurrentUser(member);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(member));
          } catch (e) {
            console.warn('Failed to cache user session', e);
          }
        }}
        isSigningIn={isSigningIn}
        authError={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  // If a client is selected, render the Drill-Down Full-Screen View
  if (currentSelectedClient) {
    return (
      <ClientDetailView
        client={currentSelectedClient}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onBack={() => setSelectedClient(null)}
        onUpdateClient={handleUpdateClient}
        onAddTask={handleAddTask}
        onUpdateTaskStatus={handleUpdateTaskStatus}
        onUpdateTaskAssignee={handleUpdateTaskAssignee}
        onUpdateTaskPriority={handleUpdateTaskPriority}
        onUpdateTaskDueDate={handleUpdateTaskDueDate}
        onUpdateTaskPhase={handleUpdateTaskPhase}
        onAddNote={handleAddNote}
        onUpdateDeliverableUrl={handleUpdateDeliverableUrl}
        onDeleteTask={handleDeleteTask}
        onResetRecurringTask={handleResetRecurringTask}
        onPromptWonProspect={handlePromptWonProspect}
        onOpenSOWUpload={handleOpenSOWModal}
        onDeleteClient={handleDeleteClient}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
      />
    );
  }

  // Otherwise, render the Main Dashboard (Two-Column Split View)
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        teamMembers={teamMembers}
        showInactive={showInactive}
        onToggleShowInactive={setShowInactive}
        onOpenAddClient={() => setIsAddClientModalOpen(true)}
        onOpenSOWUpload={() => handleOpenSOWModal()}
        activeClientCount={activeClientsCount}
        inactiveClientCount={inactiveClientsCount}
        totalOpenTasks={totalOpenAssignedTasks}
        cloudStatus={cloudStatus}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
        onSelectConsultant={(member) => {
          setCurrentUser(member);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(member));
          } catch (e) {
            console.warn('Failed to cache user identity', e);
          }
        }}
        isSigningIn={isSigningIn}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Auth Error Notification (If any) */}
        {authError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl flex items-center justify-between text-xs font-medium">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <button 
              type="button"
              onClick={() => setAuthError(null)} 
              className="text-rose-600 hover:text-rose-900 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status Notification (Client Archival / Reactivation Feedback) */}
        {statusNotification && (
          <div className="mb-6 bg-stone-900 text-stone-100 p-3.5 rounded-xl flex items-center justify-between text-xs font-medium shadow-md animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusNotification}</span>
            </div>
            <button 
              type="button"
              onClick={() => setStatusNotification(null)} 
              className="text-stone-400 hover:text-white cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Two-Column Split View: LEFT COLUMN (Clients) | RIGHT COLUMN (Priority Tasks Feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: CLIENT CARDS (7 Cols on LG) ================= */}
          <section className="lg:col-span-7 space-y-4">
            
            {/* Header & Controls Bar */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-xl font-normal text-stone-950 font-serif tracking-tight flex items-center space-x-2">
                      <span>{showInactive ? 'Archived Accounts' : 'Client Engagements'}</span>
                      <span className="text-xs font-mono text-stone-400 tabular-nums">
                        ({filteredClients.length})
                      </span>
                    </h2>
                    {userCardOrder.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetUserOrder}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200/80 transition-colors cursor-pointer"
                        title="Reset cards to default order"
                      >
                        <RotateCcw className="w-3 h-3 text-stone-400" />
                        <span>Reset Order</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center space-x-1 flex-wrap">
                    <span>
                      {showInactive
                        ? 'Completed engagements and past client archives'
                        : 'Active client retainers, project delivery, and practice initiatives'}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500">Drag cards to reorder</span>
                  </p>
                </div>

                {/* Category Selector Tabs */}
                <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto overflow-x-auto">
                  {(['All', 'Project', 'Retainer', 'Project & Retainer', 'Internal', 'Prospecting'] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        categoryFilter === category
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {category === 'Prospecting' ? 'Prospect' : category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar and Quick Upload Button */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by client name, industry, or strategic scope..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSOWModal()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] shrink-0"
                  title="Upload SOW to auto-extract deliverables and create client + tasks"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-400" />
                  <span>Upload SOW</span>
                </button>
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredClients.length === 0 ? (
                <div className="sm:col-span-2 bg-white rounded-2xl p-10 text-center border border-dashed border-stone-200">
                  <Building2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <h4 className="text-xs font-semibold text-stone-800">No Client Engagements Found</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? `No clients matched "${searchQuery}". Clear your search query to see all clients.`
                      : showInactive
                      ? 'No inactive or archived accounts in this view.'
                      : 'No active clients found. Click "+ New Client" above to create an engagement.'}
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                    onSelectClient={(c) => setSelectedClient(c)}
                    onUpdateClient={handleUpdateClient}
                    onPromptWonProspect={handlePromptWonProspect}
                    onDeleteClient={handleDeleteClient}
                    isDragging={draggedClientId === client.id}
                    dropPosition={dropTargetId === client.id ? dropPosition : null}
                    onDragStartCard={handleCardDragStart}
                    onDragOverCard={handleCardDragOver}
                    onDragLeaveCard={handleCardDragLeave}
                    onDropCard={handleCardDrop}
                    onDragEndCard={handleCardDragEnd}
                  />
                ))
              )}
            </div>

          </section>


          {/* ================= RIGHT COLUMN: PRIORITY TASKS LIVE FEED (5 Cols on LG) ================= */}
          <section className="lg:col-span-5 sticky top-24">
            <PriorityTasksFeed
              clients={clients}
              currentUser={currentUser}
              teamMembers={teamMembers}
              showInactive={showInactive}
              onToggleShowInactive={setShowInactive}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateTaskAssignee={handleUpdateTaskAssignee}
              onAddNote={handleAddNote}
              onUpdateDeliverableUrl={handleUpdateDeliverableUrl}
              onRunEndOfDayCleanup={handleRunEndOfDayCleanup}
              onSelectClient={(c) => setSelectedClient(c)}
            />
          </section>

        </div>
      </main>

      {/* Add Client Card Modal (Admin Only) */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setWonProspectToConvert(null);
        }}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onAddClient={handleAddClient}
        onOpenSOWUpload={() => handleOpenSOWModal()}
        initialValues={wonProspectToConvert}
      />

      {/* SOW Scope Breakdown & Task Engine Modal */}
      <SOWUploadModal
        isOpen={isSOWModalOpen}
        onClose={() => {
          setIsSOWModalOpen(false);
          setSowTargetClientId(undefined);
        }}
        currentUser={currentUser}
        teamMembers={teamMembers}
        clients={clients}
        targetClientId={sowTargetClientId}
        onClientCreated={handleClientCreatedFromSOW}
        onClientUpdated={handleClientUpdatedFromSOW}
      />

    </div>
  );
}
