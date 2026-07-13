const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const oldLine = `document.getElementById("playerAvatarFrame").innerText = pokemonAvatars[currentStudent.pokemon] || "⚡";`;
const newLine = `
  const frameEl = document.getElementById("playerAvatarFrame");
  if (frameEl) {
    const pKey = (currentStudent.pokemon || "pikachu").replace("reward_", "");
    let tIdx = 1;
    const clvl = currentStudent.level || "Beginner";
    if (clvl === "Explorer") tIdx = 1;
    else if (clvl === "Expert") tIdx = 2;
    else if (clvl === "Master IC3") tIdx = 3;
    const targetP = (window.evoMap[pKey] || [pKey, pKey, pKey, pKey])[tIdx];
    
    frameEl.innerHTML = \`<img src="https://projectpokemon.org/images/normal-sprite/\${targetP}.gif" class="w-10 h-10 object-contain drop-shadow-md" onerror="this.src='https://play.pokemonshowdown.com/sprites/xyani/\${targetP}.gif'">\`;
  }`;

code = code.replace(oldLine, newLine);
fs.writeFileSync('student/script.js', code);
