const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

code = code.replace(
  /e\.preventDefault\(\);\n    handleCheatDetected\(\);/g,
  'e.preventDefault();\n    handleCheatDetected("Sử dụng phím tắt bị cấm");'
);

code = code.replace(
  /history\.pushState\(null, null, window\.location\.href\);\n    handleCheatDetected\(\);/g,
  'history.pushState(null, null, window.location.href);\n    handleCheatDetected("Sử dụng nút Back");'
);

fs.writeFileSync('student/script.js', code);
