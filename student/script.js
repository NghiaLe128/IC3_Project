/**
 * IC3 LMS - Student Gamified UI Logic
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

let currentStudent = null;
let activePlayingTest = null;
let testQuestions = [];
let activeQuestionIndex = 0;
let userAnswers = [];
let correctAnswersCount = 0;
let testTimerInterval = null;
let remainingSeconds = 0;
let isAnswerChecked = false; // State to toggle check/next buttons
let currentTestMode = "practice"; // "practice" or "exam"
let isReviewingExam = false;
let examUserAnswers = [];
let selectedTestIdToStart = "";

// RPG Battle States
let playerMaxHP = 100;
let playerCurrentHP = 100;
let bossMaxHP = 1000;
let bossCurrentHP = 1000;

// ==================== TEST MODE SELECTION LOGIC ====================
function openTestModeSelection(testId) {
  selectedTestIdToStart = testId;
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const test = tests.find(t => t.id === testId);
  if (!test) return;

  // Set test title in the modal
  const modalTitle = document.getElementById("test-mode-modal-title");
  if (modalTitle) {
    modalTitle.innerText = `Chọn chế độ: ${test.title}`;
  }

  // Open the modal
  const modal = document.getElementById("testModeSelectionModal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeTestModeModal() {
  const modal = document.getElementById("testModeSelectionModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function selectTestMode(mode) {
  closeTestModeModal();
  startTest(selectedTestIdToStart, mode);
}

function saveBlankInput(val) {
  currentSelectedAnswer = val;
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = val;
  }
}

function reviewExamAnswers() {
  const modal = document.getElementById("game-victory-screen");
  if (modal) {
    modal.classList.add("hidden");
  }
  
  isReviewingExam = true;
  activeQuestionIndex = 0;
  
  // Load and render first question in review mode
  renderGameQuestion();
  
  // Show playing screen
  document.getElementById("game-playing-screen").classList.remove("hidden");
  
  // Set RPG Battle log message for review mode
  document.getElementById("battle-scene-log").innerText = "Chế độ xem lại bài thi: Hãy duyệt qua các câu hỏi để ôn tập và xem giải thích đáp án chi tiết.";
  document.getElementById("battle-scene-player-status").innerText = "XEM LẠI";
  document.getElementById("battle-scene-boss-status").innerText = "XEM LẠI";
}

function closeReviewingExam() {
  isReviewingExam = false;
  document.getElementById("game-playing-screen").classList.add("hidden");
  loadStudentProfile();
  renderBattleArena();
}

// Theme toggle logic (supports light and dark modes)
function applySavedTheme() {
  const currentTheme = localStorage.getItem("ic3_student_theme") || "dark";
  const htmlEl = document.documentElement;
  const toggleIcon = document.getElementById("theme-toggle-icon");
  
  if (currentTheme === "light") {
    htmlEl.classList.add("light-mode");
    if (toggleIcon) {
      toggleIcon.className = "fa-solid fa-moon text-sm text-indigo-600";
    }
  } else {
    htmlEl.classList.remove("light-mode");
    if (toggleIcon) {
      toggleIcon.className = "fa-solid fa-sun text-sm text-yellow-400";
    }
  }
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains("light-mode");
  const newTheme = isLight ? "dark" : "light";
  localStorage.setItem("ic3_student_theme", newTheme);
  applySavedTheme();
}

// Immediate call to prevent dark-mode flash
applySavedTheme();

document.addEventListener("DOMContentLoaded", () => {
  if (window.IC3_CACHE && window.IC3_CACHE.users && window.IC3_CACHE.users.length > 0) {
    startStudentApp();
  } else {
    window.addEventListener('ic3-db-ready', startStudentApp);
  }
});

async function startStudentApp() {
  await checkStudentAuth();
  loadStudentProfile();
  applySavedTheme();
  switchStudentTab("battle");
}

// 1. Auth & Profile Loading
async function checkStudentAuth() {
  const userStr = localStorage.getItem(window.IC3_KEYS.CURRENT_USER);
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!user || user.role !== "student") {
    window.showToast("Vui lòng đăng nhập bằng tài khoản học sinh!", 'error');
    window.location.href = "../index.html";
    return;
  }
  
  // Load specific student details from Firestore
  try {
    const studentDocRef = window.fStore.doc(window.db, window.IC3_KEYS.STUDENTS, user.email);
    const studentDoc = await window.fStore.getDoc(studentDocRef);
    
    if (studentDoc.exists()) {
      currentStudent = studentDoc.data();
      if (!currentStudent.blockId) {
        currentStudent.blockId = "block_3";
      }
    } else {
      // Fallback for demo accounts or missing profile
      currentStudent = {
        email: user.email,
        name: user.name,
        classId: "C1",
        blockId: "block_3",
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
      await window.fStore.setDoc(studentDocRef, currentStudent);
    }
  } catch (error) {
    console.error("Error loading student profile:", error);
    // Use fallback if network fails
    currentStudent = {
      email: user.email,
      name: user.name,
      classId: "C1",
      blockId: "block_3",
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
  }
}

function loadStudentProfile() {
  if (!currentStudent) return;

  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  const rankBadges = {
    Bronze: "🥉 Bronze",
    Silver: "🥈 Silver",
    Gold: "🥇 Gold",
    Diamond: "💎 Diamond"
  };

  // Render top status indicators
  document.getElementById("playerName").innerText = currentStudent.name;
  document.getElementById("playerRankBadge").innerText = rankBadges[currentStudent.rank] || "🥉 Bronze";
  document.getElementById("playerLevelTitle").innerText = currentStudent.level;
  document.getElementById("playerCoinsCount").innerText = currentStudent.coins;
  document.getElementById("store-coins-balance").innerText = currentStudent.coins;

  // Render Avatar
  document.getElementById("playerAvatarFrame").innerText = pokemonAvatars[currentStudent.pokemon] || "⚡";

  // Calculate EXP percentage
  let levelMinExp = 0;
  let levelMaxExp = 500;
  
  if (currentStudent.level === "Explorer") {
    levelMinExp = 500;
    levelMaxExp = 1500;
  } else if (currentStudent.level === "Expert") {
    levelMinExp = 1500;
    levelMaxExp = 3000;
  } else if (currentStudent.level === "Master IC3") {
    levelMinExp = 3000;
    levelMaxExp = 5000;
  }

  const expNeededForThisLevel = levelMaxExp - levelMinExp;
  const currentExpInThisLevel = currentStudent.exp - levelMinExp;
  const expPercent = Math.min(100, Math.max(0, Math.round((currentExpInThisLevel / expNeededForThisLevel) * 100)));

  document.getElementById("playerExpBar").style.width = `${expPercent}%`;
  document.getElementById("playerExpText").innerText = `${currentStudent.exp}/${levelMaxExp} EXP`;

  // Set grade selector value
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
  const studentClass = classes.find(c => c.id === currentStudent.classId);
  const gradeSelect = document.getElementById("student-grade-select");
  const lockedBadge = document.getElementById("student-grade-locked-badge");
  const lockedText = document.getElementById("student-grade-locked-text");

  const blockNames = {
    block_3: "Khối 3",
    block_4: "Khối 4",
    block_5: "Khối 5",
    block_6: "Khối 6",
    block_7: "Khối 7",
    block_8: "Khối 8"
  };

  if (studentClass) {
    const resolvedBlockId = getBlockIdFromClass(studentClass);
    if (currentStudent.blockId !== resolvedBlockId) {
      currentStudent.blockId = resolvedBlockId;
      saveStudentBlockInMemoryAndFirestore(resolvedBlockId);
    }
    
    if (gradeSelect) {
      gradeSelect.value = resolvedBlockId;
      gradeSelect.disabled = true;
      gradeSelect.classList.add("pointer-events-none", "opacity-80");
    }
    if (lockedBadge && lockedText) {
      lockedBadge.classList.remove("hidden");
      const blockName = blockNames[resolvedBlockId] || "Cố định";
      lockedText.innerText = `${studentClass.name} (${blockName})`;
    }
  } else {
    if (gradeSelect) {
      gradeSelect.disabled = false;
      gradeSelect.classList.remove("pointer-events-none", "opacity-80");
      if (currentStudent.blockId) {
        gradeSelect.value = currentStudent.blockId;
      }
    }
    if (lockedBadge) {
      lockedBadge.classList.add("hidden");
    }
  }
}

function getBlockIdFromClass(cls) {
  if (!cls) return "block_3";
  if (cls.blockId) return cls.blockId;
  
  // Extract number 3 to 8 from class name or class ID
  const matchName = cls.name.match(/\b([3-8])\b/) || cls.name.match(/([3-8])/);
  const matchId = cls.id.match(/([3-8])/);
  
  const digit = matchName ? matchName[1] : (matchId ? matchId[1] : null);
  if (digit) {
    return `block_${digit}`;
  }
  return "block_3"; // Default fallback
}

async function saveStudentBlockInMemoryAndFirestore(blockId) {
  currentStudent.blockId = blockId;
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    await window.saveData(window.IC3_KEYS.STUDENTS, students);
  } else {
    try {
      const studentDocRef = window.fStore.doc(window.db, window.IC3_KEYS.STUDENTS, currentStudent.email);
      await window.fStore.setDoc(studentDocRef, currentStudent);
    } catch (e) {
      console.error("Error saving student blockId:", e);
    }
  }
}

window.changeStudentGrade = async function(newBlockId) {
  if (!currentStudent) return;
  currentStudent.blockId = newBlockId;
  
  // Save student profile
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    await window.saveData(window.IC3_KEYS.STUDENTS, students);
  } else {
    try {
      const studentDocRef = window.fStore.doc(window.db, window.IC3_KEYS.STUDENTS, currentStudent.email);
      await window.fStore.setDoc(studentDocRef, currentStudent);
    } catch (e) {
      console.error(e);
    }
  }
  
  // Refresh profile & battle arena view
  loadStudentProfile();
  renderBattleArena();
};

function logoutStudent() {
  window.logoutUser();
}

// 2. Tab Switching Engine
function switchStudentTab(tabId) {
  document.querySelectorAll(".student-view-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".student-tab-btn").forEach(el => el.classList.remove("active"));

  const activeTab = document.getElementById(`student-tab-${tabId}`);
  if (activeTab) activeTab.classList.remove("hidden");

  const activeBtn = document.getElementById(`btn-tab-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active");

  if (tabId === "worldmap") renderWorldMap();
  else if (tabId === "battle") renderBattleArena();
  else if (tabId === "review") renderSkillTree();
  else if (tabId === "leaderboard") renderLeaderboard();
  else if (tabId === "badges") renderBadges();
  else if (tabId === "inventory") renderInventory();
  else if (tabId === "rewards") renderRewardsStore();
}

// ==================== RENDER: BATTLE ARENA ====================
function renderBattleArena() {
  if (!currentStudent) {
    console.warn("Student data not ready for battle arena");
    return;
  }
  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  const pokemonNames = {
    pikachu: "Pikachu Điện Sấm",
    charmander: "Charmander Lửa Thiêng",
    bulbasaur: "Bulbasaur Bão Lá",
    squirtle: "Squirtle Pháo Nước",
    eevee: "Eevee Biến Hóa"
  };

  const pokemonElements = {
    pikachu: { name: "⚡ Electric", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", shadow: "drop-shadow-[0_10px_15px_rgba(250,204,21,0.3)]" },
    charmander: { name: "🔥 Fire", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", shadow: "drop-shadow-[0_10px_15px_rgba(251,146,60,0.3)]" },
    bulbasaur: { name: "🌱 Grass", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", shadow: "drop-shadow-[0_10px_15px_rgba(52,211,153,0.3)]" },
    squirtle: { name: "💧 Water", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", shadow: "drop-shadow-[0_10px_15px_rgba(96,165,250,0.3)]" },
    eevee: { name: "🦊 Normal", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", shadow: "drop-shadow-[0_10px_15px_rgba(251,191,36,0.3)]" }
  };

  const activePoke = currentStudent.pokemon || "pikachu";
  
  // Render companion details in Battle Tab
  document.getElementById("battle-poke-name").innerText = pokemonNames[activePoke];
  
  const elBadge = document.getElementById("battle-poke-element");
  const pokeElementData = pokemonElements[activePoke] || pokemonElements.pikachu;
  if(elBadge) {
    elBadge.className = `text-xs font-bold px-2.5 py-1 rounded-full border ${pokeElementData.color}`;
    elBadge.innerText = pokeElementData.name;
  }

  const elAvatar = document.getElementById("battle-poke-avatar");
  if(elAvatar) {
    elAvatar.className = `text-7xl animate-pulse transition-all duration-300 ${pokeElementData.shadow}`;
    elAvatar.innerText = pokemonAvatars[activePoke] || "⚡";
  }
  
  // Dynamic RPG Level Stage
  let stage = "Cấp 1 (Sơ sinh)";
  if (currentStudent.level === "Explorer") stage = "Cấp 2 (Tiến hóa bậc trung)";
  else if (currentStudent.level === "Expert") stage = "Cấp 3 (Trưởng thành siêu đẳng)";
  else if (currentStudent.level === "Master IC3") stage = "Cấp 4 (Thần thoại tối cao)";
  document.getElementById("battle-poke-stage").innerText = stage;

  // Dynamic stat calculators based on current experience points
  const baseHp = activePoke === "bulbasaur" ? 140 : activePoke === "squirtle" ? 130 : 100;
  const baseAtk = activePoke === "charmander" ? 95 : activePoke === "pikachu" ? 85 : 70;
  const baseDef = activePoke === "squirtle" ? 85 : activePoke === "bulbasaur" ? 80 : 65;
  const baseInt = activePoke === "eevee" ? 100 : activePoke === "pikachu" ? 95 : 80;
  const baseSpd = activePoke === "pikachu" ? 100 : activePoke === "eevee" ? 90 : 75;

  const currentHp = baseHp + Math.floor(currentStudent.exp / 15);
  const currentAtk = Math.min(100, baseAtk + Math.floor(currentStudent.exp / 40));
  const currentDef = Math.min(100, baseDef + Math.floor(currentStudent.exp / 50));
  const currentInt = Math.min(100, baseInt + Math.floor(currentStudent.exp / 35));
  const currentSpd = Math.min(100, baseSpd + Math.floor(currentStudent.exp / 45));

  // Update DOM battle stats
  document.getElementById("battle-stat-val-hp").innerText = `${currentHp}/${currentHp}`;
  document.getElementById("battle-stat-bar-hp").style.width = "100%";
  
  document.getElementById("battle-stat-val-atk").innerText = currentAtk;
  document.getElementById("battle-stat-bar-atk").style.width = `${currentAtk}%`;

  document.getElementById("battle-stat-val-def").innerText = currentDef;
  document.getElementById("battle-stat-bar-def").style.width = `${currentDef}%`;

  document.getElementById("battle-stat-val-int").innerText = currentInt;
  document.getElementById("battle-stat-bar-int").style.width = `${currentInt}%`;

  document.getElementById("battle-stat-val-spd").innerText = currentSpd;
  document.getElementById("battle-stat-bar-spd").style.width = `${currentSpd}%`;

  // Render Boss List challenger cards
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  const container = document.getElementById("battle-boss-selector-container");
  container.innerHTML = "";

  const studentBlockId = currentStudent.blockId || "block_3";
  // Filter tests belonging to this specific grade block
  const gradeTests = tests.filter(t => t.blockId === studentBlockId);

  // Custom sort: Ôn tập 1, 2, 3, 4, 5, ..., Tổng hợp, Bổ sung
  gradeTests.sort((a, b) => {
    const getTestSortScore = (title) => {
      const lowerTitle = (title || "").toLowerCase();
      if (lowerTitle.includes("bổ sung") || lowerTitle.includes("bo sung")) {
        return 10000;
      }
      if (lowerTitle.includes("tổng hợp") || lowerTitle.includes("tong hop")) {
        return 9000;
      }
      const numberMatch = lowerTitle.match(/\d+/);
      if (numberMatch) {
        return parseInt(numberMatch[0], 10);
      }
      return 1000;
    };

    const scoreA = getTestSortScore(a.title);
    const scoreB = getTestSortScore(b.title);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return (a.title || "").localeCompare(b.title || "", 'vi');
  });

  if (gradeTests.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-slate-900/40 border border-white/5 p-8 rounded-3xl text-center space-y-3">
        <span class="text-4xl">📭</span>
        <h4 class="font-poppins font-bold text-sm text-slate-200">Khối lớp này chưa có đề ôn tập nào</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto">Giáo viên có thể khởi tạo hoặc biên soạn thêm các bộ đề thi mới dành riêng cho khối lớp này trong phần quản lý giáo viên!</p>
      </div>
    `;
    return;
  }

  const bossesDef = gradeTests.map((t, idx) => {
    const titleLower = (t.title || "").toLowerCase();
    
    let avatar = "🌟";
    let name = `${t.title} (Thử Thách Đặc Biệt) 🌟`;
    let desc = "Bộ đề thi tùy chỉnh do thầy cô thiết kế dành riêng cho bạn.";
    let accent = "from-indigo-950/45 via-slate-900/50 to-slate-900/60 border-indigo-500/25";
    let reward = "Nhận 300+ EXP & 60+ Coins 🪙";
    
    if (titleLower.includes("tổng hợp") || titleLower.includes("tong hop")) {
      avatar = "👑";
      name = `${t.title} (Vua Thống Lĩnh IC3) 👑`;
      desc = "Bài thi tổng hợp mọi kiến thức để chứng minh bạn xứng đáng với danh hiệu tối cao Master!";
      accent = "from-yellow-950/45 via-slate-900/50 to-slate-900/60 border-yellow-500/30";
      reward = "Nhận 800+ EXP & 200+ Coins 🪙";
    } else if (titleLower.includes("bổ sung") || titleLower.includes("bo sung")) {
      avatar = "⚡";
      name = `${t.title} (Chiến Thần Sấm Sét) ⚡`;
      desc = "Bộ đề ôn tập bổ sung năng lượng, củng cố vững chắc tất cả các lỗ hổng kiến thức.";
      accent = "from-cyan-950/45 via-slate-900/50 to-slate-900/60 border-cyan-500/30";
      reward = "Nhận 400+ EXP & 90+ Coins 🪙";
    } else if (titleLower.includes("1") || (!titleLower.includes("2") && !titleLower.includes("3") && !titleLower.includes("4") && !titleLower.includes("5") && idx === 0)) {
      avatar = "🌳";
      name = `${t.title} (Thần Cây Dữ Liệu) 🌳`;
      desc = "Đối đầu trực tiếp với Thần Cây để kiểm tra năng lực tin học căn bản của khối lớp.";
      accent = "from-emerald-950/45 via-slate-900/50 to-slate-900/60 border-emerald-500/30";
      reward = "Nhận 250+ EXP & 50+ Coins 🪙";
    } else if (titleLower.includes("2") || (idx === 1)) {
      avatar = "🤖";
      name = `${t.title} (Game Show Kiến Thức) 🤖`;
      desc = "Thử thách tư duy logic văn phòng và ứng dụng của khối lớp cùng Người Máy Siêu Việt.";
      accent = "from-blue-950/45 via-slate-900/50 to-slate-900/60 border-blue-500/30";
      reward = "Nhận 350+ EXP & 80+ Coins 🪙";
    } else if (titleLower.includes("3") || (idx === 2)) {
      avatar = "👾";
      name = `${t.title} (Rồng Hỏa Ngục An Ninh Mạng) 👾`;
      desc = "Trận chiến đỉnh cao vượt qua các chướng ngại vật bảo mật và hiểu biết internet số.";
      accent = "from-purple-950/45 via-slate-900/50 to-slate-900/60 border-purple-500/30";
      reward = "Nhận 450+ EXP & 100+ Coins 🪙";
    } else if (titleLower.includes("4")) {
      avatar = "🔮";
      name = `${t.title} (Phù Thủy Thuật Toán) 🔮`;
      desc = "Vượt qua các câu hỏi hóc búa để khai sáng tư duy công nghệ mới.";
      accent = "from-pink-950/45 via-slate-900/50 to-slate-900/60 border-pink-500/30";
      reward = "Nhận 500+ EXP & 120+ Coins 🪙";
    } else if (titleLower.includes("5")) {
      avatar = "🐉";
      name = `${t.title} (Kim Giáp Long Vương) 🐉`;
      desc = "Thách thức bản lĩnh đỉnh cao cùng rồng thần bảo hộ vương quốc số.";
      accent = "from-amber-950/45 via-slate-900/50 to-slate-900/60 border-amber-500/30";
      reward = "Nhận 600+ EXP & 150+ Coins 🪙";
    }

    return {
      testId: t.id,
      name: name,
      levelReq: "Beginner", // Specific grade tests are always unlocked!
      avatar: avatar,
      desc: desc,
      accent: accent,
      reward: reward
    };
  });

  bossesDef.forEach(boss => {
    const test = tests.find(t => t.id === boss.testId);
    if (!test) return;

    // Check level lock status
    let isLocked = false;
    if (boss.levelReq === "Explorer" && !["Explorer", "Expert", "Master IC3"].includes(currentStudent.level)) {
      isLocked = true;
    } else if (boss.levelReq === "Expert" && !["Expert", "Master IC3"].includes(currentStudent.level)) {
      isLocked = true;
    }

    // Best performance
    const bestScore = scores
      .filter(s => s.studentEmail === currentStudent.email && s.testId === boss.testId)
      .reduce((max, s) => s.score > max ? s.score : max, 0);

    const card = document.createElement("div");
    
    if (isLocked) {
      card.className = "bg-slate-950/40 border border-indigo-950/40 p-5 rounded-3xl flex items-center gap-5 opacity-40 grayscale cursor-not-allowed";
      card.innerHTML = `
        <span class="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-4xl shrink-0">🔒</span>
        <div class="flex-grow">
          <h4 class="font-poppins font-black text-xs text-slate-400">${boss.name}</h4>
          <p class="text-[10px] text-slate-500 mt-1">${boss.desc}</p>
          <span class="text-[9px] font-black text-red-500 block mt-2 uppercase tracking-wide">YÊU CẦU CẤP ĐỘ THÁM HIỂM TỪ: ${boss.levelReq.toUpperCase()}</span>
        </div>
      `;
    } else {
      card.className = `bg-gradient-to-r ${boss.accent} border p-5 rounded-3xl flex flex-col md:flex-row items-center gap-5 shadow-2xl relative overflow-hidden group hover:border-white/25 transition-all w-full`;
      
      const badgeText = bestScore > 0 ? `Đã đấu (Cao nhất: ${bestScore}/100)` : "Chưa khiêu chiến";
      const badgeClass = bestScore >= 50 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";

      card.innerHTML = `
        <div class="w-16 h-16 rounded-2xl bg-slate-950/80 flex items-center justify-center text-4xl shrink-0 border border-white/5 shadow-inner">
          ${boss.avatar}
        </div>
        <div class="flex-grow text-center md:text-left">
          <div class="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <h4 class="font-poppins font-black text-xs text-white">${boss.name}</h4>
            <span class="text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-widest ${badgeClass}">${badgeText}</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-lg">${boss.desc}</p>
          <div class="flex items-center gap-2 mt-2 justify-center md:justify-start text-[10px] font-bold text-yellow-400">
            <span>🎁 Phần thưởng:</span>
            <span>${boss.reward}</span>
          </div>
        </div>
        <button onclick="openTestModeSelection('${boss.testId}')" class="shrink-0 px-5 py-3 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer">
          ⚔️ THÁCH ĐẤU
        </button>
      `;
    }

    container.appendChild(card);
  });
}

// ==================== RENDER: WORLD MAP ====================
function renderWorldMap() {
  if (!currentStudent) {
    console.warn("Student data not ready for world map");
    return;
  }
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];

  // Define locks dynamically based on student progression level
  const isL2Unlocked = ["Explorer", "Expert", "Master IC3"].includes(currentStudent.level);
  const isL3Unlocked = ["Expert", "Master IC3"].includes(currentStudent.level);

  // Update Zone Cards UI styling
  updateZoneLockUI("level_2", isL2Unlocked);
  updateZoneLockUI("level_3", isL3Unlocked);

  // Render quizzes per zone, filtered by the student's active grade block
  const studentBlockId = currentStudent.blockId || "block_3";
  const gradeTests = tests.filter(t => t.blockId === studentBlockId);

  renderZoneQuizzes("level_1", gradeTests.filter(t => t.level === "level_1" || t.level === "Beginner"), scores);
  renderZoneQuizzes("level_2", gradeTests.filter(t => t.level === "level_2" || t.level === "Explorer"), scores, isL2Unlocked);
  renderZoneQuizzes("level_3", gradeTests.filter(t => t.level === "level_3" || t.level === "Expert"), scores, isL3Unlocked);
}

// ==================== RENDERING: 3. ÔN TẬP (SKILL TREE PRACTICE) ====================
let currentSelectedSkillNode = "basics";

function renderSkillTree() {
  if (!currentStudent) {
    console.warn("Student data not ready for skill tree");
    return;
  }
  if (!currentStudent.unlockedLessons) {
    currentStudent.unlockedLessons = ["lesson_l1_1"];
  }

  // Define nodes and update status styling dynamically in the tree UI
  const nodes = ["basics", "hardware", "os", "security"];
  nodes.forEach(nodeId => {
    const btn = document.getElementById(`skill-node-${nodeId}`);
    if (!btn) return;

    // Check if previous nodes are completed (passed quizzes or learned)
    // For simplicity: basics is unlocked; hardware requires basics; os requires hardware; security requires os
    let isUnlocked = true;
    if (nodeId === "hardware") isUnlocked = currentStudent.unlockedLessons.includes("lesson_l1_1");
    if (nodeId === "os") isUnlocked = currentStudent.unlockedLessons.includes("lesson_l1_2");
    if (nodeId === "security") isUnlocked = currentStudent.unlockedLessons.includes("lesson_l1_3");

    btn.className = "skill-node-btn z-10 font-black rounded-full w-14 h-14 border-4 border-slate-900 flex items-center justify-center text-xl transition-all relative";
    
    if (isUnlocked) {
      btn.disabled = false;
      const isCurrentActive = currentSelectedSkillNode === nodeId;
      if (isCurrentActive) {
        btn.classList.add("bg-emerald-500", "text-slate-950", "shadow-[0_0_20px_rgba(16,185,129,0.6)]", "scale-110");
      } else {
        btn.classList.add("bg-indigo-600", "text-white", "hover:bg-indigo-500", "shadow-[0_0_10px_rgba(79,70,229,0.3)]");
      }
    } else {
      btn.disabled = true;
      btn.classList.add("bg-slate-800", "text-slate-500", "cursor-not-allowed", "opacity-45");
    }
  });

  selectSkillTreeNode(currentSelectedSkillNode);
}

const skillLessonData = {
  basics: {
    lessonId: "lesson_l1_1",
    title: "💻 Computing Basics - Nguyên lý Máy tính",
    desc: "Tìm hiểu về các thiết bị phần cứng chính, cách hệ thống máy tính khởi động và xử lý dữ liệu chuẩn IC3.",
    videoTitle: "Hoạt họa 3D: Bo mạch chủ CPU & Cơ chế nạp dữ liệu RAM",
    frontCard: "CPU là gì?",
    backCard: "Central Processing Unit - Bộ vi xử lý trung tâm, đóng vai trò như não bộ, xử lý mọi thuật toán của máy tính.",
    quizQuestion: "Hệ thống lưu trữ tạm thời nào biến mất hoàn toàn dữ liệu khi tắt máy?",
    quizOptions: ["A. HDD (Ổ cứng cơ học)", "B. RAM (Bộ nhớ truy cập ngẫu nhiên)", "C. ROM (Bộ nhớ chỉ đọc)", "D. SSD (Ổ cứng thể rắn)"],
    correctAnswer: "B",
    explanation: "RAM là bộ nhớ khả biến (volatile), cần dòng điện duy trì để lưu trữ trạng thái hoạt động."
  },
  hardware: {
    lessonId: "lesson_l1_2",
    title: "⚙️ Hardware Parts - Thiết bị ngoại vi & Cổng kết nối",
    desc: "Phân biệt các loại cổng kết nối như USB, HDMI, VGA và các nhóm thiết bị Nhập/Xuất của hệ thống.",
    videoTitle: "Animation: Cách truyền tín hiệu qua cổng HDMI thế hệ mới",
    frontCard: "Cổng HDMI là gì?",
    backCard: "High-Definition Multimedia Interface - Chuẩn kết nối truyền tải đồng thời cả âm thanh lẫn hình ảnh kỹ thuật số chất lượng cao chỉ qua 1 cáp.",
    quizQuestion: "Thiết bị nào sau đây vừa là thiết bị ĐẦU VÀO (Input) vừa là ĐẦU RA (Output)?",
    quizOptions: ["A. Màn hình cảm ứng (Touchscreen)", "B. Bàn phím cơ (Keyboard)", "C. Máy in Laser (Printer)", "D. Loa âm thanh (Speaker)"],
    correctAnswer: "A",
    explanation: "Màn hình cảm ứng cho phép chạm để gửi lệnh vào (Input) và hiển thị hình ảnh trực tiếp (Output)."
  },
  os: {
    lessonId: "lesson_l1_3",
    title: "💿 Operating System - Hệ điều hành thông thái",
    desc: "Tìm hiểu chức năng chính của hệ điều hành, quản lý tệp tin, tổ chức thư mục khoa học và phím tắt Windows.",
    videoTitle: "Mô phỏng: Tiến trình phân đoạn ổ đĩa và kiểm soát ứng dụng hệ thống",
    frontCard: "Phím tắt Windows + E?",
    backCard: "Dùng để mở ngay cửa sổ File Explorer - Trình quản lý thư mục, tệp tin cực kỳ nhanh chóng trên Windows.",
    quizQuestion: "Tổ hợp phím tắt huyền thoại để mở nhanh trình quản lý tác vụ Task Manager khẩn cấp là gì?",
    quizOptions: ["A. Windows + R", "B. Ctrl + Shift + Esc", "C. Alt + Tab", "D. Ctrl + Alt + Delete"],
    correctAnswer: "B",
    explanation: "Ctrl + Shift + Esc mở trực tiếp Task Manager không thông qua màn hình trung gian, giúp tắt ứng dụng treo ngay lập tức."
  },
  security: {
    lessonId: "lesson_l1_4",
    title: "🛡️ Cyber Security - Bảo vệ thiết bị & Mạng",
    desc: "Nhận biết các mối đe dọa trực tuyến, Virus, Malware, Trojan lừa đảo mạo danh và cách sử dụng Firewall.",
    videoTitle: "Video kịch bản: Cơ chế lừa đảo Phishing lấy cắp mã OTP tài khoản ngân hàng",
    frontCard: "Firewall có vai trò gì?",
    backCard: "Tường lửa kiểm soát lưu lượng dữ liệu ra vào giữa máy tính của bạn và internet, ngăn chặn hacker xâm nhập.",
    quizQuestion: "Thuật ngữ Phishing trong an ninh mạng dùng để chỉ hành vi độc hại nào?",
    quizOptions: ["A. Gửi virus phá hủy ổ cứng", "B. Tấn công từ chối dịch vụ", "C. Lừa đảo giả mạo hòm thư/web uy tín để đánh cắp mật khẩu", "D. Đặt mã khóa tống tiền tệp tin"],
    correctAnswer: "C",
    explanation: "Phishing là hành vi lừa đảo trực tuyến mạo danh tổ chức tin cậy để đánh lừa người dùng giao mật khẩu hoặc thông tin cá nhân."
  }
};

function selectSkillTreeNode(nodeId) {
  currentSelectedSkillNode = nodeId;
  
  // Highlight active node in tree
  document.querySelectorAll(".skill-node-btn").forEach(btn => btn.classList.remove("bg-emerald-500", "text-slate-950", "scale-110", "shadow-[0_0_20px_rgba(16,185,129,0.6)]"));
  
  const activeBtn = document.getElementById(`skill-node-${nodeId}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-emerald-500", "text-slate-950", "scale-110", "shadow-[0_0_20px_rgba(16,185,129,0.6)]");
  }

  const data = skillLessonData[nodeId];
  const panel = document.getElementById("skill-details-panel");
  if (!panel) return;

  const isCompleted = currentStudent.unlockedLessons.includes(data.lessonId);
  const statusBadge = isCompleted 
    ? `<span class="px-2.5 py-1 text-[9px] font-extrabold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase"><i class="fa-solid fa-circle-check mr-1"></i> HOÀN THÀNH</span>`
    : `<span class="px-2.5 py-1 text-[9px] font-extrabold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase"><i class="fa-solid fa-hourglass-start mr-1"></i> ĐANG HỌC</span>`;

  panel.innerHTML = `
    <!-- Top lesson overview card -->
    <div class="bg-game-card border border-indigo-500/15 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div class="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
      
      <div class="flex justify-between items-start flex-wrap gap-2 mb-3">
        <h4 class="font-poppins font-black text-sm text-white">${data.title}</h4>
        ${statusBadge}
      </div>
      <p class="text-xs text-slate-400 leading-relaxed">${data.desc}</p>
    </div>

    <!-- Lecture Video Simulator Card -->
    <div class="bg-game-card border border-indigo-500/15 rounded-3xl p-6 shadow-xl space-y-4">
      <h5 class="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
        <span class="text-red-500 text-base">🎥</span> Bài Giảng Hoạt Họa Mô Phỏng
      </h5>
      <div class="w-full aspect-video rounded-2xl bg-slate-950 border border-indigo-950 relative overflow-hidden flex flex-col items-center justify-center p-4">
        <!-- Visual simulator layout -->
        <div class="absolute inset-0 bg-radial-gradient from-indigo-500/15 to-transparent pointer-events-none"></div>
        <div class="z-10 text-center space-y-3">
          <button id="skill-play-btn-${nodeId}" onclick="watchLessonVideo('${nodeId}')" class="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white text-xl flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-110 active:scale-95 transition-all mx-auto cursor-pointer">
            <i class="fa-solid fa-play ml-1"></i>
          </button>
          <span class="block text-xs font-bold text-white max-w-sm mx-auto">${data.videoTitle}</span>
          <span class="block text-[10px] text-slate-400 font-semibold" id="video-timer-${nodeId}">Thời lượng: 3 phút 45 giây</span>
        </div>
      </div>
    </div>

    <!-- 3D Flip Flashcards -->
    <div class="bg-game-card border border-indigo-500/15 rounded-3xl p-6 shadow-xl space-y-3">
      <h5 class="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
        <span class="text-yellow-500 text-base">📇</span> Thẻ Ghi Nhớ Nhanh 3D (Flashcards)
      </h5>
      <p class="text-[10px] text-slate-400">Chạm hoặc click chuột để lật mặt thẻ xem định nghĩa thuật ngữ</p>
      
      <div class="flex justify-center py-4">
        <div onclick="flipCard(this)" class="w-72 h-40 bg-slate-950 border border-indigo-500/20 rounded-2xl cursor-pointer transition-all duration-500 relative transform hover:scale-102 shadow-2xl flex items-center justify-center p-6 text-center overflow-hidden group">
          <!-- Card Front side -->
          <div class="absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden group-[.flipped]:opacity-0 transition-opacity duration-300">
            <span class="text-2xl mb-1">❔</span>
            <span class="font-poppins font-black text-sm text-yellow-400 block">${data.frontCard}</span>
            <span class="text-[9px] text-slate-500 font-bold uppercase mt-3 tracking-widest">Click để lật mặt thẻ 🔄</span>
          </div>
          <!-- Card Back side -->
          <div class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-xs text-indigo-100 opacity-0 group-[.flipped]:opacity-100 transition-opacity duration-300">
            <span class="font-bold text-emerald-400 mb-1">KIẾN THỨC IC3:</span>
            <p class="leading-relaxed text-[11px]">${data.backCard}</p>
            <span class="text-[8px] text-slate-500 font-bold uppercase mt-3 tracking-widest">Click để đóng mặt thẻ 🔄</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini Practice Quiz -->
    <div class="bg-game-card border border-indigo-500/15 rounded-3xl p-6 shadow-xl space-y-4">
      <h5 class="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
        <span class="text-emerald-500 text-base">🎯</span> Thách Đấu Câu Hỏi Mini-Quiz
      </h5>
      <div class="p-4 rounded-2xl bg-slate-950 border border-indigo-950 space-y-3">
        <p class="text-xs font-bold text-white leading-relaxed">${data.quizQuestion}</p>
        
        <div class="space-y-2" id="mini-quiz-choices-${nodeId}">
          ${data.quizOptions.map((opt, i) => `
            <label class="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-xs text-slate-300 cursor-pointer">
              <input type="radio" name="mini-quiz-${nodeId}" value="${opt.charAt(0)}" class="accent-indigo-500">
              <span>${opt}</span>
            </label>
          `).join("")}
        </div>

        <div class="pt-2 flex justify-between items-center flex-wrap gap-2">
          <p class="text-[10px] text-slate-400 font-medium">🎁 Quà tặng: <span class="font-bold text-yellow-400">+15 EXP | +5 Coins 🪙</span></p>
          <button onclick="submitSkillQuiz('${nodeId}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer">
            NỘP ĐÁP ÁN
          </button>
        </div>
      </div>
    </div>
  `;
}

function flipCard(element) {
  element.classList.toggle("flipped");
}

function watchLessonVideo(nodeId) {
  const btn = document.getElementById(`skill-play-btn-${nodeId}`);
  const timer = document.getElementById(`video-timer-${nodeId}`);
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-white"></i>`;
  timer.innerText = "Đang tải bài giảng...";

  setTimeout(() => {
    btn.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i>`;
    timer.innerText = "✓ Đã xem bài giảng xong";
    
    // Reward EXP once per session
    currentStudent.exp += 10;
    
    // Save to Database
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const idx = students.findIndex(s => s.email === currentStudent.email);
    if (idx !== -1) {
      students[idx] = currentStudent;
      window.saveData(window.IC3_KEYS.STUDENTS, students);
    }

    window.showToast("🎉 Bạn đã tiếp thu kiến thức thành công và được cộng thêm +10 EXP thám hiểm!");
    loadStudentProfile();
  }, 2000);
}

function submitSkillQuiz(nodeId) {
  const selectedRadio = document.querySelector(`input[name="mini-quiz-${nodeId}"]:checked`);
  if (!selectedRadio) {
    window.showToast("Vui lòng click chọn một đáp án trước khi nộp bài!", 'error');
    return;
  }

  const ans = selectedRadio.value;
  const data = skillLessonData[nodeId];

  if (ans === data.correctAnswer) {
    window.showToast(`🎉 CHÍNH XÁC! Chúc mừng bạn đã trả lời đúng bài học mini-quiz.\nGiải thích: ${data.explanation}\n\n🎁 PHẦN THƯỞNG: +15 EXP | +5 Coins 🪙`);
    
    currentStudent.exp += 15;
    currentStudent.coins += 5;

    // Save lesson as completed/unlocked in student data
    if (!currentStudent.unlockedLessons.includes(data.lessonId)) {
      currentStudent.unlockedLessons.push(data.lessonId);
    }

    // Save student profile
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const idx = students.findIndex(s => s.email === currentStudent.email);
    if (idx !== -1) {
      students[idx] = currentStudent;
      window.saveData(window.IC3_KEYS.STUDENTS, students);
    }

    loadStudentProfile();
    renderSkillTree();
  } else {
    window.showToast(`❌ TIẾC QUÁ! Đáp án chưa chính xác.\nGợi ý giải thích: ${data.explanation}\n\nHãy ôn tập lại Flashcard và thử lại nhé!`, "error");
  }
}

// ==================== RENDERING: 6. TÚI ĐỒ (INVENTORY) ====================
function renderInventory() {
  if (!currentStudent.unlockedPokemons) {
    currentStudent.unlockedPokemons = ["pikachu", "charmander", "bulbasaur"];
  }

  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  const pokemonNames = {
    pikachu: "Pikachu Điện Sấm",
    charmander: "Charmander Lửa Thiêng",
    bulbasaur: "Bulbasaur Bão Lá",
    squirtle: "Squirtle Pháo Nước",
    eevee: "Eevee Biến Hóa"
  };

  // 1. Render Owned companions grid
  const companionGrid = document.getElementById("inventory-companions-grid");
  companionGrid.innerHTML = "";

  const allCompanionsDef = [
    { id: "pikachu", name: "Pikachu", img: "⚡", desc: "Sở hữu chiêu thức sấm sét rền vang." },
    { id: "charmander", name: "Charmander", img: "🔥", desc: "Sở hữu ngọn lửa thiêng bùng nổ." },
    { id: "bulbasaur", name: "Bulbasaur", img: "🌱", desc: "Sở hữu những nhát roi mây dẻo dai." },
    { id: "squirtle", name: "Squirtle", img: "💧", desc: "Sở hữu pháo nước bắn phá cực xa." },
    { id: "eevee", name: "Eevee", img: "🦊", desc: "Biến hóa linh hoạt ứng phó đa dạng." }
  ];

  allCompanionsDef.forEach(comp => {
    const isUnlocked = currentStudent.unlockedPokemons.includes(comp.id);
    const isCurrentActive = currentStudent.pokemon === comp.id;

    const div = document.createElement("div");
    
    if (isUnlocked) {
      div.className = `p-4 rounded-2xl border flex items-center gap-4 transition-all ${isCurrentActive ? 'bg-indigo-500/10 border-indigo-500 shadow-lg' : 'bg-slate-950 border-white/5 hover:border-white/10'}`;
      
      const actionBtn = isCurrentActive 
        ? `<span class="px-2 py-1 text-[8px] font-extrabold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest shrink-0">ĐANG ĐỒNG HÀNH</span>`
        : `<button onclick="selectInventoryCompanion('${comp.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all shrink-0 cursor-pointer">Đặt làm bạn đồng hành</button>`;

      div.innerHTML = `
        <span class="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-3xl shrink-0">${comp.img}</span>
        <div class="flex-grow">
          <h4 class="font-poppins font-black text-xs text-white">${pokemonNames[comp.id]}</h4>
          <p class="text-[9px] text-slate-400">${comp.desc}</p>
        </div>
        ${actionBtn}
      `;
    } else {
      div.className = "p-4 rounded-2xl border border-dashed border-white/5 bg-slate-950/40 opacity-40 flex items-center gap-4 cursor-not-allowed";
      div.innerHTML = `
        <span class="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-xl text-slate-600 shrink-0">🔒</span>
        <div class="flex-grow">
          <h4 class="font-poppins font-bold text-xs text-slate-500">${pokemonNames[comp.id]}</h4>
          <p class="text-[9px] text-slate-600">Mở khóa trong Cửa hàng để thu phục thần thú này</p>
        </div>
      `;
    }
    companionGrid.appendChild(div);
  });

  // 2. Render Owned Items grid
  if (!currentStudent.ownedItems) {
    currentStudent.ownedItems = [];
  }

  const itemsGrid = document.getElementById("inventory-items-grid");
  itemsGrid.innerHTML = "";

  const storeItemsDef = {
    reward_neon_frame: { name: "Khung Neon Lấp Lánh", img: "✨", desc: "Trang trí rực rỡ khung avatar." },
    reward_milktea: { name: "Voucher Trà Sữa 50k", img: "🧋", desc: "Đổi cốc Trà Sữa GongCha miễn phí." },
    reward_lucky_box: { name: "Hộp Quà May Mắn", img: "🎁", desc: "Mở hộp nhận EXP hoặc Coin ngẫu nhiên." }
  };

  if (currentStudent.ownedItems.length === 0) {
    itemsGrid.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-600 text-xs italic">
        Thư mục hành trang trống không! Đổi ngay thật nhiều Voucher quà từ Cửa Hàng nhé.
      </div>
    `;
  } else {
    currentStudent.ownedItems.forEach((itemId, idx) => {
      const item = storeItemsDef[itemId] || { name: "Vật phẩm lạ", img: "📦", desc: "Công cụ thám hiểm chưa xác định" };
      const div = document.createElement("div");
      div.className = "p-4 rounded-2xl border border-white/5 bg-slate-950 flex items-center justify-between gap-4";
      
      let actionEl = `<span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest shrink-0">Đã kích hoạt</span>`;
      if (itemId === "reward_lucky_box") {
        actionEl = `<button onclick="useInventoryItem(${idx})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-lg transition-all shrink-0 cursor-pointer">MỞ QUÀ 🎁</button>`;
      } else if (itemId === "reward_milktea") {
        actionEl = `<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-bold text-[9px]">GIFT CODE: ${Math.floor(Math.random() * 900000 + 100000)}</span>`;
      }

      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-2xl shrink-0">${item.img}</span>
          <div>
            <h4 class="font-poppins font-black text-xs text-white">${item.name}</h4>
            <p class="text-[9px] text-slate-400 leading-relaxed">${item.desc}</p>
          </div>
        </div>
        ${actionEl}
      `;
      itemsGrid.appendChild(div);
    });
  }

  // 3. Render Evolution Center requirements
  // Beginner -> Explorer (Req: 500 EXP)
  // Explorer -> Expert (Req: 1500 EXP)
  // Expert -> Master (Req: 3000 EXP)
  let nextExpReq = 500;
  let nextLevelName = "Explorer";

  if (currentStudent.level === "Explorer") {
    nextExpReq = 1500;
    nextLevelName = "Expert";
  } else if (currentStudent.level === "Expert") {
    nextExpReq = 3000;
    nextLevelName = "Master IC3";
  } else if (currentStudent.level === "Master IC3") {
    nextExpReq = 999999;
    nextLevelName = "Max Level đạt chuẩn";
  }

  document.getElementById("evolution-current-lvl").innerText = currentStudent.level.toUpperCase();
  document.getElementById("evolution-next-lvl").innerText = nextLevelName.toUpperCase();
  
  const isExpMet = currentStudent.exp >= nextExpReq;
  document.getElementById("evolution-exp-requirement-status").innerHTML = isExpMet
    ? `<span class="text-emerald-400 font-extrabold"><i class="fa-solid fa-circle-check"></i> ĐỦ ĐIỀU KIỆN (${currentStudent.exp}/${nextExpReq} EXP)</span>`
    : `<span class="text-slate-400 font-semibold"><i class="fa-regular fa-circle"></i> Chưa đủ (${currentStudent.exp}/${nextExpReq} EXP)</span>`;

  // Render Combat scores history log inside inventory tab as well
  renderScoresHistory();
}

function selectInventoryCompanion(pokeId) {
  currentStudent.pokemon = pokeId;
  
  // Save changes to database
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  window.showToast(`🎉 Đã đổi Pokémon đồng hành thành công! Thần thú hiện tại của bạn là ${pokeId.toUpperCase()}.`);
  loadStudentProfile();
  renderInventory();
  renderBattleArena();
}

function useInventoryItem(itemIndex) {
  if (!currentStudent.ownedItems) return;
  const itemId = currentStudent.ownedItems[itemIndex];
  if (!itemId) return;

  if (itemId === "reward_lucky_box") {
    const rewardsList = [
      { exp: 150, coins: 50, msg: "một túi thảo dược quý tăng thám hiểm +150 EXP & nhận +50 Coins vàng lấp lánh!" },
      { exp: 300, coins: 0, msg: "một bí kíp Computing Fundamentals thần bí mang lại cực khủng +300 EXP thám hiểm!" },
      { exp: 0, coins: 150, msg: "một rương kho báu vàng đầy lộc tăng thêm +150 Coins vàng rủng rỉnh 🪙!" }
    ];

    const chosen = rewardsList[Math.floor(Math.random() * rewardsList.length)];
    currentStudent.exp += chosen.exp;
    currentStudent.coins += chosen.coins;

    // Remove item from inventory
    currentStudent.ownedItems.splice(itemIndex, 1);

    // Save profile
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const idx = students.findIndex(s => s.email === currentStudent.email);
    if (idx !== -1) {
      students[idx] = currentStudent;
      window.saveData(window.IC3_KEYS.STUDENTS, students);
    }

    window.showToast(`🎁 BẠN ĐÃ MỞ HỘP QUÀ MAY MẮN THÀNH CÔNG!\nHộp quà chứa: ${chosen.msg}`);
    loadStudentProfile();
    renderInventory();
  }
}

function triggerEvolvePokemon() {
  let nextExpReq = 500;
  let nextLevelName = "Explorer";

  if (currentStudent.level === "Explorer") {
    nextExpReq = 1500;
    nextLevelName = "Expert";
  } else if (currentStudent.level === "Expert") {
    nextExpReq = 3000;
    nextLevelName = "Master IC3";
  } else if (currentStudent.level === "Master IC3") {
    window.showToast("Thần thú Pokémon của bạn đã đạt cấp tiến hóa tối cao MASTER IC3 siêu phàm! Không còn cấp tiến hóa nào hơn nữa.", 'error');
    return;
  }

  if (currentStudent.exp < nextExpReq) {
    window.showToast(`❌ TIẾN HÓA THẤT BẠI!\nBạn cần tích lũy tối thiểu ${nextExpReq} EXP bằng cách khiêu chiến làm bài thi và Mini-Quiz mới đủ năng lượng siêu thú.`, 'error');
    return;
  }

  // Elevate level!
  const previousLevel = currentStudent.level;
  currentStudent.level = nextLevelName;
  
  if (nextLevelName === "Explorer") currentStudent.rank = "Silver";
  else if (nextLevelName === "Expert") currentStudent.rank = "Gold";
  else if (nextLevelName === "Master IC3") currentStudent.rank = "Diamond";

  // Award special evolution badge
  if (!currentStudent.badges.includes("Persistent Warrior")) {
    currentStudent.badges.push("Persistent Warrior");
  }

  // Save changes
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  window.showToast(`🔮 TIẾN HÓA THẦN THỨ THÀNH CÔNG! 🔮\n\nChúc mừng thám hiểm giả! Pokémon và trình độ kiến thức của bạn đã thăng cấp thành công từ ${previousLevel.toUpperCase()} lên ${nextLevelName.toUpperCase()}!\n\nGiao diện thám hiểm, bảng xếp hạng và danh hiệu vương giả mới đã được cập nhật!`);
  
  loadStudentProfile();
  renderInventory();
}

function updateZoneLockUI(levelId, isUnlocked) {
  const card = document.getElementById(`zone-${levelId}`);
  const indicator = document.getElementById(`zone-lock-indicator-${levelId}`);
  
  if (isUnlocked) {
    card.classList.remove("locked");
    indicator.innerHTML = `<span class="text-emerald-400 font-extrabold"><i class="fa-solid fa-lock-open mr-1"></i> Đã mở khóa</span>`;
  } else {
    card.classList.add("locked");
    let reqStr = levelId === "level_2" ? "Yêu cầu: Explorer (500 EXP)" : "Yêu cầu: Expert (1500 EXP)";
    indicator.innerHTML = `<span class="text-slate-400 font-bold"><i class="fa-solid fa-lock mr-1"></i> ${reqStr}</span>`;
  }
}

function renderZoneQuizzes(levelId, zoneTests, allScores, isZoneUnlocked = true) {
  const container = document.getElementById(`quizzes-zone-${levelId}`);
  container.innerHTML = "";

  if (zoneTests.length === 0) {
    container.innerHTML = `<p class="text-[10px] text-slate-500 italic">Chưa có bài kiểm tra nào được thêm vào vùng này.</p>`;
    return;
  }

  zoneTests.forEach(test => {
    // Find best score for this student on this test
    const studentTestScores = allScores.filter(s => s.studentEmail === currentStudent.email && s.testId === test.id);
    let bestScoreText = "Chưa làm";
    let statusIcon = `<i class="fa-solid fa-circle-play text-indigo-400 text-sm group-hover:scale-110 transition-all"></i>`;

    if (studentTestScores.length > 0) {
      const maxScore = Math.max(...studentTestScores.map(s => s.score));
      bestScoreText = `Điểm cao nhất: ${maxScore}/100`;
      if (maxScore >= 50) {
        statusIcon = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>`;
      } else {
        statusIcon = `<i class="fa-solid fa-circle-exclamation text-yellow-500 text-sm"></i>`;
      }
    }

    const button = document.createElement("button");
    button.className = "quiz-item-btn group";
    
    // If zone is locked, disable action
    if (!isZoneUnlocked) {
      button.disabled = true;
      button.className = "quiz-item-btn opacity-50 cursor-not-allowed";
    }

    let diffIcon = "🟢";
    if (test.difficulty === "medium") diffIcon = "🟡";
    if (test.difficulty === "hard") diffIcon = "🔴";

    button.innerHTML = `
      <div class="flex items-center gap-2.5">
        ${statusIcon}
        <div>
          <span class="block text-white font-bold text-xs">${diffIcon} ${test.title}</span>
          <span class="text-[9px] text-slate-400 font-medium">${test.questionCount} câu hỏi • ${test.duration} phút • <span class="font-bold text-indigo-300">${bestScoreText}</span></span>
        </div>
      </div>
      <i class="fa-solid fa-chevron-right text-[10px] text-slate-500 group-hover:translate-x-1 transition-all"></i>
    `;

    if (isZoneUnlocked) {
      button.onclick = () => openTestModeSelection(test.id);
    }

    container.appendChild(button);
  });
}


// ==================== GAME PLAYING MODE (TEST ENGINE) ====================

// --- Anti-Cheat Module ---
window._isTestActiveForAntiCheat = false;

function enterAntiCheatMode() {
  window._isTestActiveForAntiCheat = true;
  
  // Request Fullscreen
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  } catch(e) {
    console.log("Fullscreen request failed", e);
  }
}

function exitAntiCheatMode() {
  window._isTestActiveForAntiCheat = false;
  
  // Exit Fullscreen
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  } catch(e) {
    console.log("Exit fullscreen failed", e);
  }
}

function showCheatToast() {
  const toast = document.createElement("div");
  toast.className = "fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-red-400 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold text-sm flex items-center gap-3 animate-bounce";
  toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-yellow-300 text-xl"></i> <span>PHÁT HIỆN GIAN LẬN! Bài thi đã bị hủy.</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function handleCheatDetected() {
  if (!window._isTestActiveForAntiCheat || isReviewingExam) return;
  
  showCheatToast();
  
  // Reset test
  exitAntiCheatMode();
  confirmExitGamePlayingDirectly();
}

// Anti-Cheat global listeners
document.addEventListener('contextmenu', e => {
  if (window._isTestActiveForAntiCheat && !isReviewingExam) e.preventDefault();
});

document.addEventListener('keydown', e => {
  if (!window._isTestActiveForAntiCheat || isReviewingExam) return;
  
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
    handleCheatDetected();
  }
  
  if (e.ctrlKey || e.metaKey) {
    const key = e.key ? e.key.toLowerCase() : '';
    if (['c', 'v', 'u', 'p', 's', 'r'].includes(key)) {
      e.preventDefault();
      handleCheatDetected();
    }
    
    if (e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      handleCheatDetected();
    }
  }
});

window.addEventListener('blur', () => {
  if (window._isTestActiveForAntiCheat && !isReviewingExam) {
    handleCheatDetected();
  }
});

function startTest(testId, mode = "practice") {
  currentTestMode = mode;
  isReviewingExam = false;
  examUserAnswers = [];

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  activePlayingTest = tests.find(t => t.id === testId);
  if (!activePlayingTest) return;

  // Enter anti-cheat and fullscreen when starting test
  enterAntiCheatMode();

  const allQuestions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [];
  
  // Filter questions that are in the test list
  testQuestions = allQuestions.filter(q => activePlayingTest.questions.includes(q.id));
  
  if (testQuestions.length === 0) {
    window.showToast("Lỗi: Bài kiểm tra này chưa được cài đặt câu hỏi. Vui lòng thử lại sau!", 'error');
    return;
  }

  // Pre-initialize examUserAnswers array with empty strings
  examUserAnswers = new Array(testQuestions.length).fill("");

  // Set initial game states
  activeQuestionIndex = 0;
  userAnswers = [];
  correctAnswersCount = 0;
  isAnswerChecked = false;

  // Initialize RPG Live Battle HP and Arena
  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  const pokemonNames = {
    pikachu: "Pikachu",
    charmander: "Charmander",
    bulbasaur: "Bulbasaur",
    squirtle: "Squirtle",
    eevee: "Eevee"
  };

  const bossesProfile = {
    test_l1: { name: "Thần Cây Dữ Liệu", avatar: "🌳" },
    test_l2: { name: "Office Robot", avatar: "🤖" },
    test_l3: { name: "Rồng Hỏa Ngục", avatar: "👾" }
  };

  const activePoke = currentStudent.pokemon || "pikachu";
  const bossProf = bossesProfile[testId] || { name: "Guardian", avatar: "🌳" };

  const baseHp = activePoke === "bulbasaur" ? 140 : activePoke === "squirtle" ? 130 : 100;
  playerMaxHP = baseHp + Math.floor(currentStudent.exp / 15);
  playerCurrentHP = playerMaxHP;
  
  bossMaxHP = testQuestions.length * 100;
  bossCurrentHP = bossMaxHP;

  const pokemonElements = {
    pikachu: { color: "bg-yellow-500/10 border-yellow-500/20", shadow: "drop-shadow-[0_2px_8px_rgba(250,204,21,0.3)]" },
    charmander: { color: "bg-orange-500/10 border-orange-500/20", shadow: "drop-shadow-[0_2px_8px_rgba(251,146,60,0.3)]" },
    bulbasaur: { color: "bg-emerald-500/10 border-emerald-500/20", shadow: "drop-shadow-[0_2px_8px_rgba(52,211,153,0.3)]" },
    squirtle: { color: "bg-blue-500/10 border-blue-500/20", shadow: "drop-shadow-[0_2px_8px_rgba(96,165,250,0.3)]" },
    eevee: { color: "bg-amber-500/10 border-amber-500/20", shadow: "drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]" }
  };
  const scenePokeData = pokemonElements[activePoke] || pokemonElements.pikachu;

  // Render initial health and titles to RPG Battle Arena
  const sceneAvatar = document.getElementById("battle-scene-player-avatar");
  if(sceneAvatar) {
    sceneAvatar.className = `text-3xl h-10 w-10 flex items-center justify-center rounded-xl border shrink-0 ${scenePokeData.color} ${scenePokeData.shadow}`;
    sceneAvatar.innerText = pokemonAvatars[activePoke] || "⚡";
  }
  document.getElementById("battle-scene-player-name").innerText = pokemonNames[activePoke] || "Pikachu";
  document.getElementById("battle-scene-player-hp-val").innerText = `${playerCurrentHP}/${playerMaxHP}`;
  document.getElementById("battle-scene-player-hp-bar").style.width = "100%";
  document.getElementById("battle-scene-player-status").innerText = "SẴN SÀNG!";

  document.getElementById("battle-scene-boss-avatar").innerText = bossProf.avatar;
  document.getElementById("battle-scene-boss-name").innerText = bossProf.name;
  document.getElementById("battle-scene-boss-hp-val").innerText = `${bossCurrentHP}/${bossMaxHP}`;
  document.getElementById("battle-scene-boss-hp-bar").style.width = "100%";
  document.getElementById("battle-scene-boss-status").innerText = "GỪ RỪ...";

  if (currentTestMode === "exam") {
    document.getElementById("battle-scene-log").innerText = "Chế độ Kiểm tra thám hiểm: Hãy suy nghĩ kỹ và trả lời tất cả các câu hỏi. Sát thương lên Boss sẽ được tổng hợp khi bạn nộp bài!";
    document.getElementById("battle-scene-player-status").innerText = "TẬP TRUNG!";
    document.getElementById("battle-scene-boss-status").innerText = "GỪ RỪ...";
  } else {
    document.getElementById("battle-scene-log").innerText = "Trận đấu bắt đầu! Hãy trả lời chính xác các câu hỏi để cùng Pokémon chiến thắng Boss!";
  }

  // Set Pokemon encourages text
  setPokemonEncourager();

  // Show full-screen overlay
  document.getElementById("game-playing-screen").classList.remove("hidden");
  document.getElementById("game-test-title").innerText = activePlayingTest.title;
  
  const levelLabels = {
    level_1: "Computing Fundamentals (L1)",
    level_2: "Key Applications (L2)",
    level_3: "Living Online (L3)"
  };
  document.getElementById("game-test-level-badge").innerText = levelLabels[activePlayingTest.level] || "IC3 Sparks";

  // Start Timer Countdown (Convert minutes to seconds)
  remainingSeconds = activePlayingTest.duration * 60;
  runGameTimer();

  // Load first question
  renderGameQuestion();
}

function setPokemonEncourager() {
  const lines = {
    pikachu: [
      "Pikachu tin bạn làm được mà! ⚡",
      "Cố lên, hãy bùng nổ sấm sét trí tuệ! ⚡",
      "Một thử thách nhỏ không thể làm khó tụi mình! ⚡"
    ],
    charmander: [
      "Charmander đang cổ vũ cực nhiệt! 🔥",
      "Ngọn lửa nhiệt huyết đang bùng cháy trong tim! 🔥",
      "Tiến lên thêu cháy mọi câu hỏi khó nào! 🔥"
    ],
    bulbasaur: [
      "Bulbasaur gửi năng lượng xanh mát lành! 🌱",
      "Hãy bình tĩnh và suy luận sắc bén nhé! 🌱",
      "Từng bước nhỏ sẽ mang lại thắng lợi to lớn! 🌱"
    ],
    squirtle: [
      "Squirtle bắn tia nước thông thái cứu nguy! 💧",
      "Mọi việc sẽ suôn sẻ như dòng nước mát! 💧",
      "Cứ tự tin thể hiện kiến thức chuẩn IC3 nha! 💧"
    ],
    eevee: [
      "Eevee vẫy đuôi tiếp thêm may mắn đây! 🦊",
      "Sự tập trung sẽ mang lại kết quả ngọt ngào! 🦊",
      "Bạn là nhà thám hiểm tuyệt vời nhất! 🦊"
    ]
  };

  const pokemonLines = lines[currentStudent.pokemon] || lines["pikachu"];
  const randomLine = pokemonLines[Math.floor(Math.random() * pokemonLines.length)];
  document.getElementById("pokemon-encourager-text").innerText = randomLine;
}

function runGameTimer() {
  if (testTimerInterval) clearInterval(testTimerInterval);

  const timerEl = document.getElementById("game-timer");
  
  const updateTimerDisplay = () => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    timerEl.innerText = `${pad(mins)}:${pad(secs)}`;

    if (remainingSeconds <= 0) {
      clearInterval(testTimerInterval);
      window.showToast("Hết thời gian làm bài! Hệ thống sẽ tự động nộp bài thi.");
      if (currentTestMode === "exam") {
        executeSubmitExamCalculation();
      } else {
        finishTest();
      }
    }
    remainingSeconds--;
  };

  updateTimerDisplay();
  testTimerInterval = setInterval(updateTimerDisplay, 1000);
}

function renderGameQuestion() {
  window.renderNavigationPanel();
  let isQuestionAnswered = false;
  if (isReviewingExam) {
    isQuestionAnswered = true;
  } else if (currentTestMode === "practice") {
    isQuestionAnswered = activeQuestionIndex < userAnswers.length;
  } else {
    isQuestionAnswered = false;
  }
  isAnswerChecked = isQuestionAnswered;

  const q = testQuestions[activeQuestionIndex];
  
  // Progress indicators
  const totalQ = testQuestions.length;
  document.getElementById("game-progress-text").innerText = `Câu ${activeQuestionIndex + 1}/${totalQ}`;
  
  const progressPercent = Math.round(((activeQuestionIndex) / totalQ) * 100);
  document.getElementById("game-progress-bar").style.width = `${progressPercent}%`;

  // Show/hide previous button
  const prevBtn = document.getElementById("game-prev-btn");
  if (prevBtn) {
    if (activeQuestionIndex > 0) {
      prevBtn.classList.remove("hidden");
    } else {
      prevBtn.classList.add("hidden");
    }
  }

  // Next/Check button text
  if (isReviewingExam) {
    const isLast = activeQuestionIndex === testQuestions.length - 1;
    document.getElementById("game-next-btn").innerHTML = isLast 
      ? `Hoàn thành xem lại <i class="fa-solid fa-check-double ml-1.5 text-emerald-400"></i>`
      : `Câu tiếp theo <i class="fa-solid fa-angle-right ml-1.5"></i>`;
  } else if (currentTestMode === "exam") {
    const isLast = activeQuestionIndex === testQuestions.length - 1;
    document.getElementById("game-next-btn").innerHTML = isLast 
      ? `Nộp bài thi thám hiểm <i class="fa-solid fa-flag-checkered ml-1.5 text-yellow-400"></i>`
      : `Câu tiếp theo <i class="fa-solid fa-angle-right ml-1.5"></i>`;
  } else {
    if (isQuestionAnswered) {
      const isLast = activeQuestionIndex === testQuestions.length - 1;
      document.getElementById("game-next-btn").innerHTML = isLast 
        ? `Nộp bài thi thám hiểm <i class="fa-solid fa-flag-checkered ml-1.5 text-yellow-400"></i>`
        : `Câu tiếp theo <i class="fa-solid fa-angle-right ml-1.5"></i>`;
    } else {
      document.getElementById("game-next-btn").innerHTML = `Kiểm tra đáp án <i class="fa-solid fa-circle-check ml-1.5"></i>`;
    }
  }

  // Render question text
  document.getElementById("game-question-text").innerText = q.question;

  // Render question image if present
  const qImgContainer = document.getElementById("game-question-image-container");
  const qImgElement = document.getElementById("game-question-image");
  if (qImgContainer && qImgElement) {
    if (q.image) {
      qImgElement.src = convertDriveUrl(q.image);
      qImgContainer.classList.remove("hidden");
    } else {
      qImgElement.src = "";
      qImgContainer.classList.add("hidden");
    }
  }

  // Render option selections based on type
  const container = document.getElementById("game-options-container");
  container.innerHTML = "";
  
  // Reset/fetch active answers state
  if (isReviewingExam) {
    currentSelectedAnswer = userAnswers[activeQuestionIndex];
  } else if (currentTestMode === "practice") {
    if (isQuestionAnswered) {
      currentSelectedAnswer = userAnswers[activeQuestionIndex];
    } else {
      currentSelectedAnswer = "";
    }
  } else {
    currentSelectedAnswer = examUserAnswers[activeQuestionIndex] !== undefined ? examUserAnswers[activeQuestionIndex] : "";
  }
  window.draggedTextAnswers = [];
  window.multiChoiceSelected = [];

  const type = q.type || "choice";

  if (type === "choice" || type === "multiple_choice" || type === "true_false") {
    const options = q.options || [];
    options.forEach((opt, idx) => {
      const isLegacyMultChoice = type === "multiple_choice";
      const label = isLegacyMultChoice ? opt.charAt(0) : idx;
      
      const btn = document.createElement("button");
      let extraClass = "";
      
      if (isQuestionAnswered) {
        const isUserSelected = currentSelectedAnswer === label;
        if (type === "choice") {
          const isCorrectIdx = idx === q.correctIndex;
          if (isUserSelected && isCorrectIdx) {
            extraClass = " correct selected";
          } else if (isUserSelected && !isCorrectIdx) {
            extraClass = " wrong selected";
          } else if (isCorrectIdx) {
            extraClass = " correct";
          }
        } else { // multiple_choice or true_false
          const isCorrect = opt.startsWith(q.answer) || opt === q.answer;
          if (isUserSelected && isCorrect) {
            extraClass = " correct selected";
          } else if (isUserSelected && !isCorrect) {
            extraClass = " wrong selected";
          } else if (isCorrect) {
            extraClass = " correct";
          }
        }
      } else {
        // If not checked but it is currently selected (for Exam mode)
        if (currentSelectedAnswer !== "" && currentSelectedAnswer === label) {
          extraClass = " selected border-indigo-500 bg-indigo-500/10";
        }
      }

      btn.className = "option-card-btn flex items-center p-5 sm:p-6 w-full bg-[#131b2e]/60 hover:bg-[#1c2742]/85 border-2 border-slate-800/90 rounded-2xl transition-all duration-250 text-left cursor-pointer group text-slate-100 shadow-md relative" + extraClass;
      btn.innerHTML = `
        <span class="w-10 h-10 rounded-full bg-indigo-950/80 border-2 border-indigo-500/30 text-indigo-400 flex items-center justify-center text-base font-black mr-4 shrink-0 transition-all group-hover:border-indigo-500 group-hover:text-indigo-300 shadow-inner">${isLegacyMultChoice ? opt.slice(0, 2) : (idx + 1)}</span>
        <span class="text-base sm:text-lg font-semibold leading-relaxed">${isLegacyMultChoice ? opt.slice(2).trim() : opt}</span>
      `;
      btn.onclick = () => {
        if (isAnswerChecked) return;
        document.querySelectorAll(".option-card-btn").forEach(el => el.classList.remove("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]"));
        btn.classList.add("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]");
        currentSelectedAnswer = label;
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
        }
      };
      container.appendChild(btn);
    });

  } else if (type === "drag_text") {
    let savedAnswers = new Array(q.rows.length).fill("");
    if (isQuestionAnswered) {
      try {
        savedAnswers = typeof currentSelectedAnswer === "string" ? JSON.parse(currentSelectedAnswer) : currentSelectedAnswer;
      } catch (e) {
        savedAnswers = currentSelectedAnswer || new Array(q.rows.length).fill("");
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      try {
        savedAnswers = typeof examUserAnswers[activeQuestionIndex] === "string" ? JSON.parse(examUserAnswers[activeQuestionIndex]) : examUserAnswers[activeQuestionIndex];
      } catch (e) {
        savedAnswers = examUserAnswers[activeQuestionIndex] || new Array(q.rows.length).fill("");
      }
    }
    window.draggedTextAnswers = savedAnswers;
    
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-6 w-full";
    
    let rowsHtml = `<div class="space-y-4">`;
    q.rows.forEach((row, rIdx) => {
      const placed = savedAnswers[rIdx];
      const correct = q.correctAnswers[rIdx];
      let slotClass = "flex items-center justify-center min-w-[220px] h-14 px-6 rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#131b2e]/40 text-sm font-black text-indigo-300 cursor-pointer hover:border-indigo-500 hover:bg-[#131b2e]/80 transition-all";
      let slotText = "Nhấp từ khóa để điền...";
      let tipHtml = "";

      if (isQuestionAnswered) {
        if (placed === correct) {
          slotClass = "flex items-center justify-center min-w-[220px] h-14 px-6 rounded-2xl border border-emerald-500 bg-emerald-500/15 text-sm font-black text-emerald-400";
          slotText = placed;
        } else {
          slotClass = "flex items-center justify-center min-w-[220px] h-14 px-6 rounded-2xl border border-red-500 bg-red-500/15 text-sm font-black text-red-400";
          slotText = placed || "(Trống)";
          tipHtml = `<span class="block text-xs font-black text-emerald-400 mt-1.5">✓ Đáp án đúng: ${correct}</span>`;
        }
      } else if (placed) {
        slotClass = "flex items-center justify-center min-w-[220px] h-14 px-6 rounded-2xl border-2 border-indigo-500 bg-indigo-500/15 text-sm font-black text-white cursor-pointer hover:bg-indigo-500/25 transition-all";
        slotText = placed;
      }

      rowsHtml += `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-slate-950 border border-slate-800/80 gap-3">
          <span class="text-base font-black text-slate-200">${row.label}</span>
          <div>
            <div id="drag-text-target-${rIdx}" onclick="clearDraggedText(${rIdx})" 
                 class="${slotClass}">
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
      poolHtml = `
        <div class="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 mt-4">
          <span class="text-xs font-black text-indigo-300 block uppercase tracking-wider mb-3">Thẻ từ khóa có sẵn (nhấp để xếp vào ô):</span>
          <div class="flex flex-wrap gap-2.5" id="drag-text-pool">
            ${q.options.map((opt, idx) => {
              const isUsed = savedAnswers.includes(opt);
              const disabledClass = isUsed ? " opacity-30 pointer-events-none" : "";
              return `
                <button id="drag-text-pool-btn-${idx}" onclick="placeDraggedText('${opt.replace(/'/g, "\\'")}', ${idx})" 
                        class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all shadow-md cursor-pointer hover:scale-[1.03] active:scale-95 duration-150${disabledClass}">
                  ${opt}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    
    wrapper.innerHTML = rowsHtml + poolHtml;
    container.appendChild(wrapper);

  } else if (type === "drag_image_text") {
    let savedAnswers = new Array(q.leftImages.length).fill("");
    if (isQuestionAnswered) {
      try {
        savedAnswers = typeof currentSelectedAnswer === "string" ? JSON.parse(currentSelectedAnswer) : currentSelectedAnswer;
      } catch (e) {
        savedAnswers = currentSelectedAnswer || new Array(q.leftImages.length).fill("");
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      try {
        savedAnswers = typeof examUserAnswers[activeQuestionIndex] === "string" ? JSON.parse(examUserAnswers[activeQuestionIndex]) : examUserAnswers[activeQuestionIndex];
      } catch (e) {
        savedAnswers = examUserAnswers[activeQuestionIndex] || new Array(q.leftImages.length).fill("");
      }
    }
    window.draggedTextAnswers = savedAnswers;
    
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-6 w-full";
    
    let imagesHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
    q.leftImages.forEach((imgUrl, idx) => {
      const placed = savedAnswers[idx];
      const correct = q.correctAnswers[idx];
      let slotClass = "w-full h-14 px-4 rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#131b2e]/40 text-sm font-black text-indigo-300 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-[#131b2e]/80 transition-all";
      let slotText = "Nhấp nhãn để ghép...";
      let tipHtml = "";

      if (isQuestionAnswered) {
        if (placed === correct) {
          slotClass = "w-full h-14 px-4 rounded-2xl border border-emerald-500 bg-emerald-500/15 text-sm font-black text-emerald-400 flex items-center justify-center";
          slotText = placed;
        } else {
          slotClass = "w-full h-14 px-4 rounded-2xl border border-red-500 bg-red-500/15 text-sm font-black text-red-400 flex items-center justify-center";
          slotText = placed || "(Trống)";
          tipHtml = `<span class="block text-xs font-black text-emerald-400 mt-1.5 text-center">✓ Đúng: ${correct}</span>`;
        }
      } else if (placed) {
        slotClass = "w-full h-14 px-4 rounded-2xl border-2 border-indigo-500 bg-indigo-500/15 text-sm font-black text-white flex items-center justify-center cursor-pointer hover:bg-indigo-500/25 transition-all";
        slotText = placed;
      }

      imagesHtml += `
        <div class="flex flex-row items-center p-5 rounded-2xl bg-slate-950 border border-slate-800/80 gap-4">
          <img src="${convertDriveUrl(imgUrl)}" referrerPolicy="no-referrer" class="h-24 w-24 object-contain rounded-xl bg-white p-2 border border-slate-800" alt="Linh kiện">
          <div class="flex-grow">
            <div id="drag-image-target-${idx}" onclick="clearDraggedImageText(${idx})" 
                 class="${slotClass}">
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
      poolHtml = `
        <div class="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 mt-4">
          <span class="text-xs font-black text-indigo-300 block uppercase tracking-wider mb-3">Nhãn tên linh kiện:</span>
          <div class="flex flex-wrap gap-2.5" id="drag-image-pool">
            ${q.options.map((opt, idx) => {
              const isUsed = savedAnswers.includes(opt);
              const disabledClass = isUsed ? " opacity-30 pointer-events-none" : "";
              return `
                <button id="drag-image-pool-btn-${idx}" onclick="placeDraggedImageText('${opt.replace(/'/g, "\\'")}', ${idx})" 
                        class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all shadow-md cursor-pointer hover:scale-[1.03] active:scale-95 duration-150${disabledClass}">
                  ${opt}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    
    wrapper.innerHTML = imagesHtml + poolHtml;
    container.appendChild(wrapper);

  } else if (type === "table_match") {
    let savedAnswers = [];
    if (isQuestionAnswered) {
      try {
        savedAnswers = typeof currentSelectedAnswer === "string" ? JSON.parse(currentSelectedAnswer) : currentSelectedAnswer;
      } catch (e) {
        savedAnswers = currentSelectedAnswer || [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      try {
        savedAnswers = typeof examUserAnswers[activeQuestionIndex] === "string" ? JSON.parse(examUserAnswers[activeQuestionIndex]) : examUserAnswers[activeQuestionIndex];
      } catch (e) {
        savedAnswers = examUserAnswers[activeQuestionIndex] || [];
      }
    }

    const wrapper = document.createElement("div");
    wrapper.className = "w-full overflow-hidden rounded-3xl border border-slate-800 bg-[#0d1424]/80 shadow-2xl";
    
    let tableHtml = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-indigo-950/40 border-b border-slate-800 text-xs font-black text-indigo-300 uppercase tracking-wider">
            <th class="p-5 w-1/2">${q.headers ? q.headers[0] : "Khái niệm"}</th>
            <th class="p-5 w-1/2">${q.headers ? q.headers[1] : "Đặc tính ghép nối"}</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    q.rows.forEach((row, rIdx) => {
      const placedIdx = savedAnswers[rIdx];
      const correctIdx = q.correctAnswers[rIdx];
      
      let selectClass = "w-full bg-[#131b2e]/60 border-2 border-slate-800/90 focus:border-indigo-500 text-sm font-bold text-slate-100 rounded-2xl p-3.5 outline-none transition-all cursor-pointer";
      let disabledAttr = "";
      let tipHtml = "";

      if (isQuestionAnswered) {
        disabledAttr = "disabled";
        if (placedIdx === correctIdx) {
          selectClass = "w-full bg-[#131b2e]/60 border-2 border-emerald-500 text-emerald-400 focus:border-indigo-500 text-sm font-bold rounded-2xl p-3.5 outline-none transition-all";
        } else {
          selectClass = "w-full bg-[#131b2e]/60 border-2 border-red-500 text-red-400 focus:border-indigo-500 text-sm font-bold rounded-2xl p-3.5 outline-none transition-all";
          tipHtml = `<span class="block text-xs font-black text-emerald-400 mt-1.5">✓ Đúng: ${q.options[correctIdx]}</span>`;
        }
      } else {
        // If has value chosen
        if (placedIdx !== undefined && placedIdx !== "") {
          selectClass = "w-full bg-[#131b2e]/60 border-2 border-indigo-500 text-white focus:border-indigo-500 text-sm font-bold rounded-2xl p-3.5 outline-none transition-all cursor-pointer";
        }
      }

      tableHtml += `
        <tr class="border-b border-slate-900 hover:bg-white/2 transition-colors">
          <td class="p-5 text-sm font-black text-slate-200">${row}</td>
          <td class="p-5">
            <select id="table-match-select-${rIdx}" onchange="changeTableMatchSelect(${rIdx})" ${disabledAttr}
                    class="${selectClass}">
              <option value="">-- Chọn đáp án --</option>
              ${q.options.map((opt, oIdx) => {
                const isSelected = placedIdx === oIdx;
                const selectedAttr = isSelected ? "selected" : "";
                return `
                  <option value="${oIdx}" ${selectedAttr}>${opt}</option>
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
    container.appendChild(wrapper);

  } else if (type === "hotspot") {
    window.hotspotClicks = [];
    if (isQuestionAnswered) {
      try {
        window.hotspotClicks = typeof currentSelectedAnswer === "string" ? JSON.parse(currentSelectedAnswer) : (currentSelectedAnswer || []);
      } catch (e) {
        window.hotspotClicks = [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      try {
        window.hotspotClicks = typeof examUserAnswers[activeQuestionIndex] === "string" ? JSON.parse(examUserAnswers[activeQuestionIndex]) : examUserAnswers[activeQuestionIndex];
      } catch (e) {
        window.hotspotClicks = [];
      }
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-4";
    
    wrapper.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <div class="text-sm text-indigo-300">Vui lòng nhấp vào <span class="font-bold text-white">${q.requiredCount || 1}</span> vị trí tương ứng trên ảnh:</div>
        <button type="button" onclick="window.clearHotspots()" class="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded px-2 py-1">Clear hết</button>
      </div>
      <div id="student-hotspot-container" class="relative inline-block border-2 border-indigo-500/30 rounded bg-[#131424] max-w-full overflow-hidden" style="cursor: crosshair;">
        <img id="student-hotspot-img" src="${convertDriveUrl(q.imageUrl)}" style="max-width: 100%; display: block; user-select: none;" draggable="false">
        <div id="student-hotspot-overlay" class="absolute inset-0"></div>
      </div>
    `;
    container.appendChild(wrapper);

    setTimeout(() => {
        const overlay = document.getElementById('student-hotspot-overlay');
        const img = document.getElementById('student-hotspot-img');
        if (!overlay || !img) return;

        window.clearHotspots = () => {
            window.hotspotClicks = [];
            drawClicks();
        }

        const drawClicks = () => {
            overlay.innerHTML = '';
            console.log('Drawing clicks. isQuestionAnswered:', isQuestionAnswered, 'hotspotClicks:', window.hotspotClicks, 'currentSelectedAnswer:', currentSelectedAnswer);
            window.hotspotClicks.forEach((click, i) => {
                const marker = document.createElement('div');
                marker.className = "absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white bg-blue-500/80 flex items-center justify-center text-[10px] text-white font-bold cursor-grab shadow-lg z-10";
                marker.style.left = `${click.x}%`;
                marker.style.top = `${click.y}%`;
                marker.innerText = i + 1;
                marker.draggable = true;
                marker.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', i);
                    marker.style.opacity = '0.5';
                });
                marker.addEventListener('dragend', (e) => {
                    marker.style.opacity = '1';
                });
                marker.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.hotspotClicks.splice(i, 1);
                    drawClicks();
                });
                overlay.appendChild(marker);
            });
            // Show correct answers if it's already answered
            if (isQuestionAnswered) {
                console.log('Rendering correct hotspots:', q.hotspots);
                (q.hotspots || []).forEach(area => {
                    const box = document.createElement('div');
                    box.className = "absolute border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none z-0";
                    box.style.left = `${area.x}%`;
                    box.style.top = `${area.y}%`;
                    box.style.width = `${area.w}%`;
                    box.style.height = `${area.h}%`;
                    overlay.appendChild(box);
                });
            }
        };

        overlay.addEventListener('dragover', (e) => e.preventDefault());
        overlay.addEventListener('drop', (e) => {
            e.preventDefault();
            if (isQuestionAnswered) return;
            const index = e.dataTransfer.getData('text/plain');
            if (index === '') return;
            const rect = overlay.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            window.hotspotClicks[index] = { x, y };
            currentSelectedAnswer = [...window.hotspotClicks];
            drawClicks();
        });

        drawClicks();
        window.drawClicks = drawClicks;

        if (!isQuestionAnswered) {
            overlay.addEventListener('click', (e) => {
                const rect = overlay.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                if (window.hotspotClicks.length < (q.requiredCount || 1)) {
                    window.hotspotClicks.push({ x, y });
                } else {
                    // Replace the last click if over limit, or cycle. Let's replace the oldest, or just prevent.
                    // For simplicity, cycle by removing the first if they keep clicking.
                    window.hotspotClicks.shift();
                    window.hotspotClicks.push({ x, y });
                }
                drawClicks();
                currentSelectedAnswer = [...window.hotspotClicks];
            });
        }
    }, 50);

  } else if (type === "hotspot") {
      let parsedAns = [];
      try {
        parsedAns = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
      } catch (e) {
        parsedAns = studentAns || [];
      }
      if (Array.isArray(parsedAns) && parsedAns.length >= (item.requiredCount || 1)) {
         let allValid = true;
         parsedAns.forEach(click => {
            let hit = false;
            (item.hotspots || []).forEach(area => {
                if (click.x >= area.x && click.x <= area.x + area.w && click.y >= area.y && click.y <= area.y + area.h) hit = true;
            });
            if (!hit) allValid = false;
         });
         isCorrect = allValid;
      } else {
         isCorrect = false;
      }
    } else if (type === "multi_choice") {
    let savedSelected = [];
    if (isQuestionAnswered) {
      try {
        savedSelected = typeof currentSelectedAnswer === "string" ? JSON.parse(currentSelectedAnswer) : currentSelectedAnswer;
      } catch (e) {
        savedSelected = currentSelectedAnswer || [];
      }
    } else if (currentTestMode === "exam" && examUserAnswers[activeQuestionIndex]) {
      try {
        savedSelected = typeof examUserAnswers[activeQuestionIndex] === "string" ? JSON.parse(examUserAnswers[activeQuestionIndex]) : examUserAnswers[activeQuestionIndex];
      } catch (e) {
        savedSelected = examUserAnswers[activeQuestionIndex] || [];
      }
    }
    window.multiChoiceSelected = savedSelected;

    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      const isSelected = savedSelected.includes(idx);
      const isCorrect = q.correctIndices.includes(idx);
      
      let extraClass = "";
      let boxClass = "w-6 h-6 rounded-lg border-2 border-slate-600/80 flex items-center justify-center text-xs font-black mr-4 bg-slate-950/80 transition-all";
      let boxInner = "";

      if (isQuestionAnswered) {
        if (isCorrect) {
          extraClass = " correct";
          boxClass = "w-6 h-6 rounded-lg border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center text-xs font-black mr-4 transition-all";
          boxInner = `<i class="fa-solid fa-check text-[10px] text-white"></i>`;
        } else if (isSelected) {
          extraClass = " wrong";
          boxClass = "w-6 h-6 rounded-lg border-2 border-red-500 bg-red-500 flex items-center justify-center text-xs font-black mr-4 transition-all";
          boxInner = `<i class="fa-solid fa-xmark text-[10px] text-white"></i>`;
        }
      } else if (isSelected) {
        extraClass = " selected border-indigo-500 bg-indigo-500/10";
        boxClass = "w-6 h-6 rounded-lg border-2 border-indigo-500 bg-indigo-500 flex items-center justify-center text-xs font-black mr-4 transition-all";
        boxInner = `<i class="fa-solid fa-check text-[10px] text-white"></i>`;
      }

      btn.className = "option-card-btn flex items-center justify-between p-5 sm:p-6 w-full bg-[#131b2e]/60 hover:bg-[#1c2742]/85 border-2 border-slate-800/90 rounded-2xl transition-all duration-250 text-left cursor-pointer group text-slate-100 shadow-md relative" + extraClass;
      btn.innerHTML = `
        <div class="flex items-center">
          <span id="multi-check-box-${idx}" class="${boxClass}">${boxInner}</span>
          <span class="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed">${opt}</span>
        </div>
      `;
      btn.onclick = () => {
        if (isAnswerChecked) return;
        const box = document.getElementById(`multi-check-box-${idx}`);
        const idxOf = window.multiChoiceSelected.indexOf(idx);
        if (idxOf !== -1) {
          window.multiChoiceSelected.splice(idxOf, 1);
          btn.classList.remove("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]");
          box.innerHTML = "";
          box.className = "w-6 h-6 rounded-lg border-2 border-slate-600/80 flex items-center justify-center text-xs font-black mr-4 bg-slate-950/80 transition-all";
        } else {
          window.multiChoiceSelected.push(idx);
          btn.classList.add("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]");
          box.innerHTML = `<i class="fa-solid fa-check text-[10px] text-white"></i>`;
          box.className = "w-6 h-6 rounded-lg border-2 border-indigo-500 bg-indigo-500 flex items-center justify-center text-xs font-black mr-4 transition-all";
        }
        currentSelectedAnswer = JSON.stringify(window.multiChoiceSelected);
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
        }
      };
      container.appendChild(btn);
    });

  } else if (type === "image_choice") {
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-5 w-full";
    
    q.options.forEach((optImgUrl, idx) => {
      const card = document.createElement("div");
      
      let extraClass = "";
      let badgeClass = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center bg-slate-950/80 transition-all";
      let badgeInner = "";

      if (isQuestionAnswered) {
        const isUserSelected = currentSelectedAnswer !== "" && parseInt(currentSelectedAnswer) === idx;
        const isCorrect = idx === q.correctIndex;
        if (isUserSelected && isCorrect) {
          extraClass = " border-emerald-500 bg-emerald-500/15 selected shadow-[0_0_15px_rgba(16,185,129,0.2)]";
          badgeClass = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeInner = "✓";
        } else if (isUserSelected && !isCorrect) {
          extraClass = " border-red-500 bg-red-500/15 selected shadow-[0_0_15px_rgba(239,68,68,0.2)]";
          badgeClass = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-red-500 bg-red-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeInner = "✗";
        } else if (isCorrect) {
          extraClass = " border-emerald-500 bg-emerald-500/15";
          badgeClass = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeInner = "✓";
        }
      } else {
        // If not checked but it is currently selected (for Exam mode)
        const isCurrentlySelected = currentSelectedAnswer !== "" && parseInt(currentSelectedAnswer) === idx;
        if (isCurrentlySelected) {
          extraClass = " border-indigo-500 bg-indigo-500/15 selected shadow-[0_0_15px_rgba(99,102,241,0.2)]";
          badgeClass = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-indigo-500 bg-indigo-500 text-white flex items-center justify-center text-xs font-black shadow-md";
          badgeInner = "✓";
        }
      }

      card.className = "image-choice-card border-2 border-slate-800/95 bg-[#131b2e]/60 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-[#1c2742]/85 transition-all relative overflow-hidden group h-44 shadow-lg" + extraClass;
      card.innerHTML = `
        <img src="${convertDriveUrl(optImgUrl)}" referrerPolicy="no-referrer" class="h-28 w-auto object-contain transition-transform duration-300 group-hover:scale-105" alt="Lựa chọn">
        <div class="absolute bottom-3 left-3 text-xs font-black uppercase text-slate-400 tracking-wider">Lựa chọn ${idx + 1}</div>
        <div id="image-choice-badge-${idx}" class="${badgeClass}">${badgeInner}</div>
      `;
      card.onclick = () => {
        if (isAnswerChecked) return;
        document.querySelectorAll(".image-choice-card").forEach(el => {
          el.classList.remove("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]");
        });
        document.querySelectorAll("[id^='image-choice-badge-']").forEach(el => {
          el.innerHTML = "";
          el.className = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center bg-slate-950/80 transition-all";
        });
        
        card.classList.add("selected", "border-indigo-500", "bg-indigo-500/10", "shadow-[0_0_15px_rgba(99,102,241,0.2)]");
        const badge = document.getElementById(`image-choice-badge-${idx}`);
        badge.innerHTML = "✓";
        badge.className = "absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-indigo-500 bg-indigo-500 text-white flex items-center justify-center text-xs font-black shadow-md";
        
        currentSelectedAnswer = idx;
        if (currentTestMode === "exam") {
          examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
        }
      };
      grid.appendChild(card);
    });
    container.appendChild(grid);

  } else if (type === "fill_blank") {
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-2";
    let extraClass = "";
    let valueAttr = "";
    if (isQuestionAnswered) {
      const isCorrect = currentSelectedAnswer.toLowerCase() === q.answer.toLowerCase();
      extraClass = isCorrect ? " border-emerald-500 bg-emerald-500/10 text-emerald-400" : " border-red-500 bg-red-500/10 text-red-400";
      valueAttr = `value="${currentSelectedAnswer}" disabled`;
    } else if (currentTestMode === "exam") {
      const savedVal = examUserAnswers[activeQuestionIndex] || "";
      valueAttr = `value="${savedVal}"`;
    }
    wrapper.innerHTML = `
      <input type="text" id="blank-input" placeholder="Gõ câu trả lời chính xác của bạn vào đây..." ${valueAttr}
        oninput="saveBlankInput(this.value)"
        class="w-full bg-[#131b2e]/60 border-2 border-indigo-950 focus:border-indigo-500 rounded-2xl px-6 py-5 text-white font-bold text-base sm:text-lg focus:outline-none transition-all${extraClass}">
    `;
    if (isQuestionAnswered && currentSelectedAnswer.toLowerCase() !== q.answer.toLowerCase()) {
      const tip = document.createElement("p");
      tip.className = "text-xs font-bold text-emerald-400 mt-2";
      tip.innerHTML = `<i class="fa-solid fa-circle-check"></i> Đáp án đúng: <span class="underline">${q.answer}</span>`;
      wrapper.appendChild(tip);
    }
    container.appendChild(wrapper);
  }

  // Handle explanation and status text for answered questions
  if (isQuestionAnswered) {
    document.getElementById("game-explanation-text").innerText = q.explanation;
    document.getElementById("game-explanation-box").classList.remove("hidden");
  } else {
    document.getElementById("game-explanation-box").classList.add("hidden");
  }
}

function prevGameQuestion() {
  if (activeQuestionIndex > 0) {
    activeQuestionIndex--;
    renderGameQuestion();
  }
}

// Interactive helper click handlers for Drag and match types
function placeDraggedText(text, btnIdx) {
  if (isAnswerChecked) return;
  
  const emptyIdx = window.draggedTextAnswers.findIndex(ans => !ans);
  if (emptyIdx === -1) {
    window.showToast("Tất cả các vị trí đã điền xong! Hãy click vào ô trống cũ nếu muốn thay đổi.");
    return;
  }
  
  window.draggedTextAnswers[emptyIdx] = text;
  
  const slot = document.getElementById(`drag-text-target-${emptyIdx}`);
  slot.innerText = text;
  slot.className = "flex items-center justify-center min-w-[200px] h-11 px-4 rounded-xl border border-indigo-500 bg-indigo-500/10 text-xs font-bold text-white cursor-pointer hover:bg-indigo-500/20 transition-all";
  
  const poolBtn = document.getElementById(`drag-text-pool-btn-${btnIdx}`);
  poolBtn.classList.add("opacity-30", "pointer-events-none");
  slot.dataset.btnIdx = btnIdx;
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
  }
}

function clearDraggedText(slotIdx) {
  if (isAnswerChecked) return;
  
  const text = window.draggedTextAnswers[slotIdx];
  if (!text) return;
  
  const slot = document.getElementById(`drag-text-target-${slotIdx}`);
  const btnIdx = slot.dataset.btnIdx;
  
  window.draggedTextAnswers[slotIdx] = "";
  
  slot.innerText = "Nhấp từ khóa để điền...";
  slot.className = "flex items-center justify-center min-w-[200px] h-11 px-4 rounded-xl border-2 border-dashed border-indigo-500/30 bg-slate-900/40 text-xs font-bold text-indigo-400 cursor-pointer hover:border-indigo-500 hover:bg-slate-900/80 transition-all";
  
  if (btnIdx !== undefined) {
    const poolBtn = document.getElementById(`drag-text-pool-btn-${btnIdx}`);
    if (poolBtn) {
      poolBtn.classList.remove("opacity-30", "pointer-events-none");
    }
  }
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
  }
}

function placeDraggedImageText(text, btnIdx) {
  if (isAnswerChecked) return;
  
  const emptyIdx = window.draggedTextAnswers.findIndex(ans => !ans);
  if (emptyIdx === -1) {
    window.showToast("Tất cả các hình ảnh đã được dán nhãn tên!");
    return;
  }
  
  window.draggedTextAnswers[emptyIdx] = text;
  
  const slot = document.getElementById(`drag-image-target-${emptyIdx}`);
  slot.innerText = text;
  slot.className = "w-full h-11 px-3 rounded-xl border border-indigo-500 bg-indigo-500/10 text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:bg-indigo-500/20 transition-all";
  
  const poolBtn = document.getElementById(`drag-image-pool-btn-${btnIdx}`);
  poolBtn.classList.add("opacity-30", "pointer-events-none");
  slot.dataset.btnIdx = btnIdx;
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
  }
}

function clearDraggedImageText(slotIdx) {
  if (isAnswerChecked) return;
  
  const text = window.draggedTextAnswers[slotIdx];
  if (!text) return;
  
  const slot = document.getElementById(`drag-image-target-${slotIdx}`);
  const btnIdx = slot.dataset.btnIdx;
  
  window.draggedTextAnswers[slotIdx] = "";
  
  slot.innerText = "Nhấp nhãn để ghép...";
  slot.className = "w-full h-11 px-3 rounded-xl border-2 border-dashed border-indigo-500/30 bg-slate-900/40 text-xs font-bold text-indigo-400 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-900/80 transition-all";
  
  if (btnIdx !== undefined) {
    const poolBtn = document.getElementById(`drag-image-pool-btn-${btnIdx}`);
    if (poolBtn) {
      poolBtn.classList.remove("opacity-30", "pointer-events-none");
    }
  }
  
  currentSelectedAnswer = JSON.stringify(window.draggedTextAnswers);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
  }
}

function changeTableMatchSelect(rowIdx) {
  if (isAnswerChecked) return;
  
  const q = testQuestions[activeQuestionIndex];
  const matchedIndices = [];
  
  for (let r = 0; r < q.rows.length; r++) {
    const val = document.getElementById(`table-match-select-${r}`).value;
    matchedIndices.push(val === "" ? "" : parseInt(val));
  }
  
  currentSelectedAnswer = JSON.stringify(matchedIndices);
  if (currentTestMode === "exam") {
    examUserAnswers[activeQuestionIndex] = currentSelectedAnswer;
  }
}

let currentSelectedAnswer = "";

function selectGameOption(element, label) {
  if (isAnswerChecked) return;
  document.querySelectorAll(".option-card-btn").forEach(el => el.classList.remove("selected"));
  element.classList.add("selected");
  currentSelectedAnswer = label;
}

function submitExam() {
  // Ensure we save the last question's input if it is a fill_blank
  const q = testQuestions[activeQuestionIndex];
  if (q && q.type === "fill_blank") {
    const inputEl = document.getElementById("blank-input");
    if (inputEl) {
      examUserAnswers[activeQuestionIndex] = inputEl.value.trim();
    }
  }

  let confirmMsg = "Bạn có chắc chắn muốn nộp bài thi thám hiểm và xem kết quả?";
  if (currentTestMode === "exam") {
    const unansweredCount = examUserAnswers.filter(ans => {
      if (ans === "" || ans === undefined || ans === null) return true;
      let parsed = ans;
      if (typeof ans === "string") {
        try {
          parsed = JSON.parse(ans);
        } catch (e) {}
      }
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return true;
        if (parsed.every(item => item === "" || item === undefined || item === null)) return true;
      }
      return false;
    }).length;

    if (unansweredCount > 0) {
      confirmMsg = `Bạn vẫn còn ${unansweredCount} câu hỏi chưa trả lời. Bạn có chắc chắn muốn nộp bài thi thám hiểm và xem kết quả không?`;
    }
  }
  
  // Show custom modal
  const modalMsgEl = document.getElementById("submit-confirm-modal-msg");
  if (modalMsgEl) {
    modalMsgEl.innerText = confirmMsg;
  }
  const modalEl = document.getElementById("submitConfirmationModal");
  if (modalEl) {
    modalEl.classList.remove("hidden");
  }
}

function closeSubmitConfirmationModal() {
  const modalEl = document.getElementById("submitConfirmationModal");
  if (modalEl) {
    modalEl.classList.add("hidden");
  }
}

function confirmSubmitExamDirectly() {
  closeSubmitConfirmationModal();
  if (currentTestMode === "exam") {
    executeSubmitExamCalculation();
  } else {
    finishTest();
  }
}

function executeSubmitExamCalculation() {
  // Calculate scores
  correctAnswersCount = 0;
  userAnswers = [];

  testQuestions.forEach((item, idx) => {
    const studentAns = examUserAnswers[idx];
    userAnswers.push(studentAns);
    const type = item.type || "choice";
    let isCorrect = false;

    if (type === "choice" || type === "image_choice") {
      isCorrect = studentAns !== "" && parseInt(studentAns) === item.correctIndex;
    } else if (type === "multiple_choice" || type === "true_false") {
      isCorrect = studentAns === item.answer;
    } else if (type === "fill_blank") {
      isCorrect = (studentAns || "").trim().toLowerCase() === item.answer.toLowerCase();
    } else if (type === "drag_text" || type === "drag_image_text") {
      let parsedAns = [];
      try {
        parsedAns = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
      } catch (e) {
        parsedAns = studentAns || [];
      }
      isCorrect = Array.isArray(parsedAns) && parsedAns.length === item.correctAnswers.length && parsedAns.every((val, i) => val === item.correctAnswers[i]);
    } else if (type === "table_match") {
      let parsedAns = [];
      try {
        parsedAns = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
      } catch (e) {
        parsedAns = studentAns || [];
      }
      isCorrect = Array.isArray(parsedAns) && parsedAns.length === item.correctAnswers.length && parsedAns.every((val, i) => val === item.correctAnswers[i]);
    } else if (type === "multi_choice") {
      let parsedAns = [];
      try {
        parsedAns = typeof studentAns === "string" ? JSON.parse(studentAns) : studentAns;
      } catch (e) {
        parsedAns = studentAns || [];
      }
      isCorrect = Array.isArray(parsedAns) && parsedAns.length === item.correctIndices.length && parsedAns.every(val => item.correctIndices.includes(val));
    }

    if (isCorrect) {
      correctAnswersCount++;
    }
  });

  // Calculate RPG live battle HP based on score
  playerCurrentHP = 100;
  bossMaxHP = testQuestions.length * 100;
  bossCurrentHP = Math.max(0, bossMaxHP - (correctAnswersCount * 100));
  
  // Set final HP values in UI
  document.getElementById("battle-scene-boss-hp-val").innerText = `${bossCurrentHP}/${bossMaxHP}`;
  const bossHpPct = Math.round((bossCurrentHP / bossMaxHP) * 100);
  document.getElementById("battle-scene-boss-hp-bar").style.width = `${bossHpPct}%`;

  if (bossCurrentHP === 0) {
    document.getElementById("battle-scene-boss-status").innerText = "GỤC NGÃ! 💀";
    document.getElementById("battle-scene-player-status").innerText = "CHIẾN THẮNG! 🏆";
  } else {
    document.getElementById("battle-scene-boss-status").innerText = "HÌ HÌ...";
    playerCurrentHP = Math.max(0, playerMaxHP - ((testQuestions.length - correctAnswersCount) * 20));
    document.getElementById("battle-scene-player-hp-val").innerText = `${playerCurrentHP}/${playerMaxHP}`;
    const playerHpPct = Math.round((playerCurrentHP / playerMaxHP) * 100);
    document.getElementById("battle-scene-player-hp-bar").style.width = `${playerHpPct}%`;
    document.getElementById("battle-scene-player-status").innerText = playerCurrentHP > 0 ? "KIỆT SỨC!" : "BẠI TRẬN! 💀";
  }

  finishTest();
}

function nextGameQuestion() {
  if (isReviewingExam) {
    activeQuestionIndex++;
    if (activeQuestionIndex < testQuestions.length) {
      renderGameQuestion();
    } else {
      closeReviewingExam();
    }
    return;
  }

  if (currentTestMode === "exam") {
    // Save current blank input answer if applicable
    const q = testQuestions[activeQuestionIndex];
    if (q && q.type === "fill_blank") {
      const inputEl = document.getElementById("blank-input");
      if (inputEl) {
        examUserAnswers[activeQuestionIndex] = inputEl.value.trim();
      }
    }

    const isLast = activeQuestionIndex === testQuestions.length - 1;
    if (isLast) {
      submitExam();
    } else {
      activeQuestionIndex++;
      renderGameQuestion();
    }
    return;
  }

  const q = testQuestions[activeQuestionIndex];
  const type = q.type || "choice";

  // 1. If currently in unchecked state, validate and show explanation
  if (!isAnswerChecked) {
    let studentAns = "";
    let isCorrect = false;
    
    if (type === "choice" || type === "multiple_choice" || type === "true_false" || type === "image_choice") {
      studentAns = currentSelectedAnswer;
      if (studentAns === "" || studentAns === undefined) {
        window.showToast("Vui lòng click chọn một đáp án trước khi bấm kiểm tra!", 'error');
        return;
      }
      if (type === "choice" || type === "image_choice") {
        isCorrect = parseInt(studentAns) === q.correctIndex;
      } else {
        isCorrect = studentAns === q.answer;
      }
    } else if (type === "fill_blank") {
      studentAns = document.getElementById("blank-input").value.trim();
      if (!studentAns) {
        window.showToast("Vui lòng nhập câu trả lời vào ô trống!", 'error');
        return;
      }
      isCorrect = studentAns.toLowerCase() === q.answer.toLowerCase();
    } else if (type === "drag_text" || type === "drag_image_text") {
      const unfilled = window.draggedTextAnswers.some(ans => !ans);
      if (unfilled) {
        window.showToast("Vui lòng điền và ghép đầy đủ tất cả các vị trí trước khi nộp!", 'error');
        return;
      }
      studentAns = [...window.draggedTextAnswers];
      isCorrect = studentAns.every((val, idx) => val === q.correctAnswers[idx]);
    } else if (type === "table_match") {
      const selectVals = [];
      let allSelected = true;
      for (let r = 0; r < q.rows.length; r++) {
        const val = document.getElementById(`table-match-select-${r}`).value;
        if (val === "") {
          allSelected = false;
          break;
        }
        selectVals.push(parseInt(val));
      }
      if (!allSelected) {
        window.showToast("Vui lòng ghép nối đầy đủ tất cả các hàng trước khi nộp!", 'error');
        return;
      }
      studentAns = selectVals;
      isCorrect = studentAns.every((val, idx) => val === q.correctAnswers[idx]);
    } else if (type === "hotspot") {
      studentAns = window.hotspotClicks || [];
      if (studentAns.length < (q.requiredCount || 1)) {
        window.showToast(`Vui lòng chọn đủ ${q.requiredCount || 1} vị trí trên ảnh!`, 'error');
        return;
      }
      let allValid = true;
      studentAns.forEach(click => {
          let hit = false;
          (q.hotspots || []).forEach(area => {
              if (click.x >= area.x && click.x <= area.x + area.w && click.y >= area.y && click.y <= area.y + area.h) hit = true;
          });
          if (!hit) allValid = false;
      });
      isCorrect = allValid;
    } else if (type === "multi_choice") {
      if (window.multiChoiceSelected.length === 0) {
        window.showToast("Vui lòng chọn ít nhất một đáp án trước khi nộp!", 'error');
        return;
      }
      studentAns = [...window.multiChoiceSelected];
      isCorrect = studentAns.length === q.correctIndices.length && studentAns.every(val => q.correctIndices.includes(val));
    }

    userAnswers.push(studentAns);
    isAnswerChecked = true;

    const pokeName = currentStudent.pokemon.toUpperCase();

    if (isCorrect) {
      correctAnswersCount++;
      
      // Correct Highlighting
      if (type === "choice" || type === "multiple_choice" || type === "true_false") {
        const selectedBtn = document.querySelector(".option-card-btn.selected");
        if (selectedBtn) selectedBtn.classList.add("correct");
      } else if (type === "image_choice") {
        const selectedBtn = document.querySelector(".image-choice-card.selected");
        if (selectedBtn) selectedBtn.classList.add("border-emerald-500", "bg-emerald-500/10");
      } else if (type === "fill_blank") {
        document.getElementById("blank-input").classList.add("border-emerald-500", "bg-emerald-500/10");
      } else if (type === "drag_text") {
        q.rows.forEach((row, rIdx) => {
          const slot = document.getElementById(`drag-text-target-${rIdx}`);
          if (slot) slot.classList.add("border-emerald-500", "bg-emerald-500/10", "text-emerald-400");
        });
      } else if (type === "drag_image_text") {
        q.leftImages.forEach((img, rIdx) => {
          const slot = document.getElementById(`drag-image-target-${rIdx}`);
          if (slot) slot.classList.add("border-emerald-500", "bg-emerald-500/10", "text-emerald-400");
        });
      } else if (type === "table_match") {
        q.rows.forEach((row, rIdx) => {
          const sel = document.getElementById(`table-match-select-${rIdx}`);
          if (sel) sel.classList.add("border-emerald-500", "bg-emerald-500/10");
        });
      } else if (type === "hotspot") {
        const overlay = document.getElementById('student-hotspot-overlay');
        if (overlay) {
            (q.hotspots || []).forEach(area => {
                const box = document.createElement('div');
                box.className = "absolute border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none z-0";
                box.style.left = `${area.x}%`;
                box.style.top = `${area.y}%`;
                box.style.width = `${area.w}%`;
                box.style.height = `${area.h}%`;
                overlay.appendChild(box);
            });
        }
      } else if (type === "multi_choice") {
        window.multiChoiceSelected.forEach(idx => {
          const optBtns = document.querySelectorAll("#game-options-container .option-card-btn");
          if (optBtns[idx]) optBtns[idx].classList.add("correct");
        });
      }

      // Boss takes damage!
      bossCurrentHP = Math.max(0, bossCurrentHP - 100);
      const bossHpPct = Math.round((bossCurrentHP / bossMaxHP) * 100);
      document.getElementById("battle-scene-boss-hp-val").innerText = `${bossCurrentHP}/${bossMaxHP}`;
      document.getElementById("battle-scene-boss-hp-bar").style.width = `${bossHpPct}%`;
      
      document.getElementById("battle-scene-player-status").innerText = "ĐÒN SẤM SÉT! ⚡";
      document.getElementById("battle-scene-boss-status").innerText = "-100 HP! ÁI!";
      document.getElementById("battle-scene-log").innerHTML = `🎉 <span class="text-emerald-400 font-bold">CHÍNH XÁC!</span> Thần thú <span class="text-yellow-400">${pokeName}</span> của bạn ra đòn chí mạng gây <span class="text-red-400 font-black">100 Sát thương</span> lên Boss!`;
    } else {
      // Wrong Highlighting
      if (type === "choice") {
        const selectedBtn = document.querySelector(".option-card-btn.selected");
        if (selectedBtn) selectedBtn.classList.add("wrong");
        const btns = document.querySelectorAll(".option-card-btn");
        if (btns[q.correctIndex]) {
          btns[q.correctIndex].classList.add("correct");
        }
      } else if (type === "multiple_choice" || type === "true_false") {
        const selectedBtn = document.querySelector(".option-card-btn.selected");
        if (selectedBtn) selectedBtn.classList.add("wrong");
        document.querySelectorAll(".option-card-btn").forEach(btn => {
          const btnText = btn.querySelector("span:last-child").innerText;
          if (btnText.startsWith(q.answer) || btnText === q.answer) {
            btn.classList.add("correct");
          }
        });
      } else if (type === "image_choice") {
        const selectedBtn = document.querySelector(".image-choice-card.selected");
        if (selectedBtn) selectedBtn.classList.add("border-red-500", "bg-red-500/10");
        const cards = document.querySelectorAll(".image-choice-card");
        if (cards[q.correctIndex]) {
          cards[q.correctIndex].classList.add("border-emerald-500", "bg-emerald-500/10");
        }
      } else if (type === "fill_blank") {
        document.getElementById("blank-input").classList.add("border-red-500", "bg-red-500/10");
        const tip = document.createElement("p");
        tip.className = "text-xs font-bold text-emerald-400 mt-2";
        tip.innerHTML = `<i class="fa-solid fa-circle-check"></i> Đáp án đúng: <span class="underline">${q.answer}</span>`;
        document.getElementById("blank-input").parentNode.appendChild(tip);
      } else if (type === "drag_text") {
        q.rows.forEach((row, rIdx) => {
          const slot = document.getElementById(`drag-text-target-${rIdx}`);
          const placed = window.draggedTextAnswers[rIdx];
          const correct = q.correctAnswers[rIdx];
          if (placed === correct) {
            slot.classList.add("border-emerald-500", "bg-emerald-500/10", "text-emerald-400");
          } else {
            slot.classList.add("border-red-500", "bg-red-500/10", "text-red-400");
            const tip = document.createElement("span");
            tip.className = "block text-[10px] font-bold text-emerald-400 mt-1";
            tip.innerHTML = `✓ Đáp án đúng: ${correct}`;
            slot.parentNode.appendChild(tip);
          }
        });
      } else if (type === "drag_image_text") {
        q.leftImages.forEach((img, rIdx) => {
          const slot = document.getElementById(`drag-image-target-${rIdx}`);
          const placed = window.draggedTextAnswers[rIdx];
          const correct = q.correctAnswers[rIdx];
          if (placed === correct) {
            slot.classList.add("border-emerald-500", "bg-emerald-500/10", "text-emerald-400");
          } else {
            slot.classList.add("border-red-500", "bg-red-500/10", "text-red-400");
            const tip = document.createElement("span");
            tip.className = "block text-[10px] font-bold text-emerald-400 mt-1 text-center";
            tip.innerHTML = `✓ Đúng: ${correct}`;
            slot.parentNode.appendChild(tip);
          }
        });
      } else if (type === "table_match") {
        q.rows.forEach((row, rIdx) => {
          const sel = document.getElementById(`table-match-select-${rIdx}`);
          const val = parseInt(sel.value);
          const correct = q.correctAnswers[rIdx];
          if (val === correct) {
            sel.classList.add("border-emerald-500", "bg-emerald-500/10");
          } else {
            sel.classList.add("border-red-500", "bg-red-500/10");
            const tip = document.createElement("span");
            tip.className = "block text-[10px] font-bold text-emerald-400 mt-1";
            tip.innerHTML = `✓ Đúng: ${q.options[correct]}`;
            sel.parentNode.appendChild(tip);
          }
        });
      } else if (type === "hotspot") {
        const overlay = document.getElementById('student-hotspot-overlay');
        if (overlay) {
            (q.hotspots || []).forEach(area => {
                const box = document.createElement('div');
                box.className = "absolute border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none z-0";
                box.style.left = `${area.x}%`;
                box.style.top = `${area.y}%`;
                box.style.width = `${area.w}%`;
                box.style.height = `${area.h}%`;
                overlay.appendChild(box);
            });
        }
      } else if (type === "multi_choice") {
        const optBtns = document.querySelectorAll("#game-options-container .option-card-btn");
        optBtns.forEach((btn, idx) => {
          const isCorrect = q.correctIndices.includes(idx);
          const isSelected = window.multiChoiceSelected.includes(idx);
          if (isCorrect) {
            btn.classList.add("correct");
          } else if (isSelected) {
            btn.classList.add("wrong");
          }
        });
      }

      // Player takes damage!
      playerCurrentHP = Math.max(0, playerCurrentHP - 20);
      document.getElementById("battle-scene-player-hp-val").innerText = `${playerCurrentHP}/${playerMaxHP}`;
      const playerHpPct = Math.round((playerCurrentHP / playerMaxHP) * 100);
      document.getElementById("battle-scene-player-hp-bar").style.width = `${playerHpPct}%`;

      document.getElementById("battle-scene-player-status").innerText = "-20 HP! HỰ!";
      document.getElementById("battle-scene-boss-status").innerText = "TẤN CÔNG! 💥";
      document.getElementById("battle-scene-log").innerHTML = `❌ <span class="text-red-400 font-bold">SAI MẤT RỒI!</span> Boss phản công vũ dội khiến Thần thú của bạn tổn thất <span class="text-red-400 font-bold">20 HP</span>! Hãy cố gắng ở câu kế tiếp!`;
    }

    // Render explanation details
    document.getElementById("game-explanation-text").innerText = q.explanation;
    document.getElementById("game-explanation-box").classList.remove("hidden");

    // Change button text
    const isLast = activeQuestionIndex === testQuestions.length - 1;
    document.getElementById("game-next-btn").innerHTML = isLast 
      ? `Nộp bài thi thám hiểm <i class="fa-solid fa-flag-checkered ml-1.5 text-yellow-400"></i>`
      : `Câu tiếp theo <i class="fa-solid fa-angle-right ml-1.5"></i>`;

    return;
  }

  // 2. If already checked, transition to next question or end test
  activeQuestionIndex++;
  currentSelectedAnswer = "";

  if (activeQuestionIndex < testQuestions.length) {
    renderGameQuestion();
  } else {
    submitExam();
  }
}

function confirmExitGamePlaying() {
  if (isReviewingExam) {
    closeReviewingExam();
    return;
  }
  const modal = document.getElementById("exitConfirmationModal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeExitConfirmationModal() {
  const modal = document.getElementById("exitConfirmationModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function confirmExitGamePlayingDirectly() {
  closeExitConfirmationModal();
  clearInterval(testTimerInterval);
  document.getElementById("game-playing-screen").classList.add("hidden");
  isReviewingExam = false; // Reset reviewing state
  exitAntiCheatMode(); // Disable anti-cheat mode
  loadStudentProfile();
  renderBattleArena();
}

// ==================== FINISH TEST & REWARDS ENGINE ====================
function finishTest() {
  clearInterval(testTimerInterval);
  document.getElementById("game-playing-screen").classList.add("hidden");
  exitAntiCheatMode(); // Disable anti-cheat mode

  // Handle Pokemon HP Death
  let lockedPoke = null;
  if (playerCurrentHP === 0 && currentStudent.pokemon && currentStudent.pokemon !== "pikachu") {
    lockedPoke = currentStudent.pokemon;
    if (currentStudent.unlockedPokemons) {
      currentStudent.unlockedPokemons = currentStudent.unlockedPokemons.filter(p => p !== lockedPoke);
    }
    currentStudent.pokemon = "pikachu";
    setTimeout(() => {
       window.showToast(`⚠️ Ồ KHÔNG! Thần thú của bạn đã bị kiệt sức (0 HP) và đã bị tự động KHÓA! Bạn sẽ sử dụng Pikachu mặc định cho trận sau.`, 'error');
    }, 500);
  }

  // Calculate final score
  const totalQ = testQuestions.length;
  const score = Math.round((correctAnswersCount / totalQ) * 100);

  // Gamification reward system
  let expGained = 0;
  let coinsGained = 0;
  const earnedBadges = [];

  const isPassed = score >= 50;

  if (isPassed) {
    // Standard pass reward
    expGained = 150 + (score * 1.5); // Score based bonus
    coinsGained = 30 + Math.floor(score / 5);

    // Achievements unlocking
    // 1. First Test
    if (!currentStudent.badges.includes("First Test")) {
      earnedBadges.push("First Test");
    }
    // 2. Fast Learner (score >= 90)
    if (score >= 90 && !currentStudent.badges.includes("Fast Learner")) {
      earnedBadges.push("Fast Learner");
    }
    // 3. IC3 Master (if completed Level 3 with passing score)
    if (activePlayingTest.level === "level_3" && !currentStudent.badges.includes("IC3 Master")) {
      earnedBadges.push("IC3 Master");
    }
  } else {
    // Consolidation fail rewards
    expGained = 40;
    coinsGained = 10;
  }

  expGained = Math.round(expGained);

  // Apply rewards to student data
  currentStudent.exp += expGained;
  currentStudent.coins += coinsGained;
  
  // Merge new badges
  earnedBadges.forEach(b => {
    if (!currentStudent.badges.includes(b)) {
      currentStudent.badges.push(b);
    }
  });

  // Check Level up thresholds
  // Beginner -> Explorer -> Expert -> Master IC3
  let levelUp = false;
  let previousLevel = currentStudent.level;

  if (currentStudent.exp >= 3000) {
    currentStudent.level = "Master IC3";
    currentStudent.rank = "Diamond";
  } else if (currentStudent.exp >= 1500) {
    currentStudent.level = "Expert";
    currentStudent.rank = "Gold";
  } else if (currentStudent.exp >= 500) {
    currentStudent.level = "Explorer";
    currentStudent.rank = "Silver";
  } else {
    currentStudent.level = "Beginner";
    currentStudent.rank = "Bronze";
  }

  if (currentStudent.level !== previousLevel) {
    levelUp = true;
  }

  // Save student stats to LocalStorage
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  // Save score log entry
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  const spentSecs = (activePlayingTest.duration * 60) - remainingSeconds;
  const minsSpent = Math.floor(spentSecs / 60);
  const secsSpent = spentSecs % 60;

  const scoreEntry = {
    id: `score_log_${Date.now().toString().slice(-6)}`,
    studentEmail: currentStudent.email,
    testId: activePlayingTest.id,
    score: score,
    timeSpent: `${pad(minsSpent)}:${pad(secsSpent)}`,
    date: formattedDate,
    expGained,
    coinsGained
  };

  scores.push(scoreEntry);
  window.saveData(window.IC3_KEYS.SCORES, scores);

  // Render Victory Overlay Screen
  showVictoryScreen(score, expGained, coinsGained, levelUp);
}

function showVictoryScreen(score, expGained, coinsGained, levelUp) {
  document.getElementById("victory-test-title").innerText = activePlayingTest.title;
  document.getElementById("victory-score").innerText = `${score}/100`;
  document.getElementById("victory-exp").innerText = `+${expGained} EXP`;
  document.getElementById("victory-coins").innerText = `+${coinsGained} 🪙`;

  const lvlBadge = document.getElementById("victory-lvl-up-badge");
  if (levelUp) {
    lvlBadge.classList.remove("hidden");
    lvlBadge.innerText = `⭐ CHÚC MỪNG: BẠN ĐÃ THĂNG CẤP LÊN ${currentStudent.level.toUpperCase()}! ⭐`;
  } else {
    lvlBadge.classList.add("hidden");
  }

  document.getElementById("game-victory-screen").classList.remove("hidden");
}

function closeVictoryScreen() {
  document.getElementById("game-victory-screen").classList.add("hidden");
  // Update state and load fresh tab
  loadStudentProfile();
  renderBattleArena();
}


// ==================== STORE & SHOPPING ENGINE ====================
function renderRewardsStore() {
  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  const grid = document.getElementById("student-rewards-store-grid");
  grid.innerHTML = "";

  if (rewards.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs">Cửa hàng phần quà đang bảo trì, vui lòng quay lại sau!</div>`;
    return;
  }

  // List of unlocked pokemon for the student to prevent buying twice
  // Safe pokemon unlocking storage within currentStudent object
  if (!currentStudent.unlockedPokemons) {
    currentStudent.unlockedPokemons = ["pikachu", "charmander", "bulbasaur"];
  }

  rewards.forEach(r => {
    let imgRender = `<div class="text-3xl">${r.image}</div>`;
    if (r.image.startsWith("http")) {
      imgRender = `<img src="${r.image}" class="w-12 h-12 object-contain" alt="${r.name}">`;
    }

    // Determine purchase button status
    let btnText = `Đổi quà với 🪙 ${r.cost}`;
    let btnClass = "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:scale-[1.02]";
    let isOwned = false;

    if (r.type === "pokemon") {
      const pokeId = r.id.replace("reward_", "");
      if (currentStudent.unlockedPokemons.includes(pokeId)) {
        isOwned = true;
        btnText = "Đã sở hữu thần thú";
        btnClass = "bg-slate-850 border border-slate-700 text-slate-500 cursor-not-allowed";
      }
    }

    const div = document.createElement("div");
    div.className = "bg-game-card border border-indigo-950 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-800 transition-all shadow-xl";
    div.innerHTML = `
      <div>
        <div class="w-full h-24 rounded-xl bg-slate-950/80 flex items-center justify-center border border-indigo-950/50 mb-3 shadow-inner">
          ${imgRender}
        </div>
        <h4 class="font-poppins font-black text-xs text-white mb-1">${r.name}</h4>
        <p class="text-[10px] text-slate-400 leading-relaxed min-h-[32px] line-clamp-2 mb-4">${r.desc}</p>
      </div>
      <button onclick="buyStoreItem('${r.id}', ${r.cost}, '${r.type}')" ${isOwned ? 'disabled' : ''} class="w-full py-2.5 rounded-xl text-xs font-black transition-all transform active:scale-95 ${btnClass}">
        ${btnText}
      </button>
    `;
    grid.appendChild(div);
  });
}

function buyStoreItem(id, cost, type) {
  if (currentStudent.coins < cost) {
    window.showToast("Bạn không đủ Coin vàng 🪙 để thực hiện giao dịch này. Hãy thám hiểm làm thêm nhiều bài thi để kiếm thêm Coin nhé!", 'error');
    return;
  }

  if (confirm(`Bạn đồng ý tiêu hao 🪙 ${cost} Coin để đổi phần quà này chứ?`)) {
    currentStudent.coins -= cost;

    if (type === "pokemon") {
      const pokeId = id.replace("reward_", "");
      if (!currentStudent.unlockedPokemons) {
        currentStudent.unlockedPokemons = ["pikachu", "charmander", "bulbasaur"];
      }
      currentStudent.unlockedPokemons.push(pokeId);
      window.showToast(`🎉 CHÚC MỪNG: Bạn đã mở khóa thành công Pokémon ${pokeId.toUpperCase()}! Bạn có thể đổi avatar của mình ngay bây giờ.`);
    } else {
      window.showToast("🎉 ĐỔI QUÀ THÀNH CÔNG! Hãy liên hệ với Giáo viên hoặc Admin để nhận Voucher vật phẩm của bạn nhé.");
    }

    // Save updated student stats
    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const idx = students.findIndex(s => s.email === currentStudent.email);
    if (idx !== -1) {
      students[idx] = currentStudent;
      window.saveData(window.IC3_KEYS.STUDENTS, students);
    }

    loadStudentProfile();
    renderRewardsStore();
  }
}


// ==================== HISTORY LOG ENGINE ====================
function renderScoresHistory() {
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [];
  const studentScores = scores.filter(s => s.studentEmail === currentStudent.email);
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];

  const body = document.getElementById("student-scores-table-body");
  body.innerHTML = "";

  if (studentScores.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="px-5 py-6 text-center text-slate-500 text-xs italic">Bạn chưa làm bài thi nào. Hãy bắt đầu hành trình thám hiểm để tạo nên lịch sử!</td></tr>`;
    return;
  }

  // Sort by date descending
  studentScores.sort((a, b) => new Date(b.date) - new Date(a.date));

  studentScores.forEach(sc => {
    const test = tests.find(t => t.id === sc.testId) || { title: sc.testId };
    
    const isPassed = sc.score >= 50;
    const statusText = isPassed 
      ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">ĐẠT CHUẨN</span>`
      : `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[10px]">CHƯA ĐẠT</span>`;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-indigo-950/20 transition-all text-xs";
    tr.innerHTML = `
      <td class="px-5 py-3.5 font-bold text-white max-w-xs truncate">${test.title}</td>
      <td class="px-5 py-3.5 text-center font-mono font-black text-sm text-yellow-400">${sc.score}/100</td>
      <td class="px-5 py-3.5 text-center font-mono text-slate-400"><i class="fa-regular fa-clock mr-1 text-indigo-400"></i>${sc.timeSpent}</td>
      <td class="px-5 py-3.5 text-slate-400">${sc.date}</td>
      <td class="px-5 py-3.5 text-yellow-500 font-bold">+${sc.expGained} EXP | +${sc.coinsGained} 🪙</td>
      <td class="px-5 py-3.5 text-center">${statusText}</td>
    `;
    body.appendChild(tr);
  });
}


// ==================== AVATAR SELECTION POPUP ====================
function openPokemonSelectorModal() {
  const modal = document.getElementById("pokemonSelectorModal");
  const container = document.getElementById("pokemon-avatar-selector-grid");
  container.innerHTML = "";

  if (!currentStudent.unlockedPokemons) {
    currentStudent.unlockedPokemons = ["pikachu", "charmander", "bulbasaur"];
  }

  const allPokemons = [
    { id: "pikachu", name: "Pikachu", image: "⚡ System", systemImg: "⚡" },
    { id: "charmander", name: "Charmander", image: "🔥 System", systemImg: "🔥" },
    { id: "bulbasaur", name: "Bulbasaur", image: "🌱 System", systemImg: "🌱" },
    { id: "squirtle", name: "Squirtle", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png", systemImg: "💧" },
    { id: "eevee", name: "Eevee", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png", systemImg: "🦊" }
  ];

  allPokemons.forEach(p => {
    const isUnlocked = currentStudent.unlockedPokemons.includes(p.id);
    const isCurrent = currentStudent.pokemon === p.id;

    const btn = document.createElement("button");
    
    if (isUnlocked) {
      btn.className = `p-3.5 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${isCurrent ? 'bg-yellow-500/10 border-yellow-400 text-yellow-400 font-extrabold' : 'bg-slate-950 border-indigo-950 text-slate-300 hover:border-slate-800'}`;
      btn.onclick = () => selectPokemonAvatar(p.id);
    } else {
      btn.className = "p-3.5 rounded-2xl flex flex-col items-center justify-center bg-slate-950/40 border border-dashed border-indigo-950/40 text-slate-600 opacity-50 cursor-not-allowed";
    }

    let imgNode = `<span class="text-3xl mb-2">${p.systemImg}</span>`;
    if (p.image.startsWith("http") && isUnlocked) {
      imgNode = `<img src="${p.image}" class="w-10 h-10 object-contain mb-2" alt="${p.name}">`;
    }

    btn.innerHTML = `
      ${imgNode}
      <span class="text-xs font-bold block">${p.name}</span>
      <span class="text-[9px] mt-1 font-semibold uppercase block tracking-wider">${isCurrent ? 'Đang chọn' : isUnlocked ? 'Đã mở khóa' : 'Khóa 🔒'}</span>
    `;

    container.appendChild(btn);
  });

  modal.classList.remove("hidden");
}

function selectPokemonAvatar(pokeId) {
  currentStudent.pokemon = pokeId;
  
  // Save to database
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx] = currentStudent;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  loadStudentProfile();
  closePokemonSelectorModal();
  setPokemonEncourager();
}

function closePokemonSelectorModal() {
  document.getElementById("pokemonSelectorModal").classList.add("hidden");
}

// ==================== RENDERING: LEADERBOARD ====================
function renderLeaderboard() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classes = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [] || [];

  // Sort by exp descending
  const sortedStudents = [...students].sort((a, b) => (b.exp || 0) - (a.exp || 0));

  const tableBody = document.getElementById("student-leaderboard-table-body");
  tableBody.innerHTML = "";

  const pokemonAvatars = {
    pikachu: "⚡",
    charmander: "🔥",
    bulbasaur: "🌱",
    squirtle: "💧",
    eevee: "🦊"
  };

  // Find user's rank
  const myRankIndex = sortedStudents.findIndex(s => s.email === currentStudent.email);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : "-";
  document.getElementById("player-leaderboard-rank").innerText = `#${myRank}`;

  sortedStudents.forEach((st, idx) => {
    const rankNum = idx + 1;
    let rankBadge = `${rankNum}`;
    
    // Nice medal indicators for top 3
    if (rankNum === 1) rankBadge = "🥇";
    else if (rankNum === 2) rankBadge = "🥈";
    else if (rankNum === 3) rankBadge = "🥉";

    // Find class name
    const cls = classes.find(c => c.id === st.classId);
    const classNameText = cls ? cls.name : "Tự do";

    const isMe = st.email === currentStudent.email;
    const highlightClass = isMe ? "bg-blue-500/10 border-y border-blue-500/20 font-bold" : "";

    const tr = document.createElement("tr");
    tr.className = `hover:bg-white/5 transition-all text-xs ${highlightClass}`;
    
    tr.innerHTML = `
      <td class="px-5 py-4 text-center font-bold text-sm">${rankBadge}</td>
      <td class="px-5 py-4">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-full bg-slate-950/60 border border-white/10 flex items-center justify-center text-lg shadow-sm shrink-0">
            ${pokemonAvatars[st.pokemon] || "⚡"}
          </span>
          <div>
            <span class="text-white font-black block">${st.name} ${isMe ? ' <span class="text-[9px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase">Bạn</span>' : ''}</span>
            <span class="text-[9px] text-slate-400 font-medium block truncate max-w-[120px] sm:max-w-none">${st.email}</span>
          </div>
        </div>
      </td>
      <td class="px-5 py-4 text-slate-400 font-semibold">${classNameText}</td>
      <td class="px-5 py-4 text-center">
        <span class="px-2.5 py-1 rounded-xl text-[9px] font-extrabold ${
          st.level === "Master IC3" ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" :
          st.level === "Expert" ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" :
          st.level === "Explorer" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" :
          "bg-slate-500/15 text-slate-400 border border-slate-500/10"
        }">${st.level || "Beginner"}</span>
      </td>
      <td class="px-5 py-4 text-right font-mono text-yellow-400 font-black">${st.exp || 0} EXP</td>
      <td class="px-5 py-4 text-right font-mono text-amber-500 font-bold">🪙 ${st.coins || 0}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ==================== RENDERING: BADGES ====================
function renderBadges() {
  const container = document.getElementById("student-badges-container");
  container.innerHTML = "";

  const allBadgesDef = [
    {
      id: "First Test",
      title: "Nhà Khai Hoang",
      desc: "Làm bài kiểm tra thám hiểm luyện đề đầu tiên thành công.",
      icon: "🧭",
      accentColor: "from-blue-500/20 to-teal-500/20",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400"
    },
    {
      id: "Fast Learner",
      title: "Học Giả Thần Tốc",
      desc: "Đạt điểm số từ 90/100 trở lên trong một bài thi bất kỳ.",
      icon: "⚡",
      accentColor: "from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/30",
      textColor: "text-amber-400"
    },
    {
      id: "Persistent Warrior",
      title: "Chiến Binh Bền Bỉ",
      desc: "Chăm chỉ hoàn thành từ 5 đề thi ôn tập trở lên.",
      icon: "🛡️",
      accentColor: "from-emerald-500/20 to-green-500/20",
      borderColor: "border-emerald-500/30",
      textColor: "text-emerald-400"
    },
    {
      id: "Pokemon Collector",
      title: "Nhà Sưu Tầm Thần Thú",
      desc: "Sở hữu và mở khóa ít nhất một Pokémon mới trong Cửa hàng.",
      icon: "🐾",
      accentColor: "from-pink-500/20 to-purple-500/20",
      borderColor: "border-pink-500/30",
      textColor: "text-pink-400"
    },
    {
      id: "IC3 Master",
      title: "Huyền Thoại IC3",
      desc: "Vượt qua thử thách ôn thi Vùng 3 (Living Online) thành công.",
      icon: "👑",
      accentColor: "from-purple-500/20 to-indigo-500/20",
      borderColor: "border-purple-500/30",
      textColor: "text-purple-400"
    },
    {
      id: "Coin Tycoon",
      title: "Đại Gia Coin Vàng",
      desc: "Kiếm được và sở hữu số dư tiền vàng trên 500 Coin vàng 🪙.",
      icon: "💎",
      accentColor: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
      textColor: "text-yellow-400"
    }
  ];

  // Dynamically evaluate badges unlocked status
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const myScores = scores.filter(s => s.studentEmail === currentStudent.email);
  
  const hasFirstTest = myScores.length > 0;
  const hasFastLearner = myScores.some(s => s.score >= 90);
  const hasPersistentWarrior = myScores.length >= 5;
  
  if (!currentStudent.unlockedPokemons) {
    currentStudent.unlockedPokemons = ["pikachu", "charmander", "bulbasaur"];
  }
  const hasPokemonCollector = currentStudent.unlockedPokemons.length > 3;

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  const level3TestsIds = tests.filter(t => t.level === "level_3").map(t => t.id);
  const hasIC3Master = myScores.some(s => level3TestsIds.includes(s.testId) && s.score >= 50);

  const hasCoinTycoon = currentStudent.coins >= 500;

  const unlockedBadges = [];
  if (hasFirstTest) unlockedBadges.push("First Test");
  if (hasFastLearner) unlockedBadges.push("Fast Learner");
  if (hasPersistentWarrior) unlockedBadges.push("Persistent Warrior");
  if (hasPokemonCollector) unlockedBadges.push("Pokemon Collector");
  if (hasIC3Master) unlockedBadges.push("IC3 Master");
  if (hasCoinTycoon) unlockedBadges.push("Coin Tycoon");

  // Keep database in sync
  currentStudent.badges = unlockedBadges;
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const idx = students.findIndex(s => s.email === currentStudent.email);
  if (idx !== -1) {
    students[idx].badges = unlockedBadges;
    window.saveData(window.IC3_KEYS.STUDENTS, students);
  }

  allBadgesDef.forEach(b => {
    const isUnlocked = unlockedBadges.includes(b.id);
    
    const card = document.createElement("div");
    if (isUnlocked) {
      card.className = `bg-gradient-to-br ${b.accentColor} border ${b.borderColor} p-5 rounded-2xl flex items-start gap-4 shadow-lg hover:scale-[1.02] transition-all`;
      card.innerHTML = `
        <span class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0 border border-white/20 animate-pulse">${b.icon}</span>
        <div>
          <h4 class="font-poppins font-black text-xs text-white mb-1">${b.title}</h4>
          <p class="text-[10px] text-slate-300 leading-relaxed mb-2">${b.desc}</p>
          <span class="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-white/15 ${b.textColor} border border-white/10 uppercase"><i class="fa-solid fa-circle-check mr-1"></i> Đã mở khóa</span>
        </div>
      `;
    } else {
      card.className = "bg-white/2 border border-white/5 p-5 rounded-2xl flex items-start gap-4 opacity-50 grayscale";
      card.innerHTML = `
        <span class="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-xl shrink-0 text-slate-600 border border-white/5">🔒</span>
        <div>
          <h4 class="font-poppins font-black text-xs text-slate-400 mb-1">${b.title}</h4>
          <p class="text-[10px] text-slate-500 leading-relaxed mb-2">${b.desc}</p>
          <span class="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-slate-900 text-slate-500 border border-white/5 uppercase"><i class="fa-solid fa-lock mr-1"></i> Chưa đạt</span>
        </div>
      `;
    }
    container.appendChild(card);
  });
}

window.renderNavigationPanel = () => {
  const panel = document.getElementById('question-list-grid');
  if (!panel) return;
  panel.innerHTML = '';
  
  testQuestions.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.innerText = i + 1;
    btn.className = "w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all border border-slate-700 ";
    
    // Default: Not answered
    btn.classList.add("bg-slate-800", "text-slate-400");

    if (activeQuestionIndex === i) {
        btn.classList.add("border-indigo-500", "text-indigo-400", "bg-indigo-500/20");
    }

    // State coloring
    if (currentTestMode === "exam") {
      if (examUserAnswers[i] !== undefined && examUserAnswers[i] !== "") {
          btn.classList.remove("bg-slate-800", "text-slate-400");
          btn.classList.add("bg-blue-600", "text-white");
      }
    } else {
      // Practice / Review
      if (userAnswers[i] !== undefined) {
         const correct = isAnswerCorrect(q, userAnswers[i]);
         btn.classList.remove("bg-slate-800", "text-slate-400");
         if (correct) {
             btn.classList.add("bg-emerald-600", "text-white");
         } else {
             btn.classList.add("bg-red-600", "text-white");
         }
      }
    }
    
    btn.onclick = () => {
      activeQuestionIndex = i;
      renderGameQuestion();
    }
    
    panel.appendChild(btn);
  });
}

function isAnswerCorrect(q, userAnswer) {
    const type = q.type || "choice";
    if (type === "choice") {
        return parseInt(userAnswer) === q.correctIndex;
    } else if (type === "multiple_choice" || type === "true_false") {
        return userAnswer === q.answer;
    }
    return false;
}

