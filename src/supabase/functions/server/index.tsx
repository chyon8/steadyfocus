import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-fe1bf059/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper function to get user ID from access token
async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.log('Auth error:', error);
      return null;
    }
    return user.id;
  } catch (error) {
    console.log('Error getting user:', error);
    return null;
  }
}

// Sign up endpoint
app.post("/make-server-fe1bf059/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split('@')[0] },
      email_confirm: true
    });
    
    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
      }
    });
  } catch (error) {
    console.log("Error during signup:", error);
    return c.json({ error: "Failed to create account", details: String(error) }, 500);
  }
});

// Get all tasks - Using KV Store
app.get("/make-server-fe1bf059/tasks", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Use KV store
    const { data: kvData, error } = await supabaseAdmin
      .from('kv_store_fe1bf059')
      .select('value')
      .eq('key', `tasks:${userId}`)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log('Error fetching tasks from KV:', error);
      return c.json({ tasks: [] });
    }
    
    const tasks = kvData?.value || [];
    return c.json({ tasks });
  } catch (error) {
    console.log("Error fetching tasks:", error);
    return c.json({ error: "Failed to fetch tasks", details: String(error) }, 500);
  }
});

// Create a new task
app.post("/make-server-fe1bf059/tasks", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const body = await c.req.json();
    const { task } = body;
    
    if (!task || !task.title) {
      return c.json({ error: "Task title is required" }, 400);
    }
    
    // Get existing tasks
    const { data: kvData } = await supabaseAdmin
      .from('kv_store_fe1bf059')
      .select('value')
      .eq('key', `tasks:${userId}`)
      .single();
    
    const existingTasks = kvData?.value || [];
    
    // Create new task with UUID
    const newTask = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    // Save updated tasks
    await supabaseAdmin
      .from('kv_store_fe1bf059')
      .upsert({
        key: `tasks:${userId}`,
        value: [...existingTasks, newTask],
      });
    
    return c.json({ task: newTask });
  } catch (error) {
    console.log("Error creating task:", error);
    return c.json({ error: "Failed to create task", details: String(error) }, 500);
  }
});

// Update a task
app.put("/make-server-fe1bf059/tasks/:id", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const taskId = c.req.param("id");
    const body = await c.req.json();
    const { updates } = body;
    
    // Get existing tasks
    const { data: kvData } = await supabaseAdmin
      .from('kv_store_fe1bf059')
      .select('value')
      .eq('key', `tasks:${userId}`)
      .single();
    
    const tasks = kvData?.value || [];
    
    // Update task
    const updatedTasks = tasks.map((task: any) => {
      if (task.id === taskId) {
        return { ...task, ...updates };
      }
      return task;
    });
    
    // Save updated tasks
    await supabaseAdmin
      .from('kv_store_fe1bf059')
      .upsert({
        key: `tasks:${userId}`,
        value: updatedTasks,
      });
    
    const updatedTask = updatedTasks.find((t: any) => t.id === taskId);
    
    if (!updatedTask) {
      return c.json({ error: "Task not found" }, 404);
    }
    
    return c.json({ task: updatedTask });
  } catch (error) {
    console.log("Error updating task:", error);
    return c.json({ error: "Failed to update task", details: String(error) }, 500);
  }
});

// Delete a task
app.delete("/make-server-fe1bf059/tasks/:id", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const taskId = c.req.param("id");
    
    // Get existing tasks
    const { data: kvData } = await supabaseAdmin
      .from('kv_store_fe1bf059')
      .select('value')
      .eq('key', `tasks:${userId}`)
      .single();
    
    const tasks = kvData?.value || [];
    
    // Filter out deleted task
    const updatedTasks = tasks.filter((task: any) => task.id !== taskId);
    
    // Save updated tasks
    await supabaseAdmin
      .from('kv_store_fe1bf059')
      .upsert({
        key: `tasks:${userId}`,
        value: updatedTasks,
      });
    
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting task:", error);
    return c.json({ error: "Failed to delete task", details: String(error) }, 500);
  }
});

// Bulk update tasks
app.put("/make-server-fe1bf059/tasks", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const body = await c.req.json();
    const { tasks } = body;
    
    if (!Array.isArray(tasks)) {
      return c.json({ error: "Tasks must be an array" }, 400);
    }
    
    // Save all tasks
    await supabaseAdmin
      .from('kv_store_fe1bf059')
      .upsert({
        key: `tasks:${userId}`,
        value: tasks,
      });
    
    return c.json({ success: true });
  } catch (error) {
    console.log("Error bulk updating tasks:", error);
    return c.json({ error: "Failed to update tasks", details: String(error) }, 500);
  }
});

// Get user settings
app.get("/make-server-fe1bf059/settings", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { data: kvData } = await supabaseAdmin
      .from('kv_store_fe1bf059')
      .select('value')
      .eq('key', `settings:${userId}`)
      .single();
    
    const settings = kvData?.value || { theme: "minimal", dailyGoal: 3 };
    
    return c.json({ settings });
  } catch (error) {
    console.log("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings", details: String(error) }, 500);
  }
});

// Update user settings
app.put("/make-server-fe1bf059/settings", async (c) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const body = await c.req.json();
    const { settings } = body;
    
    await supabaseAdmin
      .from('kv_store_fe1bf059')
      .upsert({
        key: `settings:${userId}`,
        value: settings,
      });
    
    return c.json({ settings });
  } catch (error) {
    console.log("Error updating settings:", error);
    return c.json({ error: "Failed to update settings", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
