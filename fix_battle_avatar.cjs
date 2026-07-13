const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const oldLine = `elAvatar.innerText = pokemonAvatars[activePoke] || "⚡";`;
const newLine = `
    const pKey = (activePoke || "pikachu").replace("reward_", "");
    let tIdx = 0;
    const clvl = currentStudent.level || "Beginner";
    if (clvl === "Explorer") tIdx = 1;
    else if (clvl === "Expert") tIdx = 2;
    else if (clvl === "Master IC3") tIdx = 3;
    const targetP = (window.evoMap[pKey] || [pKey, pKey, pKey, pKey])[tIdx];
    elAvatar.innerHTML = \`<img src="https://projectpokemon.org/images/normal-sprite/\${targetP}.gif" class="w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse" onerror="this.src='https://play.pokemonshowdown.com/sprites/xyani/\${targetP}.gif'">\`;
    elAvatar.className = \`transition-all duration-300 flex justify-center w-full\`;
`;

code = code.replace(oldLine, newLine);
fs.writeFileSync('student/script.js', code);
