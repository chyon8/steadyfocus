import type { Task, ThemeName } from '../App';

const API_BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/server`;

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

export interface Settings {
  theme: ThemeName;
  dailyGoal: number;
}

// Tasks API
export const tasksApi = {
  async getAll(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, { headers: getHeaders() });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch tasks:', error);
        throw new Error(error.error || 'Failed to fetch tasks');
      }
      const data = await response.json();
      // Parse dates from ISO strings
      return data.tasks.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : undefined,
        startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error in tasksApi.getAll:', error);
      throw error;
    }
  },

  async create(task: Partial<Task>): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ task }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create task:', error);
        throw new Error(error.error || 'Failed to create task');
      }
      const data = await response.json();
      return {
        ...data.task,
        id: data.task.id, // Now UUID from database
        createdAt: new Date(data.task.createdAt),
        scheduledDate: data.task.scheduledDate ? new Date(data.task.scheduledDate) : undefined,
        startedAt: data.task.startedAt ? new Date(data.task.startedAt) : undefined,
        completedAt: data.task.completedAt ? new Date(data.task.completedAt) : undefined,
      };
    } catch (error) {
      console.error('Error in tasksApi.create:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to update task:', error);
        throw new Error(error.error || 'Failed to update task');
      }
      const data = await response.json();
      return {
        ...data.task,
        createdAt: new Date(data.task.createdAt),
        scheduledDate: data.task.scheduledDate ? new Date(data.task.scheduledDate) : undefined,
        startedAt: data.task.startedAt ? new Date(data.task.startedAt) : undefined,
        completedAt: data.task.completedAt ? new Date(data.task.completedAt) : undefined,
      };
    } catch (error) {
      console.error('Error in tasksApi.update:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to delete task:', error);
        throw new Error(error.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error in tasksApi.delete:', error);
      throw error;
    }
  },

  async bulkUpdate(tasks: Task[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ tasks }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to bulk update tasks:', error);
        throw new Error(error.error || 'Failed to bulk update tasks');
      }
    } catch (error) {
      console.error('Error in tasksApi.bulkUpdate:', error);
      throw error;
    }
  },
};

// Settings API
export const settingsApi = {
  async get(): Promise<Settings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to fetch settings:', error);
        throw new Error(error.error || 'Failed to fetch settings');
      }
      const data = await response.json();
      return data.settings;
    } catch (error) {
      console.error('Error in settingsApi.get:', error);
      throw error;
    }
  },

  async update(settings: Settings): Promise<Settings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to update settings:', error);
        throw new Error(error.error || 'Failed to update settings');
      }
      const data = await response.json();
      return data.settings;
    } catch (error) {
      console.error('Error in settingsApi.update:', error);
      throw error;
    }
  },
};