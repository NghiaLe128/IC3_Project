const fs = require('fs');
let code = fs.readFileSync('admin/script.js', 'utf-8');

const paginationCode = `
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

function renderPagination(totalItems, currentPage, containerId, sectionKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = \`\`;
  html += \`<button onclick="changePage('\${sectionKey}', \${currentPage - 1})" class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" \${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>\`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += \`<button onclick="changePage('\${sectionKey}', \${i})" class="px-3 py-1 rounded \${i === currentPage ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">\${i}</button>\`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += \`<span class="px-2 text-slate-500">...</span>\`;
    }
  }

  html += \`<button onclick="changePage('\${sectionKey}', \${currentPage + 1})" class="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" \${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>\`;
  
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
`;

if (!code.includes('window.adminPagination')) {
  code = code.replace('// 1. Initial Load & Utilities', paginationCode + '\n// 1. Initial Load & Utilities');
  fs.writeFileSync('admin/script.js', code);
}
