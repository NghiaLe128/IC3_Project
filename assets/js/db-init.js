/**
 * IC3 LMS - Cloud Database Integration (Firebase)
 * Migrated from LocalStorage to Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

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
window.fStore = { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where, limit };
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
async function seedDatabase() {
  console.log("🌱 Checking if database needs seeding...");
  try {
    const testsRef = collection(db, IC3_KEYS.TESTS);
    const testsSnap = await getDocs(testsRef);
    
    if (testsSnap.empty) {
      console.log("🌱 Seeding database with initial IC3 data...");
      
      // 1. Questions Seed
      const questions = [
        { id: "q1", level: "Beginner", type: "multiple-choice", question: "Thành phần nào sau đây là bộ não của máy tính?", options: ["RAM", "Ổ cứng", "CPU", "Màn hình"], answer: "CPU", explanation: "CPU (Central Processing Unit) là đơn vị xử lý trung tâm, đóng vai trò như bộ não của máy tính." },
        { id: "q2", level: "Beginner", type: "multiple-choice", question: "Thiết bị nào dùng để nhập dữ liệu vào máy tính?", options: ["Loa", "Bàn phím", "Máy in", "Màn hình"], answer: "Bàn phím", explanation: "Bàn phím là thiết bị nhập (input device) phổ biến nhất." },
        { id: "q3", level: "Beginner", type: "multiple-choice", question: "Hệ điều hành phổ biến nhất cho máy tính cá nhân là gì?", options: ["Windows", "Android", "iOS", "Linux"], answer: "Windows", explanation: "Windows là hệ điều hành máy tính cá nhân phổ biến nhất thế giới." },
        { id: "q4", level: "Explorer", type: "multiple-choice", question: "Trong Microsoft Word, tổ hợp phím Ctrl + C dùng để làm gì?", options: ["Dán", "Cắt", "Sao chép", "Lưu"], answer: "Sao chép", explanation: "Ctrl + C là phím tắt cho lệnh Copy (Sao chép)." },
        { id: "q5", level: "Explorer", type: "multiple-choice", question: "Trong Excel, công thức luôn bắt đầu bằng dấu gì?", options: ["+", "-", "*", "="], answer: "=", explanation: "Tất cả công thức trong Excel phải bắt đầu bằng dấu bằng (=)." },
        { id: "q6", level: "Expert", type: "multiple-choice", question: "Mật khẩu nào sau đây là an toàn nhất?", options: ["123456", "password", "Admin@2026!", "ten_cua_ban"], answer: "Admin@2026!", explanation: "Mật khẩu an toàn cần có chữ hoa, chữ thường, số và ký tự đặc biệt." },
        { id: "q7", level: "Expert", type: "multiple-choice", question: "Phishing là gì trong an ninh mạng?", options: ["Một loại virus", "Tấn công lừa đảo lấy thông tin", "Phần mềm diệt virus", "Tên một trình duyệt"], answer: "Tấn công lừa đảo lấy thông tin", explanation: "Phishing là hình thức lừa đảo giả mạo các đơn vị uy tín để lấy thông tin nhạy cảm của người dùng." }
      ];

      for (const q of questions) {
        try {
          await setDoc(doc(db, IC3_KEYS.QUESTIONS, q.id), q);
        } catch (e) { handleFirestoreError(e, 'seed:questions', q.id); }
      }

      // 2. Tests Seed
      const tests = [
        { 
          id: "test_l1", 
          title: "Thử thách: Data Tree Guardian 🌳", 
          level: "Beginner", 
          duration: 15, 
          questionCount: 3, 
          questions: ["q1", "q2", "q3"], 
          scoreVal: 10, 
          createdBY: "admin@gmail.com" 
        },
        { 
          id: "test_l2", 
          title: "Thử thách: Office Mega Robot 🤖", 
          level: "Explorer", 
          duration: 20, 
          questionCount: 2, 
          questions: ["q4", "q5"], 
          scoreVal: 20, 
          createdBY: "admin@gmail.com" 
        },
        { 
          id: "test_l3", 
          title: "Thử thách: Cyber Security Dragon 👾", 
          level: "Expert", 
          duration: 30, 
          questionCount: 2, 
          questions: ["q6", "q7"], 
          scoreVal: 30, 
          createdBY: "admin@gmail.com" 
        }
      ];

      for (const t of tests) {
        try {
          await setDoc(doc(db, IC3_KEYS.TESTS, t.id), t);
        } catch (e) { handleFirestoreError(e, 'seed:tests', t.id); }
      }

      // 3. Rewards Seed
      const rewards = [
        { id: "r1", name: "Thẻ hồi máu Pokémon", type: "item", cost: 50, image: "🧪", desc: "Hồi phục 50 HP ngay lập tức." },
        { id: "r2", name: "Huy hiệu Master", type: "badge", cost: 200, image: "🏆", desc: "Chứng nhận trình độ Master IC3." }
      ];
      for (const r of rewards) {
        try {
          await setDoc(doc(db, IC3_KEYS.REWARDS, r.id), r);
        } catch (e) { handleFirestoreError(e, 'seed:rewards', r.id); }
      }

      // 4. Users Seed (Demo Accounts)
      const demoUsers = [
        { email: 'admin@gmail.com', name: 'System Admin', role: 'admin', password: '123456' },
        { email: 'teacher@gmail.com', name: 'Demo Teacher', role: 'teacher', password: '123456' },
        { email: 'student@gmail.com', name: 'Demo Student', role: 'student', password: '123456' }
      ];
      for (const u of demoUsers) {
        try {
          await setDoc(doc(db, IC3_KEYS.USERS, u.email), u);
        } catch (e) { handleFirestoreError(e, 'seed:users', u.email); }
      }

      // 5. Students Seed
      const demoStudent = {
        email: 'student@gmail.com',
        name: 'Demo Student',
        classId: "C1",
        pokemon: "pikachu",
        level: "Beginner",
        exp: 150,
        maxExp: 500,
        coins: 50,
        rank: "Bronze",
        badges: [],
        unlockedLessons: ["lesson_l1_1"],
        unlockedZones: ["level_1"]
      };
      try {
        await setDoc(doc(db, IC3_KEYS.STUDENTS, demoStudent.email), demoStudent);
      } catch (e) { handleFirestoreError(e, 'seed:students', demoStudent.email); }

      // 6. Teachers Seed
      const demoTeacher = {
        email: 'teacher@gmail.com',
        name: 'Demo Teacher',
        subjects: ["IC3 Digital Literacy"],
        classes: ["C1"]
      };
      try {
        await setDoc(doc(db, IC3_KEYS.TEACHERS, demoTeacher.email), demoTeacher);
      } catch (e) { handleFirestoreError(e, 'seed:teachers', demoTeacher.email); }

      // 7. Classes Seed
      const demoClass = {
        id: "C1",
        name: "Lớp IC3 Cơ bản 01",
        teacherEmail: "teacher@gmail.com",
        studentCount: 1
      };
      try {
        await setDoc(doc(db, IC3_KEYS.CLASSES, demoClass.id), demoClass);
      } catch (e) { handleFirestoreError(e, 'seed:classes', demoClass.id); }

      console.log("✅ Database seeded successfully!");
      // Reload data after seeding
      await initData();
    } else {
      console.log("✅ Database already has data, skipping seed.");
    }
  } catch (error) {
    handleFirestoreError(error, 'seed:check', IC3_KEYS.TESTS);
  }
}

async function initData() {
  console.log("🚀 Initializing IC3 LMS Cloud Database...");
  
  // Initial fetch of all primary collections
  const collectionsToFetch = [
    IC3_KEYS.USERS, IC3_KEYS.STUDENTS, IC3_KEYS.TEACHERS, 
    IC3_KEYS.CLASSES, IC3_KEYS.QUESTIONS, IC3_KEYS.TESTS, 
    IC3_KEYS.SCORES, IC3_KEYS.REWARDS, IC3_KEYS.NOTIFICATIONS
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
    
    // Auto-seed if tests are missing
    if (window.IC3_CACHE[IC3_KEYS.TESTS].length === 0) {
      await seedDatabase();
    }

    console.log("✅ Cloud Data Initialization Step Complete");
  } catch (error) {
    console.error("❌ Critical initialization error:", error);
  } finally {
    // Dispatch event so scripts know DB is ready (even if some collections failed)
    window.dispatchEvent(new CustomEvent('ic3-db-ready'));
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
        localStorage.setItem(IC3_KEYS.CURRENT_USER, JSON.stringify(userData));
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

window.logoutUser = () => {
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
    return { success: true };
  } catch (error) {
    console.error(`❌ Sync error for [${key}]:`, error);
    return { success: false, error: error.message };
  }
};

// Start
initData();

