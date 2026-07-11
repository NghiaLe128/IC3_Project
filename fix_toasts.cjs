const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace window.showToast(...) with window.showToast(..., 'error') if it contains "Lỗi" or "Không" or "Vui lòng"
  content = content.replace(/window\.showToast\(([`"'])([^`"']+?)\1\)/g, (match, quote, msg) => {
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('lỗi') || lowerMsg.includes('không') || lowerMsg.includes('vui lòng') || lowerMsg.includes('thất bại') || lowerMsg.includes('cảnh báo')) {
      return `window.showToast(${quote}${msg}${quote}, 'error')`;
    }
    return match;
  });

  // Handle template literals with variables `window.showToast(`abc ${var}`)`
  content = content.replace(/window\.showToast\((`[^`]+`)\)/g, (match, str) => {
    const lowerMsg = str.toLowerCase();
    if (lowerMsg.includes('lỗi') || lowerMsg.includes('không') || lowerMsg.includes('vui lòng') || lowerMsg.includes('thất bại') || lowerMsg.includes('cảnh báo')) {
      return `window.showToast(${str}, 'error')`;
    }
    return match;
  });

  // Some special cases
  content = content.replace(/window\.showToast\(([^,]+)\s*\+\s*([^\)]+)\)/g, (match, part1, part2) => {
      const p1 = part1.toLowerCase();
      if (p1.includes('lỗi') || p1.includes('không') || p1.includes('vui lòng')) {
          return `window.showToast(${part1} + ${part2}, 'error')`;
      }
      return match;
  });

  fs.writeFileSync(file, content);
}

processFile('admin/script.js');
processFile('teacher/script.js');
processFile('student/script.js');
