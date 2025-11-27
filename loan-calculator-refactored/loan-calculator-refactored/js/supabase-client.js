/**
 * Supabase Client Integration
 *
 * This module provides all the functions needed to interact with Supabase:
 * - Authentication (sign up, sign in, sign out, Google OAuth)
 * - Calculations CRUD (create, read, update, delete)
 * - Sharing functionality
 * - User settings
 */

class SupabaseService {
    constructor() {
        this.client = null;
        this.currentUser = null;
    }

    /**
     * Initialize the Supabase client
     */
    async init() {
        this.client = window.getSupabaseClient();
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        // Check for existing session
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            this.currentUser = session.user;
        }

        // Listen for auth changes
        this.client.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.handleAuthChange(event, session);
        });

        return this.client;
    }

    /**
     * Handle authentication state changes
     */
    handleAuthChange(event, session) {
        console.log('Auth event:', event);

        // Dispatch custom event for app to listen to
        window.dispatchEvent(new CustomEvent('authStateChange', {
            detail: { event, session, user: session?.user || null }
        }));
    }

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    /**
     * Sign up with email and password
     */
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            this.currentUser = data.user;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        try {
            const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update password
     */
    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // =====================================================
    // CALCULATIONS CRUD
    // =====================================================

    /**
     * Save a new calculation
     */
    async saveCalculation(calculationData, title = 'Untitled Calculation', description = '') {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.client
                .from('calculations')
                .insert([{
                    user_id: this.currentUser.id,
                    title,
                    description,
                    calculation_data: calculationData,
                    property_price: calculationData.propertyPrice || null,
                    loan_amount: calculationData.loanAmount || null,
                    loan_type: calculationData.loanType || null,
                    interest_rate: calculationData.interestRate || null
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Save calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing calculation
     */
    async updateCalculation(id, calculationData, title, description) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const updateData = {
                calculation_data: calculationData
            };

            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;

            // Update quick access fields
            if (calculationData.propertyPrice !== undefined) {
                updateData.property_price = calculationData.propertyPrice;
            }
            if (calculationData.loanAmount !== undefined) {
                updateData.loan_amount = calculationData.loanAmount;
            }
            if (calculationData.loanType !== undefined) {
                updateData.loan_type = calculationData.loanType;
            }
            if (calculationData.interestRate !== undefined) {
                updateData.interest_rate = calculationData.interestRate;
            }

            const { data, error } = await this.client
                .from('calculations')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all calculations for current user
     */
    async getCalculations(limit = 50, offset = 0) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error, count } = await this.client
                .from('calculations')
                .select('*', { count: 'exact' })
                .eq('user_id', this.currentUser.id)
                .order('updated_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return { success: true, data, count };
        } catch (error) {
            console.error('Get calculations error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single calculation by ID
     */
    async getCalculation(id) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.client
                .from('calculations')
                .select('*')
                .eq('id', id)
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a calculation
     */
    async deleteCalculation(id) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { error } = await this.client
                .from('calculations')
                .delete()
                .eq('id', id)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // SHARING
    // =====================================================

    /**
     * Create a share link for a calculation
     */
    async createShareLink(calculationId, expiresInDays = null) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            // Generate random share token
            const shareToken = this.generateShareToken();

            // Calculate expiration date if specified
            let expiresAt = null;
            if (expiresInDays) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            }

            const { data, error } = await this.client
                .from('shared_calculations')
                .insert([{
                    calculation_id: calculationId,
                    user_id: this.currentUser.id,
                    share_token: shareToken,
                    expires_at: expiresAt
                }])
                .select()
                .single();

            if (error) throw error;

            // Return the full share URL
            const shareUrl = `${window.location.origin}/shared.html?token=${shareToken}`;
            return { success: true, data: { ...data, shareUrl } };
        } catch (error) {
            console.error('Create share link error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get shared calculation by token (public access)
     */
    async getSharedCalculation(shareToken) {
        try {
            // Get share record
            const { data: shareData, error: shareError } = await this.client
                .from('shared_calculations')
                .select('*, calculations(*)')
                .eq('share_token', shareToken)
                .eq('is_active', true)
                .single();

            if (shareError) throw shareError;

            // Check if expired
            if (shareData.expires_at) {
                const expiresAt = new Date(shareData.expires_at);
                if (expiresAt < new Date()) {
                    return { success: false, error: 'Share link has expired' };
                }
            }

            // Increment view count
            await this.client.rpc('increment_share_view_count', {
                share_token_param: shareToken
            });

            return { success: true, data: shareData };
        } catch (error) {
            console.error('Get shared calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all shares for current user
     */
    async getUserShares() {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.client
                .from('shared_calculations')
                .select('*, calculations(title)')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get user shares error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Deactivate a share link
     */
    async deactivateShareLink(shareId) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { error } = await this.client
                .from('shared_calculations')
                .update({ is_active: false })
                .eq('id', shareId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Deactivate share link error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate random share token
     */
    generateShareToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 16; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    // =====================================================
    // USER SETTINGS
    // =====================================================

    /**
     * Get user settings
     */
    async getUserSettings() {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.client
                .from('user_settings')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                // If no settings exist, return defaults
                if (error.code === 'PGRST116') {
                    return {
                        success: true,
                        data: {
                            theme: 'dark',
                            language: 'is',
                            default_values: {}
                        }
                    };
                }
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Get user settings error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user settings
     */
    async updateUserSettings(settings) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.client
                .from('user_settings')
                .upsert({
                    user_id: this.currentUser.id,
                    ...settings
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update user settings error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.supabaseService = new SupabaseService();

// Auto-initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (window.getSupabaseClient()) {
            await window.supabaseService.init();
        }
    });
} else {
    // Document already loaded
    if (window.getSupabaseClient()) {
        window.supabaseService.init();
    }
}
