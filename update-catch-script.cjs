const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');

// Replace startCatchPokemonSequence
code = code.replace(/function startCatchPokemonSequence\(\) \{[\s\S]*?function handleThrowPokeball\(index\) \{/m, `function startCatchPokemonSequence() {
  const eligibility = window.lastTestEligibility;
  if (!eligibility || !eligibility.isEligible) return;

  // Determine balls
  let balls = 0;
  if (eligibility.wrongCount === 0) balls = 4;
  else if (eligibility.wrongCount === 1) balls = 3;
  else if (eligibility.wrongCount === 2) balls = 2;

  // Fetch pokemons from database/cache
  const pokemonsData = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
  
  if (pokemonsData.length === 0) {
     console.error("Pokemon data not loaded.");
     return;
  }

  // Select target Pokemon
  const pool = pokemonsData.filter(p => p.rarity !== "Thần Thoại");
  const rand = Math.random();
  // Spawn rate: 30% hiếm (Rare), 70% thường (Normal)
  let selectedRarity = rand < 0.3 ? "Hiếm" : "Thường";
  
  let candidates = pool.filter(p => p.rarity === selectedRarity);
  if (candidates.length === 0) candidates = pool; // Fallback

  const targetPoke = candidates[Math.floor(Math.random() * candidates.length)];
  
  const baseChance = targetPoke.rarity === "Hiếm" ? 0.30 : 0.60;

  catchState = {
    ballsRemaining: balls,
    targetPokemon: targetPoke,
    baseChance: baseChance,
    isFinished: false
  };

  // UI Updates
  const overlay = document.getElementById("catch-pokemon-overlay");
  const img = document.getElementById("wild-pokemon-img");
  const nameEl = document.getElementById("catch-poke-name");
  const rarityBadge = document.getElementById("catch-rarity-badge");
  const elementEl = document.getElementById("catch-element");
  const spawnRateEl = document.getElementById("catch-spawn-rate");
  const successRateEl = document.getElementById("catch-success-rate");
  const container = document.getElementById("pokeballs-container");
  
  if (!overlay) return;

  img.src = targetPoke.image;
  nameEl.innerText = targetPoke.name;
  
  // Rarity Colors
  rarityBadge.innerText = targetPoke.rarity;
  if (targetPoke.rarity === "Hiếm") {
    rarityBadge.className = "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-yellow-500 text-yellow-950 shadow-inner";
    spawnRateEl.innerText = "30%";
  } else {
    rarityBadge.className = "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-600 text-slate-200 shadow-inner";
    spawnRateEl.innerText = "70%";
  }

  elementEl.innerText = targetPoke.element || "Không rõ";
  successRateEl.innerText = (baseChance * 100).toFixed(0) + "%";

  container.innerHTML = "";
  for (let i = 0; i < balls; i++) {
    container.innerHTML += \`<img id="pokeball-\${i}" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-6 h-6 transition-all duration-300">\`;
  }

  const results = document.getElementById("catch-results");
  if (results) results.classList.add("hidden");
  
  const msg = document.getElementById("catch-message");
  if (msg) msg.innerHTML = "";

  overlay.classList.remove("hidden");
}

window.handleThrowPokeballAnimated = function() {
  if (catchState.isFinished || catchState.ballsRemaining <= 0) return;
  
  const index = catchState.ballsRemaining - 1;
  const ballUI = document.getElementById(\`pokeball-\${index}\`);
  if (!ballUI || ballUI.classList.contains("opacity-0")) return;
  
  ballUI.classList.add("opacity-0", "pointer-events-none");
  catchState.ballsRemaining--;
  
  const msg = document.getElementById("catch-message");
  if (msg) msg.innerHTML = \`<div class="inline-block bg-slate-900/80 px-6 py-3 rounded-full border border-indigo-500/50 shadow-xl"><p class="text-lg font-black text-white animate-pulse tracking-widest uppercase">ĐANG BẮT... 💫</p></div>\`;
  
  // Animation logic
  const pokeImg = document.getElementById("wild-pokemon-img");
  const thrownBall = document.getElementById("thrown-pokeball");
  const actions = document.getElementById("catch-actions");
  
  actions.classList.add("opacity-50", "pointer-events-none");
  
  if (thrownBall && pokeImg) {
    thrownBall.classList.remove("hidden");
    // Start at button position (bottom)
    thrownBall.style.bottom = "0px";
    thrownBall.style.left = "50%";
    thrownBall.style.transform = "translateX(-50%) rotate(0deg)";
    
    // Animate throw to center
    setTimeout(() => {
      thrownBall.style.bottom = "120px"; // Adjust based on visual
      thrownBall.style.transform = "translateX(-50%) rotate(720deg) scale(1.5)";
      pokeImg.classList.add("animate-ping");
    }, 50);

    const isCaught = Math.random() < catchState.baseChance;
    
    setTimeout(() => {
      pokeImg.classList.remove("animate-ping");
      thrownBall.classList.add("hidden");
      actions.classList.remove("opacity-50", "pointer-events-none");
      
      if (isCaught) {
        pokeImg.classList.add("scale-0", "opacity-0"); // Disappear into ball
        finishCatchSequence(true);
      } else {
        if (catchState.ballsRemaining === 0) {
          finishCatchSequence(false);
        } else {
          if (msg) msg.innerHTML = \`<div class="inline-block bg-red-900/80 px-6 py-3 rounded-full border border-red-500/50 shadow-xl"><p class="text-lg font-black text-red-400 uppercase tracking-widest">Hụt rồi! Thử lại xem... 💔</p></div>\`;
          // Shake Pokemon to taunt
          pokeImg.classList.add("animate-shake");
          setTimeout(() => pokeImg.classList.remove("animate-shake"), 500);
        }
      }
    }, 1200);
  }
}

function handleThrowPokeball(index) {`);

// Replace finishCatchSequence
code = code.replace(/function finishCatchSequence\(success\) \{[\s\S]*?function closeCatchScreen\(\)/m, `function finishCatchSequence(success) {
  catchState.isFinished = true;
  const results = document.getElementById("catch-results");
  const icon = document.getElementById("result-icon");
  const title = document.getElementById("result-title");
  const desc = document.getElementById("result-desc");
  
  if (results) results.classList.remove("hidden");
  
  if (success) {
    icon.innerText = "🎉";
    title.innerText = "CHÚC MỪNG!";
    title.className = "text-4xl font-black text-emerald-400 mb-4 tracking-tighter drop-shadow-md";
    desc.innerHTML = \`Bạn đã thu phục thành công <span class="font-black text-emerald-300 uppercase">\${catchState.targetPokemon.name}</span>!\`;
    
    // Save to unlocked Pokemons
    if (!currentStudent.unlockedPokemons) currentStudent.unlockedPokemons = [];
    if (!currentStudent.unlockedPokemons.includes(catchState.targetPokemon.id)) {
      currentStudent.unlockedPokemons.push(catchState.targetPokemon.id);
      
      const students = window.IC3_CACHE[window.IC3_KEYS.STUDENTS] || [];
      const idx = students.findIndex(s => s.email === currentStudent.email);
      if (idx !== -1) {
        students[idx] = currentStudent;
        window.saveData(window.IC3_KEYS.STUDENTS, students, currentStudent.email);
      }
    }
  } else {
    icon.innerText = "💨";
    title.innerText = "TIẾC QUÁ!";
    title.className = "text-4xl font-black text-slate-400 mb-4 tracking-tighter drop-shadow-md";
    desc.innerHTML = \`<span class="font-black text-white uppercase">\${catchState.targetPokemon.name}</span> đã chạy thoát mất rồi...\`;
  }
}

function closeCatchScreen()`);

fs.writeFileSync('student/script.js', code);
