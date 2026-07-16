const fs = require('fs');
let code = fs.readFileSync('assets/js/db-init.js', 'utf-8');
code = code.replace(`  BOSSES: "bosses",
  SETTINGS: "settings",`, `  BOSSES: "bosses",
  POKEMONS: "pokemons",
  SETTINGS: "settings",`);

code = code.replace(`    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.REWARDS, IC3_KEYS.BOSSES, IC3_KEYS.SETTINGS];`, `    collectionsToFetch = [IC3_KEYS.CLASSES, IC3_KEYS.TESTS, IC3_KEYS.QUESTIONS, IC3_KEYS.REWARDS, IC3_KEYS.BOSSES, IC3_KEYS.POKEMONS, IC3_KEYS.SETTINGS];`);

fs.writeFileSync('assets/js/db-init.js', code);
