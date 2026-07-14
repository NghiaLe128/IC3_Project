const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

// Modify showCheatToast
code = code.replace(
  /function showCheatToast\(\) \{[\s\S]*?PHÁT HIỆN GIAN LẬN! Bài thi đã bị hủy\.<\/span>`;/,
  `function showCheatToast(reason = "") {
  const toast = document.createElement("div");
  toast.className = "fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-red-400 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold text-sm flex items-center gap-3 animate-bounce";
  toast.innerHTML = \`<i class="fa-solid fa-triangle-exclamation text-yellow-300 text-xl"></i> <span>PHÁT HIỆN GIAN LẬN! \${reason} Bài thi đã bị hủy.</span>\`;`
);

// Modify handleCheatDetected
code = code.replace(
  /function handleCheatDetected\(\) {\n  if \(!window\._isTestActiveForAntiCheat \|\| isReviewingExam\) return;\n  \n  showCheatToast\(\);/,
  `function handleCheatDetected(reason = "Thoát trang / Ẩn màn hình") {
  if (!window._isTestActiveForAntiCheat || isReviewingExam) return;
  
  showCheatToast(reason);
  
  if (window.syncCheatToGoogleSheet) {
    window.syncCheatToGoogleSheet(reason);
  }`
);

// Update calls to handleCheatDetected
code = code.replace(/handleCheatDetected\(\);/g, (match, offset, str) => {
  // Try to determine the context
  const preContext = str.substring(Math.max(0, offset - 100), offset);
  if (preContext.includes("visibilitychange")) return `handleCheatDetected("Chuyển sang tab khác");`;
  if (preContext.includes("blur")) return `handleCheatDetected("Mất focus bài thi");`;
  if (preContext.includes("keydown")) return `handleCheatDetected("Sử dụng phím tắt bị cấm");`;
  if (preContext.includes("popstate")) return `handleCheatDetected("Sử dụng nút Back");`;
  if (preContext.includes("switchStudentTab")) return `handleCheatDetected("Cố tình chuyển tab");`;
  return `handleCheatDetected();`;
});

fs.writeFileSync('student/script.js', code);
