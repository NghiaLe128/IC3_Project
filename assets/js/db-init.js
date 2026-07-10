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

async function seedGradeLevelTests() {
  console.log("🌱 Seeding grade-level specific tests and questions for Khối 3 to Khối 8...");
  
  const gradeQuestions = [
    // Khối 3 (Grade 3) Questions
    {
      id: "q_g3_1",
      level: "Beginner",
      type: "choice",
      question: "Khi muốn nhấp chuột vào một biểu tượng trên màn hình để mở ứng dụng, em cần làm gì?",
      options: ["Nhấp chuột trái 1 lần", "Nhấp đúp chuột trái (2 lần liên tiếp)", "Nhấp chuột phải 1 lần", "Giữ phím Ctrl và di chuyển chuột"],
      correctIndex: 1,
      answer: "Nhấp đúp chuột trái (2 lần liên tiếp)",
      explanation: "Để mở một ứng dụng từ màn hình nền, ta sử dụng thao tác nhấp đúp chuột trái (double-click)."
    },
    {
      id: "q_g3_2",
      level: "Beginner",
      type: "choice",
      question: "Bàn phím máy tính dùng để làm gì?",
      options: ["Hiển thị hình ảnh", "Gõ chữ và số vào máy tính", "In văn bản ra giấy", "Nghe nhạc"],
      correctIndex: 1,
      answer: "Gõ chữ và số vào máy tính",
      explanation: "Bàn phím là thiết bị nhập dùng để gõ các chữ cái, số và ký tự."
    },
    {
      id: "q_g3_3",
      level: "Beginner",
      type: "choice",
      question: "Trong phần mềm Paint, công cụ hình cây bút chì dùng để làm gì?",
      options: ["Tô màu", "Vẽ nét tự do", "Xóa hình", "Viết văn bản"],
      correctIndex: 1,
      answer: "Vẽ nét tự do",
      explanation: "Công cụ bút chì dùng để vẽ nét tự do giống như khi vẽ bằng bút chì thực tế."
    },

    // Khối 4 (Grade 4) Questions
    {
      id: "q_g4_1",
      level: "Beginner",
      type: "choice",
      question: "Để tạo một thư mục (Folder) mới trên màn hình Desktop, em nhấp chuột phải và chọn:",
      options: ["New -> Shortcut", "New -> Folder", "New -> Text Document", "Properties"],
      correctIndex: 1,
      answer: "New -> Folder",
      explanation: "Chọn New -> Folder để tạo thư mục mới để lưu trữ dữ liệu."
    },
    {
      id: "q_g4_2",
      level: "Beginner",
      type: "choice",
      question: "Nút lệnh nào dùng để tắt máy tính an toàn trong Windows?",
      options: ["Restart", "Shut down", "Sleep", "Hibernate"],
      correctIndex: 1,
      answer: "Shut down",
      explanation: "Lệnh Shut down dùng để tắt máy tính một cách an toàn và đúng quy trình."
    },
    {
      id: "q_g4_3",
      level: "Beginner",
      type: "choice",
      question: "Trang web nào sau đây là một công cụ tìm kiếm phổ biến?",
      options: ["www.google.com", "www.youtube.com", "www.wikipedia.org", "www.facebook.com"],
      correctIndex: 0,
      answer: "www.google.com",
      explanation: "Google là công cụ tìm kiếm thông tin hàng đầu thế giới."
    },

    // Khối 5 (Grade 5) Questions
    {
      id: "q_g5_1",
      level: "Explorer",
      type: "choice",
      question: "Trong Microsoft Word, tổ hợp phím nào dùng để căn lề giữa cho văn bản?",
      options: ["Ctrl + L", "Ctrl + R", "Ctrl + E", "Ctrl + J"],
      correctIndex: 2,
      answer: "Ctrl + E",
      explanation: "Ctrl + E dùng để căn lề giữa (Center align) cho văn bản được chọn."
    },
    {
      id: "q_g5_2",
      level: "Explorer",
      type: "choice",
      question: "Trong Microsoft Excel, ô ở cột C dòng 5 có địa chỉ là:",
      options: ["5C", "C-5", "C5", "$C$5"],
      correctIndex: 2,
      answer: "C5",
      explanation: "Địa chỉ ô trong Excel được cấu thành từ Tên cột trước và Số dòng sau (C5)."
    },
    {
      id: "q_g5_3",
      level: "Explorer",
      type: "choice",
      question: "Khi nhận được email từ người lạ có đính kèm tệp tin lạ, em nên làm gì?",
      options: ["Mở tệp đính kèm ngay lập tức", "Xóa email hoặc hỏi ý kiến người lớn/thầy cô", "Gửi email này cho tất cả bạn bè", "Tải tệp về máy rồi quét thử"],
      correctIndex: 1,
      answer: "Xóa email hoặc hỏi ý kiến người lớn/thầy cô",
      explanation: "Để bảo vệ máy tính khỏi virus, không mở tệp lạ từ người lạ gửi đến."
    },

    // Khối 6 (Grade 6) - Ôn tập 1: Cơ bản về máy tính (Computing Fundamentals)
    {
      id: "q_g6_ot1_1",
      level: "Explorer",
      type: "choice",
      question: "Thiết bị nào sau đây là thiết bị nhập (Input Device)?",
      options: ["Màn hình", "Bàn phím", "Máy in", "Loa"],
      correctIndex: 1,
      answer: "Bàn phím",
      explanation: "Bàn phím được dùng để nhập dữ liệu ký tự và lệnh vào máy tính."
    },
    {
      id: "q_g6_ot1_2",
      level: "Explorer",
      type: "choice",
      question: "Đuôi tệp mở rộng nào dưới đây thường thuộc về tài liệu Word?",
      options: [".xlsx", ".pptx", ".docx", ".pdf"],
      correctIndex: 2,
      answer: ".docx",
      explanation: ".docx là phần mở rộng mặc định của tài liệu Microsoft Word từ phiên bản 2007 trở đi."
    },
    {
      id: "q_g6_ot1_3",
      level: "Explorer",
      type: "choice",
      question: "Thiết bị nào sau đây vừa là thiết bị nhập vừa là thiết bị xuất?",
      options: ["Chuột máy tính", "Màn hình cảm ứng", "Bàn phím", "Máy quét (Scanner)"],
      correctIndex: 1,
      answer: "Màn hình cảm ứng",
      explanation: "Màn hình cảm ứng nhận diện cú chạm để nhập dữ liệu và đồng thời hiển thị kết quả hình ảnh ra ngoài."
    },
    {
      id: "q_g6_ot1_4",
      level: "Explorer",
      type: "choice",
      question: "Hệ điều hành Windows và macOS là các phần mềm ứng dụng dùng để soạn thảo văn bản đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 1,
      answer: "Sai",
      explanation: "Windows và macOS là các hệ điều hành (phần mềm hệ thống) quản lý máy tính, không phải là phần mềm ứng dụng soạn thảo văn bản."
    },
    {
      id: "q_g6_ot1_5",
      level: "Explorer",
      type: "fill_blank",
      question: "Trong số các đơn vị sau: KB, MB, GB, TB. Đâu là đơn vị đo dung lượng lưu trữ nhỏ nhất?",
      answer: "KB",
      explanation: "KB (Kilobyte) là đơn vị nhỏ nhất trong các đơn vị được liệt kê (1 TB > 1 GB > 1 MB > 1 KB)."
    },
    {
      id: "q_g6_ot1_6",
      level: "Explorer",
      type: "choice",
      question: "RAM (Random Access Memory) là loại bộ nhớ như thế nào?",
      options: [
        "Bộ nhớ lưu trữ dữ liệu lâu dài ngay cả khi mất điện",
        "Bộ nhớ truy cập ngẫu nhiên tạm thời, dữ liệu sẽ mất sạch khi tắt máy",
        "Bộ nhớ chỉ đọc không thể thay đổi dữ liệu bên trong",
        "Bộ nhớ dành riêng cho chuột và bàn phím"
      ],
      correctIndex: 1,
      answer: "Bộ nhớ truy cập ngẫu nhiên tạm thời, dữ liệu sẽ mất sạch khi tắt máy",
      explanation: "RAM là bộ nhớ tạm thời dùng để chứa dữ liệu các chương trình đang hoạt động, dữ liệu sẽ bị xóa hoàn toàn khi máy ngắt nguồn điện."
    },
    {
      id: "q_g6_ot1_7",
      level: "Explorer",
      type: "choice",
      question: "Bộ xử lý trung tâm CPU thường được ví như bộ phận nào trên cơ thể con người?",
      options: ["Trái tim", "Đôi mắt", "Bộ não", "Bàn tay"],
      correctIndex: 2,
      answer: "Bộ não",
      explanation: "CPU (Central Processing Unit) là bộ xử lý trung tâm, chịu trách nhiệm tính toán, xử lý và điều khiển mọi hoạt động giống như bộ não con người."
    },
    {
      id: "q_g6_ot1_8",
      level: "Explorer",
      type: "choice",
      question: "Để tắt máy tính an toàn và đúng cách, thao tác chuẩn nhất là:",
      options: [
        "Rút trực tiếp dây cắm nguồn điện ra khỏi ổ cắm",
        "Nhấn và giữ chặt nút nguồn vật lý trên thùng máy",
        "Nhấp chọn Menu Start rồi chọn Shut down",
        "Chỉ cần tắt màn hình máy tính là được"
      ],
      correctIndex: 2,
      answer: "Nhấp chọn Menu Start rồi chọn Shut down",
      explanation: "Sử dụng tính năng Shut down tích hợp sẵn giúp hệ điều hành lưu trạng thái, tắt các chương trình an toàn rồi mới ngắt nguồn."
    },
    {
      id: "q_g6_ot1_9",
      level: "Explorer",
      type: "choice",
      question: "Phần cứng (Hardware) bao gồm tất cả các chương trình và ứng dụng chạy trên máy tính đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 1,
      answer: "Sai",
      explanation: "Phần cứng là các linh kiện vật lý cầm nắm được (CPU, RAM, chuột, bàn phím). Các chương trình chạy trên máy tính là Phần mềm (Software)."
    },
    {
      id: "q_g6_ot1_10",
      level: "Explorer",
      type: "drag_text",
      question: "Hãy kéo thả các nhóm thiết bị vào đúng vai trò chức năng tương ứng:",
      rows: [
        { label: "Bàn phím, chuột, máy quét (scanner)" },
        { label: "Màn hình, máy in, loa" },
        { label: "Ổ cứng HDD/SSD, thẻ nhớ, USB" }
      ],
      options: ["Thiết bị nhập", "Thiết bị xuất", "Thiết bị lưu trữ"],
      correctAnswers: ["Thiết bị nhập", "Thiết bị xuất", "Thiết bị lưu trữ"],
      answer: "[\"Thiết bị nhập\",\"Thiết bị xuất\",\"Thiết bị lưu trữ\"]",
      explanation: "Bàn phím/chuột dùng để nhập dữ liệu; Màn hình/máy in đưa dữ liệu ra ngoài; Ổ cứng/USB lưu trữ dữ liệu bền vững."
    },
    {
      id: "q_g6_ot1_11",
      level: "Explorer",
      type: "table_match",
      question: "Hãy ghép nối các phần mềm sau với đúng nhóm chức năng của chúng:",
      headers: ["Phần mềm", "Loại phần mềm / Chức năng"],
      rows: [
        "Windows 11 / macOS",
        "Microsoft Word / Excel",
        "Google Chrome / Edge"
      ],
      options: [
        "Hệ điều hành quản lý phần cứng",
        "Phần mềm ứng dụng văn phòng",
        "Trình duyệt Web truy cập mạng"
      ],
      correctAnswers: [0, 1, 2],
      answer: "[0,1,2]",
      explanation: "Windows/macOS là hệ điều hành; Word/Excel là ứng dụng văn phòng; Chrome/Edge là trình duyệt web thông dụng."
    },
    {
      id: "q_g6_ot1_12",
      level: "Explorer",
      type: "choice",
      question: "Card đồ họa (VGA) trong máy tính chịu trách nhiệm chính cho việc gì?",
      options: [
        "Xử lý và hiển thị hình ảnh, video ra màn hình",
        "Kết nối máy tính với Internet qua dây cáp",
        "Cung cấp nguồn điện ổn định cho bo mạch chủ",
        "Lưu trữ dữ liệu vĩnh viễn"
      ],
      correctIndex: 0,
      answer: "Xử lý và hiển thị hình ảnh, video ra màn hình",
      explanation: "VGA (Video Graphics Array) chịu trách nhiệm xử lý đồ họa, hình ảnh và hiển thị lên màn hình máy tính."
    },
    {
      id: "q_g6_ot1_13",
      level: "Explorer",
      type: "choice",
      question: "Dung lượng 1 GB (Gigabyte) tương đương với khoảng bao nhiêu MB (Megabyte)?",
      options: ["100 MB", "1000 MB", "1024 MB", "10000 MB"],
      correctIndex: 2,
      answer: "1024 MB",
      explanation: "Trong đơn vị đo lường tin học tiêu chuẩn, 1 GB bằng 1024 MB."
    },
    {
      id: "q_g6_ot1_14",
      level: "Explorer",
      type: "choice",
      question: "Khi một ứng dụng bị đơ (treo máy) không tắt được, phím tắt nhanh để khởi chạy Task Manager đóng cưỡng bức nó là Ctrl + Shift + Esc đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 0,
      answer: "Đúng",
      explanation: "Ctrl + Shift + Esc là tổ hợp phím tắt nhanh nhất để mở trực tiếp trình quản lý tác vụ Task Manager đóng ứng dụng treo."
    },
    {
      id: "q_g6_ot1_15",
      level: "Explorer",
      type: "choice",
      question: "Thiết bị mạng nào nhận tín hiệu Internet và phát sóng không dây cho các máy tính kết nối?",
      options: ["Switch mạng LAN", "Router Wi-Fi", "Dây cáp quang", "Card mạng không dây"],
      correctIndex: 1,
      answer: "Router Wi-Fi",
      explanation: "Router Wi-Fi là thiết bị phát sóng mạng không dây giúp các thiết bị ngoại vi kết nối Internet dễ dàng."
    },

    // Khối 6 (Grade 6) - Ôn tập 2: Các ứng dụng chính (Key Applications)
    {
      id: "q_g6_ot2_1",
      level: "Explorer",
      type: "choice",
      question: "Phím tắt thông dụng nào dùng để sao chép (Copy) đoạn văn bản được chọn?",
      options: ["Ctrl + X", "Ctrl + C", "Ctrl + V", "Ctrl + Z"],
      correctIndex: 1,
      answer: "Ctrl + C",
      explanation: "Ctrl + C là phím tắt dùng sao chép; Ctrl + X để cắt và Ctrl + V để dán."
    },
    {
      id: "q_g6_ot2_2",
      level: "Explorer",
      type: "choice",
      question: "Trong Microsoft Word, nhấp nút chữ 'B' đậm trên thanh công cụ nhằm thực hiện định dạng:",
      options: ["In nghiêng chữ", "Gạch chân dưới chữ", "Tạo chữ in đậm", "Tô màu nền chữ"],
      correctIndex: 2,
      answer: "Tạo chữ in đậm",
      explanation: "Chữ B viết tắt của Bold dùng để thiết lập văn bản in đậm."
    },
    {
      id: "q_g6_ot2_3",
      level: "Explorer",
      type: "choice",
      question: "Trong phần mềm bảng tính Microsoft Excel, giao điểm của một hàng và một cột gọi là:",
      options: ["Trang tính (Sheet)", "Bảng biểu (Table)", "Ô tính (Cell)", "Cột tính (Column)"],
      correctIndex: 2,
      answer: "Ô tính (Cell)",
      explanation: "Giao điểm giữa một cột và một dòng được gọi là ô tính (Cell), định danh bởi cột trước dòng sau như A1."
    },
    {
      id: "q_g6_ot2_4",
      level: "Explorer",
      type: "choice",
      question: "Trong Excel, để tính giá trị trung bình cộng của các ô từ A1 đến A5, công thức đúng là:",
      options: ["=SUM(A1:A5)", "=AVERAGE(A1:A5)", "=MAX(A1:A5)", "=MIN(A1:A5)"],
      correctIndex: 1,
      answer: "=AVERAGE(A1:A5)",
      explanation: "Hàm AVERAGE thực hiện tính giá trị trung bình cộng của dải ô được chỉ định."
    },
    {
      id: "q_g6_ot2_5",
      level: "Explorer",
      type: "choice",
      question: "Để chèn một bảng (Table) vào trang soạn thảo Word, em truy cập vào tab Home đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 1,
      answer: "Sai",
      explanation: "Để chèn các đối tượng như bảng, hình ảnh, hình vẽ, biểu đồ ta phải chọn tab Insert."
    },
    {
      id: "q_g6_ot2_6",
      level: "Explorer",
      type: "choice",
      question: "Trong Microsoft PowerPoint, để bắt đầu trình chiếu toàn màn hình từ slide đầu tiên, phím tắt là:",
      options: ["F1", "F5", "Esc", "Spacebar"],
      correctIndex: 1,
      answer: "F5",
      explanation: "Nhấn phím F5 để thực thi khởi động chế độ trình chiếu PowerPoint từ trang slide đầu tiên."
    },
    {
      id: "q_g6_ot2_7",
      level: "Explorer",
      type: "fill_blank",
      question: "Tên ứng dụng soạn thảo văn bản thông dụng nhất nằm trong bộ công cụ văn phòng Microsoft Office là gì?",
      answer: "Word",
      explanation: "Microsoft Word (hoặc MS Word) là chương trình soạn thảo văn bản phổ thông hàng đầu hiện nay."
    },
    {
      id: "q_g6_ot2_8",
      level: "Explorer",
      type: "choice",
      question: "Ký hiệu Creative Commons (CC) trên một tài liệu trực tuyến có ý nghĩa gì?",
      options: [
        "Tác phẩm hoàn toàn không có bản quyền bảo hộ",
        "Bản quyền mở, cho phép cộng đồng chia sẻ, sử dụng tác phẩm theo một số điều kiện đi kèm",
        "Tác phẩm thuộc sở hữu độc quyền của nhà nước cấm truy cập",
        "Tác phẩm đã bị lỗi thời"
      ],
      correctIndex: 1,
      answer: "Bản quyền mở, cho phép cộng đồng chia sẻ, sử dụng tác phẩm theo một số điều kiện đi kèm",
      explanation: "Creative Commons cung cấp các giấy phép bản quyền mở giúp tác giả chia sẻ tác phẩm của mình rộng rãi đồng thời bảo vệ các quyền lợi cơ bản."
    },
    {
      id: "q_g6_ot2_9",
      level: "Explorer",
      type: "choice",
      question: "Hành vi copy nguyên văn tài liệu của người khác vào bài luận của mình mà không trích nguồn rõ ràng được gọi là Đạo văn (Plagiarism) đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 0,
      answer: "Đúng",
      explanation: "Sử dụng thành quả, chất xám của người khác mà không công nhận hoặc ghi danh nguồn chính xác chính là đạo văn."
    },
    {
      id: "q_g6_ot2_10",
      level: "Explorer",
      type: "drag_text",
      question: "Hãy kéo thả các phần mềm Microsoft Office tương thích vào đúng nhiệm vụ của chúng:",
      rows: [
        { label: "Xây dựng các báo cáo, tài liệu văn bản chuyên nghiệp" },
        { label: "Tạo các trang bảng tính, quản lý dữ liệu, biểu đồ" },
        { label: "Thiết kế slide trình chiếu hội thảo sinh động" }
      ],
      options: ["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint"],
      correctAnswers: ["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint"],
      answer: "[\"Microsoft Word\",\"Microsoft Excel\",\"Microsoft PowerPoint\"]",
      explanation: "Word dùng soạn tài liệu; Excel dùng cho bảng tính; PowerPoint thiết kế trình chiếu."
    },
    {
      id: "q_g6_ot2_11",
      level: "Explorer",
      type: "table_match",
      question: "Hãy ghép cặp công thức toán học trong Excel với đúng chức năng tính toán của chúng:",
      headers: ["Công thức Excel", "Chức năng tính toán"],
      rows: [
        "=SUM(C1:C10)",
        "=MAX(C1:C10)",
        "=MIN(C1:C10)"
      ],
      options: [
        "Tính tổng tất cả các số trong vùng từ C1 đến C10",
        "Tìm ra số có giá trị lớn nhất trong vùng C1 đến C10",
        "Tìm ra số có giá trị nhỏ nhất trong vùng C1 đến C10"
      ],
      correctAnswers: [0, 1, 2],
      answer: "[0,1,2]",
      explanation: "Hàm SUM cộng tổng; MAX tìm giá trị lớn nhất; MIN tìm giá trị nhỏ nhất trong dải ô."
    },
    {
      id: "q_g6_ot2_12",
      level: "Explorer",
      type: "choice",
      question: "Khi tìm kiếm cụm từ trên Google Search, để yêu cầu Google tìm chính xác cụm từ đó theo thứ tự, ta đặt cụm từ trong cặp ký hiệu nào?",
      options: ["Cặp dấu ngoặc đơn ( )", "Cặp dấu ngoặc kép \" \"", "Cặp dấu ngoặc vuông [ ]", "Cặp dấu hỏi chấm ? ?"],
      correctIndex: 1,
      answer: "Cặp dấu ngoặc kép \" \"",
      explanation: "Đặt cụm từ tìm kiếm trong dấu ngoặc kép \"...\" thông báo cho Google trả về các kết quả chứa chính xác cụm từ đó."
    },
    {
      id: "q_g6_ot2_13",
      level: "Explorer",
      type: "choice",
      question: "Trong Microsoft Word, tổ hợp phím tắt Ctrl + Z thực hiện thao tác gì?",
      options: ["Lưu văn bản", "Hoàn tác (Undo) lại hành động vừa thao tác", "Cắt văn bản", "In văn bản nhanh"],
      correctIndex: 1,
      answer: "Hoàn tác (Undo) lại hành động vừa thao tác",
      explanation: "Ctrl + Z dùng để Undo - hoàn tác lại hành động sai vừa làm trước đó."
    },
    {
      id: "q_g6_ot2_14",
      level: "Explorer",
      type: "choice",
      question: "Trong bảng tính Excel, mọi công thức tính toán hợp lệ đều bắt buộc phải bắt đầu bằng dấu bằng (=) đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 0,
      answer: "Đúng",
      explanation: "Excel bắt buộc dùng dấu bằng (=) ở đầu ô để phân biệt giữa một công thức tính toán và một văn bản văn bản thô."
    },
    {
      id: "q_g6_ot2_15",
      level: "Explorer",
      type: "choice",
      question: "Sự khác biệt cốt lõi giữa hiệu ứng 'Animations' và 'Transitions' trong PowerPoint là:",
      options: [
        "Transitions áp dụng cho chữ viết, Animations áp dụng cho chèn ảnh",
        "Animations áp dụng cho các đối tượng bên trong một slide, Transitions áp dụng cho cách chuyển cảnh giữa các slide",
        "Hai hiệu ứng này hoàn toàn giống nhau chỉ khác tên gọi",
        "Transitions hoạt động nhanh hơn Animations"
      ],
      correctIndex: 1,
      answer: "Animations áp dụng cho các đối tượng bên trong một slide, Transitions áp dụng cho cách chuyển cảnh giữa các slide",
      explanation: "Transitions thiết lập chuyển tiếp hoạt ảnh giữa các slide, còn Animations tạo chuyển động cụ thể cho chữ/hình ảnh bên trong slide."
    },

    // Khối 6 (Grade 6) - Ôn tập 3: Cuộc sống trực tuyến (Living Online)
    {
      id: "q_g6_ot3_1",
      level: "Explorer",
      type: "choice",
      question: "Trường dữ liệu nào trong Email dùng để gửi bản sao công khai cho người khác (người nhận thấy được địa chỉ của nhau)?",
      options: ["To", "Cc (Carbon Copy)", "Bcc (Blind Carbon Copy)", "Subject"],
      correctIndex: 1,
      answer: "Cc (Carbon Copy)",
      explanation: "Cc viết tắt của Carbon Copy dùng gửi bản sao email công khai cho nhiều người, người nhận đều nhìn thấy địa chỉ email của nhau."
    },
    {
      id: "q_g6_ot3_2",
      level: "Explorer",
      type: "choice",
      question: "Tiêu đề hoặc chủ đề tóm tắt của bức thư điện tử được điền vào mục nào sau đây?",
      options: ["Sender", "Attachment", "Subject", "Body"],
      correctIndex: 2,
      answer: "Subject",
      explanation: "Mục Subject lưu tiêu đề bức thư, giúp người nhận biết nhanh nội dung chính của thư là gì trước khi click xem."
    },
    {
      id: "q_g6_ot3_3",
      level: "Explorer",
      type: "choice",
      question: "Đâu là một mật khẩu mạnh và có độ an toàn bảo mật cao nhất?",
      options: ["12345678", "hoangminh6a3", "M1nhC#2026!", "minhminh"],
      correctIndex: 2,
      answer: "M1nhC#2026!",
      explanation: "Mật khẩu an toàn cần dài từ 8 ký tự trở lên, gồm chữ hoa, chữ thường, chữ số và ít nhất một ký tự đặc biệt (như #, !)."
    },
    {
      id: "q_g6_ot3_4",
      level: "Explorer",
      type: "choice",
      question: "Thông tin nào sau đây thuộc nhóm thông tin cá nhân định danh nhạy cảm (PII) cần bảo mật tuyệt đối trực tuyến?",
      options: [
        "Danh sách bài hát yêu thích của em",
        "Tên câu lạc bộ bóng đá em mến mộ",
        "Địa chỉ nhà riêng, mật khẩu tài khoản và số điện thoại",
        "Tên môn học yêu thích ở lớp"
      ],
      correctIndex: 2,
      answer: "Địa chỉ nhà riêng, mật khẩu tài khoản và số điện thoại",
      explanation: "Địa chỉ, số điện thoại, mật khẩu là dữ liệu cá nhân nhạy cảm, có thể bị kẻ gian lợi dụng để quấy rối, lừa đảo hoặc đánh cắp danh tính."
    },
    {
      id: "q_g6_ot3_5",
      level: "Explorer",
      type: "choice",
      question: "Khi nhận được tin nhắn từ người lạ tự xưng là quản trị mạng xã hội đòi mật khẩu để kích hoạt tính năng bảo mật, cung cấp ngay lập tức là hành động đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 1,
      answer: "Sai",
      explanation: "Các nhà quản trị mạng chân chính tuyệt đối không bao giờ yêu cầu người dùng gửi mật khẩu qua chat trực tiếp. Đây là bẫy lừa đảo trực tuyến (Phishing)."
    },
    {
      id: "q_g6_ot3_6",
      level: "Explorer",
      type: "choice",
      question: "Để trả lời một email đồng thời cho cả người gửi gốc và tất cả những người nhận khác trong Cc, em chọn:",
      options: ["Reply", "Reply All", "Forward", "Bcc"],
      correctIndex: 1,
      answer: "Reply All",
      explanation: "Chọn Reply All (Trả lời tất cả) để phản hồi thư tới toàn bộ mọi người có tên trong danh sách nhận thư."
    },
    {
      id: "q_g6_ot3_7",
      level: "Explorer",
      type: "fill_blank",
      question: "Hành vi sử dụng công nghệ, tin nhắn, mạng xã hội để đe dọa, xúc phạm hoặc chế giễu người khác gọi là bắt nạt gì?",
      answer: "Mạng",
      explanation: "Bắt nạt qua các nền tảng kỹ thuật số, tin nhắn, mạng xã hội được gọi là Bắt nạt mạng (Cyberbullying)."
    },
    {
      id: "q_g6_ot3_8",
      level: "Explorer",
      type: "choice",
      question: "Mạng Intranet khác biệt gì so với mạng Internet toàn cầu?",
      options: [
        "Mạng Intranet mở rộng cho tất cả mọi người trên thế giới tham gia tự do",
        "Intranet là mạng nội bộ riêng tư của một trường học hoặc công ty, chỉ người dùng nội bộ được cấp quyền mới truy cập được",
        "Intranet là một loại dây cáp dùng để cắm vào máy tính",
        "Intranet có tốc độ chậm hơn Internet rất nhiều lần"
      ],
      correctIndex: 1,
      answer: "Intranet là mạng nội bộ riêng tư của một trường học hoặc công ty, chỉ người dùng nội bộ được cấp quyền mới truy cập được",
      explanation: "Mạng Intranet hoạt động giống Internet nhưng được giới hạn phạm vi an toàn, phục vụ riêng cho các thành viên trong cùng một cơ quan tổ chức."
    },
    {
      id: "q_g6_ot3_9",
      level: "Explorer",
      type: "choice",
      question: "Thuật ngữ 'Netiquette' được hiểu là các quy tắc ứng xử văn minh, tôn trọng người khác khi giao tiếp trên môi trường mạng đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 0,
      answer: "Đúng",
      explanation: "Netiquette (phép lịch sự trực tuyến) là văn hóa và quy tắc ứng xử chuẩn mực của con người khi tham gia các hoạt động trực tuyến."
    },
    {
      id: "q_g6_ot3_10",
      level: "Explorer",
      type: "drag_text",
      question: "Hãy kéo thả các phương thức giao tiếp kỹ thuật số vào đúng mô tả vai trò phổ biến của chúng:",
      rows: [
        { label: "Gửi thư điện tử chính thức, kèm tệp tin hồ sơ pháp lý" },
        { label: "Trò chuyện, nhắn tin trực tuyến, gọi thoại thời gian thực" },
        { label: "Kết nối cộng đồng, tương tác, bình luận, chia sẻ ảnh" }
      ],
      options: ["Thư điện tử (Email)", "Phần mềm nhắn tin (Zalo, Messenger)", "Mạng xã hội (Facebook, Instagram)"],
      correctAnswers: ["Thư điện tử (Email)", "Phần mềm nhắn tin (Zalo, Messenger)", "Mạng xã hội (Facebook, Instagram)"],
      answer: "[\"Thư điện tử (Email)\",\"Phần mềm nhắn tin (Zalo, Messenger)\",\"Mạng xã hội (Facebook, Instagram)\"]",
      explanation: "Email dùng gửi thư chính thức; Zalo/Messenger dùng nhắn tin trò chuyện; Facebook/Instagram dùng tương tác kết nối xã hội."
    },
    {
      id: "q_g6_ot3_11",
      level: "Explorer",
      type: "table_match",
      question: "Hãy ghép nối các tính năng xử lý thư điện tử (Email) sau với đúng bản chất hoạt động của chúng:",
      headers: ["Tính năng Email", "Bản chất hoạt động"],
      rows: [
        "Reply (Trả lời)",
        "Forward (Chuyển tiếp)",
        "Bcc (Bản sao ẩn danh)"
      ],
      options: [
        "Chỉ gửi phản hồi duy nhất cho người viết bức thư gốc",
        "Gửi nội dung thư hiện có sang cho một người nhận hoàn toàn mới",
        "Gửi bản sao thư ẩn danh, người nhận khác không thấy địa chỉ người Cc ẩn này"
      ],
      correctAnswers: [0, 1, 2],
      answer: "[0,1,2]",
      explanation: "Reply trả lời một người; Forward chuyển tiếp sang hòm thư khác; Bcc gửi thư ẩn danh bảo vệ địa chỉ."
    },
    {
      id: "q_g6_ot3_12",
      level: "Explorer",
      type: "choice",
      question: "Để gia tăng bảo mật tối đa cho hòm thư cá nhân, tránh bị kẻ xấu dò mật khẩu, em nên bật chế độ:",
      options: ["Đăng nhập tự động không cần mật khẩu", "Tính năng lưu mật khẩu công khai trên trình duyệt", "Xác thực hai yếu tố (2FA)", "Chia sẻ tài khoản cho bạn thân quản lý hộ"],
      correctIndex: 2,
      answer: "Xác thực hai yếu tố (2FA)",
      explanation: "Xác thực 2 yếu tố (2FA) yêu cầu thêm mã bảo mật OTP từ điện thoại, giúp ngăn chặn đăng nhập trái phép cực kỳ hiệu quả."
    },
    {
      id: "q_g6_ot3_13",
      level: "Explorer",
      type: "choice",
      question: "Hành động nào sau đây biểu hiện văn hóa giao tiếp tôn trọng lịch sự trực tuyến?",
      options: [
        "Dùng lời lẽ xúc phạm khi người khác không đồng ý kiến với mình",
        "Tôn trọng sự khác biệt, phản hồi bằng từ ngữ lịch sự ôn hòa mang tính xây dựng",
        "Đăng tải tin đồn giật gân không rõ nguồn gốc để câu like",
        "Tự ý công khai hình ảnh và thông tin của bạn học lên mạng"
      ],
      correctIndex: 1,
      answer: "Tôn trọng sự khác biệt, phản hồi bằng từ ngữ lịch sự ôn hòa mang tính xây dựng",
      explanation: "Sử dụng từ ngữ ôn hòa, lịch sự và mang tính xây dựng khi tranh luận trực tuyến thể hiện phép lịch sự mạng Netiquette."
    },
    {
      id: "q_g6_ot3_14",
      level: "Explorer",
      type: "choice",
      question: "Tất cả mọi thông tin được đăng tải và lan truyền trên Internet đều đáng tin cậy 100% đúng hay sai?",
      options: ["Đúng", "Sai"],
      correctIndex: 1,
      answer: "Sai",
      explanation: "Internet cho phép mọi người tự do đăng tải, nên có rất nhiều tin giả, tin đồn thất thiệt. Ta luôn phải chọn lọc và đối chiếu nguồn chính thống."
    },
    {
      id: "q_g6_ot3_15",
      level: "Explorer",
      type: "choice",
      question: "Biện pháp phòng ngừa phần mềm độc hại (Malware, virus) hiệu quả nhất cho máy tính khi lướt web là:",
      options: [
        "Click vào mọi quảng cáo trúng thưởng hiển thị trên các website lạ",
        "Cài đặt và sử dụng phần mềm diệt virus chính hãng uy tín, luôn cập nhật đầy đủ",
        "Tắt hoàn toàn tường lửa của Windows để mạng chạy nhanh hơn",
        "Không bao giờ khởi động lại máy tính"
      ],
      correctIndex: 1,
      answer: "Cài đặt và sử dụng phần mềm diệt virus chính hãng uy tín, luôn cập nhật đầy đủ",
      explanation: "Phần mềm chống độc hại bảo vệ máy tính khỏi các mã độc, kết hợp tường lửa lọc chặn rủi ro xâm hại."
    },

    // Khối 7 (Grade 7) Questions
    {
      id: "q_g7_1",
      level: "Expert",
      type: "choice",
      question: "Trong Excel, công thức =SUM(A1:A3) trả về giá trị gì?",
      options: ["Tính giá trị trung bình của các ô từ A1 đến A3", "Tìm giá trị lớn nhất từ ô A1 đến A3", "Tính tổng các giá trị từ ô A1 đến A3", "Đếm số lượng ô chứa số từ A1 đến A3"],
      correctIndex: 2,
      answer: "Tính tổng các giá trị từ ô A1 đến A3",
      explanation: "Hàm SUM tính tổng giá trị của dải ô được chỉ định."
    },
    {
      id: "q_g7_2",
      level: "Expert",
      type: "choice",
      question: "Trong PowerPoint, để tạo hiệu ứng chuyển tiếp giữa các trang slide, ta dùng tab:",
      options: ["Animations", "Transitions", "Slide Show", "Design"],
      correctIndex: 1,
      answer: "Transitions",
      explanation: "Transitions dùng để tạo hiệu ứng chuyển cảnh từ slide này sang slide khác."
    },
    {
      id: "q_g7_3",
      level: "Expert",
      type: "choice",
      question: "Khi soạn thảo văn bản trong Word, để thụt dòng đầu tiên của đoạn văn tự động, em dùng công cụ:",
      options: ["Phím Spacebar 5 lần", "First Line Indent trên thước đo Ruler", "Nhấp phím Tab 2 lần", "Căn lề đều hai bên (Justify)"],
      correctIndex: 1,
      answer: "First Line Indent trên thước đo Ruler",
      explanation: "First Line Indent trên thanh thước là cách chuẩn nhất để thụt lề dòng đầu của các đoạn văn."
    },

    // Khối 8 (Grade 8) Questions
    {
      id: "q_g8_1",
      level: "Expert",
      type: "choice",
      question: "Hành vi nào dưới đây được coi là bắt nạt trên mạng (Cyberbullying)?",
      options: ["Gửi email chúc mừng sinh nhật bạn", "Chia sẻ bài viết học tập bổ ích", "Đăng tải thông tin sai sự thật hoặc bôi nhọ người khác trên mạng xã hội", "Nhắn tin hỏi bài tập về nhà"],
      correctIndex: 2,
      answer: "Đăng tải thông tin sai sự thật hoặc bôi nhọ người khác trên mạng xã hội",
      explanation: "Việc sử dụng công nghệ số để bôi nhọ, đe dọa hay quấy rối người khác chính là bắt nạt trên mạng."
    },
    {
      id: "q_g8_2",
      level: "Expert",
      type: "choice",
      question: "Dịch vụ lưu trữ đám mây nào sau đây của Google?",
      options: ["OneDrive", "Dropbox", "Google Drive", "iCloud"],
      correctIndex: 2,
      answer: "Google Drive",
      explanation: "Google Drive là dịch vụ lưu trữ đám mây do Google cung cấp."
    },
    {
      id: "q_g8_3",
      level: "Expert",
      type: "choice",
      question: "Trong an ninh mạng, tường lửa (Firewall) được thiết lập để làm gì?",
      options: ["Chống bụi và làm mát thiết bị", "Ngăn chặn truy cập trái phép từ bên ngoài vào hệ thống", "Tự động tắt máy khi quá tải", "Tăng tốc độ kết nối mạng LAN"],
      correctIndex: 1,
      answer: "Ngăn chặn truy cập trái phép từ bên ngoài vào hệ thống",
      explanation: "Tường lửa kiểm soát và lọc lưu lượng mạng ra vào để ngăn chặn các truy cập trái phép."
    }
  ];

  // Grade Tests definitions
  const gradeTests = [];
  
  // Generating Ôn tập 1, 2, 3 for Grades 3 to 8
  const grades = [3, 4, 5, 6, 7, 8];
  
  grades.forEach(g => {
    const blockId = `block_${g}`;
    const level = g <= 4 ? "Beginner" : g <= 6 ? "Explorer" : "Expert";
    
    if (g === 6) {
      // Test 1 - Khối 6
      gradeTests.push({
        id: "test_g6_ot1",
        title: "Ôn tập 1 - Khối 6",
        level: level,
        blockId: blockId,
        duration: 20,
        questionCount: 15,
        questions: Array.from({ length: 15 }, (_, i) => `q_g6_ot1_${i + 1}`),
        scoreVal: 100,
        createdBY: "admin@gmail.com"
      });

      // Test 2 - Khối 6
      gradeTests.push({
        id: "test_g6_ot2",
        title: "Ôn tập 2 - Khối 6",
        level: level,
        blockId: blockId,
        duration: 20,
        questionCount: 15,
        questions: Array.from({ length: 15 }, (_, i) => `q_g6_ot2_${i + 1}`),
        scoreVal: 100,
        createdBY: "admin@gmail.com"
      });

      // Test 3 - Khối 6
      gradeTests.push({
        id: "test_g6_ot3",
        title: "Ôn tập 3 - Khối 6",
        level: level,
        blockId: blockId,
        duration: 20,
        questionCount: 15,
        questions: Array.from({ length: 15 }, (_, i) => `q_g6_ot3_${i + 1}`),
        scoreVal: 100,
        createdBY: "admin@gmail.com"
      });
    } else {
      // Test 1
      gradeTests.push({
        id: `test_g${g}_ot1`,
        title: `Ôn tập 1 - Khối ${g}`,
        level: level,
        blockId: blockId,
        duration: 15,
        questionCount: 2,
        questions: [`q_g${g}_1`, `q_g${g}_2`],
        scoreVal: 30,
        createdBY: "admin@gmail.com"
      });

      // Test 2
      gradeTests.push({
        id: `test_g${g}_ot2`,
        title: `Ôn tập 2 - Khối ${g}`,
        level: level,
        blockId: blockId,
        duration: 20,
        questionCount: 2,
        questions: [`q_g${g}_2`, `q_g${g}_3`],
        scoreVal: 40,
        createdBY: "admin@gmail.com"
      });

      // Test 3
      gradeTests.push({
        id: `test_g${g}_ot3`,
        title: `Ôn tập 3 - Khối ${g}`,
        level: level,
        blockId: blockId,
        duration: 25,
        questionCount: 2,
        questions: [`q_g${g}_3`, `q_g${g}_1`],
        scoreVal: 50,
        createdBY: "admin@gmail.com"
      });
    }
  });

  try {
    for (const q of gradeQuestions) {
      await setDoc(doc(db, IC3_KEYS.QUESTIONS, q.id), q);
    }
    for (const t of gradeTests) {
      await setDoc(doc(db, IC3_KEYS.TESTS, t.id), t);
    }
    console.log("✅ Seeded grade-level specific questions and tests successfully!");
  } catch (error) {
    console.error("❌ Error seeding grade-level tests:", error);
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

    // Explicitly check for grade-level specific tests; seed if missing!
    const hasGradeTests = window.IC3_CACHE[IC3_KEYS.TESTS].some(t => t.id === "test_g3_ot1");
    const testG6 = window.IC3_CACHE[IC3_KEYS.TESTS].find(t => t.id === "test_g6_ot1");
    const needsG6Upgrade = !testG6 || (testG6.questions && testG6.questions.length < 15);

    if (!hasGradeTests || needsG6Upgrade) {
      console.log("🌱 Grade-level tests missing or Grade 6 needs upgrading, seeding Khối 3,4,5,6,7,8 tests now...");
      await seedGradeLevelTests();
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

