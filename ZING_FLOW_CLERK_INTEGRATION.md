# Zing-flow Electron + Clerk Integration Guide

## Overview

This document provides a step-by-step guide to integrate Clerk authentication into the Zing-flow Electron application, enabling it to share authentication sessions with Zashboard and other OgenticAI ecosystem applications.

## Challenge

Electron applications have unique authentication challenges:

1. **No traditional browser environment**: Cannot use standard OAuth redirects
2. **Custom protocol schemes**: Need `zing-flow://` protocol for callbacks
3. **Secure storage**: Must securely store session tokens
4. **Cross-platform**: Must work on macOS, Windows, and Linux

## Architecture

### Option A: Embedded Browser View (Recommended)

This approach embeds Clerk's sign-in page directly in an Electron `BrowserWindow`:

```
┌─────────────────────────────────────┐
│   Zing-flow (Electron Main Process) │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   BrowserWindow (Renderer)   │  │
│  │                              │  │
│  │  https://dashboard.ogentic   │  │
│  │         ai.com/sign-in       │  │
│  │                              │  │
│  │  [Clerk Sign-in Component]  │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│             │                       │
│             ▼                       │
│  After successful auth:             │
│  1. Capture session cookie          │
│  2. Store in secure storage         │
│  3. Close auth window               │
│  4. Load main application           │
└─────────────────────────────────────┘
```

**Pros**:
- Clean user experience (looks native)
- Direct integration with Clerk
- Automatic session management
- Works offline after initial auth

**Cons**:
- Requires embedded Chromium (already in Electron)
- Session cookie extraction can be complex

### Option B: System Browser with Loopback Server

Opens the system browser for authentication and uses a localhost callback:

```
┌────────────────┐         ┌──────────────────┐
│  Zing-flow     │         │  System Browser  │
│  (Electron)    │──Open──▶│                  │
│                │         │  Clerk Sign-in   │
│  Localhost     │         │                  │
│  Server :3333  │◀────────│  Redirects to    │
│                │ Callback│  localhost:3333  │
└────────────────┘         └──────────────────┘
```

**Pros**:
- Users see familiar browser
- Simpler OAuth flow
- No custom protocol registration needed

**Cons**:
- Less integrated feel
- Requires managing localhost server
- Browser window stays open

## Implementation Guide

### Prerequisites

```bash
cd zing-flow
npm install @clerk/clerk-js electron-store
```

### Option A Implementation: Embedded Browser View

#### 1. Main Process Setup

```javascript
// main.js
const { app, BrowserWindow, ipcMain, session } = require('electron')
const Store = require('electron-store')

const store = new Store({
  encryptionKey: 'your-encryption-key-here' // Use a secure key
})

let mainWindow
let authWindow

// Clerk configuration
const CLERK_PUBLISHABLE_KEY = 'pk_test_...' // From .env
const AUTH_URL = 'https://dashboard.ogenticai.com/sign-in'

function createAuthWindow() {
  authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    title: 'Sign in to Zing-flow',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: session.fromPartition('auth-session') // Isolated session
    }
  })

  // Load Clerk sign-in page
  authWindow.loadURL(AUTH_URL)

  // Monitor for successful authentication
  authWindow.webContents.session.cookies.on('changed', async (event, cookie, cause, removed) => {
    // Look for Clerk session cookie
    if (cookie.name.startsWith('__clerk_') && !removed) {
      console.log('Clerk session cookie detected:', cookie.name)

      // Get all Clerk cookies
      const clerkCookies = await authWindow.webContents.session.cookies.get({
        domain: '.ogenticai.com' // Your domain
      })

      // Store cookies securely
      store.set('auth.cookies', clerkCookies)

      // Get session from API to verify
      const sessionValid = await verifySession(clerkCookies)

      if (sessionValid) {
        authWindow.close()
        createMainWindow()
      }
    }
  })

  authWindow.on('closed', () => {
    authWindow = null
  })
}

async function verifySession(cookies) {
  try {
    // Format cookies for fetch request
    const cookieString = cookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')

    // Call your API to verify session
    const response = await fetch('https://dashboard.ogenticai.com/api/users/me', {
      headers: {
        'Cookie': cookieString
      }
    })

    if (response.ok) {
      const data = await response.json()
      store.set('auth.user', data.user)
      return true
    }
  } catch (error) {
    console.error('Session verification failed:', error)
  }
  return false
}

function createMainWindow() {
  // Restore stored cookies
  const storedCookies = store.get('auth.cookies', [])

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      session: session.fromPartition('main-session')
    }
  })

  // Set cookies in main session
  storedCookies.forEach(async (cookie) => {
    await mainWindow.webContents.session.cookies.set({
      url: `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    })
  })

  mainWindow.loadFile('index.html') // Your main app
}

function logout() {
  // Clear stored auth data
  store.delete('auth.cookies')
  store.delete('auth.user')

  // Clear session cookies
  if (mainWindow) {
    mainWindow.webContents.session.clearStorageData()
    mainWindow.close()
  }

  // Show auth window again
  createAuthWindow()
}

// App lifecycle
app.whenReady().then(() => {
  // Check if user is already authenticated
  const storedCookies = store.get('auth.cookies')

  if (storedCookies && storedCookies.length > 0) {
    // Verify stored session is still valid
    verifySession(storedCookies).then(valid => {
      if (valid) {
        createMainWindow()
      } else {
        createAuthWindow()
      }
    })
  } else {
    createAuthWindow()
  }
})

// IPC handlers
ipcMain.handle('auth:logout', logout)

ipcMain.handle('auth:getUser', () => {
  return store.get('auth.user')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

#### 2. Renderer Process (Main App)

```javascript
// renderer.js
const { ipcRenderer } = require('electron')

async function getUser() {
  try {
    const user = await ipcRenderer.invoke('auth:getUser')
    console.log('Current user:', user)
    return user
  } catch (error) {
    console.error('Failed to get user:', error)
  }
}

async function logout() {
  try {
    await ipcRenderer.invoke('auth:logout')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Display user info
async function displayUserInfo() {
  const user = await getUser()
  if (user) {
    document.getElementById('user-name').textContent = user.name
    document.getElementById('user-email').textContent = user.email
  }
}

// Call on page load
displayUserInfo()
```

#### 3. HTML (Main App)

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Zing-flow</title>
</head>
<body>
  <header>
    <div id="user-info">
      <span id="user-name"></span>
      <span id="user-email"></span>
      <button onclick="logout()">Sign Out</button>
    </div>
  </header>

  <main>
    <!-- Your main application content -->
  </main>

  <script src="renderer.js"></script>
</body>
</html>
```

### Option B Implementation: System Browser with Loopback

#### 1. Main Process Setup

```javascript
// main.js
const { app, BrowserWindow, shell } = require('electron')
const express = require('express')
const Store = require('electron-store')

const store = new Store({ encryptionKey: 'your-key' })

let mainWindow
let callbackServer

// Start localhost server for OAuth callback
function startCallbackServer() {
  return new Promise((resolve) => {
    const app = express()

    app.get('/callback', async (req, res) => {
      const { session_token } = req.query

      if (session_token) {
        // Store session token
        store.set('auth.session_token', session_token)

        // Verify token
        const user = await fetchUserInfo(session_token)
        if (user) {
          store.set('auth.user', user)
          res.send(`
            <h1>Authentication Successful!</h1>
            <p>You can close this window and return to Zing-flow.</p>
            <script>window.close()</script>
          `)

          // Close server and create main window
          callbackServer.close()
          createMainWindow()
        } else {
          res.send('<h1>Authentication Failed</h1>')
        }
      } else {
        res.send('<h1>Invalid callback</h1>')
      }
    })

    callbackServer = app.listen(0) // Random available port
    const port = callbackServer.address().port
    resolve(port)
  })
}

async function authenticate() {
  // Start callback server
  const port = await startCallbackServer()

  // Open system browser with Clerk OAuth URL
  // Note: You'll need to configure this URL in Clerk Dashboard
  const authUrl = `https://dashboard.ogenticai.com/auth/electron-callback?redirect_uri=http://localhost:${port}/callback`

  shell.openExternal(authUrl)
}

async function fetchUserInfo(sessionToken) {
  try {
    const response = await fetch('https://dashboard.ogenticai.com/api/users/me', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data.user
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
  }
  return null
}

// ... rest similar to Option A
```

#### 2. Create Electron Callback Route in Zashboard

```typescript
// zashboard: src/app/auth/electron-callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function ElectronCallbackPage() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const redirectUri = searchParams.get('redirect_uri')

  useEffect(() => {
    async function sendTokenToElectron() {
      try {
        // Get Clerk session token
        const token = await getToken()

        if (token && redirectUri) {
          // Redirect to Electron app with session token
          window.location.href = `${redirectUri}?session_token=${token}`
        }
      } catch (error) {
        console.error('Failed to get session token:', error)
      }
    }

    sendTokenToElectron()
  }, [getToken, redirectUri])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Zing-flow...</h1>
        <p>Please wait while we complete authentication.</p>
      </div>
    </div>
  )
}
```

## Security Best Practices

### 1. Secure Storage

Use `electron-store` with encryption:

```javascript
const Store = require('electron-store')

const store = new Store({
  encryptionKey: process.env.ENCRYPTION_KEY || 'fallback-key',
  // On production, generate unique key per installation
})
```

### 2. Session Validation

Always verify sessions before loading main window:

```javascript
async function isSessionValid() {
  const cookies = store.get('auth.cookies')
  if (!cookies) return false

  try {
    const response = await fetch('https://dashboard.ogenticai.com/api/users/me', {
      headers: { 'Cookie': formatCookies(cookies) }
    })
    return response.ok
  } catch {
    return false
  }
}
```

### 3. Content Security Policy

```javascript
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; connect-src 'self' https://dashboard.ogenticai.com"
      ]
    }
  })
})
```

## Testing Checklist

- [ ] User can sign in successfully
- [ ] Session persists across app restarts
- [ ] User info displays correctly
- [ ] Sign out clears all auth data
- [ ] Session expiration is handled gracefully
- [ ] Works offline (with valid session)
- [ ] Cross-platform (macOS, Windows, Linux)
- [ ] Session shared with browser apps (test by opening Zashboard)

## Troubleshooting

### Issue: Cookies not persisting

**Solution**: Ensure you're using persistent sessions:

```javascript
const session = session.fromPartition('persist:main')
```

### Issue: CORS errors

**Solution**: Add Electron user agent to Clerk allowed origins in Dashboard

### Issue: Session expires quickly

**Solution**: Implement automatic token refresh:

```javascript
setInterval(async () => {
  const valid = await isSessionValid()
  if (!valid) {
    // Re-authenticate
    createAuthWindow()
  }
}, 60000) // Check every minute
```

## Next Steps

1. Choose implementation option (A or B)
2. Set up development environment
3. Implement authentication flow
4. Test session sharing with Zashboard
5. Deploy to production with signed builds

## Resources

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Clerk Session Management](https://clerk.com/docs/references/javascript/clerk/session-methods)
- [electron-store Documentation](https://github.com/sindresorhus/electron-store)
