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
  LayoutGrid
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

const STORAGE_KEY = 'chapter3_consulting_clients_v2';
const USER_STORAGE_KEY = 'chapter3_active_user_v2';

export default function App() {
  // State for team members & current active user
  const [teamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);
  const [currentUser, setCurrentUser] = useState<TeamMember>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const found = TEAM_MEMBERS.find(m => m.id === saved);
      if (found) return found;
    }
    // Default to Mary Jane Leslie (Admin)
    return TEAM_MEMBERS[0];
  });

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

  // Save clients to localStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.warn('Failed to save clients to localStorage', e);
    }
  }, [clients]);

  // Save active user
  useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, currentUser.id);
  }, [currentUser]);

  // Dashboard filter & view states
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<ClientCategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);

  // Sync selectedClient with live clients state
  const currentSelectedClient = selectedClient 
    ? clients.find(c => c.id === selectedClient.id) || selectedClient 
    : null;

  // Handler to update a client
  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
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
        return {
          ...client,
          tasks: [newTask, ...client.tasks]
        };
      }
      return client;
    }));
  };

  // Handler to update a task's status
  const handleUpdateTaskStatus = (clientId: string, taskId: string, status: TaskStatus) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
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
      }
      return client;
    }));
  };

  // Handler to update task assignee
  const handleUpdateTaskAssignee = (clientId: string, taskId: string, assigneeEmail: string | null) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
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
      }
      return client;
    }));
  };

  // Handler to add note to task
  const handleAddNote = (clientId: string, taskId: string, text: string) => {
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
        return {
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
      }
      return client;
    }));
  };

  // Handler to update deliverable URL
  const handleUpdateDeliverableUrl = (clientId: string, taskId: string, url: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
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
      }
      return client;
    }));
  };

  // Handler to delete task
  const handleDeleteTask = (clientId: string, taskId: string) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          tasks: client.tasks.filter(t => t.id !== taskId)
        };
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

        return {
          ...client,
          tasks: [resetCopy, ...client.tasks]
        };
      }
      return client;
    }));
  };

  // Workday Archival Logic (End-of-Day Cleanup)
  // When run, archives all completed/cancelled tasks out of the live dashboard feed
  // while permanently preserving them in the client's internal card history.
  // For recurring tasks in Retainer/Internal clients, automatically resets a fresh unassigned copy back into the Client Card's open task list!
  const handleRunEndOfDayCleanup = () => {
    setClients(prev => prev.map(client => {
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
            isArchivedFromFeed: true
          };
        }
        return task;
      });

      return {
        ...client,
        tasks: [...newlyResetRecurringTasks, ...updatedTasks]
      };
    }));
  };

  // Filter clients based on Active / Inactive toggle, category pills, and search
  const activeClientsCount = clients.filter(c => c.status === 'Active').length;
  const inactiveClientsCount = clients.filter(c => c.status === 'Inactive').length;

  const filteredClients = clients.filter(client => {
    // 1. Active vs Inactive toggle rule: Default displays Active. Inactive displays only when filter is enabled.
    if (showInactive) {
      if (client.status !== 'Inactive') return false;
    } else {
      if (client.status !== 'Active') return false;
    }

    // 2. Category filter: All, Project, Retainer, Internal
    if (categoryFilter !== 'All' && client.type !== categoryFilter) {
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

  // Calculate total open tasks for the top navbar indicator
  const totalOpenAssignedTasks = clients.reduce((acc, c) => {
    return acc + c.tasks.filter(t => t.assignedTo && !t.isArchivedFromFeed && t.status !== 'Complete' && t.status !== 'Cancelled').length;
  }, 0);

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
        onAddNote={handleAddNote}
        onUpdateDeliverableUrl={handleUpdateDeliverableUrl}
        onDeleteTask={handleDeleteTask}
        onResetRecurringTask={handleResetRecurringTask}
      />
    );
  }

  // Otherwise, render the Main Dashboard (Two-Column Split View)
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        teamMembers={teamMembers}
        onSelectUser={setCurrentUser}
        showInactive={showInactive}
        onToggleShowInactive={setShowInactive}
        onOpenAddClient={() => setIsAddClientModalOpen(true)}
        activeClientCount={activeClientsCount}
        inactiveClientCount={inactiveClientsCount}
        totalOpenTasks={totalOpenAssignedTasks}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Two-Column Split View: LEFT COLUMN (Clients) | RIGHT COLUMN (Priority Tasks Feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: CLIENT CARDS (7 Cols on LG) ================= */}
          <section className="lg:col-span-7 space-y-5">
            
            {/* Header & Controls Bar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-serif flex items-center space-x-2">
                    <span>{showInactive ? 'Archived & Inactive Accounts' : 'Active Client Engagements'}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {filteredClients.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {showInactive
                      ? 'Past completed engagements and dormant retainer archives'
                      : 'Active consulting projects, ongoing retainers, and internal practice initiatives'}
                  </p>
                </div>

                {/* Category Pills: All, Project, Retainer, Internal */}
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto">
                  {(['All', 'Project', 'Retainer', 'Internal'] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                        categoryFilter === category
                          ? 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client engagements by name, industry, or strategic scope..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredClients.length === 0 ? (
                <div className="sm:col-span-2 bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                  <h4 className="text-sm font-bold text-slate-800">No Client Cards Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? `No clients matched "${searchQuery}". Try clearing your search query.`
                      : showInactive
                      ? 'No inactive or archived client accounts in this category.'
                      : 'No active clients found in this category. Click "+ Add Client Card" above.'}
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    teamMembers={teamMembers}
                    onSelectClient={(c) => setSelectedClient(c)}
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
        onClose={() => setIsAddClientModalOpen(false)}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onAddClient={handleAddClient}
        onSwitchToAdmin={(admin) => {
          setCurrentUser(admin);
        }}
      />

    </div>
  );
}
