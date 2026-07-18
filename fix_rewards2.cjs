const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `async function renderTeacherRewards() {
  const grid = document.getElementById("teacher-rewards-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const rewards = window.IC3_CACHE[window.IC3_KEYS.REWARDS] || [];
  
  if (rewards.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">Chưa có phần thưởng nào trong hệ thống. Hãy đăng nhập bên học sinh để khởi tạo phần thưởng.</div>';
    return;
  }

  rewards.forEach(r => {`;

const replacement = `async function renderTeacherRewards() {
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

  pagedRewards.forEach(r => {`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
