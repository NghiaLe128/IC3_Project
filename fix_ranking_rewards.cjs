const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

// Ranking
code = code.replace(/function renderClassRanking\(\) \{[\s\S]*?classStudents\.sort\(\(a, b\) => b\.exp - a\.exp\);/, `function renderClassRanking() {
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

  // Sort by EXP desc
  classStudents.sort((a, b) => b.exp - a.exp);
  
  const currentPage = window.teacherPagination.ranking || 1;
  const pagedRanked = classStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(classStudents.length, currentPage, paginationContainerId, 'ranking');
`);

code = code.replace(/classStudents\.forEach\(\(std, index\) => \{/g, `pagedRanked.forEach((std, idxOnPage) => {
    const index = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`);


// Rewards
code = code.replace(/async function renderTeacherRewards\(\) \{[\s\S]*?rewards\.forEach\(reward => \{/, `async function renderTeacherRewards() {
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
    grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">Chưa có phần thưởng nào.</div>';
    return;
  }

  const currentPage = window.teacherPagination.rewards || 1;
  const pagedRewards = filteredRewards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredRewards.length, currentPage, paginationContainerId, 'rewards');

  pagedRewards.forEach(reward => {`);

fs.writeFileSync('teacher/script.js', code);
