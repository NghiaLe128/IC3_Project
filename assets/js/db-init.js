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
        { id: "q1", level: "Beginner", type: "choice", question: "Thành phần nào sau đây là bộ não của máy tính?", options: ["RAM", "Ổ cứng", "CPU", "Màn hình"], correctIndex: 2, answer: "CPU", explanation: "CPU (Central Processing Unit) là đơn vị xử lý trung tâm, đóng vai trò như bộ não của máy tính." },
        { id: "q2", level: "Beginner", type: "choice", question: "Thiết bị nào dùng để nhập dữ liệu vào máy tính?", options: ["Loa", "Bàn phím", "Máy in", "Màn hình"], correctIndex: 1, answer: "Bàn phím", explanation: "Bàn phím là thiết bị nhập (input device) phổ biến nhất." },
        { id: "q3", level: "Beginner", type: "choice", question: "Hệ điều hành phổ biến nhất cho máy tính cá nhân là gì?", options: ["Windows", "Android", "iOS", "Linux"], correctIndex: 0, answer: "Windows", explanation: "Windows là hệ điều hành máy tính cá nhân phổ biến nhất thế giới." },
        { id: "q4", level: "Explorer", type: "choice", question: "Trong Microsoft Word, tổ hợp phím Ctrl + C dùng để làm gì?", options: ["Dán", "Cắt", "Sao chép", "Lưu"], correctIndex: 2, answer: "Sao chép", explanation: "Ctrl + C là phím tắt cho lệnh Copy (Sao chép)." },
        { id: "q5", level: "Explorer", type: "choice", question: "Trong Excel, công thức luôn bắt đầu bằng dấu gì?", options: ["+", "-", "*", "="], correctIndex: 3, answer: "=", explanation: "Tất cả công thức trong Excel phải bắt đầu bằng dấu bằng (=)." },
        { id: "q6", level: "Expert", type: "choice", question: "Mật khẩu nào sau đây là an sau nhất?", options: ["123456", "password", "Admin@2026!", "ten_cua_ban"], correctIndex: 2, answer: "Admin@2026!", explanation: "Mật khẩu an toàn cần có chữ hoa, chữ thường, số và ký tự đặc biệt." },
        { id: "q7", level: "Expert", type: "choice", question: "Phishing là gì trong an ninh mạng?", options: ["Một loại virus", "Tấn công lừa đảo lấy thông tin", "Phần mềm diệt virus", "Tên một trình duyệt"], correctIndex: 1, answer: "Tấn công lừa đảo lấy thông tin", explanation: "Phishing là hình thức lừa đảo giả mạo các đơn vị uy tín để lấy thông tin nhạy cảm của người dùng." }
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

async function seedImageTestAndQuestions() {
  console.log("🌱 Seeding comprehensive image-rich and multi-format test and questions to Firestore...");
  const customQuestions = [
    {
      id: "q_image_choice_single",
      level: "Explorer",
      type: "choice",
      question: "Hình ảnh dưới đây biểu thị linh kiện phần cứng quan trọng nào của máy tính?",
      image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80",
      options: ["Bộ nhớ RAM", "Bộ vi xử lý CPU (Central Processing Unit)", "Bộ nguồn điện PSU", "Card đồ họa GPU"],
      correctIndex: 1,
      answer: "Bộ vi xử lý CPU (Central Processing Unit)",
      explanation: "CPU (Central Processing Unit) là bộ vi xử lý trung tâm, được ví như bộ não của máy tính, thực hiện các phép tính toán học, logic và điều khiển hoạt động của hệ thống."
    },
    {
      id: "q_image_choices",
      level: "Explorer",
      type: "image_choice",
      question: "Trong các thiết bị sau đây, thiết bị nào là Thiết bị nhập (Input Device) chính dùng để gõ văn bản?",
      options: [
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80", // Monitor
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=80", // Keyboard
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80", // Mouse
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80"  // Motherboard
      ],
      correctIndex: 1,
      answer: "Lựa chọn 2",
      explanation: "Bàn phím (Keyboard - Lựa chọn 2) là thiết bị ngoại vi dùng để nhập thông tin ký tự, số và điều khiển bằng cách nhấn các nút phím."
    },
    {
      id: "q_drag_image_labels",
      level: "Explorer",
      type: "drag_image_text",
      question: "Kéo thả các nhãn tên gọi linh kiện phần cứng tương ứng chính xác vào từng hình ảnh dưới đây:",
      leftImages: [
        "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&auto=format&fit=crop&q=80", // CPU
        "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80", // RAM
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80", // Monitor
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80"  // Mouse
      ],
      options: ["Bộ nhớ RAM", "Bộ vi xử lý CPU", "Màn hình (Monitor)", "Chuột máy tính (Mouse)"],
      correctAnswers: ["Bộ vi xử lý CPU", "Bộ nhớ RAM", "Màn hình (Monitor)", "Chuột máy tính (Mouse)"],
      explanation: "Đúng rồi! Các linh kiện được sắp xếp như sau: 1 - CPU xử lý thông tin; 2 - RAM lưu trữ dữ liệu tạm thời; 3 - Màn hình hiển thị; 4 - Chuột dùng điều khiển và nhấp lệnh."
    },
    {
      id: "q_true_false_image",
      level: "Explorer",
      type: "true_false",
      question: "Hình ảnh dưới đây biểu thị một bộ sạc pin dự phòng di động (Power Bank), là thiết bị lưu trữ điện năng dùng sạc pin điện thoại ngoài trời. Đúng hay Sai?",
      image: "https://images.unsplash.com/photo-1609592424085-f5da49fb1be0?w=600&auto=format&fit=crop&q=80",
      options: ["Đúng", "Sai"],
      answer: "Đúng",
      explanation: "Đúng, sạc dự phòng (Power Bank) lưu trữ năng lượng điện hóa học để nạp pin cho điện thoại và thiết bị di động mà không cần kết nối trực tiếp nguồn điện xoay chiều."
    },
    {
      id: "q_fill_blank_image",
      level: "Explorer",
      type: "fill_blank",
      question: "Hãy nhập tên viết tắt bằng tiếng Anh (3 chữ cái viết hoa) của thiết bị ổ cứng lưu trữ thể rắn siêu tốc dưới đây:",
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
      answer: "SSD",
      explanation: "SSD (Solid State Drive) là ổ cứng thể rắn dùng chip nhớ flash để truy xuất và lưu trữ dữ liệu bền bỉ và nhanh chóng gấp nhiều lần ổ HDD thông thường."
    },
    {
      id: "q_drag_text_example",
      level: "Explorer",
      type: "drag_text",
      question: "Kéo thả các chức năng phù hợp tương ứng với từng tổ hợp phím tắt phổ biến dưới đây:",
      rows: [
        { label: "Phím tắt Ctrl + C" },
        { label: "Phím tắt Ctrl + V" },
        { label: "Phím tắt Ctrl + Z" },
        { label: "Phím tắt Ctrl + A" }
      ],
      options: ["Sao chép", "Dán", "Hoàn tác", "Chọn tất cả"],
      correctAnswers: ["Sao chép", "Dán", "Hoàn tác", "Chọn tất cả"],
      explanation: "Ctrl + C dùng sao chép đối tượng, Ctrl + V dán nội dung từ clipboard, Ctrl + Z phục hồi trạng thái trước đó (Undo), và Ctrl + A chọn toàn bộ đối tượng."
    },
    {
      id: "q_table_match_example",
      level: "Expert",
      type: "table_match",
      headers: ["Cổng Kết Nối", "Thiết Bị Ngoại Vi Thích Hợp"],
      question: "Hãy ghép nối cổng kết nối phần cứng chính xác với thiết bị ngoại vi thích hợp:",
      rows: ["Cổng HDMI", "Cổng USB", "Cổng mạng RJ-45", "Audio 3.5mm Jack"],
      options: ["Màn hình / TV / Máy chiếu", "Chuột / Bàn phím / Thẻ nhớ", "Cáp mạng LAN internet", "Tai nghe / Loa nghe nhạc"],
      correctAnswers: [0, 1, 2, 3],
      explanation: "HDMI truyền hình ảnh và âm thanh chất lượng cao. USB cực kỳ đa dụng. RJ-45 kết nối mạng internet dây. Jack 3.5mm truyền tín hiệu âm thanh analog."
    },
    {
      id: "q_multi_choice_example",
      level: "Explorer",
      type: "multi_choice",
      question: "Trong các thiết bị sau đây, những thiết bị nào được phân loại thuộc nhóm Thiết Bị Xuất (Output Devices)? (Hãy chọn 3 đáp án đúng)",
      options: ["Màn hình máy tính (Monitor)", "Máy in văn phòng (Printer)", "Loa âm thanh (Speakers)", "Bàn phím gõ chữ (Keyboard)", "Máy quét ảnh (Scanner)"],
      correctIndices: [0, 1, 2],
      explanation: "Màn hình, máy in và loa đều là thiết bị xuất vì chúng đưa thông tin ra từ máy tính. Bàn phím và máy quét đưa thông tin vào trong máy tính nên là thiết bị nhập."
    }
  ];

  const customTest = {
    id: "test_image_l1",
    title: "Thử thách: Hình ảnh IC3 Sparks 🖼️",
    level: "Explorer",
    duration: 20,
    questionCount: 5,
    questions: ["q_image_choice_single", "q_image_choices", "q_drag_image_labels", "q_true_false_image", "q_fill_blank_image"],
    scoreVal: 50,
    createdBY: "admin@gmail.com"
  };

  const allTypesTest = {
    id: "test_all_types_l2",
    title: "Thử thách: Trọn Bộ 8 Dạng Câu Hỏi IC3 🌟",
    level: "Expert",
    duration: 30,
    questionCount: 8,
    questions: [
      "q_image_choice_single",
      "q_image_choices",
      "q_drag_image_labels",
      "q_true_false_image",
      "q_fill_blank_image",
      "q_drag_text_example",
      "q_table_match_example",
      "q_multi_choice_example"
    ],
    scoreVal: 80,
    createdBY: "admin@gmail.com"
  };

  try {
    for (const q of customQuestions) {
      await setDoc(doc(db, IC3_KEYS.QUESTIONS, q.id), q);
    }
    await setDoc(doc(db, IC3_KEYS.TESTS, customTest.id), customTest);
    await setDoc(doc(db, IC3_KEYS.TESTS, allTypesTest.id), allTypesTest);
    console.log("✅ Seeded custom image-rich & comprehensive tests successfully!");
  } catch (error) {
    console.error("❌ Error seeding custom tests:", error);
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

    // Explicitly check for custom multi-format test and questions; seed if missing!
    const hasAllTypesTest = window.IC3_CACHE[IC3_KEYS.TESTS].some(t => t.id === "test_all_types_l2");
    if (!hasAllTypesTest) {
      console.log("🌱 Custom comprehensive test/questions missing, seeding them now...");
      await seedImageTestAndQuestions();
      // Fetch collections again to update cache
      await Promise.all(collectionsToFetch.map(async (key) => {
        try {
          const colRef = collection(db, key);
          const snapshot = await getDocs(colRef);
          window.IC3_CACHE[key] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (e) {}
      }));
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

