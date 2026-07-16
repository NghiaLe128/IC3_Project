const fs = require('fs');
const js = fs.readFileSync('student/script.js', 'utf8');
try {
  new Function('window', 'document', js)({}, {});
  console.log("No execution error");
} catch(e) {
  console.error("Execution error:", e);
}
