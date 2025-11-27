# 🚀 Supabase Setup Guide

Follow these steps to complete your Supabase integration.

## ✅ Step 1: Run the Database Schema

1. **Open your Supabase Dashboard**: https://app.supabase.com/
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file `supabase/schema.sql` in this repo
6. **Copy the entire SQL content**
7. **Paste it** into the Supabase SQL Editor
8. Click **Run** (or press Ctrl+Enter)

You should see a success message. This creates:
- ✅ 3 tables: `calculations`, `shared_calculations`, `user_settings`
- ✅ Row Level Security policies (users can only see their own data)
- ✅ Automatic triggers for timestamps
- ✅ Function to create default settings when users sign up

### Verify Tables Were Created

Run this query in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected output:**
- calculations
- shared_calculations
- user_settings

---

## ✅ Step 2: Enable Google OAuth (Optional but Recommended)

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Click to expand it
4. Toggle **Enable Google provider** to ON

### Option A: Development Mode (Quick Start)
- Leave "Use development client ID" **ENABLED**
- Click **Save**
- **Done!** Google OAuth will work for testing

### Option B: Production Mode (For Live Site)

You'll need to create Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add these URIs:
   - **Authorized JavaScript origins**: `https://dfqhkrlteegpfrabrxzf.supabase.co`
   - **Authorized redirect URIs**: `https://dfqhkrlteegpfrabrxzf.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. Back in Supabase, paste them into the Google provider settings
9. Click **Save**

---

## ✅ Step 3: Verify RLS Policies (Security Check)

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. You should see policies for:
   - `calculations` (4 policies: SELECT, INSERT, UPDATE, DELETE)
   - `shared_calculations` (5 policies)
   - `user_settings` (3 policies)

If you see these, **your security is set up correctly!** ✅

---

## ✅ Step 4: Test the Integration

The integration is already connected! Here's what you can do:

### Test Authentication:
- Visit your app
- Click "Sign In with Google"
- Authorize the app
- You should be redirected back and logged in

### Test Saving Calculations:
- Make a calculation in your app
- Click "Save to Cloud" (when we add the UI)
- Check the **Table Editor** in Supabase Dashboard
- Go to `calculations` table
- You should see your saved calculation!

---

## 🎉 You're All Set!

Your Supabase backend is now ready to:
- ✅ Authenticate users (email/password + Google)
- ✅ Save calculations to the cloud
- ✅ Share calculations with public links
- ✅ Store user preferences
- ✅ Sync across devices

---

## 📚 What We've Integrated

### Files Created:
1. **`js/supabase-config.js`** - Configuration with your credentials
2. **`js/supabase-client.js`** - Full API client with all functions
3. **`supabase/schema.sql`** - Database schema (you ran this)

### Available Functions:
```javascript
// Authentication
await supabaseService.signIn(email, password)
await supabaseService.signInWithGoogle()
await supabaseService.signUp(email, password)
await supabaseService.signOut()

// Calculations
await supabaseService.saveCalculation(data, title, description)
await supabaseService.getCalculations()
await supabaseService.updateCalculation(id, data)
await supabaseService.deleteCalculation(id)

// Sharing
await supabaseService.createShareLink(calculationId)
await supabaseService.getSharedCalculation(token)
await supabaseService.getUserShares()

// Settings
await supabaseService.getUserSettings()
await supabaseService.updateUserSettings(settings)
```

---

## 🔒 Security Notes

- ✅ **Row Level Security** is enabled - users can only see their own data
- ✅ **Anon key** is safe to use in client-side code
- ✅ **Service role key** should NEVER be exposed (you didn't share it, good!)
- ✅ **Google OAuth** uses secure redirect flow
- ✅ **Passwords** are hashed by Supabase (never stored in plain text)

---

## 🆘 Troubleshooting

### "User not authenticated" errors
- Make sure you're signed in before calling save/load functions
- Check `supabaseService.isAuthenticated()` returns `true`

### Can't see saved calculations
- Verify RLS policies are set up (Step 3)
- Check browser console for errors
- Verify user_id matches in database

### Google OAuth not working
- Make sure provider is enabled (Step 2)
- Check redirect URIs are correct
- Clear browser cache and try again

---

## 📖 Next Steps

Now that Supabase is set up, we'll:
1. ✅ Add authentication UI (login/signup forms)
2. ✅ Add "Save to Cloud" buttons
3. ✅ Create user dashboard
4. ✅ Build sharing interface
5. ✅ Make the UI absolutely gorgeous 🎨

Ready to continue? Let me know!
