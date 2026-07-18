const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

code = code.replace(/case 'questions': renderQuestionsList\(\); break;\}/g, "case 'questions': renderQuestionsList(); break; case 'overview': renderOverviewProgressTable(window.IC3_CACHE[window.IC3_KEYS.STUDENTS].filter(s => s.classId === activeClassId)); break;}");

fs.writeFileSync('teacher/script.js', code);
