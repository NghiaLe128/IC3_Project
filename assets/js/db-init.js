/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// Helper to safely get env variables with fallback
const getEnv = (key, fallback) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return fallback;
};

const firebaseConfig = {
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "semiotic-particle-j7c1c"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:649030206931:web:6ac41f24aab9adbf119b26"),
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "semiotic-particle-j7c1c.firebaseapp.com"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "semiotic-particle-j7c1c.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "649030206931"),
  firestoreDatabaseId: getEnv("VITE_FIRESTORE_DATABASE_ID", "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865")
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Local cache for synchronous legacy support
const IC3_CACHE = {};

const IC3_DB = {
  KEYS: {
    USERS: "users",
    STUDENTS: "students",
    TEACHERS: "teachers",
    CLASSES: "classes",
    QUESTIONS: "questions",
    TESTS: "tests",
    SCORES: "scores",
    REWARDS: "rewards",
    NOTIFICATIONS: "notifications",
    CURRENT_USER: "ic3_current_user"
  },

  async init() {
    console.log("🚀 Initializing IC3 LMS Cloud Database...");
    
    // Initial fetch of all primary collections
    const collectionsToFetch = [
      this.KEYS.USERS, this.KEYS.STUDENTS, this.KEYS.TEACHERS, 
      this.KEYS.CLASSES, this.KEYS.QUESTIONS, this.KEYS.TESTS, 
      this.KEYS.SCORES, this.KEYS.REWARDS, this.KEYS.NOTIFICATIONS
    ];

    try {
      await Promise.all(collectionsToFetch.map(async (key) => {
        try {
          const colRef = collection(db, key);
          const snapshot = await getDocs(colRef);
          IC3_CACHE[key] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (colErr) {
          console.warn(`⚠️ Could not pre-fetch collection [${key}]:`, colErr.message);
          if (!IC3_CACHE[key]) IC3_CACHE[key] = [];
        }
      }));
      console.log("✅ Cloud Data Initialization Step Complete");
    } catch (error) {
      console.error("❌ Critical initialization error:", error);
    } finally {
      // Dispatch event so scripts know DB is ready (even if some collections failed)
      window.dispatchEvent(new CustomEvent('ic3-db-ready'));
    }
  },

  // Helper: Get data from Cache (Synchronous for legacy scripts)
  getData(key) {
    return IC3_CACHE[key] || [];
  },

  // Helper: Save data to Firestore and update cache
  async setData(key, data) {
    IC3_CACHE[key] = data;
    console.warn(`Attempting to sync whole collection [${key}] to cloud...`);
    
    const colRef = collection(db, key);
    for (const item of data) {
      const docId = item.id || item.email || `auto_${Math.random().toString(36).slice(2)}`;
      await setDoc(doc(db, key, docId), item, { merge: true });
    }
  },

  // Auth: Check login credentials via direct Firestore lookup (as requested by user)
  async login(email, password) {
    try {
      console.log(`🔐 Attempting manual database login for: ${email}`);
      const userDocRef = doc(db, this.KEYS.USERS, email);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Check password manually
        if (userData.password === password) {
          localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(userData));
          return { success: true, user: userData };
        } else {
          return { success: false, message: "Mật khẩu không chính xác!" };
        }
      } else {
        // Fallback for demo accounts if not in DB yet
        const demoAccounts = {
          'admin@gmail.com': { email: 'admin@gmail.com', name: 'System Admin', role: 'admin', password: '123456' },
          'teacher@gmail.com': { email: 'teacher@gmail.com', name: 'Demo Teacher', role: 'teacher', password: '123456' },
          'student@gmail.com': { email: 'student@gmail.com', name: 'Demo Student', role: 'student', password: '123456' }
        };

        if (demoAccounts[email] && demoAccounts[email].password === password) {
          const userData = demoAccounts[email];
          // Try to auto-create the demo user in Firestore for next time
          try {
            await setDoc(userDocRef, userData);
          } catch (e) {
            console.warn("Could not auto-seed demo user:", e.message);
          }
          localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(userData));
          return { success: true, user: userData };
        }
      }
      return { success: false, message: "Tài khoản không tồn tại hoặc sai mật khẩu!" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Lỗi hệ thống: " + error.message };
    }
  },

  // Auth: Logout user
  async logout() {
    await signOut(auth);
    localStorage.removeItem(this.KEYS.CURRENT_USER);
  },

  // Auth: Get current logged in user
  getCurrentUser() {
    const user = localStorage.getItem(this.KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  }
};

// Attach to window for legacy scripts
window.IC3_DB = IC3_DB;

// Initialize
IC3_DB.init();
