const fs = require('fs');
['student/script.js', 'teacher/script.js'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\\\$/g, '$');
  code = code.replace(/\\`/g, '`');
  fs.writeFileSync(file, code);
});
