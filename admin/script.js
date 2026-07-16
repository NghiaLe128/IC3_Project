/**
 * IC3 LMS - Admin Dashboard Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Wait for Cloud DB to be ready
  if (window.IC3_DB_INITIALIZED) {
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
  document.getElementById("bossForm").addEventListener("submit", handleBossSubmit);
}

// 1. Auth check
function checkAdminAuth() {
  const currentUser = JSON.parse(localStorage.getItem(window.IC3_KEYS.CURRENT_USER));
  if (!currentUser || currentUser.role !== "admin") {
    window.showToast("Bạn không có quyền truy cập trang quản trị. Vui lòng đăng nhập bằng tài khoản Admin!", 'error');
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
    bosses: "Quản lý Boss Săn Lùng",
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
  else if (tabId === "bosses") renderBossesGrid();
  else if (tabId === "settings") renderAdminSettings();
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
        <p class="text-[9px] text-slate-500"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins}</p>
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
        +${sc.expGained} EXP | +${sc.coinsGained} <i class="fa-solid fa-coins text-yellow-400"></i>
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

  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");
  const limit = config && config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
  const today = getBossHuntDayKey();

  filtered.forEach(std => {
    const cls = classes.find(c => c.id === std.classId) || { name: "Chưa phân lớp" };
    
    // Count successful test results (score >= 50)
    const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
    const passedCount = scores.filter(s => s.studentEmail === std.email && s.score >= 50).length;

    // Get current daily boss hunt count
    const huntRecord = (std.bossHunts && std.bossHunts.date === today) ? (std.bossHunts.count || 0) : 0;

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
          <span class="text-indigo-300 font-medium"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins} Coins</span>
          <span class="text-rose-400 font-semibold mt-1">👹 Săn Boss: ${huntRecord}/${limit}</span>
        </div>
      </td>
      <td class="px-5 py-4 text-center font-bold text-xs text-emerald-400">${passedCount} bài đạt</td>
      <td class="px-5 py-4 text-right space-x-1.5 space-y-1.5 sm:space-y-0">
        <button onclick="editStudent('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-all cursor-pointer"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
        <button onclick="resetBossHunts('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded transition-all cursor-pointer"><i class="fa-solid fa-arrows-rotate"></i> Reset Boss</button>
        <button onclick="deleteStudent('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded transition-all cursor-pointer"><i class="fa-solid fa-trash-can"></i> Xóa</button>
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
      window.saveData(window.IC3_KEYS.STUDENTS, students, editEmail);

      // Optionally update name/password in users
      const uIdx = users.findIndex(u => u.email === editEmail);
      if (uIdx !== -1) {
        users[uIdx].name = name;
        if (password) users[uIdx].password = password;
        window.saveData(window.IC3_KEYS.USERS, users, editEmail);
      }
    }
  } else {
    // Add mode
    if (students.some(s => s.email === email)) {
      window.showToast("Học sinh với email này đã tồn tại!", 'error');
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
    window.saveData(window.IC3_KEYS.STUDENTS, students, email);

    const newUser = {
      email,
      password,
      role: "student",
      name
    };
    users.push(newUser);
    window.saveData(window.IC3_KEYS.USERS, users, email);
  }

  closeStudentModal();
  renderStudentsTable();
}

function editStudent(email) {
  openStudentModal(true, email);
}

function deleteStudent(email) {
  window.showConfirmModal(
    "Xác nhận xóa học sinh",
    `Bạn có chắc chắn muốn xóa học sinh ${email} và mọi lịch sử liên quan?`,
    () => {
      let students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
      let users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];
      let scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];

      const deletedScores = scores.filter(sc => sc.studentEmail === email);

      students = students.filter(s => s.email !== email);
      users = users.filter(u => u.email !== email);
      scores = scores.filter(sc => sc.studentEmail !== email);

      window.IC3_CACHE[window.IC3_KEYS.STUDENTS] = students;
      window.IC3_CACHE[window.IC3_KEYS.USERS] = users;
      window.IC3_CACHE[window.IC3_KEYS.SCORES] = scores;

      window.deleteData(window.IC3_KEYS.STUDENTS, email);
      window.deleteData(window.IC3_KEYS.USERS, email);
      deletedScores.forEach(sc => {
        if (sc.id) {
          window.deleteData(window.IC3_KEYS.SCORES, sc.id);
        }
      });

      renderStudentsTable();
      window.showToast("Đã xóa học sinh thành công!", "success");
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
  if (!confirm(`Bạn có chắc muốn đặt lại (reset) số lượt săn Boss hôm nay của học sinh ${studentEmail} về 0?`)) {
    return;
  }
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const stdIdx = students.findIndex(s => s.email === studentEmail);
  if (stdIdx !== -1) {
    const today = getBossHuntDayKey();
    students[stdIdx].bossHunts = { date: today, count: 0 };
    window.saveData(window.IC3_KEYS.STUDENTS, students, studentEmail);
    window.showToast(`Đã reset lượt săn Boss hôm nay cho học sinh ${students[stdIdx].name || studentEmail}!`, 'success');
    renderStudentsTable();
  } else {
    window.showToast("Không tìm thấy thông tin tài khoản học sinh!", 'error');
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
    window.showToast("Giáo viên này đã tồn tại trong hệ thống!", 'error');
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
  window.saveData(window.IC3_KEYS.TEACHERS, teachers, email);

  // Save auth user
  const newUser = {
    email,
    password,
    role: "teacher",
    name
  };
  users.push(newUser);
  window.saveData(window.IC3_KEYS.USERS, users, email);

  closeTeacherModal();
  renderTeachersGrid();
}

function deleteTeacher(email) {
  window.showConfirmModal(
    "Xác nhận xóa giáo viên",
    `Bạn có chắc chắn muốn xóa giáo viên ${email}?`,
    () => {
      let teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
      let users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];

      teachers = teachers.filter(t => t.email !== email);
      users = users.filter(u => u.email !== email);

      window.IC3_CACHE[window.IC3_KEYS.TEACHERS] = teachers;
      window.IC3_CACHE[window.IC3_KEYS.USERS] = users;

      window.deleteData(window.IC3_KEYS.TEACHERS, email);
      window.deleteData(window.IC3_KEYS.USERS, email);

      renderTeachersGrid();
      window.showToast("Đã xóa giáo viên thành công!", "success");
    }
  );
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
  window.saveData(window.IC3_KEYS.QUESTIONS, questions, newId);

  closeQuestionModal();
  renderQuestionsTable();
  updateLevelsQuestionCount();
}

function deleteQuestion(id) {
  window.showConfirmModal(
    "Xác nhận xóa câu hỏi",
    `Bạn muốn xóa câu hỏi ${id} khỏi kho dữ liệu? (ID này cũng sẽ tự động được xóa khỏi các bộ đề liên quan)`,
    async () => {
      // 1. Update questions list local cache
      let questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
      questions = questions.filter(q => q.id !== id);
      window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] = questions;
      
      // 2. Clean up local tests cache referencing this question
      const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
      const updatedTests = [];
      for (const t of tests) {
        if (t.questions && t.questions.includes(id)) {
          t.questions = t.questions.filter(qid => qid !== id);
          t.questionCount = t.questions.length;
          updatedTests.push(t);
        }
      }

      // 3. Render and update the UI immediately
      renderQuestionsTable();
      updateLevelsQuestionCount();
      window.showToast("Đã xóa câu hỏi thành công!", "success");

      // 4. Update the DB asynchronously in background
      try {
        await window.deleteData(window.IC3_KEYS.QUESTIONS, id);
        
        // Save each modified test set back to Firestore
        for (const t of updatedTests) {
          await window.saveData(window.IC3_KEYS.TESTS, tests, t.id);
        }
      } catch (error) {
        console.error("❌ Cloud sync error during admin question deletion:", error);
        window.showToast("Lỗi đồng bộ đám mây: " + error.message, "error");
      }
    }
  );
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
    window.showToast("Vui lòng chọn ít nhất 1 câu hỏi cho bộ đề thi!", 'error');
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
  window.saveData(window.IC3_KEYS.TESTS, tests, newId);

  closeTestModal();
  renderTestsGrid();
}

function deleteTest(id) {
  window.showConfirmModal(
    "Xác nhận xóa đề thi",
    "Xóa đề kiểm tra này khỏi danh sách?",
    () => {
      let tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
      tests = tests.filter(t => t.id !== id);
      window.IC3_CACHE[window.IC3_KEYS.TESTS] = tests;
      window.deleteData(window.IC3_KEYS.TESTS, id);
      renderTestsGrid();
      window.showToast("Đã xóa đề thi thành công!", "success");
    }
  );
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
        <span class="text-[10px] text-indigo-300 font-semibold block"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins} Coins</span>
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
          <span class="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-yellow-500/10 text-yellow-400"><i class="fa-solid fa-coins text-yellow-400"></i> ${r.cost}</span>
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
  window.saveData(window.IC3_KEYS.REWARDS, rewards, newId);

  closeRewardModal();
  renderRewardsGrid();
}

function deleteReward(id) {
  window.showConfirmModal(
    "Xác nhận xóa phần quà",
    "Bạn có muốn xóa phần quà này khỏi danh sách cửa hàng đổi điểm?",
    () => {
      let rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
      rewards = rewards.filter(r => r.id !== id);
      window.IC3_CACHE[window.IC3_KEYS.REWARDS] = rewards;
      window.deleteData(window.IC3_KEYS.REWARDS, id);
      renderRewardsGrid();
      window.showToast("Đã xóa phần quà thành công!", "success");
    }
  );
}


// ==================== SYSTEM SETTINGS OPERATIONS ====================
function resetDatabaseToDefault() {
  window.showConfirmModal(
    "Cảnh báo khôi phục hệ thống",
    "CẢNH BÁO: Thao tác này sẽ xóa mọi dữ liệu tùy chỉnh hiện tại và khôi phục lại cấu trúc cơ sở dữ liệu mẫu gốc ban đầu của IC3 LMS. Bạn có chắc chắn muốn tiếp tục không?",
    () => {
      localStorage.clear();
      window.showToast("Khôi phục cơ sở dữ liệu thành công! Trang web sẽ tự động tải lại.");
      window.location.reload();
    }
  );
}

function renderAdminSettings() {
  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");

  if (config) {
    document.getElementById("settingsSchoolName").value = config.schoolName || "Trường THCS Sparks Academy";
    document.getElementById("settingsBaseExp").value = config.baseExp !== undefined ? config.baseExp : 25;
    document.getElementById("settingsBaseCoins").value = config.baseCoins !== undefined ? config.baseCoins : 10;
    document.getElementById("settingsBossHuntLimit").value = config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
    document.getElementById("settingsBossRewardExp").value = config.bossRewardExp !== undefined ? config.bossRewardExp : 300;
    document.getElementById("settingsBossRewardCoins").value = config.bossRewardCoins !== undefined ? config.bossRewardCoins : 100;
  } else {
    document.getElementById("settingsSchoolName").value = "Trường THCS Sparks Academy";
    document.getElementById("settingsBaseExp").value = 25;
    document.getElementById("settingsBaseCoins").value = 10;
    document.getElementById("settingsBossHuntLimit").value = 2;
    document.getElementById("settingsBossRewardExp").value = 300;
    document.getElementById("settingsBossRewardCoins").value = 100;
  }

  // Retrieve Google Sheets Configuration
  const sheetConfig = settings.find(s => s.id === "google_sheets");
  if (sheetConfig) {
    document.getElementById("adminSpreadsheetId").value = sheetConfig.spreadsheetId || "";
    document.getElementById("adminStudentSheetName").value = sheetConfig.studentSheetName || "Tổng quát";
    document.getElementById("adminScoresSheetName").value = sheetConfig.scoresSheetName || "Tổng quát";
  } else {
    document.getElementById("adminSpreadsheetId").value = "";
    document.getElementById("adminStudentSheetName").value = "Tổng quát";
    document.getElementById("adminScoresSheetName").value = "Tổng quát";
  }
}

function saveAdminSettings() {
  const schoolName = document.getElementById("settingsSchoolName").value;
  const baseExp = parseInt(document.getElementById("settingsBaseExp").value) || 25;
  const baseCoins = parseInt(document.getElementById("settingsBaseCoins").value) || 10;
  const bossHuntLimit = parseInt(document.getElementById("settingsBossHuntLimit").value) || 2;
  const bossRewardExp = parseInt(document.getElementById("settingsBossRewardExp").value) || 300;
  const bossRewardCoins = parseInt(document.getElementById("settingsBossRewardCoins").value) || 100;

  const configObj = {
    id: "game_config",
    schoolName: schoolName,
    baseExp: baseExp,
    baseCoins: baseCoins,
    bossHuntLimit: bossHuntLimit,
    bossRewardExp: bossRewardExp,
    bossRewardCoins: bossRewardCoins
  };

  // Update in cache
  let settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const idx = settings.findIndex(s => s.id === "game_config");
  if (idx !== -1) {
    settings[idx] = configObj;
  } else {
    settings.push(configObj);
  }

  // Save Google Sheets parameters if present
  const spreadsheetId = document.getElementById("adminSpreadsheetId").value.trim();
  const studentSheetName = document.getElementById("adminStudentSheetName").value.trim() || "Tổng quát";
  const scoresSheetName = document.getElementById("adminScoresSheetName").value.trim() || "Tổng quát";

  const sheetObj = {
    id: "google_sheets",
    spreadsheetId,
    studentSheetName,
    scoresSheetName,
    configuredBy: "admin@gmail.com"
  };

  const sIdx = settings.findIndex(s => s.id === "google_sheets");
  if (sIdx !== -1) {
    settings[sIdx] = sheetObj;
  } else {
    settings.push(sheetObj);
  }

  window.saveData(window.IC3_KEYS.SETTINGS, settings, "google_sheets");
  window.showToast("Đã lưu các cấu hình game hóa, mức thưởng EXP/Coins và thiết lập liên kết Google Sheets thành công!");
}

// ==================== BOSS MANAGEMENT OPERATIONS ====================
function renderBossesGrid() {
  const container = document.getElementById("admin-bosses-grid");
  if (!container) return;

  container.innerHTML = "";
  let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];

  if (bosses.length === 0) {
    // Seed default bosses
    const defaultBosses = [
      { id: "boss_1", name: "Thần Cây Dữ Liệu 🌳", hp: 500, maxHp: 500, avatar: "🌳", desc: "Đối thủ tin học căn bản đầu tiên thách thức kỹ năng cấu trúc thư mục của bạn." },
      { id: "boss_2", name: "Người Máy Siêu Việt 🤖", hp: 800, maxHp: 800, avatar: "🤖", desc: "Thách thức các ứng dụng văn phòng Microsoft Word & Excel đỉnh cao." },
      { id: "boss_3", name: "Rồng Hỏa Ngục An Ninh 👾", hp: 1200, maxHp: 1200, avatar: "👾", desc: "Ngự trị vùng đất bảo mật thông tin và an toàn không gian mạng." },
      { id: "boss_4", name: "Phù Thủy Thuật Toán 🔮", hp: 1500, maxHp: 1500, avatar: "🔮", desc: "Sở hữu ma thuật giải thuật toán tin học đỉnh cao." }
    ];
    window.saveData(window.IC3_KEYS.BOSSES, defaultBosses);
    window.IC3_CACHE[window.IC3_KEYS.BOSSES] = defaultBosses;
    bosses = defaultBosses;
  }

  bosses.forEach(boss => {
    const card = document.createElement("div");
    card.className = "bg-slate-950 border border-indigo-950/50 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg hover:border-red-500/30 transition-all";
    
    // Check if avatar is an emoji or link
    const isEmoji = !boss.avatar.startsWith("http");
    const avatarHtml = isEmoji 
      ? `<span class="text-5xl select-none">${boss.avatar}</span>`
      : `<img src="${boss.avatar}" alt="${boss.name}" class="w-16 h-16 rounded-xl object-contain shadow-md" referrerPolicy="no-referrer" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=fallback'">`;

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          ${avatarHtml}
        </div>
        <div class="min-w-0">
          <h4 class="font-poppins font-bold text-sm text-white truncate">${boss.name}</h4>
          <span class="inline-block px-2 py-0.5 mt-1 bg-red-950/50 border border-red-900/30 text-red-400 text-[10px] font-bold rounded-full">
            HP: ${boss.hp}/${boss.maxHp}
          </span>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 leading-relaxed min-h-[3rem]">${boss.desc || "Không có mô tả."}</p>
      <div class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-900">
        <button onclick="openBossModal('${boss.id}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1">
          <i class="fa-solid fa-pen-to-square"></i> Sửa
        </button>
        <button onclick="deleteBoss('${boss.id}')" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold border border-red-500/20 rounded-lg transition-all flex items-center justify-center gap-1">
          <i class="fa-solid fa-trash"></i> Xóa
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openBossModal(id = null) {
  const modal = document.getElementById("bossModal");
  if (!modal) return;

  const form = document.getElementById("bossForm");
  form.reset();

  const titleEl = document.getElementById("bossModalTitle");

  if (id) {
    // Edit mode
    titleEl.innerText = "Cập nhật thông tin Boss";
    const bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];
    const boss = bosses.find(b => b.id === id);
    if (boss) {
      document.getElementById("bossIdInput").value = boss.id;
      document.getElementById("bossNameInput").value = boss.name;
      document.getElementById("bossMaxHpInput").value = boss.maxHp;
      document.getElementById("bossHpInput").value = boss.hp;
      document.getElementById("bossAvatarInput").value = boss.avatar;
      document.getElementById("bossDescInput").value = boss.desc || "";
    }
  } else {
    // Add mode
    titleEl.innerText = "Thêm Boss Săn Lùng mới";
    document.getElementById("bossIdInput").value = "";
  }

  modal.classList.remove("hidden");
}

function closeBossModal() {
  const modal = document.getElementById("bossModal");
  if (modal) modal.classList.add("hidden");
}

function handleBossSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("bossIdInput").value;
  const name = document.getElementById("bossNameInput").value;
  const maxHp = parseInt(document.getElementById("bossMaxHpInput").value) || 500;
  const hp = parseInt(document.getElementById("bossHpInput").value) || maxHp;
  const avatar = document.getElementById("bossAvatarInput").value;
  const desc = document.getElementById("bossDescInput").value;

  let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];

  if (id) {
    // Edit
    const bIdx = bosses.findIndex(b => b.id === id);
    if (bIdx !== -1) {
      bosses[bIdx] = { id, name, maxHp, hp, avatar, desc };
      window.saveData(window.IC3_KEYS.BOSSES, bosses, id);
    }
  } else {
    // Add
    const newId = `boss_${Date.now()}`;
    bosses.push({ id: newId, name, maxHp, hp, avatar, desc });
    window.saveData(window.IC3_KEYS.BOSSES, bosses, newId);
  }

  closeBossModal();
  renderBossesGrid();
  window.showToast("Cập nhật thông tin Boss thành công!", "success");
}

function deleteBoss(id) {
  window.showConfirmModal(
    "Xác nhận xóa Boss",
    "Bạn có chắc chắn muốn xóa Boss này không?",
    () => {
      let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];
      bosses = bosses.filter(b => b.id !== id);
      window.IC3_CACHE[window.IC3_KEYS.BOSSES] = bosses;
      window.deleteData(window.IC3_KEYS.BOSSES, id);
      renderBossesGrid();
      window.showToast("Đã xóa Boss thành công!", "success");
    }
  );
}

// Custom Confirm Modal Logic & Expose All Handlers Globally
let deleteCallback = null;

window.showConfirmModal = function(title, message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    document.getElementById("confirmModalTitle").innerText = title;
    document.getElementById("confirmModalMessage").innerText = message;
    deleteCallback = onConfirm;
    modal.classList.remove("hidden");
  }
};

window.closeConfirmModal = function() {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  deleteCallback = null;
};

window.handleConfirmAction = function() {
  if (deleteCallback) {
    deleteCallback();
  }
  window.closeConfirmModal();
};

// Bind all Top-Level functions to global window object
window.switchTab = switchTab;
window.logoutAdmin = logoutAdmin;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.editStudent = editStudent;
window.resetBossHunts = resetBossHunts;
window.deleteStudent = deleteStudent;
window.openTeacherModal = openTeacherModal;
window.closeTeacherModal = closeTeacherModal;
window.deleteTeacher = deleteTeacher;
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.deleteQuestion = deleteQuestion;
window.openTestModal = openTestModal;
window.closeTestModal = closeTestModal;
window.deleteTest = deleteTest;
window.openRewardModal = openRewardModal;
window.closeRewardModal = closeRewardModal;
window.deleteReward = deleteReward;
window.openBossModal = openBossModal;
window.closeBossModal = closeBossModal;
window.deleteBoss = deleteBoss;
window.resetDatabaseToDefault = resetDatabaseToDefault;
window.saveAdminSettings = saveAdminSettings;

function downloadSheetTemplate() {
  const bom = "\uFEFF";
  const headers = "STT,TRƯỜNG,HỌ,TÊN,LỚP,MẬT KHẨU,XL,Điểm danh,OT 1 (45),GHI CHÚ\n";
  const row1 = "1,THCS A,Nguyễn Lư Gia,Hân,7.1,123456,,,,,,\n";
  const row2 = "2,THCS A,Nguyễn Tùng,Lâm,7.2,123456,,,,,,\n";
  const row3 = "3,THCS A,Lê Phước Đan,Sa,7.2,123456,,,,,,\n";
  const csvContent = bom + headers + row1 + row2 + row3;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "Mau_Quan_Ly_Hoc_Sinh_Diem.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.showToast("Đã tải xuống file mẫu thành công!");
}
window.downloadSheetTemplate = downloadSheetTemplate;

// EXPOSE TO WINDOW FOR HTML EVENT HANDLERS
Object.assign(window, {
  adjustQuestionAnswers, checkAdminAuth, closeBossModal, closeQuestionModal, closeRewardModal, closeStudentModal, closeTeacherModal, closeTestModal, deleteBoss, deleteQuestion, deleteReward, deleteStudent, deleteTeacher, deleteTest, downloadSheetTemplate, editStudent, filterQuestionsForTestSelection, getBossHuntDayKey, handleBossSubmit, handleQuestionSubmit, handleRewardSubmit, handleStudentSubmit, handleTeacherSubmit, handleTestSubmit, initClock, initDashboard, logoutAdmin, openBossModal, openQuestionModal, openRewardModal, openStudentModal, openTeacherModal, openTestModal, renderAdminSettings, renderBossesGrid, renderDashboardRecentScores, renderDashboardTopStudents, renderQuestionsTable, renderRankingList, renderRewardsGrid, renderStudentsTable, renderTeachersGrid, renderTestsGrid, resetDatabaseToDefault, saveAdminSettings, startAdminApp, switchTab, updateLevelsQuestionCount
});

// ==========================================
// POKEMON EVOLUTIONS MANAGEMENT
// ==========================================

let currentAdminEvoMap = {};

function initPokemonEvoAdmin() {
  if (window.evoMap) {
    currentAdminEvoMap = JSON.parse(JSON.stringify(window.evoMap));
  }
  renderPokemonEvoList();
}

function renderPokemonEvoList() {
  const container = document.getElementById("pokemon-evo-list");
  if (!container) return;
  container.innerHTML = "";
  
  const bases = Object.keys(currentAdminEvoMap);
  if (bases.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-sm">Chưa có dữ liệu tiến hóa. Hãy thêm mới.</p>';
    return;
  }
  
  bases.forEach(base => {
    const forms = currentAdminEvoMap[base].join(", ");
    const row = document.createElement("div");
    row.className = "flex flex-col gap-2 p-4 bg-slate-950 border border-slate-800 rounded-xl relative";
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-16 shrink-0 text-center">
            <img src="https://projectpokemon.org/images/normal-sprite/${base}.gif" class="w-12 h-12 object-contain mx-auto" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=default'">
            <p class="text-[10px] font-bold text-slate-400 mt-1 uppercase">${base}</p>
        </div>
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 mb-1">Base Pokemon (ID)</label>
          <input type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white mb-2" value="${base}" onchange="updateEvoBase('${base}', this.value)" />
          
          <label class="block text-xs font-semibold text-slate-500 mb-1">Dạng tiến hóa (cách nhau bởi dấu phẩy)</label>
          <input type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" value="${forms}" onchange="updateEvoForms('${base}', this.value)" />
        </div>
        <button onclick="removePokemonEvoRow('${base}')" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="flex gap-2 mt-2 pl-20 overflow-x-auto pb-2">
        ${currentAdminEvoMap[base].map(f => `<div class="shrink-0 text-center"><img src="https://projectpokemon.org/images/normal-sprite/${f}.gif" class="h-10 object-contain mx-auto" title="${f}" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=default'"><span class="text-[9px] text-slate-500 mt-1 block">${f}</span></div>`).join('')}
      </div>
    `;
    container.appendChild(row);
  });
}

window.updateEvoBase = function(oldBase, newBase) {
  if (!newBase || oldBase === newBase) return;
  currentAdminEvoMap[newBase] = currentAdminEvoMap[oldBase];
  delete currentAdminEvoMap[oldBase];
  renderPokemonEvoList();
};

window.updateEvoForms = function(base, formsStr) {
  currentAdminEvoMap[base] = formsStr.split(',').map(s => s.trim()).filter(s => s);
  renderPokemonEvoList();
};

window.addPokemonEvoRow = function() {
  const newBase = "new_pokemon_" + Date.now().toString().slice(-4);
  currentAdminEvoMap[newBase] = [newBase];
  renderPokemonEvoList();
};

window.removePokemonEvoRow = function(base) {
  if (confirm(`Bạn có chắc muốn xóa dữ liệu tiến hóa của ${base}?`)) {
    delete currentAdminEvoMap[base];
    renderPokemonEvoList();
  }
};

window.savePokemonEvolutions = async function() {
  try {
    const colRef = window.fStore.collection(window.db, "pokemonEvolutions");
    const snapshot = await window.fStore.getDocs(colRef);
    
    // First, delete forms that were removed
    for (const docSnap of snapshot.docs) {
      if (!currentAdminEvoMap[docSnap.id]) {
        await window.fStore.deleteDoc(docSnap.ref);
      }
    }
    
    // Upsert all current maps
    for (const [base, forms] of Object.entries(currentAdminEvoMap)) {
      const docRef = window.fStore.doc(window.db, "pokemonEvolutions", base);
      const images = forms.map(f => `https://projectpokemon.org/images/normal-sprite/${f}.gif`);
      await window.fStore.setDoc(docRef, {
        id: base,
        basePokemon: base,
        forms: forms,
        images: images
      });
    }
    
    window.evoMap = JSON.parse(JSON.stringify(currentAdminEvoMap));
    alert("Lưu dữ liệu tiến hóa thành công!");
  } catch (e) {
    console.error(e);
    alert("Có lỗi khi lưu tiến hóa: " + e.message);
  }
};

// Hook into tab switching
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
  if (typeof originalSwitchTab === 'function') {
    originalSwitchTab(tabId);
  } else {
    // Fallback if needed, though admin script already has it
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'bg-slate-800', 'text-white'));
    document.querySelectorAll('.nav-btn i').forEach(el => el.classList.remove('text-blue-400'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    const targetBtn = document.getElementById('nav-' + tabId);
    if (targetBtn) {
      targetBtn.classList.add('active', 'bg-slate-800', 'text-white');
      const icon = targetBtn.querySelector('i');
      if (icon && !icon.classList.contains('text-red-500') && !icon.classList.contains('text-yellow-400')) {
          icon.classList.add('text-blue-400');
      }
    }
  }
  
  if (tabId === 'pokemon-evo') {
    initPokemonEvoAdmin();
  }
};

