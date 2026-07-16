const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');
code = code.replace(/\\\`Bạn đã/g, "\`Bạn đã");
code = code.replace(/\\\`\<span/g, "\`<span");
fs.writeFileSync('student/script.js', code);
