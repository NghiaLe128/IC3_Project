/**
 * IC3 LMS - Admin Dashboard Logic
 */

// ==================== PAGINATION UTILS ====================
window.adminPagination = {
  students: 1,
  teachers: 1,
  questions: 1,
  tests: 1,
  ranking: 1,
  rewards: 1,
  bosses: 1,
  pokemons: 1
};
const ITEMS_PER_PAGE = 8;

function getAdminUser() {
  try {
    const key = (window.IC3_KEYS && window.IC3_KEYS.CURRENT_USER) ? window.IC3_KEYS.CURRENT_USER : "ic3_current_user";
    const userStr = localStorage.getItem(key);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing admin user:", e);
    return null;
  }
}

function renderPagination(totalItems, currentPage, containerId, sectionKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  html += `<button onclick="changePage('${sectionKey}', ${currentPage - 1})" class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="changePage('${sectionKey}', ${i})" class="px-3 py-1 rounded ${i === currentPage ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="px-2 text-slate-500">...</span>`;
    }
  }

  html += `<button onclick="changePage('${sectionKey}', ${currentPage + 1})" class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
  
  container.innerHTML = html;
}

window.changePage = function(sectionKey, page) {
  window.adminPagination[sectionKey] = page;
  switch (sectionKey) {
    case 'students': renderStudentsTable(); break;
    case 'teachers': renderTeachersGrid(); break;
    case 'questions': renderQuestionsTable(); break;
    case 'tests': renderTestsGrid(); break;
    case 'ranking': renderRankingList(); break;
    case 'rewards': renderRewardsGrid(); break;
    case 'bosses': renderBossesGrid(); break;
    case 'pokemons': renderPokemonEvoList(); break;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Wait for Cloud DB to be ready
  if (window.IC3_DB_INITIALIZED) {
    startAdminApp();
  } else {
    window.addEventListener('ic3-db-ready', startAdminApp);
  }
});

function startAdminApp() {
  if (!checkAdminAuth()) return;
  initClock();
  initDashboard();

  // Add event listeners to forms
  document.getElementById("studentForm").addEventListener("submit", handleStudentSubmit);
  document.getElementById("teacherForm").addEventListener("submit", handleTeacherSubmit);
  document.getElementById("questionForm").addEventListener("submit", handleQuestionSubmit);
  document.getElementById("testForm").addEventListener("submit", handleTestSubmit);
  document.getElementById("rewardForm").addEventListener("submit", handleRewardSubmit);
  document.getElementById("bossForm").addEventListener("submit", handleBossSubmit);

  // Initialize Backup & Restore
  initBackupRestoreEvents();
}

// 1. Auth check
function checkAdminAuth() {
  let currentUser = getAdminUser();
  if (!currentUser || currentUser.role !== "admin") {
    window.showToast("Bạn không có quyền truy cập trang quản trị. Vui lòng đăng nhập bằng tài khoản Admin!", 'error');
    window.location.href = "../index.html";
    return false;
  }
  // Display name
  document.getElementById("adminName").innerText = currentUser.name || "Quản trị viên";
  document.getElementById("adminEmail").innerText = currentUser.email;
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

// Logout
async function logoutAdmin() {
  const result = await window.Swal.fire({
    title: 'Đăng xuất',
    text: "Bạn có muốn đăng xuất khỏi tất cả các thiết bị đang đăng nhập không?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Đăng xuất tất cả',
    cancelButtonText: 'Chỉ máy này'
  });

  if (result.isConfirmed) {
    const userStr = localStorage.getItem(window.IC3_KEYS.CURRENT_USER);
    if (userStr) {
      const user = JSON.parse(userStr);
      await window.forceLogoutUser(user.email);
    }
    window.location.href = "/index.html";
  } else if (result.dismiss === window.Swal.DismissReason.cancel) {
    window.logoutUser();
  }
}

async function adminForceLogoutEveryone() {
  const result = await window.Swal.fire({
    title: 'ĐĂNG XUẤT TOÀN HỆ THỐNG',
    text: `BẠN CÓ CHẮC CHẮN muốn đăng xuất TẤT CẢ người dùng (bao gồm Giáo viên và Học sinh) trên TOÀN BỘ các thiết bị? Hành động này không thể hoàn tác!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Xác nhận ĐĂNG XUẤT TẤT CẢ',
    cancelButtonText: 'Hủy lệnh'
  });

  if (result.isConfirmed) {
    const res = await window.forceLogoutEveryone();
    if (res.success) {
      window.Swal.fire('Thành công', 'Đã gửi lệnh đăng xuất đến toàn bộ thiết bị trong hệ thống!', 'success');
    } else {
      window.Swal.fire('Lỗi', res.message, 'error');
    }
  }
}

async function adminForceLogoutUser(email) {
  const result = await window.Swal.fire({
    title: 'Xác nhận đăng xuất',
    text: `Bạn có chắc chắn muốn đăng xuất tài khoản ${email} trên tất cả các thiết bị?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Đăng xuất ngay',
    cancelButtonText: 'Hủy'
  });

  if (result.isConfirmed) {
    const res = await window.forceLogoutUser(email);
    if (res.success) {
      window.showToast("Đã gửi lệnh đăng xuất đến tất cả thiết bị của người dùng này!");
    } else {
      window.showToast("Lỗi: " + res.message, "error");
    }
  }
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
    "lock-tabs": "Khóa / Mở Tab tính năng học sinh theo lớp",
    settings: "Cài đặt & Cấu hình game",
    "backup-restore": "Sao lưu & Khôi phục dữ liệu hệ thống"
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
  else if (tabId === "lock-tabs") {
    populateAdminLockTabsClasses();
    renderAdminLockTabsGrid();
  }
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
          ${window.pokemonAvatars[std.pokemon] || "🦊"}
          <span class="absolute -bottom-1 -right-1 bg-blue-500 text-[8px] font-bold px-1 rounded-full text-white">Lv.${std.level === 'Master IC3' ? '4' : std.level === 'Expert' ? '3' : std.level === 'Explorer' ? '2' : '1'}</span>
        </div>
        <div>
          <h4 class="font-bold text-xs text-white">${std.name}</h4>
          <p class="text-[10px] text-slate-400">Rank: <span class="font-semibold text-indigo-300">${std.rank}</span></p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-mono text-xs font-bold text-yellow-400">${std.exp} EXP</span>
        <p class="text-[9px] text-slate-500"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins || 0}</p>
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

  const filteredAll = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery) || 
    s.email.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.students || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'students-pagination', 'students');

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
      <td class="px-5 py-4 text-xs text-slate-300 font-medium">${window.pokemonAvatars[std.pokemon] || "🦊"} ${window.pokemonNames[std.pokemon] || std.pokemon || "Chưa có"}</td>
      <td class="px-5 py-4">
        <div class="flex flex-col font-mono text-xs">
          <span class="text-yellow-400 font-bold">${std.exp} EXP</span>
          <span class="text-indigo-300 font-medium"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins || 0} Coins</span>
          <span class="text-rose-400 font-semibold mt-1">👹 Săn Boss: ${huntRecord}/${limit}</span>
        </div>
      </td>
      <td class="px-5 py-4 text-center font-bold text-xs text-emerald-400">${passedCount} bài đạt</td>
      <td class="px-5 py-4 text-right space-x-1.5 space-y-1.5 sm:space-y-0">
        <button onclick="adminForceLogoutUser('${std.email}')" class="px-2 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded transition-all cursor-pointer" title="Đăng xuất tất cả thiết bị"><i class="fa-solid fa-right-from-bracket"></i></button>
        <button onclick="editStudent('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-all cursor-pointer"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
        <button onclick="resetBossHunts('${std.email}')" class="px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded transition-all cursor-pointer"><i class="fa-solid fa-arrows-rotate"></i> Reset Lượt</button>
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
      unlockedZones: ["level_1"],
      isFirstLogin: true
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
  Swal.fire({
    title: 'XÁC NHẬN RESET',
    text: `Bạn có chắc muốn đặt lại (reset) số lượt săn Boss hôm nay của học sinh ${studentEmail} về 0?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Đồng ý',
    cancelButtonText: 'Hủy',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b'
  }).then((result) => {
    if (result.isConfirmed) {
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
  });
}


// ==================== TEACHERS (CRUD) OPERATIONS ====================
function renderTeachersGrid() {
  const teachers = window.IC3_CACHE[window.IC3_KEYS.TEACHERS] || [];
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const gridEl = document.getElementById("teachers-grid");
  gridEl.innerHTML = "";

  const paginationEl = document.getElementById("teachers-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

  if (teachers.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Chưa có giáo viên nào trong hệ thống.</div>`;
    return;
  }

  const currentPage = window.adminPagination.teachers || 1;
  const filtered = teachers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(teachers.length, currentPage, 'teachers-pagination', 'teachers');

  filtered.forEach(tc => {
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
      <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
        <button onclick="adminForceLogoutUser('${tc.email}')" class="px-3 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all" title="Đăng xuất tất cả thiết bị">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
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

  const paginationEl = document.getElementById("questions-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

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

  const blockLabels = {
    block_3: "Khối 3",
    block_4: "Khối 4",
    block_5: "Khối 5",
    block_6: "Khối 6",
    block_7: "Khối 7",
    block_8: "Khối 8"
  };

  const filterBlock = document.getElementById("filterQuestionBlock") ? document.getElementById("filterQuestionBlock").value : "all";
  let questionsToRender = questions;
  if (filterBlock !== "all") {
    questionsToRender = questions.filter(q => q.blockId === filterBlock);
  }

  if (questionsToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500 text-xs">Kho câu hỏi đang trống hoặc không khớp bộ lọc.</td></tr>`;
    return;
  }

  const currentPage = window.adminPagination.questions || 1;
  const filtered = questionsToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(questionsToRender.length, currentPage, 'questions-pagination', 'questions');

  filtered.forEach(q => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/30 transition-all text-xs";
    const blockText = q.blockId && blockLabels[q.blockId] ? blockLabels[q.blockId] : "Tất cả";
    const blockBadge = `<span class="ml-1 text-[10px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">${blockText}</span>`;

    tr.innerHTML = `
      <td class="px-4 py-3 font-mono font-bold text-slate-400">${q.id}</td>
      <td class="px-4 py-3 flex items-center gap-1">${levelLabels[q.level] || q.level} ${blockBadge}</td>
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
  const blockId = document.getElementById("questionBlockInput") ? document.getElementById("questionBlockInput").value : "all";

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  
  // Generate safe numeric-based ID
  const newId = `q_custom_${Date.now().toString().slice(-6)}`;

  const newQuestion = {
    id: newId,
    level,
    type,
    question,
    answer,
    blockId,
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

  const paginationEl = document.getElementById("tests-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

  const levelStyles = {
    level_1: "from-blue-600 to-indigo-600 bg-blue-500/10 text-blue-400 border-blue-500/20",
    level_2: "from-emerald-600 to-teal-600 bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    level_3: "from-purple-600 to-pink-600 bg-purple-500/10 text-purple-400 border-purple-500/20"
  };

  const blockLabels = {
    block_3: "Khối 3",
    block_4: "Khối 4",
    block_5: "Khối 5",
    block_6: "Khối 6",
    block_7: "Khối 7",
    block_8: "Khối 8"
  };

  const filterBlock = document.getElementById("filterTestBlock") ? document.getElementById("filterTestBlock").value : "all";
  let testsToRender = tests;
  if (filterBlock !== "all") {
    testsToRender = tests.filter(t => t.blockId === filterBlock);
  }

  if (testsToRender.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Chưa có đề thi nào khớp bộ lọc.</div>`;
    return;
  }

  const currentPage = window.adminPagination.tests || 1;
  const filtered = testsToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(testsToRender.length, currentPage, 'tests-pagination', 'tests');

  filtered.forEach(test => {
    const styleClass = levelStyles[test.level] || "from-slate-600 to-slate-800 bg-slate-800/50 border-slate-700/50";
    const blockText = test.blockId && blockLabels[test.blockId] ? blockLabels[test.blockId] : "Tất cả";
    const blockBadge = `<span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">${blockText}</span>`;

    const div = document.createElement("div");
    div.className = "bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between";
    div.innerHTML = `
      <div>
        <div class="flex justify-between items-center gap-2 mb-3">
          <span class="px-2.5 py-1 text-[10px] font-bold rounded-full ${styleClass.split(' ').slice(2).join(' ')}">
            ${test.level === 'level_1' ? 'Level 1 Zone' : test.level === 'level_2' ? 'Level 2 Zone' : 'Level 3 Zone'}
          </span>
          ${blockBadge}
        </div>
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-poppins font-bold text-sm text-white truncate" title="${test.title}">${test.title}</h4>
          <span class="font-mono text-xs text-slate-400 shrink-0"><i class="fa-regular fa-clock text-blue-400 mr-1"></i>${test.duration} Phút</span>
        </div>
        <div class="space-y-1.5 mb-6 text-xs text-slate-400">
          <div><i class="fa-solid fa-list-ol mr-1.5 text-slate-500"></i>Số câu hỏi: <span class="text-slate-200 font-bold">${test.questionCount || (test.questions ? test.questions.length : 0)} câu</span></div>
          <div><i class="fa-solid fa-calculator mr-1.5 text-slate-500"></i>Thang điểm: <span class="text-slate-200 font-bold">${test.scoreVal || 100} điểm</span></div>
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
  const blockId = document.getElementById("testBlockInput") ? document.getElementById("testBlockInput").value : "all";
  
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
    blockId,
    questionCount: selectedQuestions.length,
    questions: selectedQuestions,
    scoreVal: 100,
    createdBY: (getAdminUser() || {}).email || "admin@gmail.com"
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

  const paginationEl = document.getElementById("ranking-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

  // Filter students by search ranking
  const searchQuery = document.getElementById("searchRanking") ? document.getElementById("searchRanking").value.trim().toLowerCase() : "";
  let filteredStudents = [...students];
  if (searchQuery) {
    filteredStudents = filteredStudents.filter(std => 
      (std.name || "").toLowerCase().includes(searchQuery) || 
      (std.email || "").toLowerCase().includes(searchQuery)
    );
  }

  // Sort students by EXP descending
  const sortedAll = filteredStudents.sort((a, b) => b.exp - a.exp);

  if (sortedAll.length === 0) {
    listEl.innerHTML = `<div class="py-8 text-center text-slate-500 text-sm">Chưa có học sinh nào phù hợp tìm kiếm.</div>`;
    return;
  }

  const currentPage = window.adminPagination.ranking || 1;
  const filtered = sortedAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(sortedAll.length, currentPage, 'ranking-pagination', 'ranking');

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

  filtered.forEach((std, i) => {
    const index = (currentPage - 1) * ITEMS_PER_PAGE + i;
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
          ${window.pokemonAvatars[std.pokemon] || "🦊"}
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
        <span class="text-[10px] text-indigo-300 font-semibold block"><i class="fa-solid fa-coins text-yellow-400"></i> ${std.coins || 0} Coins</span>
        <span class="text-[9px] text-slate-500">Cấp độ: <span class="font-bold text-slate-300">${std.level}</span></span>
      </div>
    `;
    listEl.appendChild(div);
  });
}


// ==================== REWARDS SECTION ====================
window.currentAdminRewardTab = "all";

window.switchAdminRewardTab = function(tabId) {
  window.currentAdminRewardTab = tabId;
  const buttons = document.querySelectorAll("#admin-reward-tabs-container button");
  buttons.forEach(btn => {
    if (btn.id === `tab-reward-btn-${tabId}`) {
      btn.classList.remove("bg-slate-800", "text-slate-300");
      btn.classList.add("bg-blue-600", "text-white");
    } else {
      btn.classList.remove("bg-blue-600", "text-white");
      btn.classList.add("bg-slate-800", "text-slate-300");
    }
  });
  window.adminPagination.rewards = 1;
  renderRewardsGrid();
};

window.toggleRewardLock = async function(id) {
  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const r = rewards.find(item => item.id === id);
  if (r) {
    r.isLocked = !r.isLocked;
    await window.saveData(window.IC3_KEYS.REWARDS, rewards, id);
    window.showToast(r.isLocked ? "Đã khóa phần quà thành công!" : "Đã mở khóa phần quà thành công!", "success");
    renderRewardsGrid();
  }
};

function renderRewardsGrid() {
  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const gridEl = document.getElementById("admin-rewards-grid");
  gridEl.innerHTML = "";

  const paginationEl = document.getElementById("rewards-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

  const selectedTab = window.currentAdminRewardTab || "all";
  let rewardsToRender = rewards;
  if (selectedTab !== "all") {
    rewardsToRender = rewards.filter(r => r.type === selectedTab);
  }

  if (rewardsToRender.length === 0) {
    gridEl.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-sm">Cửa hàng phần quà đang trống cho danh mục này.</div>`;
    return;
  }

  const currentPage = window.adminPagination.rewards || 1;
  const filtered = rewardsToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(rewardsToRender.length, currentPage, 'rewards-pagination', 'rewards');

  filtered.forEach(r => {
    // Check if link or symbol for illustration
    let imgRender = `<div class="text-3xl">${r.image}</div>`;
    if (r.image.startsWith("http")) {
      imgRender = `<img src="${r.image}" class="w-14 h-14 object-contain" alt="${r.name}">`;
    }

    const lockBadge = r.isLocked ? `<span class="absolute top-2 right-2 bg-red-600/85 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md"><i class="fa-solid fa-lock text-[8px]"></i> Đã Khóa</span>` : '';
    const lockBtnClass = r.isLocked ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20";
    const lockBtnText = r.isLocked ? `<i class="fa-solid fa-lock-open mr-1"></i> Mở khóa` : `<i class="fa-solid fa-lock mr-1"></i> Khóa`;

    const div = document.createElement("div");
    div.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all";
    div.innerHTML = `
      <div>
        <div class="w-full h-24 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800/80 mb-3 shadow-inner relative">
          ${lockBadge}
          ${imgRender}
        </div>
        <div class="flex justify-between items-start gap-2 mb-1.5">
          <h4 class="font-poppins font-bold text-xs text-white truncate" title="${r.name}">${r.name}</h4>
          <span class="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-yellow-500/10 text-yellow-400"><i class="fa-solid fa-coins text-yellow-400"></i> ${r.cost}</span>
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed mb-4 min-h-[30px] line-clamp-2">${r.desc}</p>
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
        <button onclick="window.toggleRewardLock('${r.id}')" class="px-2.5 py-1 text-[10px] font-bold rounded transition-all ${lockBtnClass}">
          ${lockBtnText}
        </button>
        <button onclick="openRewardModal('${r.id}')" class="px-2.5 py-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-all">
          <i class="fa-solid fa-pen-to-square mr-1"></i> Sửa quà
        </button>
        <button onclick="deleteReward('${r.id}')" class="px-2.5 py-1 text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded transition-all">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa quà
        </button>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

window.toggleRewardPokeKeySelect = function() {
  const typeVal = document.getElementById("rewardTypeInput").value;
  const container = document.getElementById("rewardPokeKeyContainer");
  const nameInput = document.getElementById("rewardNameInput");
  const imageInput = document.getElementById("rewardImageInput");
  const descInput = document.getElementById("rewardDescInput");
  const costInput = document.getElementById("rewardCostInput");
  const idInput = document.getElementById("rewardIdInput");

  if (typeVal === "pokemon") {
    container.classList.remove("hidden");
    if (!idInput.value) {
       // Only auto-fill if we are creating a new reward
       descInput.value = "Mở khóa Pokémon này để sử dụng làm Avatar thám hiểm của bạn!";
       costInput.value = 300;
    }
  } else {
    container.classList.add("hidden");
    if (!idInput.value) {
      if (typeVal === "item") {
        nameInput.value = "Chuối Vàng Thần Kỳ 🍌";
        imageInput.value = "🍌";
        descInput.value = "Chuối Vàng chứa năng lượng vũ trụ! Cho Pokémon ăn tại mục Tiến Hóa để thăng cấp.";
        costInput.value = 50;
      } else if (typeVal === "avatar") {
        descInput.value = "Mở khóa Avatar mới để thể hiện phong cách của bạn!";
        costInput.value = 150;
      } else if (typeVal === "frame") {
        descInput.value = "Mở khóa Khung trang trí Avatar siêu đẹp!";
        costInput.value = 200;
      } else if (typeVal === "nickname") {
        descInput.value = "Mở khóa Biệt hiệu mới cực ngầu!";
        costInput.value = 100;
      }
    }
  }
};

window.updateRewardFieldsFromPokeKey = function() {
  const pokeKey = document.getElementById("rewardPokeKeyInput").value;
  const nameInput = document.getElementById("rewardNameInput");
  const imageInput = document.getElementById("rewardImageInput");
  const idInput = document.getElementById("rewardIdInput");
  
  if (!idInput.value) {
    const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
    const p = pokemons.find(item => item.id === pokeKey);
    if (p) {
      nameInput.value = `Thần thú: ${p.name}`;
      imageInput.value = p.avatar || "🥚";
    }
  }
};

function openRewardModal(id = null) {
  const modal = document.getElementById("rewardModal");
  document.getElementById("rewardForm").reset();
  
  const titleEl = document.getElementById("rewardModalTitle");
  const submitBtnEl = document.querySelector("#rewardForm button[type='submit']");
  const idInput = document.getElementById("rewardIdInput");
  
  const typeSelect = document.getElementById("rewardTypeInput");
  const pokeContainer = document.getElementById("rewardPokeKeyContainer");
  const pokeSelect = document.getElementById("rewardPokeKeyInput");

  // Dynamically populate Pokémon selection dropdown from cached pokemons
  const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
  if (pokeSelect) {
    pokeSelect.innerHTML = pokemons.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join("");
  }

  if (id && typeof id === "string") {
    titleEl.innerText = "Sửa phần thưởng đổi Coins";
    submitBtnEl.innerText = "Cập nhật phần quà";
    idInput.value = id;
    
    const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
    const r = rewards.find(item => item.id === id);
    if (r) {
      document.getElementById("rewardNameInput").value = r.name || "";
      typeSelect.value = r.type || "physical";
      document.getElementById("rewardCostInput").value = r.cost || 100;
      document.getElementById("rewardImageInput").value = r.image || "";
      document.getElementById("rewardDescInput").value = r.desc || "";
      
      if (r.type === "pokemon") {
        const pokeKey = r.id.replace("reward_", "");
        pokeSelect.value = pokeKey;
        pokeContainer.classList.remove("hidden");
      } else {
        pokeContainer.classList.add("hidden");
      }
    }
  } else {
    titleEl.innerText = "Thêm phần thưởng săn Coins";
    submitBtnEl.innerText = "Thêm phần quà";
    idInput.value = "";
    pokeContainer.classList.add("hidden");
  }
  
  modal.classList.remove("hidden");
}

function closeRewardModal() {
  document.getElementById("rewardModal").classList.add("hidden");
}

function handleRewardSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById("rewardIdInput");
  const editId = idInput ? idInput.value : "";
  
  const name = document.getElementById("rewardNameInput").value.trim();
  const type = document.getElementById("rewardTypeInput").value;
  const cost = parseInt(document.getElementById("rewardCostInput").value);
  const image = document.getElementById("rewardImageInput").value.trim();
  const desc = document.getElementById("rewardDescInput").value.trim();

  let rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  
  let targetId = editId;
  if (!targetId) {
    if (type === "pokemon") {
      const pokeKey = document.getElementById("rewardPokeKeyInput").value;
      targetId = `reward_${pokeKey}`;
    } else if (type === "item") {
      targetId = "reward_banana";
    } else {
      targetId = `reward_custom_${Date.now().toString().slice(-6)}`;
    }
    
    // Check if duplicate ID exists
    if (rewards.some(r => r.id === targetId)) {
      window.showToast("Phần quà cho Thần thú hoặc loại này đã tồn tại!", "error");
      return;
    }

    const newReward = {
      id: targetId,
      name,
      type,
      cost,
      image,
      desc
    };
    rewards.push(newReward);
    window.saveData(window.IC3_KEYS.REWARDS, rewards, targetId);
    window.showToast("Thêm phần quà mới thành công!", "success");
  } else {
    // Edit mode
    const idx = rewards.findIndex(r => r.id === editId);
    if (idx !== -1) {
      let finalId = editId;
      if (type === "pokemon") {
        const pokeKey = document.getElementById("rewardPokeKeyInput").value;
        finalId = `reward_${pokeKey}`;
      } else if (type === "item") {
        finalId = "reward_banana";
      } else if (editId.startsWith("reward_") && !editId.startsWith("reward_custom_") && editId !== "reward_banana") {
        finalId = `reward_custom_${Date.now().toString().slice(-6)}`;
      }
      
      const updatedReward = {
        ...rewards[idx],
        id: finalId,
        name,
        type,
        cost,
        image,
        desc
      };
      
      if (finalId !== editId) {
        // ID changed
        if (rewards.some((r, i) => i !== idx && r.id === finalId)) {
          window.showToast("Phần quà cho Thần thú hoặc loại này đã tồn tại!", "error");
          return;
        }
        rewards[idx] = updatedReward;
        window.deleteData(window.IC3_KEYS.REWARDS, editId);
        window.saveData(window.IC3_KEYS.REWARDS, rewards, finalId);
      } else {
        rewards[idx] = updatedReward;
        window.saveData(window.IC3_KEYS.REWARDS, rewards, editId);
      }
      window.showToast("Cập nhật phần quà thành công!", "success");
    }
  }

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
window.toggleAllBossDays = function(checked) {
  const checkboxes = document.querySelectorAll('input[name="bossActiveDays"]');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
};

window.resetBossHp = async function(id) {
  let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];
  const boss = bosses.find(b => b.id === id);
  if (boss) {
    boss.hp = boss.maxHp;
    if (boss.hasOwnProperty('isDefeated')) {
      boss.isDefeated = false;
    }
    await window.saveData(window.IC3_KEYS.BOSSES, bosses, id);
    window.showToast(`Đã hồi sinh và reset HP của ${boss.name} thành công!`, "success");
    renderBossesGrid();
  }
};

function renderBossesGrid() {
  const container = document.getElementById("admin-bosses-grid");
  if (!container) return;

  container.innerHTML = "";
  let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];

  const paginationEl = document.getElementById("bosses-pagination");
  if (paginationEl) paginationEl.innerHTML = "";

  if (bosses.length === 0) {
    // Seed default bosses
    const defaultBosses = [
      { id: "boss_1", name: "Thần Cây Dữ Liệu 🌳", hp: 500, maxHp: 500, avatar: "🌳", desc: "Đối thủ tin học căn bản đầu tiên thách thức kỹ năng cấu trúc thư mục của bạn.", activeDays: ["Thứ 2", "Thứ 4", "Thứ 6"] },
      { id: "boss_2", name: "Người Máy Siêu Việt 🤖", hp: 800, maxHp: 800, avatar: "🤖", desc: "Thách thức các ứng dụng văn phòng Microsoft Word & Excel đỉnh cao.", activeDays: ["Thứ 3", "Thứ 5", "Thứ 7"] },
      { id: "boss_3", name: "Rồng Hỏa Ngục An Ninh 👾", hp: 1200, maxHp: 1200, avatar: "👾", desc: "Ngự trị vùng đất bảo mật thông tin và an toàn không gian mạng.", activeDays: ["Thứ 2", "Thứ 5", "Chủ Nhật"] },
      { id: "boss_4", name: "Phù Thủy Thuật Toán 🔮", hp: 1500, maxHp: 1500, avatar: "🔮", desc: "Sở hữu ma thuật giải thuật toán tin học đỉnh cao.", activeDays: ["Chủ Nhật"] }
    ];
    window.saveData(window.IC3_KEYS.BOSSES, defaultBosses, defaultBosses.map(b => b.id));
    window.IC3_CACHE[window.IC3_KEYS.BOSSES] = defaultBosses;
    bosses = defaultBosses;
  }

  const currentPage = window.adminPagination.bosses || 1;
  const filtered = bosses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(bosses.length, currentPage, 'bosses-pagination', 'bosses');

  filtered.forEach(boss => {
    const card = document.createElement("div");
    card.className = "bg-slate-950 border border-indigo-950/50 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg hover:border-red-500/30 transition-all relative";
    
    // Check if avatar is an emoji or link
    const isEmoji = !boss.avatar.startsWith("http");
    const avatarHtml = isEmoji 
      ? `<span class="text-5xl select-none">${boss.avatar}</span>`
      : `<img src="${boss.avatar}" alt="${boss.name}" class="w-16 h-16 rounded-xl object-contain shadow-md" referrerPolicy="no-referrer" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=fallback'">`;

    const scheduleText = boss.activeDays && boss.activeDays.length > 0 ? boss.activeDays.join(", ") : "Hàng ngày";
    const hpPercentage = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
    const isDefeated = boss.hp <= 0;

    let resetBtnHtml = '';
    if (isDefeated) {
      resetBtnHtml = `
        <button onclick="window.resetBossHp('${boss.id}')" class="absolute -top-2.5 -right-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-xl shadow-xl flex items-center gap-1.5 border-2 border-white/20 animate-pulse transition-all z-10">
          <i class="fa-solid fa-rotate-left"></i> Reset HP (Đã bị tiêu diệt)
        </button>
      `;
    }

    card.innerHTML = `
      ${resetBtnHtml}
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          ${avatarHtml}
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="font-poppins font-bold text-sm text-white truncate">${boss.name}</h4>
          <span class="inline-block px-2 py-0.5 mt-1 bg-red-950/50 border border-red-900/30 text-red-400 text-[10px] font-bold rounded-full">
            HP: ${boss.hp}/${boss.maxHp}
          </span>
          <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-800/50">
            <div class="bg-red-500 h-full" style="width: ${hpPercentage}%"></div>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 leading-relaxed min-h-[3rem]">${boss.desc || "Không có mô tả."}</p>
      
      <div class="text-[10px] text-slate-500 flex items-center gap-1">
        <i class="fa-solid fa-calendar-days text-indigo-400"></i> Lịch: <span class="text-indigo-300 font-semibold truncate" title="${scheduleText}">${scheduleText}</span>
      </div>

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
  
  // Reset all activeDays checkboxes
  const checkboxes = document.querySelectorAll('input[name="bossActiveDays"]');
  checkboxes.forEach(cb => cb.checked = false);
  const allCheckbox = document.getElementById("bossActiveAll");
  if (allCheckbox) allCheckbox.checked = false;

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

      if (boss.activeDays && Array.isArray(boss.activeDays)) {
        checkboxes.forEach(cb => {
          if (boss.activeDays.includes(cb.value)) {
            cb.checked = true;
          }
        });
        
        // If all 7 are checked, set "All" to true
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        if (allCheckbox && checkedCount === checkboxes.length) {
          allCheckbox.checked = true;
        }
      }
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

  const checkboxes = document.querySelectorAll('input[name="bossActiveDays"]');
  const activeDays = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  let bosses = window.IC3_CACHE[window.IC3_KEYS.BOSSES] || [];

  if (id) {
    // Edit
    const bIdx = bosses.findIndex(b => b.id === id);
    if (bIdx !== -1) {
      bosses[bIdx] = { id, name, maxHp, hp, avatar, desc, activeDays };
      window.saveData(window.IC3_KEYS.BOSSES, bosses, id);
    }
  } else {
    // Add
    const newId = `boss_${Date.now()}`;
    bosses.push({ id: newId, name, maxHp, hp, avatar, desc, activeDays });
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
window.adminForceLogoutEveryone = adminForceLogoutEveryone;
window.adminForceLogoutUser = adminForceLogoutUser;
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
  adjustQuestionAnswers, adminForceLogoutUser, adminForceLogoutEveryone, checkAdminAuth, closeBossModal, closeQuestionModal, closeRewardModal, closeStudentModal, closeTeacherModal, closeTestModal, deleteBoss, deleteQuestion, deleteReward, deleteStudent, deleteTeacher, deleteTest, downloadSheetTemplate, editStudent, filterQuestionsForTestSelection, getBossHuntDayKey, handleBossSubmit, handleQuestionSubmit, handleRewardSubmit, handleStudentSubmit, handleTeacherSubmit, handleTestSubmit, initClock, initDashboard, logoutAdmin, openBossModal, openQuestionModal, openRewardModal, openStudentModal, openTeacherModal, openTestModal, renderAdminSettings, renderBossesGrid, renderDashboardRecentScores, renderDashboardTopStudents, renderQuestionsTable, renderRankingList, renderRewardsGrid, renderStudentsTable, renderTeachersGrid, renderTestsGrid, resetDatabaseToDefault, saveAdminSettings, startAdminApp, switchTab, updateLevelsQuestionCount, toggleRewardPokeKeySelect, updateRewardFieldsFromPokeKey
});

// ==========================================
// POKEMON EVOLUTIONS MANAGEMENT
// ==========================================

let currentAdminEvoMap = {};
window.currentAdminEvoMap = currentAdminEvoMap;

let currentAdminEvoImagesMap = {};
window.currentAdminEvoImagesMap = currentAdminEvoImagesMap;

function initPokemonEvoAdmin() {
  if (window.evoMap) {
    currentAdminEvoMap = JSON.parse(JSON.stringify(window.evoMap));
    window.currentAdminEvoMap = currentAdminEvoMap;
  }
  if (window.currentEvoImagesMap) {
    currentAdminEvoImagesMap = JSON.parse(JSON.stringify(window.currentEvoImagesMap));
    window.currentAdminEvoImagesMap = currentAdminEvoImagesMap;
  }
  renderPokemonEvoList();
}
window.initPokemonEvoAdmin = initPokemonEvoAdmin;

function renderPokemonEvoList() {
  const container = document.getElementById("pokemon-evo-list");
  if (!container) return;
  
  const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
  const searchQuery = document.getElementById("searchPokemon") ? document.getElementById("searchPokemon").value.trim().toLowerCase() : "";
  
  const filteredAll = pokemons.filter(p => 
      p.id.toLowerCase().includes(searchQuery) || 
      p.name.toLowerCase().includes(searchQuery)
  );
  
  const currentPage = window.adminPagination.pokemons || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'pokemons-pagination', 'pokemons');

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-slate-500 text-sm py-4 text-center">Không tìm thấy Pokemon nào.</p>`;
    return;
  }

  let html = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">`;
  
  filtered.forEach(poke => {
    const evos = window.currentAdminEvoMap[poke.id] || [];
    const rarityColors = poke.rarity === "Hiếm" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
                        (poke.rarity === "Thần Thoại" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : 
                        "bg-slate-700/50 text-slate-300 border-slate-600");
                        
    html += `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col hover:border-blue-500/50 transition-colors">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
            <img src="${poke.image}" class="w-12 h-12 object-contain drop-shadow-md" alt="${poke.name}">
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-white text-sm truncate">${poke.name}</h4>
            <p class="text-xs text-slate-400 truncate mt-0.5">ID: ${poke.id}</p>
            <div class="flex gap-2 mt-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${rarityColors}">${poke.rarity || 'Thường'}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${poke.element || 'Không rõ'}</span>
            </div>
          </div>
        </div>
        
        ${evos.length > 0 ? `
        <div class="mt-4 pt-4 border-t border-slate-700">
          <p class="text-[10px] uppercase font-bold text-slate-500 mb-2">Tiến Hóa</p>
          <div class="flex flex-wrap gap-2">
            ${evos.map(e => `<span class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300">${e}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="mt-4 pt-3 border-t border-slate-700 flex justify-end gap-2">
            <button onclick="window.openEditPokemonModal('${poke.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="window.deletePokemon('${poke.id}')" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold rounded-lg transition-colors">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  container.innerHTML = html;
}

// Add Evolution Row to dynamic 2-column list
window.addEvoRow = function(formId = "", imgUrl = "") {
    const container = document.getElementById("evoRowsContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "evo-row grid grid-cols-2 gap-3 items-center relative pr-10";
    row.innerHTML = `
      <div>
        <input type="text" placeholder="Vd: pikachu" value="${formId}" class="evo-id-input w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" required>
      </div>
      <div>
        <input type="url" placeholder="URL hình ảnh (Để trống tự sinh)" value="${imgUrl}" class="evo-img-input w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
      </div>
      <button type="button" onclick="this.parentElement.remove()" class="absolute right-0 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-400 p-2" title="Xóa hàng">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(row);
};

window.openAddPokemonModal = function() {
    document.getElementById("pokeMode").value = "add";
    document.getElementById("pokeOriginalId").value = "";
    document.getElementById("pokeId").value = "";
    document.getElementById("pokeName").value = "";
    document.getElementById("pokeRarity").value = "Thường";
    document.getElementById("pokeElement").value = "";
    document.getElementById("pokeImage").value = "https://projectpokemon.org/images/normal-sprite/";
    
    const container = document.getElementById("evoRowsContainer");
    if (container) {
        container.innerHTML = "";
    }
    
    document.getElementById("pokemonModalTitle").innerText = "Thêm Pokemon Mới";
    document.getElementById("pokemonModal").classList.remove("hidden");
};

window.openEditPokemonModal = function(id) {
    const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
    const poke = pokemons.find(p => p.id === id);
    if (!poke) return;
    
    document.getElementById("pokeMode").value = "edit";
    document.getElementById("pokeOriginalId").value = poke.id;
    document.getElementById("pokeId").value = poke.id;
    document.getElementById("pokeName").value = poke.name || "";
    document.getElementById("pokeRarity").value = poke.rarity || "Thường";
    document.getElementById("pokeElement").value = poke.element || "";
    document.getElementById("pokeImage").value = poke.image || "";
    
    const container = document.getElementById("evoRowsContainer");
    if (container) {
        container.innerHTML = "";
        const evos = window.currentAdminEvoMap[poke.id] || [];
        const evoImages = window.currentAdminEvoImagesMap[poke.id] || [];
        evos.forEach((evo, idx) => {
            window.addEvoRow(evo, evoImages[idx] || "");
        });
    }
    
    document.getElementById("pokemonModalTitle").innerText = "Chỉnh Sửa Pokemon";
    document.getElementById("pokemonModal").classList.remove("hidden");
};

window.closePokemonModal = function() {
    document.getElementById("pokemonModal").classList.add("hidden");
};

window.handlePokemonSubmit = async function(e) {
    e.preventDefault();
    
    const mode = document.getElementById("pokeMode").value;
    const originalId = document.getElementById("pokeOriginalId").value;
    
    const id = document.getElementById("pokeId").value.trim().toLowerCase();
    const name = document.getElementById("pokeName").value.trim();
    const rarity = document.getElementById("pokeRarity").value;
    const element = document.getElementById("pokeElement").value.trim();
    const image = document.getElementById("pokeImage").value.trim();
    
    const evoRows = document.querySelectorAll("#evoRowsContainer .evo-row");
    const evosList = [];
    const evoImagesList = [];
    
    evoRows.forEach(row => {
        const idVal = row.querySelector(".evo-id-input").value.trim().toLowerCase();
        const imgVal = row.querySelector(".evo-img-input").value.trim();
        if (idVal) {
            evosList.push(idVal);
            evoImagesList.push(imgVal);
        }
    });
    
    if (!id || !name || !image) {
        Swal.fire({
            title: 'THIẾU THÔNG TIN',
            text: 'Vui lòng điền đầy đủ ID, Tên và Ảnh.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
        return;
    }
    
    let pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
    
    if (mode === "add" && pokemons.some(p => p.id === id)) {
        Swal.fire({
            title: 'LỖI',
            text: 'ID Pokemon này đã tồn tại!',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
        return;
    }
    
    const newPoke = { id, name, rarity, element, image };
    
    if (mode === "add") {
        pokemons.push(newPoke);
    } else {
        const idx = pokemons.findIndex(p => p.id === originalId);
        if (idx !== -1) {
            pokemons[idx] = newPoke;
        }
    }
    
    // Save to Cache & Cloud
    window.IC3_CACHE[window.IC3_KEYS.POKEMONS] = pokemons;
    await window.saveData(window.IC3_KEYS.POKEMONS, pokemons, [id]);
    
    if (mode === "edit" && originalId !== id) {
        // ID changed, delete old evo
        delete window.currentAdminEvoMap[originalId];
        delete window.currentAdminEvoImagesMap[originalId];
    }
    
    if (evosList.length > 0) {
        window.currentAdminEvoMap[id] = evosList;
        // Map/adjust images to match forms length exactly!
        window.currentAdminEvoImagesMap[id] = evosList.map((f, i) => {
            if (evoImagesList[i] && evoImagesList[i].trim().startsWith("http")) {
                return evoImagesList[i].trim();
            }
            return `https://projectpokemon.org/images/normal-sprite/${f}.gif`;
        });
    } else {
        delete window.currentAdminEvoMap[id];
        delete window.currentAdminEvoImagesMap[id];
    }
    
    // Save Evolutions to Cloud
    await window.savePokemonEvolutions();
    
    window.closePokemonModal();
    renderPokemonEvoList();
};

window.deletePokemon = async function(id) {
    Swal.fire({
        title: 'XÁC NHẬN XÓA',
        text: "Bạn có chắc chắn muốn xóa Pokemon này?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa ngay',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
            pokemons = pokemons.filter(p => p.id !== id);
            window.IC3_CACHE[window.IC3_KEYS.POKEMONS] = pokemons;
            
            try {
                await window.saveData(window.IC3_KEYS.POKEMONS, pokemons, [id]);
            } catch(e) {}
            
            delete window.currentAdminEvoMap[id];
            delete window.currentAdminEvoImagesMap[id];
            await window.savePokemonEvolutions();
            
            renderPokemonEvoList();
            window.showToast("Đã xóa Pokemon thành công!", "success");
        }
    });
};

window.savePokemonEvolutions = async function() {
  try {
    const colRef = window.fStore.collection(window.db, "pokemonEvolutions");
    const snapshot = await window.fStore.getDocs(colRef);
         
    for (const docSnap of snapshot.docs) {
      if (!currentAdminEvoMap[docSnap.id]) {
        await window.fStore.deleteDoc(docSnap.ref);
      }
    }
    
    // Then save/update existing forms
    for (const [base, forms] of Object.entries(currentAdminEvoMap)) {
      const docRef = window.fStore.doc(window.db, "pokemonEvolutions", base);
      
      // Get the corresponding images list from currentAdminEvoImagesMap or fallback
      let images = currentAdminEvoImagesMap[base] || [];
      
      // Map/adjust images to match forms length exactly!
      // "các dạng tiến hóa có bao nhiêu dạng thì có bấy nhiêu link ảnh"
      images = forms.map((f, i) => {
        if (images[i] && images[i].trim().startsWith("http")) {
          return images[i].trim();
        }
        return `https://projectpokemon.org/images/normal-sprite/${f}.gif`;
      });
      
      // Save it back to currentAdminEvoImagesMap too
      currentAdminEvoImagesMap[base] = images;
      
      await window.fStore.setDoc(docRef, {
        id: base,
        basePokemon: base,
        forms: forms,
        images: images,
        updatedAt: window.fStore.serverTimestamp()
      }, { merge: true });
    }
    
    // Sync with global maps
    window.evoMap = JSON.parse(JSON.stringify(currentAdminEvoMap));
    window.currentEvoImagesMap = JSON.parse(JSON.stringify(currentAdminEvoImagesMap));
    console.log("Evolutions saved.");
  } catch (e) {
    console.error("Lỗi khi lưu evos:", e);
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

// ==================== TAB: LOCK TABS MANAGEMENT FUNCTIONS (ADMIN) ====================
function populateAdminLockTabsClasses() {
  const selector = document.getElementById("adminLockTabsClassSelector");
  if (!selector) return;
  
  const selectedValue = selector.value;
  
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  
  selector.innerHTML = `<option value="">-- Chọn Lớp --</option>`;
  classes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.innerText = `${c.name} (${c.id})`;
    selector.appendChild(opt);
  });
  
  if (selectedValue && classes.some(c => c.id === selectedValue)) {
    selector.value = selectedValue;
  }
}

function renderAdminLockTabsGrid() {
  const selector = document.getElementById("adminLockTabsClassSelector");
  const container = document.getElementById("admin-lock-tabs-container");
  if (!selector || !container) return;
  
  const classId = selector.value;
  if (!classId) {
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-900 rounded-xl border border-dashed border-slate-800 text-slate-400">
        <i class="fa-solid fa-users text-3xl mb-3 text-slate-500"></i>
        <p class="font-bold text-sm">Vui lòng chọn một Lớp học từ danh sách ở trên để quản lý!</p>
      </div>
    `;
    return;
  }
  
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const currentClass = classes.find(c => c.id === classId);
  if (!currentClass) {
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-900 rounded-xl border border-dashed border-slate-800 text-slate-400">
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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
  `;

  tabsList.forEach(t => {
    const isLocked = lockedTabs.includes(t.id);
    html += `
      <div class="p-4 rounded-xl border ${isLocked ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'} flex flex-col justify-between hover:border-slate-600 transition-all text-left">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-lg ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/10 text-blue-400'} flex items-center justify-center">
              <i class="fa-solid ${t.icon} text-base"></i>
            </div>
            <span class="text-[10px] font-mono tracking-wider uppercase bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full">${t.id}</span>
          </div>
          <h5 class="font-bold text-sm text-white flex items-center gap-2">
            ${t.name}
            ${isLocked ? '<span class="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-lock"></i> Khóa</span>' : '<span class="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1"><i class="fa-solid fa-lock-open"></i> Mở</span>'}
          </h5>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">${t.desc}</p>
        </div>
        
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">${isLocked ? 'Đang khóa' : 'Đang hoạt động'}</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="${t.id}" class="sr-only peer" ${isLocked ? 'checked' : ''} onchange="toggleAdminTabLockState('${t.id}', this.checked)">
            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

async function toggleAdminTabLockState(tabId, isLocked) {
  const selector = document.getElementById("adminLockTabsClassSelector");
  if (!selector) return;
  const classId = selector.value;
  if (!classId) return;
  
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const classIndex = classes.findIndex(c => c.id === classId);
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
    await window.saveData(window.IC3_KEYS.CLASSES, classes, classId);
    if (window.showToast) {
      window.showToast(`Đã ${isLocked ? 'KHÓA' : 'MỞ'} tab [${tabId}] thành công cho lớp ${currentClass.name}!`, isLocked ? 'error' : 'success');
    }
    renderAdminLockTabsGrid();
  } catch (error) {
    console.error("Failed to update lockedTabs by admin:", error);
    if (window.showToast) window.showToast("Cập nhật thất bại. Vui lòng thử lại!", "error");
  }
}

// ==================== SYSTEM BACKUP & RESTORE MODULE (ADMIN) ====================

async function exportAllData() {
  if (window.Swal) {
    window.Swal.fire({
      title: 'Đang chuẩn bị xuất dữ liệu...',
      text: 'Hệ thống đang thu thập toàn bộ dữ liệu từ Cloud Firestore, vui lòng đợi.',
      allowOutsideClick: false,
      didOpen: () => {
        window.Swal.showLoading();
      }
    });
  }

  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      localStorage: {
        ic3_blocks: localStorage.getItem("ic3_blocks")
      },
      firestore: {}
    };

    const collectionsToBackup = [
      "users",
      "students",
      "teachers",
      "classes",
      "questions",
      "tests",
      "scores",
      "rewards",
      "notifications",
      "bosses",
      "pokemons",
      "settings",
      "system"
    ];

    const db = window.db;
    const { collection, getDocs } = window.fStore;

    for (const colName of collectionsToBackup) {
      try {
        console.log(`Exporting Firestore collection: ${colName}`);
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const docs = [];
        snapshot.forEach(docSnap => {
          docs.push({
            id: docSnap.id,
            data: docSnap.data()
          });
        });
        backupData.firestore[colName] = docs;
      } catch (colErr) {
        console.warn(`Could not export collection ${colName}:`, colErr);
        if (window.IC3_CACHE && window.IC3_CACHE[colName]) {
          backupData.firestore[colName] = window.IC3_CACHE[colName].map(item => ({
            id: item.id || item.email,
            data: item
          }));
        }
      }
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ic3_lms_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Xuất dữ liệu thành công!',
        text: 'File JSON đã được tải về thiết bị của bạn.',
        confirmButtonColor: '#3b82f6'
      });
    } else if (window.showToast) {
      window.showToast("Xuất dữ liệu thành công!", "success");
    }
  } catch (err) {
    console.error("Error during export: ", err);
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Xuất dữ liệu thất bại!',
        text: err.message,
        confirmButtonColor: '#ef4444'
      });
    } else if (window.showToast) {
      window.showToast("Xuất dữ liệu thất bại: " + err.message, "error");
    }
  }
}

async function importAllData(jsonData) {
  if (window.Swal) {
    window.Swal.fire({
      title: 'Đang nhập dữ liệu...',
      text: 'Hệ thống đang phục hồi dữ liệu lên Cloud Firestore, vui lòng không tắt trình duyệt.',
      allowOutsideClick: false,
      didOpen: () => {
        window.Swal.showLoading();
      }
    });
  }

  try {
    const backup = JSON.parse(jsonData);
    
    if (!backup || typeof backup !== 'object' || !backup.firestore) {
      throw new Error("Cấu trúc file JSON không hợp lệ hoặc thiếu dữ liệu Firestore.");
    }

    const db = window.db;
    const { doc, setDoc } = window.fStore;

    if (backup.localStorage) {
      if (backup.localStorage.ic3_blocks) {
        localStorage.setItem("ic3_blocks", backup.localStorage.ic3_blocks);
      }
    }

    let totalImported = 0;
    const collections = Object.keys(backup.firestore);

    for (const colName of collections) {
      const docs = backup.firestore[colName];
      if (!Array.isArray(docs)) continue;

      console.log(`Importing ${docs.length} documents into collection: ${colName}`);
      for (const docObj of docs) {
        if (!docObj.id || !docObj.data) continue;
        
        const docRef = doc(db, colName, docObj.id);
        await setDoc(docRef, docObj.data, { merge: true });
        totalImported++;
      }
    }

    if (window.Swal) {
      await window.Swal.fire({
        icon: 'success',
        title: 'Nhập dữ liệu thành công!',
        text: `Đã khôi phục thành công ${totalImported} bản ghi dữ liệu. Trang web sẽ tự động tải lại sau giây lát để cập nhật dữ liệu mới nhất.`,
        confirmButtonColor: '#3b82f6'
      });
      window.location.reload();
    } else {
      if (window.showToast) window.showToast(`Đã khôi phục thành công ${totalImported} bản ghi! Tải lại trang...`, "success");
      setTimeout(() => window.location.reload(), 1500);
    }
  } catch (err) {
    console.error("Error during import: ", err);
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Nhập dữ liệu thất bại!',
        text: err.message,
        confirmButtonColor: '#ef4444'
      });
    } else if (window.showToast) {
      window.showToast("Nhập dữ liệu thất bại: " + err.message, "error");
    }
  }
}

function initBackupRestoreEvents() {
  const dragZone = document.getElementById("import-drag-zone");
  const fileInput = document.getElementById("import-file-input");

  if (!dragZone || !fileInput) return;

  dragZone.onclick = (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  };

  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dragZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ["dragenter", "dragover"].forEach(eventName => {
    dragZone.addEventListener(eventName, () => {
      dragZone.classList.add("border-blue-500", "bg-slate-800");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dragZone.addEventListener(eventName, () => {
      dragZone.classList.remove("border-blue-500", "bg-slate-800");
    }, false);
  });

  dragZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  fileInput.onchange = (e) => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  };

  function handleFileSelected(file) {
    if (!file) return;
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      if (window.showToast) {
        window.showToast("Định dạng file không hợp lệ! Vui lòng chọn file .json", "error");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      importAllData(content);
    };
    reader.readAsText(file);
  }
}

window.populateAdminLockTabsClasses = populateAdminLockTabsClasses;
window.renderAdminLockTabsGrid = renderAdminLockTabsGrid;
window.toggleAdminTabLockState = toggleAdminTabLockState;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.initBackupRestoreEvents = initBackupRestoreEvents;
window.switchTab = switchTab;

