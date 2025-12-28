// @ts-ignore
import { Hono, Context } from "npm:hono";
// @ts-ignore
import { cors } from "npm:hono/cors";
// @ts-ignore
import { logger } from "npm:hono/logger";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

// Root app handles global middleware
const app = new Hono();

// 1. Global Middleware (Logger & CORS) runs for ALL paths
app.use('*', logger((message: string) => console.log(`[Request]: ${message}`)));

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-client-info", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// 2. Explicit Options Handler (Preflight safety)
app.options('*', (c: Context) => {
  return c.text('', 204);
});

// 3. Lazy initialization of Supabase Client to prevent startup crashes
function getAdminClient() {
  // @ts-ignore: Deno env access
  const url = Deno.env.get('SUPABASE_URL');
  // @ts-ignore: Deno env access
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!url || !key) {
    console.error("Missing SUPABASE env vars in getAdminClient");
    throw new Error("Server misconfigured: Missing Supabase credentials");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// 4. Core Logic Application (Route Definitions)
const logic = new Hono();

// Health check
logic.get("/health", (c: Context) => {
  return c.json({ status: "ok", path: c.req.path });
});

// Helper: Get User ID
async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const supabase = getAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log('Auth check error:', error?.message);
      return null;
    }
    return user.id;
  } catch (error) {
    console.log('Error verifying user:', error);
    return null;
  }
}

// Auth: Signup
logic.post("/auth/signup", async (c: Context) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) return c.json({ error: "Missing fields" }, 400);

    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split('@')[0] },
      email_confirm: true
    });

    if (error) throw error;

    return c.json({ 
      user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata.name }
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return c.json({ error: error.message || "Signup failed" }, 400);
  }
});

// Tasks: Get All
logic.get("/tasks", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform DB columns to Frontend fields if needed
    const tasks = (data || []).map((t: any) => ({
      ...t,
      // Map DB columns back to what frontend expects if names differ
      // Frontend expects: title, description, dueDate, completed
      // DB seems to have: title, notes, scheduled_date, completed
      description: t.notes || t.description, 
      dueDate: t.scheduled_date || t.due_date,
      createdAt: t.created_at
    }));

    return c.json({ tasks });
  } catch (error: any) {
    console.error("Get Tasks Error:", error);
    return c.json({ tasks: [] });
  }
});

// Tasks: Create
logic.post("/tasks", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const { task } = await c.req.json();
    if (!task?.title) return c.json({ error: "Title required" }, 400);

    const supabase = getAdminClient();
    
    // Map Frontend fields to DB columns
    // Frontend sends: title, description, dueDate, completed
    // DB has: title, notes, scheduled_date, completed
    const newTask = {
      user_id: userId,
      title: task.title,
      notes: task.description || null,          // Fix: description -> notes
      scheduled_date: task.dueDate || null,     // Fix: dueDate -> scheduled_date (inferred)
      completed: task.completed || false,
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) throw error;
    
    // Transform back for response
    const createdTask = {
      ...data,
      description: data.notes,
      dueDate: data.scheduled_date
    };

    return c.json({ task: createdTask });
  } catch (error: any) {
    console.error("Create Task Error:", error);
    return c.json({ error: "Failed to create task: " + error.message }, 500);
  }
});

// Tasks: Update
logic.put("/tasks/:id", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const taskId = c.req.param("id");
    const { updates } = await c.req.json();
    const supabase = getAdminClient();

    // Map frontend field names to database column names
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.notes = updates.description; // Fix
    if (updates.dueDate !== undefined) dbUpdates.scheduled_date = updates.dueDate; // Fix
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) return c.json({ error: "Not found" }, 404);
    
    // Transform back
    const updatedTask = {
      ...data,
      description: data.notes,
      dueDate: data.scheduled_date
    };
    
    return c.json({ task: updatedTask });
  } catch (error) {
    console.error("Update Task Error:", error);
    return c.json({ error: "Failed to update" }, 500);
  }
});

// Tasks: Delete
logic.delete("/tasks/:id", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const taskId = c.req.param("id");
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete Task Error:", error);
    return c.json({ error: "Failed to delete" }, 500);
  }
});

// Tasks: Bulk Update - Upsert all tasks for sync
logic.put("/tasks", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks)) return c.json({ error: "Invalid data" }, 400);

    const supabase = getAdminClient();
    
    // Delete all existing tasks for this user
    await supabase.from('tasks').delete().eq('user_id', userId);
    
    // Insert all tasks from the client
    if (tasks.length > 0) {
      const dbTasks = tasks.map((t: any) => ({
        id: t.id,
        user_id: userId,
        title: t.title,
        notes: t.description || null,           // Fix
        scheduled_date: t.dueDate || null,      // Fix
        completed: t.completed || false,
        created_at: t.createdAt || new Date().toISOString(),
      }));
      
      const { error } = await supabase.from('tasks').insert(dbTasks);
      if (error) throw error;
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Bulk Update Error:", error);
    return c.json({ error: "Failed to bulk update" }, 500);
  }
});

// Settings: Get
logic.get("/settings", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    const settings = data ? {
      theme: data.theme,
      dailyGoal: data.daily_goal
    } : { theme: "minimal", dailyGoal: 3 };
    
    return c.json({ settings });
  } catch (error) {
    console.error("Get Settings Error:", error);
    return c.json({ settings: { theme: "minimal", dailyGoal: 3 } });
  }
});

// Settings: Update
logic.put("/settings", async (c: Context) => {
  try {
    const userId = await getUserId(c.req.header('Authorization'));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const { settings } = await c.req.json();
    const supabase = getAdminClient();
    
    const dbSettings = {
      user_id: userId,
      theme: settings.theme,
      daily_goal: settings.dailyGoal,
    };
    
    const { data, error } = await supabase
      .from('settings')
      .upsert(dbSettings, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ 
      settings: {
        theme: data.theme,
        dailyGoal: data.daily_goal
      }
    });
  } catch (error) {
    console.error("Update Settings Error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});


// 5. Route Mounting - The Safety Net
// Mount the logic at ALL probable paths to catch the request regardless of how Supabase routes it.

// Correct path for standard requests
app.route('/functions/v1/server', logic);

// Legacy/Short path
app.route('/server', logic);

// Fallback: If Supabase strips the prefix, this catches it at root.
app.route('/', logic);

// 6. Global Error Handler
app.onError((err: Error, c: Context) => {
  console.error("Global App Error:", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

// @ts-ignore: Deno env access
Deno.serve(app.fetch);
