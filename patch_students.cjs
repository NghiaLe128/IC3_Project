const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

const target = `// ==================== STUDENTS LIST TAB ====================
function renderClassStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  // Populate filter dropdown with unique school classes
  populateSchoolClassFilter(classStudents);
  const filterVal = document.getElementById("schoolClassFilter").value;
  const filteredStudents = filterVal ? classStudents.filter(s => s.schoolClass === filterVal) : classStudents;
  const body = document.getElementById("class-students-table-body");
  body.innerHTML = "";
  if (filteredStudents.length === 0) {
    body.innerHTML = \`<tr><td colspan="8" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>\`;
    return;
  }
  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");
  const limit = config && config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
  const today = getBossHuntDayKey();
  filteredStudents.forEach(std => {`;

const replacement = `// ==================== STUDENTS LIST TAB ====================
function renderClassStudentsTable() {
  const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [] || [];
  const classStudents = students.filter(s => s.classId === activeClassId);
  // Populate filter dropdown with unique school classes
  populateSchoolClassFilter(classStudents);
  
  const filterVal = document.getElementById("schoolClassFilter").value;
  const searchInput = document.getElementById("studentsSearch");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

  let filteredStudents = filterVal ? classStudents.filter(s => s.schoolClass === filterVal) : classStudents;
  if (searchQuery) {
    filteredStudents = filteredStudents.filter(s => 
      (s.name && s.name.toLowerCase().includes(searchQuery)) || 
      (s.email && s.email.toLowerCase().includes(searchQuery))
    );
  }

  const body = document.getElementById("class-students-table-body");
  body.innerHTML = "";

  const paginationContainerId = 'students-pagination';
  const paginationEl = document.getElementById(paginationContainerId);
  if (paginationEl) paginationEl.innerHTML = "";

  if (filteredStudents.length === 0) {
    body.innerHTML = \`<tr><td colspan="8" class="px-5 py-6 text-center text-indigo-300 text-xs">Không tìm thấy học sinh nào thuộc điều kiện lọc.</td></tr>\`;
    return;
  }

  const currentPage = window.teacherPagination.students || 1;
  const pagedStudents = filteredStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredStudents.length, currentPage, paginationContainerId, 'students');

  const scores = window.IC3_CACHE[window.IC3_KEYS.SCORES] || [] || [];
  const settings = window.IC3_CACHE[window.IC3_KEYS.SETTINGS] || [];
  const config = settings.find(s => s.id === "game_config");
  const limit = config && config.bossHuntLimit !== undefined ? config.bossHuntLimit : 2;
  const today = getBossHuntDayKey();
  pagedStudents.forEach(std => {`;

code = code.replace(target, replacement);
fs.writeFileSync('teacher/script.js', code);
