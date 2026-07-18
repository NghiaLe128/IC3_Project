const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `// ==================== RESULTS HISTORY ====================
function renderResultsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  const emails = classStudents.map(s => s.email);

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const classScores = scores.filter(sc => emails.includes(sc.studentEmail));
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  const body = document.getElementById("teacher-results-table-body");
  body.innerHTML = "";

  const levelLabels = {
    level_1: \`<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold border border-blue-200">Level 1</span>\`,
    level_2: \`<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold border border-emerald-200">Level 2</span>\`,
    level_3: \`<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold border border-purple-200">Level 3</span>\`
  };

  if (classScores.length === 0) {
    body.innerHTML = \`<tr><td colspan="7" class="px-4 py-6 text-center text-indigo-300 text-xs">Chưa học sinh nào trong lớp làm bài thi.</td></tr>\`;
    return;
  }

  // Sort scores by date desc
  classScores.sort((a, b) => new Date(b.date) - new Date(a.date));

  classScores.forEach(sc => {`;

const replacement = `// ==================== RESULTS HISTORY ====================
function renderResultsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  const emails = classStudents.map(s => s.email);

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  let classScores = scores.filter(sc => emails.includes(sc.studentEmail));
  const tests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [] || [];

  const searchInput = document.getElementById("resultsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

  if (searchQuery) {
    classScores = classScores.filter(sc => {
      const std = classStudents.find(s => s.email === sc.studentEmail);
      const nameMatch = std && std.name && std.name.toLowerCase().includes(searchQuery);
      const emailMatch = sc.studentEmail.toLowerCase().includes(searchQuery);
      const test = tests.find(t => t.id === sc.testId);
      const testMatch = test && test.title && test.title.toLowerCase().includes(searchQuery);
      return nameMatch || emailMatch || testMatch;
    });
  }

  const body = document.getElementById("teacher-results-table-body");
  body.innerHTML = "";

  const paginationContainerId = 'results-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  const levelLabels = {
    level_1: \`<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold border border-blue-200">Level 1</span>\`,
    level_2: \`<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold border border-emerald-200">Level 2</span>\`,
    level_3: \`<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold border border-purple-200">Level 3</span>\`
  };

  if (classScores.length === 0) {
    body.innerHTML = \`<tr><td colspan="7" class="px-4 py-6 text-center text-indigo-300 text-xs">Chưa học sinh nào trong lớp làm bài thi.</td></tr>\`;
    return;
  }

  // Sort scores by date desc
  classScores.sort((a, b) => new Date(b.date) - new Date(a.date));

  const currentPage = window.teacherPagination.results || 1;
  const pagedScores = classScores.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(classScores.length, currentPage, paginationContainerId, 'results');

  pagedScores.forEach(sc => {`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
