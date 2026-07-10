/**
 * IC3 LMS - Admin Dashboard Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Wait for Cloud DB to be ready
  if (window.IC3_CACHE && window.IC3_CACHE.users && window.IC3_CACHE.users.length > 0) {
    startAdminApp();
  } else {
    window.addEventListener('ic3-db-ready', startAdminApp);
  }
});

function startAdminApp() {
  checkAdminAuth();
  initClock();
  initDashboard();

  // Add event listeners to forms
  document.getElementById("studentForm").addEventListener("submit", handleStudentSubmit);
  document.getElementById("teacherForm").addEventListener("submit", handleTeacherSubmit);
  document.getElementById("questionForm").addEventListener("submit", handleQuestionSubmit);
  document.getElementById("testForm").addEventListener("submit", handleTestSubmit);
  document.getElementById("rewardForm").addEventListener("submit", handleRewardSubmit);
}

// 1. Auth check
function checkAdminAuth() {
  const currentUser = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));
  if (!currentUser || currentUser.role !== "admin") {
    alert("Bạn không có quyền truy cập trang quản trị. Vui lòng đăng nhập bằng tài khoản Admin!");
    window.location.href = "../index.html";
    return;
  }
  // Display name
  document.getElementById("adminName").innerText = currentUser.name || "Quản trị viên";
  document.getElementById("adminEmail").innerText = currentUser.email;
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

// Logout
function logoutAdmin() {
  window.logoutUser();
  window.location.href = "../index.html";
}

// 3. Tab Switching Navigation
function switchTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  // Remove active styling from all buttons
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

  // Show active content
  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) activeTab.classList.remove("hidden");

  // Highlight active button
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active");

  // Update navbar header title
  const titles = {
    dashboard: "Tổng quan hệ thống",
    students: "Quản lý tài khoản học sinh",
    teachers: "Quản lý đội ngũ giáo viên",
    "ic3-levels": "Nội dung & Kho câu hỏi luyện thi IC3",
    tests: "Quản lý đề kiểm tra & Thử thách",
    ranking: "Bảng xếp hạng tổng năng lực học sinh",
    rewards: "Hệ thống quà tặng quy đổi Coins",
    settings: "Cài đặt & Cấu hình game"
  };
  document.getElementById("currentTabTitle").innerText = titles[tabId] || "Trang quản trị";

  // Trigger individual tab renders to load fresh data
  if (tabId === "dashboard") initDashboard();
  else if (tabId === "students") renderStudentsTable();
  else if (tabId === "teachers") renderTeachersGrid();
  else if (tabId === "ic3-levels") {
    renderQuestionsTable();
    updateLevelsQuestionCount();
  }
  else if (tabId === "tests") renderTestsGrid();
  else if (tabId === "ranking") renderRankingList();
  else if (tabId === "rewards") renderRewardsGrid();
}

// 4. Dashboard Data rendering
function initDashboard() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];

  // Update counters
  document.getElementById("stat-students-count").innerText = students.length;
  document.getElementById("stat-teachers-count").innerText = teachers.length;
  document.getElementById("stat-tests-count").innerText = tests.length;

  // Average Score
  if (scores.length > 0) {
    const sum = scores.reduce((acc, curr) => acc + curr.score, 0);
    const avg = Math.round(sum / scores.length);
    document.getElementById("stat-average-score").innerText = `${avg}/100`;
  } else {
    document.getElementById("stat-average-score").innerText = "N/A";
  }

  // Top 3 Students
  renderDashboardTopStudents(students);
  // Recent Activities
  renderDashboardRecentScores(scores, students, tests);
}

function renderDashboardTopStudents(students) {
  const sorted = [...students].sort((a, b) => b.exp - a.exp).slice(0, 3);
  const listEl = document.getElementById("top-students-list");
  listEl.innerHTML = "";

  const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
  const pokemonIcons = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  sorted.forEach((std, index) => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all";
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="font-poppins font-extrabold text-base ${medalColors[index] || 'text-slate-400'}">#${index + 1}</span>
        <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-lg relative shadow-inner">
          ${pokemonIcons[std.pokemon] || "🦊"}
          <span class="absolute -bottom-1 -right-1 bg-blue-500 text-[8px] font-bold px-1 rounded-full text-white">Lv.${std.level === 'Master IC3' ? '4' : std.level === 'Expert' ? '3' : std.level === 'Explorer' ? '2' : '1'}</span>
        </div>
        <div>
          <h4 class="font-bold text-xs text-white">${std.name}</h4>
          <p class="text-[10px] text-slate-400">Rank: <span class="font-semibold text-indigo-300">${std.rank}</span></p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-mono text-xs font-bold text-yellow-400">${std.exp} EXP</span>
        <p class="text-[9px] text-slate-500">🪙 ${std.coins}</p>
      </div>
    `;
    listEl.appendChild(div);
  });
}

function renderDashboardRecentScores(scores, students, tests) {
  const listEl = document.getElementById("dashboard-recent-scores");
  listEl.innerHTML = "";

  // Sort scores by date descending
  const sortedScores = [...scores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (sortedScores.length === 0) {
    listEl.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-center text-slate-500 text-xs">Chưa có hoạt động nộp bài nào được ghi nhận.</td></tr>`;
    return;
  }

  sortedScores.forEach(sc => {
    const student = students.find(s => s.email === sc.studentEmail) || { name: sc.studentEmail };
    const test = tests.find(t => t.id === sc.testId) || { title: sc.testId };
    
    // Format score color
    let scoreBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20">${sc.score}/100</span>`;
    if (sc.score >= 90) {
      scoreBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${sc.score}/100</span>`;
    } else if (sc.score >= 50) {
      scoreBadge = `<span class="px-2 py-1 text-xs font-bold rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">${sc.score}/100</span>`;
    }

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/30 transition-all";
    tr.innerHTML = `
      <td class="px-4 py-3.5 font-bold text-white text-xs">${student.name}</td>
      <td class="px-4 py-3.5 text-xs text-slate-300 max-w-xs truncate">${test.title}</td>
      <td class="px-4 py-3.5">${scoreBadge}</td>
      <td class="px-4 py-3.5 font-mono text-xs text-slate-400"><i class="fa-regular fa-clock mr-1 text-blue-500"></i>${sc.timeSpent}</td>
      <td class="px-4 py-3.5 text-xs text-slate-400">${sc.date}</td>
      <td class="px-4 py-3.5 text-xs text-yellow-500 font-bold">
        +${sc.expGained} EXP | +${sc.coinsGained} 🪙
      </td>
    `;
    listEl.appendChild(tr);
  });
}


// ==================== STUDENTS (CRUD) OPERATIONS ====================
function renderStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const searchQuery = document.getElementById("searchStudent").value.trim().toLowerCase();
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];

  const tableBody = document.getElementById("students-table-body");
  tableBody.innerHTML = "";

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery) || 
    s.email.toLowerCase().includes(searchQuery)
  );

  const pokemonIcons = {
    pikachu: "⚡ Pikachu",
    charmander: "🔥 Charmander",
    bulbasaur: "🌱 Bulbasaur",
    squirtle: "💧 Squirtle",
    eevee: "🦊 Eevee"
  };

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="px-5 py-8 text-center text-slate-500 text-xs">Không tìm thấy học sinh nào phù hợp.</td></tr>`;
    return;
  }

  filtered.forEach(std => {
    const cls = classes.find(c => c.id === std.classId) || { name: "Chưa phân lớp" };
    
    // Count successful test results (score >= 50)
    const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
    const passedCount = scores.filter(s => s.studentEmail === std.email && s.score >= 50).length;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/30 transition-all";
    tr.innerHTML = `
      <td class="px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 shadow-inner">
            ${std.name.charAt(0)}
          </div>
          <div>
            <span class="font-bold text-white text-xs block">${std.name}</span>
            <span class="text-[10px] text-slate-400 font-mono">${std.email}</span>
          </div>
        </div>
      </td>
      <td class="px-5 py-4 text-xs font-semibold text-slate-300">${cls.name}</td>
      <td class="px-5 py-4">
        <div class="flex flex-col">
          <span class="text-xs font-bold text-indigo-400">${std.level}</span>
          <span class="text-[9px] text-slate-500 font-semibold tracking-wider">Rank: ${std.rank}</span>
        </div>
      </td>
      <td class="px-5 py-4 text-xs text-slate-300 font-medium">${pokemonIcons[std.pokemon] || std.pokemon}</td>
      <td class="px-5 py-4">
        <div class="flex flex-col font-mono text-xs">
          <span class="text-yellow-400 font-bold">${std.exp} EXP</span>
          <span class="text-indigo-300 font-medium">🪙 ${std.coins} Coins</span>
        </div>
      </td>
      <td class="px-5 py-4 text-center font-bold text-xs text-emerald-400">${passedCount} bài đạt</td>
      <td class="px-5 py-4 text-right space-x-1.5">
        <button onclick="editStudent('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-all"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
        <button onclick="deleteStudent('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded transition-all"><i class="fa-solid fa-trash-can"></i> Xóa</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openStudentModal(isEdit = false, studentEmail = "") {
  const modal = document.getElementById("studentModal");
  const title = document.getElementById("studentModalTitle");
  const form = document.getElementById("studentForm");
  const emailInput = document.getElementById("studentEmailInput");

  // Populate classes dropdown
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const classSelect = document.getElementById("studentClassInput");
  classSelect.innerHTML = "";
  classes.forEach(c => {
    classSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  if (isEdit) {
    title.innerText = "Chỉnh sửa thông tin học sinh";
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const std = students.find(s => s.email === studentEmail);
    if (std) {
      document.getElementById("studentEditEmail").value = std.email;
      emailInput.value = std.email;
      emailInput.disabled = true; // Email is key, can't change
      document.getElementById("studentNameInput").value = std.name;
      document.getElementById("studentClassInput").value = std.classId;
      document.getElementById("studentPokemonInput").value = std.pokemon;
      document.getElementById("studentPasswordInput").required = false; // Optional password during edit
    }
  } else {
    title.innerText = "Thêm học sinh mới";
    form.reset();
    emailInput.disabled = false;
    document.getElementById("studentEditEmail").value = "";
    document.getElementById("studentPasswordInput").required = true;
  }

  modal.classList.remove("hidden");
}

function closeStudentModal() {
  document.getElementById("studentModal").classList.add("hidden");
}

function handleStudentSubmit(e) {
  e.preventDefault();
  const editEmail = document.getElementById("studentEditEmail").value;
  const email = document.getElementById("studentEmailInput").value.trim();
  const password = document.getElementById("studentPasswordInput").value;
  const name = document.getElementById("studentNameInput").value.trim();
  const classId = document.getElementById("studentClassInput").value;
  const pokemon = document.getElementById("studentPokemonInput").value;

  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];

  if (editEmail) {
    // Edit mode
    const idx = students.findIndex(s => s.email === editEmail);
    if (idx !== -1) {
      students[idx].name = name;
      students[idx].classId = classId;
      students[idx].pokemon = pokemon;
      window.saveData(window.IC3_KEYS.STUDENTS, students);

      // Optionally update name/password in users
      const uIdx = users.findIndex(u => u.email === editEmail);
      if (uIdx !== -1) {
        users[uIdx].name = name;
        if (password) users[uIdx].password = password;
        window.saveData(window.IC3_KEYS.USERS, users);
      }
    }
  } else {
    // Add mode
    if (students.some(s => s.email === email)) {
      alert("Học sinh với email này đã tồn tại!");
      return;
    }

    const newStudent = {
      email,
      name,
      classId,
      pokemon,
      level: "Beginner",
      exp: 0,
      maxExp: 500,
      coins: 0,
      rank: "Bronze",
      badges: [],
      unlockedLessons: ["lesson_l1_1"],
      unlockedZones: ["level_1"]
    };
    students.push(newStudent);
    window.saveData(window.IC3_KEYS.STUDENTS, students);

    const newUser = {
      email,
      password,
      role: "student",
      name
    };
    users.push(newUser);
    window.saveData(window.IC3_KEYS.USERS, users);
  }

  closeStudentModal();
  renderStudentsTable();
}

function editStudent(email) {
  openStudentModal(true, email);
}

function deleteStudent(email) {
  if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${email} và mọi lịch sử liên quan?`)) {
    let students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    let users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];
    let scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];

    students = students.filter(s => s.email !== email);
    users = users.filter(u => u.email !== email);
    scores = scores.filter(sc => sc.studentEmail !== email);

    window.saveData(window.IC3_KEYS.STUDENTS, students);
    window.saveData(window.IC3_KEYS.USERS, users);
    window.saveData(window.IC3_KEYS.SCORES, scores);

    renderStudentsTable();
  }
}


// ==================== TEACHERS (CRUD) OPERATIONS ====================
function renderTeachersGrid() {
  const teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const gridEl = document.getElementById("teachers-grid");
  gridEl.innerHTML = "";

  if (teachers.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Chưa có giáo viên nào trong hệ thống.</div>`;
    return;
  }

  teachers.forEach(tc => {
    // Find classes managed by this teacher
    const tcClasses = classes.filter(c => c.teacherEmail === tc.email).map(c => c.name);
    const classesStr = tcClasses.length > 0 ? tcClasses.join(", ") : "Chưa có lớp nhận";

    const div = document.createElement("div");
    div.className = "bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between";
    div.innerHTML = `
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
            ${tc.name.charAt(0)}
          </div>
          <div>
            <h4 class="font-bold text-sm text-white">${tc.name}</h4>
            <span class="text-[10px] text-slate-400 font-mono">${tc.email}</span>
          </div>
        </div>
        <div class="space-y-2 mb-6">
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">Các lớp dạy:</span>
            <span class="font-bold text-slate-200 text-right max-w-[160px] truncate">${classesStr}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">Chuyên môn IC3:</span>
            <span class="font-bold text-blue-400">Level 1, 2, 3</span>
          </div>
        </div>
      </div>
      <div class="flex justify-end pt-3 border-t border-slate-800">
        <button onclick="deleteTeacher('${tc.email}')" class="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">
          <i class="fa-solid fa-user-minus mr-1"></i> Xóa giáo viên
        </button>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

function openTeacherModal() {
  const modal = document.getElementById("teacherModal");
  document.getElementById("teacherForm").reset();
  modal.classList.remove("hidden");
}

function closeTeacherModal() {
  document.getElementById("teacherModal").classList.add("hidden");
}

function handleTeacherSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("teacherEmailInput").value.trim();
  const password = document.getElementById("teacherPasswordInput").value;
  const name = document.getElementById("teacherNameInput").value.trim();

  const teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];

  if (teachers.some(t => t.email === email)) {
    alert("Giáo viên này đã tồn tại trong hệ thống!");
    return;
  }

  // Save teacher details
  const newTeacher = {
    email,
    name,
    subjects: ["Computing Fundamentals", "Key Applications", "Living Online"],
    classes: []
  };
  teachers.push(newTeacher);
  window.saveData(window.IC3_KEYS.TEACHERS, teachers);

  // Save auth user
  const newUser = {
    email,
    password,
    role: "teacher",
    name
  };
  users.push(newUser);
  window.saveData(window.IC3_KEYS.USERS, users);

  closeTeacherModal();
  renderTeachersGrid();
}

function deleteTeacher(email) {
  if (confirm(`Bạn có chắc chắn muốn xóa giáo viên ${email}?`)) {
    let teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
    let users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];

    teachers = teachers.filter(t => t.email !== email);
    users = users.filter(u => u.email !== email);

    window.saveData(window.IC3_KEYS.TEACHERS, teachers);
    window.saveData(window.IC3_KEYS.USERS, users);

    renderTeachersGrid();
  }
}


// ==================== QUESTIONS BANK (IC3-LEVELS) OPERATIONS ====================
function updateLevelsQuestionCount() {
  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const countL1 = questions.filter(q => q.level === "level_1").length;
  const countL2 = questions.filter(q => q.level === "level_2").length;
  const countL3 = questions.filter(q => q.level === "level_3").length;

  document.getElementById("level-1-qcount").innerText = `${countL1} câu hỏi trong kho`;
  document.getElementById("level-2-qcount").innerText = `${countL2} câu hỏi trong kho`;
  document.getElementById("level-3-qcount").innerText = `${countL3} câu hỏi trong kho`;
}

function renderQuestionsTable() {
  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const tableBody = document.getElementById("questions-table-body");
  tableBody.innerHTML = "";

  const levelLabels = {
    level_1: `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/15 text-blue-400">Level 1</span>`,
    level_2: `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 text-emerald-400">Level 2</span>`,
    level_3: `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/15 text-purple-400">Level 3</span>`
  };

  const typeLabels = {
    multiple_choice: "Trắc nghiệm 4 lựa chọn",
    true_false: "Đúng / Sai",
    fill_blank: "Điền đáp án ngắn",
    drag_drop: "Kéo thả ghép cặp"
  };

  if (questions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500 text-xs">Kho câu hỏi đang trống.</td></tr>`;
    return;
  }

  questions.forEach(q => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/30 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-4 py-3 font-mono font-bold text-slate-400">${q.id}</td>
      <td class="px-4 py-3">${levelLabels[q.level] || q.level}</td>
      <td class="px-4 py-3 text-slate-300 font-semibold">${typeLabels[q.type] || q.type}</td>
      <td class="px-4 py-3 text-white font-medium max-w-sm truncate" title="${q.question}">${q.question}</td>
      <td class="px-4 py-3 text-amber-400 font-bold max-w-[120px] truncate" title="${q.answer}">${q.answer}</td>
      <td class="px-4 py-3 text-right">
        <button onclick="deleteQuestion('${q.id}')" class="px-2 py-1 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25 rounded transition-all"><i class="fa-solid fa-trash-can"></i> Xóa</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openQuestionModal() {
  const modal = document.getElementById("questionModal");
  document.getElementById("questionForm").reset();
  adjustQuestionAnswers();
  modal.classList.remove("hidden");
}

function closeQuestionModal() {
  document.getElementById("questionModal").classList.add("hidden");
}

function adjustQuestionAnswers() {
  const type = document.getElementById("questionTypeInput").value;
  const optionsGroup = document.getElementById("options-group");
  
  if (type === "multiple_choice") {
    optionsGroup.classList.remove("hidden");
    document.getElementById("optionA").required = true;
    document.getElementById("optionB").required = true;
    document.getElementById("optionC").required = true;
    document.getElementById("optionD").required = true;
    document.getElementById("questionAnswerInput").placeholder = "Nhập A, B, C hoặc D làm đáp án đúng";
  } else {
    optionsGroup.classList.add("hidden");
    document.getElementById("optionA").required = false;
    document.getElementById("optionB").required = false;
    document.getElementById("optionC").required = false;
    document.getElementById("optionD").required = false;
    
    if (type === "true_false") {
      document.getElementById("questionAnswerInput").placeholder = "Nhập Đúng hoặc Sai làm đáp án đúng";
    } else {
      document.getElementById("questionAnswerInput").placeholder = "Nhập đáp án đúng chính xác (Ví dụ: Windows)";
    }
  }
}

function handleQuestionSubmit(e) {
  e.preventDefault();
  const level = document.getElementById("questionLevelInput").value;
  const type = document.getElementById("questionTypeInput").value;
  const question = document.getElementById("questionTextInput").value.trim();
  const answer = document.getElementById("questionAnswerInput").value.trim();
  const explanation = document.getElementById("questionExplanationInput").value.trim();

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  
  // Generate safe numeric-based ID
  const newId = `q_custom_${Date.now().toString().slice(-6)}`;

  const newQuestion = {
    id: newId,
    level,
    type,
    question,
    answer,
    explanation: explanation || "Tham khảo kiến thức chuẩn IC3 để giải câu hỏi này."
  };

  if (type === "multiple_choice") {
    newQuestion.options = [
      "A. " + document.getElementById("optionA").value.trim(),
      "B. " + document.getElementById("optionB").value.trim(),
      "C. " + document.getElementById("optionC").value.trim(),
      "D. " + document.getElementById("optionD").value.trim()
    ];
  } else if (type === "true_false") {
    newQuestion.options = ["Đúng", "Sai"];
  }

  questions.push(newQuestion);
  window.saveData(window.IC3_KEYS.QUESTIONS, questions);

  closeQuestionModal();
  renderQuestionsTable();
  updateLevelsQuestionCount();
}

function deleteQuestion(id) {
  if (confirm(`Bạn muốn xóa câu hỏi ${id} khỏi kho dữ liệu?`)) {
    let questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
    questions = questions.filter(q => q.id !== id);
    window.saveData(window.IC3_KEYS.QUESTIONS, questions);
    
    renderQuestionsTable();
    updateLevelsQuestionCount();
  }
}


// ==================== TESTS SECTION ====================
function renderTestsGrid() {
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const gridEl = document.getElementById("tests-list-grid");
  gridEl.innerHTML = "";

  const levelStyles = {
    level_1: "from-blue-600 to-indigo-600 bg-blue-500/10 text-blue-400 border-blue-500/20",
    level_2: "from-emerald-600 to-teal-600 bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    level_3: "from-purple-600 to-pink-600 bg-purple-500/10 text-purple-400 border-purple-500/20"
  };

  if (tests.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Chưa có đề thi nào trong danh sách.</div>`;
    return;
  }

  tests.forEach(test => {
    const styleClass = levelStyles[test.level] || "from-slate-600 to-slate-800 bg-slate-800/50 border-slate-700/50";
    
    const div = document.createElement("div");
    div.className = "bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between";
    div.innerHTML = `
      <div>
        <div class="flex justify-between items-start gap-2 mb-3">
          <span class="px-2.5 py-1 text-[10px] font-bold rounded-full ${styleClass.split(' ').slice(2).join(' ')}">
            ${test.level === 'level_1' ? 'Level 1 Zone' : test.level === 'level_2' ? 'Level 2 Zone' : 'Level 3 Zone'}
          </span>
          <span class="font-mono text-xs text-slate-400"><i class="fa-regular fa-clock text-blue-400 mr-1"></i>${test.duration} Phút</span>
        </div>
        <h4 class="font-poppins font-bold text-sm text-white mb-3" title="${test.title}">${test.title}</h4>
        <div class="space-y-1.5 mb-6 text-xs text-slate-400">
          <div><i class="fa-solid fa-list-ol mr-1.5 text-slate-500"></i>Số câu hỏi: <span class="text-slate-200 font-bold">${test.questionCount} câu</span></div>
          <div><i class="fa-solid fa-calculator mr-1.5 text-slate-500"></i>Thang điểm: <span class="text-slate-200 font-bold">${test.scoreVal} điểm</span></div>
        </div>
      </div>
      <div class="flex justify-end pt-3 border-t border-slate-800">
        <button onclick="deleteTest('${test.id}')" class="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa đề thi
        </button>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

function openTestModal() {
  const modal = document.getElementById("testModal");
  document.getElementById("testForm").reset();
  filterQuestionsForTestSelection();
  modal.classList.remove("hidden");
}

function closeTestModal() {
  document.getElementById("testModal").classList.add("hidden");
}

function filterQuestionsForTestSelection() {
  const level = document.getElementById("testLevelInput").value;
  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  const select = document.getElementById("testQuestionsInput");
  select.innerHTML = "";

  const levelFiltered = questions.filter(q => q.level === level);
  if (levelFiltered.length === 0) {
    select.innerHTML = `<option disabled>Không có câu hỏi nào thuộc Level này trong kho!</option>`;
    return;
  }

  levelFiltered.forEach(q => {
    select.innerHTML += `<option value="${q.id}">[${q.type}] ${q.question.slice(0, 50)}...</option>`;
  });
}

function handleTestSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("testTitleInput").value.trim();
  const level = document.getElementById("testLevelInput").value;
  const duration = parseInt(document.getElementById("testDurationInput").value);
  
  const select = document.getElementById("testQuestionsInput");
  const selectedQuestions = Array.from(select.selectedOptions).map(opt => opt.value);

  if (selectedQuestions.length === 0) {
    alert("Vui lòng chọn ít nhất 1 câu hỏi cho bộ đề thi!");
    return;
  }

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const newId = `test_custom_${Date.now().toString().slice(-6)}`;

  const newTest = {
    id: newId,
    title,
    level,
    duration,
    questionCount: selectedQuestions.length,
    questions: selectedQuestions,
    scoreVal: 100,
    createdBY: JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER)).email
  };

  tests.push(newTest);
  window.saveData(window.IC3_KEYS.TESTS, tests);

  closeTestModal();
  renderTestsGrid();
}

function deleteTest(id) {
  if (confirm("Xóa đề kiểm tra này khỏi danh sách?")) {
    let tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
    tests = tests.filter(t => t.id !== id);
    window.saveData(window.IC3_KEYS.TESTS, tests);
    renderTestsGrid();
  }
}


// ==================== RANKINGS SECTION ====================
function renderRankingList() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const listEl = document.getElementById("ranking-list-full");
  listEl.innerHTML = "";

  // Sort students by EXP descending
  const sorted = [...students].sort((a, b) => b.exp - a.exp);

  const pokemonIcons = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  const badgeIcons = {
    "First Test": "🏆",
    "Fast Learner": "🔥",
    "IC3 Master": "⚡"
  };

  const rankColor = (rk) => {
    if (rk === "Diamond") return "bg-sky-500/10 border-sky-500/20 text-sky-400";
    if (rk === "Gold") return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    if (rk === "Silver") return "bg-slate-300/10 border-slate-300/20 text-slate-300";
    return "bg-amber-700/10 border-amber-700/20 text-amber-500";
  };

  sorted.forEach((std, index) => {
    let medal = `<span class="font-poppins font-extrabold text-base text-slate-500 w-8 text-center">${index + 1}</span>`;
    if (index === 0) medal = `<span class="w-8 flex justify-center text-xl animate-bounce">🥇</span>`;
    else if (index === 1) medal = `<span class="w-8 flex justify-center text-xl">🥈</span>`;
    else if (index === 2) medal = `<span class="w-8 flex justify-center text-xl">🥉</span>`;

    const badgesRendered = std.badges.map(b => `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]" title="${b}">${badgeIcons[b] || "🏅"} ${b}</span>`).join(" ");

    const div = document.createElement("div");
    div.className = "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all gap-4";
    div.innerHTML = `
      <div class="flex items-center gap-4">
        ${medal}
        <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700 shadow-inner">
          ${pokemonIcons[std.pokemon] || "🦊"}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-sm text-white">${std.name}</h4>
            <span class="px-2 py-0.5 text-[9px] font-bold rounded-full border ${rankColor(std.rank)}">${std.rank}</span>
          </div>
          <p class="text-[10px] text-slate-500 font-mono">${std.email}</p>
        </div>
      </div>

      <!-- Badges Owned -->
      <div class="flex items-center gap-1.5 flex-wrap">
        ${badgesRendered || '<span class="text-[10px] text-slate-600 italic">Chưa sở hữu huy hiệu</span>'}
      </div>

      <!-- Experience & Level Progress -->
      <div class="text-right shrink-0">
        <span class="font-mono text-xs font-bold text-yellow-400 block">${std.exp} EXP</span>
        <span class="text-[10px] text-indigo-300 font-semibold block">🪙 ${std.coins} Coins</span>
        <span class="text-[9px] text-slate-500">Cấp độ: <span class="font-bold text-slate-300">${std.level}</span></span>
      </div>
    `;
    listEl.appendChild(div);
  });
}


// ==================== REWARDS SECTION ====================
function renderRewardsGrid() {
  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const gridEl = document.getElementById("admin-rewards-grid");
  gridEl.innerHTML = "";

  if (rewards.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Cửa hàng phần quà đang trống.</div>`;
    return;
  }

  rewards.forEach(r => {
    // Check if link or symbol for illustration
    let imgRender = `<div class="text-3xl">${r.image}</div>`;
    if (r.image.startsWith("http")) {
      imgRender = `<img src="${r.image}" class="w-14 h-14 object-contain" alt="${r.name}">`;
    }

    const div = document.createElement("div");
    div.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all";
    div.innerHTML = `
      <div>
        <div class="w-full h-24 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800/80 mb-3 shadow-inner">
          ${imgRender}
        </div>
        <div class="flex justify-between items-start gap-2 mb-1.5">
          <h4 class="font-poppins font-bold text-xs text-white truncate" title="${r.name}">${r.name}</h4>
          <span class="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-yellow-500/10 text-yellow-400">🪙 ${r.cost}</span>
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed mb-4 min-h-[30px] line-clamp-2">${r.desc}</p>
      </div>
      <div class="flex justify-end pt-3 border-t border-slate-800">
        <button onclick="deleteReward('${r.id}')" class="px-2.5 py-1 text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded transition-all">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa quà
        </button>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

function openRewardModal() {
  const modal = document.getElementById("rewardModal");
  document.getElementById("rewardForm").reset();
  modal.classList.remove("hidden");
}

function closeRewardModal() {
  document.getElementById("rewardModal").classList.add("hidden");
}

function handleRewardSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("rewardNameInput").value.trim();
  const type = document.getElementById("rewardTypeInput").value;
  const cost = parseInt(document.getElementById("rewardCostInput").value);
  const image = document.getElementById("rewardImageInput").value.trim();
  const desc = document.getElementById("rewardDescInput").value.trim();

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const newId = `reward_custom_${Date.now().toString().slice(-6)}`;

  const newReward = {
    id: newId,
    name,
    type,
    cost,
    image,
    desc
  };

  rewards.push(newReward);
  window.saveData(window.IC3_KEYS.REWARDS, rewards);

  closeRewardModal();
  renderRewardsGrid();
}

function deleteReward(id) {
  if (confirm("Bạn có muốn xóa phần quà này khỏi danh sách cửa hàng đổi điểm?")) {
    let rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
    rewards = rewards.filter(r => r.id !== id);
    window.saveData(window.IC3_KEYS.REWARDS, rewards);
    renderRewardsGrid();
  }
}


// ==================== SYSTEM SETTINGS OPERATIONS ====================
function resetDatabaseToDefault() {
  if (confirm("CẢNH BÁO: Thao tác này sẽ xóa mọi dữ liệu tùy chỉnh hiện tại và khôi phục lại cấu trúc cơ sở dữ liệu mẫu gốc ban đầu của IC3 LMS. Bạn có chắc chắn muốn tiếp tục không?")) {
    localStorage.clear();
    
    alert("Khôi phục cơ sở dữ liệu thành công! Trang web sẽ tự động tải lại.");
    window.location.reload();
  }
}

function saveAdminSettings() {
  alert("Đã lưu các cài đặt cấu hình game hóa và mức thưởng EXP/Coins thành công!");
}
