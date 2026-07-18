const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

// Ranking
const rankingTarget = `// ==================== CLASS RANKING ====================
function renderClassRanking() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  const leaderboardEl = document.getElementById("class-ranking-leaderboard");
  leaderboardEl.innerHTML = "";

  if (classStudents.length === 0) {
    leaderboardEl.innerHTML = \`<div class="py-8 text-center text-indigo-300 text-sm italic">Lớp học chưa có thành viên nào.</div>\`;
    return;
  }

  // Calculate stats for ranking
  // Primary: EXP (desc), Secondary: Tests Completed (desc)
  const ranked = classStudents.map(std => {`;

const rankingReplacement = `// ==================== CLASS RANKING ====================
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
    leaderboardEl.innerHTML = \`<div class="py-8 text-center text-indigo-300 text-sm italic">Không có dữ liệu xếp hạng.</div>\`;
    return;
  }

  // Calculate stats for ranking
  // Primary: EXP (desc), Secondary: Tests Completed (desc)
  let ranked = classStudents.map(std => {`;

code = code.replace(rankingTarget, rankingReplacement);

const rankingTarget2 = `  // Render Top 3 visually distinct, then list others
  ranked.forEach((r, idx) => {`;

const rankingReplacement2 = `  const currentPage = window.teacherPagination.ranking || 1;
  const pagedRanked = ranked.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(ranked.length, currentPage, paginationContainerId, 'ranking');

  // Render Top 3 visually distinct, then list others
  pagedRanked.forEach((r, idxOnPage) => {
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`;

code = code.replace(rankingTarget2, rankingReplacement2);


// Rewards
const rewardsTarget = `// ==================== REWARDS TAB ====================
async function renderTeacherRewards() {
  const grid = document.getElementById("teacher-rewards-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  
  if (rewards.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">Chưa có phần thưởng nào trong hệ thống. Hãy đăng nhập bên học sinh để khởi tạo phần thưởng.</div>';
    return;
  }

  rewards.forEach(reward => {`;

const rewardsReplacement = `// ==================== REWARDS TAB ====================
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

  pagedRewards.forEach(reward => {`;

code = code.replace(rewardsTarget, rewardsReplacement);

fs.writeFileSync('teacher/script.js', code);
