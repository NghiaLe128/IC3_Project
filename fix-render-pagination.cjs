const fs = require('fs');
let code = fs.readFileSync('admin/script.js', 'utf-8');

// 1. renderStudentsTable
code = code.replace(/const filtered = students\.filter\(s =>[\s\S]*?s\.email\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m, 
`const filteredAll = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery) || 
    s.email.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.students || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'students-pagination', 'students');`);

// 2. renderTeachersGrid
code = code.replace(/const filtered = teachers\.filter\(t =>[\s\S]*?t\.email\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m,
`const filteredAll = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery) || 
    t.email.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.teachers || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'teachers-pagination', 'teachers');`);

// 3. renderQuestionsTable
code = code.replace(/const filtered = questions\.filter\(q =>[\s\S]*?q\.text\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m,
`const filteredAll = questions.filter(q => 
    q.text.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.questions || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'questions-pagination', 'questions');`);

// 4. renderTestsGrid
code = code.replace(/const filtered = tests\.filter\(t =>[\s\S]*?t\.name\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m,
`const filteredAll = tests.filter(t => 
    t.name.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.tests || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'tests-pagination', 'tests');`);

// 5. renderRankingList
code = code.replace(/const sortedScores = scores\.sort\(\(a,b\) => b\.score - a\.score\);/m,
`const sortedScoresAll = scores.sort((a,b) => b.score - a.score);
  const currentPage = window.adminPagination.ranking || 1;
  const sortedScores = sortedScoresAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(sortedScoresAll.length, currentPage, 'ranking-pagination', 'ranking');`);

// 6. renderRewardsGrid
code = code.replace(/const filtered = rewards\.filter\(r =>[\s\S]*?r\.name\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m,
`const filteredAll = rewards.filter(r => 
    r.name.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.rewards || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'rewards-pagination', 'rewards');`);

// 7. renderBossesGrid
code = code.replace(/const filtered = bosses\.filter\(b =>[\s\S]*?b\.name\.toLowerCase\(\)\.includes\(searchQuery\)\n  \);/m,
`const filteredAll = bosses.filter(b => 
    b.name.toLowerCase().includes(searchQuery)
  );
  const currentPage = window.adminPagination.bosses || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'bosses-pagination', 'bosses');`);

fs.writeFileSync('admin/script.js', code);
