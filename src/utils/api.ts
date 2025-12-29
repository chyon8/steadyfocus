import { supabase } from './supabase/client';
import type { Task, ThemeName } from '../App';

// Helper to get current user
const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
};

// Map DB snake_case to Frontend camelCase
const mapTaskFromDB = (t: any): Task => ({
  id: t.id,
  title: t.title,
  completed: t.completed,
  createdAt: new Date(t.created_at),
  scheduledDate: t.scheduled_date ? new Date(t.scheduled_date) : undefined,
  timeSpent: t.time_spent || 0,
  notes: t.notes,
  pomodoroSessions: t.pomodoro_sessions || 0,
  startedAt: t.started_at ? new Date(t.started_at) : undefined,
  completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
  recurring: t.recurring, // Assuming DB has this column, if not it will be undefined
});

// Map Frontend camelCase to DB snake_case
const mapTaskToDB = (userId: string, t: Partial<Task>) => {
  // Only include fields that are defined
  const dbTask: any = {
    user_id: userId,
  };
  
  if (t.title !== undefined) dbTask.title = t.title;
  if (t.completed !== undefined) dbTask.completed = t.completed;
  if (t.notes !== undefined) dbTask.notes = t.notes;
  if (t.timeSpent !== undefined) dbTask.time_spent = t.timeSpent;
  if (t.pomodoroSessions !== undefined) dbTask.pomodoro_sessions = t.pomodoroSessions;
  
  // Handle Dates
  if (t.scheduledDate !== undefined) dbTask.scheduled_date = t.scheduledDate;
  if (t.startedAt !== undefined) dbTask.started_at = t.startedAt;
  if (t.completedAt !== undefined) dbTask.completed_at = t.completedAt;
  if (t.createdAt !== undefined) dbTask.created_at = t.createdAt;
  if (t.recurring !== undefined) dbTask.recurring = t.recurring;

  return dbTask;
};

export function setAccessToken(token: string | null) {
  // No-op for direct client as it manages its own session, 
  // but kept to maintain interface compatibility
}

export interface Settings {
  theme: ThemeName;
  dailyGoal: number;
}

// Tasks API
export const tasksApi = {
  async getAll(): Promise<Task[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTaskFromDB);
  },

  async create(task: Partial<Task>): Promise<Task> {
    const user = await getUser();
    
    // For creation, we might not have all fields, but mapTaskToDB handles partials.
    // However, we want to ensure we pass the 'task' object properties correctly.
    // If the input 'task' has an ID (client-side temp ID), we typically ignore it 
    // and let DB generate UUID, OR if we want to enforce UUIDs from client we can.
    // Let's let DB generate ID.
    
    // Note: The app passes a partial task.
    const dbTask = mapTaskToDB(user.id, task);
    
    // If client generated an ID, we might want to respect it if it's a UUID, 
    // but the app generates Date.now() string IDs which are not UUIDs.
    // So we should NOT send 'id' for insert if it's not a UUID.
    if (task.id && task.id.length > 20) {
        dbTask.id = task.id;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();

    if (error) throw error;
    return mapTaskFromDB(data);
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const user = await getUser();
    const dbUpdates = mapTaskToDB(user.id, updates);
    // Remove user_id from updates to avoid redundancy/permissions issues sometimes
    delete dbUpdates.user_id;

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapTaskFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkUpdate(tasks: Task[]): Promise<void> {
    const user = await getUser();
    if (tasks.length === 0) return;

    // Convert all tasks to DB format
    // For bulk update/upsert, we need to match on ID.
    // Tasks from the app state should have UUIDs (except pending ones, which shouldn't be here).
    
    const dbTasks = tasks.map(t => {
      const dbT = mapTaskToDB(user.id, t);
      dbT.id = t.id; // Must include ID for upsert
      return dbT;
    });

    const { error } = await supabase
      .from('tasks')
      .upsert(dbTasks);

    if (error) throw error;
  },
};

// Settings API
export const settingsApi = {
  async get(): Promise<Settings> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { theme: 'minimal', dailyGoal: 3 } as any;

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error('Error fetching settings:', error);
    }

    return data ? {
      theme: data.theme,
      dailyGoal: data.daily_goal
    } : { theme: 'minimal', dailyGoal: 3 } as any; // Cast to any to handle ThemeName string mismatch if needed
  },

  async update(settings: Settings): Promise<Settings> {
    const user = await getUser();
    
    const dbSettings = {
      user_id: user.id,
      theme: settings.theme,
      daily_goal: settings.dailyGoal,
    };

    const { data, error } = await supabase
      .from('settings')
      .upsert(dbSettings, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    
    return {
      theme: data.theme,
      dailyGoal: data.daily_goal
    };
  },
};