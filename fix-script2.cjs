const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');
code = code.replace(/\\\$/g, "$");
code = code.replace(/\\\`/g, "\`");
fs.writeFileSync('student/script.js', code);
