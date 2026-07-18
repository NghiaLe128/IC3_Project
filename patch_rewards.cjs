const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `// ==================== REWARDS TAB ====================
async function renderTeacherRewards() {
  const container = document.getElementById("teacher-rewards-grid");
  if (!container) return;

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  container.innerHTML = "";

  if (rewards.length === 0) {
    container.innerHTML = \`<div class="col-span-4 text-center py-6 text-indigo-300 text-xs">Chưa có dữ liệu phần thưởng.</div>\`;
    return;
  }

  rewards.forEach(reward => {`;

const replacement = `// ==================== REWARDS TAB ====================
async function renderTeacherRewards() {
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

  pagedRewards.forEach(reward => {`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
