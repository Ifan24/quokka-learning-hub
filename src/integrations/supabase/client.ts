// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bclvquqynectsarfouvp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjbHZxdXF5bmVjdHNhcmZvdXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDY4MzgsImV4cCI6MjA1NTc4MjgzOH0.4QaBN2__cUbSCYteCQFJ4rgkIouhXck2Rp28Bz8lsZA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);