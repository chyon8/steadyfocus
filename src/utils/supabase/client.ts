import { createClient } from '@supabase/supabase-js';
const supabaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Sign up with email and password
export async function signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
  // First create the user via our server endpoint
  const response = await fetch(`${supabaseUrl}/functions/v1/make-server-fe1bf059/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign up');
  }

  // Then sign in to get the session
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('No session returned after signup');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata.name || name || email.split('@')[0],
    },
    accessToken: data.session.access_token,
  };
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('No session returned');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata.name || email.split('@')[0],
    },
    accessToken: data.session.access_token,
  };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

// Get current session
export async function getSession(): Promise<AuthResponse | null> {
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return null;
  }

  return {
    user: {
      id: data.session.user.id,
      email: data.session.user.email || '',
      name: data.session.user.user_metadata.name || data.session.user.email?.split('@')[0] || 'User',
    },
    accessToken: data.session.access_token,
  };
}

// Listen to auth state changes
export function onAuthStateChange(callback: (session: AuthResponse | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      callback({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
        },
        accessToken: session.access_token,
      });
    } else {
      callback(null);
    }
  });
}
