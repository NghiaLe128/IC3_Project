const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf8');

const evoLogic = `const titleEl = document.getElementById("evolution-target-title");
  if (titleEl) titleEl.innerText = nextLevelName.toUpperCase();`;

const newEvoLogic = `const titleEl = document.getElementById("evolution-target-title");
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
  }`;

code = code.replace(evoLogic, newEvoLogic);
fs.writeFileSync('student/script.js', code);
