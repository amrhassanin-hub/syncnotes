# 📝 SyncNotes - Collaborative & AI-Powered Notes

> **SyncNotes** is a collaborative note-taking web app designed mobile-first for teams, study groups, and families. Each member has their own personal **"Me"** notes tab, can view teammates' read-only tabs, and Google **Gemini AI** synthesizes all shared notes into a single executive overview with decisions, action items with owners, and a "what changed" feed. Members can also ask questions about all notes with author citations (e.g. *"— Sara's note"*).

---

## 🚀 Key Features

1. **Authentication**: Email & Password sign-up and sign-in with user display names.
2. **Groups & Member Invitations**: Create workspaces and invite teammates by email.
3. **Dedicated Tab per Member**:
   - `✨ Main (AI)`: Live Gemini AI synthesis, decisions, assigned action items, what changed, and Ask-the-AI grounded chat.
   - `Me (editable)`: Your personal notes space to write, record, and upload.
   - `[Teammate Name]` (read-only): Dedicated tab for each group member to review their shared thoughts.
4. **Multi-Format Notes**:
   - ✍️ **Text notes**: Quick thoughts, meeting minutes, and checklists.
   - 🎙️ **Audio memos**: In-browser microphone recorder (`MediaRecorder`) with real-time speech transcription via the Web Speech API.
   - 📸 **Photo notes**: Direct mobile camera capture or photo gallery upload.
   - 🔒 **Private Note Toggle**: Excludes sensitive personal notes from the Main tab, teammates, and AI context!
5. **Real-Time Synchronization**: Live sync powered by Firestore `onSnapshot` listeners and real-time status indicator.
6. **Offline Drafts**: Automatic `localStorage` backup so you never lose notes on flaky cellular connections.
7. **PWA Mobile Installable**: Install directly on your phone's home screen on Android and iOS Safari.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, VitePWA
- **Backend & Database**: Firebase Free Tier (Firebase Auth, Cloud Firestore, Firebase Storage)
- **AI Processing**: Google Gemini API (`gemini-2.5-flash` / `gemini-3.8-flash`) via secure backend proxy (`server.ts` and Firebase Cloud Functions in `functions/index.js`)

---

## 🏁 Beginner Step-by-Step Setup Guide

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/your-username/syncnotes.git
cd syncnotes
npm install
```

---

### Step 2: Get a Free Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account.
3. Click **"Get API key"** in the top left.
4. Click **"Create API key"** (select a free project).
5. Copy your API key.
6. In your project root, open `.env` (or copy `.env.example` to `.env`):
   ```env
   GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
   ```

---

### Step 3: Create a Free Firebase Project

SyncNotes works out of the box in **Demo Mode** right away! To enable real multi-device cloud synchronization with your friends:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"**.
2. Name your project (e.g., `syncnotes-app`) and click Continue (Google Analytics is optional).
3. **Enable Firebase Authentication**:
   - In the left sidebar, click **Build > Authentication**.
   - Click **Get started**, choose **Email/Password**, toggle **Enable**, and click **Save**.
4. **Enable Cloud Firestore**:
   - In the left sidebar, click **Build > Firestore Database**.
   - Click **Create database**, select a location close to you, and choose **Start in production mode**.
   - Click **Create**.
5. **Enable Cloud Storage**:
   - In the left sidebar, click **Build > Storage**.
   - Click **Get started**, choose your storage location, and click **Done**.
6. **Register your Web App**:
   - In the Firebase Console, click the **Gear icon (⚙️) > Project settings**.
   - Scroll down to the **"Your apps"** section and click the Web icon (`</>`).
   - Register the app with a nickname (e.g., `SyncNotes Web`).
   - Copy the `firebaseConfig` keys into your `.env` file or paste them directly into the in-app **"Firebase Setup"** modal:
     ```env
     VITE_FIREBASE_API_KEY="AIzaSy..."
     VITE_FIREBASE_AUTH_DOMAIN="syncnotes-app.firebaseapp.com"
     VITE_FIREBASE_PROJECT_ID="syncnotes-app"
     VITE_FIREBASE_STORAGE_BUCKET="syncnotes-app.appspot.com"
     VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
     VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef123"
     ```

---

### Step 4: Run Locally

Start the local full-stack server (runs Express + Gemini AI backend on port 3000):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You can immediately:
- Sign in or click any **Instant Demo User** (Alex, Sara, Marcus).
- Test creating text notes, speaking into the mic for real-time transcription, or capturing a photo.
- Click **"✨ Main (AI)"** and press **"Regenerate"** to see Gemini synthesize the notes!

---

### Step 5: Deploy the AI Cloud Function to Firebase

To deploy the Gemini proxy Cloud Function to Firebase:

1. Install the Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Link your project:
   ```bash
   firebase use --add
   ```
   (Select your Firebase project created in Step 3).
4. Set your Gemini API key in Firebase Functions:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
   *(Or set via `firebase functions:config:set gemini.key="YOUR_KEY"`)*
5. Deploy the Cloud Function:
   ```bash
   firebase deploy --only functions
   ```

---

### Step 6: Deploy Security Rules and Hosting

1. Deploy Firestore and Storage security rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
2. Build the production React frontend:
   ```bash
   npm run build
   ```
3. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
4. Firebase will output your live URL (e.g., `https://syncnotes-app.web.app`). Share this link with your friends and teammates!

---

## 🎙️ Note on Audio Transcription (Speech-to-Text)

- **Default (Free)**: SyncNotes uses the browser's built-in **Web Speech API** (`window.SpeechRecognition` / `webkitSpeechRecognition`). It operates locally in supported browsers (Chrome, Edge, Safari) at zero cost.
- **Upgrading to Paid STT**: Check out the commented instructions in `src/hooks/useAudioRecorder.ts` to switch to:
  - **Google Cloud Speech-to-Text** (`@google-cloud/speech`) for high-fidelity multi-language batch audio processing.
  - **Gemini Audio Transcription** (`gemini-3.5-transcribe`) using the `@google/genai` SDK.

---

## 🔒 Security & Privacy

- **Private Notes**: Any note marked **🔒 Private** is strictly filtered out before sending data to Gemini AI or other group members. The Firestore security rules (`firestore.rules`) enforce that only the author can query or view private notes.
- **Server-Side API Key Protection**: The Gemini API key is stored strictly on the server (`server.ts` or Firebase Cloud Function `functions/index.js`) and is never leaked to the client browser.
