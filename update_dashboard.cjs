const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

code = code.replace(
  'const timeSecs = scoreObj.timeSpentSeconds || 999999;',
  `let timeSecs = scoreObj.timeSpentSeconds;
    if (timeSecs === undefined && scoreObj.timeSpent) {
      const parts = scoreObj.timeSpent.split(':');
      if (parts.length === 2) {
        timeSecs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      } else {
        timeSecs = 999999;
      }
    } else if (timeSecs === undefined) {
      timeSecs = 999999;
    }`
);
fs.writeFileSync('student/script.js', code);
