const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const evoMapObj = `
window.evoMap = {
    "bulbasaur": ["bulbasaur", "ivysaur", "venusaur", "venusaur-mega"],
    "charmander": ["charmander", "charmeleon", "charizard", "charizard-megax"],
    "squirtle": ["squirtle", "wartortle", "blastoise", "blastoise-mega"],
    "pikachu": ["pikachu", "raichu", "raichu-alola", "raichu-alola"],
    "eevee": ["eevee", "flareon", "vaporeon", "jolteon"],
    "snorlax": ["snorlax", "snorlax", "snorlax", "snorlax"],
    "gengar": ["gengar", "gengar", "gengar-mega", "gengar-mega"],
    "lucario": ["lucario", "lucario", "lucario-mega", "lucario-mega"],
    "charizard": ["charizard", "charizard", "charizard-megax", "charizard-megay"],
    "dragonite": ["dragonite", "dragonite", "dragonite", "dragonite"],
    "mewtwo": ["mewtwo", "mewtwo", "mewtwo-megax", "mewtwo-megay"],
    "rayquaza": ["rayquaza", "rayquaza", "rayquaza-mega", "rayquaza-mega"],
    "arceus": ["arceus", "arceus", "arceus", "arceus"]
};
window.currentEvolutionIndex = 0;
window.renderEvolutionSlideshow = function() {
    if (!currentStudent) return;
    const pokeKey = (currentStudent.pokemon || "pikachu").replace("reward_", "");
    const evolutions = window.evoMap[pokeKey] || [pokeKey, pokeKey, pokeKey, pokeKey];
    
    let unlockedIndex = 0;
    const lvl = currentStudent.level || "Beginner";
    if (lvl === "Explorer") unlockedIndex = 1;
    else if (lvl === "Expert") unlockedIndex = 2;
    else if (lvl === "Master IC3") unlockedIndex = 3;

    const coinReqs = [0, 500, 1500, 3000];
    const expReqs = [0, 500, 1500, 3000];

    const slideTargetName = evolutions[window.currentEvolutionIndex];
    const titleEl = document.getElementById("evolution-target-title");
    const avatarEl = document.getElementById("evolution-target-avatar");
    const lockEl = document.getElementById("evolution-lock-overlay");
    const stageEl = document.getElementById("evolution-stage-text");
    
    if (titleEl) titleEl.innerText = slideTargetName.toUpperCase();
    if (stageEl) stageEl.innerText = "STAGE " + (window.currentEvolutionIndex + 1);
    
    if (avatarEl) {
        avatarEl.src = \`https://projectpokemon.org/images/normal-sprite/\${slideTargetName}.gif\`;
        avatarEl.classList.remove("hidden");
        avatarEl.onerror = function() {
            this.src = \`https://play.pokemonshowdown.com/sprites/xyani/\${slideTargetName}.gif\`;
        };
        
        if (window.currentEvolutionIndex > unlockedIndex) {
            avatarEl.classList.add("grayscale", "brightness-50");
            lockEl.classList.remove("hidden");
        } else {
            avatarEl.classList.remove("grayscale", "brightness-50");
            lockEl.classList.add("hidden");
        }
    }
    
    document.getElementById("evolution-req-level").innerText = \`\${currentStudent.exp}/\${expReqs[window.currentEvolutionIndex]} EXP\`;
    document.getElementById("evolution-req-coins").innerText = coinReqs[window.currentEvolutionIndex] + " 🪙";
    
    const pct = Math.min(100, Math.round((currentStudent.exp / Math.max(1, expReqs[window.currentEvolutionIndex])) * 100));
    const barExpEl = document.getElementById("evolution-req-bar");
    if (barExpEl) barExpEl.style.width = \`\${pct}%\`;
    
    const btn = document.getElementById("evolve-poke-btn");
    if (!btn) return;

    if (window.currentEvolutionIndex <= unlockedIndex) {
        btn.innerText = "ĐÃ MỞ KHÓA";
        btn.className = "w-full py-2 bg-slate-800 text-slate-500 text-xs font-black rounded-xl cursor-not-allowed transition-all text-center uppercase tracking-widest";
        btn.onclick = null;
    } else if (window.currentEvolutionIndex === unlockedIndex + 1) {
        btn.innerText = "🔮 TIẾN HÓA NGAY";
        btn.className = "w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 text-xs font-black rounded-xl cursor-pointer hover:from-emerald-600 hover:to-green-700 transition-all text-center uppercase tracking-widest";
        btn.onclick = window.triggerEvolvePokemon;
    } else {
        btn.innerText = "🔒 MỞ KHÓA TRƯỚC";
        btn.className = "w-full py-2 bg-red-900/50 text-red-500 text-xs font-black rounded-xl cursor-not-allowed transition-all text-center uppercase tracking-widest border border-red-500/30";
        btn.onclick = null;
    }
}

window.prevEvolution = function() {
    window.currentEvolutionIndex--;
    if (window.currentEvolutionIndex < 0) window.currentEvolutionIndex = 3;
    window.renderEvolutionSlideshow();
}

window.nextEvolution = function() {
    window.currentEvolutionIndex++;
    if (window.currentEvolutionIndex > 3) window.currentEvolutionIndex = 0;
    window.renderEvolutionSlideshow();
}

window.triggerEvolvePokemon = async function() {
    if (!currentStudent) return;
    let unlockedIndex = 0;
    const lvl = currentStudent.level || "Beginner";
    if (lvl === "Explorer") unlockedIndex = 1;
    else if (lvl === "Expert") unlockedIndex = 2;
    else if (lvl === "Master IC3") unlockedIndex = 3;

    if (window.currentEvolutionIndex !== unlockedIndex + 1) {
        window.showToast("Chưa đủ điều kiện tiến hóa stage này!", "error");
        return;
    }

    const coinReqs = [0, 500, 1500, 3000];
    const expReqs = [0, 500, 1500, 3000];
    const reqCoins = coinReqs[window.currentEvolutionIndex];
    const reqExp = expReqs[window.currentEvolutionIndex];

    if (currentStudent.exp < reqExp) {
        window.showToast(\`Cần \${reqExp} EXP để tiến hóa!\`, "error");
        return;
    }
    
    if ((currentStudent.coins || 0) < reqCoins) {
        window.showToast(\`Không đủ \${reqCoins} vàng để tiến hóa!\`, "error");
        return;
    }

    // Deduct coins and update level
    currentStudent.coins -= reqCoins;
    const levels = ["Beginner", "Explorer", "Expert", "Master IC3"];
    currentStudent.level = levels[window.currentEvolutionIndex];

    const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
    const idx = students.findIndex(s => s.email === currentStudent.email);
    if (idx !== -1) {
        students[idx] = currentStudent;
        const res = await window.saveData(window.IC3_KEYS.STUDENTS, students);
        if (res.success) {
            window.showToast("Tiến hóa thành công! 🎉");
            window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            
            // Check if there is an avatar sync needed (in some logic pokemon evolution is also avatar)
            loadStudentProfile();
        } else {
            window.showToast("Lỗi hệ thống khi lưu", "error");
            currentStudent.coins += reqCoins; // rollback
        }
    }
}
`;

// Prepend the evo map logic
code = evoMapObj + "\n" + code;
fs.writeFileSync('student/script.js', code);
