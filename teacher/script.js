/**
 * IC3 LMS - Teacher Portal Logic
 */

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

let activeClassId = "";
let activeQuestionId = ""; // Track selected question in manage-tests tab

const ITEMS_PER_PAGE = 8;
const typeLabels = {
  choice: "Trắc nghiệm 1 đáp án",
  drag_text: "Kéo thả chữ",
  drag_image_text: "Kéo thả hình + chữ",
  table_match: "Nối bảng / Ghép cặp",
  multi_choice: "Chọn nhiều đáp án",
  image_choice: "Chọn bằng hình ảnh",
  multiple_choice: "Trắc nghiệm cũ (Legacy)",
  true_false: "Đúng / Sai",
  fill_blank: "Đáp án điền từ ngắn"
};
window.teacherPagination = {
  students: 1,
  results: 1,
  ranking: 1,
  rewards: 1,
  questions: 1
};

function getTeacherUser() {
  try {
    const key = (window.IC3_KEYS && window.IC3_KEYS.CURRENT_USER) ? window.IC3_KEYS.CURRENT_USER : "ic3_current_user";
    const userStr = localStorage.getItem(key);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing teacher user:", e);
    return null;
  }
}

function renderPagination(totalItems, currentPage, containerId, tabId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  const btnClass = "px-3 py-1 text-xs font-bold rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/30 transition-all border border-indigo-500/30";
  const activeClass = "px-3 py-1 text-xs font-bold rounded bg-indigo-600 text-white transition-all shadow-md shadow-indigo-600/20";

  // Prev
  const prev = document.createElement("button");
  prev.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
  prev.className = currentPage === 1 ? btnClass + " opacity-50 cursor-not-allowed" : btnClass;
  prev.disabled = currentPage === 1;
  prev.onclick = () => { window.teacherPagination[tabId] = currentPage - 1; switch(tabId) { case 'students': renderClassStudentsTable(); break; case 'results': renderResultsTable(); break; case 'ranking': renderClassRanking(); break; case 'rewards': renderTeacherRewards(); break; case 'questions': renderQuestionsList(); break; case 'overview': renderOverviewProgressTable(window.IC3_CACHE[window.IC3_KEYS.STUDENTS].filter(s => s.classId === activeClassId)); break;} };
  container.appendChild(prev);

  // Pages
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.className = i === currentPage ? activeClass : btnClass;
    btn.onclick = () => { window.teacherPagination[tabId] = i; switch(tabId) { case 'students': renderClassStudentsTable(); break; case 'results': renderResultsTable(); break; case 'ranking': renderClassRanking(); break; case 'rewards': renderTeacherRewards(); break; case 'questions': renderQuestionsList(); break; case 'overview': renderOverviewProgressTable(window.IC3_CACHE[window.IC3_KEYS.STUDENTS].filter(s => s.classId === activeClassId)); break;} };
    container.appendChild(btn);
  }

  // Next
  const next = document.createElement("button");
  next.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
  next.className = currentPage === totalPages ? btnClass + " opacity-50 cursor-not-allowed" : btnClass;
  next.disabled = currentPage === totalPages;
  next.onclick = () => { window.teacherPagination[tabId] = currentPage + 1; switch(tabId) { case 'students': renderClassStudentsTable(); break; case 'results': renderResultsTable(); break; case 'ranking': renderClassRanking(); break; case 'rewards': renderTeacherRewards(); break; case 'questions': renderQuestionsList(); break; case 'overview': renderOverviewProgressTable(window.IC3_CACHE[window.IC3_KEYS.STUDENTS].filter(s => s.classId === activeClassId)); break;} };
  container.appendChild(next);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.IC3_DB_INITIALIZED) {
    startTeacherApp();
  } else {
    window.addEventListener('ic3-db-ready', startTeacherApp);
  }
});

function startTeacherApp() {
  if (!checkTeacherAuth()) return;
  initClock();
  initClassSelector();

  // Form listeners
  document.getElementById("classForm").addEventListener("submit", handleClassSubmit);
  document.getElementById("addStudentToClassForm").addEventListener("submit", handleStudentToClassSubmit);
  
  // Auto-sync students for sheet classes on load
  autoSyncSheetClasses();
}

async function autoSyncSheetClasses() {
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const sheetClasses = classes.filter(c => c.isFromSheet);
  
  if (sheetClasses.length === 0) return;
  
  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) return;
    
    const students = await window.fetchGoogleSheetData(config.spreadsheetId, config.studentSheetName || "Tổng quát");
    if (!students || students.length === 0) return;
    
    const allStudents = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    let updated = false;
    let newStudentIds = [];
    
    const cleanStringForId = (str) => {
      if (!str) return "";
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
    };
    
    sheetClasses.forEach(c => {
       const studentsInClass = students.filter(s => (s.school || "Mặc định") === c.sheetSchool && s.className === c.sheetClassName);
       
       studentsInClass.forEach(s => {
         const studentId = cleanStringForId(s.name) + "_" + cleanStringForId(c.sheetClassName) + "_" + cleanStringForId(c.sheetSchool) + "_" + s.rowIndex;
         const sEmail = `${studentId}@ic3lms.edu.vn`;
         if (!allStudents.some(ex => ex.id === sEmail || ex.email === sEmail)) {
           allStudents.push({
             id: sEmail,
             email: sEmail,
             name: s.name,
             classId: c.id,
             password: s.password,
             badges: [],
             level: "Tân binh",
             pokemon: "pikachu",
             coins: 0,
             testsCompleted: 0,
             isFirstLogin: true
           });
           newStudentIds.push(sEmail);
           updated = true;
         }
       });
    });
    
    if (updated) {
      window.saveData(window.IC3_KEYS.STUDENTS, allStudents, newStudentIds);
      initClassSelector();
    }
  } catch (error) {
    console.error("Auto sync failed:", error);
  }
}

// 1. Auth Validation
function checkTeacherAuth() {
  let currentUser = getTeacherUser();
  if (!currentUser || currentUser.role !== "teacher") {
    window.showToast("Bạn không có quyền truy cập trang Giáo viên. Vui lòng đăng nhập bằng tài khoản Giáo viên!", 'error');
    window.location.href = "../index.html";
    return false;
  }
  document.getElementById("teacherName").innerText = currentUser.name || "Giáo viên";
  document.getElementById("teacherEmail").innerText = currentUser.email;
  return true;
}

// 2. Real-time Live Clock
function initClock() {
  const updateClock = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    document.getElementById("liveClock").innerText = `${dateStr} ${timeStr}`;
  };
  updateClock();
  setInterval(updateClock, 1000);
}

function logoutTeacher() {
  window.logoutUser();
}

// 3. Class selection control
function syncTeacherDataToCollections(teacher) {
  const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];
  const uIndex = users.findIndex(u => u.email === teacher.email);
  if (uIndex >= 0) users[uIndex] = teacher;
  else users.push(teacher);
  window.saveData(window.IC3_KEYS.USERS, users, teacher.email);

  const teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const tIndex = teachers.findIndex(t => t.email === teacher.email);
  if (tIndex >= 0) {
      teachers[tIndex].classes = teacher.classes;
      window.saveData(window.IC3_KEYS.TEACHERS, teachers, teacher.email);
  } else {
      teachers.push(teacher);
      window.saveData(window.IC3_KEYS.TEACHERS, teachers, teacher.email);
  }
}

function initClassSelector() {
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];
  let teacher = getTeacherUser();
  if (!teacher) return;
  
  // Sync with teachers collection if available
  const teachersInDb = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const teacherInDb = teachersInDb.find(t => t.email === teacher.email);
  if (teacherInDb) {
    teacher.classes = teacherInDb.classes || [];
    localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(teacher));
  } else {
    let needsMigration = false;
    if (!teacher.classes) {
      teacher.classes = [];
      needsMigration = true;
    }

    if (needsMigration) {
      localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(teacher));
      syncTeacherDataToCollections(teacher);
    }
  }

  // Filter classes belonging to this teacher
  const teacherClasses = classes.filter(c => teacher.classes && teacher.classes.includes(c.id));
  const selector = document.getElementById("classSelector");
  selector.innerHTML = "";

  if (teacherClasses.length > 0) {
    teacherClasses.forEach(c => {
      selector.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    activeClassId = teacherClasses[0].id;
  } else {
    selector.innerHTML = `<option value="">Chưa có lớp</option>`;
    activeClassId = "";
  }

  // Load first tab
  switchTab("overview");
}

function changeActiveSelectedClass() {
  activeClassId = document.getElementById("classSelector").value;
  // Reload current active tab view
  const activeBtn = document.querySelector(".nav-btn.active");
  if (activeBtn) {
    const tabId = activeBtn.id.replace("nav-", "");
    switchTab(tabId);
  }
}

// 4. Tab Switching
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) activeTab.classList.remove("hidden");

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active");

  const titles = {
    overview: "Tổng quan tình hình lớp học",
    "students-list": "Quản lý thành viên lớp học",
    "manage-tests": "Quản lý Đề thi & Câu hỏi",
    results: "Xem kết quả bài kiểm tra học sinh",
    ranking: "Bảng vàng vinh danh thi đua học tập",
    rewards: "Quản lý Cửa hàng Quà tặng",
    "lock-tabs": "Khóa / Mở Tab tính năng học sinh",
    "google-sheets": "Cấu hình liên kết Google Sheets"
  };
  document.getElementById("currentTabTitle").innerText = titles[tabId] || "Cổng giáo viên";

  // Fresh render of selected tab
  if (tabId === "overview") renderOverview();
  else if (tabId === "students-list") renderClassStudentsTable();
  else if (tabId === "manage-tests") initManageTestsTab();
  else if (tabId === "results") renderResultsTable();
  else if (tabId === "ranking") renderClassRanking();
  else if (tabId === "rewards") renderTeacherRewards();
  else if (tabId === "google-sheets") initGoogleSheetsTab();
  else if (tabId === "lock-tabs") renderLockTabsTab();
}

// ==================== OVERVIEW RENDERING ====================
function renderOverview() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);

  // 1. Total students
  document.getElementById("overview-students-count").innerText = `${classStudents.length} học sinh`;

  // 2. Total test count
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  document.getElementById("overview-tests-count").innerText = `${tests.length} bài kiểm tra`;

  // 3. Completion Rate Calculation (Passed tests / Total tests * 100)
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const classStudentEmails = classStudents.map(s => s.email);
  const classScores = scores.filter(sc => classStudentEmails.includes(sc.studentEmail));
  
  if (classStudents.length > 0 && tests.length > 0) {
    const totalPossibleSubmissions = classStudents.length * tests.length;
    // unique passed submissions (score >= 50) per student-test
    const passedSubmissions = new Set();
    classScores.forEach(sc => {
      if (sc.score >= 50) {
        passedSubmissions.add(`${sc.studentEmail}_${sc.testId}`);
      }
    });
    const rate = Math.round((passedSubmissions.size / totalPossibleSubmissions) * 100) || 0;
    document.getElementById("overview-completion-rate").innerText = `${rate}% đạt chuẩn`;
  } else {
    document.getElementById("overview-completion-rate").innerText = "0% đạt chuẩn";
  }

  // Render Classes Grid
  renderClassesGrid();
  // Render Overview Progress Table
  renderOverviewProgressTable(classStudents);
}

function renderClassesGrid() {
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];
  const teacher = getTeacherUser();
  if (!teacher) return;
  const teacherClasses = classes.filter(c => teacher.classes && teacher.classes.includes(c.id));
  
  const gridEl = document.getElementById("teacher-classes-grid");
  gridEl.innerHTML = "";

  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];

  teacherClasses.forEach(c => {
    const classSize = students.filter(s => s.classId === c.id).length;
    const isCurrent = c.id === activeClassId;

    const div = document.createElement("div");
    div.className = `p-4 rounded-xl border ${isCurrent ? 'bg-emerald-500/20 border-emerald-300 text-emerald-800' : 'bg-[#1a1c2e] border-indigo-500/30 text-indigo-100'} flex flex-col justify-between shadow-sm`;
    div.innerHTML = `
      <div>
        <h4 class="font-bold text-sm text-indigo-50">${c.name}</h4>
        <span class="text-[10px] text-indigo-300 font-mono block uppercase mt-0.5">${c.id}</span>
        <p class="text-xs text-indigo-200 mt-2"><i class="fa-solid fa-graduation-cap mr-1"></i>Sĩ số: <span class="font-bold">${classSize} học sinh</span></p>
      </div>
      <div class="flex justify-between items-center mt-4 pt-3 border-t border-indigo-500/30">
        <button onclick="deleteClass('${c.id}')" class="px-2 py-1 text-[11px] font-bold text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-all"><i class="fa-solid fa-trash"></i> Xóa</button>
        <button onclick="selectSpecificClass('${c.id}')" class="px-2.5 py-1 text-[11px] font-bold ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-indigo-200 hover:bg-slate-200'} rounded-md transition-all">Quản lý</button>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

function selectSpecificClass(classId) {
  document.getElementById("classSelector").value = classId;
  changeActiveSelectedClass();
}

function renderOverviewProgressTable(classStudents) {
  const body = document.getElementById("teacher-overview-progress-body");
  body.innerHTML = "";

  const pokemonIcons = {
    pikachu: "⚡ Pikachu",
    charmander: "🔥 Charmander",
    bulbasaur: "🌱 Bulbasaur",
    squirtle: "💧 Squirtle",
    eevee: "🦊 Eevee"
  };

  const badgeIcons = {
    "First Test": "🏆",
    "Fast Learner": "🔥",
    "IC3 Master": "⚡"
  };

  if (classStudents.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-indigo-300 text-xs">Lớp học hiện tại chưa có học sinh nào gia nhập.</td></tr>`;
    return;
  }

  classStudents.forEach(std => {
    const badgesRendered = std.badges.map(b => `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-indigo-500/30 text-[10px] text-indigo-200 font-bold" title="${b}">${badgeIcons[b] || "🏅"} ${b}</span>`).join(" ");

    const tr = document.createElement("tr");
    tr.className = "hover:bg-[#131424]/80 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-4 py-3.5">
        <span class="font-bold text-indigo-50 text-xs block">${std.name}</span>
        <span class="text-[9px] text-indigo-300 font-mono">${std.email}</span>
      </td>
      <td class="px-4 py-3.5"><span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold">${std.level}</span></td>
      <td class="px-4 py-3.5 font-medium text-indigo-200">${window.pokemonAvatars[std.pokemon] || "🦊"} ${window.pokemonNames[std.pokemon] || std.pokemon}</td>
      <td class="px-4 py-3.5">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-indigo-50">${std.exp} EXP</span>
          <span class="text-[10px] text-yellow-600"><i class="fa-solid fa-coins"></i> ${std.coins || 0}</span>
        </div>
      </td>
      <td class="px-4 py-3.5"><span class="font-bold text-indigo-50">${std.rank}</span></td>
      <td class="px-4 py-3.5 flex items-center gap-1.5 flex-wrap">${badgesRendered || '<span class="text-indigo-300 italic">Chưa đạt</span>'}</td>
    `;
    body.appendChild(tr);
  });
}


// ==================== STUDENTS LIST TAB ====================
function renderClassStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  // Populate filter dropdown with unique school classes
  populateSchoolClassFilter(classStudents);
  
  const filterEl = document.getElementById("schoolClassFilter");
  const filterVal = filterEl ? filterEl.value : "";
  const searchInput = document.getElementById("studentsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

  let filteredStudents = filterVal ? classStudents.filter(s => s.schoolClass === filterVal) : classStudents;
  if (searchQuery) {
    filteredStudents = filteredStudents.filter(s => 
      (s.name && s.name.toLowerCase().includes(searchQuery)) || 
      (s.email && s.email.toLowerCase().includes(searchQuery))
    );
  }

  const body = document.getElementById("class-students-table-body");
  body.innerHTML = "";

  const paginationContainerId = 'students-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredStudents.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>`;
    return;
  }

  const currentPage = window.teacherPagination.students || 1;
  const pagedStudents = filteredStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredStudents.length, currentPage, paginationContainerId, 'students');

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");
  const limit = config && config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
  const today = getBossHuntDayKey();
  pagedStudents.forEach(std => {
    // Count success tests (>=50)
    const passedCount = scores.filter(sc => sc.studentEmail === std.email && sc.score >= 50).length;
    
    // Get current daily boss hunt count
    const huntRecord = (std.bossHunts && std.bossHunts.date === today) ? (std.bossHunts.count || 0) : 0;

    let schoolText = "Chưa cập nhật";
    let classText = "Chưa cập nhật";
    if (std.schoolClass) {
      const parts = std.schoolClass.split(" - ");
      if (parts.length >= 2) {
        schoolText = parts[0].trim();
        classText = parts.slice(1).join(" - ").trim();
      } else {
        const lower = std.schoolClass.toLowerCase();
        if (lower.includes("lớp")) {
          const idx = lower.indexOf("lớp");
          schoolText = std.schoolClass.substring(0, idx).replace(/[-,/]/g, "").trim() || "Chưa cập nhật";
          classText = std.schoolClass.substring(idx).trim();
        } else {
          schoolText = std.schoolClass;
        }
      }
    }

    const loginStatusBadge = (std.isFirstLogin === false)
      ? `<span class="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold whitespace-nowrap inline-block">Đã đăng nhập</span>`
      : `<span class="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold whitespace-nowrap inline-block">Chưa đăng nhập</span>`;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-[#131424]/80 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-5 py-3.5 font-bold text-slate-850">
        <button onclick="openStudentDetailsModal('${std.email}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-left flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-circle-user text-indigo-300"></i> ${std.name}
        </button>
        <div class="text-[11px] text-indigo-400 font-mono font-normal mt-0.5 break-all max-w-[200px]">${std.email}</div>
      </td>
      <td class="px-5 py-3.5 font-medium whitespace-nowrap">${loginStatusBadge}</td>
      <td class="px-5 py-3.5 font-medium text-indigo-200"><i class="fa-solid fa-paw mr-1 text-indigo-400"></i> ${window.pokemonAvatars[std.pokemon] || "🦊"} ${window.pokemonNames[std.pokemon] || std.pokemon || "Chưa có"}</td>
      <td class="px-5 py-3.5 font-mono font-bold text-yellow-500"><i class="fa-solid fa-coins mr-1"></i> ${std.coins || 0}</td>
      <td class="px-5 py-3.5 font-mono font-bold text-yellow-600">
        <div>${std.exp || 0} EXP</div>
        <div class="text-[10px] text-rose-400 font-semibold mt-1">👹 Boss: ${huntRecord}/${limit}</div>
      </td>
      <td class="px-5 py-3.5 text-center font-bold text-emerald-600">${passedCount} bài đạt</td>
      <td class="px-5 py-3.5 text-right">
        <div class="flex justify-end gap-2">
          <button onclick="openStudentDetailsModal('${std.email}')" title="Xem lịch sử học tập" class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer text-sm">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="resetBossHunts('${std.email}')" title="Đặt lại (reset) lượt săn Boss hôm nay" class="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer text-sm">
            <i class="fa-solid fa-arrows-rotate"></i>
          </button>
          <button onclick="removeStudentFromClass('${std.email}')" title="Xóa học sinh khỏi lớp học này" class="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/20 text-red-600 hover:bg-red-100 border border-red-200 transition-all cursor-pointer text-sm">
            <i class="fa-solid fa-user-minus"></i>
          </button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

function populateSchoolClassFilter(classStudents) {
  const filter = document.getElementById("schoolClassFilter");
  if (!filter) return;
  const previousValue = filter.value;
  filter.innerHTML = `<option value="">Tất cả</option>`;
  
  const uniqueClasses = [...new Set(classStudents.map(s => s.schoolClass).filter(Boolean))];
  uniqueClasses.forEach(sc => {
    filter.innerHTML += `<option value="${sc}">${sc}</option>`;
  });
  
  if (uniqueClasses.includes(previousValue)) {
    filter.value = previousValue;
  }
}

function importStudentsExcel(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
      const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [] || [];
      let count = 0;

      json.forEach(row => {
        const name = row["Họ tên"] || row["Họ và tên"] || row["Họ Tên"] || row["Name"] || row["name"];
        const schoolClass = row["Trường lớp"] || row["Trường Lớp"] || row["Class"] || row["class"] || row["SchoolClass"];
        
        if (name) {
          // Generate simulated email
          const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
          const email = `${normalized}_${Math.floor(100 + Math.random() * 900)}@gmail.com`;
          
          const newStudent = {
            email: email,
            name: name,
            schoolClass: schoolClass || "Chưa cập nhật",
            classId: activeClassId,
            pokemon: ["pikachu", "charmander", "bulbasaur", "squirtle", "eevee"][Math.floor(Math.random() * 5)],
            level: "Beginner",
            exp: 150,
            maxExp: 500,
            coins: 50,
            rank: "Bronze",
            badges: [],
            unlockedLessons: ["lesson_l1_1"],
            unlockedZones: ["level_1"],
            isFirstLogin: true
          };
          
          students.push(newStudent);
          
          // Allow authentication
          users.push({
            email: email,
            password: "123456",
            role: "student",
            name: name
          });
          importedEmails.push(email);
          count++;
        }
      });
      window.saveData(window.IC3_KEYS.STUDENTS, students, importedEmails);
      
      window.saveData(window.IC3_KEYS.USERS, users, importedEmails);
      
      window.showToast(`Đã nhập thành công ${count} học sinh từ file Excel! Mật khẩu đăng nhập mặc định của các em là: 123456`);
      renderClassStudentsTable();
      renderOverview();
    } catch (err) {
      window.showToast("Đã xảy ra lỗi khi đọc file Excel: "  + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
  e.target.value = ""; // Clear input
}

function openAddStudentToClassModal() {
  if (!activeClassId) {
    window.showToast("Vui lòng chọn lớp học hoặc tạo lớp mới trước!", 'error');
    return;
  }
  const modal = document.getElementById("addStudentToClassModal");
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  
  // Find students who are NOT in this class yet
  const availableStudents = students.filter(s => s.classId !== activeClassId);
  const selector = document.getElementById("studentToClassSelector");
  selector.innerHTML = "";

  if (availableStudents.length === 0) {
    selector.innerHTML = `<option value="">Không có học sinh ngoài lớp để thêm</option>`;
  } else {
    availableStudents.forEach(s => {
      selector.innerHTML += `<option value="${s.email}">${s.name} (${s.email})</option>`;
    });
  }

  modal.classList.remove("hidden");
}

function closeAddStudentToClassModal() {
  document.getElementById("addStudentToClassModal").classList.add("hidden");
}

function handleStudentToClassSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("studentToClassSelector").value;
  if (!email) {
    window.showToast("Không có học sinh hợp lệ nào được chọn!", 'error');
    return;
  }

  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const idx = students.findIndex(s => s.email === email);
  if (idx !== -1) {
    students[idx].classId = activeClassId;
    window.saveData(window.IC3_KEYS.STUDENTS, students, email);
  }

  closeAddStudentToClassModal();
  renderOverview();
  renderClassStudentsTable();
}

function removeStudentFromClass(email) {
  showConfirmModal(
    "Đưa học sinh ra khỏi lớp",
    `Bạn muốn đưa học sinh ${email} ra khỏi lớp học này?`,
    () => {
      const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
      const idx = students.findIndex(s => s.email === email);
      if (idx !== -1) {
        students[idx].classId = ""; // No class assigned
        window.saveData(window.IC3_KEYS.STUDENTS, students, email);
      }
      renderOverview();
      renderClassStudentsTable();
    }
  );
}

function getBossHuntDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const hours = now.getHours();

  let targetDate;
  if (hours < 6) {
    // Before 6 AM, it belongs to the previous day
    targetDate = new Date(year, month, date - 1);
  } else {
    targetDate = new Date(year, month, date);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

window.resetBossHunts = function(studentEmail) {
  showConfirmModal(
    "Reset lượt săn Boss",
    `Bạn có chắc muốn đặt lại (reset) số lượt săn Boss hôm nay của học sinh ${studentEmail} về 0?`,
    () => {
      const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
      const stdIdx = students.findIndex(s => s.email === studentEmail);
      if (stdIdx !== -1) {
        const today = getBossHuntDayKey();
        students[stdIdx].bossHunts = { date: today, count: 0 };
        window.saveData(window.IC3_KEYS.STUDENTS, students, studentEmail);
        window.showToast(`Đã reset lượt săn Boss hôm nay cho học sinh ${students[stdIdx].name || studentEmail}!`, 'success');
        renderClassStudentsTable();
      } else {
        window.showToast("Không tìm thấy thông tin tài khoản học sinh!", 'error');
      }
    }
  );
}

// ==================== POPUP MODAL: STUDENT DETAILS & HISTORY ====================
async function openStudentDetailsModal(studentEmail) {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const student = students.find(s => s.email === studentEmail);
  if (!student) {
    window.showToast("Không tìm thấy thông tin học sinh!", 'error');
    return;
  }

  document.getElementById("detail-pokemon-avatar").innerText = window.pokemonAvatars[student.pokemon] || "🦊";
  document.getElementById("detail-student-name").innerText = student.name;
  document.getElementById("detail-student-email").innerText = student.email;
  document.getElementById("detail-student-level").innerText = `Cấp độ: ${student.level || "Beginner"}`;
  document.getElementById("detail-student-rank").innerText = `Hạng: ${student.rank || "Bronze"}`;
  document.getElementById("detail-student-school").innerText = `Trường: ${student.schoolClass || "Chưa có"}`;
  
  const attemptsTbody = document.getElementById("detail-attempts-tbody");
  const highestScoresTbody = document.getElementById("detail-highest-scores-tbody");
  
  attemptsTbody.innerHTML = `<tr><td colspan="3" class="px-4 py-3.5 text-center text-indigo-300 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu...</td></tr>`;
  highestScoresTbody.innerHTML = `<tr><td colspan="2" class="px-4 py-3.5 text-center text-indigo-300 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu...</td></tr>`;
  document.getElementById("studentDetailsModal").classList.remove("hidden");

  let studentScores = [];
  try {
    if (window.fStore && window.db) {
      const { collection, query, where, getDocs } = window.fStore;
      const scoreQuery = query(
        collection(window.db, window.IC3_KEYS.SCORES),
        where("studentEmail", "==", studentEmail)
      );
      const scoreSnap = await getDocs(scoreQuery);
      studentScores = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } else {
      const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
      studentScores = scores.filter(s => s.studentEmail === studentEmail);
    }
  } catch (err) {
    console.error("Error fetching student scores:", err);
    const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
    studentScores = scores.filter(s => s.studentEmail === studentEmail);
  }

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  // Lịch sử làm bài thi
  attemptsTbody.innerHTML = "";
  if (studentScores.length === 0) {
    attemptsTbody.innerHTML = `<tr><td colspan="3" class="px-4 py-3.5 text-center text-indigo-300 text-xs">Chưa có lịch sử thám hiểm nào.</td></tr>`;
  } else {
    const sortedScores = [...studentScores].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedScores.forEach(sc => {
      const testObj = tests.find(t => t.id === sc.testId) || { title: sc.testId };
      const tr = document.createElement("tr");
      tr.className = "hover:bg-[#131424]/80 border-b border-indigo-500/30 text-xs text-indigo-100";
      tr.innerHTML = `
        <td class="px-4 py-3.5 font-medium text-indigo-50 truncate max-w-[150px]" title="${testObj.title}">${testObj.title}</td>
        <td class="px-4 py-3.5 font-mono font-bold text-emerald-600">${sc.score}/100</td>
        <td class="px-4 py-3.5 font-mono text-indigo-300 text-right">${sc.date}</td>
      `;
      attemptsTbody.appendChild(tr);
    });
  }

  // Điểm các bài kiểm tra cao nhất
  highestScoresTbody.innerHTML = "";
  
  const takenTestIds = [...new Set(studentScores.map(sc => sc.testId))];
  if (takenTestIds.length === 0) {
    highestScoresTbody.innerHTML = `<tr><td colspan="2" class="px-4 py-3.5 text-center text-indigo-300 text-xs">Chưa có bài kiểm tra nào hoàn thành.</td></tr>`;
  } else {
    takenTestIds.forEach(tId => {
      const testObj = tests.find(t => t.id === tId) || { title: tId };
      const testAttempts = studentScores.filter(sc => sc.testId === tId);
      const bestScore = Math.max(...testAttempts.map(sc => sc.score));
      
      const tr = document.createElement("tr");
      tr.className = "hover:bg-[#131424]/80 border-b border-indigo-500/30 text-xs text-indigo-100";
      tr.innerHTML = `
        <td class="px-4 py-3.5 font-medium text-indigo-50 truncate max-w-[150px]" title="${testObj.title}">${testObj.title}</td>
        <td class="px-4 py-3.5 font-mono font-bold text-yellow-600 text-right">${bestScore}/100</td>
      `;
      highestScoresTbody.appendChild(tr);
    });
  }
}

function closeStudentDetailsModal() {
  document.getElementById("studentDetailsModal").classList.add("hidden");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}


// ==================== UNIFIED MANAGE TESTS & QUESTIONS TAB ====================

// Local storage blocks loader helper
function getBlocks() {
  const defaultBlocks = [
    { id: "block_3", name: "Khối 3" },
    { id: "block_4", name: "Khối 4" },
    { id: "block_5", name: "Khối 5" },
    { id: "block_6", name: "Khối 6" },
    { id: "block_7", name: "Khối 7" },
    { id: "block_8", name: "Khối 8" }
  ];
  const blocksData = localStorage.getItem("ic3_blocks");
  if (!blocksData || blocksData.includes("block_level_1") || !blocksData.includes("block_3")) {
    localStorage.setItem("ic3_blocks", JSON.stringify(defaultBlocks));
    return defaultBlocks;
  }
  try {
    return JSON.parse(blocksData);
  } catch (e) {
    console.error("Error parsing blocks data:", e);
    localStorage.setItem("ic3_blocks", JSON.stringify(defaultBlocks));
    return defaultBlocks;
  }
}

function saveBlocks(blocks) {
  localStorage.setItem("ic3_blocks", JSON.stringify(blocks));
}

function openBlockModal(action) {
  const modal = document.getElementById("blockModal");
  if (!modal) return;
  const actionInput = document.getElementById("block-form-action");
  const titleEl = document.getElementById("block-modal-title");
  const idInput = document.getElementById("blockIdInput");
  const nameInput = document.getElementById("blockNameInput");

  if (action === "add") {
    if (actionInput) actionInput.value = "add";
    if (titleEl) titleEl.innerText = "Tạo khối lớp mới";
    if (idInput) {
      idInput.value = "";
      idInput.disabled = false;
      idInput.classList.remove("opacity-50", "cursor-not-allowed");
    }
    if (nameInput) nameInput.value = "";
    modal.classList.remove("hidden");
  } else if (action === "edit") {
    const selector = document.getElementById("m-blockSelector");
    const activeBlockId = selector ? selector.value : "";
    if (!activeBlockId) {
      if (window.showToast) window.showToast("Vui lòng chọn khối lớp cần sửa!", "error");
      return;
    }
    const blocks = getBlocks();
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block) return;

    if (actionInput) actionInput.value = "edit";
    if (titleEl) titleEl.innerText = "Chỉnh sửa khối lớp";
    if (idInput) {
      idInput.value = block.id;
      idInput.disabled = true;
      idInput.classList.add("opacity-50", "cursor-not-allowed");
    }
    if (nameInput) nameInput.value = block.name;
    modal.classList.remove("hidden");
  }
}

function closeBlockModal() {
  const modal = document.getElementById("blockModal");
  if (modal) modal.classList.add("hidden");
}

function handleBlockFormSubmit(e) {
  e.preventDefault();
  const action = document.getElementById("block-form-action").value;
  const id = document.getElementById("blockIdInput").value.trim().toLowerCase();
  const name = document.getElementById("blockNameInput").value.trim();

  if (!id || !name) {
    if (window.showToast) window.showToast("Vui lòng điền đầy đủ thông tin!", "error");
    return;
  }

  const blocks = getBlocks();

  if (action === "add") {
    if (blocks.some(b => b.id === id)) {
      if (window.showToast) window.showToast("Mã khối lớp đã tồn tại!", "error");
      return;
    }
    blocks.push({ id, name });
    saveBlocks(blocks);
    if (window.showToast) window.showToast("Thêm khối lớp mới thành công!", "success");
  } else {
    // edit
    const idx = blocks.findIndex(b => b.id === id);
    if (idx > -1) {
      blocks[idx].name = name;
      saveBlocks(blocks);
      if (window.showToast) window.showToast("Cập nhật khối lớp thành công!", "success");
    }
  }

  closeBlockModal();
  initManageTestsTab();
  const selector = document.getElementById("m-blockSelector");
  if (selector) {
    selector.value = id;
    onBlockSelectionChange();
  }
}

function deleteCurrentBlock() {
  const selector = document.getElementById("m-blockSelector");
  const activeBlockId = selector ? selector.value : "";
  if (!activeBlockId) {
    if (window.showToast) window.showToast("Vui lòng chọn khối lớp cần xóa!", "error");
    return;
  }

  showConfirmModal(
    "Xác nhận xóa khối lớp",
    "Bạn có chắc chắn muốn xóa khối lớp này? Mọi thông tin khối lớp sẽ bị loại bỏ khỏi danh sách cục bộ.",
    () => {
      const blocks = getBlocks();
      const updatedBlocks = blocks.filter(b => b.id !== activeBlockId);
      saveBlocks(updatedBlocks);
      if (window.showToast) window.showToast("Đã xóa khối lớp thành công!", "success");
      initManageTestsTab();
    }
  );
}

function initManageTestsTab() {
  const blocks = getBlocks();
  const selector = document.getElementById("m-blockSelector");
  selector.innerHTML = `<option value="">-- Chọn khối lớp --</option>`;
  
  blocks.forEach(b => {
    selector.innerHTML += `<option value="${b.id}">${b.name}</option>`;
  });

  // Keep existing selection if valid
  const currentBlockId = selector.value;
  onBlockSelectionChange();
}

function onBlockSelectionChange() {
  const blockId = document.getElementById("m-blockSelector").value;
  const testSelectorContainer = document.getElementById("m-testSelectorContainer");
  const blockPromptBanner = document.getElementById("m-blockPromptBanner");
  const questionTypeContainer = document.getElementById("m-questionTypeContainer");
  const questionsListContainer = document.getElementById("m-questionsListContainer");

  if (!blockId) {
    testSelectorContainer.classList.add("hidden");
    blockPromptBanner.classList.remove("hidden");
    questionTypeContainer.classList.add("hidden");
    questionsListContainer.classList.add("hidden");
    resetQuestionWorkspace();
    return;
  }

  blockPromptBanner.classList.add("hidden");
  testSelectorContainer.classList.remove("hidden");

  // Fetch tests for this block
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  
  // Ensure we migrate any existing tests without a blockId to the corresponding block
  tests.forEach(t => {
    if (!t.blockId || t.blockId === "block_level_1" || t.blockId === "block_level_2" || t.blockId === "block_level_3") {
      if (t.blockId === "block_level_1" || t.level === "level_1" || t.id === "test_l1") t.blockId = "block_3";
      else if (t.blockId === "block_level_2" || t.level === "level_2" || t.id === "test_l2") t.blockId = "block_4";
      else if (t.blockId === "block_level_3" || t.level === "level_3" || t.id === "test_l3") t.blockId = "block_5";
      else t.blockId = "block_3"; // Default fall-back
    }
  });
  // Do not call window.saveData here to prevent overwriting concurrent updates.

  const blockTests = tests.filter(t => t.blockId === blockId);
  const testSelector = document.getElementById("m-testSelector");
  const previousTestId = testSelector ? testSelector.value : "";
  
  testSelector.innerHTML = `<option value="">-- Chọn bộ đề thám hiểm --</option>`;

  blockTests.forEach(t => {
    let diffIcon = "🟢 Dễ";
    if (t.difficulty === "medium") diffIcon = "🟡 Trung bình";
    if (t.difficulty === "hard") diffIcon = "🔴 Khó";
    testSelector.innerHTML += `<option value="${t.id}">[${diffIcon}] ${t.title} (${t.questions.length} câu)</option>`;
  });

  if (previousTestId && Array.from(testSelector.options).some(opt => opt.value === previousTestId)) {
    testSelector.value = previousTestId;
  }

  onTestSelectionChange();
}

function onTestSelectionChange() {
  const testId = document.getElementById("m-testSelector").value;
  const questionTypeContainer = document.getElementById("m-questionTypeContainer");
  const questionsListContainer = document.getElementById("m-questionsListContainer");

  if (!testId) {
    questionTypeContainer.classList.add("hidden");
    questionsListContainer.classList.add("hidden");
    resetQuestionWorkspace();
    return;
  }

  questionTypeContainer.classList.remove("hidden");
  questionsListContainer.classList.remove("hidden");

  renderQuestionsList();
  resetQuestionWorkspace();
}

function renderQuestionsList() {
  const testId = document.getElementById("m-testSelector").value;
  const typeFilter = document.getElementById("m-questionTypeFilter").value;
  const listContainer = document.getElementById("m-questionsList");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const test = tests.find(t => t.id === testId);
  if (!test) return;

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const searchQuery = document.getElementById("m-questionSearch").value.toLowerCase();
  
  const missing = test.questions.filter(id => !questions.some(q => q.id === id));
  if (missing.length > 0) {
    listContainer.innerHTML += `<p class="p-2 text-center text-[10px] text-red-500 italic">Cảnh báo: Có ${missing.length} câu hỏi thiếu!</p>`;
  }
  
  const testQuestions = questions.filter(q => test.questions.includes(q.id));

  const filteredQuestions = testQuestions.filter(q => 
    (typeFilter === "" || q.type === typeFilter) &&
    ((q.question || q.text || "").toLowerCase().includes(searchQuery))
  );

  const paginationContainerId = 'questions-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredQuestions.length === 0) {
    listContainer.innerHTML = `<div class="p-6 text-center text-xs text-indigo-300">Không có câu hỏi nào.</div>`;
    return;
  }

  const currentPage = window.teacherPagination.questions || 1;
  const pagedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredQuestions.length, currentPage, paginationContainerId, 'questions');

  pagedQuestions.forEach((q, idxOnPage) => {
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;
    const isSelected = activeQuestionId === q.id;
    const item = document.createElement("div");
    item.className = `grid grid-cols-12 gap-2 px-3 py-2.5 cursor-pointer items-center transition-colors select-none border-b border-indigo-500/5 last:border-0 hover:bg-indigo-500/10 ${isSelected ? 'bg-indigo-500/20 border-l-4 border-l-purple-500' : ''}`;
    item.onclick = () => selectActiveQuestion(q.id);
    item.innerHTML = `
      <div class="col-span-1 text-center text-[10px] font-mono text-indigo-400">${idx + 1}</div>
      <div class="col-span-9 text-xs text-indigo-50 line-clamp-2 pr-2">${q.question || q.text || "(Không có nội dung)"}</div>
      <div class="col-span-2 text-center">
        <span class="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/10 uppercase font-bold">${q.type || "N/A"}</span>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

function renderCustomTestQuestionsList() {
  const listContainer = document.getElementById("customTestQuestionsListContainer");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const searchQuery = (document.getElementById("customTestSearch")?.value || "").toLowerCase();
  const blockSelector = document.getElementById("m-blockSelector");
  const activeBlockId = blockSelector ? blockSelector.value : "";

  let filteredQuestions = questions.filter(q => q.blockId === activeBlockId || q.blockId === "all");

  if (searchQuery) {
    filteredQuestions = filteredQuestions.filter(q => 
      (q.question || q.text || "").toLowerCase().includes(searchQuery)
    );
  }

  if (filteredQuestions.length === 0) {
    listContainer.innerHTML = `<div class="p-4 text-center text-xs text-indigo-300">Không có câu hỏi nào phù hợp.</div>`;
    return;
  }

  filteredQuestions.forEach((q, idx) => {
    const item = document.createElement("label");
    item.className = "grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-white/5 cursor-pointer items-center transition-colors select-none";
    item.innerHTML = `
      <div class="col-span-1 flex justify-center">
        <input type="checkbox" name="customTestQCheck" value="${q.id}" onchange="updateCustomTestSelectedCount()" class="accent-emerald-500 h-4 w-4 cursor-pointer">
      </div>
      <div class="col-span-1 text-center text-[10px] font-mono text-indigo-400">${idx + 1}</div>
      <div class="col-span-8 text-xs text-indigo-50 line-clamp-2 pr-2">${q.question || q.text || "(Không có nội dung)"}</div>
      <div class="col-span-2 text-center">
        <span class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/10 uppercase font-bold">${q.type || "N/A"}</span>
      </div>
    `;
    listContainer.appendChild(item);
  });

  updateCustomTestSelectedCount();
}

function updateCustomTestSelectedCount() {
  const checkboxes = document.querySelectorAll('input[name="customTestQCheck"]:checked');
  const count = checkboxes ? checkboxes.length : 0;
  const countEl = document.getElementById("customTestSelectedCount");
  if (countEl) countEl.innerText = count;
}

function handleSelectRange() {
  const startInput = document.getElementById("rangeStart");
  const endInput = document.getElementById("rangeEnd");
  if (!startInput || !endInput) return;

  const start = parseInt(startInput.value);
  const end = parseInt(endInput.value);
  
  if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
    if (window.showToast) window.showToast("Phạm vi không hợp lệ!", "error");
    return;
  }

  const checkboxes = document.querySelectorAll('input[name="customTestQCheck"]');
  checkboxes.forEach((cb, idx) => {
    const stt = idx + 1;
    if (stt >= start && stt <= end) {
      cb.checked = true;
    }
  });
  
  updateCustomTestSelectedCount();
  if (window.showToast) window.showToast(`Đã chọn câu hỏi từ ${start} đến ${end}`);
}

async function handleCustomTestFormSubmit(e) {
  e.preventDefault();
  
  const titleInput = document.getElementById("customTestTitleInput");
  const durationInput = document.getElementById("customTestDurationInput");
  const blockSelector = document.getElementById("m-blockSelector");
  
  if (!titleInput || !durationInput || !blockSelector) return;
  
  const title = titleInput.value.trim();
  const duration = parseInt(durationInput.value) || 45;
  const selectedCheckboxes = document.querySelectorAll('input[name="customTestQCheck"]:checked');
  
  if (!selectedCheckboxes || selectedCheckboxes.length === 0) {
    if (window.showToast) window.showToast("Vui lòng chọn ít nhất một câu hỏi!", "error");
    return;
  }

  const selectedQuestionIds = Array.from(selectedCheckboxes).map(cb => cb.value);
  const activeBlockId = blockSelector.value;
  
  if (!activeBlockId) {
    if (window.showToast) window.showToast("Lỗi: Không xác định được khối lớp!", "error");
    return;
  }

  let calculatedLevel = "level_1";
  if (activeBlockId.toLowerCase().includes("level_2") || activeBlockId.includes("2")) {
    calculatedLevel = "level_2";
  } else if (activeBlockId.toLowerCase().includes("level_3") || activeBlockId.includes("3")) {
    calculatedLevel = "level_3";
  }

  const id = `test_${Date.now().toString().slice(-8)}`;
  const currentUser = (typeof getTeacherUser === 'function' ? getTeacherUser() : null) || { email: "teacher@gmail.com" };

  const testObj = {
    id,
    title,
    blockId: activeBlockId,
    level: calculatedLevel,
    difficulty: "medium",
    duration,
    questions: selectedQuestionIds,
    questionCount: selectedQuestionIds.length,
    scoreVal: 100,
    createdBY: currentUser.email,
    createdAt: new Date().toISOString()
  };

  try {
    if (!window.IC3_CACHE || !window.IC3_KEYS) throw new Error("Dữ liệu chưa sẵn sàng");

    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
    tests.push(testObj);
    
    if (window.fStore && window.db) {
      await window.fStore.setDoc(window.fStore.doc(window.db, window.IC3_KEYS.TESTS, id), testObj, { merge: true });
    } else {
      throw new Error("Dịch vụ Firebase chưa khởi tạo");
    }
    
    if (window.showToast) window.showToast("Tạo bộ đề tự chọn thành công!");
    closeCustomTestGeneratorModal();

    if (typeof onBlockSelectionChange === 'function') {
      onBlockSelectionChange();
    }

    setTimeout(() => {
      const testSelector = document.getElementById("m-testSelector");
      if (testSelector) {
        testSelector.value = id;
        if (typeof onTestSelectionChange === 'function') {
          onTestSelectionChange();
        }
      }
    }, 200);

  } catch (err) {
    console.error("Error creating custom test:", err);
    if (window.showToast) window.showToast("Tạo bộ đề thất bại: " + err.message, "error");
  }
}

function openCombineTestsModal() {
  const modal = document.getElementById("combineTestsModal");
  if (!modal) return;

  // Reset inputs
  document.getElementById("combineTestTitleInput").value = "Đề ôn tập tổng hợp";
  document.getElementById("combineTestDurationInput").value = "45";
  document.getElementById("combineTestDifficultyInput").value = "medium";

  const container = document.getElementById("combineTestsListContainer");
  if (!container) return;

  const activeBlockId = document.getElementById("m-blockSelector") ? document.getElementById("m-blockSelector").value : "";
  if (!activeBlockId) {
    container.innerHTML = `<p class="text-[11px] text-red-400 italic text-center py-2">Vui lòng chọn Khối lớp trước.</p>`;
    modal.classList.remove("hidden");
    return;
  }

  const tests = (window.IC3_CACHE && window.IC3_CACHE[window.IC3_KEYS.TESTS]) || [];
  const filteredTests = tests.filter(t => t.blockId === activeBlockId);

  if (filteredTests.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-indigo-300 italic text-center py-2">Không có bộ đề nào khả dụng trong khối này.</p>`;
  } else {
    container.innerHTML = filteredTests.map(test => {
      const qCount = test.questionCount || (test.questions ? test.questions.length : 0);
      return `
        <label class="flex items-center gap-2 text-xs text-indigo-200 cursor-pointer hover:text-indigo-100 p-1.5 rounded hover:bg-[#1e293b]/50 transition-colors">
          <input type="checkbox" name="combineTestCheck" value="${test.id}" class="rounded border-indigo-500/30 text-indigo-500 bg-[#131424]">
          <span class="truncate">${test.title} <span class="text-indigo-400 font-mono">(${qCount} câu)</span></span>
        </label>
      `;
    }).join('');
  }

  modal.classList.remove("hidden");
}

function closeCombineTestsModal() {
  document.getElementById("combineTestsModal").classList.add("hidden");
}

function handleCombineTestsFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("combineTestTitleInput").value.trim();
  const duration = parseInt(document.getElementById("combineTestDurationInput").value) || 45;
  const difficulty = document.getElementById("combineTestDifficultyInput").value;

  const checkboxes = document.querySelectorAll('input[name="combineTestCheck"]:checked');
  if (checkboxes.length === 0) {
    window.showToast("Vui lòng chọn ít nhất một bộ đề để gộp!", "error");
    return;
  }

  const selectedTestIds = Array.from(checkboxes).map(cb => cb.value);
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  
  // Merge questions without duplicates
  const mergedQuestionIdsSet = new Set();
  selectedTestIds.forEach(testId => {
    const test = tests.find(t => t.id === testId);
    if (test && Array.isArray(test.questions)) {
      test.questions.forEach(qId => mergedQuestionIdsSet.add(qId));
    }
  });

  const mergedQuestionIds = Array.from(mergedQuestionIdsSet);
  if (mergedQuestionIds.length === 0) {
    window.showToast("Các bộ đề được chọn không chứa câu hỏi nào!", "error");
    return;
  }

  const activeBlockId = document.getElementById("m-blockSelector").value;
  let calculatedLevel = "level_1";
  if (activeBlockId.includes("level_2") || activeBlockId.includes("2")) {
    calculatedLevel = "level_2";
  } else if (activeBlockId.includes("level_3") || activeBlockId.includes("3")) {
    calculatedLevel = "level_3";
  }

  const id = `test_${Date.now().toString().slice(-6)}`;
  const currentUser = getTeacherUser() || { email: "teacher@gmail.com" };

  const testObj = {
    id,
    title,
    blockId: activeBlockId,
    level: calculatedLevel,
    difficulty,
    duration,
    questions: mergedQuestionIds,
    questionCount: mergedQuestionIds.length,
    scoreVal: 100,
    createdBY: currentUser.email
  };

  tests.push(testObj);

  // Save to Firestore
  window.fStore.setDoc(window.fStore.doc(window.db, window.IC3_KEYS.TESTS, id), testObj, { merge: true })
    .then(() => {
      window.showToast("Đã tạo đề ôn tập tổng hợp thành công!");
      closeCombineTestsModal();

      // Reload block tests
      onBlockSelectionChange();

      // Auto-select modified test
      document.getElementById("m-testSelector").value = id;
      onTestSelectionChange();
    })
    .catch((err) => {
      console.error("Error creating combined test: ", err);
      window.showToast("Gộp đề thất bại, vui lòng thử lại!", "error");
    });
}

window.openCombineTestsModal = openCombineTestsModal;
window.closeCombineTestsModal = closeCombineTestsModal;
window.handleCombineTestsFormSubmit = handleCombineTestsFormSubmit;

function openTestSetModal(action) {
  const modal = document.getElementById("testSetModal");
  if (!modal) return;
  const actionInput = document.getElementById("test-set-form-action");
  const titleEl = document.getElementById("test-set-modal-title");
  const idInput = document.getElementById("testSetIdInput");
  const difficultyInput = document.getElementById("testSetDifficultyInput");
  const titleInput = document.getElementById("testSetTitleInput");
  const durationInput = document.getElementById("testSetDurationInput");
  const bossPokeInput = document.getElementById("testSetBossPokeInput");

  const activeBlockId = document.getElementById("m-blockSelector") ? document.getElementById("m-blockSelector").value : "";
  if (!activeBlockId) {
    if (window.showToast) window.showToast("Vui lòng chọn khối lớp trước!", "error");
    return;
  }

  if (action === "add") {
    if (actionInput) actionInput.value = "add";
    if (titleEl) titleEl.innerText = "Tạo bộ đề thám hiểm mới";
    if (idInput) idInput.value = "";
    if (difficultyInput) difficultyInput.value = "easy";
    if (titleInput) titleInput.value = "";
    if (durationInput) durationInput.value = "15";
    if (bossPokeInput) bossPokeInput.value = "trevenant";
    modal.classList.remove("hidden");
  } else if (action === "edit") {
    const selector = document.getElementById("m-testSelector");
    const activeTestId = selector ? selector.value : "";
    if (!activeTestId) {
      if (window.showToast) window.showToast("Vui lòng chọn bộ đề cần sửa!", "error");
      return;
    }
    const tests = (window.IC3_CACHE && window.IC3_CACHE[window.IC3_KEYS.TESTS]) || [];
    const test = tests.find(t => t.id === activeTestId);
    if (!test) return;

    if (actionInput) actionInput.value = "edit";
    if (titleEl) titleEl.innerText = "Chỉnh sửa bộ đề thám hiểm";
    if (idInput) idInput.value = test.id;
    if (difficultyInput) difficultyInput.value = test.difficulty || "easy";
    if (titleInput) titleInput.value = test.title || "";
    if (durationInput) durationInput.value = test.duration || "15";
    if (bossPokeInput) bossPokeInput.value = test.bossPoke || "trevenant";
    modal.classList.remove("hidden");
  }
}

function closeTestSetModal() {
  const modal = document.getElementById("testSetModal");
  if (modal) modal.classList.add("hidden");
}

function handleTestSetFormSubmit(e) {
  e.preventDefault();
  const action = document.getElementById("test-set-form-action").value;
  const idInput = document.getElementById("testSetIdInput");
  const id = action === "add" ? `test_${Date.now().toString().slice(-6)}` : idInput.value;
  
  const difficulty = document.getElementById("testSetDifficultyInput").value;
  const title = document.getElementById("testSetTitleInput").value.trim();
  const duration = parseInt(document.getElementById("testSetDurationInput").value) || 15;
  const bossPoke = document.getElementById("testSetBossPokeInput").value;

  if (!title) {
    if (window.showToast) window.showToast("Vui lòng điền đầy đủ tiêu đề!", "error");
    return;
  }

  const activeBlockId = document.getElementById("m-blockSelector") ? document.getElementById("m-blockSelector").value : "";
  if (!activeBlockId) {
    if (window.showToast) window.showToast("Vui lòng chọn khối lớp!", "error");
    return;
  }

  let calculatedLevel = "level_1";
  if (activeBlockId.includes("level_2") || activeBlockId.includes("2")) {
    calculatedLevel = "level_2";
  } else if (activeBlockId.includes("level_3") || activeBlockId.includes("3")) {
    calculatedLevel = "level_3";
  }

  const tests = (window.IC3_CACHE && window.IC3_CACHE[window.IC3_KEYS.TESTS]) || [];
  const currentUser = getTeacherUser() || { email: "teacher@gmail.com" };

  let testObj;
  if (action === "add") {
    testObj = {
      id,
      title,
      blockId: activeBlockId,
      level: calculatedLevel,
      difficulty,
      duration,
      questions: [],
      questionCount: 0,
      scoreVal: 100,
      bossPoke,
      createdBY: currentUser.email
    };
    tests.push(testObj);
  } else {
    // edit
    const existingIndex = tests.findIndex(t => t.id === id);
    if (existingIndex > -1) {
      testObj = {
        ...tests[existingIndex],
        title,
        difficulty,
        duration,
        bossPoke
      };
      tests[existingIndex] = testObj;
    } else {
      testObj = {
        id,
        title,
        blockId: activeBlockId,
        level: calculatedLevel,
        difficulty,
        duration,
        questions: [],
        questionCount: 0,
        scoreVal: 100,
        bossPoke,
        createdBY: currentUser.email
      };
      tests.push(testObj);
    }
  }

  // Save to Firestore
  window.fStore.setDoc(window.fStore.doc(window.db, window.IC3_KEYS.TESTS, id), testObj, { merge: true })
    .then(() => {
      if (window.showToast) window.showToast(action === "add" ? "Đã tạo bộ đề thám hiểm mới thành công!" : "Đã cập nhật bộ đề thám hiểm thành công!", "success");
      closeTestSetModal();

      // Reload block tests
      onBlockSelectionChange();

      // Auto-select modified/created test
      const testSelector = document.getElementById("m-testSelector");
      if (testSelector) {
        testSelector.value = id;
        onTestSelectionChange();
      }
    })
    .catch((err) => {
      console.error("Error saving test: ", err);
      if (window.showToast) window.showToast("Lưu bộ đề thất bại, vui lòng thử lại!", "error");
    });
}

function deleteCurrentTestSet() {
  const testId = document.getElementById("m-testSelector").value;
  if (!testId) {
    window.showToast("Vui lòng chọn bộ đề cần xóa!", 'error');
    return;
  }

  showConfirmModal(
    "Xóa bộ đề",
    "Bạn có chắc chắn muốn xóa bộ đề thám hiểm này? Mọi liên kết và câu hỏi đi kèm sẽ bị gỡ bỏ.",
    () => {
      const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
      window.IC3_CACHE[window.IC3_KEYS.TESTS] = tests.filter(t => t.id !== testId);
      
      // Actually delete the doc from Firestore
      window.fStore.deleteDoc(window.fStore.doc(window.db, window.IC3_KEYS.TESTS, testId));

      window.showToast("Đã xóa bộ đề thành công!");
      onBlockSelectionChange();
    }
  );
}


// ==================== RESULTS HISTORY ====================
function renderResultsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  const emails = classStudents.map(s => s.email);

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  let classScores = scores.filter(sc => emails.includes(sc.studentEmail));
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  const searchInput = document.getElementById("resultsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

  if (searchQuery) {
    classScores = classScores.filter(sc => {
      const std = classStudents.find(s => s.email === sc.studentEmail);
      const nameMatch = std && std.name && std.name.toLowerCase().includes(searchQuery);
      const emailMatch = sc.studentEmail.toLowerCase().includes(searchQuery);
      const test = tests.find(t => t.id === sc.testId);
      const testMatch = test && test.title && test.title.toLowerCase().includes(searchQuery);
      return nameMatch || emailMatch || testMatch;
    });
  }

  const body = document.getElementById("teacher-results-table-body");
  body.innerHTML = "";

  const paginationContainerId = 'results-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  const levelLabels = {
    level_1: `<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold border border-blue-200">Level 1</span>`,
    level_2: `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold border border-emerald-200">Level 2</span>`,
    level_3: `<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold border border-purple-200">Level 3</span>`
  };

  if (classScores.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-indigo-300 text-xs">Chưa học sinh nào trong lớp làm bài thi.</td></tr>`;
    return;
  }

  // Sort scores by date desc
  classScores.sort((a, b) => new Date(b.date) - new Date(a.date));

  const currentPage = window.teacherPagination.results || 1;
  const pagedScores = classScores.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(classScores.length, currentPage, paginationContainerId, 'results');

  pagedScores.forEach(sc => {
    const student = students.find(s => s.email === sc.studentEmail) || { name: sc.studentEmail };
    const test = tests.find(t => t.id === sc.testId) || { title: sc.testId, level: "level_1" };
    
    const isPassed = sc.score >= 50;
    const ratingBadge = isPassed 
      ? `<span class="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold border border-green-200">ĐẠT CHUẨN</span>`
      : `<span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-200">CHƯA ĐẠT</span>`;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-[#131424]/80 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-4 py-3.5 font-bold text-indigo-50">${student.name}</td>
      <td class="px-4 py-3.5 text-indigo-100 max-w-xs truncate" title="${test.title}">${test.title}</td>
      <td class="px-4 py-3.5">${levelLabels[test.level] || levelLabels["level_1"]}</td>
      <td class="px-4 py-3.5 font-mono font-bold text-indigo-50 text-sm">${sc.score}/100</td>
      <td class="px-4 py-3.5 font-mono text-indigo-300"><i class="fa-regular fa-clock mr-1"></i>${sc.timeSpent}</td>
      <td class="px-4 py-3.5 text-indigo-300">${sc.date}</td>
      <td class="px-4 py-3.5">${ratingBadge}</td>
    `;
    body.appendChild(tr);
  });
}


// ==================== CLASS RANKING ====================
function renderClassRanking() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  let classStudents = students.filter(s => s.classId === activeClassId);

  const searchInput = document.getElementById("rankingSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
  if (searchQuery) {
    classStudents = classStudents.filter(s => s.name && s.name.toLowerCase().includes(searchQuery));
  }

  const leaderboardEl = document.getElementById("class-ranking-leaderboard");
  leaderboardEl.innerHTML = "";
  
  const paginationContainerId = 'ranking-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (classStudents.length === 0) {
    leaderboardEl.innerHTML = `<div class="py-8 text-center text-indigo-300 text-sm italic">Không có dữ liệu xếp hạng.</div>`;
    return;
  }

  // Sort by EXP desc
  classStudents.sort((a, b) => b.exp - a.exp);
  
  const currentPage = window.teacherPagination.ranking || 1;
  const pagedRanked = classStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(classStudents.length, currentPage, paginationContainerId, 'ranking');


  const pokemonIcons = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  pagedRanked.forEach((std, idxOnPage) => {
    const index = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;
    let medal = `<span class="font-poppins font-extrabold text-base text-indigo-300 w-8 text-center">${index + 1}</span>`;
    if (index === 0) medal = `<span class="w-8 flex justify-center text-xl">🥇</span>`;
    else if (index === 1) medal = `<span class="w-8 flex justify-center text-xl">🥈</span>`;
    else if (index === 2) medal = `<span class="w-8 flex justify-center text-xl">🥉</span>`;

    const div = document.createElement("div");
    div.className = "flex items-center justify-between p-4 rounded-xl bg-[#1a1c2e] border border-indigo-500/30 hover:border-indigo-500/30 hover:shadow-sm transition-all gap-4";
    div.innerHTML = `
      <div class="flex items-center gap-4">
        ${medal}
        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg border border-indigo-500/30 shadow-inner">
          ${window.pokemonAvatars[std.pokemon] || "🦊"}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-sm text-indigo-50">${std.name}</h4>
            <span class="px-1.5 py-0.5 text-[8px] font-bold bg-slate-100 border border-indigo-500/30 text-indigo-200 rounded-full">${std.rank}</span>
          </div>
          <span class="text-[10px] text-indigo-300 font-mono block">${std.email}</span>
        </div>
      </div>
      <div class="text-right">
        <span class="font-mono text-xs font-bold text-emerald-600 block">${std.exp} EXP</span>
        <span class="text-[10px] text-yellow-600 font-semibold block"><i class="fa-solid fa-coins"></i> ${std.coins || 0} Coins</span>
      </div>
    `;
    leaderboardEl.appendChild(div);
  });
}


// ==================== CLASS CRUD MODALS ====================

let classToDeleteId = null;

window.deleteClass = function(classId) {
  classToDeleteId = classId;
  const modal = document.getElementById("confirmDeleteClassModal");
  if(modal) modal.classList.remove("hidden");
};

window.closeConfirmDeleteClassModal = function() {
  classToDeleteId = null;
  const modal = document.getElementById("confirmDeleteClassModal");
  if(modal) modal.classList.add("hidden");
};

document.getElementById("btnConfirmDeleteClass")?.addEventListener("click", function() {
  if (!classToDeleteId) return;
  const classId = classToDeleteId;
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const updatedClasses = classes.filter(c => c.id !== classId);
  window.saveData(window.IC3_KEYS.CLASSES, updatedClasses);
  
  const teacher = getTeacherUser();
  if (teacher && teacher.classes) {
    teacher.classes = teacher.classes.filter(id => id !== classId);
    localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(teacher));
    syncTeacherDataToCollections(teacher);
  }

  if (activeClassId === classId) {
    activeClassId = "";
  }
  
  initClassSelector();
  closeConfirmDeleteClassModal();
  window.showToast("Đã xóa lớp thành công!", "success");
});

let fetchedSheetStudents = [];

window.switchClassModalTab = function(tab) {
  const manualBtn = document.getElementById("tabBtn-manualClass");
  const sheetBtn = document.getElementById("tabBtn-sheetClass");
  const manualForm = document.getElementById("classForm");
  const sheetForm = document.getElementById("classSheetForm");

  if (tab === 'manual') {
    manualBtn.className = "px-4 py-2 text-xs font-bold text-emerald-400 border-b-2 border-emerald-400";
    sheetBtn.className = "px-4 py-2 text-xs font-bold text-indigo-300 border-b-2 border-transparent";
    manualForm.classList.remove("hidden");
    sheetForm.classList.add("hidden");
  } else {
    sheetBtn.className = "px-4 py-2 text-xs font-bold text-emerald-400 border-b-2 border-emerald-400";
    manualBtn.className = "px-4 py-2 text-xs font-bold text-indigo-300 border-b-2 border-transparent";
    sheetForm.classList.remove("hidden");
    manualForm.classList.add("hidden");
    loadSchoolsFromSheet();
  }
};

window.loadSchoolsFromSheet = async function() {
  const wrapper = document.getElementById("sheetFieldsWrapper");
  const loading = document.getElementById("sheetLoadingWrapper");
  const schoolSelect = document.getElementById("sheetSchoolSelect");
  
  wrapper.classList.add("hidden");
  loading.classList.remove("hidden");
  schoolSelect.innerHTML = '<option value="">-- Chọn Trường --</option>';
  
  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) {
      window.showToast("Chưa cấu hình Google Sheets trong Admin", "error");
      closeClassModal();
      return;
    }
    
    const students = await window.fetchGoogleSheetData(config.spreadsheetId, config.studentSheetName || "Tổng quát");
    fetchedSheetStudents = students || [];
    
    const schools = [...new Set(fetchedSheetStudents.map(s => s.school || "Mặc định"))];
    
    schools.forEach(sch => {
      schoolSelect.innerHTML += `<option value="${sch}">${sch}</option>`;
    });
  } catch (error) {
    console.error("Error loading schools:", error);
    window.showToast("Lỗi tải danh sách từ Google Sheets", "error");
  } finally {
    wrapper.classList.remove("hidden");
    loading.classList.add("hidden");
  }
};

window.updateSheetClassDropdown = function() {
  const school = document.getElementById("sheetSchoolSelect").value;
  const classSelect = document.getElementById("sheetClassSelect");
  classSelect.innerHTML = '<option value="">-- Chọn Lớp --</option>';
  
  if (!school) return;
  
  const classesForSchool = [...new Set(fetchedSheetStudents.filter(s => (s.school || "Mặc định") === school).map(s => s.className))];
  
  classesForSchool.forEach(cls => {
    if (cls) {
      classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
    }
  });
};

document.getElementById("classSheetForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const school = document.getElementById("sheetSchoolSelect").value;
  const className = document.getElementById("sheetClassSelect").value;
  
  if (!school || !className) return window.showToast("Vui lòng chọn trường và lớp", "error");
  
  const cleanStringForId = (str) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
  };
  
  const classId = `class_${cleanStringForId(school)}_${cleanStringForId(className)}`;
  const displayClassName = `${className} - ${school}`;
  
  const currentClasses = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const existingClass = currentClasses.find(c => c.id === classId);

  const teacher = getTeacherUser();
  if (!teacher) return;

  if (!existingClass) {
    const newClass = {
      id: classId,
      name: displayClassName,
      teacherEmail: teacher.email,
      isFromSheet: true, // Mark this class as synced from sheet
      sheetSchool: school,
      sheetClassName: className,
      createdAt: new Date().toISOString()
    };
    
    currentClasses.push(newClass);
    window.saveData(window.IC3_KEYS.CLASSES, currentClasses, classId);
  }

  if (!teacher.classes) teacher.classes = [];
  if (!teacher.classes.includes(classId)) teacher.classes.push(classId);
  localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(teacher));
  
  syncTeacherDataToCollections(teacher);

  // also add students immediately
  const studentsInClass = fetchedSheetStudents.filter(s => (s.school || "Mặc định") === school && s.className === className);
  const allStudents = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  
  let newStudentsCount = 0;
  let newStudentIds = [];
  studentsInClass.forEach(s => {
    const studentId = cleanStringForId(s.name) + "_" + cleanStringForId(className) + "_" + cleanStringForId(school) + "_" + s.rowIndex;
    const sEmail = `${studentId}@ic3lms.edu.vn`;
    if (!allStudents.some(ex => ex.id === sEmail || ex.email === sEmail)) {
      allStudents.push({
        id: sEmail,
        email: sEmail,
        name: s.name,
        classId: classId,
        password: s.password,
        badges: [],
        level: "Tân binh",
        pokemon: "pikachu",
        coins: 0,
        testsCompleted: 0,
        isFirstLogin: true
      });
      newStudentIds.push(sEmail);
      newStudentsCount++;
    }
  });
  window.saveData(window.IC3_KEYS.STUDENTS, allStudents, newStudentIds);
  
  initClassSelector();
  closeClassModal();
  window.showToast(`Tạo lớp thành công! Đã đồng bộ ${newStudentsCount} học sinh.`, "success");
});

function openClassModal() {
  const modal = document.getElementById("classModal");
  document.getElementById("classForm").reset();
  modal.classList.remove("hidden");
}

function closeClassModal() {
  document.getElementById("classModal").classList.add("hidden");
}

function handleClassSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("classIdInput").value.trim().toLowerCase();
  const name = document.getElementById("classNameInput").value.trim();
  const teacher = getTeacherUser();
  if (!teacher) return;

  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];
  if (classes.some(c => c.id === id)) {
    window.showToast("Mã định danh lớp học này đã bị trùng!", 'error');
    return;
  }

  const newClass = {
    id,
    name,
    teacherEmail: teacher.email,
    studentCount: 0
  };

  classes.push(newClass);
  window.saveData(window.IC3_KEYS.CLASSES, classes, id);

  if (!teacher.classes) teacher.classes = [];
  if (!teacher.classes.includes(id)) teacher.classes.push(id);
  localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(teacher));
  
  syncTeacherDataToCollections(teacher);

  closeClassModal();
  initClassSelector();
}

window.addDragTextRow = function() {
    const container = document.getElementById('drag-text-rows');
    const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm";
    const div = document.createElement('div');
    div.className = "grid grid-cols-2 gap-4";
    div.innerHTML = `
        <input type="text" class="dt-left ${inputClass}" placeholder="Từ khóa vế trái" value="">
        <input type="text" class="dt-right ${inputClass}" placeholder="Nhãn khớp vế phải" value="">
    `;
    container.appendChild(div);
};

window.addDragImageTextRow = function() {
    const container = document.getElementById('drag-image-text-rows');
    const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm";
    const div = document.createElement('div');
    div.className = "grid grid-cols-2 gap-4";
    div.innerHTML = `
        <input type="text" class="dit-left ${inputClass}" placeholder="URL ảnh..." value="">
        <input type="text" class="dit-right ${inputClass}" placeholder="Nhãn khớp" value="">
    `;
    container.appendChild(div);
};


window.tmData = { columns: [], rows: [], correctAnswers: [] };

window.renderTableMatchUI = function() {
    const container = document.getElementById('tm-container');
    if (!container) return;
    
    // Render columns
    const colsContainer = document.getElementById('tm-cols');
    colsContainer.innerHTML = tmData.columns.map((col, idx) => `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm">
            <span class="text-xs font-bold bg-purple-500 text-white rounded px-1.5 py-0.5">C${idx + 1}</span>
            <input type="text" value="${col}" onchange="window.updateTmColumn(${idx}, this.value)" class="bg-transparent outline-none w-24 text-sm font-semibold">
            <button type="button" onclick="window.removeTmColumn(${idx})" class="text-purple-400 hover:text-red-400"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');

    // Render rows table
    const rowsContainer = document.getElementById('tm-rows-tbody');
    let headerHtml = '<th class="p-3 font-bold text-indigo-300">Hàng hỏi / Nhãn mô tả</th>';
    tmData.columns.forEach(col => {
        headerHtml += `<th class="p-3 text-center font-bold text-indigo-300 uppercase text-xs">${col}</th>`;
    });
    headerHtml += '<th class="p-3 text-center font-bold text-indigo-300">Xóa</th>';
    document.getElementById('tm-rows-thead').innerHTML = `<tr class="border-b border-indigo-500/30 bg-[#131424]/80 text-left">${headerHtml}</tr>`;

    rowsContainer.innerHTML = tmData.rows.map((row, rIdx) => {
        let rowHtml = `<td class="p-2"><div class="flex items-center gap-2">
            <span class="text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center shrink-0">H${rIdx + 1}</span>
            <input type="text" value="${row}" onchange="window.updateTmRow(${rIdx}, this.value)" class="w-full p-2 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 text-sm outline-none focus:border-purple-500">
        </div></td>`;
        
        tmData.columns.forEach((col, cIdx) => {
            const isChecked = tmData.correctAnswers[rIdx] === cIdx;
            rowHtml += `<td class="p-2 text-center">
                <input type="radio" name="tm_row_${rIdx}" value="${cIdx}" ${isChecked ? 'checked' : ''} onchange="window.updateTmAnswer(${rIdx}, ${cIdx})" class="w-5 h-5 text-purple-500 border-indigo-500/50 bg-[#1a1c2e] focus:ring-purple-500 cursor-pointer">
            </td>`;
        });
        
        rowHtml += `<td class="p-2 text-center">
            <button type="button" onclick="window.removeTmRow(${rIdx})" class="text-indigo-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
        </td>`;
        
        return `<tr class="border-b border-indigo-500/10 hover:bg-[#131424]/40 transition-colors">${rowHtml}</tr>`;
    }).join('');
    
    document.getElementById('tm-col-count').innerText = `(${tmData.columns.length})`;
    document.getElementById('tm-row-count').innerText = `(${tmData.rows.length})`;
};

window.addTmColumn = function() {
    tmData.columns.push("Cột mới");
    window.renderTableMatchUI();
};
window.updateTmColumn = function(idx, val) {
    tmData.columns[idx] = val;
    window.renderTableMatchUI();
};
window.removeTmColumn = function(idx) {
    tmData.columns.splice(idx, 1);
    // adjust correctAnswers
    for (let i = 0; i < tmData.correctAnswers.length; i++) {
        if (tmData.correctAnswers[i] === idx) tmData.correctAnswers[i] = -1;
        else if (tmData.correctAnswers[i] > idx) tmData.correctAnswers[i]--;
    }
    window.renderTableMatchUI();
};
window.addTmRow = function() {
    tmData.rows.push("Hàng mới");
    tmData.correctAnswers.push(-1);
    window.renderTableMatchUI();
};
window.updateTmRow = function(idx, val) {
    tmData.rows[idx] = val;
};
window.removeTmRow = function(idx) {
    tmData.rows.splice(idx, 1);
    tmData.correctAnswers.splice(idx, 1);
    window.renderTableMatchUI();
};
window.updateTmAnswer = function(rIdx, cIdx) {
    tmData.correctAnswers[rIdx] = cIdx;
};

// === HOTSPOT QUESTION LOGIC ===
window.hotspotAreas = [];
window.isDrawingHotspot = false;
window.hotspotStartPos = { x: 0, y: 0 };
window.tempHotspotBox = null;

window.updateHotspotPreview = () => {
    let inputEl = document.getElementById('hotspot-img-url');
    let url = convertDriveUrl(inputEl.value.trim());
    inputEl.value = url;
    
    const img = document.getElementById('hotspot-preview-img');
    img.onerror = () => {
        window.showToast("Không thể tải ảnh. Hãy chắc chắn rằng link Drive đã được chia sẻ công khai với quyền 'Anyone with the link' (Bất kỳ ai có đường liên kết đều có thể xem).");
    };
    if (url) {
        img.src = url;
        img.style.display = 'block';
    } else {
        img.src = '';
        img.style.display = 'none';
    }
    window.renderHotspotAreas();
};

window.triggerHotspotUpload = () => {
    document.getElementById('hotspot-img-upload').click();
};

window.handleHotspotImgUpload = async (input) => {
    if (!input.files || !input.files[0]) return;
    try {
        const base64 = await readFileAsBase64(input.files[0]);
        document.getElementById('hotspot-img-url').value = base64;
        window.updateHotspotPreview();
    } catch (e) {
        window.showToast("Lỗi đọc file hình ảnh!", 'error');
    }
};

window.addHotspotArea = () => {
    const url = document.getElementById('hotspot-img-url').value.trim();
    if (!url) {
        window.showToast("Vui lòng nhập URL hình ảnh hoặc tải ảnh lên trước.", 'error');
        return;
    }
    window.isDrawingHotspot = true;
    document.getElementById('hotspot-instruction').innerText = "Đang ở chế độ vẽ: Kéo chuột trên ảnh để vẽ khu vực.";
    document.getElementById('hotspot-instruction').classList.add('text-green-400');
    document.getElementById('hotspot-instruction').classList.remove('text-yellow-400');
    document.getElementById('hotspot-overlay').style.pointerEvents = 'auto';
};

window.removeHotspotArea = (index) => {
    window.hotspotAreas.splice(index, 1);
    window.renderHotspotAreas();
};

window.renderHotspotAreas = () => {
    // Render list
    const list = document.getElementById('hotspot-list');
    if (!list) return;
    list.innerHTML = '';
    window.hotspotAreas.forEach((area, i) => {
        list.innerHTML += `
            <div class="flex justify-between items-center bg-[#131424] p-2 rounded border border-indigo-500/30">
               <span class="text-xs text-indigo-200">Khu vực ${i+1}: X=${Math.round(area.x)}%, Y=${Math.round(area.y)}%, W=${Math.round(area.w)}%, H=${Math.round(area.h)}%</span>
               <button type="button" onclick="window.removeHotspotArea(${i})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });
    
    // Render boxes on overlay
    const overlay = document.getElementById('hotspot-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    window.hotspotAreas.forEach((area, i) => {
        const box = document.createElement('div');
        box.className = 'absolute border-2 border-green-500 bg-green-500/20 cursor-grab flex items-center justify-center text-green-300 font-bold text-xs';
        box.style.left = `${area.x}%`;
        box.style.top = `${area.y}%`;
        box.style.width = `${area.w}%`;
        box.style.height = `${area.h}%`;
        box.innerText = i + 1;
        
        box.draggable = true;
        box.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', i);
        });
        
        overlay.appendChild(box);
    });
    
    // Allow dropping onto the overlay to update position
    overlay.addEventListener('dragover', (e) => e.preventDefault());
    overlay.addEventListener('drop', (e) => {
        e.preventDefault();
        const index = e.dataTransfer.getData('text/plain');
        if (index === '') return;
        
        const rect = overlay.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Update position (centering it)
        window.hotspotAreas[index].x = Math.max(0, Math.min(100 - window.hotspotAreas[index].w, x - (window.hotspotAreas[index].w / 2)));
        window.hotspotAreas[index].y = Math.max(0, Math.min(100 - window.hotspotAreas[index].h, y - (window.hotspotAreas[index].h / 2)));
        
        window.renderHotspotAreas();
    });
};

window.initHotspotDrawing = () => {
    const overlay = document.getElementById('hotspot-overlay');
    if (!overlay) return;
    
    let isDragging = false;
    
    overlay.addEventListener('mousedown', (e) => {
        if (!window.isDrawingHotspot) return;
        isDragging = true;
        const rect = overlay.getBoundingClientRect();
        window.hotspotStartPos = {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
        
        window.tempHotspotBox = document.createElement('div');
        window.tempHotspotBox.className = 'absolute border-2 border-blue-500 bg-blue-500/30 pointer-events-none';
        window.tempHotspotBox.style.left = `${window.hotspotStartPos.x}%`;
        window.tempHotspotBox.style.top = `${window.hotspotStartPos.y}%`;
        window.tempHotspotBox.style.width = '0%';
        window.tempHotspotBox.style.height = '0%';
        overlay.appendChild(window.tempHotspotBox);
    });
    
    overlay.addEventListener('mousemove', (e) => {
        if (!isDragging || !window.tempHotspotBox) return;
        const rect = overlay.getBoundingClientRect();
        let currX = ((e.clientX - rect.left) / rect.width) * 100;
        let currY = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Clamp to 0-100
        currX = Math.max(0, Math.min(100, currX));
        currY = Math.max(0, Math.min(100, currY));
        
        const x = Math.min(window.hotspotStartPos.x, currX);
        const y = Math.min(window.hotspotStartPos.y, currY);
        const w = Math.abs(currX - window.hotspotStartPos.x);
        const h = Math.abs(currY - window.hotspotStartPos.y);
        
        window.tempHotspotBox.style.left = `${x}%`;
        window.tempHotspotBox.style.top = `${y}%`;
        window.tempHotspotBox.style.width = `${w}%`;
        window.tempHotspotBox.style.height = `${h}%`;
    });
    
    overlay.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const rect = overlay.getBoundingClientRect();
        let currX = ((e.clientX - rect.left) / rect.width) * 100;
        let currY = ((e.clientY - rect.top) / rect.height) * 100;
        
        currX = Math.max(0, Math.min(100, currX));
        currY = Math.max(0, Math.min(100, currY));
        
        const x = Math.min(window.hotspotStartPos.x, currX);
        const y = Math.min(window.hotspotStartPos.y, currY);
        const w = Math.abs(currX - window.hotspotStartPos.x);
        const h = Math.abs(currY - window.hotspotStartPos.y);
        
        if (w > 2 && h > 2) { // Minimum size to avoid accidental clicks
            window.hotspotAreas.push({ x, y, w, h });
        }
        
        window.isDrawingHotspot = false;
        document.getElementById('hotspot-instruction').innerText = "Đã lưu khu vực. Bạn có thể thêm tiếp hoặc lưu câu hỏi.";
        document.getElementById('hotspot-instruction').classList.remove('text-green-400');
        document.getElementById('hotspot-instruction').classList.add('text-yellow-400');
        
        window.renderHotspotAreas();
    });
    
    // Prevent default drag
    overlay.addEventListener('dragstart', e => e.preventDefault());
};

// ==================== REWARDS MANAGEMENT ====================
async function renderTeacherRewards() {
  const grid = document.getElementById("teacher-rewards-grid");
  if (!grid) return;

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  let filteredRewards = rewards;

  const searchInput = document.getElementById("rewardsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
  if (searchQuery) {
    filteredRewards = filteredRewards.filter(r => r.name && r.name.toLowerCase().includes(searchQuery));
  }

  grid.innerHTML = "";
  
  const paginationContainerId = 'rewards-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredRewards.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">Chưa có phần thưởng nào trong hệ thống hoặc không khớp tìm kiếm.</div>';
    return;
  }

  const currentPage = window.teacherPagination.rewards || 1;
  const pagedRewards = filteredRewards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredRewards.length, currentPage, paginationContainerId, 'rewards');

  pagedRewards.forEach(r => {
    let imgRender = `<div class="text-3xl">${r.image}</div>`;
    if (r.image.startsWith("http")) {
      imgRender = `<img src="${r.image}" class="w-16 h-16 object-contain filter drop-shadow-md" alt="${r.name}">`;
    }

    const isLocked = r.isLocked === true;
    const lockBtnClass = isLocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500";
    const lockBtnText = isLocked ? '<i class="fa-solid fa-lock-open mr-1"></i> Mở khóa' : '<i class="fa-solid fa-lock mr-1"></i> Khóa quà';

    const div = document.createElement("div");
    div.className = `bg-indigo-950/50 border ${isLocked ? 'border-red-500/50 opacity-75' : 'border-indigo-500/30'} rounded-xl p-4 flex flex-col justify-between`;
    div.innerHTML = `
      <div>
        <div class="w-full h-24 rounded-lg bg-slate-900/80 flex items-center justify-center border border-indigo-900/50 mb-3 shadow-inner relative">
          ${isLocked ? '<div class="absolute inset-0 bg-red-900/20 rounded-lg flex items-center justify-center"><i class="fa-solid fa-lock text-3xl text-red-500/50"></i></div>' : ''}
          ${imgRender}
        </div>
        <h4 class="font-bold text-xs text-indigo-50 mb-1">${r.name}</h4>
        <p class="text-[10px] text-indigo-300 mb-2">Giá: <i class="fa-solid fa-coins"></i> ${r.cost}</p>
      </div>
      <button onclick="toggleRewardLock('${r.id}')" class="w-full py-2 rounded-lg text-[10px] font-bold text-white transition-all ${lockBtnClass}">
        ${lockBtnText}
      </button>
    `;
    grid.appendChild(div);
  });
}

window.toggleRewardLock = async function(rewardId) {
  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const idx = rewards.findIndex(r => r.id === rewardId);
  if (idx > -1) {
    rewards[idx].isLocked = !rewards[idx].isLocked;
    const res = await window.saveData(window.IC3_KEYS.REWARDS, rewards, rewardId);
    if (res && res.success) {
      window.showToast(rewards[idx].isLocked ? "Đã khóa phần thưởng!" : "Đã mở khóa phần thưởng!");
      renderTeacherRewards();
    } else {
      window.showToast("Lỗi khi lưu trạng thái", "error");
    }
  }
}

let deleteCallback = null;

function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    document.getElementById("confirmModalTitle").innerText = title;
    document.getElementById("confirmModalMessage").innerText = message;
    deleteCallback = onConfirm;
    modal.classList.remove("hidden");
  }
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  deleteCallback = null;
}

function handleConfirmAction() {
  if (deleteCallback) {
    deleteCallback();
  }
  closeConfirmModal();
}

// ==================== TAB: LOCK TABS MANAGEMENT FUNCTIONS ====================
function renderLockTabsTab() {
  const container = document.getElementById("lock-tabs-container");
  if (!container) return;
  
  if (!activeClassId) {
    container.innerHTML = `
      <div class="p-8 text-center bg-indigo-950/20 rounded-xl border border-dashed border-indigo-500/20 text-indigo-300">
        <i class="fa-solid fa-graduation-cap text-3xl mb-3 text-indigo-400"></i>
        <p class="font-bold text-sm">Vui lòng chọn một Lớp học ở góc trên bên phải để quản lý khóa/mở tab!</p>
      </div>
    `;
    return;
  }
  
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const currentClass = classes.find(c => c.id === activeClassId);
  if (!currentClass) {
    container.innerHTML = `
      <div class="p-8 text-center bg-indigo-950/20 rounded-xl border border-dashed border-indigo-500/20 text-indigo-300">
        <p class="text-sm">Lớp học không hợp lệ hoặc đã bị xóa.</p>
      </div>
    `;
    return;
  }

  const lockedTabs = currentClass.lockedTabs || [];
  
  const tabsList = [
    { id: 'dashboard', name: 'Bảng Tin', icon: 'fa-chart-pie', desc: 'Trang chủ xem thông tin, hoạt động gần đây.' },
    { id: 'battle', name: 'Kiểm tra', icon: 'fa-shield-halved', desc: 'Làm bài thi thử, ôn tập các kỹ năng.' },
    { id: 'bosshunt', name: 'Săn Boss', icon: 'fa-dragon', desc: 'Chế độ đánh boss tích điểm và quà.' },
    { id: 'leaderboard', name: 'Xếp hạng', icon: 'fa-trophy', desc: 'Bảng xếp hạng thi đua trong lớp.' },
    { id: 'badges', name: 'Huy hiệu', icon: 'fa-award', desc: 'Nơi xem các danh hiệu, huy chương đã đạt.' },
    { id: 'inventory', name: 'Túi đồ', icon: 'fa-briefcase', desc: 'Xem rương quà, vật phẩm và tiến hóa Pokemon.' },
    { id: 'luck', name: 'Vận May', icon: 'fa-clover', desc: 'Rung cây dừa vận may hái chuối, bắt Pokemon.' },
    { id: 'rewards', name: 'Cửa hàng', icon: 'fa-store', desc: 'Nơi học sinh dùng coin đổi quà và chuối.' }
  ];

  let html = `
    <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
          <i class="fa-solid fa-users"></i>
        </div>
        <div>
          <h4 class="font-bold text-sm text-indigo-50">Lớp đang quản lý: <span class="text-emerald-400 text-base font-black">${currentClass.name}</span></h4>
          <p class="text-xs text-indigo-200">Mã lớp: <span class="font-mono text-emerald-400">${currentClass.id}</span> • Chỉ những học sinh thuộc lớp này mới bị áp dụng cấu hình khóa bên dưới.</p>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  `;

  tabsList.forEach(t => {
    const isLocked = lockedTabs.includes(t.id);
    html += `
      <div class="p-4 rounded-xl border ${isLocked ? 'bg-red-500/10 border-red-500/30' : 'bg-[#131424]/80 border-indigo-500/20'} flex flex-col justify-between hover:border-indigo-500/40 transition-all">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-lg ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/10 text-indigo-400'} flex items-center justify-center">
              <i class="fa-solid ${t.icon} text-base"></i>
            </div>
            <span class="text-[10px] font-mono tracking-wider uppercase bg-[#1e293b] text-indigo-300 px-2 py-0.5 rounded-full">${t.id}</span>
          </div>
          <h5 class="font-bold text-sm text-indigo-50 flex items-center gap-2">
            ${t.name}
            ${isLocked ? '<span class="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-lock"></i> Khóa</span>' : '<span class="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-lock-open"></i> Mở</span>'}
          </h5>
          <p class="text-xs text-indigo-300/80 mt-1 leading-relaxed">${t.desc}</p>
        </div>
        
        <div class="mt-4 pt-3 border-t border-indigo-500/10 flex items-center justify-between">
          <span class="text-xs text-indigo-300 font-medium">${isLocked ? 'Đang khóa' : 'Đang hoạt động'}</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="${t.id}" class="sr-only peer" ${isLocked ? 'checked' : ''} onchange="toggleTabLockState('${t.id}', this.checked)">
            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          </label>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

async function toggleTabLockState(tabId, isLocked) {
  if (!activeClassId) return;
  
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const classIndex = classes.findIndex(c => c.id === activeClassId);
  if (classIndex === -1) return;
  
  const currentClass = classes[classIndex];
  let lockedTabs = currentClass.lockedTabs || [];
  
  if (isLocked) {
    if (!lockedTabs.includes(tabId)) {
      lockedTabs.push(tabId);
    }
  } else {
    lockedTabs = lockedTabs.filter(id => id !== tabId);
  }
  
  currentClass.lockedTabs = lockedTabs;
  classes[classIndex] = currentClass;
  
  try {
    // Save updated class config to DB
    await window.saveData(window.IC3_KEYS.CLASSES, classes, activeClassId);
    if (window.showToast) {
      window.showToast(`Đã ${isLocked ? 'KHÓA' : 'MỞ'} tab [${tabId}] thành công cho lớp ${currentClass.name}!`, isLocked ? 'error' : 'success');
    }
    // Re-render
    renderLockTabsTab();
  } catch (error) {
    console.error("Failed to update lockedTabs:", error);
    if (window.showToast) window.showToast("Cập nhật thất bại. Vui lòng thử lại!", "error");
  }
}

// ==================== QUESTION FORM MANAGEMENT ====================

// Dynamic choices helper functions for multiple choice questions
window.addNewChoiceOption = function(type) {
  if (!window.currentChoicesList) window.currentChoicesList = ["", "", "", ""];
  window.currentChoicesList.push("");
  renderDynamicFormFields(type);
};

window.removeChoiceOption = function(idx, type) {
  if (!window.currentChoicesList) return;
  if (window.currentChoicesList.length <= 2) {
    if (window.showToast) window.showToast("Phải có ít nhất 2 đáp án!", "error");
    return;
  }
  window.currentChoicesList.splice(idx, 1);
  
  if (window.currentChoicesCorrectIndex === idx) {
    window.currentChoicesCorrectIndex = 0;
  } else if (window.currentChoicesCorrectIndex > idx) {
    window.currentChoicesCorrectIndex--;
  }

  window.currentChoicesCorrectIndices = (window.currentChoicesCorrectIndices || [])
    .filter(i => i !== idx)
    .map(i => i > idx ? i - 1 : i);

  renderDynamicFormFields(type);
};

window.updateCorrectAnswerSelectors = function(type) {
  const container = document.getElementById("correct-answer-selector-section");
  if (!container) return;

  const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-xs";
  
  let html = "";
  if (type === "multi_choice") {
    html += `
      <label class="block text-xs font-bold text-indigo-300 uppercase mb-1.5">Chọn các đáp án đúng:</label>
      <div class="flex flex-wrap gap-3 text-xs text-indigo-200 bg-[#131424]/40 p-3 rounded-xl border border-indigo-500/10">
    `;
    window.currentChoicesList.forEach((val, idx) => {
      const charCode = String.fromCharCode(65 + idx);
      const isChecked = (window.currentChoicesCorrectIndices || []).includes(idx) ? 'checked' : '';
      const displayVal = val.trim() ? ` (${val.trim()})` : '';
      html += `
        <label class="flex items-center gap-2 cursor-pointer bg-[#131424]/60 hover:bg-[#131424]/80 px-3 py-1.5 rounded-lg border border-indigo-500/10 transition-all select-none">
          <input type="checkbox" class="mc-correct accent-purple-500 h-4 w-4" value="${idx}" ${isChecked} 
            onchange="window.updateCheckedIndices(${idx}, this.checked)"> 
          <span class="font-bold text-purple-400">${charCode}</span>${displayVal}
        </label>
      `;
    });
    html += `</div>`;
  } else {
    html += `
      <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Phương án đúng:</label>
      <select id="choice-correct-idx" class="${inputClass} cursor-pointer" onchange="window.currentChoicesCorrectIndex = parseInt(this.value)">
    `;
    window.currentChoicesList.forEach((val, idx) => {
      const charCode = String.fromCharCode(65 + idx);
      const isSelected = window.currentChoicesCorrectIndex === idx ? 'selected' : '';
      const displayVal = val.trim() ? ` - ${val.trim()}` : '';
      html += `
        <option value="${idx}" ${isSelected}>Phương án ${charCode}${displayVal}</option>
      `;
    });
    html += `</select>`;
  }
  container.innerHTML = html;
};

window.updateCheckedIndices = function(idx, checked) {
  if (!window.currentChoicesCorrectIndices) window.currentChoicesCorrectIndices = [];
  if (checked) {
    if (!window.currentChoicesCorrectIndices.includes(idx)) {
      window.currentChoicesCorrectIndices.push(idx);
    }
  } else {
    window.currentChoicesCorrectIndices = window.currentChoicesCorrectIndices.filter(i => i !== idx);
  }
};

function renderDynamicFormFields(type) {
  const container = document.getElementById("dynamic-form-fields");
  if (!container) return;
  container.innerHTML = "";

  const typeHints = {
    choice: "Học sinh sẽ được chọn một trong các phương án liệt kê bên dưới.",
    multi_choice: "Học sinh có thể chọn một hoặc nhiều phương án đúng.",
    image_choice: "Học sinh chọn hình ảnh đúng dựa trên link URL được cung cấp.",
    true_false: "Học sinh chọn phương án Đúng hoặc Sai.",
    hotspot: "Học sinh nhấp chọn khu vực được khoanh vùng trên hình ảnh.",
    drag_text: "Học sinh kéo thả các từ khóa màu đỏ khớp với vế mô tả bên trái.",
    drag_image_text: "Học sinh kéo thả từ khóa khớp với hình ảnh mô tả tương ứng.",
    table_match: "Học sinh nối các câu hỏi theo hàng với các lựa chọn cột tương ứng."
  };

  const hintEl = document.getElementById("form-q-type-hint");
  if (hintEl) hintEl.innerText = typeHints[type] || "Thiết lập dạng câu hỏi.";

  const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-xs";

  if (type === "choice" || type === "multi_choice" || type === "image_choice") {
    const isImage = type === "image_choice";
    const placeholderText = isImage ? "URL hình ảnh phương án " : "Phương án ";
    
    if (!window.currentChoicesList || window.currentChoicesList.length === 0) {
      window.currentChoicesList = ["", "", "", ""];
    }
    if (window.currentChoicesCorrectIndex === undefined) {
      window.currentChoicesCorrectIndex = 0;
    }
    if (!window.currentChoicesCorrectIndices) {
      window.currentChoicesCorrectIndices = [];
    }

    let optionsHtml = `
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <label class="block text-xs font-bold text-indigo-300 uppercase">Các phương án lựa chọn:</label>
          <button type="button" onclick="window.addNewChoiceOption('${type}')" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded cursor-pointer flex items-center gap-1 transition-colors">
            <i class="fa-solid fa-plus"></i> Thêm đáp án
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="choices-inputs-grid">
    `;

    window.currentChoicesList.forEach((val, idx) => {
      const charCode = String.fromCharCode(65 + idx);
      optionsHtml += `
        <div class="flex items-center gap-2 relative">
          <div class="absolute left-3 text-indigo-400 font-bold text-xs select-none">${charCode}.</div>
          <input type="text" id="choice-opt-${idx}" required class="${inputClass} pl-8 pr-10" 
            placeholder="${placeholderText}${charCode}" value="${val.replace(/"/g, '&quot;')}"
            oninput="window.currentChoicesList[${idx}] = this.value; window.updateCorrectAnswerSelectors('${type}')">
          <button type="button" onclick="window.removeChoiceOption(${idx}, '${type}')" 
            class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded transition-all cursor-pointer"
            title="Xóa đáp án này">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      `;
    });

    optionsHtml += `</div>`;

    optionsHtml += `
      <div id="correct-answer-selector-section" class="mt-4">
        <!-- Will be dynamically updated by updateCorrectAnswerSelectors -->
      </div>
    </div>`;

    container.innerHTML = optionsHtml;
    window.updateCorrectAnswerSelectors(type);

  } else if (type === "true_false") {
    container.innerHTML = `
      <div class="space-y-3">
        <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Đáp án đúng:</label>
        <select id="choice-correct-idx" class="${inputClass} cursor-pointer">
          <option value="0">Đúng</option>
          <option value="1">Sai</option>
        </select>
      </div>`;

  } else if (type === "hotspot") {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Hình ảnh câu hỏi (URL ảnh hoặc tải file):</label>
            <input type="text" id="hotspot-img-url" required class="${inputClass}" placeholder="https://..." onchange="window.updateHotspotPreview()">
            <button type="button" onclick="window.triggerHotspotUpload()" class="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded cursor-pointer">Tải ảnh lên</button>
            <input type="file" id="hotspot-img-upload" class="hidden" accept="image/*" onchange="window.handleHotspotImgUpload(this)">
          </div>
          <div>
            <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Hướng dẫn vẽ:</label>
            <p id="hotspot-instruction" class="text-xs text-yellow-400 font-medium">Nhập URL ảnh hoặc tải ảnh lên trước, sau đó ấn "Thêm khu vực" và kéo vẽ trên ảnh.</p>
            <button type="button" onclick="window.addHotspotArea()" class="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer">Thêm khu vực</button>
          </div>
        </div>
        
        <div class="relative inline-block border-2 border-indigo-500/30 rounded-2xl bg-slate-950 overflow-hidden mx-auto max-w-full">
          <img id="hotspot-preview-img" style="display:none; max-width:100%;" draggable="false">
          <div id="hotspot-overlay" class="absolute inset-0" style="pointer-events: none;"></div>
        </div>

        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-indigo-300 uppercase">Danh sách khu vực đã vẽ:</label>
          <div id="hotspot-list" class="space-y-1 max-h-40 overflow-y-auto"></div>
        </div>
      </div>`;
    
    window.hotspotAreas = [];
    window.initHotspotDrawing();

  } else if (type === "drag_text") {
    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <label class="block text-xs font-bold text-indigo-300 uppercase">Các cặp vế trái - vế phải (Kéo thả):</label>
          <button type="button" onclick="window.addDragTextRow()" class="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded cursor-pointer">Thêm cặp</button>
        </div>
        <div id="drag-text-rows" class="space-y-2"></div>
      </div>`;
    window.addDragTextRow();

  } else if (type === "drag_image_text") {
    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <label class="block text-xs font-bold text-indigo-300 uppercase">Cặp hình ảnh - từ khóa khớp:</label>
          <button type="button" onclick="window.addDragImageTextRow()" class="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded cursor-pointer">Thêm cặp</button>
        </div>
        <div id="drag-image-text-rows" class="space-y-2"></div>
      </div>`;
    window.addDragImageTextRow();

  } else if (type === "table_match") {
    container.innerHTML = `
      <div class="space-y-4" id="tm-container">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Tiêu đề Cột trái (Hỏi):</label>
            <input type="text" id="tm-header-left" required class="${inputClass}" value="Khái niệm">
          </div>
          <div>
            <label class="block text-xs font-bold text-indigo-300 uppercase mb-1">Tiêu đề Cột phải (Lựa chọn):</label>
            <input type="text" id="tm-header-right" required class="${inputClass}" value="Đặc tính">
          </div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-xs font-bold text-indigo-300 uppercase">Các Cột phương án ghép <span id="tm-col-count">(0)</span>:</label>
            <button type="button" onclick="window.addTmColumn()" class="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold rounded cursor-pointer">Thêm cột</button>
          </div>
          <div id="tm-cols" class="flex flex-wrap gap-2"></div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-xs font-bold text-indigo-300 uppercase">Các Hàng câu hỏi & Đáp án đúng <span id="tm-row-count">(0)</span>:</label>
            <button type="button" onclick="window.addTmRow()" class="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold rounded cursor-pointer">Thêm hàng</button>
          </div>
          <div class="border border-indigo-500/20 rounded-xl overflow-hidden bg-slate-950/20">
            <table class="w-full text-xs">
              <thead id="tm-rows-thead"></thead>
              <tbody id="tm-rows-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>`;
    window.tmData = { columns: ["Cột A", "Cột B"], rows: [], correctAnswers: [] };
    window.renderTableMatchUI();
  }
}

function adjustFormQuestionOptions() {
  const type = document.getElementById("form-q-type").value;
  renderDynamicFormFields(type);
}

function setupNewQuestionForm() {
  const testId = document.getElementById("m-testSelector").value;
  if (!testId) {
    if (window.showToast) window.showToast("Vui lòng chọn bộ đề trước khi tạo câu hỏi!", "error");
    return;
  }

  // Clear Form
  document.getElementById("question-edit-form").reset();
  document.getElementById("form-q-id").value = "";
  
  // Set window globals for dynamic options
  window.currentChoicesList = ["", "", "", ""];
  window.currentChoicesCorrectIndex = 0;
  window.currentChoicesCorrectIndices = [];

  // Show Editor Card
  document.getElementById("question-view-mode").classList.add("hidden");
  document.getElementById("question-edit-form").classList.remove("hidden");
  document.getElementById("right-panel-title").innerText = "Tạo câu hỏi mới";

  // Select default choice type and render
  document.getElementById("form-q-type").value = "choice";
  adjustFormQuestionOptions();

  // Hide actions temporarily
  document.getElementById("btn-edit-question").classList.add("hidden");
  document.getElementById("btn-delete-question").classList.add("hidden");
}

function enableQuestionEditing() {
  if (!activeQuestionId) return;

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const q = questions.find(item => item.id === activeQuestionId);
  if (!q) return;

  document.getElementById("question-view-mode").classList.add("hidden");
  document.getElementById("question-edit-form").classList.remove("hidden");
  document.getElementById("right-panel-title").innerText = "Chỉnh sửa câu hỏi";

  document.getElementById("form-q-id").value = q.id;
  document.getElementById("form-q-type").value = q.type || "choice";
  
  // Set window globals for dynamic options
  const type = q.type || "choice";
  if (type === "choice" || type === "multi_choice" || type === "image_choice") {
    window.currentChoicesList = q.options && q.options.length > 0 ? [...q.options] : ["", "", "", ""];
    window.currentChoicesCorrectIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
    window.currentChoicesCorrectIndices = q.correctIndices ? [...q.correctIndices] : [];
  }
  
  adjustFormQuestionOptions();

  document.getElementById("form-q-text").value = q.question || q.text || "";
  document.getElementById("form-q-image").value = q.imageUrl || q.image || "";
  document.getElementById("form-q-explanation").value = q.explanation || "";

  // Populate dynamic controls
  if (type === "choice" || type === "multi_choice" || type === "image_choice") {
    // Dynamic fields are rendered and populated directly by renderDynamicFormFields inside adjustFormQuestionOptions()
  } else if (type === "true_false") {
    const select = document.getElementById("choice-correct-idx");
    if (select) select.value = q.correctIndex !== undefined ? q.correctIndex : (q.answer === "Sai" ? 1 : 0);
  } else if (type === "hotspot") {
    document.getElementById("hotspot-img-url").value = q.imageUrl || q.image || "";
    window.hotspotAreas = q.hotspots || [];
    window.updateHotspotPreview();
  } else if (type === "drag_text") {
    const rowsContainer = document.getElementById("drag-text-rows");
    if (rowsContainer) {
      rowsContainer.innerHTML = "";
      const rows = q.rows || [];
      const correctAnswers = q.correctAnswers || [];
      rows.forEach((row, idx) => {
        const rowLabel = row.label || row.text || row;
        const correctVal = correctAnswers[idx] || "";
        
        const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-xs";
        const div = document.createElement('div');
        div.className = "grid grid-cols-2 gap-4";
        div.innerHTML = `
          <input type="text" class="dt-left ${inputClass}" placeholder="Từ khóa vế trái" value="${rowLabel}">
          <input type="text" class="dt-right ${inputClass}" placeholder="Nhãn khớp vế phải" value="${correctVal}">
        `;
        rowsContainer.appendChild(div);
      });
    }
  } else if (type === "drag_image_text") {
    const rowsContainer = document.getElementById("drag-image-text-rows");
    if (rowsContainer) {
      rowsContainer.innerHTML = "";
      const leftImages = q.leftImages || [];
      const correctAnswers = q.correctAnswers || [];
      leftImages.forEach((imgUrl, idx) => {
        const correctVal = correctAnswers[idx] || "";
        
        const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-xs";
        const div = document.createElement('div');
        div.className = "grid grid-cols-2 gap-4";
        div.innerHTML = `
          <input type="text" class="dit-left ${inputClass}" placeholder="URL ảnh..." value="${imgUrl}">
          <input type="text" class="dit-right ${inputClass}" placeholder="Nhãn khớp" value="${correctVal}">
        `;
        rowsContainer.appendChild(div);
      });
    }
  } else if (type === "table_match") {
    window.tmData = {
      columns: q.options || [],
      rows: q.rows || [],
      correctAnswers: q.correctAnswers || []
    };
    if (q.headers) {
      document.getElementById("tm-header-left").value = q.headers[0] || "Khái niệm";
      document.getElementById("tm-header-right").value = q.headers[1] || "Đặc tính";
    }
    window.renderTableMatchUI();
  }
}

function cancelQuestionEditing() {
  document.getElementById("question-edit-form").classList.add("hidden");
  document.getElementById("question-view-mode").classList.remove("hidden");
  document.getElementById("right-panel-title").innerText = "Nội dung câu hỏi";

  if (activeQuestionId) {
    selectActiveQuestion(activeQuestionId);
  } else {
    resetQuestionWorkspace();
  }
}

async function handleQuestionFormSubmit(e) {
  e.preventDefault();

  const testId = document.getElementById("m-testSelector").value;
  if (!testId) {
    if (window.showToast) window.showToast("Lỗi: Không tìm thấy bộ đề ôn tập hiện tại!", "error");
    return;
  }

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const activeTest = tests.find(t => t.id === testId);
  if (!activeTest) {
    if (window.showToast) window.showToast("Không tìm thấy bộ đề ôn tập!", "error");
    return;
  }

  let qId = document.getElementById("form-q-id").value;
  const isNew = !qId;
  if (isNew) {
    qId = `q_teacher_${Date.now().toString().slice(-8)}`;
  }

  const type = document.getElementById("form-q-type").value;
  const questionText = document.getElementById("form-q-text").value.trim();
  const formImage = document.getElementById("form-q-image").value.trim();
  const explanation = document.getElementById("form-q-explanation").value.trim();

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];

  const qObj = {
    id: qId,
    type: type,
    question: questionText,
    text: questionText,
    imageUrl: formImage,
    image: formImage,
    explanation: explanation || "Tham khảo kiến thức chuẩn IC3 để giải câu hỏi này.",
    blockId: activeTest.blockId || "all",
    level: activeTest.level || "level_1"
  };

  if (type === "choice" || type === "image_choice") {
    const opts = (window.currentChoicesList || []).map(opt => opt.trim());
    if (opts.some(o => !o)) {
      if (window.showToast) window.showToast("Vui lòng nhập đầy đủ nội dung tất cả các phương án!", "error");
      return;
    }
    const correctIdx = window.currentChoicesCorrectIndex !== undefined ? window.currentChoicesCorrectIndex : 0;
    qObj.options = opts;
    qObj.correctIndex = correctIdx;
    qObj.answer = opts[correctIdx] || "";

  } else if (type === "multi_choice") {
    const opts = (window.currentChoicesList || []).map(opt => opt.trim());
    if (opts.some(o => !o)) {
      if (window.showToast) window.showToast("Vui lòng nhập đầy đủ nội dung tất cả các phương án!", "error");
      return;
    }
    const correctIndices = [];
    document.querySelectorAll(".mc-correct:checked").forEach(cb => {
      correctIndices.push(parseInt(cb.value));
    });

    if (correctIndices.length === 0) {
      if (window.showToast) window.showToast("Vui lòng chọn ít nhất một đáp án đúng!", "error");
      return;
    }

    qObj.options = opts;
    qObj.correctIndices = correctIndices;
    qObj.answer = correctIndices.map(idx => opts[idx]).join(", ");

  } else if (type === "true_false") {
    const correctIdx = parseInt(document.getElementById("choice-correct-idx").value);
    qObj.options = ["Đúng", "Sai"];
    qObj.correctIndex = correctIdx;
    qObj.answer = correctIdx === 0 ? "Đúng" : "Sai";

  } else if (type === "hotspot") {
    const hotspotUrl = document.getElementById("hotspot-img-url").value.trim();
    if (!hotspotUrl) {
      if (window.showToast) window.showToast("Vui lòng thiết lập URL ảnh cho hotspot!", "error");
      return;
    }
    if (window.hotspotAreas.length === 0) {
      if (window.showToast) window.showToast("Vui lòng khoanh vùng ít nhất một khu vực hotspot!", "error");
      return;
    }
    qObj.imageUrl = hotspotUrl;
    qObj.image = hotspotUrl;
    qObj.hotspots = window.hotspotAreas;
    qObj.requiredCount = window.hotspotAreas.length;
    qObj.answer = `Xác định đúng ${window.hotspotAreas.length} vị trí trên ảnh.`;

  } else if (type === "drag_text") {
    const leftInputs = document.querySelectorAll(".dt-left");
    const rightInputs = document.querySelectorAll(".dt-right");
    const rows = [];
    const correctAnswers = [];
    const optionsSet = new Set();

    leftInputs.forEach((inp, idx) => {
      const leftVal = inp.value.trim();
      const rightVal = rightInputs[idx].value.trim();
      if (leftVal && rightVal) {
        rows.push({ label: leftVal, text: leftVal });
        correctAnswers.push(rightVal);
        optionsSet.add(rightVal);
      }
    });

    if (rows.length === 0) {
      if (window.showToast) window.showToast("Vui lòng thêm ít nhất một cặp ghép từ khóa khớp!", "error");
      return;
    }

    qObj.rows = rows;
    qObj.correctAnswers = correctAnswers;
    qObj.options = Array.from(optionsSet);
    qObj.answer = "Ghép đúng các cặp từ khóa.";

  } else if (type === "drag_image_text") {
    const leftInputs = document.querySelectorAll(".dit-left");
    const rightInputs = document.querySelectorAll(".dit-right");
    const leftImages = [];
    const correctAnswers = [];
    const optionsSet = new Set();

    leftInputs.forEach((inp, idx) => {
      const leftVal = inp.value.trim();
      const rightVal = rightInputs[idx].value.trim();
      if (leftVal && rightVal) {
        leftImages.push(leftVal);
        correctAnswers.push(rightVal);
        optionsSet.add(rightVal);
      }
    });

    if (leftImages.length === 0) {
      if (window.showToast) window.showToast("Vui lòng thêm ít nhất một cặp hình ảnh - nhãn khớp!", "error");
      return;
    }

    qObj.leftImages = leftImages;
    qObj.correctAnswers = correctAnswers;
    qObj.options = Array.from(optionsSet);
    qObj.answer = "Khớp đúng nhãn tên cho từng hình ảnh.";

  } else if (type === "table_match") {
    const headerLeft = document.getElementById("tm-header-left").value.trim() || "Khái niệm";
    const headerRight = document.getElementById("tm-header-right").value.trim() || "Đặc tính";

    if (window.tmData.columns.length === 0 || window.tmData.rows.length === 0) {
      if (window.showToast) window.showToast("Vui lòng nhập đầy đủ các cột và các hàng ghép nối bảng!", "error");
      return;
    }

    const unassigned = window.tmData.correctAnswers.findIndex(ans => ans === -1);
    if (unassigned !== -1) {
      if (window.showToast) window.showToast(`Vui lòng chọn đáp án đúng cho hàng số ${unassigned + 1}!`, "error");
      return;
    }

    qObj.headers = [headerLeft, headerRight];
    qObj.options = window.tmData.columns;
    qObj.rows = window.tmData.rows;
    qObj.correctAnswers = window.tmData.correctAnswers;
    qObj.answer = "Liên kết chính xác bảng ghép nối.";
  }

  try {
    await window.saveData(window.IC3_KEYS.QUESTIONS, [...questions.filter(ex => ex.id !== qId), qObj], qId);
    
    const existingIdx = questions.findIndex(ex => ex.id === qId);
    if (existingIdx > -1) questions[existingIdx] = qObj;
    else questions.push(qObj);

    if (isNew) {
      if (!activeTest.questions) activeTest.questions = [];
      activeTest.questions.push(qId);
      activeTest.questionCount = activeTest.questions.length;

      await window.saveData(window.IC3_KEYS.TESTS, tests, testId);
    }

    if (window.showToast) window.showToast(isNew ? "Tạo câu hỏi mới thành công!" : "Cập nhật câu hỏi thành công!", "success");

    cancelQuestionEditing();
    renderQuestionsList();
    selectActiveQuestion(qId);

  } catch (err) {
    console.error("Error saving question:", err);
    if (window.showToast) window.showToast("Lưu câu hỏi thất bại. Vui lòng thử lại!", "error");
  }
}

async function deleteCurrentQuestion() {
  if (!activeQuestionId) return;

  const testId = document.getElementById("m-testSelector").value;
  if (!testId) return;

  showConfirmModal(
    "Xác nhận xóa câu hỏi",
    "Bạn có chắc muốn xóa câu hỏi này khỏi bộ đề hiện tại?",
    async () => {
      const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
      const testIndex = tests.findIndex(t => t.id === testId);
      if (testIndex === -1) return;

      const activeTest = tests[testIndex];
      activeTest.questions = (activeTest.questions || []).filter(qid => qid !== activeQuestionId);
      activeTest.questionCount = activeTest.questions.length;
      tests[testIndex] = activeTest;

      let questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
      questions = questions.filter(q => q.id !== activeQuestionId);
      window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] = questions;

      try {
        await window.saveData(window.IC3_KEYS.TESTS, tests, testId);
        await window.fStore.deleteDoc(window.fStore.doc(window.db, window.IC3_KEYS.QUESTIONS, activeQuestionId));

        if (window.showToast) window.showToast("Đã xóa câu hỏi thành công!", "success");

        activeQuestionId = "";
        cancelQuestionEditing();
        renderQuestionsList();
      } catch (err) {
        console.error("Error deleting question:", err);
        if (window.showToast) window.showToast("Xóa thất bại, vui lòng thử lại!", "error");
      }
    }
  );
}

function resetQuestionWorkspace() {
  activeQuestionId = "";
  const viewCard = document.getElementById("view-question-card");
  const placeholder = document.getElementById("view-placeholder");
  const editForm = document.getElementById("question-edit-form");
  const editBtn = document.getElementById("btn-edit-question");
  const deleteBtn = document.getElementById("btn-delete-question");
  if (viewCard) viewCard.classList.add("hidden");
  if (placeholder) placeholder.classList.remove("hidden");
  if (editForm) editForm.classList.add("hidden");
  if (editBtn) editBtn.classList.add("hidden");
  if (deleteBtn) deleteBtn.classList.add("hidden");
  const panelTitle = document.getElementById("right-panel-title");
  if (panelTitle) panelTitle.innerText = "Nội dung câu hỏi";
}

function selectActiveQuestion(qId) {
  activeQuestionId = qId;
  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const q = questions.find(item => item.id === qId);
  if (!q) return;

  const viewCard = document.getElementById("view-question-card");
  const placeholder = document.getElementById("view-placeholder");
  if (viewCard) viewCard.classList.remove("hidden");
  if (placeholder) placeholder.classList.add("hidden");

  const editBtn = document.getElementById("btn-edit-question");
  const deleteBtn = document.getElementById("btn-delete-question");
  if (editBtn) editBtn.classList.remove("hidden");
  if (deleteBtn) deleteBtn.classList.remove("hidden");

  const typeBadge = document.getElementById("view-q-type-badge");
  if (typeBadge) typeBadge.innerText = q.type || "choice";
  const qText = document.getElementById("view-q-text");
  if (qText) qText.innerText = q.question || q.text || "";
  
  const imgContainer = document.getElementById("view-q-image-container");
  const imgEl = document.getElementById("view-q-image");
  const imageUrl = q.imageUrl || q.image || "";
  if (imageUrl) {
    if (imgEl) imgEl.src = convertDriveUrl(imageUrl);
    if (imgContainer) imgContainer.classList.remove("hidden");
  } else {
    if (imgContainer) imgContainer.classList.add("hidden");
  }

  const optionsContainer = document.getElementById("view-q-options-container");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    
    if (q.type === "choice" || q.type === "true_false" || q.type === "multiple_choice") {
      const opts = q.options || [];
      opts.forEach((opt, idx) => {
        const isCorrect = idx === q.correctIndex || opt === q.answer || (q.answer === "Đúng" && idx === 0) || (q.answer === "Sai" && idx === 1);
        const div = document.createElement("div");
        div.className = `p-3 rounded-xl border text-xs font-semibold ${isCorrect ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/60 border-indigo-500/10 text-indigo-100'}`;
        div.innerText = `${idx + 1}. ${opt}`;
        optionsContainer.appendChild(div);
      });
    } else if (q.type === "multi_choice") {
      const opts = q.options || [];
      opts.forEach((opt, idx) => {
        const isCorrect = (q.correctIndices || []).includes(idx);
        const div = document.createElement("div");
        div.className = `p-3 rounded-xl border text-xs font-semibold ${isCorrect ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/60 border-indigo-500/10 text-indigo-100'}`;
        div.innerText = `[${isCorrect ? '✓' : ' '}] ${opt}`;
        optionsContainer.appendChild(div);
      });
    } else if (q.type === "image_choice") {
      const opts = q.options || [];
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-2 gap-3";
      opts.forEach((optImg, idx) => {
        const isCorrect = idx === q.correctIndex;
        const div = document.createElement("div");
        div.className = `p-2 rounded-xl border flex flex-col items-center justify-center bg-slate-900/60 ${isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-indigo-500/15'}`;
        div.innerHTML = `<img src="${convertDriveUrl(optImg)}" class="h-16 w-auto object-contain mb-1">${isCorrect ? '<span class="text-[10px] text-emerald-400 font-bold">Đáp án đúng</span>' : ''}`;
        grid.appendChild(div);
      });
      optionsContainer.appendChild(grid);
    } else if (q.type === "drag_text") {
      const rows = q.rows || [];
      const correctAnswers = q.correctAnswers || [];
      rows.forEach((row, idx) => {
        const rowLabel = row.label || row.text || row;
        const correctVal = correctAnswers[idx] || "";
        const div = document.createElement("div");
        div.className = "p-3 rounded-xl bg-slate-900/60 border border-indigo-500/10 text-xs flex justify-between items-center";
        div.innerHTML = `<span class="text-indigo-100 font-medium">${rowLabel}</span> <span class="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded font-bold">${correctVal}</span>`;
        optionsContainer.appendChild(div);
      });
    } else if (q.type === "drag_image_text") {
      const leftImages = q.leftImages || [];
      const correctAnswers = q.correctAnswers || [];
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-2 gap-3";
      leftImages.forEach((imgUrl, idx) => {
        const correctVal = correctAnswers[idx] || "";
        const div = document.createElement("div");
        div.className = "p-3 rounded-xl bg-slate-900/60 border border-indigo-500/15 flex flex-col items-center";
        div.innerHTML = `<img src="${convertDriveUrl(imgUrl)}" class="h-16 w-auto object-contain mb-2"><span class="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs font-bold">${correctVal}</span>`;
        grid.appendChild(div);
      });
      optionsContainer.appendChild(grid);
    } else if (q.type === "table_match") {
      const rows = q.rows || [];
      const correctAnswers = q.correctAnswers || [];
      const cols = q.options || [];
      rows.forEach((row, idx) => {
        const correctColIdx = correctAnswers[idx];
        const correctColLabel = cols[correctColIdx] || "";
        const div = document.createElement("div");
        div.className = "p-3 rounded-xl bg-slate-900/60 border border-indigo-500/10 text-xs flex justify-between items-center";
        div.innerHTML = `<span class="text-indigo-100 font-medium">${row}</span> <i class="fa-solid fa-arrow-right text-indigo-400"></i> <span class="px-2 py-1 bg-purple-500/20 text-purple-300 rounded font-bold">${correctColLabel}</span>`;
        optionsContainer.appendChild(div);
      });
    } else if (q.type === "hotspot") {
      const imgUrl = q.imageUrl || "";
      const hotspots = q.hotspots || [];
      const div = document.createElement("div");
      div.className = "relative inline-block border border-indigo-500/20 rounded-xl overflow-hidden self-center mx-auto";
      div.innerHTML = `
        <img src="${convertDriveUrl(imgUrl)}" class="max-h-60 w-auto object-contain block">
        <div class="absolute inset-0">
          ${hotspots.map((area, i) => `
            <div class="absolute border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-[10px] font-bold" style="left: ${area.x}%; top: ${area.y}%; width: ${area.w}%; height: ${area.h}%;">
              ${i + 1}
            </div>
          `).join("")}
        </div>
      `;
      optionsContainer.appendChild(div);
    } else {
      optionsContainer.innerHTML = `<p class="text-xs text-indigo-300 italic">Không có cấu hình phương án hiển thị cho dạng này.</p>`;
    }
  }

  const viewAnswer = document.getElementById("view-q-answer");
  if (viewAnswer) {
    if (q.type === "choice" || q.type === "true_false") {
      viewAnswer.innerText = q.answer || (q.correctIndex !== undefined ? (q.options ? q.options[q.correctIndex] : q.correctIndex) : "");
    } else if (q.type === "multi_choice") {
      viewAnswer.innerText = (q.correctIndices || []).map(idx => q.options ? q.options[idx] : idx).join(", ");
    } else if (q.type === "image_choice") {
      viewAnswer.innerText = `Phương án ảnh số ${q.correctIndex !== undefined ? q.correctIndex + 1 : ""}`;
    } else {
      viewAnswer.innerText = "Xem chi tiết phương án ghép khớp ở trên";
    }
  }

  const viewExplanation = document.getElementById("view-q-explanation");
  if (viewExplanation) viewExplanation.innerText = q.explanation || "Không có giải thích chi tiết.";

  const sidebarList = document.getElementById("m-questionsList");
  if (sidebarList) {
    const items = sidebarList.children;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.remove("bg-indigo-500/20", "border-l-4", "border-l-purple-500");
    }
  }
}

function openCustomTestGeneratorModal() {
  const blockSelector = document.getElementById("m-blockSelector");
  if (!blockSelector || !blockSelector.value) {
    if (window.showToast) window.showToast("Vui lòng chọn khối lớp trước!", "error");
    return;
  }
  const modal = document.getElementById("customTestGeneratorModal");
  if (modal) {
    modal.classList.remove("hidden");
    const titleInput = document.getElementById("customTestTitleInput");
    if (titleInput) titleInput.value = "";
    const searchInput = document.getElementById("customTestSearch");
    if (searchInput) searchInput.value = "";
    const rangeStart = document.getElementById("rangeStart");
    if (rangeStart) rangeStart.value = "";
    const rangeEnd = document.getElementById("rangeEnd");
    if (rangeEnd) rangeEnd.value = "";
    renderCustomTestQuestionsList();
  }
}

function closeCustomTestGeneratorModal() {
  const modal = document.getElementById("customTestGeneratorModal");
  if (modal) modal.classList.add("hidden");
}

// EXPOSE TO WINDOW FOR HTML EVENT HANDLERS
Object.assign(window, {
  adjustFormQuestionOptions, cancelQuestionEditing, changeActiveSelectedClass, checkTeacherAuth, closeAddStudentToClassModal, closeBlockModal, closeClassModal, closeCombineTestsModal, closeStudentDetailsModal, closeTestSetModal, convertDriveUrl, deleteCurrentBlock, deleteCurrentQuestion, deleteCurrentTestSet, enableQuestionEditing, getBlocks, getBossHuntDayKey, handleBlockFormSubmit, handleClassSubmit, handleCombineTestsFormSubmit, handleQuestionFormSubmit, handleStudentToClassSubmit, handleTestSetFormSubmit, importStudentsExcel, initClassSelector, initClock, initManageTestsTab, logoutTeacher, onBlockSelectionChange, onTestSelectionChange, openAddStudentToClassModal, openBlockModal, openClassModal, openCombineTestsModal, openStudentDetailsModal, openTestSetModal, populateSchoolClassFilter, readFileAsBase64, removeStudentFromClass, renderClassesGrid, renderClassRanking, renderClassStudentsTable, renderDynamicFormFields, renderOverview, renderOverviewProgressTable, renderQuestionsList, renderResultsTable, renderTeacherRewards, resetQuestionWorkspace, saveBlocks, selectActiveQuestion, selectSpecificClass, setupNewQuestionForm, startTeacherApp, switchTab, showConfirmModal, closeConfirmModal, handleConfirmAction,
  openCustomTestGeneratorModal, closeCustomTestGeneratorModal, renderCustomTestQuestionsList, updateCustomTestSelectedCount, handleSelectRange, handleCustomTestFormSubmit,
  renderLockTabsTab, toggleTabLockState
});
