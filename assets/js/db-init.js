/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit, arrayUnion, arrayRemove, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
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
window.fStore = { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit, arrayUnion, arrayRemove, onSnapshot };
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

// Local cache for synchronous legacy support (optional, but keep for compatibility if needed)
window.IC3_CACHE = {};

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

// Seed Database with initial data if empty

async function initData() {
  console.log("🚀 Initializing IC3 LMS Cloud Database...");
  
  // Initial fetch of all primary collections
  const collectionsToFetch = [
    IC3_KEYS.USERS, IC3_KEYS.STUDENTS, IC3_KEYS.TEACHERS, 
    IC3_KEYS.CLASSES, IC3_KEYS.QUESTIONS, IC3_KEYS.TESTS, 
    IC3_KEYS.SCORES, IC3_KEYS.REWARDS, IC3_KEYS.NOTIFICATIONS,
    IC3_KEYS.BOSSES, IC3_KEYS.SETTINGS
  ];

  try {
    await Promise.all(collectionsToFetch.map(async (key) => {
      try {
        const colRef = collection(db, key);
        const snapshot = await getDocs(colRef);
        window.IC3_CACHE[key] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      } catch (colErr) {
        console.warn(`⚠️ Could not pre-fetch collection [${key}]:`, colErr.message);
        if (!window.IC3_CACHE[key]) window.IC3_CACHE[key] = [];
      }
    }));
    
    // Cloud Initialization Step Complete
    console.log("✅ Cloud Data Initialization Step Complete");
  } catch (error) {
    console.error("❌ Critical initialization error:", error);
  } finally {
    // Dispatch event so scripts know DB is ready (even if some collections failed)
    window.dispatchEvent(new CustomEvent('ic3-db-ready'));
    
    // Start session monitor after DB is initialized
    startSessionMonitor();
  }
}

// Session monitor to prevent multiple concurrent logins
function startSessionMonitor() {
  const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
  if (!userStr) return;
  
  try {
    const localUser = JSON.parse(userStr);
    if (!localUser || !localUser.email || !localUser.currentSessionToken) return;
    
    const userDocRef = doc(db, IC3_KEYS.USERS, localUser.email);
    
    // Subscribe to real-time changes
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudUser = docSnap.data();
        
        // If forceLogout is true, or currentSessionToken has changed / is cleared
        if (cloudUser.forceLogout === true || (cloudUser.currentSessionToken && cloudUser.currentSessionToken !== localUser.currentSessionToken)) {
          console.log("🚨 Concurrent session or force logout detected! Logging out...");
          unsubscribe(); // stop listening
          
          // Clear local storage
          localStorage.removeItem(IC3_KEYS.CURRENT_USER);
          
          // Show alert and redirect
          alert("Tài khoản của bạn đã bị đăng xuất do phát hiện đăng nhập từ thiết bị/trình duyệt khác!");
          window.location.href = "/index.html";
        }
      } else {
        // User doc deleted from DB
        unsubscribe();
        localStorage.removeItem(IC3_KEYS.CURRENT_USER);
        window.location.href = "/index.html";
      }
    }, (error) => {
      console.error("Session monitor error:", error);
    });
    
    // Save unsubscribe function globally if needed
    window.unsubscribeSessionMonitor = unsubscribe;
  } catch (e) {
    console.error("Error starting session monitor:", e);
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

// Global Data Sync Helper (for legacy support)
window.saveData = async (key, data) => {
  window.IC3_CACHE[key] = data;
  console.log(`📡 Syncing collection [${key}] to cloud...`);
  
  try {
    for (const item of data) {
      const docId = item.id || item.email || `auto_${Math.random().toString(36).slice(2)}`;
      await setDoc(doc(db, key, docId), item, { merge: true });
    }

    // Google Sheets Auto-Sync Interceptor
    if (key === window.IC3_KEYS.SCORES && data && data.length > 0) {
      const lastScore = data[data.length - 1];
      if (lastScore && window.syncScoreToGoogleSheet) {
        const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
        const test = tests.find(t => t.id === lastScore.testId);
        const testTitle = test ? test.title : (lastScore.testId || "Bài thi");
        
        console.log(`📊 Intercepted score submission. Attempting automatic sync to Google Sheet...`);
        window.syncScoreToGoogleSheet(lastScore.score, testTitle).then(res => {
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

