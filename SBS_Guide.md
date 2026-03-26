# 🛒 GPOS — Step-by-Step Local Development Setup Guide

> A complete beginner-friendly guide to setting up the GPOS Point of Sale system on your local machine.

---

## 📋 What You Will Need

| Tool | Purpose | Download |
|------|---------|----------|
| Node.js 18+ | Runs the project | https://nodejs.org |
| Git | Downloads code from GitHub | https://git-scm.com/downloads |
| VS Code | Code editor | https://code.visualstudio.com |
| Firebase Account | Backend (database + login) | https://console.firebase.google.com |
| Gmail Account | Required for Firebase | https://accounts.google.com/signup |

---

## Step 1: Install Node.js

Node.js is the engine that runs the project on your computer.

### How to install:
1. Open your browser and go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** to download
3. Once downloaded, double-click the file to install
4. Keep clicking **"Next"** on every screen, then click **"Install"**
5. When finished, click **"Finish"**

### Verify the installation:
1. Press **Windows key + R** on your keyboard
2. Type `cmd` and press **Enter** — a black window opens
3. Type the following and press Enter:

```
node -v
```

✅ You should see something like: `v24.0.0` — this means it worked!

---

## Step 2: Install Git

Git is the tool that downloads project code from GitHub to your computer.

### How to install:
1. Open your browser and go to: **https://git-scm.com/downloads**
2. Click **"Windows"**
3. Click the big **"Click here to download"** link at the top
4. Once downloaded, double-click the file to install
5. Keep clicking **"Next"** on every screen — don't change anything
6. Click **"Install"**, then **"Finish"**

### Verify the installation:
In your CMD window, type the following and press Enter:

```
git -v
```

✅ You should see something like: `git version 2.53.0`

---

## Step 3: Install VS Code (Code Editor)

VS Code is where you view and edit project files. Think of it like Microsoft Word, but for code.

### How to install:
1. Open your browser and go to: **https://code.visualstudio.com**
2. Click the big blue **"Download for Windows"** button
3. Once downloaded, double-click the file to install
4. Keep clicking **"Next"** — but make sure to tick these boxes if you see them:
   - ✅ Add to PATH
   - ✅ Open with Code (for files and folders)
5. Click **"Install"**, then **"Finish"**

> ⚠️ Note: VS Code should open automatically when installation is done.

---

## Step 4: Download the GPOS Project

Now we download the project code from GitHub to your computer.

### How to do it:
1. Open CMD (press Windows key, type `cmd`, press Enter)
2. Type this and press Enter to go to your Desktop:

```
cd Desktop
```

3. Type this and press Enter to download the project:

```
git clone https://github.com/Silverado313/gpos.git
```

4. Wait a few seconds until it finishes
5. Type this to enter the project folder:

```
cd gpos
```

✅ Your CMD should now show: `C:\Users\YourName\Desktop\gpos>`

---

## Step 5: Install Project Dependencies

This installs all the packages (React, Firebase, Tailwind, etc.) the project needs.

### How to do it:
1. Make sure you are inside the gpos folder in CMD
2. Type this and press Enter:

```
npm install --legacy-peer-deps
```

3. Wait 2-3 minutes — you will see text scrolling. That is normal!

✅ When done, you will see something like: `added 657 packages`

---

## Step 6: Create a Firebase Project

Firebase is the backend (database + login system) for the app. It is free.

### How to create a Firebase project:
1. Open your browser and go to: **https://console.firebase.google.com**
2. Sign in with your Google (Gmail) account
3. Click **"Create a project"**
4. Type a project name (e.g. `gposs-cx`) and click Continue
5. Turn **OFF** Google Analytics (not needed for dev)
6. Click **"Create project"** and wait a few seconds
7. Click **"Continue"** when ready

### Enable Authentication:
1. In the left menu, click **"Build"** then click **"Authentication"**
2. Click **"Get started"**
3. Click on **"Email/Password"** at the top of the list
4. Toggle the first switch **ON** (it turns blue)
5. Click **"Save"**

✅ You should see Email/Password with a green "Enabled" checkmark.

### Enable Firestore Database:
1. In the left menu, click **"Build"** then **"Firestore Database"**
2. Click **"Create database"**
3. Leave everything as default and click **"Next"**
4. Select **"Start in test mode"**
5. Click **"Create"**

---

## Step 7: Get Your Firebase Config

This is the connection code that links your app to Firebase.

### How to get it:
1. In Firebase Console, click **"Project Overview"** on the top left
2. Click **"+ Add app"**
3. Click the **"</>"** (Web) icon
4. Type `gpos` as the app nickname
5. Click **"Register app"**
6. You will see a config code block — keep this page open!

### Your Firebase Config looks like this:

```
apiKey: "AIzaSy..."
authDomain: "your-project.firebaseapp.com"
projectId: "your-project-id"
storageBucket: "your-project.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abc123"
```

---

## Step 8: Set Up the .env File

The `.env` file stores your Firebase credentials so the app can connect to Firebase.

### How to do it:
1. Open VS Code
2. Open the gpos folder: **File > Open Folder > Desktop > gpos > Select Folder**
3. In the left panel, find and click the **`.env`** file
4. Select all text inside: press **Ctrl + A**
5. Delete it: press **Delete** key
6. Paste your Firebase values in this format:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

7. Press **Ctrl + S** to save the file

> ⚠️ Never share your `.env` file — it contains secret keys. It is already in `.gitignore`.

---

## Step 9: Run the App Locally

### How to start the app:
1. Open CMD
2. Type this and press Enter:

```
cd Desktop\gpos
```

3. Type this and press Enter:

```
npm run dev
```

4. Open your browser and go to:

```
http://localhost:5173
```

✅ You should see the GPOS login page!

---

## Step 10: Create Your Owner Account (Admin)

After registering, your account will be "pending" by default. As the first user, you must manually set yourself as the **Owner** in the database.

### Register in the app:
1. Click **"Register"** on the login page.
2. Fill in your name, email, and password.
3. Click **"Request Access"** — you will see a **"Pending Approval"** screen.

### Approve yourself as Owner in Firebase:
1. Go to Firebase Console > **Firestore Database**.
2. **First Task (Master Record):**
   - Click the **"users"** collection.
   - Click your user ID.
   - Change `role: "pending"` to `role: "owner"`.
3. **Second Task (Business Profile):**
   - Click the **"business_users"** collection.
   - Drildown: `business_id` > `your_uid` > **"profile"**.
   - Change `role: "pending"` to `role: "owner"`.
   - Change `status: "pending"` to `status: "active"`.
4. Go back to the app and press **F5** to refresh.

✅ You now have full **Owner** access to your GPOS business!

---

## ⚡ Quick Reference

### Starting the App (Every Time)
Whenever you want to run the app again, just do this:

```bash
cd Desktop\gpos
npm run dev
```

Then open browser at: **http://localhost:5173**

### Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build app for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Check code for errors |

### User Roles

| Role | Permissions |
|------|------------|
| Owner | Full access to all branches, reports, and settings. |
| Manager | Full access to a specific branch (except employee deletion). |
| Cashier | POS and sales operations only (locked to one branch). |

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|---------|
| App shows blank white screen | Firebase .env values are missing or wrong. Check Step 8. |
| `npm install` fails | Use: `npm install --legacy-peer-deps` |
| Login not working | Make sure Authentication > Email/Password is Enabled in Firebase |
| Stuck on Pending screen | Change your role to `owner` in **both** `users` and `business_users` collections (Step 10) |
| Port already in use | Close other CMD windows and try again |

---

*Built with ❤️ by Syed Aneel Raza — GPOS is free forever on Firebase Free Tier*
