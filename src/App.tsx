import { useState, useEffect } from 'react';
import { FocusMode } from './components/FocusMode';
import { TaskList } from './components/TaskList';
import { StatsView } from './components/StatsView';
import { WeekView } from './components/WeekView';
import { AllTasksView } from './components/AllTasksView';
import { AddTaskForm } from './components/AddTaskForm';
import { HistoryView } from './components/HistoryView';
import { OverdueSection } from './components/OverdueSection';
import { AuthScreen } from './components/AuthScreen';
import { LeftSideWidget, RightSideWidget } from './components/SideWidgets';
import { Circle, Palette, LogOut, Zap, CheckCircle2, Target, List, BarChart2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { tasksApi, settingsApi, setAccessToken } from './utils/api';
import { signUp, signIn, signOut, getSession, type AuthResponse } from './utils/supabase/client';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from './components/ui/alert-dialog';

export type ThemeName = 'light' | 'dark' | 'cyberpunk' | 'lavender' | 'ocean' | 'sunset';

export const THEMES = {
  light: {
    name: 'Light',
    emoji: '⚪',
    colors: {
      primary: '#ffffff',
      secondary: '#000000',
      accent: '#666666',
      bgLight: '#ffffff',
      bgDark: '#000000',
    }
  },
  dark: {
    name: 'Dark',
    emoji: '⚫',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      accent: '#666666',
      bgLight: '#ffffff',
      bgDark: '#000000',
    }
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    emoji: '🌆',
    colors: {
      primary: '#FF006E',
      secondary: '#00F5FF',
      accent: '#FFD60A',
      bgLight: '#F8F9FA',
      bgDark: '#0A0E27',
    }
  },
  lavender: {
    name: 'Lavender Dream',
    emoji: '💜',
    colors: {
      primary: '#9D4EDD',
      secondary: '#C77DFF',
      accent: '#E0AAFF',
      bgLight: '#FEFCFF',
      bgDark: '#1A0F2E',
    }
  },
  ocean: {
    name: 'Ocean Breeze',
    emoji: '🌊',
    colors: {
      primary: '#006D77',
      secondary: '#83C5BE',
      accent: '#EDF6F9',
      bgLight: '#FDFEFF',
      bgDark: '#0F1C1E',
    }
  },
  sunset: {
    name: 'Sunset Glow',
    emoji: '🌅',
    colors: {
      primary: '#FF5A5F',
      secondary: '#FFB400',
      accent: '#FF8B94',
      bgLight: '#FFFBF7',
      bgDark: '#1A0F0A',
    }
  }
} as const;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  scheduledDate?: Date;
  recurring?: 'daily' | 'weekly' | 'monthly';
  timeSpent: number;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  pomodoroSessions?: number;
  order?: number;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'focus' | 'list' | 'progress' | 'history' | 'stats'>('focus');
  const [filter, setFilter] = useState<'today' | 'all'>('today');
  const [theme, setTheme] = useState<ThemeName>('light');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(3);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Compute darkMode based on theme (must be before useEffects that use it)
  const darkMode = theme === 'dark';
  const currentTheme = THEMES[theme];


  // Check for existing session and restore app state on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          setAuthResponse(session);
          setAccessToken(session.accessToken);
        }
        
        // Restore App State (Focus Mode / Window Size)
        try {
          // Add a small delay to ensure Electron main process is ready? 
          // No, IPC should be ready.
          if (window.electron && window.electron.getAppState) {
            const state = await window.electron.getAppState();
            console.log('Restoring app state:', state);
            if (state.isFocusMode) {
              setIsMinimized(state.focusMinimized);
              // Ensure we are in focus view
              setView('focus');
              // Note: currentTaskId needs to be restored too, but main process doesn't verify task existence.
              // We rely on getFilteredTasks to select a task, or we should persist currentTaskId in store too.
              // For now, if we are in focus mode, we assume the user was working on the first available task 
              // or let the existing useEffect selection logic handle it.
            }
          }
        } catch (err) {
          console.error('Failed to restore app state:', err);
        }

      } catch (error) {
        console.error('Failed to check session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Handle authentication
  const handleAuth = async (email: string, password: string, name?: string, isSignup?: boolean) => {
    try {
      const response = isSignup 
        ? await signUp(email, password, name)
        : await signIn(email, password);
      
      setAuthResponse(response);
      setAccessToken(response.accessToken);
      
      // Load user data after authentication
      loadData();
    } catch (error: any) {
      throw error;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      setAuthResponse(null);
      setAccessToken(null);
      setTasks([]);
      setTheme('light');
      setDailyGoal(3);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Load initial data from Supabase
  const loadData = async () => {
    if (!authResponse) return;
    
    try {
      setIsLoading(true);
      
      // Load tasks
      const loadedTasks = await tasksApi.getAll();
      setTasks(loadedTasks);
      
      // Load settings
      const loadedSettings = await settingsApi.get();
      const themeName = (loadedSettings.theme as string) === 'minimal' ? 'light' : loadedSettings.theme;
      setTheme(themeName);
      setDailyGoal(loadedSettings.dailyGoal);
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
      
      // Fallback to localStorage if Supabase fails
      const savedTasks = localStorage.getItem('steady-tasks');
      const savedTheme = localStorage.getItem('steady-theme');
      const savedDailyGoal = localStorage.getItem('steady-daily-goal');
      
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : undefined,
          startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        })));
      }
      
      if (savedTheme !== null) {
        let parsedTheme = JSON.parse(savedTheme);
        if (parsedTheme === 'minimal') parsedTheme = 'light';
        setTheme(parsedTheme);
      }
      
      if (savedDailyGoal !== null) {
        setDailyGoal(JSON.parse(savedDailyGoal));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when authenticated
  useEffect(() => {
    if (authResponse) {
      loadData();
    }
  }, [authResponse]);

  // Sync tasks to Supabase whenever they change
  useEffect(() => {
    if (!authResponse || isLoading) return; // Don't sync if not authenticated or during initial load
    
    const syncTasks = async () => {
      // Always save to localStorage as backup/fallback first
      localStorage.setItem('steady-tasks', JSON.stringify(tasks));

      // Check for pending tasks
      const hasPendingTask = tasks.some(t => t.id.length < 20);
      
      if (hasPendingTask) {
        console.log('Skipping server sync due to pending task creation (preventing race condition)');
        return;
      }

      try {
        await tasksApi.bulkUpdate(tasks);
      } catch (error: any) {
        console.error('Failed to sync tasks to Supabase:', error);
        
        // If JWT is invalid, log out the user
        if (error.message?.includes('Invalid JWT') || error.message?.includes('401')) {
          console.log('Session expired, logging out...');
          handleLogout();
          return;
        }
      }
    };
    
    syncTasks();
  }, [tasks, authResponse, isLoading]);

  useEffect(() => {
    if (!authResponse || isLoading) return; // Don't sync if not authenticated or during initial load
    
    localStorage.setItem('steady-theme', JSON.stringify(theme));
    
    // Sync settings to Supabase
    const syncSettings = async () => {
      try {
        await settingsApi.update({ theme, dailyGoal });
      } catch (error) {
        console.error('Failed to sync theme setting to Supabase:', error);
      }
    };
    
    syncSettings();
    
    // Apply theme colors to CSS variables
    const colors = THEMES[theme].colors;
    const root = document.documentElement;
    
    if (theme === 'light' || theme === 'dark') {
      // Default minimal themes - remove custom properties
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      // Custom theme
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-accent', colors.accent);
      root.classList.remove('dark');
    }
  }, [theme, dailyGoal, authResponse, isLoading]);

  useEffect(() => {
    localStorage.setItem('steady-daily-goal', JSON.stringify(dailyGoal));
  }, [dailyGoal]);

  useEffect(() => {
    if (!currentTaskId) {
      const filteredTasks = getFilteredTasks();
      const firstIncomplete = filteredTasks.find(t => !t.completed);
      if (firstIncomplete) {
        setCurrentTaskId(firstIncomplete.id);
      }
    }
  }, [tasks, filter, currentTaskId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Cmd/Ctrl + K: Quick add task
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setView('list');
        // Focus on the quick add input
        setTimeout(() => {
          const input = document.querySelector('input[placeholder="New task..."]') as HTMLInputElement;
          if (input) input.focus();
        }, 100);
        return;
      }
      
      // Space: Complete task (only in focus mode)
      if (e.key === ' ' && view === 'focus' && !isMinimized && !isInputField) {
        e.preventDefault();
        if (currentTaskId) {
          completeTask(currentTaskId);
        }
        return;
      }
      
      // Don't trigger other shortcuts when typing
      if (isInputField) return;
      
      // Number keys for navigation
      if (e.key === '1' || (e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setView('focus');
      }
      if (e.key === '2' || (e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setView('list');
      }
      if (e.key === '3' || (e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setView('stats');
      }
      if (e.key === '4' || (e.ctrlKey || e.metaKey) && e.key === '4') {
        e.preventDefault();
        setView('history');
      }
      
      // T: Toggle theme
      if (e.key === 't' || e.key === 'T') {
        setTheme(darkMode ? 'light' : 'dark');
      }
      
      // Escape: Clear focus/close dialogs
      if (e.key === 'Escape') {
        if (view !== 'focus') {
          setView('focus');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [view, currentTaskId, darkMode, isMinimized]);


  const getFilteredTasks = (taskList: Task[] = tasks) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return taskList.filter(task => {
      if (task.completed) return false;
      
      if (filter === 'today') {
        if (task.scheduledDate) {
          const taskDate = new Date(task.scheduledDate);
          // Exclude overdue tasks from today's list (they'll be shown separately)
          if (taskDate < today) return false;
          return taskDate.toDateString() === today.toDateString();
        }
        return !task.scheduledDate;
      }
      
      if (filter === 'all') {
        return true;
      }
      
      return true;
    });
  };

  const getOverdueTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
      if (task.completed) return false;
      if (!task.scheduledDate) return false;
      
      const taskDate = new Date(task.scheduledDate);
      return taskDate < today;
    });
  };

  const rescheduleTaskToToday = (id: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    updateTaskSchedule(id, today);
  };

  const addTask = (title: string, scheduledDate?: Date, recurring?: 'daily' | 'weekly' | 'monthly', notes?: string) => {
    // Calculate max order for new task
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order ?? -1), -1);
    
    const newTask: Task = {
      id: Date.now().toString(), // Temporary ID, will be replaced by server UUID
      title,
      completed: false,
      createdAt: new Date(),
      scheduledDate,
      recurring,
      timeSpent: 0,
      notes,
      pomodoroSessions: 0,
      order: maxOrder + 1,
    };
    
    // Optimistically add to UI
    setTasks([...tasks, newTask]);
    
    // Create in backend
    tasksApi.create(newTask).then(createdTask => {
      // Replace temporary task with server task (with UUID)
      setTasks(prevTasks => 
        prevTasks.map(t => {
          if (t.id === newTask.id) {
            // Merge server task with client state to preserve order changes
            // that might have happened while request was in flight
            return {
              ...createdTask,
              order: t.order, // Use current client-side order
              completed: t.completed, // Preserve optimistic updates
              // Preserve other potential client-side changes
              title: t.title,
              notes: t.notes,
              scheduledDate: t.scheduledDate,
              // Critical: Preserve time tracking state that might have advanced while saving
              timeSpent: t.timeSpent, 
              startedAt: t.startedAt,
              pomodoroSessions: t.pomodoroSessions,
            };
          }
          return t;
        })
      );
      
      // Update selectedTaskIds if the temp task was selected
      setSelectedTaskIds(prev => 
        prev.map(id => id === newTask.id ? createdTask.id : id)
      );
      
      // Update currentTaskId if it was the temp task
      setCurrentTaskId(prev => prev === newTask.id ? createdTask.id : prev);
    }).catch(error => {
      console.error('Failed to create task:', error);
      // Remove optimistically added task on error
      setTasks(prevTasks => prevTasks.filter(t => t.id !== newTask.id));
    });
  };

  const completeTask = (id: string) => {
    // Calculate next task BEFORE updating state to avoid race condition
    const updatedTasks = tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: true, completedAt: new Date(), startedAt: undefined };
      }
      return task;
    });
    
    // Calculate next task from the future state
    const filteredTasks = getFilteredTasks(updatedTasks);
    const currentIndex = filteredTasks.findIndex(t => t.id === id);
    
    let nextTaskId: string | null = null;
    if (currentIndex < filteredTasks.length - 1) {
      nextTaskId = filteredTasks[currentIndex + 1].id;
    } else if (filteredTasks.length > 1) {
      nextTaskId = filteredTasks[0].id;
    }
    
    // Update currentTaskId FIRST, then tasks
    // This ensures FocusMode always has a valid task reference
    setCurrentTaskId(nextTaskId);
    setTasks(updatedTasks);
  };

  const deleteTask = async (id: string) => {
    const taskFound = tasks.find(t => t.id === id);
    if (taskFound) {
      setTaskToDelete(taskFound);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    
    const id = taskToDelete.id;
    // Optimistically update UI
    setTasks(tasks.filter(task => task.id !== id));
    if (currentTaskId === id) {
      setCurrentTaskId(null);
    }
    
    // Remove from selectedTaskIds
    setSelectedTaskIds(prev => prev.filter(taskId => taskId !== id));
    setTaskToDelete(null);
    
    // Delete from database
    try {
      await tasksApi.delete(id);
      console.log('Task deleted from database:', id);
    } catch (error) {
      console.error('Error deleting task from database:', error);
    }
  };

  const startTask = (id: string) => {
    setTasks(tasks.map(task => ({
      ...task,
      startedAt: task.id === id ? new Date() : undefined,
    })));
    setCurrentTaskId(id);
    setView('focus');
  };

  const updateTaskTime = (id: string, seconds: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        return { ...task, timeSpent: (task.timeSpent || 0) + seconds };
      }
      return task;
    }));
  };

  const updateTaskSchedule = (id: string, scheduledDate: Date) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        return { ...task, scheduledDate };
      }
      return task;
    }));
  };

  const updateTaskNotes = (id: string, notes: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        return { ...task, notes };
      }
      return task;
    }));
  };

  const updateTaskTitle = (id: string, title: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        return { ...task, title };
      }
      return task;
    }));
  };

  const incrementPomodoroSession = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        return { ...task, pomodoroSessions: (task.pomodoroSessions || 0) + 1 };
      }
      return task;
    }));
  };

  const reorderTasks = (dragId: string, hoverId: string) => {
    const dragIndex = tasks.findIndex(t => t.id === dragId);
    const hoverIndex = tasks.findIndex(t => t.id === hoverId);
    
    if (dragIndex === -1 || hoverIndex === -1) return;
    
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedTask);
    
    // Assign order values based on new positions
    const tasksWithOrder = newTasks.map((t, index) => ({ ...t, order: index }));
    setTasks(tasksWithOrder);
    
    // Update currentTaskId to reflect new order
    const newFilteredTasks = getFilteredTasks(newTasks);
    const newFirstTask = newFilteredTasks[0];
    if (newFirstTask && newFirstTask.id !== currentTaskId) {
      setCurrentTaskId(newFirstTask.id);
    }
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(taskId => taskId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const startSelectedTasks = () => {
    if (selectedTaskIds.length === 0) return;
    
    // Set the first selected task as current
    setCurrentTaskId(selectedTaskIds[0]);
    setSelectedTaskIds([]); // Clear selection after starting
    setView('focus');
  };

  const completeSelectedTasks = () => {
    if (selectedTaskIds.length === 0) return;
    
    setTasks(prevTasks => prevTasks.map(task => {
      if (selectedTaskIds.includes(task.id)) {
        return { ...task, completed: true, completedAt: new Date(), startedAt: undefined };
      }
      return task;
    }));
    
    // Clear selection after completing
    setSelectedTaskIds([]);
    setCurrentTaskId(null);
  };

  const restoreTask = (id: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: false, completedAt: undefined };
      }
      return task;
    }));
  };

  const rescheduleAllOverdueToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update all overdue tasks in a single state update
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.completed) return task;
        if (!task.scheduledDate) return task;
        
        const taskDate = new Date(task.scheduledDate);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        if (taskDate < todayStart) {
          return { ...task, scheduledDate: today };
        }
        return task;
      })
    );
  };

  const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) : null;
  const filteredTasks = getFilteredTasks();
  const overdueTasks = getOverdueTasks();
  
  // Filter tasks for focus mode - if tasks are selected, show only those
  const focusTasks = selectedTaskIds.length > 0 
    ? tasks.filter(t => selectedTaskIds.includes(t.id) && !t.completed)
    : filteredTasks;
  
  const nextTask = currentTask ? focusTasks[focusTasks.findIndex(t => t.id === currentTask.id) + 1] : null;
  const completedToday = tasks.filter(t => {
    if (!t.completed) return false;
    if (!t.completedAt) return false;
    const today = new Date();
    const taskDate = new Date(t.completedAt);
    return taskDate.toDateString() === today.toDateString();
  }).length;

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-app-dark' : 'bg-white'
      }`}>
        <Circle className={`w-8 h-8 animate-spin ${
          darkMode ? 'text-white' : 'text-black'
        }`} />
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!authResponse) {
    return <AuthScreen onAuth={handleAuth} darkMode={darkMode} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 ${
      darkMode 
        ? 'bg-app-dark' 
        : 'bg-white'
    }`}>
      {/* Grain Texture */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }} 
      />

      {/* Header */}
      {!isMinimized && (
        <header className="fixed top-0 left-0 right-0 z-50">
          <div className="absolute inset-0" 
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              backgroundColor: darkMode ? 'rgba(22, 22, 24, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
              WebkitAppRegion: 'drag',
            } as React.CSSProperties}
          />
          <div className="relative max-w-[1400px] mx-auto px-12" style={{ WebkitAppRegion: 'drag', paddingBlock: '1.25rem' } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              {/* Left Area: Spacer + Logo */}
              <div className="w-32 flex-shrink-0 flex items-center">
                <div className="w-16" />
                {/* Logo */}
                <motion.button
                  onClick={() => setView('focus')}
                  className="flex items-center gap-2 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    darkMode ? 'bg-white opacity-90' : 'bg-black'
                  }`}>
                    <Circle className={`w-2.5 h-2.5 ${
                      darkMode ? 'text-black' : 'text-white'
                    } fill-current`} />
                  </div>
                </motion.button>
              </div>
              
              {/* Center Navigation with Tabs */}
              <nav className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>

                {[
                  { id: 'focus', label: 'Focus', hideOnSmall: false },
                  { id: 'list', label: 'Plan', hideOnSmall: false },
                  { id: 'stats', label: 'Stats', hideOnSmall: true },
                  { id: 'history', label: 'History', hideOnSmall: true },
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => setView(item.id as any)}
                    className={`select-none ${item.hideOnSmall ? 'hide-on-small' : ''} relative flex-shrink-0 flex items-center justify-center px-4 sm:px-6 py-2.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                      view === item.id
                        ? darkMode 
                          ? 'text-white' 
                          : 'text-black'
                        : darkMode
                          ? 'text-white/25 hover:text-white/50'
                          : 'text-black/25 hover:text-black/50'
                    }`}
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {view === item.id && (
                      <motion.div
                        layoutId="nav"
                        className={`absolute inset-0 rounded-md ${
                          darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
                        }`}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                  </motion.button>
                ))}
              </nav>
              
              {/* Right Area: Theme Toggle */}
              <div className="w-32 flex-shrink-0 flex items-center justify-end gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <motion.button
                  onClick={() => setShowLogoutConfirm(true)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    darkMode
                      ? 'bg-white/[0.06] hover:bg-white/[0.1]'
                      : 'bg-black/[0.04] hover:bg-black/[0.08]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Logout"
                >
                  <LogOut className={`w-3 h-3 ${
                    darkMode ? 'text-white' : 'text-black'
                  }`} />
                </motion.button>

                <motion.button
                  onClick={() => setTheme(darkMode ? 'light' : 'dark')}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    darkMode
                      ? 'bg-white/[0.06] hover:bg-white/[0.1]'
                      : 'bg-black/[0.04] hover:bg-black/[0.08]'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Circle className={`w-2 h-2 ${
                    darkMode ? 'text-white' : 'text-black'
                  } ${darkMode ? 'fill-white' : ''}`} />
                </motion.button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={isMinimized ? '' : 'pt-24 pb-32 px-6 sm:px-12'}>
        <div className={isMinimized ? '' : 'max-w-[1400px] mx-auto'}>
          <AnimatePresence mode="wait">
            {view === 'focus' && (
              <motion.div
                key="focus"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <FocusMode
                  task={currentTask}
                  nextTask={nextTask}
                  totalTasks={focusTasks.length}
                  completedToday={completedToday}
                  dailyGoal={dailyGoal}
                  onComplete={completeTask}
                  onUpdateTime={updateTaskTime}
                  onIncrementPomodoro={incrementPomodoroSession}
                  isMinimized={isMinimized}
                  onMinimize={setIsMinimized}
                  darkMode={darkMode}
                  onNavigateToPlan={() => setView('list')}
                />
              </motion.div>
            )}

            {view === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex justify-center gap-8 items-start relative">
                  {/* Left spacer - visible only on wide screens */}
                  <div className="side-widget hidden lg:block w-[240px]" />

                  {/* Center - Main Task List */}
                  <div className="w-full min-w-[320px] max-w-[680px] space-y-6 pb-32">
                    {/* Filter + Inline Stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(['today', 'all'] as const).map((f) => (
                          <motion.button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`select-none relative px-5 py-2 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors ${
                              filter === f
                                ? darkMode ? 'text-black' : 'text-white'
                                : darkMode ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'
                            }`}
                            whileHover={{ y: -1 }}
                          >
                            {filter === f && (
                              <motion.div
                                layoutId="filter"
                                className={`absolute inset-0 rounded-md ${
                                  darkMode ? 'bg-white opacity-90' : 'bg-black'
                                }`}
                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                              />
                            )}
                            <span className="relative z-10">
                              {f === 'today' ? 'Today' : 'All'}
                            </span>
                          </motion.button>
                        ))}
                      </div>

                      {/* Mini Stats Badges */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[18px] font-medium tabular-nums ${
                            darkMode ? 'text-white' : 'text-black'
                          }`}>{completedToday}</span>
                          <span className={`text-[9px] uppercase tracking-[0.12em] ${
                            darkMode ? 'text-white/25' : 'text-black/25'
                          }`}>done</span>
                        </div>
                        <div className={`w-px h-4 ${
                          darkMode ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
                        }`} />
                        <div className="flex items-center gap-2">
                          <span className={`text-[18px] font-medium tabular-nums ${
                            darkMode ? 'text-white' : 'text-black'
                          }`}>{filteredTasks.length}</span>
                          <span className={`text-[9px] uppercase tracking-[0.12em] ${
                            darkMode ? 'text-white/25' : 'text-black/25'
                          }`}>left</span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Add Task */}
                    <AddTaskForm onAdd={addTask} darkMode={darkMode} />
                    
                    {filter === 'all' ? (
                      <AllTasksView
                        tasks={tasks}
                        onComplete={completeTask}
                         onDelete={deleteTask}
                        onStart={startTask}
                        onUpdateSchedule={updateTaskSchedule}
                        onUpdateTitle={updateTaskTitle}
                        darkMode={darkMode}
                      />
                    ) : (
                      <>
                        {/* Overdue Tasks Section */}
                        <OverdueSection
                          tasks={overdueTasks}
                          onComplete={completeTask}
                          onDelete={deleteTask}
                          onStart={startTask}
                          onUpdateSchedule={updateTaskSchedule}
                          onUpdateTitle={updateTaskTitle}
                          onRescheduleToToday={rescheduleTaskToToday}
                          onRescheduleAllToToday={rescheduleAllOverdueToToday}
                          darkMode={darkMode}
                          selectedTaskIds={selectedTaskIds}
                          onToggleSelect={toggleTaskSelection}
                        />
                        
                        {/* Today's Tasks */}
                        <TaskList
                          tasks={filteredTasks}
                          currentTaskId={currentTaskId}
                          onComplete={completeTask}
                          onDelete={deleteTask}
                          onStart={startTask}
                          onUpdateSchedule={updateTaskSchedule}
                          onUpdateTitle={updateTaskTitle}
                          onReorder={reorderTasks}
                          darkMode={darkMode}
                          selectedTaskIds={selectedTaskIds}
                          onToggleSelect={toggleTaskSelection}
                          onStartSelected={startSelectedTasks}
                          onCompleteSelected={completeSelectedTasks}
                        />
                      </>
                    )}
                  </div>

                  {/* Right spacer - visible only on wide screens */}
                  <div className="side-widget hidden lg:block w-[240px]">
                    <div className="sticky top-32">
                      <div className={`p-6 rounded-2xl border ${darkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-black/[0.06] bg-black/[0.02]'}`}>
                        <h3 className={`text-[10px] uppercase tracking-[0.15em] font-medium mb-6 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Keyboard Shortcuts</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={darkMode ? 'text-white/40' : 'text-black/40'}>New Task</span>
                            <kbd className={`px-2 py-1 rounded font-sans ${darkMode ? 'bg-white/[0.06] text-white/60' : 'bg-black/[0.04] text-black/60'}`}>⌘K</kbd>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={darkMode ? 'text-white/40' : 'text-black/40'}>Complete</span>
                            <kbd className={`px-2 py-1 rounded font-sans ${darkMode ? 'bg-white/[0.06] text-white/60' : 'bg-black/[0.04] text-black/60'}`}>Space</kbd>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={darkMode ? 'text-white/40' : 'text-black/40'}>Navigate</span>
                            <kbd className={`px-2 py-1 rounded font-sans ${darkMode ? 'bg-white/[0.06] text-white/60' : 'bg-black/[0.04] text-black/60'}`}>1-4</kbd>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={darkMode ? 'text-white/40' : 'text-black/40'}>Theme</span>
                            <kbd className={`px-2 py-1 rounded font-sans ${darkMode ? 'bg-white/[0.06] text-white/60' : 'bg-black/[0.04] text-black/60'}`}>T</kbd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {view === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <StatsView 
                  tasks={tasks} 
                  darkMode={darkMode} 
                  dailyGoal={dailyGoal}
                  onUpdateGoal={setDailyGoal}
                />
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <HistoryView tasks={tasks} darkMode={darkMode} onRestore={restoreTask} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Fixed Bottom Action Bar - OUTSIDE main to avoid any stacking/transform issues */}
      {view === 'list' && !isMinimized && (
        <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, zIndex: 9999, pointerEvents: 'none', display: 'flex', justifyContent: 'center', padding: '0 1.5rem' }}>
          <div style={{ width: '100%', minWidth: '320px', maxWidth: '680px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedTaskIds.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  completeSelectedTasks();
                }}
                style={{ height: '56px' }}
                className={`w-full rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-colors shadow-lg ${
                  darkMode
                    ? 'bg-[#161618] text-green-400 hover:bg-[#1c1c1e] border border-green-500/30'
                    : 'bg-white text-green-600 hover:bg-gray-50 border border-green-500/20'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Mark {selectedTaskIds.length} Done
              </button>
            )}

            {((filter === 'all' ? tasks.filter(t => !t.completed).length : filteredTasks.length) > 0 || selectedTaskIds.length > 0) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedTaskIds.length > 0) {
                    startSelectedTasks();
                  } else {
                    const firstTask = filter === 'all' ? tasks.filter(t => !t.completed)[0] : filteredTasks[0];
                    if (firstTask) {
                      startTask(firstTask.id);
                    }
                  }
                }}
                className={`w-full h-16 rounded-xl font-medium uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-colors shadow-2xl cursor-pointer ${
                  darkMode
                    ? 'bg-white text-black hover:bg-white/95'
                    : 'bg-black text-white hover:bg-black/95'
                }`}
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                {selectedTaskIds.length > 0 ? `Start ${selectedTaskIds.length} Selected` : 'Enter the zone'}
              </button>
            )}
          </div>
        </div>
      )}


      {/* Footer Hints (Removed as they are now in the sidebar) */}

      {/* Deletion Confirmation Modal */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent className={darkMode ? 'bg-black border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? 'text-white/50' : ''}>
              This will permanently delete the task "{taskToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-row items-center justify-end gap-3">
            <AlertDialogAction 
              onClick={confirmDelete}
              variant="destructive"
              className="w-24 h-10"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="w-24 h-10">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className={darkMode ? 'bg-black border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out</AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? 'text-white/50' : ''}>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-row items-center justify-end gap-3">
            <AlertDialogAction 
              onClick={handleLogout}
              className="w-24 h-10"
            >
              Log out
            </AlertDialogAction>
            <AlertDialogCancel className="w-24 h-10">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}