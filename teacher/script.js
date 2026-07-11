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

document.addEventListener("DOMContentLoaded", () => {
  if (window.IC3_CACHE && window.IC3_CACHE.users && window.IC3_CACHE.users.length > 0) {
    startTeacherApp();
  } else {
    window.addEventListener('ic3-db-ready', startTeacherApp);
  }
});

function startTeacherApp() {
  checkTeacherAuth();
  initClock();
  initClassSelector();

  // Form listeners
  document.getElementById("classForm").addEventListener("submit", handleClassSubmit);
  document.getElementById("addStudentToClassForm").addEventListener("submit", handleStudentToClassSubmit);
}

// 1. Auth Validation
function checkTeacherAuth() {
  const currentUser = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));
  if (!currentUser || currentUser.role !== "teacher") {
    alert("Bạn không có quyền truy cập trang Giáo viên. Vui lòng đăng nhập bằng tài khoản Giáo viên!");
    window.location.href = "../index.html";
    return;
  }
  document.getElementById("teacherName").innerText = currentUser.name || "Giáo viên";
  document.getElementById("teacherEmail").innerText = currentUser.email;
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
  window.location.href = "../index.html";
}

// 3. Class selection control
function initClassSelector() {
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];
  const teacher = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));
  
  // Filter classes belonging to this teacher
  const teacherClasses = classes.filter(c => c.teacherEmail === teacher.email);
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
    ranking: "Bảng vàng vinh danh thi đua học tập"
  };
  document.getElementById("currentTabTitle").innerText = titles[tabId] || "Cổng giáo viên";

  // Fresh render of selected tab
  if (tabId === "overview") renderOverview();
  else if (tabId === "students-list") renderClassStudentsTable();
  else if (tabId === "manage-tests") initManageTestsTab();
  else if (tabId === "results") renderResultsTable();
  else if (tabId === "ranking") renderClassRanking();
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
  const teacher = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));
  const teacherClasses = classes.filter(c => c.teacherEmail === teacher.email);
  
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
      <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-500/30">
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
      <td class="px-4 py-3.5 font-medium text-indigo-200">${pokemonIcons[std.pokemon] || std.pokemon}</td>
      <td class="px-4 py-3.5">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-indigo-50">${std.exp} EXP</span>
          <span class="text-[10px] text-yellow-600">🪙 ${std.coins}</span>
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

  const filterVal = document.getElementById("schoolClassFilter").value;
  const filteredStudents = filterVal ? classStudents.filter(s => s.schoolClass === filterVal) : classStudents;

  const body = document.getElementById("class-students-table-body");
  body.innerHTML = "";

  if (filteredStudents.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>`;
    return;
  }

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];

  filteredStudents.forEach(std => {
    // Count success tests (>=50)
    const passedCount = scores.filter(sc => sc.studentEmail === std.email && sc.score >= 50).length;
    
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

    const tr = document.createElement("tr");
    tr.className = "hover:bg-[#131424]/80 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-5 py-3.5 font-bold text-slate-850">
        <button onclick="openStudentDetailsModal('${std.email}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-left flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-circle-user text-indigo-300"></i> ${std.name}
        </button>
      </td>
      <td class="px-5 py-3.5 font-medium text-indigo-200">${schoolText}</td>
      <td class="px-5 py-3.5 font-medium text-indigo-200">${classText}</td>
      <td class="px-5 py-3.5 font-mono text-indigo-300">${std.email}</td>
      <td class="px-5 py-3.5"><span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">${std.level || "Beginner"}</span></td>
      <td class="px-5 py-3.5 font-mono font-bold text-yellow-600">${std.exp} EXP</td>
      <td class="px-5 py-3.5 text-center font-bold text-emerald-600">${passedCount} bài đạt</td>
      <td class="px-5 py-3.5 text-right">
        <div class="flex justify-end gap-1.5">
          <button onclick="openStudentDetailsModal('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded transition-all cursor-pointer">
            <i class="fa-solid fa-eye"></i> Lịch sử
          </button>
          <button onclick="removeStudentFromClass('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-red-500/20 text-red-600 hover:bg-red-100 border border-red-200 rounded transition-all cursor-pointer">
            <i class="fa-solid fa-user-minus"></i> Xóa
          </button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

function populateSchoolClassFilter(classStudents) {
  const filter = document.getElementById("schoolClassFilter");
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
            unlockedZones: ["level_1"]
          };
          
          students.push(newStudent);
          
          // Allow authentication
          users.push({
            email: email,
            password: "123456",
            role: "student",
            name: name
          });
          count++;
        }
      });
      
      window.saveData(window.IC3_KEYS.STUDENTS, students);
      window.saveData(window.IC3_KEYS.USERS, users);
      
      alert(`Đã nhập thành công ${count} học sinh từ file Excel! Mật khẩu đăng nhập mặc định của các em là: 123456`);
      renderClassStudentsTable();
      renderOverview();
    } catch (err) {
      alert("Đã xảy ra lỗi khi đọc file Excel: " + err.message);
    }
  };
  reader.readAsBinaryString(file);
  e.target.value = ""; // Clear input
}

function openAddStudentToClassModal() {
  if (!activeClassId) {
    alert("Vui lòng chọn lớp học hoặc tạo lớp mới trước!");
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
    alert("Không có học sinh hợp lệ nào được chọn!");
    return;
  }

  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const idx = students.findIndex(s => s.email === email);
  if (idx !== -1) {
    students[idx].classId = activeClassId;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  closeAddStudentToClassModal();
  renderOverview();
  renderClassStudentsTable();
}

function removeStudentFromClass(email) {
  if (confirm(`Bạn muốn đưa học sinh ${email} ra khỏi lớp học này?`)) {
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
    const idx = students.findIndex(s => s.email === email);
    if (idx !== -1) {
      students[idx].classId = ""; // No class assigned
      window.saveData(window.IC3_KEYS.STUDENTS, students);
    }
    renderOverview();
    renderClassStudentsTable();
  }
}

// ==================== POPUP MODAL: STUDENT DETAILS & HISTORY ====================
function openStudentDetailsModal(studentEmail) {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const student = students.find(s => s.email === studentEmail);
  if (!student) {
    alert("Không tìm thấy thông tin học sinh!");
    return;
  }

  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };
  document.getElementById("detail-pokemon-avatar").innerText = pokemonAvatars[student.pokemon] || "🦊";
  document.getElementById("detail-student-name").innerText = student.name;
  document.getElementById("detail-student-email").innerText = student.email;
  document.getElementById("detail-student-level").innerText = `Cấp độ: ${student.level || "Beginner"}`;
  document.getElementById("detail-student-rank").innerText = `Hạng: ${student.rank || "Bronze"}`;
  document.getElementById("detail-student-school").innerText = `Trường: ${student.schoolClass || "Chưa có"}`;

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const studentScores = scores.filter(s => s.studentEmail === studentEmail);
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  // Lịch sử làm bài thi
  const attemptsTbody = document.getElementById("detail-attempts-tbody");
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
  const highestScoresTbody = document.getElementById("detail-highest-scores-tbody");
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

  document.getElementById("studentDetailsModal").classList.remove("hidden");
}

function closeStudentDetailsModal() {
  document.getElementById("studentDetailsModal").classList.add("hidden");
}


// ==================== UNIFIED MANAGE TESTS & QUESTIONS TAB ====================

// Local storage blocks loader helper
function getBlocks() {
  const blocksData = localStorage.getItem("ic3_blocks");
  if (!blocksData || blocksData.includes("block_level_1") || !blocksData.includes("block_3")) {
    const defaultBlocks = [
      { id: "block_3", name: "Khối 3" },
      { id: "block_4", name: "Khối 4" },
      { id: "block_5", name: "Khối 5" },
      { id: "block_6", name: "Khối 6" },
      { id: "block_7", name: "Khối 7" },
      { id: "block_8", name: "Khối 8" }
    ];
    localStorage.setItem("ic3_blocks", JSON.stringify(defaultBlocks));
    return defaultBlocks;
  }
  return JSON.parse(blocksData);
}

function saveBlocks(blocks) {
  localStorage.setItem("ic3_blocks", JSON.stringify(blocks));
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
  window.saveData(window.IC3_KEYS.TESTS, tests);

  const blockTests = tests.filter(t => t.blockId === blockId);
  const testSelector = document.getElementById("m-testSelector");
  testSelector.innerHTML = `<option value="">-- Chọn bộ đề thám hiểm --</option>`;

  blockTests.forEach(t => {
    let diffIcon = "🟢 Dễ";
    if (t.difficulty === "medium") diffIcon = "🟡 Trung bình";
    if (t.difficulty === "hard") diffIcon = "🔴 Khó";
    testSelector.innerHTML += `<option value="${t.id}">[${diffIcon}] ${t.title} (${t.questions.length} câu)</option>`;
  });

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
  listContainer.innerHTML = "";

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  const test = tests.find(t => t.id === testId);
  if (!test) return;

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
  const testQuestions = questions.filter(q => test.questions.includes(q.id));

  const filteredQuestions = typeFilter ? testQuestions.filter(q => q.type === typeFilter) : testQuestions;

  if (filteredQuestions.length === 0) {
    listContainer.innerHTML = `<p class="p-4 text-center text-[11px] text-indigo-300 italic">Chưa có câu hỏi nào thuộc dạng này.</p>`;
    return;
  }

  const typeLabels = {
    choice: "Trắc nghiệm 1 đáp án",
    drag_text: "Kéo thả chữ",
    drag_image_text: "Kéo thả hình + chữ",
    table_match: "Nối bảng / Ghép",
    multi_choice: "Chọn nhiều đáp án",
    image_choice: "Chọn bằng hình ảnh",
    multiple_choice: "Trắc nghiệm cũ",
    true_false: "Đúng / Sai",
    fill_blank: "Điền khuyết"
  };

  filteredQuestions.forEach((q, idx) => {
    const item = document.createElement("button");
    item.id = `q-list-item-${q.id}`;
    item.onclick = () => selectActiveQuestion(q.id);
    item.className = "w-full text-left p-3 hover:bg-[#131424]/80 flex flex-col gap-1 transition-all border-b border-indigo-500/30/30 cursor-pointer";
    item.innerHTML = `
      <div class="flex justify-between items-center w-full">
        <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600">${typeLabels[q.type] || q.type}</span>
        <span class="text-[9px] text-indigo-300 font-mono">ID: ${q.id}</span>
      </div>
      <p class="text-xs font-semibold text-indigo-100 truncate w-full">${idx + 1}. ${q.question}</p>
    `;
    listContainer.appendChild(item);
  });
}

function selectActiveQuestion(qId) {
  activeQuestionId = qId;
  
  // Highlight in left list
  document.querySelectorAll("#m-questionsList button").forEach(btn => {
    btn.classList.remove("bg-indigo-50/50", "border-indigo-100");
  });
  const activeBtn = document.getElementById(`q-list-item-${qId}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-indigo-50/50", "border-indigo-100");
  }

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
  const q = questions.find(item => item.id === qId);
  if (!q) return;

  // Render view mode
  document.getElementById("view-placeholder").classList.add("hidden");
  document.getElementById("view-question-card").classList.remove("hidden");
  document.getElementById("question-edit-form").classList.add("hidden");

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
  document.getElementById("view-q-type-badge").innerText = typeLabels[q.type] || q.type.toUpperCase();
  document.getElementById("view-q-text").innerText = q.question;
  
  // Show image if available
  const qImgContainer = document.getElementById("view-q-image-container");
  const qImgElement = document.getElementById("view-q-image");
  if (qImgContainer && qImgElement) {
    if (q.image) {
      qImgElement.src = convertDriveUrl(q.image);
      qImgContainer.classList.remove("hidden");
    } else {
      qImgElement.src = "";
      qImgContainer.classList.add("hidden");
    }
  }

  // Get options container
  const optionsContainer = document.getElementById("view-q-options-container");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
  }
  
  // 1. Calculate display answer
  let displayAnswer = q.answer || "";
  if (q.type === "choice" && q.options) {
    displayAnswer = `${String.fromCharCode(65 + (q.correctIndex || 0))}. ${q.options[q.correctIndex || 0]}`;
  } else if (q.type === "drag_text" || q.type === "drag_image_text") {
    displayAnswer = (q.correctAnswers || []).join(" | ");
  } else if (q.type === "table_match") {
    displayAnswer = (q.correctAnswers || []).map((ansIdx, rIdx) => `${(q.rows || [])[rIdx] || ""} -> ${(q.options || [])[ansIdx] || ""}`).join(" | ");
  } else if (q.type === "multi_choice" && q.options) {
    displayAnswer = (q.correctIndices || []).map(idx => `${String.fromCharCode(65 + idx)}. ${q.options[idx]}`).join(" | ");
  } else if (q.type === "hotspot") {
    displayAnswer = `Xác định ${q.requiredCount || 1} khu vực trên ảnh`;
  } else if (q.type === "image_choice" && q.options) {
    displayAnswer = `Lựa chọn ${q.correctIndex + 1}`;
  } else if (q.type === "hotspot") {
      optionsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider"><i class="fa-solid fa-image mr-1"></i>Khu vực đáp án:</div>
          <div class="relative inline-block border border-gray-600 rounded bg-black/20" style="max-width: 100%;">
             <img src="${q.imageUrl || ''}" style="max-width: 100%; display: ${q.imageUrl ? 'block' : 'none'}; pointer-events: none;" draggable="false">
             <div class="absolute inset-0">
               ${(q.hotspots || []).map((area, i) => `<div class="absolute border-2 border-green-500 bg-green-500/20 flex items-center justify-center text-green-300 font-bold text-xs" style="left: ${area.x}%; top: ${area.y}%; width: ${area.w}%; height: ${area.h}%;">${i + 1}</div>`).join('')}
             </div>
          </div>
          <div class="text-xs text-indigo-200">Số điểm cần nhấp đúng: <span class="font-bold text-purple-400">${q.requiredCount || 1}</span></div>
        </div>
      `;
    } else if (q.type === "true_false") {
    displayAnswer = q.answer === "true" || q.answer === true || q.answer === "đúng" || q.answer === "Đúng" ? "Đúng" : "Sai";
  }
  
  document.getElementById("view-q-answer").innerText = displayAnswer;
  document.getElementById("view-q-explanation").innerText = q.explanation || "Không có giải thích.";

  // 2. Render options visualization
  if (optionsContainer) {
    if (q.type === "choice" && q.options) {
      q.options.forEach((opt, idx) => {
        const isCorrect = idx === q.correctIndex;
        optionsContainer.innerHTML += `
          <div class="p-2.5 rounded-xl border ${isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold' : 'border-indigo-500/30 bg-[#131424]/80 text-indigo-100'} text-xs flex justify-between items-center transition-all">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white font-bold' : 'border-indigo-400 bg-[#1a1c2e]'}">${String.fromCharCode(65 + idx)}</span>
              <span>${opt}</span>
            </div>
            ${isCorrect ? '<span class="text-emerald-400 font-bold flex items-center gap-1 text-[10px]"><i class="fa-solid fa-circle-check"></i> ĐÁP ÁN ĐÚNG</span>' : ''}
          </div>
        `;
      });
    } else if (q.type === "drag_text") {
      optionsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider"><i class="fa-solid fa-tags mr-1"></i>Thẻ từ khóa kéo thả (Options):</div>
          <div class="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#131424]/80 border border-indigo-500/30">
            ${(q.options || []).map(opt => `
              <span class="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold font-mono">${opt}</span>
            `).join("")}
          </div>
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mt-3"><i class="fa-solid fa-arrows-to-dot mr-1"></i>Ô trống & Đáp án đúng:</div>
          <div class="space-y-2">
            ${(q.rows || []).map((row, idx) => `
              <div class="p-3 bg-[#131424]/80 rounded-xl border border-indigo-500/30 flex justify-between items-center text-xs">
                <span class="font-bold text-indigo-100">${row.label || row}</span>
                <span class="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-200 text-emerald-400 font-bold font-mono text-[11px] flex items-center gap-1">✓ ${q.correctAnswers[idx] || ""}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (q.type === "drag_image_text") {
      optionsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider"><i class="fa-solid fa-tags mr-1"></i>Nhãn chữ kéo thả (Options):</div>
          <div class="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#131424]/80 border border-indigo-500/30">
            ${(q.options || []).map(opt => `
              <span class="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold font-mono">${opt}</span>
            `).join("")}
          </div>
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mt-3"><i class="fa-solid fa-images mr-1"></i>Ghép nối hình ảnh & Đáp án đúng:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${(q.leftImages || []).map((img, idx) => `
              <div class="p-3 bg-[#131424]/80 rounded-xl border border-indigo-500/30 flex flex-col items-center gap-2 text-xs">
                <img src="${convertDriveUrl(img)}" class="h-20 w-auto object-contain rounded bg-[#1a1c2e] p-1.5 border border-indigo-500/30" referrerPolicy="no-referrer">
                <span class="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-200 text-emerald-400 font-bold font-mono text-[11px] flex items-center gap-1">✓ ${q.correctAnswers[idx] || ""}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (q.type === "table_match") {
      const headers = q.headers || ["Cột trái", "Cột phải"];
      optionsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider"><i class="fa-solid fa-table-list mr-1"></i>Bảng nối cặp đúng (Table Match):</div>
          <div class="overflow-hidden border border-indigo-500/30 rounded-xl shadow-sm">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-[#131424]/80 border-b border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  <th class="p-3">${headers[0]}</th>
                  <th class="p-3">${headers[1]}</th>
                </tr>
              </thead>
              <tbody>
                ${(q.rows || []).map((row, idx) => `
                  <tr class="border-b border-indigo-500/10 hover:bg-[#131424]/80/50 transition-colors">
                    <td class="p-3 font-semibold text-indigo-100">${row}</td>
                    <td class="p-3"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-150 text-emerald-400 font-bold text-[11px] flex items-center gap-1 w-fit">✓ ${(q.options || [])[q.correctAnswers[idx]] || ""}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (q.type === "multi_choice" && q.options) {
      q.options.forEach((opt, idx) => {
        const isCorrect = (q.correctIndices || []).includes(idx);
        optionsContainer.innerHTML += `
          <div class="p-2.5 rounded-xl border ${isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold shadow-sm shadow-emerald-500/5' : 'border-indigo-500/30 bg-[#131424]/80 text-indigo-100'} text-xs flex justify-between items-center transition-all">
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded border flex items-center justify-center text-[10px] ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white font-bold' : 'border-indigo-400 bg-[#1a1c2e]'}"><i class="fa-solid fa-check"></i></span>
              <span>${opt}</span>
            </div>
            ${isCorrect ? '<span class="text-emerald-400 font-bold flex items-center gap-1 text-[10px]"><i class="fa-solid fa-circle-check"></i> ĐÁP ÁN ĐÚNG</span>' : ''}
          </div>
        `;
      });
    } else if (q.type === "image_choice" && q.options) {
      optionsContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 w-full">
          ${q.options.map((img, idx) => {
            const isCorrect = idx === q.correctIndex;
            return `
              <div class="p-3 bg-[#131424]/80 border-2 rounded-xl flex flex-col items-center gap-2 relative overflow-hidden transition-all duration-200 ${isCorrect ? 'border-emerald-500 bg-emerald-500/20' : 'border-indigo-500/30'}">
                <img src="${convertDriveUrl(img)}" class="h-20 w-auto object-contain rounded bg-[#1a1c2e] p-1.5 border border-indigo-500/30" referrerPolicy="no-referrer">
                <span class="text-[10px] font-bold text-indigo-300">Lựa chọn ${idx+1}</span>
                ${isCorrect ? '<span class="absolute top-1 right-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded shadow flex items-center gap-0.5"><i class="fa-solid fa-check"></i> ĐÚNG</span>' : ''}
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else if (q.type === "true_false") {
      const isTrueCorrect = q.answer === "true" || q.answer === true || q.answer === "đúng" || q.answer === "Đúng";
      optionsContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 w-full">
          <div class="p-3 rounded-xl border text-center transition-all ${isTrueCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold' : 'border-indigo-500/30 bg-[#131424]/80 text-indigo-100'}">
            <p class="text-sm">Đúng</p>
            ${isTrueCorrect ? '<span class="text-[10px] text-emerald-400 font-bold">✓ ĐÁP ÁN ĐÚNG</span>' : ''}
          </div>
          <div class="p-3 rounded-xl border text-center transition-all ${!isTrueCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold' : 'border-indigo-500/30 bg-[#131424]/80 text-indigo-100'}">
            <p class="text-sm">Sai</p>
            ${!isTrueCorrect ? '<span class="text-[10px] text-emerald-400 font-bold">✓ ĐÁP ÁN ĐÚNG</span>' : ''}
          </div>
        </div>
      `;
    } else if (q.type === "fill_blank") {
      optionsContainer.innerHTML = `
        <div class="p-3.5 bg-[#131424]/80 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
          <p class="font-bold text-indigo-100 mb-1">Dạng điền từ vào ô trống:</p>
          <p>Học sinh nhập câu trả lời trực tiếp: <span class="font-bold text-emerald-400 underline font-mono text-sm">${q.answer}</span></p>
        </div>
      `;
    } else if (q.options) {
      q.options.forEach(opt => {
        optionsContainer.innerHTML += `
          <div class="p-2.5 rounded-lg border border-indigo-500/30 bg-[#131424]/80 text-xs text-indigo-100">
            ${opt}
          </div>
        `;
      });
    }
  }

  // Set action buttons
  document.getElementById("btn-edit-question").classList.remove("hidden");
  document.getElementById("btn-delete-question").classList.remove("hidden");
  document.getElementById("right-panel-title").innerText = "Nội dung câu hỏi";
}

function resetQuestionWorkspace() {
  activeQuestionId = "";
  document.getElementById("view-placeholder").classList.remove("hidden");
  document.getElementById("view-question-card").classList.add("hidden");
  document.getElementById("question-edit-form").classList.add("hidden");
  document.getElementById("btn-edit-question").classList.add("hidden");
  document.getElementById("btn-delete-question").classList.add("hidden");
  document.getElementById("right-panel-title").innerText = "Nội dung câu hỏi";
  
  // Reset image
  const imgInput = document.getElementById("form-q-image");
  if(imgInput) imgInput.value = "";
}

function setupNewQuestionForm() {
  const testId = document.getElementById("m-testSelector").value;
  if (!testId) {
    alert("Vui lòng chọn bộ đề thám hiểm trước!");
    return;
  }

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  const test = tests.find(t => t.id === testId);

  document.getElementById("view-placeholder").classList.add("hidden");
  document.getElementById("view-question-card").classList.add("hidden");
  document.getElementById("question-edit-form").classList.remove("hidden");

  // Reset inputs
  document.getElementById("form-q-id").value = "";
  document.getElementById("form-q-type").value = "choice";
  document.getElementById("form-q-text").value = "";
  const ansInput = document.getElementById("form-q-answer");
  if (ansInput) ansInput.value = "";
  document.getElementById("form-q-explanation").value = "";
  
  // Reset image
  const imgInput = document.getElementById("form-q-image");
  if(imgInput) imgInput.value = "";

  adjustFormQuestionOptions();
  document.getElementById("right-panel-title").innerText = "Tạo câu hỏi mới";
  
  // Hide viewer action buttons
  document.getElementById("btn-edit-question").classList.add("hidden");
  document.getElementById("btn-delete-question").classList.add("hidden");
}

function enableQuestionEditing() {
  if (!activeQuestionId) return;

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
  const q = questions.find(item => item.id === activeQuestionId);
  if (!q) return;

  document.getElementById("view-placeholder").classList.add("hidden");
  document.getElementById("view-question-card").classList.add("hidden");
  document.getElementById("question-edit-form").classList.remove("hidden");

  // Populate form fields
  document.getElementById("form-q-id").value = q.id;
  document.getElementById("form-q-type").value = q.type;
  document.getElementById("form-q-text").value = q.question;
  document.getElementById("form-q-explanation").value = q.explanation || "";

  const imgInput = document.getElementById("form-q-image");
  if(imgInput) imgInput.value = q.image || "";

  renderDynamicFormFields(q.type, q);
  const ansInput = document.getElementById("form-q-answer");
  if (ansInput) ansInput.value = q.answer;
  document.getElementById("right-panel-title").innerText = "Chỉnh sửa câu hỏi";
}

function cancelQuestionEditing() {
  if (activeQuestionId) {
    selectActiveQuestion(activeQuestionId);
  } else {
    resetQuestionWorkspace();
  }
}

function renderDynamicFormFields(type, qData = {}) {
  const container = document.getElementById("dynamic-form-fields");
  container.innerHTML = ""; // Clear existing

  let html = "";
  const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm";
  const labelClass = "block text-xs font-bold text-indigo-300 uppercase mb-2 tracking-wider";

  if (type === "choice") {
    html = `
      <div class="p-5 rounded-2xl border border-purple-500/30 bg-[#1a1c2e]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-purple-400">Cấu hình các đáp án trắc nghiệm:</h3>
          <button type="button" onclick="window.addMultiChoiceOption('choice')" class="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
             <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm đáp án
          </button>
        </div>
        <div id="form-multi-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;
    
    const opts = qData.options || ["", "", "", ""];
    opts.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const optVal = opt ? opt.replace(/"/g, '&quot;') : '';
        const isChecked = (qData.correctIndex === i) || (i===0 && qData.correctIndex === undefined);
        html += `
          <div class="multi-opt-row flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] transition-colors hover:border-purple-300 relative group">
             <input type="radio" name="form-correct-choice" value="${i}" ${isChecked ? 'checked' : ''} class="mt-2.5 w-4 h-4 text-purple-400 focus:ring-purple-500 border-indigo-400 cursor-pointer">
             <div class="flex-1">
               <div class="flex items-center justify-between mb-1.5 pl-1">
                 <div class="flex items-center gap-2">
                   <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold letter-indicator">${letter}</div>
                   <label class="text-xs font-bold text-indigo-100 label-indicator">Phương án ${letter}:</label>
                 </div>
                 <button type="button" onclick="this.closest('.multi-opt-row').remove(); window.updateMultiChoiceLetters('choice');" class="text-indigo-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                 </button>
               </div>
               <input type="text" class="form-opt-multi input-indicator w-full p-2.5 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm outline-none placeholder:text-indigo-300" placeholder="Nội dung phương án ${letter}..." value="${optVal}">
             </div>
          </div>
        `;
    });

    html += `
        </div>
        <div class="flex items-start md:items-center justify-between mt-4 flex-col md:flex-row gap-3">
            <div class="flex items-center gap-2 text-xs font-bold text-purple-400">
              <i data-lucide="lightbulb" class="w-4 h-4 text-yellow-500"></i>
              Hãy tích chọn chấm tròn ở đáp án chính xác nhất để hệ thống nhận diện.
            </div>
            <button type="button" onclick="window.addMultiChoiceOption('choice')" class="px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors flex items-center gap-2 bg-[#1a1c2e] shadow-sm whitespace-nowrap">
                <i data-lucide="plus" class="w-4 h-4"></i> Tạo thêm đáp án mới
            </button>
        </div>
      </div>
    `;
  } else if (type === "multi_choice") {
    html = `
      <div class="p-5 rounded-2xl border border-purple-500/30 bg-[#1a1c2e]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-purple-400">Cấu hình các đáp án trắc nghiệm CHỌN NHIỀU ĐÁP ÁN:</h3>
          <button type="button" onclick="window.addMultiChoiceOption('multi_choice')" class="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
             <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm đáp án
          </button>
        </div>
        <div id="form-multi-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;
    
    const opts = qData.options || ["", "", "", ""];
    const indices = qData.correctIndices || [];
    opts.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const optVal = opt.replace(/"/g, '&quot;');
        const isChecked = indices.includes(i);
        html += `
          <div class="multi-opt-row flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] transition-colors hover:border-purple-300 relative group">
             <input type="checkbox" name="form-correct-multi" value="${i}" ${isChecked ? 'checked' : ''} class="mt-2.5 w-4 h-4 text-blue-400 focus:ring-blue-500 border-indigo-400 rounded cursor-pointer">
             <div class="flex-1">
               <div class="flex items-center justify-between mb-1.5 pl-1">
                 <div class="flex items-center gap-2">
                   <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold letter-indicator">${letter}</div>
                   <label class="text-xs font-bold text-indigo-100 label-indicator">Phương án ${letter}:</label>
                 </div>
                 <button type="button" onclick="this.closest('.multi-opt-row').remove(); window.updateMultiChoiceLetters();" class="text-indigo-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                 </button>
               </div>
               <input type="text" class="form-opt-multi input-indicator w-full p-2.5 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm outline-none placeholder:text-indigo-300" placeholder="Nội dung phương án ${letter}..." value="${optVal}">
             </div>
          </div>
        `;
    });
    
    html += `
        </div>
        <div class="flex items-start md:items-center justify-between mt-4 flex-col md:flex-row gap-3">
            <div class="flex items-start gap-2 text-xs font-bold text-purple-400">
              <i data-lucide="lightbulb" class="w-4 h-4 text-yellow-500 mt-0.5 md:mt-0"></i>
              Hãy tích chọn các ô vuông ở những ĐÁP ÁN ĐÚNG (chọn được nhiều đáp án) để<br class="hidden md:block"> hệ thống nhận diện.
            </div>
            <button type="button" onclick="window.addMultiChoiceOption('multi_choice')" class="px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors flex items-center gap-2 bg-[#1a1c2e] shadow-sm whitespace-nowrap">
                <i data-lucide="plus" class="w-4 h-4"></i> Tạo thêm đáp án mới
            </button>
        </div>
      </div>
    `;
  } else if (type === "image_choice") {
    html = `
      <div class="p-5 rounded-2xl border border-purple-500/30 bg-[#1a1c2e]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-purple-400">Cấu hình các đáp án trắc nghiệm CHỌN HÌNH ẢNH:</h3>
          <button type="button" onclick="window.addMultiChoiceOption('image_choice')" class="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
             <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm đáp án hình ảnh
          </button>
        </div>
        <div id="form-multi-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;
    
    const opts = qData.options || ["", "", "", ""];
    const indices = qData.correctIndices || [];
    opts.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const optVal = opt.replace(/"/g, '&quot;');
        const isChecked = indices.includes(i);
        html += `
          <div class="multi-opt-row flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] transition-colors hover:border-purple-300 relative group">
             <input type="checkbox" name="form-correct-multi" value="${i}" ${isChecked ? 'checked' : ''} class="mt-2.5 w-4 h-4 text-blue-400 focus:ring-blue-500 border-indigo-400 rounded cursor-pointer">
             <div class="flex-1">
               <div class="flex items-center justify-between mb-1.5 pl-1">
                 <div class="flex items-center gap-2">
                   <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold letter-indicator">${letter}</div>
                   <label class="text-xs font-bold text-indigo-100 label-indicator">Đáp án đúng ${letter}</label>
                 </div>
                 <button type="button" onclick="this.closest('.multi-opt-row').remove(); window.updateMultiChoiceLetters();" class="text-indigo-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                 </button>
               </div>
               <input type="text" class="form-opt-multi input-indicator w-full p-2.5 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm outline-none placeholder:text-indigo-300" placeholder="Ví dụ: /favicon.png hoặc đường dẫn ảnh..." value="${optVal}">
             </div>
          </div>
        `;
    });
    
    html += `
        </div>
        <div class="flex items-start md:items-center justify-between mt-4 flex-col md:flex-row gap-3">
            <div class="flex items-start gap-2 text-xs font-bold text-purple-400">
              <i data-lucide="lightbulb" class="w-4 h-4 text-yellow-500 mt-0.5 md:mt-0"></i>
              Hãy tích chọn vào ô của những HÌNH ẢNH ĐÚNG để học sinh kiểm tra đáp án.
            </div>
            <button type="button" onclick="window.addMultiChoiceOption('image_choice')" class="px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors flex items-center gap-2 bg-[#1a1c2e] shadow-sm whitespace-nowrap">
                <i data-lucide="plus" class="w-4 h-4"></i> Tạo thêm đáp án mới
            </button>
        </div>
      </div>
    `;
  } else if (type === "table_match") {
    window.tmData = {
        columns: qData.options || ["Nhập", "Xuất"],
        rows: qData.rows || ["Bàn phím", "Scanner", "Màn hình"],
        correctAnswers: qData.correctAnswers || [0, 0, 1]
    };
    
    html = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm" id="tm-container">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Bảng nối cột (Lưới khớp ô):</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] mt-4">
            <div>
                <label class="block text-xs font-bold text-indigo-200 mb-2">Cỡ chữ trong bảng:</label>
                <select class="${inputClass} py-2">
                    <option>👁 Vừa (md) - Chuẩn mặc định</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-indigo-200 mb-2">Độ rộng bảng:</label>
                <select class="${inputClass} py-2">
                    <option>💻 Bình thường (Normal)</option>
                </select>
            </div>
        </div>

        <div class="p-4 rounded-xl border border-purple-500/20 bg-[#1a1c2e] mt-4">
            <div class="flex justify-between items-center mb-4">
                <h5 class="font-bold text-sm text-indigo-100">Danh sách các CỘT <span id="tm-col-count"></span></h5>
                <button type="button" onclick="window.addTmColumn()" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><i class="fa-solid fa-plus"></i> THÊM CỘT</button>
            </div>
            <div id="tm-cols" class="flex flex-wrap gap-3"></div>
        </div>

        <div class="p-4 rounded-xl border border-blue-500/20 bg-[#1a1c2e] mt-4">
            <div class="flex justify-between items-center mb-4">
                <h5 class="font-bold text-sm text-indigo-100">Danh sách các HÀNG & Click trỏ đáp án đúng <span id="tm-row-count"></span></h5>
                <button type="button" onclick="window.addTmRow()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><i class="fa-solid fa-plus"></i> THÊM HÀNG</button>
            </div>
            <div class="overflow-x-auto border border-indigo-500/30 rounded-xl">
                <table class="w-full">
                    <thead id="tm-rows-thead"></thead>
                    <tbody id="tm-rows-tbody"></tbody>
                </table>
            </div>
        </div>
      </div>
    `;
    setTimeout(() => { window.renderTableMatchUI(); }, 50);
} else if (type === "hotspot") {
    html = `
      <div class="p-5 rounded-2xl border border-purple-500/30 bg-[#1a1c2e]">
         <div class="flex items-center justify-between mb-4">
             <h3 class="text-sm font-bold text-purple-400">Cấu hình Xác định khu vực (Hotspot):</h3>
         </div>
         <div class="mb-4">
            <label class="${labelClass}">Hình ảnh gốc (URL hoặc Tải lên):</label>
            <div class="flex gap-2">
                <input type="text" id="hotspot-img-url" class="${inputClass}" placeholder="Nhập URL hình ảnh..." value="${qData.imageUrl || ''}" onchange="window.updateHotspotPreview()">
                <button type="button" onclick="window.updateHotspotPreview()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap text-sm flex items-center gap-2"><i data-lucide="refresh-cw" class="w-4 h-4"></i>Load</button>
                <button type="button" onclick="window.triggerHotspotUpload()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap text-sm flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i>Tải lên</button>
            </div>
            <input type="file" id="hotspot-img-upload" accept="image/*" class="hidden" onchange="window.handleHotspotImgUpload(this)">
         </div>
         <div class="mb-4">
            <label class="${labelClass}">Số lượng khu vực cần xác định đúng (Số lần click của học sinh):</label>
            <input type="number" id="hotspot-req-count" class="${inputClass} w-32" value="${qData.requiredCount || 1}" min="1">
         </div>
         
         <div class="flex justify-between items-center mb-2">
             <label class="${labelClass} mb-0">Các khu vực đáp án:</label>
             <button type="button" onclick="window.addHotspotArea()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
                <i data-lucide="plus" class="w-3.5 h-3.5 inline-block mb-0.5"></i> Vẽ khu vực mới
             </button>
         </div>
         <p class="text-[11px] text-yellow-400 mb-4" id="hotspot-instruction">Nhấn "Vẽ khu vực mới" rồi kéo chuột trên ảnh dưới đây để tạo vùng chọn đúng.</p>

         <div id="hotspot-img-container" class="relative inline-block border border-gray-600 bg-black/20 rounded max-w-full overflow-hidden" style="min-height: 100px;">
             <img id="hotspot-preview-img" src="${qData.imageUrl || ''}" style="max-width: 100%; display: ${qData.imageUrl ? 'block' : 'none'}; pointer-events: none;" draggable="false">
             <div id="hotspot-overlay" class="absolute inset-0 cursor-crosshair"></div>
         </div>
         
         <div id="hotspot-list" class="mt-4 flex flex-col gap-2">
         </div>
      </div>
    `;
    setTimeout(() => { 
        window.hotspotAreas = qData.hotspots ? JSON.parse(JSON.stringify(qData.hotspots)) : [];
        window.renderHotspotAreas(); 
        window.initHotspotDrawing();
        if (window.lucide) window.lucide.createIcons();
    }, 50);

} else if (type === "drag_text") {
      html = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Kéo thả Khớp các Cặp Chữ:</h4>
        <p class="text-[11px] text-indigo-300 italic mb-4">Thực hiện ghép vế Trái khớp với định nghĩa vế Phải tương ứng. Hệ thống sẽ tự đảo ngẫu nhiên khi hiển thị.</p>
        
        <div class="grid grid-cols-2 gap-4 mb-2">
            <span class="text-xs font-bold text-indigo-200">Từ Khóa Vế Trái (Cố định)</span>
            <span class="text-xs font-bold text-indigo-200">Nhãn Khớp Vế Phải (Kéo thả)</span>
        </div>
        <div id="drag-text-rows" class="space-y-3 border-t border-indigo-500/30 border-dashed pt-3">
            ${(qData.rows && qData.rows.length ? qData.rows : ['', '', '', '']).map((row, idx) => `
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" class="dt-left ${inputClass}" placeholder="Ví dụ: RAM" value="${row}">
                    <input type="text" class="dt-right ${inputClass}" placeholder="Khớp: Bộ nhớ truy cập ngẫu nhiên" value="${(qData.correctAnswers || [])[idx] || ''}">
                </div>
            `).join('')}
        </div>
        <button type="button" onclick="addDragTextRow()" class="mt-3 px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors bg-[#1a1c2e] shadow-sm">+ Thêm cặp</button>
      </div>
    `;
  } else if (type === "drag_image_text") {
      html = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Kéo thả Khớp Ảnh - Chữ:</h4>
        <p class="text-[11px] text-indigo-300 italic mb-4">Nhập đường dẫn hình ảnh cột vế Trái khớp với đáp án chữ vế Phải tương ứng.</p>
        
        <div class="grid grid-cols-2 gap-4 mb-2">
            <span class="text-xs font-bold text-indigo-200">Đường dẫn ảnh Trái (Link URL)</span>
            <span class="text-xs font-bold text-indigo-200">Nhãn Khớp Chữ Phải</span>
        </div>
        <div id="drag-image-text-rows" class="space-y-3 border-t border-indigo-500/30 border-dashed pt-3">
            ${(qData.rows && qData.rows.length ? qData.rows : ['', '', '', '']).map((row, idx) => `
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" class="dit-left ${inputClass}" placeholder="/favicon.png hoặc URL ảnh..." value="${row}">
                    <input type="text" class="dit-right ${inputClass}" placeholder="Nhãn khớp: e.g. Thùng rác máy tính" value="${(qData.correctAnswers || [])[idx] || ''}">
                </div>
            `).join('')}
        </div>
        <button type="button" onclick="addDragImageTextRow()" class="mt-3 px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors bg-[#1a1c2e] shadow-sm">+ Thêm cặp</button>
      </div>
    `;
  } else if (type === "true_false") {
      html = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <div>
          <label class="${labelClass}">Đáp án đúng</label>
          <select id="form-q-answer" class="${inputClass}">
              <option value="Đúng" ${qData.answer === "Đúng" ? 'selected' : ''}>Đúng</option>
              <option value="Sai" ${qData.answer === "Sai" ? 'selected' : ''}>Sai</option>
          </select>
        </div>
        
      </div>
    `;
  } else if (type === "multiple_choice") {
      html = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <div>
          <label class="${labelClass}">Các lựa chọn (A, B, C, D)</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span class="text-indigo-300 font-bold">A</span></div><input type="text" id="form-optA" class="${inputClass} pl-8" placeholder="Đáp án A" value="${(qData.options && qData.options[0] || '').replace('A. ', '')}"></div>
            <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span class="text-indigo-300 font-bold">B</span></div><input type="text" id="form-optB" class="${inputClass} pl-8" placeholder="Đáp án B" value="${(qData.options && qData.options[1] || '').replace('B. ', '')}"></div>
            <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span class="text-indigo-300 font-bold">C</span></div><input type="text" id="form-optC" class="${inputClass} pl-8" placeholder="Đáp án C" value="${(qData.options && qData.options[2] || '').replace('C. ', '')}"></div>
            <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span class="text-indigo-300 font-bold">D</span></div><input type="text" id="form-optD" class="${inputClass} pl-8" placeholder="Đáp án D" value="${(qData.options && qData.options[3] || '').replace('D. ', '')}"></div>
          </div>
        </div>
        <div>
          <label class="${labelClass}">Đáp án đúng (A/B/C/D)</label>
          <input type="text" id="form-q-answer" class="${inputClass}" placeholder="Ví dụ: A" value="${qData.answer || ''}">
        </div>
        
      </div>
    `;
  }
  
  container.innerHTML = html;

  // Ensure icons are rendered
  if (window.lucide) {
      window.lucide.createIcons();
  }
}

window.addMultiChoiceOption = function(type) {
    const container = document.getElementById('form-multi-options');
    if (!container) return;
    const index = container.children.length;
    const letter = String.fromCharCode(65 + index);
    
    const div = document.createElement('div');
    div.className = "multi-opt-row flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] transition-colors hover:border-purple-300 relative group";
    
    const isImage = type === 'image_choice';
    const isChoice = type === 'choice';
    const labelPrefix = isImage ? 'Đáp án đúng' : 'Phương án';
    const placeholderText = isImage ? 'Ví dụ: /favicon.png hoặc đường dẫn ảnh...' : `Nội dung phương án ${letter}...`;
    const inputType = isChoice ? 'radio' : 'checkbox';
    const inputName = isChoice ? 'form-correct-choice' : 'form-correct-multi';
    const inputColorClass = isChoice ? 'text-purple-400 focus:ring-purple-500' : 'text-blue-400 focus:ring-blue-500 rounded';
    
    div.innerHTML = `
             <input type="${inputType}" name="${inputName}" value="${index}" class="mt-2.5 w-4 h-4 ${inputColorClass} border-indigo-400 cursor-pointer">
             <div class="flex-1">
               <div class="flex items-center justify-between mb-1.5 pl-1">
                 <div class="flex items-center gap-2">
                   <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold letter-indicator">${letter}</div>
                   <label class="text-xs font-bold text-indigo-100 label-indicator">${labelPrefix} ${letter}</label>
                 </div>
                 <button type="button" onclick="this.closest('.multi-opt-row').remove(); window.updateMultiChoiceLetters('${type}');" class="text-indigo-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                 </button>
               </div>
               <input type="text" class="form-opt-multi w-full p-2.5 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm outline-none placeholder:text-indigo-300 input-indicator" placeholder="${placeholderText}">
             </div>
    `;
    container.appendChild(div);
    window.updateMultiChoiceLetters(type);
    if (window.lucide) { window.lucide.createIcons(); }
};

window.updateMultiChoiceLetters = function(type) {
    const container = document.getElementById('form-multi-options');
    if(!container) return;
    const rows = container.querySelectorAll('.multi-opt-row');
    rows.forEach((row, index) => {
        const letter = String.fromCharCode(65 + index);
        const radioOrCheckbox = row.querySelector('input[type="radio"], input[type="checkbox"]');
        if(radioOrCheckbox) radioOrCheckbox.value = index;

        
        const letterInd = row.querySelector('.letter-indicator');
        if(letterInd) letterInd.innerText = letter;
        
        const labelInd = row.querySelector('.label-indicator');
        if(labelInd) {
            const isImage = labelInd.innerText.startsWith('Đáp án');
            labelInd.innerText = isImage ? `Đáp án đúng ${letter}` : `Phương án ${letter}:`;
        }
        
        const inputInd = row.querySelector('.input-indicator');
        if(inputInd && inputInd.placeholder.startsWith('Nội dung')) {
            inputInd.placeholder = `Nội dung phương án ${letter}...`;
        }
    });
};

function adjustFormQuestionOptions() {
  const type = document.getElementById("form-q-type").value;
  renderDynamicFormFields(type);
  
  const hintEl = document.getElementById("form-q-type-hint");
  if(hintEl) {
      if(type === "choice") hintEl.innerText = "Học sinh sẽ được chọn một trong 4 phương án liệt kê bên dưới.";
      else if(type === "multi_choice") hintEl.innerText = "Học sinh có thể tích chọn một hoặc nhiều đáp án đúng tùy ý, sau đó nhấn nút xác nhận để kiểm tra kết quả.";
      else if(type === "image_choice") hintEl.innerText = "Các đáp án là hình ảnh (URL/Links). Học sinh sẽ tích chọn các hình ảnh đúng (hỗ trợ cả dạng chọn một hay chọn nhiều hình ảnh đúng).";
      else if(type === "hotspot") hintEl.innerText = "Học sinh sẽ nhấp chuột vào các khu vực trên hình ảnh để đánh dấu (Ví dụ: Tìm điểm sai).";
      else if(type === "drag_text") hintEl.innerText = "Học sinh sẽ kéo các từ/cụm từ vào các ô trống tương ứng trên màn hình.";
      else if(type === "table_match") hintEl.innerText = "Học sinh sẽ ghép nối các mục ở cột trái với các mục tương ứng ở cột phải.";
      else if(type === "true_false") hintEl.innerText = "Học sinh sẽ chọn Đúng hoặc Sai cho nhận định được đưa ra.";
      else hintEl.innerText = "Học sinh sẽ tương tác với câu hỏi theo định dạng đã chọn.";
  }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleQuestionFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("form-q-id").value;
  const type = document.getElementById("form-q-type").value;
  const questionText = document.getElementById("form-q-text").value.trim();
  const answer = document.getElementById("form-q-answer") ? document.getElementById("form-q-answer").value.trim() : "";
  const explanation = document.getElementById("form-q-explanation").value.trim();

  const imageInput = document.getElementById("form-q-image");
  let imageBase64 = imageInput ? imageInput.value.trim() : null;
  const level = "level_1"; // Default to level_1 as we removed the level selector

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
  const testId = document.getElementById("m-testSelector").value;

  let finalId = id;
  let isNew = false;

  if (!finalId) {
    finalId = `q_tcustom_${Date.now().toString().slice(-6)}`;
    isNew = true;
  }

  const qObj = {
    id: finalId,
    type,
    level,
    question: questionText,
    answer,
    explanation: explanation || "Tham khảo giải thích đáp án chuẩn từ Giáo viên.",
    image: imageBase64
  };

  if (type === "choice") {
    const opts = Array.from(document.querySelectorAll(".form-opt-multi")).map(i => i.value.trim());
    qObj.options = opts;
    const checkedRadio = document.querySelector('input[name="form-correct-choice"]:checked');
    qObj.correctIndex = checkedRadio ? parseInt(checkedRadio.value) : 0;
    qObj.answer = qObj.options[qObj.correctIndex] || "";
  } else if (type === "multi_choice" || type === "image_choice") {
    const opts = Array.from(document.querySelectorAll(".form-opt-multi")).map(i => i.value.trim());
    qObj.options = opts;
    const checkedBoxes = document.querySelectorAll('input[name="form-correct-multi"]:checked');
    qObj.correctIndices = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
    qObj.answer = qObj.correctIndices.map(i => opts[i]).join(', ');
  } else if (type === "table_match") {
    qObj.rows = [...window.tmData.rows];
    qObj.options = [...window.tmData.columns];
    qObj.correctAnswers = [...window.tmData.correctAnswers];
    qObj.answer = "Nối bảng";
  } else if (type === "drag_text") {
    const leftInputs = Array.from(document.querySelectorAll('.dt-left')).map(el => el.value.trim());
    const rightInputs = Array.from(document.querySelectorAll('.dt-right')).map(el => el.value.trim());
    const validPairs = leftInputs.map((l, i) => ({ l, r: rightInputs[i] })).filter(p => p.l && p.r);
    
    qObj.rows = validPairs.map(p => p.l);
    qObj.options = [...validPairs.map(p => p.r)].sort(() => Math.random() - 0.5); // Shuffle options
    qObj.correctAnswers = validPairs.map(p => p.r);
    qObj.answer = "Kéo thả chữ";
  } else if (type === "drag_image_text") {
    const leftInputs = Array.from(document.querySelectorAll('.dit-left')).map(el => el.value.trim());
    const rightInputs = Array.from(document.querySelectorAll('.dit-right')).map(el => el.value.trim());
    const validPairs = leftInputs.map((l, i) => ({ l, r: rightInputs[i] })).filter(p => p.l && p.r);
    
    qObj.rows = validPairs.map(p => p.l);
    qObj.leftImages = validPairs.map(p => p.l); // add leftImages for view compatibility
    qObj.options = [...validPairs.map(p => p.r)].sort(() => Math.random() - 0.5); // Shuffle options
    qObj.correctAnswers = validPairs.map(p => p.r);
    qObj.answer = "Kéo thả hình ảnh";
  } else if (type === "hotspot") {
    qObj.imageUrl = document.getElementById('hotspot-img-url').value.trim();
    qObj.requiredCount = parseInt(document.getElementById('hotspot-req-count').value) || 1;
    qObj.hotspots = window.hotspotAreas;
    qObj.answer = "Xác định khu vực trên ảnh";
  } else if (type === "true_false") {
    qObj.options = ["Đúng", "Sai"];
    qObj.answer = document.getElementById("form-q-answer").value;
  } else if (type === "multiple_choice") {
    qObj.options = [
      "A. " + document.getElementById("form-optA").value.trim(),
      "B. " + document.getElementById("form-optB").value.trim(),
      "C. " + document.getElementById("form-optC").value.trim(),
      "D. " + document.getElementById("form-optD").value.trim()
    ];
  }

  if (isNew) {
    questions.push(qObj);
    // Link to active test set
    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
    const idx = tests.findIndex(t => t.id === testId);
    if (idx !== -1) {
      tests[idx].questions.push(finalId);
      tests[idx].questionCount = tests[idx].questions.length;
      window.saveData(window.IC3_KEYS.TESTS, tests);
    }
  } else {
    const idx = questions.findIndex(item => item.id === finalId);
    if (idx !== -1) {
      questions[idx] = qObj;
    } else {
      questions.push(qObj);
    }
  }

  window.saveData(window.IC3_KEYS.QUESTIONS, questions);
  alert("Lưu câu hỏi thám hiểm thành công!");

  renderQuestionsList();
  selectActiveQuestion(finalId);
}

function deleteCurrentQuestion() {
  if (!activeQuestionId) return;

  if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này ra khỏi bộ đề thám hiểm?")) {
    const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
    const filteredQuestions = questions.filter(q => q.id !== activeQuestionId);
    window.saveData(window.IC3_KEYS.QUESTIONS, filteredQuestions);

    const testId = document.getElementById("m-testSelector").value;
    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
    const tIdx = tests.findIndex(t => t.id === testId);
    if (tIdx !== -1) {
      tests[tIdx].questions = tests[tIdx].questions.filter(id => id !== activeQuestionId);
      tests[tIdx].questionCount = tests[tIdx].questions.length;
      window.saveData(window.IC3_KEYS.TESTS, tests);
    }

    alert("Đã xóa câu hỏi thành công!");
    renderQuestionsList();
    resetQuestionWorkspace();
  }
}


// ==================== BLOCKS & TEST SETS (CRUD MODALS) ====================

function openBlockModal(action) {
  const modal = document.getElementById("blockModal");
  const form = document.getElementById("blockForm");
  form.reset();

  document.getElementById("block-form-action").value = action;
  
  if (action === "add") {
    document.getElementById("block-modal-title").innerText = "Tạo khối lớp mới";
    document.getElementById("blockIdInput").disabled = false;
  } else {
    const blockId = document.getElementById("m-blockSelector").value;
    if (!blockId) {
      alert("Vui lòng chọn khối lớp cần sửa!");
      return;
    }
    const blocks = getBlocks();
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    document.getElementById("block-modal-title").innerText = "Chỉnh sửa khối lớp";
    document.getElementById("blockIdInput").value = block.id;
    document.getElementById("blockIdInput").disabled = true;
    document.getElementById("blockNameInput").value = block.name;
  }

  modal.classList.remove("hidden");
}

function closeBlockModal() {
  document.getElementById("blockModal").classList.add("hidden");
}

function handleBlockFormSubmit(e) {
  e.preventDefault();

  const action = document.getElementById("block-form-action").value;
  const id = document.getElementById("blockIdInput").value.trim().toLowerCase();
  const name = document.getElementById("blockNameInput").value.trim();

  const blocks = getBlocks();

  if (action === "add") {
    if (blocks.some(b => b.id === id)) {
      alert("Mã định danh khối lớp này đã tồn tại!");
      return;
    }
    blocks.push({ id, name });
  } else {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx !== -1) {
      blocks[idx].name = name;
    }
  }

  saveBlocks(blocks);
  closeBlockModal();
  initManageTestsTab();

  // Auto-select modified block
  document.getElementById("m-blockSelector").value = id;
  onBlockSelectionChange();
}

function deleteCurrentBlock() {
  const blockId = document.getElementById("m-blockSelector").value;
  if (!blockId) {
    alert("Vui lòng chọn khối lớp cần xóa!");
    return;
  }

  if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa khối lớp này? Mọi bộ đề liên kết với khối này cũng sẽ bị xóa bỏ!")) {
    const blocks = getBlocks().filter(b => b.id !== blockId);
    saveBlocks(blocks);

    // Delete associated tests
    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
    const remainingTests = tests.filter(t => t.blockId !== blockId);
    window.saveData(window.IC3_KEYS.TESTS, remainingTests);

    alert("Đã xóa khối lớp thành công!");
    initManageTestsTab();
  }
}

function openTestSetModal(action) {
  const modal = document.getElementById("testSetModal");
  const form = document.getElementById("testSetForm");
  form.reset();

  document.getElementById("test-set-form-action").value = action;

  if (action === "add") {
    document.getElementById("test-set-modal-title").innerText = "Tạo bộ đề thám hiểm mới";
    document.getElementById("testSetIdInput").value = "";
    document.getElementById("testSetDifficultyInput").value = "easy";
  } else {
    const testId = document.getElementById("m-testSelector").value;
    if (!testId) {
      alert("Vui lòng chọn bộ đề cần sửa!");
      return;
    }
    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    document.getElementById("test-set-modal-title").innerText = "Chỉnh sửa bộ đề thám hiểm";
    document.getElementById("testSetIdInput").value = test.id;
    document.getElementById("testSetTitleInput").value = test.title;
    document.getElementById("testSetDurationInput").value = test.duration || 15;
    document.getElementById("testSetDifficultyInput").value = test.difficulty || "easy";
  }

  modal.classList.remove("hidden");
}

function closeTestSetModal() {
  document.getElementById("testSetModal").classList.add("hidden");
}

function handleTestSetFormSubmit(e) {
  e.preventDefault();

  const action = document.getElementById("test-set-form-action").value;
  let id = document.getElementById("testSetIdInput").value.trim().toLowerCase();
  
  if (action === "add") {
     id = `test_${Date.now().toString().slice(-6)}`;
  }
  
  const title = document.getElementById("testSetTitleInput").value.trim();
  const duration = parseInt(document.getElementById("testSetDurationInput").value) || 15;
  const difficulty = document.getElementById("testSetDifficultyInput").value;

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  const activeBlockId = document.getElementById("m-blockSelector").value;

  // Map block level identifiers for backward compatibility inside student zones
  let calculatedLevel = "level_1";
  if (activeBlockId.includes("level_2") || activeBlockId.includes("2")) {
    calculatedLevel = "level_2";
  } else if (activeBlockId.includes("level_3") || activeBlockId.includes("3")) {
    calculatedLevel = "level_3";
  }

  if (action === "add") {
    tests.push({
      id,
      title,
      blockId: activeBlockId,
      level: calculatedLevel,
      difficulty,
      duration,
      questions: [],
      questionCount: 0,
      scoreVal: 100,
      createdBY: JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER)).email
    });
  } else {
    const idx = tests.findIndex(t => t.id === id);
    if (idx !== -1) {
      tests[idx].title = title;
      tests[idx].duration = duration;
      tests[idx].level = calculatedLevel;
      tests[idx].difficulty = difficulty;
    }
  }

  window.saveData(window.IC3_KEYS.TESTS, tests);
  closeTestSetModal();
  
  // Reload block tests
  onBlockSelectionChange();
  
  // Auto-select modified test
  document.getElementById("m-testSelector").value = id;
  onTestSelectionChange();
}

function deleteCurrentTestSet() {
  const testId = document.getElementById("m-testSelector").value;
  if (!testId) {
    alert("Vui lòng chọn bộ đề cần xóa!");
    return;
  }

  if (confirm("Bạn có chắc chắn muốn xóa bộ đề thám hiểm này? Mọi liên kết và câu hỏi đi kèm sẽ bị gỡ bỏ.")) {
    const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
    const remainingTests = tests.filter(t => t.id !== testId);
    window.saveData(window.IC3_KEYS.TESTS, remainingTests);

    alert("Đã xóa bộ đề thành công!");
    onBlockSelectionChange();
  }
}


// ==================== RESULTS HISTORY ====================
function renderResultsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  const emails = classStudents.map(s => s.email);

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const classScores = scores.filter(sc => emails.includes(sc.studentEmail));
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  const body = document.getElementById("teacher-results-table-body");
  body.innerHTML = "";

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

  classScores.forEach(sc => {
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
  const classStudents = students.filter(s => s.classId === activeClassId);
  const leaderboardEl = document.getElementById("class-ranking-leaderboard");
  leaderboardEl.innerHTML = "";

  if (classStudents.length === 0) {
    leaderboardEl.innerHTML = `<div class="py-8 text-center text-indigo-300 text-sm italic">Lớp học chưa có thành viên nào.</div>`;
    return;
  }

  // Sort by EXP desc
  classStudents.sort((a, b) => b.exp - a.exp);

  const pokemonIcons = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  classStudents.forEach((std, index) => {
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
          ${pokemonIcons[std.pokemon] || "🦊"}
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
        <span class="text-[10px] text-yellow-600 font-semibold block">🪙 ${std.coins} Coins</span>
      </div>
    `;
    leaderboardEl.appendChild(div);
  });
}


// ==================== CLASS CRUD MODALS ====================
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
  const teacher = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));

  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];
  if (classes.some(c => c.id === id)) {
    alert("Mã định danh lớp học này đã bị trùng!");
    return;
  }

  const newClass = {
    id,
    name,
    teacherEmail: teacher.email,
    studentCount: 0
  };

  classes.push(newClass);
  window.saveData(window.IC3_KEYS.CLASSES, classes);

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
    let url = inputEl.value.trim();
    
    // Convert Google Drive link
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            url = `https://drive.google.com/uc?id=${match[1]}`;
            inputEl.value = url;
        }
    }
    
    const img = document.getElementById('hotspot-preview-img');
    img.onerror = () => {
        alert("Không thể tải ảnh từ link này. Hãy đảm bảo link Drive được chia sẻ công khai.");
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
        alert("Lỗi đọc file hình ảnh!");
    }
};

window.addHotspotArea = () => {
    const url = document.getElementById('hotspot-img-url').value.trim();
    if (!url) {
        alert("Vui lòng nhập URL hình ảnh hoặc tải ảnh lên trước.");
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
               <button type="button" onclick="window.removeHotspotArea(${i})" class="text-red-400 hover:text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
    });
    
    // Render boxes on overlay
    const overlay = document.getElementById('hotspot-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    window.hotspotAreas.forEach((area, i) => {
        const box = document.createElement('div');
        box.className = 'absolute border-2 border-green-500 bg-green-500/20 pointer-events-none flex items-center justify-center text-green-300 font-bold text-xs';
        box.style.left = `${area.x}%`;
        box.style.top = `${area.y}%`;
        box.style.width = `${area.w}%`;
        box.style.height = `${area.h}%`;
        box.innerText = i + 1;
        overlay.appendChild(box);
    });
    if (window.lucide) window.lucide.createIcons();
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
