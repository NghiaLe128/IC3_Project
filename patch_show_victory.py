import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """function showVictoryScreen(score, expGained, coinsGained, levelUp, bananasGained = 0, correctCount = 0, totalCount = 0) {
  document.getElementById("victory-test-title").innerText = activePlayingTest.title;
  
  const displayTotal = totalCount || testQuestions.length;"""

replacement = """function showVictoryScreen(score, expGained, coinsGained, levelUp, bananasGained = 0, correctCount = 0, totalCount = 0) {
  document.getElementById("victory-test-title").innerText = activePlayingTest.title;
  
  const displayTotal = totalCount || testQuestions.length;
  
  const wrongCount = displayTotal - correctCount;
  const titleEl = document.getElementById("victory-title");
  const iconWrapperEl = document.getElementById("victory-icon-wrapper");
  const iconEl = document.getElementById("victory-icon");
  const scoreBadgeEl = document.getElementById("victory-score");
  
  if (titleEl && iconWrapperEl && iconEl) {
    if (correctCount < 20) {
      // QUÁ YẾU
      titleEl.innerText = "QUÁ YẾU 😭";
      titleEl.className = "font-poppins font-black text-2xl text-red-500 tracking-wide uppercase mb-1";
      iconWrapperEl.className = "w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-red-500 via-rose-600 to-red-800 p-0.5 shadow-xl shadow-red-500/30 animate-shake mb-6";
      iconEl.innerText = "💀";
    } else if (wrongCount >= 5) {
      // THẤT BẠI
      titleEl.innerText = "THẤT BẠI 😢";
      titleEl.className = "font-poppins font-black text-2xl text-orange-500 tracking-wide uppercase mb-1";
      iconWrapperEl.className = "w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-orange-400 via-red-500 to-rose-500 p-0.5 shadow-xl shadow-orange-500/30 mb-6";
      iconEl.innerText = "💥";
    } else {
      // VICTORY
      titleEl.innerText = "🎉 VICTORY SCREEN 🎉";
      titleEl.className = "font-poppins font-black text-2xl text-yellow-400 tracking-wide uppercase mb-1";
      iconWrapperEl.className = "w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 p-0.5 shadow-xl shadow-yellow-500/30 animate-bounce mb-6";
      iconEl.innerText = "🏆";
    }
  }
"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched showVictoryScreen")
else:
    print("Target not found in showVictoryScreen")
