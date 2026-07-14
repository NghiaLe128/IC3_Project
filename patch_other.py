import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target1 = """      const maxScore = Math.max(...studentTestScores.map(s => s.score));
      bestScoreText = `Điểm cao nhất: ${maxScore}/100`;
      if (maxScore >= 50) {
        statusIcon = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>`;
      } else {"""

replacement1 = """      const maxScore = Math.max(...studentTestScores.map(s => s.score));
      bestScoreText = `Điểm cao nhất: ${maxScore}/100`;
      
      const bestAttempt = studentTestScores.reduce((best, s) => s.score > (best ? best.score : -1) ? s : best, null);
      let isPassed = false;
      if (bestAttempt) {
        if (bestAttempt.correctCount !== undefined && bestAttempt.totalCount !== undefined) {
          const wrong = bestAttempt.totalCount - bestAttempt.correctCount;
          isPassed = !(wrong >= 5 || bestAttempt.correctCount < 20);
        } else {
          isPassed = bestAttempt.score >= 50;
        }
      }

      if (isPassed) {
        statusIcon = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>`;
      } else {"""

target2 = """      let rankBadge = `<span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700">CHƯA ĐẠT</span>`;
      if (scoreEntry.score >= 90) {
        rankBadge = `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30">XUẤT SẮC</span>`;
      } else if (scoreEntry.score >= 50) {
        rankBadge = `<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">ĐẠT</span>`;
      }"""

replacement2 = """      let isPassed = false;
      if (scoreEntry.correctCount !== undefined && scoreEntry.totalCount !== undefined) {
        const wrong = scoreEntry.totalCount - scoreEntry.correctCount;
        isPassed = !(wrong >= 5 || scoreEntry.correctCount < 20);
      } else {
        isPassed = scoreEntry.score >= 50;
      }

      let rankBadge = `<span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700">CHƯA ĐẠT</span>`;
      if (scoreEntry.score >= 90) {
        rankBadge = `<span class="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30">XUẤT SẮC</span>`;
      } else if (isPassed) {
        rankBadge = `<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">ĐẠT</span>`;
      }"""


if target1 in content:
    content = content.replace(target1, replacement1)
    print("Patched 1")
else:
    print("Failed to patch 1")

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Patched 2")
else:
    print("Failed to patch 2")

with open('student/script.js', 'w') as f:
    f.write(content)
