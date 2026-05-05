import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpenvfrzibmwymaihkbc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZW52ZnJ6aWJtd3ltYWloa2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDQ3NzAsImV4cCI6MjA5Mjg4MDc3MH0.8WHmOf9daCEJ61CUwqlLhSiP4mKR3yODWcep9Wlmk6Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
