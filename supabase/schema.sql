-- =====================================================
-- FRAMMTAK WEB CALCULATOR - DATABASE SCHEMA
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: calculations
-- Stores user's loan calculation scenarios
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Metadata
    title TEXT NOT NULL DEFAULT 'Untitled Calculation',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Calculation data (stored as JSON for flexibility)
    calculation_data JSONB NOT NULL,

    -- Quick access fields (extracted from calculation_data for easier querying)
    property_price NUMERIC,
    loan_amount NUMERIC,
    loan_type TEXT,
    interest_rate NUMERIC,

    -- Indexes for better query performance
    CONSTRAINT calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS calculations_user_id_idx ON public.calculations(user_id);
CREATE INDEX IF NOT EXISTS calculations_created_at_idx ON public.calculations(created_at DESC);
CREATE INDEX IF NOT EXISTS calculations_updated_at_idx ON public.calculations(updated_at DESC);

-- =====================================================
-- TABLE 2: shared_calculations
-- Stores publicly shared calculation links
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shared_calculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    calculation_id UUID REFERENCES public.calculations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Share settings
    share_token TEXT UNIQUE NOT NULL, -- Random token for public URL
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMPTZ, -- NULL = never expires

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    view_count INTEGER DEFAULT 0,

    CONSTRAINT shared_calculations_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES public.calculations(id) ON DELETE CASCADE,
    CONSTRAINT shared_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS shared_calculations_share_token_idx ON public.shared_calculations(share_token);
CREATE INDEX IF NOT EXISTS shared_calculations_calculation_id_idx ON public.shared_calculations(calculation_id);

-- =====================================================
-- TABLE 3: user_settings
-- Stores user preferences and default values
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- UI Preferences
    theme TEXT DEFAULT 'dark', -- 'light' or 'dark'
    language TEXT DEFAULT 'is', -- 'is' for Icelandic

    -- Default calculation values (stored as JSON)
    default_values JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CALCULATIONS POLICIES
-- =====================================================

-- Users can view their own calculations
CREATE POLICY "Users can view own calculations"
    ON public.calculations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own calculations
CREATE POLICY "Users can insert own calculations"
    ON public.calculations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own calculations
CREATE POLICY "Users can update own calculations"
    ON public.calculations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own calculations
CREATE POLICY "Users can delete own calculations"
    ON public.calculations
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- SHARED_CALCULATIONS POLICIES
-- =====================================================

-- Users can view their own shares
CREATE POLICY "Users can view own shares"
    ON public.shared_calculations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Anyone can view active shared calculations (for public links)
CREATE POLICY "Anyone can view active shared calculations"
    ON public.shared_calculations
    FOR SELECT
    USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Users can create shares for their own calculations
CREATE POLICY "Users can create shares"
    ON public.shared_calculations
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.calculations
            WHERE id = calculation_id AND user_id = auth.uid()
        )
    );

-- Users can update their own shares
CREATE POLICY "Users can update own shares"
    ON public.shared_calculations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares"
    ON public.shared_calculations
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- USER_SETTINGS POLICIES
-- =====================================================

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
    ON public.user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
    ON public.user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
    ON public.user_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calculations table
DROP TRIGGER IF EXISTS update_calculations_updated_at ON public.calculations;
CREATE TRIGGER update_calculations_updated_at
    BEFORE UPDATE ON public.calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_settings table
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to increment share view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_token_param TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.shared_calculations
    SET view_count = view_count + 1
    WHERE share_token = share_token_param AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- When a user signs up, create default settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, theme, default_values)
    VALUES (
        NEW.id,
        'dark',
        '{
            "interestRate": 8.5,
            "inflationRate": 4.0,
            "loanTermYears": 30,
            "loanType": "indexed-annuity"
        }'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after the above to verify everything was created:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
--
-- Expected output: calculations, shared_calculations, user_settings
-- =====================================================

-- ✅ SCHEMA SETUP COMPLETE!
-- Next steps:
-- 1. Verify tables were created (run verification query above)
-- 2. Check RLS policies: Dashboard → Authentication → Policies
-- 3. Integration is ready on the frontend!
