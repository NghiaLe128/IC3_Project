import sys

with open('student/index.html', 'r') as f:
    content = f.read()

target = """        <!-- Trophy / Victory Big Icon -->
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 p-0.5 shadow-xl shadow-yellow-500/30 animate-bounce mb-6">
          <div class="w-full h-full bg-game-dark rounded-full flex items-center justify-center text-4xl">
            🏆
          </div>
        </div>

        <h2 class="font-poppins font-black text-2xl text-yellow-400 tracking-wide uppercase mb-1">🎉 VICTORY SCREEN 🎉</h2>"""

replacement = """        <!-- Trophy / Victory Big Icon -->
        <div id="victory-icon-wrapper" class="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 p-0.5 shadow-xl shadow-yellow-500/30 animate-bounce mb-6">
          <div id="victory-icon" class="w-full h-full bg-game-dark rounded-full flex items-center justify-center text-4xl">
            🏆
          </div>
        </div>

        <h2 id="victory-title" class="font-poppins font-black text-2xl text-yellow-400 tracking-wide uppercase mb-1">🎉 VICTORY SCREEN 🎉</h2>"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/index.html', 'w') as f:
        f.write(content)
    print("Patched HTML")
else:
    print("Target not found in HTML")
