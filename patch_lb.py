import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """          <span class="w-8 h-8 rounded-full bg-slate-950/60 border border-white/10 flex items-center justify-center text-lg shadow-sm shrink-0">
            ${pokemonAvatars[st.pokemon] || "⚡"}
          </span>
          <div>
            <span class="text-white font-black block">${st.name} ${isMe ? ' <span class="text-[9px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase">Bạn</span>' : ''}</span>
            <span class="text-[9px] text-slate-400 font-medium block truncate max-w-[120px] sm:max-w-none">${st.email}</span>
          </div>"""

replacement = """          <div class="w-10 h-10 rounded-full bg-slate-950/80 border border-white/10 flex items-center justify-center shadow-sm shrink-0 overflow-hidden relative">
            <img src="https://play.pokemonshowdown.com/sprites/xyani/${window.getShowdownFormName(st.pokemon || 'pikachu')}.gif" class="w-full h-full object-contain scale-125 p-1 drop-shadow-md" onerror="this.src='https://projectpokemon.org/images/normal-sprite/${st.pokemon || 'pikachu'}.gif'">
          </div>
          <div>
            <span class="text-white font-black block">${st.name || "Học viên vô danh"} ${isMe ? ' <span class="text-[9px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase">Bạn</span>' : ''}</span>
          </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched leaderboard")
else:
    print("Target not found in leaderboard")
