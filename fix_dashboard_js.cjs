const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const oldRender = `window.renderStudentDashboard = function() {
  if (!currentStudent) return;
  
  const allTests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const testFilterSelect = document.getElementById("dashboard-test-filter");
  
  if (testFilterSelect && testFilterSelect.options.length <= 1) {
    allTests.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = \`📝 \${t.title}\`;
      testFilterSelect.appendChild(opt);
    });
  }`;

const newRender = `window.renderStudentDashboard = function() {
  if (!currentStudent) return;
  
  // Render personal info on dashboard right card
  const dashAvatar = document.getElementById("dashboard-avatar");
  const dashName = document.getElementById("dashboard-name");
  const dashLevelBadge = document.getElementById("dashboard-level-badge");
  const dashExpText = document.getElementById("dashboard-exp-text");
  const dashExpBar = document.getElementById("dashboard-exp-bar");
  
  if (dashAvatar) dashAvatar.src = currentStudent.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=default";
  if (dashName) dashName.textContent = currentStudent.fullName || currentStudent.email;
  
  const currentExp = currentStudent.exp || 0;
  const currentLevel = Math.floor(currentExp / 1000) + 1;
  const currentLevelExp = currentExp % 1000;
  if (dashLevelBadge) dashLevelBadge.textContent = "Lv." + currentLevel;
  if (dashExpText) dashExpText.textContent = currentLevelExp + "/1000";
  if (dashExpBar) dashExpBar.style.width = (currentLevelExp / 1000 * 100) + "%";
  
  const allTests = window.IC3_CACHE[window.IC3_KEYS.TESTS] || [];
  const testFilterSelect = document.getElementById("dashboard-test-filter");
  
  if (testFilterSelect) {
    const selectedVal = testFilterSelect.value;
    testFilterSelect.innerHTML = '<option value="all">🏆 Tất cả Bộ Đề</option>';
    allTests.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = \`📝 \${t.title}\`;
      testFilterSelect.appendChild(opt);
    });
    // restore selected value
    const opts = Array.from(testFilterSelect.options);
    if (opts.some(o => o.value === selectedVal)) {
      testFilterSelect.value = selectedVal;
    }
  }`;

code = code.replace(oldRender, newRender);
fs.writeFileSync('student/script.js', code);
