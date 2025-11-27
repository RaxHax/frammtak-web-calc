/**
 * Supabase Configuration
 *
 * This file contains the Supabase client configuration and initialization.
 * The anon key is safe to use in client-side code.
 */

const SUPABASE_CONFIG = {
    url: 'https://dfqhkrlteegpfrabrxzf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcWhrcmx0ZWVncGZyYWJyeHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjQzMjcsImV4cCI6MjA3OTg0MDMyN30.9fT_7zy7UMiwaINF1tPhXUtoPQF1s-c9FI0OMimgNMI'
};

// Initialize Supabase client (will be available after loading the Supabase library)
let supabaseClient = null;

// Initialize the client when the library is loaded
function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase client initialized');
        return supabaseClient;
    } else {
        console.error('❌ Supabase library not loaded');
        return null;
    }
}

// Export for use in other modules
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.initSupabase = initSupabase;
window.getSupabaseClient = () => supabaseClient;
