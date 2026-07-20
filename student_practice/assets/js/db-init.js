/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

// Firebase Compat SDK Wrapper equivalents for Modular API
const initializeApp = (config) => firebase.initializeApp(config);
const getFirestore = (app) => firebase.firestore(app);
const initializeFirestore = (app) => firebase.firestore(app);
const enableIndexedDbPersistence = (db) => db.enablePersistence();

function collection(db, path) {
  return db.collection(path);
}

function doc(db, colPath, docId) {
  if (docId) {
    return db.collection(colPath).doc(docId);
  }
  return db.doc(colPath);
}

function wrapDocSnapshot(snap) {
  if (!snap) return snap;
  if (typeof snap.exists !== 'function') {
    const existsVal = !!snap.exists;
    snap.exists = function() { return existsVal; };
  }
  return snap;
}

function wrapQuerySnapshot(querySnap) {
  if (!querySnap) return querySnap;
  const originalDocs = querySnap.docs || [];
  querySnap.docs = originalDocs.map(wrapDocSnapshot);
  
  const originalForEach = querySnap.forEach;
  if (originalForEach) {
    querySnap.forEach = function(callback, thisArg) {
      return originalForEach.call(this, (snap, index) => {
        callback.call(thisArg, wrapDocSnapshot(snap), index);
      });
    };
  }
  return querySnap;
}

function getDocs(queryOrCol) {
  return queryOrCol.get().then(wrapQuerySnapshot);
}

function getDoc(docRef) {
  return docRef.get().then(wrapDocSnapshot);
}

function setDoc(docRef, data, options) {
  return docRef.set(data, options);
}

function updateDoc(docRef, data) {
  return docRef.update(data);
}

function deleteDoc(docRef) {
  return docRef.delete();
}

function where(field, op, value) {
  return (q) => q.where(field, op, value);
}

function orderBy(field, direction) {
  return (q) => q.orderBy(field, direction);
}

function limit(number) {
  return (q) => q.limit(number);
}

function query(queryOrCol, ...constraints) {
  let q = queryOrCol;
  for (const constraint of constraints) {
    if (typeof constraint === 'function') {
      q = constraint(q);
    }
  }
  return q;
}

const arrayUnion = firebase.firestore.FieldValue.arrayUnion;
const arrayRemove = firebase.firestore.FieldValue.arrayRemove;
const writeBatch = (db) => db.batch();

function onSnapshot(ref, onNext, onError) {
  return ref.onSnapshot((snap) => {
    if (snap.docs) {
      onNext(wrapQuerySnapshot(snap));
    } else {
      onNext(wrapDocSnapshot(snap));
    }
  }, onError);
}

const getAuth = (app) => firebase.auth(app);
const signInWithEmailAndPassword = (auth, email, password) => auth.signInWithEmailAndPassword(email, password);
const signOut = (auth) => auth.signOut();
const onAuthStateChanged = (auth, callback) => auth.onAuthStateChanged(callback);
const GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
const signInWithPopup = (auth, provider) => auth.signInWithPopup(provider);

const browserSessionPersistence = 'session';
function setPersistence(auth, persistence) {
  const compatPersistence = persistence === 'session' 
    ? firebase.auth.Auth.Persistence.SESSION 
    : firebase.auth.Auth.Persistence.LOCAL;
  return auth.setPersistence(compatPersistence);
}

// --- SESSION PERSISTENCE PROXY (STORE IN SESSION STORAGE TO LOG OUT ON TAB/BROWSER CLOSE) ---
(function() {
  const SESSION_KEYS = [
    "ic3_current_user",
    "pendingStudentData",
    "pendingUserData"
  ];

  // Cache original Storage methods to prevent recursion and allow direct manipulation
  const originalGetItem = localStorage.getItem;
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  // Clear any physical localStorage values for session-related keys once on load to prevent leaks
  SESSION_KEYS.forEach(key => {
    try {
      originalRemoveItem.call(localStorage, key);
    } catch (e) {}
  });

  try {
    localStorage.getItem = function(key) {
      if (SESSION_KEYS.includes(key)) {
        return sessionStorage.getItem(key);
      }
      return originalGetItem.apply(this, arguments);
    };

    localStorage.setItem = function(key, value) {
      if (SESSION_KEYS.includes(key)) {
        sessionStorage.setItem(key, value);
        return;
      }
      originalSetItem.apply(this, arguments);
    };

    localStorage.removeItem = function(key) {
      if (SESSION_KEYS.includes(key)) {
        sessionStorage.removeItem(key);
        return;
      }
      originalRemoveItem.apply(this, arguments);
    };

    localStorage.clear = function() {
      SESSION_KEYS.forEach(key => {
        sessionStorage.removeItem(key);
      });
      originalClear.apply(this, arguments);
    };
  } catch (e) {
    console.error("❌ Failed to override localStorage for session keys:", e);
  }
})();


// Helper to safely get env variables with fallback
const getEnv = (key, fallback) => {
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

console.log("🔥 Initializing Firebase with config:", firebaseConfig);

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with specific database ID if provided
  const dbId = firebaseConfig.firestoreDatabaseId;
  if (dbId && dbId !== "" && dbId !== "(default)") {
    console.log("📂 Attempting to use named Firestore database:", dbId);
    try {
      db = firebase.app().firestore(dbId);
    } catch (e) {
      console.warn("⚠️ Named database initialization failed, falling back to default:", e);
      db = firebase.firestore();
    }
  } else {
    console.log("📂 Using default Firestore database");
    db = firebase.firestore();
  }
  
  auth = getAuth(app);
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      console.log("🔐 Firebase Auth session persistence set to SESSION (tab closed = logged out)");
    })
    .catch((error) => {
      console.error("❌ Failed to set Firebase Auth session persistence:", error);
    });
} catch (error) {
  console.error("❌ Firebase/Firestore Initialization Failed:", error);
}

console.log("📂 Firestore instance state:", db ? "INITIALIZED" : "FAILED");

// Enable Offline Persistence
if (db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented-browser') {
      console.warn("Firestore Persistence failed: Browser not supported.");
    } else {
      console.warn("Firestore Persistence error:", err.message);
    }
  });
}

// Expose Firebase services and methods to window for global access
window.db = db;
window.auth = auth;
window.fStore = { 
  getFirestore, initializeFirestore, enableIndexedDbPersistence, 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  getDoc, query, where, limit, orderBy, arrayUnion, arrayRemove, 
  onSnapshot 
};
window.fAuth = {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup
};

// Also expose individually for scripts that expect them in global scope
window.collection = collection;
window.doc = doc;
window.getDocs = getDocs;
window.setDoc = setDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.getDoc = getDoc;
window.query = query;
window.where = where;
window.limit = limit;
window.orderBy = orderBy;
window.arrayUnion = arrayUnion;
window.arrayRemove = arrayRemove;
window.onSnapshot = onSnapshot;

window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInWithPopup = signInWithPopup;

window.pokemonAvatars = {
    pichu: "🍼",
    pikachu: "⚡",
    raichu: "⚡⚡",
    "raichu-alola": "🌊⚡",
    "pikachu-gmax": "🌩️",
    charmander: "🔥",
    charmeleon: "💥",
    charizard: "🐉🔥",
    "charizard-megax": "💙🐉",
    "charizard-megay": "🧡🐉",
    bulbasaur: "🌱",
    ivysaur: "🌿",
    venusaur: "🌸",
    "venusaur-gmax": "🌺",
    "venusaur-mega": "💮",
    squirtle: "💧",
    wartortle: "🌀",
    blastoise: "🐢",
    "blastoise-gmax": "🌊",
    "blastoise-mega": "🔱",
    eevee: "🦊",
    vaporeon: "🧜‍♀️",
    jolteon: "⚡🦊",
    flareon: "🔥🦊",
    espeon: "🔮",
    umbreon: "🌙",
    sylveon: "🎀",
    munchlax: "🧸",
    snorlax: "💤",
    "snorlax-gmax": "🏢💤",
    gastly: "👻",
    haunter: "👿",
    gengar: "😈",
    "gengar-mega": "👾😈",
    "gengar-gmax": "💀😈",
    riolu: "🐾",
    lucario: "🐺",
    "lucario-mega": "🌟🐺",
    dratini: "🐍",
    dragonair: "🐉",
    dragonite: "🐲",
    mewtwo: "👽",
    "mewtwo-megax": "👊👽",
    "mewtwo-megay": "🧠👽",
    rayquaza: "🐍🐉",
    "rayquaza-mega": "🔱🐉",
    arceus: "👑"
};

window.pokemonNames = {
    pichu: "Pichu Sơ Sinh",
    pikachu: "Pikachu Điện Sấm",
    raichu: "Raichu Lôi Đế",
    "raichu-alola": "Raichu Alola Thần Tốc",
    "pikachu-gmax": "Pikachu Gigantamax Sấm Sét",
    charmander: "Charmander Đuôi Đỏ",
    charmeleon: "Charmeleon Cuồng Nộ",
    charizard: "Charizard Rồng Lửa",
    "charizard-megax": "Mega Charizard Hỏa Ngục X",
    "charizard-megay": "Mega Charizard Hỏa Ngục Y",
    bulbasaur: "Bulbasaur Bão Lá",
    ivysaur: "Ivysaur Gai Hoa",
    venusaur: "Venusaur Đại Thụ",
    "venusaur-gmax": "Venusaur Gigantamax Địa Chấn",
    "venusaur-mega": "Mega Venusaur Cự Long",
    squirtle: "Squirtle Pháo Nước",
    wartortle: "Wartortle Rùa Sóng Thần",
    blastoise: "Blastoise Đại Pháo",
    "blastoise-gmax": "Blastoise Gigantamax Khổng Lồ",
    "blastoise-mega": "Mega Blastoise Chiến Thần",
    eevee: "Eevee Thường Giả",
    vaporeon: "Vaporeon Mỹ Nhân Ngư",
    jolteon: "Jolteon Thú Chớp Điện",
    flareon: "Flareon Sư Tử Lửa",
    espeon: "Espeon Linh Thú Tâm Linh",
    umbreon: "Umbreon Hắc Nguyệt Thần",
    sylveon: "Sylveon Công Chúa Ruy Băng",
    munchlax: "Munchlax Bé Con",
    snorlax: "Snorlax Ham Ăn",
    "snorlax-gmax": "Snorlax Gigantamax Đảo Ngủ",
    gastly: "Gastly Đốm Sương",
    haunter: "Haunter Quỷ Ám",
    gengar: "Gengar Ma Vương",
    "gengar-mega": "Mega Gengar Ám Ảnh",
    "gengar-gmax": "Gengar Gigantamax Hắc Ám",
    riolu: "Riolu Tiểu Quyền",
    lucario: "Lucario Dũng Sĩ Hào Quang",
    "lucario-mega": "Mega Lucario Đại Sư",
    dratini: "Dratini Rồng Bột",
    dragonair: "Dragonair Lam Long",
    dragonite: "Dragonite Thần Long",
    mewtwo: "Mewtwo Nhân Tạo",
    "mewtwo-megax": "Mega Mewtwo Bá Vương X",
    "mewtwo-megay": "Mega Mewtwo Thần Lực Y",
    rayquaza: "Rayquaza Không Vương",
    "rayquaza-mega": "Mega Rayquaza Sáng Thế",
    arceus: "Arceus Đấng Sáng Thế"
};

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
  POKEMONS: "pokemons",
  SETTINGS: "settings",
  SYSTEM: "system",
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

// --- Dynamic Loading Overlay injection ---
const initLoader = () => {
  if (document.getElementById('ic3-global-loader')) return;

  const loaderStyle = document.createElement('style');
  loaderStyle.innerHTML = `
    @keyframes ic3-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes ic3-pulse {
      0%, 100% { opacity: 0.6; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1.05); }
    }
    @keyframes ic3-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    .ic3-animate-spin {
      animation: ic3-spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .ic3-animate-pulse {
      animation: ic3-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .ic3-animate-shimmer {
      animation: ic3-shimmer 1.5s ease-in-out infinite;
    }

    /* Global dynamic screen entry & tab transitions */
    @keyframes ic3-slide-up-fade {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .student-view-content:not(.hidden),
    .tab-content:not(.hidden) {
      animation: ic3-slide-up-fade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }
  `;
  document.head.appendChild(loaderStyle);

  const loaderOverlay = document.createElement('div');
  loaderOverlay.id = 'ic3-global-loader';
  loaderOverlay.className = 'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090d16] transition-all duration-500 opacity-100 pointer-events-auto';
  loaderOverlay.innerHTML = `
    <div class="relative flex flex-col items-center px-8 py-10 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl">
      <!-- Rotating Ring -->
      <div class="w-24 h-24 rounded-full border-[3px] border-indigo-500/10 border-t-indigo-400 ic3-animate-spin shadow-[0_0_20px_rgba(129,140,248,0.15)]"></div>
      
      <!-- Central Icon with Pulsing glow -->
      <div class="absolute top-16 w-12 h-12 flex items-center justify-center text-4xl ic3-animate-pulse drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]">
        ⚡
      </div>
      
      <!-- Title -->
      <h3 class="mt-8 text-sm font-black text-white tracking-[0.2em] uppercase ic3-animate-pulse text-center">
        Đang tải dữ liệu
      </h3>
      
      <!-- Subtitle -->
      <p class="mt-2 text-[11px] text-indigo-300 font-semibold tracking-wider uppercase opacity-80 text-center">
        Hệ thống học tập đang đồng bộ...
      </p>
      
      <!-- Dynamic Progress Bar -->
      <div class="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-5 border border-white/5 relative">
        <div class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full absolute top-0 left-0 w-32 ic3-animate-shimmer" style="transform-origin: left;"></div>
      </div>
      
      <!-- Slogan/Context info -->
      <div class="mt-6 flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <i class="fa-solid fa-bolt text-yellow-500"></i>
        <span>IC3 Sparks LMS</span>
      </div>
    </div>
  `;

  if (document.body) {
    document.body.appendChild(loaderOverlay);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(loaderOverlay);
    });
  }

  // Fail-safe timeout (e.g. 8 seconds) in case of connection failure or offline issues
  setTimeout(hideGlobalLoader, 8000);
};

const hideGlobalLoader = () => {
  const loader = document.getElementById('ic3-global-loader') || document.getElementById('edu-app-loader');
  if (loader) {
    loader.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.remove();
      }
    }, 550); // matches transition-all duration-500
  }
};

// Initialize loader as soon as script executes
initLoader();

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
  if (path.includes("/admin")) return "admin";
  if (path.includes("/teacher")) return "teacher";
  return "student"; // Default to student for student_practice standalone
};

// --- Session Monitoring & Global Logout ---

// Global variable to store session listeners for cleanup
window.SESSION_UNSUBSCRIBERS = [];
window.LOGOUT_IN_PROGRESS = false;

// Forced logout sequence
function performLogout(message) {
  console.log("🚶 Forced logout sequence initiated: " + message);
  
  // 1. Prevent double execution
  if (window.LOGOUT_IN_PROGRESS) return;
  window.LOGOUT_IN_PROGRESS = true;

  // 2. Clear local storage immediately to stop app logic
  localStorage.removeItem(IC3_KEYS.CURRENT_USER);
  
  // 3. Sign out from Firebase Auth to revoke Firestore permissions
  if (auth) {
    signOut(auth).catch(err => console.error("SignOut error during forced logout:", err));
  }
  
  // 4. Cleanup all listeners
  if (typeof window.cleanupFirebaseListeners === 'function') {
    window.cleanupFirebaseListeners();
  }
  
  // Cleanup session listeners specifically
  if (window.SESSION_UNSUBSCRIBERS) {
    window.SESSION_UNSUBSCRIBERS.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) {}
    });
    window.SESSION_UNSUBSCRIBERS = [];
  }
  
  // 5. Show SweetAlert2 and redirect
  if (window.Swal) {
    window.Swal.fire({
      title: 'THÔNG BÁO ĐĂNG XUẤT',
      text: message,
      icon: 'warning',
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: 'Đồng ý',
      confirmButtonColor: '#3b82f6',
      background: '#0f172a',
      color: '#fff',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      window.location.replace("./index.html");
    });

    // Forced fallback redirect
    setTimeout(() => {
      window.location.replace("./index.html");
    }, 3000);
  } else {
    window.location.replace("./index.html");
  }
}

// Session monitor to prevent multiple concurrent logins and support force logout
async function startSessionMonitor() {
  if (!db) {
    console.warn("⚠️ Cannot start session monitor: DB not initialized.");
    return;
  }

  const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
  if (!userStr) return;
  
  try {
    const localUser = JSON.parse(userStr);
    if (!localUser || !localUser.email) return;
    
    // EXCLUDE ADMINS from all force/concurrent checks to prevent admin lockout
    if (localUser.role === 'admin') {
      console.log("🛡️ Admin detected, session monitoring skipped.");
      return;
    }

    console.log("🔍 Starting real-time session monitor for:", localUser.email);
    
    const userDocRef = doc(db, IC3_KEYS.USERS, localUser.email);
    const configDocRef = doc(db, IC3_KEYS.SYSTEM, "config");

    // Clear previous session listeners if any
    if (window.SESSION_UNSUBSCRIBERS) {
      window.SESSION_UNSUBSCRIBERS.forEach(unsub => {
        try { if (typeof unsub === 'function') unsub(); } catch (e) {}
      });
      window.SESSION_UNSUBSCRIBERS = [];
    } else {
      window.SESSION_UNSUBSCRIBERS = [];
    }

    // 1. Listen to global force logout signal
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.metadata && docSnap.metadata.fromCache) {
        return; // Ignore local cache snapshots to prevent timing bugs on page transition
      }
      if (docSnap.exists()) {
        const config = docSnap.data();
        const loginTime = localUser.loginTimestamp || 0;
        
        if (config.globalForceLogoutTimestamp && config.globalForceLogoutTimestamp > loginTime) {
          console.log("🚨 Global force logout signal received!");
          performLogout("Tài khoản của bạn đã bị quản trị viên yêu cầu đăng xuất trên toàn hệ thống!");
        }
      }
    }, (error) => {
      console.error("Session Monitor (Global) Error:", error);
    });
    window.SESSION_UNSUBSCRIBERS.push(unsubscribeConfig);

    // 2. Listen to individual user doc for force logout or concurrent login
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.metadata && docSnap.metadata.fromCache) {
        console.log("ℹ️ Ignoring session monitor cache snapshot for:", localUser.email);
        return; // Ignore local cache snapshots to prevent timing bugs on page transition
      }

      if (docSnap.exists()) {
        const cloudUser = docSnap.data();
        
        const isForceLogout = cloudUser.forceLogout === true;
        const isConcurrentSession = cloudUser.currentSessionToken && 
                                   localUser.currentSessionToken && 
                                   cloudUser.currentSessionToken !== localUser.currentSessionToken;

        if (isForceLogout || isConcurrentSession) {
          console.log("🚨 Force logout or concurrent session detected!");
          performLogout(isForceLogout ? 
            'Tài khoản của bạn đã bị quản trị viên yêu cầu đăng xuất trên thiết bị này!' : 
            'Tài khoản của bạn đã bị đăng xuất do phát hiện đăng nhập từ thiết bị/trình duyệt khác!');
        }
      } else {
        // User doc might have been deleted (only if confirmed from server)
        performLogout("Tài khoản không tồn tại hoặc đã bị xóa!");
      }
    }, (error) => {
      console.error("Session Monitor (User) Error:", error);
    });
    window.SESSION_UNSUBSCRIBERS.push(unsubscribeUser);

  } catch (e) {
    console.error("Error starting session monitor:", e);
  }
}

// Seed Database with initial data if empty
// OPTIMIZED: Portal-specific fetching and deduplication
async function initData() {
  if (window.IC3_DB_INITIALIZED) return;
  if (isInitializing) return;
  isInitializing = true;

  const portal = getPortal();
  console.log(`🚀 Initializing IC3 LMS Cloud Database for [${portal}] portal...`);
  
  // START MONITORING when DB is ready
  if (db) {
    startSessionMonitor();
  }
  
  let currentUser = null;
  try {
    const userStr = localStorage.getItem(IC3_KEYS.CURRENT_USER);
    currentUser = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Failed to parse currentUser from localStorage", e);
  }

  // Selective fetching based on portal to save quota
  let collectionsToFetch = [IC3_KEYS.SETTINGS]; // Settings always needed
  
  // Check if offline
  if (!navigator.onLine) {
    console.warn("🌐 Application is offline. Attempting to load from local cache...");
    if (window.showToast) window.showToast("Đang hoạt động ở chế độ ngoại tuyến. Dữ liệu có thể chưa được cập nhật mới nhất.", "warning");
  }
  
  if (portal === "admin") {
    collectionsToFetch = Object.values(IC3_KEYS).filter(k => k !== IC3_KEYS.CURRENT_USER);
  } else if (portal === "teacher") {
    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.SETTINGS, IC3_KEYS.REWARDS, IC3_KEYS.TEACHERS];
  } else if (portal === "student") {
    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.REWARDS, IC3_KEYS.BOSSES, IC3_KEYS.POKEMONS, IC3_KEYS.SETTINGS];
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
        const scoreQuery = query(collection(db, IC3_KEYS.SCORES)); 
        const scoreSnap = await getDocs(scoreQuery);
        window.IC3_CACHE[IC3_KEYS.SCORES] = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      }
    } else if (portal === "student" && currentUser?.email) {
      console.log(`☁️ Fetching student data for portal...`);
      
      // Fetch ALL students so leaderboard and block ranking work across the server
      const studentsSnap = await getDocs(collection(db, IC3_KEYS.STUDENTS));
      window.IC3_CACHE[IC3_KEYS.STUDENTS] = studentsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      console.log(`☁️ Fetching recent top scores...`);
      // Fetch top 200 scores so the block ranking on dashboard has data
      const scoreQuery = query(collection(db, IC3_KEYS.SCORES), orderBy("score", "desc"), limit(200));
      const scoreSnap = await getDocs(scoreQuery);
      window.IC3_CACHE[IC3_KEYS.SCORES] = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    }


    // Initialize Pokemons if empty
    let pokemonsData = window.IC3_CACHE[IC3_KEYS.POKEMONS];
    if (!pokemonsData || pokemonsData.length === 0) {
      console.log("Initializing Pokemons data...");
      const pokemonNames = {
        pichu: "Pichu Nhỏ Bé", pikachu: "Pikachu Tia Chớp", raichu: "Raichu Sấm Sét", "raichu-alola": "Raichu Lướt Sóng", "pikachu-gmax": "Pikachu Khổng Lồ",
        charmander: "Charmander Ngọn Lửa", charmeleon: "Charmeleon Hỏa Chiến", charizard: "Charizard Rồng Lửa", "charizard-megax": "Mega Charizard X", "charizard-megay": "Mega Charizard Y",
        bulbasaur: "Bulbasaur Mầm Non", ivysaur: "Ivysaur Nụ Hoa", venusaur: "Venusaur Hoa Lớn", "venusaur-mega": "Mega Venusaur", "venusaur-gmax": "Venusaur Khổng Lồ",
        squirtle: "Squirtle Rùa Nước", wartortle: "Wartortle Rùa Chiến", blastoise: "Blastoise Pháo Thủy", "blastoise-mega": "Mega Blastoise", "blastoise-gmax": "Blastoise Khổng Lồ",
        eevee: "Eevee Đa Năng", vaporeon: "Vaporeon Thủy Cung", jolteon: "Jolteon Sấm Sét", flareon: "Flareon Hỏa Cực", espeon: "Espeon Tâm Linh", umbreon: "Umbreon Bóng Tối", sylveon: "Sylveon Tiên Nữ",
        munchlax: "Munchlax Ham Ăn", snorlax: "Snorlax Ngủ Ngày", "snorlax-gmax": "Snorlax Đảo Khổng Lồ",
        gastly: "Gastly Bóng Ma", haunter: "Haunter Trêu Chọc", gengar: "Gengar Hắc Ám", "gengar-mega": "Mega Gengar", "gengar-gmax": "Gengar Khổng Lồ",
        riolu: "Riolu Sóng Âm", lucario: "Lucario Chiến Binh", "lucario-mega": "Mega Lucario",
        dratini: "Dratini Rồng Nhỏ", dragonair: "Dragonair Rồng Ngọc", dragonite: "Dragonite Vua Rồng",
        mewtwo: "Mewtwo Nhân Tạo", "mewtwo-megax": "Mega Mewtwo Bá Vương X", "mewtwo-megay": "Mega Mewtwo Thần Lực Y",
        rayquaza: "Rayquaza Không Vương", "rayquaza-mega": "Mega Rayquaza Sáng Thế",
        arceus: "Arceus Đấng Sáng Thế"
      };

      const pokemonRarity = {
        pichu: "Thường", pikachu: "Thường", charmander: "Thường", bulbasaur: "Thường", squirtle: "Thường",
        eevee: "Thường", munchlax: "Thường", gastly: "Thường", riolu: "Thường", dratini: "Thường",
        raichu: "Hiếm", "raichu-alola": "Hiếm", "pikachu-gmax": "Hiếm",
        charmeleon: "Hiếm", charizard: "Hiếm", "charizard-megax": "Hiếm", "charizard-megay": "Hiếm",
        ivysaur: "Hiếm", venusaur: "Hiếm", "venusaur-gmax": "Hiếm", "venusaur-mega": "Hiếm",
        wartortle: "Hiếm", blastoise: "Hiếm", "blastoise-gmax": "Hiếm", "blastoise-mega": "Hiếm",
        vaporeon: "Hiếm", jolteon: "Hiếm", flareon: "Hiếm", espeon: "Hiếm", umbreon: "Hiếm", sylveon: "Hiếm",
        snorlax: "Hiếm", "snorlax-gmax": "Hiếm",
        haunter: "Hiếm", gengar: "Hiếm", "gengar-mega": "Hiếm", "gengar-gmax": "Hiếm",
        lucario: "Hiếm", "lucario-mega": "Hiếm",
        dragonair: "Hiếm", dragonite: "Hiếm",
        mewtwo: "Thần Thoại", "mewtwo-megax": "Thần Thoại", "mewtwo-megay": "Thần Thoại",
        rayquaza: "Thần Thoại", "rayquaza-mega": "Thần Thoại",
        arceus: "Thần Thoại"
      };
      
      const pokemonTypes = {
          pichu: "Hệ Điện", pikachu: "Hệ Điện", charmander: "Hệ Lửa", bulbasaur: "Hệ Cỏ", squirtle: "Hệ Nước",
          eevee: "Hệ Thường", munchlax: "Hệ Thường", gastly: "Hệ Ma", riolu: "Hệ Võ Thuật", dratini: "Hệ Rồng",
          raichu: "Hệ Điện", "raichu-alola": "Hệ Điện", "pikachu-gmax": "Hệ Điện",
          charmeleon: "Hệ Lửa", charizard: "Hệ Lửa", "charizard-megax": "Hệ Lửa", "charizard-megay": "Hệ Lửa",
          ivysaur: "Hệ Cỏ", venusaur: "Hệ Cỏ", "venusaur-gmax": "Hệ Cỏ", "venusaur-mega": "Hệ Cỏ",
          wartortle: "Hệ Nước", blastoise: "Hệ Nước", "blastoise-gmax": "Hệ Nước", "blastoise-mega": "Hệ Nước",
          vaporeon: "Hệ Nước", jolteon: "Hệ Điện", flareon: "Hệ Lửa", espeon: "Hệ Tâm Linh", umbreon: "Hệ Bóng Tối", sylveon: "Hệ Tiên",
          snorlax: "Hệ Thường", "snorlax-gmax": "Hệ Thường",
          haunter: "Hệ Ma", gengar: "Hệ Ma", "gengar-mega": "Hệ Ma", "gengar-gmax": "Hệ Ma",
          lucario: "Hệ Võ Thuật", "lucario-mega": "Hệ Võ Thuật",
          dragonair: "Hệ Rồng", dragonite: "Hệ Rồng",
          mewtwo: "Hệ Tâm Linh", "mewtwo-megax": "Hệ Tâm Linh", "mewtwo-megay": "Hệ Tâm Linh",
          rayquaza: "Hệ Rồng", "rayquaza-mega": "Hệ Rồng",
          arceus: "Hệ Thường"
      };

      const defaultPokemons = Object.keys(pokemonNames).map(id => ({
        id,
        name: pokemonNames[id],
        rarity: pokemonRarity[id] || "Thường",
        element: pokemonTypes[id] || "Hệ Thường",
        image: "https://projectpokemon.org/images/normal-sprite/" + id.toLowerCase() + ".gif"
      }));
      
      window.IC3_CACHE[IC3_KEYS.POKEMONS] = defaultPokemons;
      window.saveData(IC3_KEYS.POKEMONS, defaultPokemons, defaultPokemons.map(p => p.id));
    }

    console.log("✅ Cloud Data Initialization Optimized & Complete");

  } catch (error) {
    console.error("❌ Critical initialization error:", error);
  } finally {
    isInitializing = false;
    window.IC3_DB_INITIALIZED = true;
    window.dispatchEvent(new CustomEvent('ic3-db-ready'));
    hideGlobalLoader();
  }
}

// Global Force Logout Helper (used by Admin)
window.forceLogoutUser = async (email) => {
  try {
    console.log(`🛡️ Requesting force logout for: ${email}`);
    const userDocRef = doc(db, IC3_KEYS.USERS, email);
    await updateDoc(userDocRef, {
      currentSessionToken: "",
      forceLogout: true
    });
    return { success: true };
  } catch (error) {
    console.error("Force logout error:", error);
    return { success: false, message: error.message };
  }
};

// Force Logout EVERYONE in the system (INSTANT O(1) version)
window.forceLogoutEveryone = async () => {
  try {
    console.log("🚨 Initiating GLOBAL FORCE LOGOUT via system config...");
    const configDocRef = doc(db, IC3_KEYS.SYSTEM, "config");
    await setDoc(configDocRef, {
      globalForceLogoutTimestamp: Date.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Global force logout error:", error);
    return { success: false, message: error.message };
  }
};

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
        const loginTimestamp = Date.now();
        await updateDoc(userDocRef, {
          currentSessionToken: newSessionToken,
          forceLogout: false,
          loginTimestamp: loginTimestamp
        });
        
        userData.currentSessionToken = newSessionToken;
        userData.loginTimestamp = loginTimestamp;
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
  window.location.href = "./index.html";
};

// Global Data Sync Helper
// OPTIMIZED: Supports saving single items or entire collections efficiently
window.saveData = async (key, data, specificItemId = null) => {
  // Update local cache first
  window.IC3_CACHE[key] = data;

  console.log(`📡 Syncing [${key}] to cloud...`);
  
  try {
    if (Array.isArray(specificItemId)) {
      for (const id of specificItemId) {
        const item = data.find(i => (i.id === id || i.email === id));
        if (item) {
          await setDoc(doc(db, key, id), item, { merge: true });
        }
      }
    } else if (specificItemId) {
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


window.loadPokemonEvolutions = async function() {
    try {
        const snapshot = await getDocs(collection(db, "pokemonEvolutions"));
        const newEvoMap = {};
        const newEvoImagesMap = {};
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.forms && data.basePokemon) {
                newEvoMap[data.basePokemon] = data.forms;
                newEvoImagesMap[data.basePokemon] = data.images || data.forms.map(f => `https://projectpokemon.org/images/normal-sprite/${f}.gif`);
            }
        });
        window.currentEvoImagesMap = { ...(window.currentEvoImagesMap || {}), ...newEvoImagesMap };
        if (Object.keys(newEvoMap).length > 0) {
            window.evoMap = { ...(window.evoMap || {}), ...newEvoMap };
            // trigger re-renders if methods exist
            if (typeof renderInventory === "function") renderInventory();
            if (typeof renderProfileCustomizationContent === "function") renderProfileCustomizationContent();
        }
    } catch (e) {
        console.error("Failed to load pokemon evolutions", e);
    }
};

// Start loading when ready
if (window.IC3_DB_INITIALIZED) {
    window.loadPokemonEvolutions();
} else {
    window.addEventListener('ic3-db-ready', window.loadPokemonEvolutions);
}

// Google Sheets is loaded statically via standard script tags in index.html to support local file:// protocols
console.log("✅ Google Sheets module initialized from index.html");
