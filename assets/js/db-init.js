/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit, orderBy, arrayUnion, arrayRemove, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import "./google-sheets.js";

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

// Expose Firebase services and methods to window for global access
window.db = db;
window.auth = auth;
window.fStore = { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit, orderBy, arrayUnion, arrayRemove, onSnapshot };
window.fAuth = { signInWithEmailAndPassword, signOut, onAuthStateChanged };

const IC3_KEYS = {
  USERS: "users",
  STUDENTS: "students",
  TEACHERS: "teachers",
  CLASSES: "classes",
  QUESTIONS: "questions",
  TESTS: "tests",
  SCORES: "scores",
  REWARDS: "rewards",
  NOTIFICATIONS: "notifications",
  BOSSES: "bosses",
  SETTINGS: "settings",
  CURRENT_USER: "ic3_current_user"
};
window.IC3_KEYS = IC3_KEYS;

// Local cache and fetch tracking
window.IC3_CACHE = {};
window.FETCH_PROMISES = {}; // Deduplication map
window.ACTIVE_LISTENERS = []; // Tracking onSnapshot for cleanup

// Helper to unsubscribe all listeners (e.g. before logout or page transition)
window.cleanupFirebaseListeners = () => {
  console.log(`🧹 Cleaning up ${window.ACTIVE_LISTENERS.length} Firebase listeners...`);
  window.ACTIVE_LISTENERS.forEach(unsub => {
    try { if (typeof unsub === 'function') unsub(); } catch (e) {}
  });
  window.ACTIVE_LISTENERS = [];
};

let isInitializing = false;

// Helper: Handle Firestore errors with detailed info
const handleFirestoreError = (error, operation, path) => {
  const errInfo = {
    error: error.message,
    operation,
    path,
    auth: {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email
    }
  };
  console.error("❌ Firestore Error:", JSON.stringify(errInfo, null, 2));
  return errInfo;
};

// Portal Detection
const getPortal = () => {
  const path = window.location.pathname;
  if (path.includes("/admin/")) return "admin";
  if (path.includes("/teacher/")) return "teacher";
  if (path.includes("/student/")) return "student";
  return "root";
};

// Seed Database with initial data if empty
// OPTIMIZED: Portal-specific fetching and deduplication
async function initData() {
  if (window.IC3_DB_INITIALIZED) return;
  if (isInitializing) return;
  isInitializing = true;

  const portal = getPortal();
  console.log(`🚀 Initializing IC3 LMS Cloud Database for [${portal}] portal...`);
  
  const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Selective fetching based on portal to save quota
  let collectionsToFetch = [IC3_KEYS.SETTINGS]; // Settings always needed
  
  if (portal === "admin") {
    collectionsToFetch = Object.values(IC3_KEYS).filter(k => k !== IC3_KEYS.CURRENT_USER);
  } else if (portal === "teacher") {
    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.SETTINGS, IC3_KEYS.REWARDS];
  } else if (portal === "student") {
    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.REWARDS, IC3_KEYS.BOSSES, IC3_KEYS.SETTINGS];
  }

  try {
    // Phase 1: Parallel fetch of primary collections
    await Promise.all(collectionsToFetch.map(async (key) => {
      // Fetch from Firestore
      if (window.FETCH_PROMISES[key]) return window.FETCH_PROMISES[key];

      window.FETCH_PROMISES[key] = (async () => {
        try {
          console.log(`☁️ Fetching [${key}] from Firestore...`);
          let colRef = collection(db, key);
          
          // Optimization: Filter classes for teacher/student
          if (key === IC3_KEYS.CLASSES) {
             if (portal === "teacher" && currentUser?.email) {
               colRef = query(colRef, where("teacherEmail", "==", currentUser.email));
             }
          }

          const snapshot = await getDocs(colRef);
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          window.IC3_CACHE[key] = data;
          return data;
        } catch (e) {
          console.warn(`Fetch failed for [${key}]:`, e.message);
          return window.IC3_CACHE[key] || [];
        }
      })();

      await window.FETCH_PROMISES[key];
    }));

    // Phase 2: Contextual Sub-fetches (Students and Scores)
    if (portal === "teacher" && currentUser?.email) {
      const myClasses = (window.IC3_CACHE[IC3_KEYS.CLASSES] || []).map(c => c.id);
      if (myClasses.length > 0) {
        console.log(`☁️ Fetching students for ${myClasses.length} classes...`);
        const studentQuery = query(collection(db, IC3_KEYS.STUDENTS), where("classId", "in", myClasses.slice(0, 10)));
        const studentSnap = await getDocs(studentQuery);
        window.IC3_CACHE[IC3_KEYS.STUDENTS] = studentSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        
        console.log(`☁️ Fetching recent scores for class...`);
        const scoreQuery = query(collection(db, IC3_KEYS.SCORES), limit(500)); 
        const scoreSnap = await getDocs(scoreQuery);
        window.IC3_CACHE[IC3_KEYS.SCORES] = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      }
    } else if (portal === "student" && currentUser?.email) {
      console.log(`☁️ Fetching individual student profile [${currentUser.email}]...`);
      const studentDoc = await getDoc(doc(db, IC3_KEYS.STUDENTS, currentUser.email));
      if (studentDoc.exists()) {
        window.IC3_CACHE[IC3_KEYS.STUDENTS] = [{ ...studentDoc.data(), id: studentDoc.id }];
      }
      
      console.log(`☁️ Fetching personal scores...`);
      const scoreQuery = query(collection(db, IC3_KEYS.SCORES), where("studentEmail", "==", currentUser.email));
      const scoreSnap = await getDocs(scoreQuery);
      window.IC3_CACHE[IC3_KEYS.SCORES] = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      console.log(`☁️ Fetching global leaderboard...`);
      const topScoreQuery = query(collection(db, IC3_KEYS.SCORES), orderBy("score", "desc"), limit(50));
      const topSnap = await getDocs(topScoreQuery);
      window.IC3_CACHE["leaderboard"] = topSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    }

    console.log("✅ Cloud Data Initialization Optimized & Complete");
  } catch (error) {
    console.error("❌ Critical initialization error:", error);
  } finally {
    isInitializing = false;
    window.IC3_DB_INITIALIZED = true;
    window.dispatchEvent(new CustomEvent('ic3-db-ready'));
    startSessionMonitor();
  }
}

// Session monitor to prevent multiple concurrent logins
async function startSessionMonitor() {
  const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
  if (!userStr) return;
  
  try {
    const localUser = JSON.parse(userStr);
    if (!localUser || !localUser.email || !localUser.currentSessionToken) return;
    
    // Throttling: Don't check more than once every 30 seconds
    const lastCheck = parseInt(sessionStorage.getItem('last_session_check') || '0');
    if (Date.now() - lastCheck < 30000) return;
    sessionStorage.setItem('last_session_check', Date.now().toString());

    const userDocRef = doc(db, IC3_KEYS.USERS, localUser.email);
    
    // Check for force logout via one-time fetch instead of listener
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const cloudUser = docSnap.data();
      
      // If forceLogout is true, or currentSessionToken has changed / is cleared
      if (cloudUser.forceLogout === true || (cloudUser.currentSessionToken && cloudUser.currentSessionToken !== localUser.currentSessionToken)) {
        console.log("🚨 Concurrent session or force logout detected! Logging out...");
        
        // Clear local storage
        localStorage.removeItem(IC3_KEYS.CURRENT_USER);
        
        // Show alert and redirect
        alert("Tài khoản của bạn đã bị đăng xuất do phát hiện đăng nhập từ thiết bị/trình duyệt khác!");
        window.location.href = "/index.html";
      }
    } else {
      // Only redirect if we are NOT in the middle of a pending setup and NOT on pokemon-select page
      const isSelectionPage = window.location.pathname.includes("pokemon-select.html");
      if (!localStorage.getItem("pendingUserData") && !isSelectionPage) {
        console.log("🚨 User doc not found in DB, logging out...");
        localStorage.removeItem(IC3_KEYS.CURRENT_USER);
        window.location.href = "/index.html";
      }
    }
    
    // Save function globally if needed
    window.checkSessionStatus = async () => startSessionMonitor();
  } catch (e) {
    console.error("Error running session monitor:", e);
  }
}

// Global Login Helper
window.loginUser = async (email, password) => {
  try {
    console.log(`🔐 Attempting manual database login for: ${email}`);
    const userDocRef = doc(db, IC3_KEYS.USERS, email);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.password === password) {
        // Generate a unique session token
        const newSessionToken = Math.random().toString(36).substring(2) + Date.now();
        
        // If there is an active session token, force-logout all sessions
        if (userData.currentSessionToken) {
          await updateDoc(userDocRef, {
            currentSessionToken: "",
            forceLogout: true
          });
          
          return {
            success: false,
            isConcurrent: true,
            message: "Phát hiện tài khoản đang được đăng nhập ở thiết bị khác! Hệ thống đã đăng xuất tài khoản trên tất cả thiết bị để bảo mật. Vui lòng đăng nhập lại!"
          };
        }
        
        // No concurrent login, proceed normally
        await updateDoc(userDocRef, {
          currentSessionToken: newSessionToken,
          forceLogout: false
        });
        
        userData.currentSessionToken = newSessionToken;
        localStorage.setItem(IC3_KEYS.CURRENT_USER, JSON.stringify(userData));
        
        // Start monitoring this session
        startSessionMonitor();
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: "Mật khẩu không chính xác!" };
      }
    }
    return { success: false, message: "Tài khoản không tồn tại!" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Lỗi hệ thống: " + error.message };
  }
};

window.logoutUser = async () => {
  try {
    // Cleanup any active listeners
    window.cleanupFirebaseListeners();
    
    const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.email) {
        const userDocRef = doc(db, IC3_KEYS.USERS, user.email);
        await updateDoc(userDocRef, {
          currentSessionToken: "",
          forceLogout: false
        });
      }
    }
  } catch (e) {
    console.error("Error clearing session on logout:", e);
  }
  
  if (window.unsubscribeSessionMonitor) {
    try {
      window.unsubscribeSessionMonitor();
    } catch (e) {}
  }
  
  localStorage.removeItem(IC3_KEYS.CURRENT_USER);
  window.location.href = "/index.html";
};

// Global Data Sync Helper
// OPTIMIZED: Supports saving single items or entire collections efficiently
window.saveData = async (key, data, specificItemId = null) => {
  // Update local cache first
  window.IC3_CACHE[key] = data;

  console.log(`📡 Syncing [${key}] to cloud...`);
  
  try {
    if (specificItemId) {
      // Save ONLY the specific item to save quota
      const item = data.find(i => (i.id === specificItemId || i.email === specificItemId));
      if (item) {
        await setDoc(doc(db, key, specificItemId), item, { merge: true });
        console.log(`✅ Synced single item [${specificItemId}] in [${key}]`);
      }
    } else {
      // Legacy support: sync whole collection (Warning: high quota usage)
      console.warn(`⚠️ Syncing ENTIRE collection [${key}] - high quota usage!`);
      const batchLimit = 20; // Limit batches to avoid timeouts
      const itemsToSync = data.slice(-batchLimit); // Only sync last 20 if it's a huge collection like scores
      
      for (const item of itemsToSync) {
        const docId = item.id || item.email || `auto_${Math.random().toString(36).slice(2)}`;
        await setDoc(doc(db, key, docId), item, { merge: true });
      }
    }

    // Google Sheets Auto-Sync Interceptor
    if (key === window.IC3_KEYS.SCORES && data && data.length > 0) {
      const lastScore = data[data.length - 1];
      if (lastScore && window.syncScoreToGoogleSheet) {
        const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
        const test = tests.find(t => t.id === lastScore.testId);
        const testTitle = test ? test.title : (lastScore.testId || "Bài thi");
        
        console.log(`📊 Intercepted score submission. Attempting automatic sync to Google Sheet...`);
        window.syncScoreToGoogleSheet(lastScore.score, testTitle, lastScore.correctCount).then(res => {
          if (res && res.success) {
            window.showToast("Đã tự động cập nhật điểm số vào file Google Sheet thành công!");
          } else {
            console.log("⚠️ Google Sheet auto-sync skipped or failed:", res?.error || res?.message);
          }
        }).catch(e => {
          console.error("❌ Exception during score auto-sync to Google Sheet:", e);
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Sync error for [${key}]:`, error);
    return { success: false, error: error.message };
  }
};

// Global Data Delete Helper
window.deleteData = async (key, docId) => {
  try {
    const docRef = doc(db, key, docId);
    await deleteDoc(docRef);
    console.log(`🗑️ Deleted document [${docId}] from collection [${key}] in cloud.`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Delete error for [${key}] / [${docId}]:`, error);
    return { success: false, error: error.message };
  }
};

// --- TOAST UTILITY ---
window.showToast = function(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-500' : (type === 'warning' ? 'bg-yellow-500' : 'bg-green-500');
  
  toast.className = `${bgClass} text-white px-4 py-3 rounded shadow-lg flex items-center justify-between min-w-[250px] max-w-sm transition-all duration-300 transform translate-y-full opacity-0 pointer-events-auto`;
  
  const textContent = document.createElement('span');
  textContent.className = 'text-sm font-medium leading-relaxed whitespace-pre-wrap';
  textContent.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ml-4 text-white hover:text-gray-200 focus:outline-none';
  closeBtn.innerHTML = '&times;';
  closeBtn.style.fontSize = '1.25rem';
  closeBtn.onclick = () => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  };

  toast.appendChild(textContent);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-full', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

// Start
initData();

