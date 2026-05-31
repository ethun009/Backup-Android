# SyncVault - Premium Android USB Backup App

SyncVault is a high-performance desktop application for Windows that intelligently connects to your Android device via USB, quickly discovers thousands of media files, and securely streams them to your computer's hard drive—avoiding the latency and instability of standard Android MTP transfers.

## Features Built
- **Direct ADB Protocol:** Pulls files significantly faster than standard Windows copy-paste.
- **Micro-Progress & ETA:** Calculate real-time streams to display exact estimates, speed, and percent. 
- **Glassmorphic Design System:** A fluid, premium React UI using high framerate gradients and shadow blurs.
- **Centralized Selection State:** Browse folders and retain file selections seamlessly.
- **Fail-Safe Integrity Check:** If a file stream fails or device disconnects, it tracks failed files safely.

## Prerequisites

To run this project, make sure you have:
1. **Node.js** v18+ installed on your PC.
2. An **Android smartphone** with a USB data cable.
3. **USB Debugging via Developer Options** must be enabled on your phone.

## How to Run Locally

To boot up the application in a development environment with hot-module reloading:

```bash
# 1. Open your terminal in this directory
cd "g:\Projects\Backup Android"

# 2. Install all dependencies (if not already done)
npm install

# 3. Start the Vite React Server and the Electron Main Process
npm run dev
```

*Note: This command uses `concurrently` to start the frontend server on port 5173, and once it is fully available, it boots the Electron shell.*

## How to Build for Production (.exe)

When you are ready to compile the application into a standalone `.exe` installer that you can share with friends or family:

1. You'll need `electron-builder`. Install it via:
   ```bash
   npm install -D electron-builder
   ```
2. In your `package.json`, add the following build configuration:
   ```json
   "build": {
     "appId": "com.syncvault.backup",
     "win": {
       "target": "nsis"
     }
   }
   ```
3. Add a builder script inside your `package.json` scripts:
   ```json
   "scripts": {
     "package": "vite build && electron-builder --win"
   }
   ```
4. Run the package command:
   ```bash
   npm run package
   ```
5. You will find your finished `Link Backup Setup 0.0.0.exe` in the generated `dist_electron` or `dist` wrapper folder!

## Acknowledgements 
Built utilizing `Vite`, `React`, `Electron`, and `@devicefarmer/adbkit`.
