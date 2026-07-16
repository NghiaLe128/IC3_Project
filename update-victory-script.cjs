const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');

code = code.replace(`  const lvlBadge = document.getElementById("victory-lvl-up-badge");
  if (levelUp) {`, `  const catchBtn = document.getElementById("victory-catch-btn");
  if (catchBtn && window.lastTestEligibility && window.lastTestEligibility.isEligible) {
    catchBtn.classList.remove("hidden");
  } else if (catchBtn) {
    catchBtn.classList.add("hidden");
  }

  const lvlBadge = document.getElementById("victory-lvl-up-badge");
  if (levelUp) {`);

code = code.replace(`function closeVictoryScreen() {
  document.getElementById("game-victory-screen").classList.add("hidden");
  
  // Trigger Catch Sequence if eligible (0-2 errors)
  if (window.lastTestEligibility && window.lastTestEligibility.isEligible) {
    startCatchPokemonSequence();
  } else {
    // Update state and load fresh tab
    loadStudentProfile();
    renderBattleArena();
  }
}`, `function closeVictoryScreen() {
  document.getElementById("game-victory-screen").classList.add("hidden");
  window.lastTestEligibility = null; // Clear if they skip
  loadStudentProfile();
  renderBattleArena();
}

window.startCatchPokemonSequenceFromVictory = function() {
  document.getElementById("game-victory-screen").classList.add("hidden");
  startCatchPokemonSequence();
};`);

fs.writeFileSync('student/script.js', code);
