const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `function renderQuestionsList() {
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

  if (filteredQuestions.length === 0) {
    listContainer.innerHTML = \`<div class="p-6 text-center text-xs text-indigo-300">Không có câu hỏi nào.</div>\`;
    return;
  }

  filteredQuestions.forEach((q, idx) => {`;

const replacement = `function renderQuestionsList() {
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
    const idx = (currentPage - 1) * ITEMS_PER_PAGE + idxOnPage;`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
