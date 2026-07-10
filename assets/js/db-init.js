/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

const firebaseConfig = {
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
  authDomain: "semiotic-particle-j7c1c.firebaseapp.com",
  storageBucket: "semiotic-particle-j7c1c.firebasestorage.app",
  messagingSenderId: "649030206931",
  firestoreDatabaseId: "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865"
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
        const colRef = collection(db, key);
        const snapshot = await getDocs(colRef);
        IC3_CACHE[key] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      }));
      console.log("✅ Cloud Data Loaded Successfully!");
      
      // Dispatch event so scripts know DB is ready
      window.dispatchEvent(new CustomEvent('ic3-db-ready'));
    } catch (error) {
      console.error("❌ Failed to load cloud data:", error);
      // Fallback to empty arrays if cloud fails
      collectionsToFetch.forEach(key => {
        if (!IC3_CACHE[key]) IC3_CACHE[key] = [];
      });
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

  // Auth: Check login credentials via Firebase Auth
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, this.KEYS.USERS, email));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, message: "Tài khoản không tồn tại trong hệ thống đám mây!" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Email hoặc mật khẩu không chính xác!" };
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
