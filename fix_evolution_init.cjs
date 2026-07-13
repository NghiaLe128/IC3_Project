const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const oldLogic = `let nextExpReq = 500;
  let nextLevelName = "Explorer";
  if (currentStudent.level === "Explorer") {
    nextExpReq = 1500;
    nextLevelName = "Expert";
  } else if (currentStudent.level === "Expert") {
    nextExpReq = 3000;
    nextLevelName = "Master IC3";
  } else if (currentStudent.level === "Master IC3") {
    nextExpReq = 999999;
    nextLevelName = "Max Level đạt chuẩn";
  }
  const isExpMet = currentStudent.exp >= nextExpReq;
  
  const titleEl = document.getElementById("evolution-target-title");
  if (titleEl) titleEl.innerText = nextLevelName.toUpperCase();
  
  const evoMap = {
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
  
  let targetIndex = 1; // Default to Explorer
  if (nextLevelName === "Expert") targetIndex = 2;
  else if (nextLevelName === "Master IC3") targetIndex = 3;
  else if (nextLevelName === "Max Level đạt chuẩn") targetIndex = 3;
  
  const currPokemon = currentStudent.pokemon || "pikachu";
  // Remove 'reward_' prefix if exists
  const pokeKey = currPokemon.replace("reward_", "");
  
  const evolutions = evoMap[pokeKey] || [pokeKey, pokeKey, pokeKey, pokeKey];
  const targetPokemonName = evolutions[targetIndex];
  
  const avatarEl = document.getElementById("evolution-target-avatar");
  if (avatarEl) {
    avatarEl.src = \`https://projectpokemon.org/images/normal-sprite/\${targetPokemonName}.gif\`;
    avatarEl.classList.remove("hidden");
    // Fallback if image fails to load
    avatarEl.onerror = function() {
      this.src = \`https://play.pokemonshowdown.com/sprites/xyani/\${targetPokemonName}.gif\`;
    };
  }
  
  const reqExpEl = document.getElementById("evolution-req-exp");
  if (reqExpEl) {
    reqExpEl.innerHTML = isExpMet
      ? \`<span class="text-emerald-400 font-extrabold"><i class="fa-solid fa-circle-check"></i> \${currentStudent.exp}/\${nextExpReq} EXP</span>\`
      : \`\${currentStudent.exp}/\${nextExpReq} EXP\`;
  }
  const barExpEl = document.getElementById("evolution-bar-exp");
  if (barExpEl) {
    const pct = Math.min(100, Math.round((currentStudent.exp / nextExpReq) * 100));
    barExpEl.style.width = \`\${pct}%\`;
  }`;

code = code.replace(oldLogic, "window.renderEvolutionSlideshow();");
fs.writeFileSync('student/script.js', code);
