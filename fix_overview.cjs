const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `function renderOverviewProgressTable(classStudents) {
  const body = document.getElementById("teacher-overview-progress-body");
  body.innerHTML = "";

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

  if (classStudents.length === 0) {
    body.innerHTML = \`<tr><td colspan="6" class="px-4 py-6 text-center text-indigo-300 text-xs">Lớp học hiện tại chưa có học sinh nào gia nhập.</td></tr>\`;
    return;
  }

  // Sort by EXP descending
  const sorted = [...classStudents].sort((a, b) => (b.exp || 0) - (a.exp || 0));

  sorted.forEach(std => {`;

const replacement = `function renderOverviewProgressTable(classStudents) {
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
    body.innerHTML = \`<tr><td colspan="6" class="px-4 py-6 text-center text-indigo-300 text-xs">Lớp học hiện tại chưa có học sinh nào gia nhập hoặc không khớp tìm kiếm.</td></tr>\`;
    return;
  }

  // Sort by EXP descending
  const sorted = [...listToRender].sort((a, b) => (b.exp || 0) - (a.exp || 0));

  const currentPage = window.teacherPagination.overview || 1;
  const pagedOverviewStudents = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(sorted.length, currentPage, paginationContainerId, 'overview');

  pagedOverviewStudents.forEach(std => {`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
