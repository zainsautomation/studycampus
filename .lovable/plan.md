
# Permanent Google Drive Connection Implementation Plan

## Overview

To achieve a truly permanent Google Drive connection (like n8n), we need to implement **server-side OAuth** that stores encrypted refresh tokens in the database. This allows the backend to silently refresh access tokens indefinitely without user interaction.

## Why Current Approach Fails

The current implementation uses **client-side OAuth** which has fundamental limitations:

```text
CURRENT FLOW (1 hour expiry):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Signs  │ --> │ Access Token │ --> │ Token Stored │
│     In       │     │  (1 hour)    │     │ localStorage │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            v (after 1 hour)
                     ┌──────────────┐
                     │   EXPIRED    │ --> User must re-login
                     └──────────────┘
```

**Problems:**
1. Google's web OAuth only provides access tokens (1 hour)
2. Refresh tokens require server-side flow with `access_type=offline`
3. Browser cannot securely store or use refresh tokens
4. Silent refresh fails due to browser privacy restrictions

## Proposed Solution: Server-Side OAuth

```text
NEW FLOW (Permanent connection):
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User Signs  │ --> │  Edge Function   │ --> │ Database stores: │
│     In       │     │ Handles OAuth    │     │ - Refresh Token  │
└──────────────┘     └──────────────────┘     │ - Encrypted      │
                            │                 │ - Per Admin      │
                            v                 └──────────────────┘
                     ┌──────────────────┐
                     │  Token Refresh   │ <-- Server can refresh
                     │ (Server-to-Server)│     indefinitely
                     └──────────────────┘
```

---

## Database Changes

### New Table: `google_drive_connections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Admin who connected (references profiles) |
| `access_token` | text | Current access token (encrypted) |
| `refresh_token` | text | Long-lived refresh token (encrypted) |
| `token_expires_at` | timestamptz | When access token expires |
| `email` | text | Google account email |
| `is_active` | boolean | Whether connection is active |
| `created_at` | timestamptz | When connected |
| `updated_at` | timestamptz | Last token refresh |

**RLS Policies:**
- Only admins can view/manage their own connections
- Service role can update tokens (for background refresh)

---

## Edge Functions Required

### 1. `google-drive-auth` - Handle OAuth Flow

**Purpose:** Receives authorization code from Google, exchanges it for tokens, stores securely.

**Flow:**
```text
1. Frontend redirects to Google OAuth with `access_type=offline`
2. User grants permission
3. Google redirects to your callback URL with `code`
4. Edge function exchanges code for access_token + refresh_token
5. Tokens stored encrypted in database
6. Frontend receives success status
```

**Implementation:**
```typescript
// Endpoint: POST /google-drive-auth
// Body: { code: string, redirect_uri: string }

// Exchange code for tokens
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET, // Stored as Supabase secret
    redirect_uri,
    grant_type: 'authorization_code',
  }),
});

// Store tokens in database
const { access_token, refresh_token, expires_in } = await tokenResponse.json();
await supabase.from('google_drive_connections').upsert({
  user_id: userId,
  access_token: encrypt(access_token),
  refresh_token: encrypt(refresh_token),
  token_expires_at: new Date(Date.now() + expires_in * 1000),
  is_active: true,
});
```

### 2. `google-drive-token` - Get Valid Access Token

**Purpose:** Returns a valid access token, refreshing if necessary.

**Flow:**
```text
1. Check if stored access token is still valid
2. If expired, use refresh_token to get new access_token
3. Update database with new access_token
4. Return access_token to frontend
```

**Implementation:**
```typescript
// Endpoint: GET /google-drive-token

// Get connection from database
const { data: connection } = await supabase
  .from('google_drive_connections')
  .select('*')
  .eq('user_id', userId)
  .single();

// Check if token needs refresh
if (connection.token_expires_at < new Date()) {
  // Refresh the token
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: decrypt(connection.refresh_token),
      grant_type: 'refresh_token',
    }),
  });
  
  const { access_token, expires_in } = await refreshResponse.json();
  
  // Update database
  await supabase.from('google_drive_connections').update({
    access_token: encrypt(access_token),
    token_expires_at: new Date(Date.now() + expires_in * 1000),
    updated_at: new Date(),
  }).eq('user_id', userId);
  
  return { access_token };
}

return { access_token: decrypt(connection.access_token) };
```

### 3. `google-drive-disconnect` - Revoke Connection

**Purpose:** Revokes tokens and removes from database when admin disconnects.

```typescript
// Endpoint: POST /google-drive-disconnect

// Revoke token with Google
await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`);

// Remove from database
await supabase
  .from('google_drive_connections')
  .delete()
  .eq('user_id', userId);
```

---

## Required Secrets

The following secrets need to be added to Supabase:

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret (currently not available in web-only flow) |
| `ENCRYPTION_KEY` | 32-byte key for encrypting tokens at rest |

**Important:** The `GOOGLE_CLIENT_SECRET` is critical. In the current web-only setup, there is no client secret because JavaScript apps use the "implicit" flow. For server-side OAuth, you need to:

1. Go to Google Cloud Console
2. Edit your OAuth 2.0 Client ID
3. Note: Web applications don't show client secrets by default
4. Create a **new credential** of type "Web application" but use it server-side
5. Copy the Client Secret (it will be shown for server-side apps)

---

## Frontend Changes

### Update `GoogleDriveContext.tsx`

**Before (Client-side OAuth):**
```typescript
// Uses browser's Google Identity Services
tokenClient.requestAccessToken({ prompt: 'consent' });
```

**After (Server-side OAuth):**
```typescript
// Redirect to Google OAuth with offline access
const signIn = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google-drive/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline', // THIS IS THE KEY DIFFERENCE
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

// When making API calls, get token from edge function
const getAccessToken = async () => {
  const { data, error } = await supabase.functions.invoke('google-drive-token');
  if (error) throw error;
  return data.access_token;
};
```

### New Callback Page: `/auth/google-drive/callback`

This page receives the authorization code from Google and sends it to the edge function:

```typescript
// src/pages/GoogleDriveCallback.tsx
const GoogleDriveCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      supabase.functions.invoke('google-drive-auth', {
        body: { 
          code, 
          redirect_uri: `${window.location.origin}/auth/google-drive/callback` 
        },
      }).then(({ data, error }) => {
        if (error) {
          toast.error('Failed to connect Google Drive');
        } else {
          toast.success('Google Drive connected permanently!');
        }
        navigate('/admin/manage-notes');
      });
    }
  }, []);
  
  return <div>Connecting Google Drive...</div>;
};
```

---

## Implementation Steps

### Phase 1: Backend Setup

1. **Add Supabase Secrets:**
   - `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
   - `ENCRYPTION_KEY` - Generate secure 32-byte key

2. **Create Database Table:**
   ```sql
   CREATE TABLE google_drive_connections (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,
     token_expires_at TIMESTAMPTZ NOT NULL,
     email TEXT,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(user_id)
   );
   
   -- RLS Policies
   ALTER TABLE google_drive_connections ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Admins can view own connection"
     ON google_drive_connections FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Admins can manage own connection"
     ON google_drive_connections FOR ALL
     USING (auth.uid() = user_id);
   ```

3. **Create Edge Functions:**
   - `supabase/functions/google-drive-auth/index.ts`
   - `supabase/functions/google-drive-token/index.ts`
   - `supabase/functions/google-drive-disconnect/index.ts`

### Phase 2: Frontend Updates

4. **Create Callback Page:**
   - `src/pages/GoogleDriveCallback.tsx`

5. **Update GoogleDriveContext.tsx:**
   - Replace client-side token client with server-side redirect flow
   - Add function to fetch token from edge function
   - Check connection status from database instead of localStorage

6. **Update App.tsx:**
   - Add route for `/auth/google-drive/callback`

7. **Update Admin UI:**
   - Show "Permanently Connected" status when connected
   - Show connected Google account email
   - Add "Disconnect" button that calls revoke edge function

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-drive-auth/index.ts` | Create | Exchange code for tokens |
| `supabase/functions/google-drive-token/index.ts` | Create | Get/refresh access token |
| `supabase/functions/google-drive-disconnect/index.ts` | Create | Revoke and remove connection |
| `supabase/config.toml` | Modify | Add function configurations |
| `src/contexts/GoogleDriveContext.tsx` | Modify | Use server-side OAuth flow |
| `src/pages/GoogleDriveCallback.tsx` | Create | Handle OAuth callback |
| `src/App.tsx` | Modify | Add callback route |
| `src/components/admin/GoogleDriveSettings.tsx` | Modify | Show permanent status, email |

---

## Security Considerations

1. **Token Encryption:** All tokens encrypted at rest using AES-256-GCM
2. **RLS Policies:** Only connection owner can access their tokens
3. **Edge Function Auth:** All functions verify JWT before processing
4. **Token Rotation:** Access tokens refreshed server-side, never exposed to client longer than needed
5. **Revocation:** Proper cleanup when disconnecting

---

## User Experience After Implementation

**Before:**
- "Google Drive disconnected" warnings every hour
- Must click "Reconnect" frequently
- Interrupts workflow

**After:**
- Connect once, stays connected forever
- Shows "Permanently Connected to: user@gmail.com"
- Only disconnects when admin clicks "Disconnect"
- Seamless file uploads without interruption

---

## Technical Summary

This plan implements the same OAuth pattern used by n8n, Zapier, and other integration platforms:

1. **Server-side OAuth** with `access_type=offline` to get refresh tokens
2. **Secure token storage** in database with encryption
3. **Automatic token refresh** via edge function when access token expires
4. **Permanent connection** until user explicitly revokes

The key difference from the current approach is moving OAuth handling to the backend where refresh tokens can be properly used.
