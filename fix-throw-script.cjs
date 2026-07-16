const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');

const throwReplace = /const ballUI = document.getElementById\(\`pokeball-\\\${index}\`\);[\s\S]*?catchState.ballsRemaining--;/m;
const throwNew = `const ballUI = document.getElementById(\`pokeball-\${index}\`);
  const ballUIMobile = document.getElementById(\`pokeball-mobile-\${index}\`);
  if (!ballUI || ballUI.classList.contains("opacity-0")) return;
  
  ballUI.classList.add("opacity-0", "pointer-events-none");
  if (ballUIMobile) ballUIMobile.classList.add("opacity-0", "pointer-events-none");
  catchState.ballsRemaining--;`;

code = code.replace(throwReplace, throwNew);
fs.writeFileSync('student/script.js', code);
