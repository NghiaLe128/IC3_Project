const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `// ==================== CLASS RANKING ====================
function renderClassRanking() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);

  const leaderboardEl = document.getElementById("class-ranking-leaderboard");
  leaderboardEl.innerHTML = "";

  if (classStudents.length === 0) {
    leaderboardEl.innerHTML = \`<p class="text-indigo-300 text-xs text-center py-4">Chưa có dữ liệu xếp hạng.</p>\`;
    return;
  }

  // Calculate stats for ranking
  // Primary: EXP (desc), Secondary: Tests Completed (desc)
  const ranked = classStudents.map(std => {`;

const replacement = `// ==================== CLASS RANKING ====================
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
    leaderboardEl.innerHTML = \`<p class="text-indigo-300 text-xs text-center py-4">Chưa có dữ liệu xếp hạng.</p>\`;
    return;
  }

  // Calculate stats for ranking
  // Primary: EXP (desc), Secondary: Tests Completed (desc)
  let ranked = classStudents.map(std => {`;

code = code.replace(target, replacement);

const target2 = `  // Render Top 3 visually distinct, then list others
  ranked.forEach((r, idx) => {`;

const replacement2 = `  const currentPage = window.teacherPagination.ranking || 1;
  const pagedRanked = ranked.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(ranked.length, currentPage, paginationContainerId, 'ranking');

  // Render Top 3 visually distinct, then list others
  pagedRanked.forEach((r, idxOnPage) => {
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`;

code = code.replace(target2, replacement2);

fs.writeFileSync('teacher/script.js', code);
