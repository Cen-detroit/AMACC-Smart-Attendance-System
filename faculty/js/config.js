// =====================================
// SUPABASE CONFIGURATION
// =====================================

const SUPABASE_URL =
    "https://sxmqqklyfeyegmlepwbx.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_hVHVwb5OeYAI_rUMAq-YIw_dfQJSpvO";

// =====================================
// CHECK SUPABASE LIBRARY
// =====================================

if (!window.supabase) {

    console.error(
        "Supabase JavaScript library was not loaded."
    );

} else {

    // Create Supabase client
    const supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

    // Make the client globally available
    window.sb =
        supabaseClient;

    console.log(
        "Supabase client initialized successfully."
    );

}
