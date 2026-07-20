console.log("script.js v2 loaded");
// Cổng Luyện Thi Học Sinh - IC3 LMS script.js

// 1. App State
let currentStudent = null;
let activePlayingTest = null;
let testQuestions = [];
let activeQuestionIndex = 0;

// Mode variables
let currentTestMode = "practice"; // "practice" or "exam"
let isReviewingExam = false;

// User inputs during active test
let userAnswers = []; // For practice mode: list of checked answers
let examUserAnswers = []; // For exam mode: pre-allocated size
let currentSelectedAnswer = ""; // Temp selected answer for current question
let isAnswerChecked = false; // For practice mode: tracks if checked

// Stats and Timers
let correctAnswersCount = 0;
let remainingSeconds = 0;
let testTimerInterval = null;
let testStartTime = null;

// Caches & sheet records
let cachedSheetStudents = [];
let blockFilterValue = "all";
let testSearchQuery = "";

// 2. Drive URL Conversion helper
function convertDriveUrl(url) {
  if (!url || typeof url !== "string") return url || "";
  let fileId = "";
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  } else if (url.includes("drive.google.com/open?id=")) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  } else if (url.includes("docs.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  }
  
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

// 3. App Initialization
document.addEventListener("DOMContentLoaded", () => {
  if (window.IC3_DB_INITIALIZED) {
    initEduApp();
  } else {
    window.addEventListener('ic3-db-ready', initEduApp);
  }
});

async function initEduApp() {
  const isAuthed = await checkStudentAuth();
  
  if (isAuthed) {
    hideGlobalLoader();
    setupDashboardRealtime();
    renderStudentDashboard();
    switchTab("tests");
    startClock();
  } else {
    await setupLoginScreen();
    hideGlobalLoader();
  }
}

function hideGlobalLoader() {
  const loader = document.getElementById("edu-app-loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showGlobalLoader(message = "Đang tải...") {
  const loader = document.getElementById("edu-app-loader");
  if (loader) {
    const text = loader.querySelector("p");
    if (text) text.innerText = message;
    loader.classList.remove("hidden");
  }
}

// 4. Authentication check
async function checkStudentAuth() {
  try {
    const userStr = localStorage.getItem("ic3_current_user");
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    if (!user || !user.email) return false;
    
    // Find student in Firestore cache
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const found = students.find(s => s.email === user.email);
    
    if (found) {
      currentStudent = found;
      
      // Sync names in DOM
      document.getElementById("headerStudentName").innerText = currentStudent.name || "Học sinh";
      const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
      const studentClass = classes.find(c => c.id === currentStudent.classId);
      document.getElementById("headerStudentClass").innerText = studentClass ? `${studentClass.name} • ${studentClass.school || "Trường học"}` : "Chưa phân lớp";
      
      return true;
    }
  } catch (err) {
    console.error("Error verifying student credentials:", err);
  }
  return false;
}

// 5. Login setup using existing sheet integration
async function setupLoginScreen() {
  document.getElementById("screen-auth").classList.remove("hidden");
  document.getElementById("screen-dashboard").classList.add("hidden");
  
  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) {
      showLoginError("Hệ thống Google Sheet chưa được thiết lập. Vui lòng liên hệ Giáo viên.");
      return;
    }
    
    const studentSheetName = config.studentSheetName || "Học sinh";
    const data = await window.fetchGoogleSheetData(config.spreadsheetId, studentSheetName);
    
    if (!data || data.length === 0) {
      showLoginError("Không tìm thấy học sinh nào trong trang tính.");
      return;
    }
    
    cachedSheetStudents = data;
    
    // Populate schools list
    const schools = [...new Set(data.map(s => s.school).filter(Boolean))];
    const schoolSelect = document.getElementById("sheetSchoolSelect");
    schoolSelect.innerHTML = '<option value="">-- Chọn trường học --</option>';
    schools.forEach(sch => {
      schoolSelect.innerHTML += `<option value="${sch}">${sch}</option>`;
    });
    
    // Setup login submission
    document.getElementById("eduLoginForm").onsubmit = handleLoginSubmit;
  } catch (err) {
    console.error("Error setting up login parameters:", err);
    showLoginError("Lỗi kết nối cơ sở dữ liệu học sinh!");
  }
}

function showLoginError(msg) {
  const alertBox = document.getElementById("loginErrorAlert");
  const msgEl = document.getElementById("loginErrorMessage");
  alertBox.classList.remove("hidden");
  msgEl.innerText = msg;
}

window.onSchoolChange = function() {
  const schoolSelect = document.getElementById("sheetSchoolSelect");
  const classSelect = document.getElementById("sheetClassSelect");
  const studentSelect = document.getElementById("sheetStudentSelect");
  
  const chosenSchool = schoolSelect.value;
  classSelect.innerHTML = '<option value="">-- Chọn lớp học --</option>';
  studentSelect.innerHTML = '<option value="">-- Chọn học sinh --</option>';
  studentSelect.disabled = true;
  studentSelect.classList.add("cursor-not-allowed");
  
  if (!chosenSchool) {
    classSelect.disabled = true;
    classSelect.classList.add("cursor-not-allowed");
    return;
  }
  
  // Find classes of this school
  const schoolStudents = cachedSheetStudents.filter(s => s.school === chosenSchool);
  const classes = [...new Set(schoolStudents.map(s => s.className).filter(Boolean))];
  
  classes.forEach(cName => {
    classSelect.innerHTML += `<option value="${cName}">${cName}</option>`;
  });
  
  classSelect.disabled = false;
  classSelect.classList.remove("cursor-not-allowed");
};

window.onClassChange = function() {
  const schoolSelect = document.getElementById("sheetSchoolSelect");
  const classSelect = document.getElementById("sheetClassSelect");
  const studentSelect = document.getElementById("sheetStudentSelect");
  
  const chosenSchool = schoolSelect.value;
  const chosenClass = classSelect.value;
  
  studentSelect.innerHTML = '<option value="">-- Chọn học sinh --</option>';
  
  if (!chosenClass) {
    studentSelect.disabled = true;
    studentSelect.classList.add("cursor-not-allowed");
    return;
  }
  
  const matchingStudents = cachedSheetStudents.filter(s => s.school === chosenSchool && s.className === chosenClass);
  
  matchingStudents.forEach(st => {
    studentSelect.innerHTML += `<option value="${st.rowIndex}">${st.name}</option>`;
  });
  
  studentSelect.disabled = false;
  studentSelect.classList.remove("cursor-not-allowed");
};

window.togglePasswordVisibility = function() {
  const pwdInput = document.getElementById("sheetPassword");
  const icon = document.getElementById("passwordToggleIcon");
  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  } else {
    pwdInput.type = "password";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
};

async function handleLoginSubmit(e) {
  e.preventDefault();
  const school = document.getElementById("sheetSchoolSelect").value;
  const className = document.getElementById("sheetClassSelect").value;
  const rowIndex = parseInt(document.getElementById("sheetStudentSelect").value);
  const password = document.getElementById("sheetPassword").value;
  
  const submitBtn = document.getElementById("submitLoginBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Đang xác thực...';
  
  try {
    const studentObj = cachedSheetStudents.find(s => s.rowIndex === rowIndex);
    if (!studentObj) {
      showLoginError("Thông tin học sinh không hợp lệ!");
      resetSubmitButton();
      return;
    }
    
    // Call existing Sheets integration auth function from global scope
    const authResult = await window.loginStudentWithGoogleSheet({
      school,
      className,
      rowIndex,
      email: studentObj.email,
      name: studentObj.name,
      password: password
    });
    
    if (authResult && authResult.success) {
      // Reload UI
      document.getElementById("screen-auth").classList.add("hidden");
      await initEduApp();
    } else {
      showLoginError(authResult ? authResult.message : "Mật khẩu không chính xác!");
      resetSubmitButton();
    }
  } catch (err) {
    console.error("Login verification failed:", err);
    showLoginError("Lỗi hệ thống trong lúc đăng nhập!");
    resetSubmitButton();
  }
}

function resetSubmitButton() {
  const btn = document.getElementById("submitLoginBtn");
  btn.disabled = false;
  btn.innerHTML = 'Đăng nhập hệ thống <i class="fa-solid fa-right-to-bracket"></i>';
}

window.handleLogout = function() {
  Swal.fire({
    title: 'Xác nhận đăng xuất?',
    text: 'Bạn sẽ quay về màn hình lựa chọn học sinh.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563EB',
    cancelButtonColor: '#64748B',
    confirmButtonText: 'Đồng ý',
    cancelButtonText: 'Hủy'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("ic3_current_user");
      currentStudent = null;
      window.location.reload();
    }
  });
};

// 6. Realtime & Sync Hooking
function setupDashboardRealtime() {
  // Listen for database updates to refresh views automatically
  window.addEventListener('ic3-students-updated', () => {
    checkStudentAuth().then(() => {
      renderStudentDashboard();
    });
  });
  
  window.addEventListener('ic3-scores-updated', () => {
    renderStudentDashboard();
  });
}

function startClock() {
  const updateTime = () => {
    const clockEl = document.getElementById("currentTimeDisplay");
    if (clockEl) {
      const now = new Date();
      clockEl.innerText = now.toLocaleString('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  };
  setInterval(updateTime, 1000);
  updateTime();
}

// 7. Dashboard rendering & Tab Navigation
window.switchTab = function(tabName) {
  // Set tab buttons active status
  const tabs = ["tests", "history", "leaderboard"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn-${t}`);
    const content = document.getElementById(`tab-content-${t}`);
    
    if (t === tabName) {
      btn.className = "border-b-2 border-blue-600 text-blue-600 py-4 px-1 text-sm font-bold flex items-center gap-2";
      content.classList.remove("hidden");
    } else {
      btn.className = "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-semibold flex items-center gap-2";
      content.classList.add("hidden");
    }
  });
  
  // Call sub-renders
  if (tabName === "tests") {
    renderTestsList(blockFilterValue, testSearchQuery);
  } else if (tabName === "history") {
    renderScoresHistory();
  } else if (tabName === "leaderboard") {
    renderLeaderboard();
  }
};

function renderStudentDashboard() {
  if (!currentStudent) return;
  
  // Greeting name
  document.getElementById("welcomeGreeting").innerText = `Chào mừng, ${currentStudent.name}!`;
  
  // Calculations for stats
  const allScores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  const myScores = allScores.filter(s => s.studentEmail === currentStudent.email);
  
  document.getElementById("statCompletedTests").innerText = myScores.length;
  
  if (myScores.length > 0) {
    const avgRate = Math.round(myScores.reduce((acc, s) => acc + (s.score || 0), 0) / myScores.length);
    document.getElementById("statAvgCorrectRate").innerText = `${avgRate}%`;
  } else {
    document.getElementById("statAvgCorrectRate").innerText = "0%";
  }
}

// 8. Filters and Search on available tests
window.filterByBlock = function(blockId) {
  blockFilterValue = blockId;
  document.querySelectorAll(".block-filter-btn").forEach(btn => {
    btn.className = "block-filter-btn px-4 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200";
  });
  
  // Style the active button
  event.currentTarget.className = "block-filter-btn px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm border border-transparent";
  renderTestsList(blockFilterValue, testSearchQuery);
};

window.handleTestSearch = function() {
  testSearchQuery = document.getElementById("testSearchInput").value.trim().toLowerCase();
  renderTestsList(blockFilterValue, testSearchQuery);
};

function renderTestsList(blockId = "all", query = "") {
  const container = document.getElementById("testsContainerGrid");
  const emptyState = document.getElementById("testsEmptyState");
  container.innerHTML = "";
  
  const allTests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const allScores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  
  // Filter by block
  let filtered = allTests;
  if (blockId !== "all") {
    filtered = allTests.filter(t => t.blockId === blockId || t.level === blockId);
  }
  
  // Filter by query
  if (query) {
    filtered = filtered.filter(t => t.name && t.name.toLowerCase().includes(query));
  }
  
  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  
  filtered.forEach(test => {
    // Attempt statistics calculation (personal vs all)
    const personalAttempts = allScores.filter(s => s.testId === test.id && s.studentEmail === currentStudent.email);
    const globalAttempts = allScores.filter(s => s.testId === test.id);
    
    // Map class names based on blocks
    const blockLabels = {
      block_3: "Khối 3", block_4: "Khối 4", block_5: "Khối 5", block_6: "Khối 6", block_7: "Khối 7", block_8: "Khối 8"
    };
    const blockText = blockLabels[test.blockId] || test.level || "Tự do";
    
    const card = document.createElement("div");
    card.className = "bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden";
    
    card.innerHTML = `
      <div class="space-y-3">
        <!-- Badge row -->
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-lg uppercase tracking-wider">${blockText}</span>
          <span class="text-xs font-medium text-gray-400 flex items-center gap-1"><i class="fa-solid fa-list-check"></i> ${test.questions ? test.questions.length : 0} câu hỏi</span>
        </div>
        
        <!-- Header details -->
        <h4 class="font-extrabold text-gray-900 text-base leading-tight tracking-tight">${test.name || "Bộ đề thi ôn tập"}</h4>
        <p class="text-xs text-gray-400 line-clamp-2">${test.description || "Hãy kiểm tra kiến thức của mình thông qua bộ đề ôn tập chứng chỉ IC3."}</p>
      </div>

      <!-- Attempt statistics counts -->
      <div class="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between text-xs">
        <div class="text-left">
          <span class="text-[9px] font-bold text-gray-400 block uppercase">Bạn đã làm</span>
          <span class="font-bold text-gray-700">${personalAttempts.length} lần</span>
        </div>
        <div class="h-6 w-px bg-gray-200"></div>
        <div class="text-right">
          <span class="text-[9px] font-bold text-gray-400 block uppercase">Hệ thống</span>
          <span class="font-bold text-blue-600">${globalAttempts.length} lượt thi</span>
        </div>
      </div>
      
      <!-- Action Buttons footer -->
      <div class="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <button onclick="handleStartTest('${test.id}', 'practice')" class="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors">
          <i class="fa-solid fa-graduation-cap text-[10px]"></i> Ôn Tập
        </button>
        <button onclick="handleStartTest('${test.id}', 'exam')" class="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm shadow-blue-500/10 transition-colors">
          <i class="fa-solid fa-stopwatch text-[10px]"></i> Kiểm Tra
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// 9. Results history table rendering
function renderScoresHistory() {
  const tbody = document.getElementById("historyTableBody");
  const emptyState = document.getElementById("historyEmptyState");
  const countBadge = document.getElementById("historyCountBadge");
  
  tbody.innerHTML = "";
  
  const allTests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const allScores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  
  // Filter for scores belonging to current student
  const filtered = allScores.filter(s => s.studentEmail === currentStudent.email);
  
  countBadge.innerText = `${filtered.length} bài đã làm`;
  
  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  
  // Sort history by completedAt descending
  const sorted = [...filtered].sort((a, b) => {
    return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
  });
  
  sorted.forEach((scoreEntry, index) => {
    const matchingTest = allTests.find(t => t.id === scoreEntry.testId);
    const testTitle = matchingTest ? matchingTest.name : "Đề thi đã bị xóa";
    const modeLabel = scoreEntry.mode === "exam" ? "Kiểm tra ⏱️" : "Luyện tập 📖";
    const modeClass = scoreEntry.mode === "exam" ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-emerald-600 bg-emerald-50 border-emerald-100";
    
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition-colors";
    
    tr.innerHTML = `
      <td class="p-5 font-bold text-gray-400 text-xs">${index + 1}</td>
      <td class="p-5">
        <span class="font-extrabold text-gray-900 block leading-tight">${testTitle}</span>
        <span class="text-[10px] text-gray-400 block font-medium mt-1">ID: ${scoreEntry.testId}</span>
      </td>
      <td class="p-5">
        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${modeClass}">${modeLabel}</span>
      </td>
      <td class="p-5">
        <span class="font-black text-gray-900 text-base">${scoreEntry.score}</span><span class="text-gray-300 text-xs">/100</span>
      </td>
      <td class="p-5 font-semibold text-gray-600">${scoreEntry.correctCount || 0}/${scoreEntry.totalCount || 0} câu</td>
      <td class="p-5 font-mono text-xs text-gray-500">${scoreEntry.timeSpent || "00:00"}</td>
      <td class="p-5 font-semibold text-gray-500 text-xs">${scoreEntry.completedAt ? new Date(scoreEntry.completedAt).toLocaleDateString('vi-VN') : "Chưa rõ"}</td>
      <td class="p-5 text-right">
        <button onclick="reviewTest('${scoreEntry.testId}', ${JSON.stringify(scoreEntry).replace(/"/g, '&quot;')})" 
                class="px-3.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-600 hover:text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 inline-flex">
          Xem bài <i class="fa-solid fa-eye text-[9px]"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 10. Leaderboard rendering
function renderLeaderboard() {
  const topPodium = document.getElementById("leaderboardTopThree");
  const rankTableBody = document.getElementById("leaderboardTableBody");
  
  topPodium.innerHTML = "";
  rankTableBody.innerHTML = "";
  
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  
  // Aggregate stats per student
  const leaderboardList = students.map(student => {
    const studentScores = scores.filter(s => s.studentEmail === student.email);
    const totalCorrect = studentScores.reduce((acc, s) => acc + (s.correctCount || 0), 0);
    const avgScore = studentScores.length > 0 
      ? Math.round(studentScores.reduce((acc, s) => acc + (s.score || 0), 0) / studentScores.length) 
      : 0;
      
    return {
      ...student,
      totalCorrect,
      avgScore,
      attemptsCount: studentScores.length
    };
  });
  
  // Sort students: 1. correct questions count descending, 2. average score descending
  leaderboardList.sort((a, b) => {
    if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
    return b.avgScore - a.avgScore;
  });
  
  // Slice top 3 for podium
  const topThree = leaderboardList.slice(0, 3);
  const remaining = leaderboardList.slice(3);
  
  // Map podium indices to visually arrange as: 2nd place, 1st place, 3rd place
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ player: topThree[1], rank: 2, badge: "🥈", color: "border-slate-300 text-slate-500 bg-slate-50" });
  if (topThree[0]) podiumOrder.push({ player: topThree[0], rank: 1, badge: "🥇", color: "border-yellow-300 text-yellow-600 bg-yellow-50" });
  if (topThree[2]) podiumOrder.push({ player: topThree[2], rank: 3, badge: "🥉", color: "border-amber-500 text-amber-700 bg-amber-50" });
  
  podiumOrder.forEach(slot => {
    const p = slot.player;
    const initial = p.name ? p.name.charAt(0).toUpperCase() : "H";
    const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
    const pClass = classes.find(c => c.id === p.classId);
    
    const podEl = document.createElement("div");
    podEl.className = "flex flex-col items-center bg-gray-50/50 border border-gray-100 rounded-3xl p-6 relative shadow-sm";
    
    podEl.innerHTML = `
      <!-- Rank position label -->
      <span class="absolute top-4 left-4 text-2xl">${slot.badge}</span>
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 ${slot.color} mb-3 shadow-md">
        ${initial}
      </div>
      <h4 class="font-extrabold text-gray-900 text-sm tracking-tight text-center truncate w-full">${p.name}</h4>
      <p class="text-[10px] font-semibold text-gray-400 mt-0.5 truncate max-w-[150px]">${pClass ? pClass.name : "Vãng lai"}</p>
      
      <!-- Stats block -->
      <div class="mt-4 pt-4 border-t border-gray-100 w-full grid grid-cols-2 text-center text-xs">
        <div>
          <span class="text-[8px] font-bold text-gray-400 block uppercase">Đáp án đúng</span>
          <span class="font-black text-blue-600">${p.totalCorrect || 0} câu</span>
        </div>
        <div class="border-l border-gray-100">
          <span class="text-[8px] font-bold text-gray-400 block uppercase">Điểm TB</span>
          <span class="font-black text-emerald-500">${p.avgScore || 0}%</span>
        </div>
      </div>
    `;
    topPodium.appendChild(podEl);
  });
  
  // Render remaining students in list
  remaining.forEach((player, idx) => {
    const rank = idx + 4;
    const initial = player.name ? player.name.charAt(0).toUpperCase() : "H";
    const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
    const pClass = classes.find(c => c.id === player.classId);
    
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition-colors";
    
    tr.innerHTML = `
      <td class="p-4 font-black text-gray-400 text-xs">${rank}</td>
      <td class="p-4 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-extrabold text-xs flex items-center justify-center shrink-0 border border-gray-200">
          ${initial}
        </div>
        <span class="font-extrabold text-gray-900">${player.name}</span>
      </td>
      <td class="p-4 font-semibold text-gray-500 text-xs">${pClass ? pClass.name : "Tự do"} • ${pClass ? pClass.school : "Chưa phân trường"}</td>
      <td class="p-4 font-black text-blue-600">${player.totalCorrect || 0} câu</td>
      <td class="p-4 font-black text-emerald-500">${player.avgScore || 0}%</td>
    `;
    rankTableBody.appendChild(tr);
  });
}

// 11. Test runner launching logic
window.handleStartTest = function(testId, mode) {
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const target = tests.find(t => t.id === testId);
  
  if (!target) {
    Swal.fire('Lỗi', 'Không tìm thấy thông tin bộ đề thi!', 'error');
    return;
  }
  
  const modeText = mode === "exam" ? "Kiểm tra ⏱️" : "Luyện tập 📖";
  const desc = mode === "exam" 
    ? `Bài thi có thời gian ${target.duration || 30} phút, không thể sửa câu trả lời sau khi kiểm tra đáp án. Hệ thống sẽ tự động nộp bài khi hết giờ.`
    : "Chế độ luyện tập hỗ trợ kiểm tra đáp án từng câu và xem giải thích chi tiết đáp án.";
    
  Swal.fire({
    title: `Bắt đầu làm bài?`,
    html: `<div class="text-left space-y-2 text-sm text-gray-600">
             <p class="font-bold text-gray-900">Tên đề: ${target.name}</p>
             <p class="font-medium">Chế độ: <span class="text-blue-600 font-bold">${modeText}</span></p>
             <p class="text-xs bg-gray-50 border border-gray-200 p-2.5 rounded-lg">${desc}</p>
           </div>`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#2563EB',
    cancelButtonColor: '#64748B',
    confirmButtonText: 'Đồng ý thi',
    cancelButtonText: 'Quay lại'
  }).then((result) => {
    if (result.isConfirmed) {
      startPlayingTest(target, mode);
    }
  });
};

function startPlayingTest(test, mode) {
  activePlayingTest = test;
  currentTestMode = mode;
  isReviewingExam = false;
  activeQuestionIndex = 0;
  correctAnswersCount = 0;
  testStartTime = new Date();
  
  // 1. Process questions
  const allQuestions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  let testQRefs = test.questions || [];
  
  // Filter questions that belong to this test
  let matchedQuestions = allQuestions.filter(q => testQRefs.includes(q.id));
  
  if (matchedQuestions.length === 0) {
    Swal.fire('Lỗi đề thi', 'Giáo viên chưa thêm câu hỏi nào vào bộ đề này!', 'error');
    return;
  }
  
  // Standard option shuffler from student app
  testQuestions = matchedQuestions.map(originalQ => {
    const clonedQ = JSON.parse(JSON.stringify(originalQ));
    
    // Shuffler only if not table_match/hotspot/fill_blank/drag text
    if (["choice", "multiple_choice", "image_choice", "multi_choice"].includes(clonedQ.type) && Array.isArray(clonedQ.options)) {
      // Map original option and record indices to properly grade after shuffler
      const optionsWithMetadata = clonedQ.options.map((opt, index) => ({
        text: opt,
        originalIndex: index
      }));
      
      // Shuffle
      for (let i = optionsWithMetadata.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithMetadata[i], optionsWithMetadata[j]] = [optionsWithMetadata[j], optionsWithMetadata[i]];
      }
      
      clonedQ.options = optionsWithMetadata.map(item => item.text);
      
      // Re-map correctIndex or correctIndices
      if (clonedQ.type === "choice" || clonedQ.type === "image_choice") {
        clonedQ.correctIndex = optionsWithMetadata.findIndex(item => item.originalIndex === clonedQ.correctIndex);
      } else if (clonedQ.type === "multi_choice" && Array.isArray(clonedQ.correctIndices)) {
        clonedQ.correctIndices = clonedQ.correctIndices.map(oldIdx => 
          optionsWithMetadata.findIndex(item => item.originalIndex === oldIdx)
        );
      }
    }
    
    return clonedQ;
  });
  
  // 2. Pre-allocate answers array
  if (mode === "exam") {
    examUserAnswers = new Array(testQuestions.length).fill("");
  } else {
    userAnswers = [];
  }
  
  isAnswerChecked = false;
  currentSelectedAnswer = "";
  
  // 3. Setup countdown timer
  remainingSeconds = (test.duration || 30) * 60;
  document.getElementById("testingTimerBox").classList.toggle("hidden", mode !== "exam");
  
  if (mode === "exam") {
    startTimer();
  }
  
  // 4. Update Header UI
  document.getElementById("testingTitle").innerText = test.name;
  const modeBadge = document.getElementById("testingModeBadge");
  modeBadge.innerText = mode === "exam" ? "Kiểm tra ⏱️" : "Luyện tập 📖";
  modeBadge.className = mode === "exam" 
    ? "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200"
    : "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200";
    
  // 5. Unhide playing UI overlay
  document.getElementById("screen-testing").classList.remove("hidden");
  
  renderActiveQuestion();
}

// 12. Active Quiz Rendering Center
function renderActiveQuestion() {
  const q = testQuestions[activeQuestionIndex];
  if (!q) return;
  
  currentSelectedAnswer = "";
  
  // Reset navigation status classes in sidebar list
  renderSidebarListGrid();
  
  // Set index indicator
  document.getElementById("testingQCountBadge").innerText = `Câu ${activeQuestionIndex + 1}/${testQuestions.length}`;
  document.getElementById("questIdxCircle").innerText = activeQuestionIndex + 1;
  
  // Update progress bar
  const progressPercent = Math.round((activeQuestionIndex / testQuestions.length) * 100);
  document.getElementById("progressText").innerText = `${progressPercent}%`;
  document.getElementById("progressBarFill").style.width = `${progressPercent}%`;
  document.getElementById("sidebarProgressPercentText").innerText = `Tiến trình làm bài: ${progressPercent}%`;
  document.getElementById("sidebarProgressBarFill").style.width = `${progressPercent}%`;
  
  // Render question text
  document.getElementById("questionBody").innerHTML = q.question;
  
  // Question Image Attachment check
  const imgContainer = document.getElementById("questionImgContainer");
  const qImg = document.getElementById("questionImg");
  if (q.image) {
    qImg.src = convertDriveUrl(q.image);
    imgContainer.classList.remove("hidden");
  } else {
    imgContainer.classList.add("hidden");
    qImg.src = "";
  }
  
  // Clear option container
  const optionsContainer = document.getElementById("questionOptionsContainer");
  optionsContainer.innerHTML = "";
  
  // Hide explanation detail box initially
  document.getElementById("explanationDetailBox").classList.add("hidden");
  
  // Track if current question is already evaluated/answered
  const isQuestionAnswered = currentTestMode === "practice" 
    ? activeQuestionIndex < userAnswers.length 
    : isReviewingExam;
    
  isAnswerChecked = isQuestionAnswered;
  
  // Render based on question type
  const type = q.type || "choice";
  
  if (type === "choice" || type === "true_false") {
    // Single choice options
    let savedAnswerIdx = "";
    if (isQuestionAnswered) {
      savedAnswerIdx = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
    } else if (currentTestMode === "exam") {
      savedAnswerIdx = examUserAnswers[activeQuestionIndex];
    }
    
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = `choice-option-${idx}`;
      
      let optionStateClass = "border-gray-200 hover:bg-gray-50 text-gray-800";
      let iconHtml = "";
      
      const isSelected = savedAnswerIdx !== "" && parseInt(savedAnswerIdx) === idx;
      const isCorrect = idx === q.correctIndex;
      
      if (isQuestionAnswered) {
        if (isCorrect) {
          optionStateClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-extrabold";
          iconHtml = '<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>';
        } else if (isSelected) {
          optionStateClass = "border-red-500 bg-red-50 text-red-700 font-extrabold";
          iconHtml = '<i class="fa-solid fa-circle-xmark text-red-600 text-lg"></i>';
        }
      } else if (isSelected) {
        optionStateClass = "border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold";
        iconHtml = '<i class="fa-solid fa-circle-dot text-blue-600 text-lg"></i>';
      }
      
      btn.className = `option-btn w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center justify-between shadow-sm active:scale-98 transition-all duration-150 ${optionStateClass}`;
      btn.innerHTML = `
        <span class="flex-grow pr-4">${opt}</span>
        <span class="shrink-0">${iconHtml}</span>
      `;
      
      btn.onclick = () => {
        if (isAnswerChecked) return;
        // Clear all selections
        document.querySelectorAll(".option-btn").forEach(el => {
          el.className = "option-btn w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center justify-between shadow-sm active:scale-98 transition-all duration-150 border-gray-200 hover:bg-gray-50 text-gray-800";
          const subIcon = el.querySelector(".shrink-0");
          if (subIcon) subIcon.innerHTML = "";
        });
        
        // Apply selection
        btn.className = "option-btn w-full p-4 sm:p-5 rounded-2xl border text-left font-extrabold text-sm sm:text-base flex items-center justify-between shadow-sm active:scale-98 transition-all duration-150 border-blue-600 bg-blue-50/50 text-blue-700";
        const iconContainer = btn.querySelector(".shrink-0");
        if (iconContainer) iconContainer.innerHTML = '<i class="fa-solid fa-circle-dot text-blue-600 text-lg"></i>';
        
        currentSelectedAnswer = idx;
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = idx;
          updateSidebarGridCircle(activeQuestionIndex, "answered");
        }
      };
      
      optionsContainer.appendChild(btn);
    });
    
    // Show explanation if practice evaluated
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "multi_choice") {
    let savedSelected = [];
    if (isQuestionAnswered) {
      const stored = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
      try {
        savedSelected = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedSelected = stored || [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      const stored = examUserAnswers[activeQuestionIndex];
      try {
        savedSelected = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedSelected = stored || [];
      }
    }
    window.multiChoiceSelected = savedSelected;
    
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      
      const isSelected = savedSelected.includes(idx);
      const isCorrect = q.correctIndices.includes(idx);
      
      let optionStateClass = "border-gray-200 hover:bg-gray-50 text-gray-800";
      let boxClass = "w-5 h-5 rounded border border-gray-400 flex items-center justify-center mr-3 shrink-0";
      let boxInner = "";
      
      if (isQuestionAnswered) {
        if (isCorrect) {
          optionStateClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-extrabold";
          boxClass = "w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center mr-3 shrink-0";
          boxInner = '<i class="fa-solid fa-check text-[10px]"></i>';
        } else if (isSelected) {
          optionStateClass = "border-red-500 bg-red-50 text-red-700 font-extrabold";
          boxClass = "w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center mr-3 shrink-0";
          boxInner = '<i class="fa-solid fa-xmark text-[10px]"></i>';
        }
      } else if (isSelected) {
        optionStateClass = "border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold";
        boxClass = "w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center mr-3 shrink-0";
        boxInner = '<i class="fa-solid fa-check text-[10px]"></i>';
      }
      
      btn.className = `w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center shadow-sm active:scale-98 transition-all duration-150 ${optionStateClass}`;
      btn.innerHTML = `
        <span id="multi-check-box-${idx}" class="${boxClass}">${boxInner}</span>
        <span class="flex-grow">${opt}</span>
      `;
      
      btn.onclick = () => {
        if (isAnswerChecked) return;
        const box = document.getElementById(`multi-check-box-${idx}`);
        const idxOf = window.multiChoiceSelected.indexOf(idx);
        
        if (idxOf !== -1) {
          window.multiChoiceSelected.splice(idxOf, 1);
          btn.className = "w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center shadow-sm active:scale-98 transition-all duration-150 border-gray-200 hover:bg-gray-50 text-gray-800";
          box.innerHTML = "";
          box.className = "w-5 h-5 rounded border border-gray-400 flex items-center justify-center mr-3 shrink-0";
        } else {
          window.multiChoiceSelected.push(idx);
          btn.className = "w-full p-4 sm:p-5 rounded-2xl border text-left font-extrabold text-sm sm:text-base flex items-center shadow-sm active:scale-98 transition-all duration-150 border-blue-600 bg-blue-50/50 text-blue-700";
          box.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i>';
          box.className = "w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center mr-3 shrink-0";
        }
        
        currentSelectedAnswer = JSON.stringify(window.multiChoiceSelected);
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
          updateSidebarGridCircle(activeQuestionIndex, window.multiChoiceSelected.length > 0 ? "answered" : "unanswered");
        }
      };
      
      optionsContainer.appendChild(btn);
    });
    
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "image_choice") {
    let savedAnswerIdx = "";
    if (isQuestionAnswered) {
      savedAnswerIdx = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
    } else if (currentTestMode === "exam") {
      savedAnswerIdx = examUserAnswers[activeQuestionIndex];
    }
    
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-4 w-full";
    
    q.options.forEach((optImgUrl, idx) => {
      const card = document.createElement("div");
      
      let borderClass = "border-gray-200 hover:border-blue-300";
      let badgeClass = "hidden";
      let badgeText = "";
      
      const isSelected = savedAnswerIdx !== "" && parseInt(savedAnswerIdx) === idx;
      const isCorrect = idx === q.correctIndex;
      
      if (isQuestionAnswered) {
        if (isCorrect) {
          borderClass = "border-emerald-500 bg-emerald-50/50";
          badgeClass = "absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeText = "✓";
        } else if (isSelected) {
          borderClass = "border-red-500 bg-red-50/50";
          badgeClass = "absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeText = "✗";
        }
      } else if (isSelected) {
        borderClass = "border-blue-600 bg-blue-50/30";
        badgeClass = "absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md";
        badgeText = "✓";
      }
      
      card.className = `relative p-5 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${borderClass}`;
      card.innerHTML = `
        <img src="${convertDriveUrl(optImgUrl)}" referrerPolicy="no-referrer" class="h-24 w-auto object-contain mb-3" alt="Lựa chọn">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lựa chọn ${idx + 1}</span>
        <div id="image-choice-badge-${idx}" class="${badgeClass}">${badgeText}</div>
      `;
      
      card.onclick = () => {
        if (isAnswerChecked) return;
        document.querySelectorAll(".image-choice-card").forEach(el => {
          el.className = "relative p-5 rounded-2xl border-2 border-gray-200 hover:border-blue-300 flex flex-col items-center justify-center cursor-pointer transition-all";
        });
        document.querySelectorAll("[id^='image-choice-badge-']").forEach(el => {
          el.className = "hidden";
        });
        
        card.className = "relative p-5 rounded-2xl border-2 border-blue-600 bg-blue-50/30 flex flex-col items-center justify-center cursor-pointer transition-all";
        const badge = document.getElementById(`image-choice-badge-${idx}`);
        badge.className = "absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md";
        badge.innerText = "✓";
        
        currentSelectedAnswer = idx;
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = idx;
          updateSidebarGridCircle(activeQuestionIndex, "answered");
        }
      };
      
      grid.appendChild(card);
    });
    
    optionsContainer.appendChild(grid);
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "fill_blank") {
    let savedVal = "";
    if (isQuestionAnswered) {
      savedVal = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
    } else if (currentTestMode === "exam") {
      savedVal = examUserAnswers[activeQuestionIndex] || "";
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-3";
    
    let evaluationClass = "border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
    let isCorrect = false;
    
    if (isQuestionAnswered) {
      isCorrect = savedVal.trim().toLowerCase() === q.answer.trim().toLowerCase();
      evaluationClass = isCorrect ? "border-emerald-500 bg-emerald-50/40 text-emerald-700" : "border-red-500 bg-red-50/40 text-red-700";
    }
    
    wrapper.innerHTML = `
      <input type="text" id="blank-input" placeholder="Gõ câu trả lời của bạn vào đây..." value="${savedVal}" ${isQuestionAnswered ? "disabled" : ""}
        class="w-full bg-gray-50 border-2 rounded-2xl px-5 py-4 font-bold text-sm sm:text-base focus:outline-none transition-all ${evaluationClass}">
    `;
    
    // Bind change listener
    setTimeout(() => {
      const input = document.getElementById("blank-input");
      if (input) {
        input.oninput = (e) => {
          currentSelectedAnswer = e.target.value;
          if (currentTestMode === "exam") {
            examUserAnswers[activeQuestionIndex] = e.target.value;
            updateSidebarGridCircle(activeQuestionIndex, e.target.value.trim() ? "answered" : "unanswered");
          }
        };
      }
    }, 50);
    
    if (isQuestionAnswered) {
      if (!isCorrect) {
        const correctInfo = document.createElement("div");
        correctInfo.className = "p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-100";
        correctInfo.innerHTML = `<i class="fa-solid fa-circle-check text-base text-emerald-600"></i> Đáp án đúng là: <span class="underline">${q.answer}</span>`;
        wrapper.appendChild(correctInfo);
      }
      if (q.explanation) {
        showExplanationBox(q.explanation);
      }
    }
    
    optionsContainer.appendChild(wrapper);
    
  } else if (type === "drag_text") {
    let savedAnswers = new Array(q.rows.length).fill("");
    if (isQuestionAnswered) {
      const stored = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || new Array(q.rows.length).fill("");
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      const stored = examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || new Array(q.rows.length).fill("");
      }
    }
    window.draggedTextAnswers = savedAnswers;
    
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-4 w-full";
    
    let rowsHtml = `<div class="space-y-3">`;
    q.rows.forEach((row, rIdx) => {
      const placed = savedAnswers[rIdx];
      const correct = q.correctAnswers[rIdx];
      
      let slotClass = "border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500 font-bold text-xs";
      let slotText = "Nhấp thẻ từ bên dưới...";
      let tipHtml = "";
      
      if (isQuestionAnswered) {
        if (placed === correct) {
          slotClass = "border border-emerald-500 bg-emerald-50 text-emerald-700 font-black text-xs";
          slotText = placed;
        } else {
          slotClass = "border border-red-500 bg-red-50 text-red-700 font-black text-xs";
          slotText = placed || "(Còn trống)";
          tipHtml = `<span class="block text-xs font-bold text-emerald-600 mt-1.5"><i class="fa-solid fa-circle-check"></i> Đúng: ${correct}</span>`;
        }
      } else if (placed) {
        slotClass = "border border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold text-xs";
        slotText = placed;
      }
      
      rowsHtml += `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 gap-3">
          <span class="text-sm font-semibold text-gray-800 flex-1 break-words">${row}</span>
          <div class="shrink-0 w-full sm:w-auto">
            <div id="drag-text-target-${rIdx}" onclick="clearDraggedText(${rIdx})" 
                 class="${slotClass} w-full sm:w-56 min-h-12 flex items-center justify-center rounded-xl p-2.5 cursor-pointer text-center break-words">
              ${slotText}
            </div>
            ${tipHtml}
          </div>
        </div>
      `;
    });
    rowsHtml += `</div>`;
    
    let poolHtml = "";
    if (!isQuestionAnswered) {
      window.currentDragOptions = q.options;
      poolHtml = `
        <div class="p-4 rounded-2xl bg-gray-50 border border-gray-200 mt-4">
          <span class="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-2.5">Thẻ từ khóa có sẵn (nhấp chọn):</span>
          <div class="flex flex-wrap gap-2" id="drag-text-pool">
            ${q.options.map((opt, idx) => {
              const isUsed = savedAnswers.includes(opt);
              const disabledClass = isUsed ? " opacity-30 pointer-events-none" : "";
              return `
                <button id="drag-text-pool-btn-${idx}" onclick="placeDraggedText(${idx})" 
                        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 duration-100 ${disabledClass}">
                  ${opt}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    
    wrapper.innerHTML = rowsHtml + poolHtml;
    optionsContainer.appendChild(wrapper);
    
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "drag_image_text") {
    let savedAnswers = new Array(q.leftImages.length).fill("");
    if (isQuestionAnswered) {
      const stored = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || new Array(q.leftImages.length).fill("");
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      const stored = examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || new Array(q.leftImages.length).fill("");
      }
    }
    window.draggedTextAnswers = savedAnswers;
    
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-4 w-full";
    
    let imagesHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
    q.leftImages.forEach((imgUrl, idx) => {
      const placed = savedAnswers[idx];
      const correct = q.correctAnswers[idx];
      
      let slotClass = "border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500 font-bold text-xs";
      let slotText = "Nhấp chọn từ bên dưới...";
      let tipHtml = "";
      
      if (isQuestionAnswered) {
        if (placed === correct) {
          slotClass = "border border-emerald-500 bg-emerald-50 text-emerald-700 font-black text-xs";
          slotText = placed;
        } else {
          slotClass = "border border-red-500 bg-red-50 text-red-700 font-black text-xs";
          slotText = placed || "(Còn trống)";
          tipHtml = `<span class="block text-xs font-bold text-emerald-600 mt-1.5"><i class="fa-solid fa-circle-check"></i> Đúng: ${correct}</span>`;
        }
      } else if (placed) {
        slotClass = "border border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold text-xs";
        slotText = placed;
      }
      
      imagesHtml += `
        <div class="flex flex-row items-center p-4 rounded-2xl bg-white border border-gray-200 gap-4">
          <img src="${convertDriveUrl(imgUrl)}" referrerPolicy="no-referrer" class="h-16 w-16 object-contain rounded-xl bg-gray-50 p-1 border border-gray-100" alt="Linh kiện">
          <div class="flex-grow">
            <div id="drag-image-target-${idx}" onclick="clearDraggedImageText(${idx})" 
                 class="${slotClass} w-full min-h-11 flex items-center justify-center rounded-xl p-2 cursor-pointer text-center break-words">
              ${slotText}
            </div>
            ${tipHtml}
          </div>
        </div>
      `;
    });
    imagesHtml += `</div>`;
    
    let poolHtml = "";
    if (!isQuestionAnswered) {
      window.currentDragOptions = q.options;
      poolHtml = `
        <div class="p-4 rounded-2xl bg-gray-50 border border-gray-200 mt-4">
          <span class="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-2.5">Thẻ tên gọi phù hợp (nhấp chọn):</span>
          <div class="flex flex-wrap gap-2" id="drag-image-pool">
            ${q.options.map((opt, idx) => {
              const isUsed = savedAnswers.includes(opt);
              const disabledClass = isUsed ? " opacity-30 pointer-events-none" : "";
              return `
                <button id="drag-image-pool-btn-${idx}" onclick="placeDraggedImageText(${idx})" 
                        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 duration-100 ${disabledClass}">
                  ${opt}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    
    wrapper.innerHTML = imagesHtml + poolHtml;
    optionsContainer.appendChild(wrapper);
    
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "table_match") {
    let savedAnswers = [];
    if (isQuestionAnswered) {
      const stored = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      const stored = examUserAnswers[activeQuestionIndex];
      try {
        savedAnswers = typeof stored === "string" ? JSON.parse(stored) : stored;
      } catch (e) {
        savedAnswers = stored || [];
      }
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";
    
    let tableHtml = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <th class="p-4 w-1/2">${q.headers ? q.headers[0] : "Khái niệm"}</th>
            <th class="p-4 w-1/2">${q.headers ? q.headers[1] : "Tính chất ghép nối"}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
    `;
    
    q.rows.forEach((row, rIdx) => {
      const placedIdx = savedAnswers[rIdx];
      const correctIdx = q.correctAnswers[rIdx];
      
      let selectClass = "w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl p-2.5 outline-none transition-all cursor-pointer";
      let disabledAttr = "";
      let tipHtml = "";
      
      if (isQuestionAnswered) {
        disabledAttr = "disabled";
        if (parseInt(placedIdx) === correctIdx) {
          selectClass = "w-full bg-emerald-50 border border-emerald-400 text-emerald-700 text-xs font-bold rounded-xl p-2.5 outline-none transition-all";
        } else {
          selectClass = "w-full bg-red-50 border border-red-400 text-red-700 text-xs font-bold rounded-xl p-2.5 outline-none transition-all";
          tipHtml = `<span class="block text-xs font-bold text-emerald-600 mt-1"><i class="fa-solid fa-circle-check"></i> Đúng: ${q.options[correctIdx]}</span>`;
        }
      } else if (placedIdx !== undefined && placedIdx !== "") {
        selectClass = "w-full bg-blue-50/50 border border-blue-500 text-blue-700 text-xs font-bold rounded-xl p-2.5 outline-none transition-all cursor-pointer";
      }
      
      tableHtml += `
        <tr>
          <td class="p-4 text-xs sm:text-sm font-semibold text-gray-700 break-words">${row}</td>
          <td class="p-4">
            <select id="table-match-select-${rIdx}" onchange="changeTableMatchSelect(${rIdx})" ${disabledAttr}
                    class="${selectClass}">
              <option value="">-- Chọn đáp án --</option>
              ${q.options.map((opt, oIdx) => {
                const isSelected = placedIdx !== undefined && placedIdx !== "" && parseInt(placedIdx) === oIdx;
                return `
                  <option value="${oIdx}" ${isSelected ? "selected" : ""}>${opt}</option>
                `;
              }).join("")}
            </select>
            ${tipHtml}
          </td>
        </tr>
      `;
    });
    
    tableHtml += `
        </tbody>
      </table>
    `;
    
    wrapper.innerHTML = tableHtml;
    optionsContainer.appendChild(wrapper);
    
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
    
  } else if (type === "hotspot") {
    window.hotspotClicks = [];
    if (isQuestionAnswered) {
      const stored = currentTestMode === "practice" ? userAnswers[activeQuestionIndex] : examUserAnswers[activeQuestionIndex];
      try {
        window.hotspotClicks = typeof stored === "string" ? JSON.parse(stored) : (stored || []);
      } catch (e) {
        window.hotspotClicks = [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      const stored = examUserAnswers[activeQuestionIndex];
      try {
        window.hotspotClicks = typeof stored === "string" ? JSON.parse(stored) : (stored || []);
      } catch (e) {
        window.hotspotClicks = [];
      }
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-3 w-full";
    
    wrapper.innerHTML = `
      <div class="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs">
        <div class="text-gray-500 font-semibold">Nhấp vào <span class="font-extrabold text-blue-600">${q.requiredCount || 1}</span> vị trí tương ứng trên ảnh:</div>
        <button type="button" onclick="window.clearHotspots()" ${isQuestionAnswered ? "disabled" : ""}
          class="text-xs text-red-500 hover:text-white border border-red-200 hover:bg-red-500 rounded-lg px-2.5 py-1 font-bold transition-all disabled:opacity-30 disabled:pointer-events-none">Xóa hết</button>
      </div>
      <div id="student-hotspot-container" class="relative inline-block border border-gray-200 rounded-2xl bg-gray-100 max-w-full overflow-hidden self-center" style="cursor: crosshair;">
        <img id="student-hotspot-img" src="${convertDriveUrl(q.imageUrl)}" style="max-width: 100%; display: block;" draggable="false" alt="Hotspot">
        <div id="student-hotspot-overlay" class="absolute inset-0"></div>
      </div>
    `;
    optionsContainer.appendChild(wrapper);
    
    // Bind coordinates clicks safely
    setTimeout(() => {
      const overlay = document.getElementById('student-hotspot-overlay');
      if (!overlay) return;
      
      window.clearHotspots = () => {
        window.hotspotClicks = [];
        drawClicks();
        currentSelectedAnswer = [];
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = JSON.stringify(currentSelectedAnswer);
          updateSidebarGridCircle(activeQuestionIndex, "unanswered");
        }
      };
      
      const drawClicks = () => {
        overlay.innerHTML = '';
        window.hotspotClicks.forEach((click, i) => {
          const marker = document.createElement('div');
          marker.className = "absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border border-white bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shadow-md z-10 cursor-pointer";
          marker.style.left = `${click.x}%`;
          marker.style.top = `${click.y}%`;
          marker.innerText = i + 1;
          
          if (!isQuestionAnswered) {
            marker.onclick = (e) => {
              e.stopPropagation();
              window.hotspotClicks.splice(i, 1);
              drawClicks();
            };
          }
          overlay.appendChild(marker);
        });
        
        if (isQuestionAnswered) {
          (q.hotspots || []).forEach(area => {
            const box = document.createElement('div');
            box.className = "absolute border-2 border-emerald-500 bg-emerald-500/10 rounded pointer-events-none z-0";
            box.style.left = `${area.x}%`;
            box.style.top = `${area.y}%`;
            box.style.width = `${area.w}%`;
            box.style.height = `${area.h}%`;
            overlay.appendChild(box);
          });
        }
      };
      
      overlay.onclick = (e) => {
        if (isQuestionAnswered) return;
        const rect = overlay.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        if (window.hotspotClicks.length < (q.requiredCount || 1)) {
          window.hotspotClicks.push({ x, y });
        } else {
          window.hotspotClicks.shift();
          window.hotspotClicks.push({ x, y });
        }
        
        drawClicks();
        currentSelectedAnswer = [...window.hotspotClicks];
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = JSON.stringify(currentSelectedAnswer);
          updateSidebarGridCircle(activeQuestionIndex, "answered");
        }
      };
      
      drawClicks();
    }, 100);
    
    if (isQuestionAnswered && q.explanation) {
      showExplanationBox(q.explanation);
    }
  }
  
  // Render active footer controls
  const btnPrev = document.getElementById("btnPrevQuest");
  const btnNext = document.getElementById("btnNextQuest");
  
  btnPrev.classList.toggle("hidden", activeQuestionIndex === 0);
  
  if (currentTestMode === "practice") {
    if (isAnswerChecked) {
      btnNext.innerHTML = activeQuestionIndex === testQuestions.length - 1 
        ? 'Nộp bài ôn tập <i class="fa-solid fa-flag-checkered ml-1.5"></i>'
        : 'Câu tiếp theo <i class="fa-solid fa-chevron-right ml-1.5"></i>';
      btnNext.className = "px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/10 transition-all active:scale-95";
    } else {
      btnNext.innerHTML = 'Kiểm tra đáp án <i class="fa-solid fa-circle-check ml-1.5"></i>';
      btnNext.className = "px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/10 transition-all active:scale-95";
    }
  } else {
    // Exam mode
    btnNext.innerHTML = activeQuestionIndex === testQuestions.length - 1 
      ? 'Nộp bài thi <i class="fa-solid fa-flag-checkered ml-1.5"></i>'
      : 'Câu tiếp theo <i class="fa-solid fa-chevron-right ml-1.5"></i>';
    btnNext.className = "px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/10 transition-all active:scale-95";
  }
}

function showExplanationBox(text) {
  const box = document.getElementById("explanationDetailBox");
  const desc = document.getElementById("explanationDetailText");
  box.classList.remove("hidden");
  desc.innerText = text;
}

// Interactive helper click handlers for Drag and match types
window.placeDraggedText = function(btnIdx) {
  if (isAnswerChecked) return;
  const text = window.currentDragOptions[btnIdx];
  const emptyIdx = window.draggedTextAnswers.findIndex(ans => !ans);
  
  if (emptyIdx === -1) {
    Swal.fire('Nhắc nhở', 'Tất cả vị trí đã đầy! Click vào ô cũ nếu muốn xóa bỏ.', 'info');
    return;
  }
  
  window.draggedTextAnswers[emptyIdx] = text;
  
  const slot = document.getElementById(`drag-text-target-${emptyIdx}`);
  slot.innerText = text;
  slot.className = "flex items-center justify-center w-full sm:w-56 min-h-12 rounded-xl p-2.5 cursor-pointer text-center break-words border border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold text-xs";
  
  const poolBtn = document.getElementById(`drag-text-pool-btn-${btnIdx}`);
  poolBtn.classList.add("opacity-30", "pointer-events-none");
  slot.dataset.btnIdx = btnIdx;
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
    updateSidebarGridCircle(activeQuestionIndex, "answered");
  }
};

window.clearDraggedText = function(slotIdx) {
  if (isAnswerChecked) return;
  const text = window.draggedTextAnswers[slotIdx];
  if (!text) return;
  
  const slot = document.getElementById(`drag-text-target-${slotIdx}`);
  const btnIdx = slot.dataset.btnIdx;
  
  window.draggedTextAnswers[slotIdx] = "";
  slot.innerText = "Nhấp thẻ từ bên dưới...";
  slot.className = "w-full sm:w-56 min-h-12 flex items-center justify-center rounded-xl p-2.5 cursor-pointer text-center break-words border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500 font-bold text-xs";
  
  if (btnIdx !== undefined) {
    const poolBtn = document.getElementById(`drag-text-pool-btn-${btnIdx}`);
    if (poolBtn) {
      poolBtn.classList.remove("opacity-30", "pointer-events-none");
    }
  }
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
    const anyPlaced = window.draggedTextAnswers.some(t => t);
    updateSidebarGridCircle(activeQuestionIndex, anyPlaced ? "answered" : "unanswered");
  }
};

window.placeDraggedImageText = function(btnIdx) {
  if (isAnswerChecked) return;
  const text = window.currentDragOptions[btnIdx];
  const emptyIdx = window.draggedTextAnswers.findIndex(ans => !ans);
  
  if (emptyIdx === -1) {
    Swal.fire('Nhắc nhở', 'Tất cả vị trí đã đầy! Click vào ô cũ nếu muốn xóa bỏ.', 'info');
    return;
  }
  
  window.draggedTextAnswers[emptyIdx] = text;
  
  const slot = document.getElementById(`drag-image-target-${emptyIdx}`);
  slot.innerText = text;
  slot.className = "w-full min-h-11 flex items-center justify-center rounded-xl p-2 cursor-pointer text-center break-words border border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold text-xs";
  
  const poolBtn = document.getElementById(`drag-image-pool-btn-${btnIdx}`);
  poolBtn.classList.add("opacity-30", "pointer-events-none");
  slot.dataset.btnIdx = btnIdx;
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
    updateSidebarGridCircle(activeQuestionIndex, "answered");
  }
};

window.clearDraggedImageText = function(slotIdx) {
  if (isAnswerChecked) return;
  const text = window.draggedTextAnswers[slotIdx];
  if (!text) return;
  
  const slot = document.getElementById(`drag-image-target-${slotIdx}`);
  const btnIdx = slot.dataset.btnIdx;
  
  window.draggedTextAnswers[slotIdx] = "";
  slot.innerText = "Nhấp chọn từ bên dưới...";
  slot.className = "w-full min-h-11 flex items-center justify-center rounded-xl p-2 cursor-pointer text-center break-words border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500 font-bold text-xs";
  
  if (btnIdx !== undefined) {
    const poolBtn = document.getElementById(`drag-image-pool-btn-${btnIdx}`);
    if (poolBtn) {
      poolBtn.classList.remove("opacity-30", "pointer-events-none");
    }
  }
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
    const anyPlaced = window.draggedTextAnswers.some(t => t);
    updateSidebarGridCircle(activeQuestionIndex, anyPlaced ? "answered" : "unanswered");
  }
};

window.changeTableMatchSelect = function(rIdx) {
  if (isAnswerChecked) return;
  const select = document.getElementById(`table-match-select-${rIdx}`);
  const val = select.value;
  
  // Fetch existing table matching answers array or allocate
  let answers = [];
  if (currentTestMode === "exam") {
    try {
      answers = JSON.parse(examUserAnswers[activeQuestionIndex] || "[]");
    } catch (e) { answers = []; }
  } else {
    // Practice matching
    answers = [...window.draggedTextAnswers];
  }
  
  if (answers.length === 0) {
    answers = new Array(testQuestions[activeQuestionIndex].rows.length).fill("");
  }
  
  answers[rIdx] = val !== "" ? parseInt(val) : "";
  window.draggedTextAnswers = answers;
  
  if (val !== "") {
    select.className = "w-full bg-blue-50/50 border border-blue-500 text-blue-700 text-xs font-bold rounded-xl p-2.5 outline-none transition-all cursor-pointer";
  } else {
    select.className = "w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl p-2.5 outline-none transition-all cursor-pointer";
  }
  
  currentSelectedAnswer = JSON.stringify(answers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
    const anyChosen = answers.some(v => v !== "" && v !== undefined);
    updateSidebarGridCircle(activeQuestionIndex, anyChosen ? "answered" : "unanswered");
  }
};

// 13. Back and Next evaluation navigations
window.handlePrevQuestion = function() {
  if (activeQuestionIndex > 0) {
    activeQuestionIndex--;
    renderActiveQuestion();
  }
};

window.handleNextQuestion = function() {
  const q = testQuestions[activeQuestionIndex];
  
  if (currentTestMode === "practice") {
    if (!isAnswerChecked) {
      // Evaluate practice answer immediately
      if (currentSelectedAnswer === "" && !q.type.includes("drag") && q.type !== "fill_blank" && q.type !== "table_match" && q.type !== "hotspot" && !window.multiChoiceSelected?.length) {
        Swal.fire('Nhắc nhở', 'Vui lòng chọn đáp án trước khi kiểm tra!', 'warning');
        return;
      }
      
      let isCorrect = false;
      const type = q.type || "choice";
      
      if (type === "choice" || type === "true_false" || type === "image_choice") {
        isCorrect = parseInt(currentSelectedAnswer) === q.correctIndex;
        userAnswers.push(currentSelectedAnswer);
      } else if (type === "fill_blank") {
        const val = document.getElementById("blank-input").value;
        isCorrect = val.trim().toLowerCase() === q.answer.trim().toLowerCase();
        userAnswers.push(val);
      } else if (type === "drag_text" || type === "drag_image_text") {
        isCorrect = window.draggedTextAnswers.length === q.correctAnswers.length &&
                    window.draggedTextAnswers.every((val, i) => val === q.correctAnswers[i]);
        userAnswers.push(JSON.stringify(window.draggedTextAnswers));
      } else if (type === "table_match") {
        isCorrect = window.draggedTextAnswers.length === q.correctAnswers.length &&
                    window.draggedTextAnswers.every((val, i) => val === q.correctAnswers[i]);
        userAnswers.push(JSON.stringify(window.draggedTextAnswers));
      } else if (type === "hotspot") {
        let clicks = window.hotspotClicks || [];
        if (clicks.length >= (q.requiredCount || 1)) {
          let allValid = true;
          clicks.forEach(click => {
            let hit = false;
            (q.hotspots || []).forEach(area => {
              if (click.x >= area.x && click.x <= area.x + area.w && click.y >= area.y && click.y <= area.y + area.h) hit = true;
            });
            if (!hit) allValid = false;
          });
          isCorrect = allValid;
        } else {
          isCorrect = false;
        }
        userAnswers.push(JSON.stringify(clicks));
      } else if (type === "multi_choice") {
        const sel = window.multiChoiceSelected || [];
        isCorrect = sel.length === q.correctIndices.length && sel.every(val => q.correctIndices.includes(val));
        userAnswers.push(JSON.stringify(sel));
      }
      
      if (isCorrect) {
        correctAnswersCount++;
        Swal.fire({
          title: 'CHÍNH XÁC! 🎉',
          text: 'Chúc mừng bạn đã trả lời đúng câu hỏi này!',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      } else {
        Swal.fire({
          title: 'SAI MẤT RỒI! ❌',
          text: 'Vui lòng đọc lời giải thích để ôn tập.',
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800
        });
      }
      
      isAnswerChecked = true;
      renderActiveQuestion();
    } else {
      // Answer already evaluated, step forward
      if (activeQuestionIndex < testQuestions.length - 1) {
        activeQuestionIndex++;
        isAnswerChecked = false;
        renderActiveQuestion();
      } else {
        // Nộp bài ôn tập
        submitFinishedExam();
      }
    }
  } else {
    // Exam mode
    if (activeQuestionIndex < testQuestions.length - 1) {
      activeQuestionIndex++;
      renderActiveQuestion();
    } else {
      // Last question of timed exam, show submit prompt
      handleSubmitExam();
    }
  }
};

// 14. Exam timers logic
function startTimer() {
  if (testTimerInterval) clearInterval(testTimerInterval);
  
  const box = document.getElementById("testingTimeCountdown");
  
  const updateTimer = () => {
    if (remainingSeconds <= 0) {
      clearInterval(testTimerInterval);
      Swal.fire({
        title: 'Hết giờ làm bài!',
        text: 'Hệ thống đang tự động tổng hợp kết quả của bạn.',
        icon: 'warning',
        confirmButtonColor: '#2563EB'
      }).then(() => {
        submitFinishedExam();
      });
      return;
    }
    
    remainingSeconds--;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    box.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  testTimerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

window.handleSubmitExam = function() {
  // Count unanswered
  let unanswered = 0;
  if (currentTestMode === "exam") {
    unanswered = examUserAnswers.filter(ans => ans === "" || ans === null || ans === undefined).length;
  }
  
  const htmlStr = unanswered > 0 
    ? `<p class="text-sm text-red-500 font-bold">Bạn vẫn còn ${unanswered} câu hỏi chưa hoàn thiện!</p>` 
    : "<p class='text-sm text-gray-500'>Hãy chắc chắn rằng bạn đã kiểm tra kỹ toàn bộ đáp án của mình.</p>";
    
  Swal.fire({
    title: 'Nộp bài thi kiểm tra?',
    html: htmlStr,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#64748B',
    confirmButtonText: 'Đồng ý nộp',
    cancelButtonText: 'Tiếp tục làm'
  }).then((result) => {
    if (result.isConfirmed) {
      submitFinishedExam();
    }
  });
};

// 15. Formulate score calculations & Sync back to DB
async function submitFinishedExam() {
  if (testTimerInterval) clearInterval(testTimerInterval);
  showGlobalLoader("Đang tổng hợp điểm số và cập nhật học bạ...");
  
  let correctCount = 0;
  
  // Calculate final grading
  testQuestions.forEach((q, idx) => {
    const studentAns = currentTestMode === "practice" ? userAnswers[idx] : examUserAnswers[idx];
    let isCorrect = false;
    
    const type = q.type || "choice";
    
    if (type === "choice" || type === "true_false" || type === "image_choice") {
      isCorrect = studentAns !== "" && parseInt(studentAns) === q.correctIndex;
    } else if (type === "fill_blank") {
      isCorrect = studentAns && studentAns.trim().toLowerCase() === q.answer.trim().toLowerCase();
    } else if (type === "drag_text" || type === "drag_image_text" || type === "table_match") {
      try {
        const parsed = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
        isCorrect = Array.isArray(parsed) && parsed.length === q.correctAnswers.length &&
                    parsed.every((val, i) => val === q.correctAnswers[i]);
      } catch (e) { isCorrect = false; }
    } else if (type === "hotspot") {
      try {
        const clicks = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
        if (Array.isArray(clicks) && clicks.length >= (q.requiredCount || 1)) {
          let allValid = true;
          clicks.forEach(click => {
            let hit = false;
            (q.hotspots || []).forEach(area => {
              if (click.x >= area.x && click.x <= area.x + area.w && click.y >= area.y && click.y <= area.y + area.h) hit = true;
            });
            if (!hit) allValid = false;
          });
          isCorrect = allValid;
        }
      } catch (e) { isCorrect = false; }
    } else if (type === "multi_choice") {
      try {
        const parsed = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
        isCorrect = Array.isArray(parsed) && parsed.length === q.correctIndices.length && 
                    parsed.every(val => q.correctIndices.includes(val));
      } catch (e) { isCorrect = false; }
    }
    
    if (isCorrect) correctCount++;
  });
  
  const scorePercent = Math.round((correctCount / testQuestions.length) * 100);
  
  // Elapsed time spent in minutes & seconds
  const totalSecondsSpent = Math.round((new Date() - testStartTime) / 1000);
  const mins = Math.floor(totalSecondsSpent / 60);
  const secs = totalSecondsSpent % 60;
  const elapsedText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  // Construct dynamic score object
  const scoreEntry = {
    id: `${currentStudent.email.replace(/[.@]/g, "_")}_${activePlayingTest.id}_${Date.now()}`,
    testId: activePlayingTest.id,
    studentEmail: currentStudent.email,
    studentName: currentStudent.name,
    classId: currentStudent.classId,
    blockId: currentStudent.blockId || "unassigned",
    score: scorePercent,
    correctCount: correctCount,
    totalCount: testQuestions.length,
    timeSpent: elapsedText,
    mode: currentTestMode,
    completedAt: new Date().toISOString()
  };
  
  try {
    // Write score entry to Firestore using existing window.saveData framework
    const allScores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
    allScores.push(scoreEntry);
    
    await window.saveData(window.IC3_KEYS.SCORES, allScores, scoreEntry.id);
    
    // Auto-award badges or achievements if they exist, keeping educational simplicity
    hideGlobalLoader();
    showScoreReport(scorePercent, correctCount, elapsedText);
  } catch (err) {
    console.error("Error saving score results:", err);
    hideGlobalLoader();
    Swal.fire('Lỗi đồng bộ', 'Không thể gửi học bạ lên đám mây. Vui lòng kiểm tra kết nối mạng!', 'error');
    showScoreReport(scorePercent, correctCount, elapsedText); // Still show report
  }
}

// 16. Show scorecard reports
function showScoreReport(score, correct, timeSpent) {
  const icon = document.getElementById("modalReportIconWrapper");
  const title = document.getElementById("modalReportTitle");
  const statusLabel = document.getElementById("modalReportStatus");
  
  document.getElementById("modalReportTestName").innerText = activePlayingTest.name;
  document.getElementById("modalReportScore").innerText = score;
  document.getElementById("modalReportCorrectDetails").innerText = `${correct}/${testQuestions.length} câu trả lời đúng`;
  document.getElementById("modalReportTimeSpent").innerText = timeSpent;
  
  // Determine success status based on 70% pass requirement
  const isPass = score >= 70;
  if (isPass) {
    icon.innerHTML = "🏆";
    icon.className = "w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md border border-emerald-100 bg-emerald-50 mb-6 animate-bounce";
    title.innerText = "BÀI THI HOÀN THÀNH!";
    statusLabel.innerText = "ĐẠT CHỈ TIÊU";
    statusLabel.className = "text-sm font-black text-emerald-500 block mt-0.5";
    
    // Burst congratulations confetti!
    if (window.confetti) {
      window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  } else {
    icon.innerHTML = "📝";
    icon.className = "w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md border border-orange-100 bg-orange-50 mb-6";
    title.innerText = "ÔN TẬP HOÀN THÀNH";
    statusLabel.innerText = "CẦN CỐ GẮNG HƠN";
    statusLabel.className = "text-sm font-black text-orange-500 block mt-0.5";
  }
  
  document.getElementById("scoreReportModal").classList.remove("hidden");
}

window.handleCloseScoreReport = function() {
  document.getElementById("scoreReportModal").classList.add("hidden");
  document.getElementById("screen-testing").classList.add("hidden");
  
  // Refresh views
  renderStudentDashboard();
  switchTab("tests");
};

// 17. Interactive Sidebar Question Navigation Grid
function renderSidebarListGrid() {
  const grid = document.getElementById("sidebarQuestionListGrid");
  grid.innerHTML = "";
  
  let done = 0;
  let todo = 0;
  
  testQuestions.forEach((q, idx) => {
    const isCurrent = idx === activeQuestionIndex;
    const isPractAnswered = currentTestMode === "practice" && idx < userAnswers.length;
    const isExamAnswered = currentTestMode === "exam" && examUserAnswers[idx] !== "" && examUserAnswers[idx] !== undefined;
    
    let btnClass = "bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200";
    
    if (isCurrent) {
      btnClass = "bg-white text-blue-600 border-2 border-blue-600 ring-2 ring-blue-500/15 font-black scale-105 animate-pulse";
    } else if (isPractAnswered) {
      // In practice, evaluate if they got it right/wrong to color the circle immediately!
      const ans = userAnswers[idx];
      let correct = false;
      
      const type = q.type || "choice";
      if (type === "choice" || type === "true_false" || type === "image_choice") {
        correct = parseInt(ans) === q.correctIndex;
      } else if (type === "fill_blank") {
        correct = ans && ans.trim().toLowerCase() === q.answer.trim().toLowerCase();
      } else if (type === "drag_text" || type === "drag_image_text" || type === "table_match") {
        try {
          const parsed = typeof ans === "string" ? JSON.parse(ans) : ans;
          correct = Array.isArray(parsed) && parsed.every((val, i) => val === q.correctAnswers[i]);
        } catch(e) {}
      } else if (type === "hotspot") {
        try {
          const clicks = typeof ans === "string" ? JSON.parse(ans) : ans;
          if (Array.isArray(clicks) && clicks.length >= (q.requiredCount || 1)) {
            let allValid = true;
            clicks.forEach(click => {
              let hit = false;
              (q.hotspots || []).forEach(area => {
                if (click.x >= area.x && click.x <= area.x + area.w && click.y >= area.y && click.y <= area.y + area.h) hit = true;
              });
              if (!hit) allValid = false;
            });
            correct = allValid;
          }
        } catch(e) {}
      } else if (type === "multi_choice") {
        try {
          const parsed = typeof ans === "string" ? JSON.parse(ans) : ans;
          correct = Array.isArray(parsed) && parsed.every(val => q.correctIndices.includes(val));
        } catch(e) {}
      }
      
      btnClass = correct ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500";
      done++;
    } else if (isExamAnswered) {
      btnClass = "bg-blue-600 text-white border-blue-600";
      done++;
    } else {
      todo++;
    }
    
    const circle = document.createElement("button");
    circle.className = `w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all ${btnClass}`;
    circle.innerText = idx + 1;
    circle.onclick = () => {
      // In practice mode, you can move freely to already-checked questions, or to the next unanswered
      if (currentTestMode === "practice" && idx > userAnswers.length) {
        Swal.fire('Nhắc nhở', 'Vui lòng hoàn thành lần lượt từng câu hỏi ở chế độ Ôn tập!', 'warning');
        return;
      }
      activeQuestionIndex = idx;
      renderActiveQuestion();
    };
    grid.appendChild(circle);
  });
  
  document.getElementById("sidebarStatDone").innerText = done;
  document.getElementById("sidebarStatTodo").innerText = todo;
}

function updateSidebarGridCircle(index, state) {
  renderSidebarListGrid(); // Quick rebuild of grid to keep indices synchronized
}

window.confirmExitPlaying = function() {
  Swal.fire({
    title: 'Thoát khỏi bài làm?',
    text: 'Các kết quả chưa hoàn thành sẽ không được lưu lại.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#64748B',
    confirmButtonText: 'Đồng ý thoát',
    cancelButtonText: 'Tiếp tục thi'
  }).then((result) => {
    if (result.isConfirmed) {
      if (testTimerInterval) clearInterval(testTimerInterval);
      document.getElementById("screen-testing").classList.add("hidden");
    }
  });
};

window.handleExitPlaying = function() {
  window.confirmExitPlaying();
};

// 18. Detailed Exam Reviewing Mode support
window.reviewTest = function(testId, scoreEntry) {
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const targetTest = tests.find(t => t.id === testId);
  
  if (!targetTest) {
    Swal.fire('Lỗi', 'Thông tin bộ đề của kết quả này đã bị xóa khỏi hệ thống!', 'error');
    return;
  }
  
  // Set exam playing parameters in review mode
  activePlayingTest = targetTest;
  currentTestMode = scoreEntry.mode || "exam";
  isReviewingExam = true;
  activeQuestionIndex = 0;
  
  // Set simulated answers list based on database score entries
  const allQuestions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  let testQRefs = targetTest.questions || [];
  testQuestions = allQuestions.filter(q => testQRefs.includes(q.id));
  
  if (currentTestMode === "exam") {
    // Re-pack simulated exam entries or practice entries
    // Find matching score fields or pre-calculate
    // Let's check how the stored answers are reconstructed
    examUserAnswers = new Array(testQuestions.length).fill("");
    // If the database stored separate answers, load them.
    // If not, we just show correctness indicators and correct choices.
  } else {
    userAnswers = [];
  }
  
  // Hide timer details block
  document.getElementById("testingTimerBox").classList.add("hidden");
  
  // Header indicators
  document.getElementById("testingTitle").innerText = `Xem lại: ${targetTest.name}`;
  const modeBadge = document.getElementById("testingModeBadge");
  modeBadge.innerText = "XEM LẠI BÀI";
  modeBadge.className = "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300";
  
  document.getElementById("screen-testing").classList.remove("hidden");
  renderActiveQuestion();
};

window.handleStartReviewFromReport = function() {
  document.getElementById("scoreReportModal").classList.add("hidden");
  isReviewingExam = true;
  activeQuestionIndex = 0;
  renderActiveQuestion();
};
