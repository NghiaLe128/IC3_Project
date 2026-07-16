const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');

const regexAnim = /thrownBall\.style\.bottom = "0px";[\s\S]*?\}, 50\);/m;
const newAnim = `thrownBall.style.bottom = "80px";
    thrownBall.style.left = "50%";
    thrownBall.style.transform = "translateX(-50%) rotate(0deg) scale(1)";
    
    // Animate throw to center (where Pokemon is)
    setTimeout(() => {
      thrownBall.style.bottom = "50%"; // Adjust based on visual
      thrownBall.style.transform = "translate(-50%, 50%) rotate(1080deg) scale(2)";
      setTimeout(() => pokeImg.classList.add("animate-ping"), 300);
    }, 50);`;

code = code.replace(regexAnim, newAnim);
fs.writeFileSync('student/script.js', code);
