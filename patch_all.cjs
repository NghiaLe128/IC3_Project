const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

// 1. Students
let target1 = `function renderClassStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  // Populate filter dropdown with unique school classes
  populateSchoolClassFilter(classStudents);
  const filterVal = document.getElementById("schoolClassFilter").value;
  const filteredStudents = filterVal ? classStudents.filter(s => s.schoolClass === filterVal) : classStudents;
  const body = document.getElementById("class-students-table-body");
  body.innerHTML = "";
  if (filteredStudents.length === 0) {
    body.innerHTML = \\\`<tr><td colspan="8" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>\\\`;
    return;
  }
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");
  const limit = config && config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
  const today = getBossHuntDayKey();
  filteredStudents.forEach(std => {`;

// We use regex for better matching
code = code.replace(/function renderClassStudentsTable\(\) \{[\s\S]*?filteredStudents\.forEach\(std => \{/, `function renderClassStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  // Populate filter dropdown with unique school classes
  populateSchoolClassFilter(classStudents);
  
  const filterVal = document.getElementById("schoolClassFilter").value;
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
    body.innerHTML = \`<tr><td colspan="8" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>\`;
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
  pagedStudents.forEach(std => {`);


// 2. Questions
code = code.replace(/function renderQuestionsList\(\) \{[\s\S]*?filteredQuestions\.forEach\(\(q, idx\) => \{/, `function renderQuestionsList() {
  const testId = document.getElementById("m-testSelector").value;
  const typeFilter = document.getElementById("m-questionTypeFilter").value;
  const listContainer = document.getElementById("m-questionsList");
  listContainer.innerHTML = "";

  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];
  const test = tests.find(t => t.id === testId);
  if (!test) return;

  const questions = window.IC3_CACHE[window.IC3_KEYS.QUESTIONS] || [] || [];
  const searchQuery = document.getElementById("m-questionSearch").value.toLowerCase();
  
  const missing = test.questions.filter(id => !questions.some(q => q.id === id));
  if (missing.length > 0) {
    listContainer.innerHTML += \`<p class="p-4 text-center text-[11px] text-red-500 italic">Cảnh báo: Có \${missing.length} câu hỏi không tìm thấy! IDs: \${missing.join(', ')}</p>\`;
  }
  
  const testQuestions = questions.filter(q => test.questions.includes(q.id));

  const filteredQuestions = testQuestions.filter(q => 
    (typeFilter === "" || q.type === typeFilter) &&
    (q.text.toLowerCase().includes(searchQuery))
  );

  const paginationContainerId = 'questions-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredQuestions.length === 0) {
    listContainer.innerHTML = \`<div class="p-6 text-center text-xs text-indigo-300">Không có câu hỏi nào.</div>\`;
    return;
  }

  const currentPage = window.teacherPagination.questions || 1;
  const pagedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredQuestions.length, currentPage, paginationContainerId, 'questions');

  pagedQuestions.forEach((q, idxOnPage) => {
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`);

// 3. Ranking
code = code.replace(/function renderClassRanking\(\) \{[\s\S]*?let ranked = classStudents\.map\(std => \{/, `function renderClassRanking() {
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
    leaderboardEl.innerHTML = \`<p class="text-indigo-300 text-xs text-center py-4">Chưa có dữ liệu xếp hạng.</p>\`;
    return;
  }

  let ranked = classStudents.map(std => {`);

code = code.replace(/\/\/ Render Top 3 visually distinct, then list others\n\s*ranked\.forEach\(\(r, idx\) => \{/, `const currentPage = window.teacherPagination.ranking || 1;
  const pagedRanked = ranked.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(ranked.length, currentPage, paginationContainerId, 'ranking');

  // Render Top 3 visually distinct, then list others
  pagedRanked.forEach((r, idxOnPage) => {
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`);

// 4. Rewards
code = code.replace(/async function renderTeacherRewards\(\) \{[\s\S]*?rewards\.forEach\(reward => \{/, `async function renderTeacherRewards() {
  const container = document.getElementById("teacher-rewards-grid");
  if (!container) return;

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];

  const searchInput = document.getElementById("rewardsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
  let filteredRewards = rewards;
  if (searchQuery) {
    filteredRewards = filteredRewards.filter(r => r.name && r.name.toLowerCase().includes(searchQuery));
  }

  container.innerHTML = "";

  const paginationContainerId = 'rewards-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredRewards.length === 0) {
    container.innerHTML = \`<div class="col-span-4 text-center py-6 text-indigo-300 text-xs">Chưa có dữ liệu phần thưởng.</div>\`;
    return;
  }

  const currentPage = window.teacherPagination.rewards || 1;
  const pagedRewards = filteredRewards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredRewards.length, currentPage, paginationContainerId, 'rewards');

  pagedRewards.forEach(reward => {`);

// 5. Overview (renderOverviewProgressTable)
code = code.replace(/function renderOverviewProgressTable\(classStudents\) \{[\s\S]*?sorted\.forEach\(std => \{/, `function renderOverviewProgressTable(classStudents) {
  let listToRender = classStudents;
  
  const searchInput = document.getElementById("overviewSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
  if (searchQuery) {
    listToRender = listToRender.filter(s => s.name && s.name.toLowerCase().includes(searchQuery));
  }

  const body = document.getElementById("teacher-overview-progress-body");
  body.innerHTML = "";

  const paginationContainerId = 'overview-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

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

  if (listToRender.length === 0) {
    body.innerHTML = \`<tr><td colspan="6" class="px-4 py-6 text-center text-indigo-300 text-xs">Lớp học hiện tại chưa có học sinh nào phù hợp.</td></tr>\`;
    return;
  }

  // Sort by EXP descending
  const sorted = [...listToRender].sort((a, b) => (b.exp || 0) - (a.exp || 0));

  const currentPage = window.teacherPagination.overview || 1;
  const pagedStudents = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(sorted.length, currentPage, paginationContainerId, 'overview');

  pagedStudents.forEach(std => {`);


fs.writeFileSync('teacher/script.js', code);
