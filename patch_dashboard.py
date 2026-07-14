import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """             <div class="relative">
               <img src="${studentInfo.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" class="w-8 h-8 rounded-full bg-[#050811] border-2 ${isMe ? 'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : index===0 ? 'border-yellow-400' : index===1 ? 'border-slate-300' : index===2 ? 'border-amber-600' : 'border-white/10'} shrink-0 object-contain p-0.5">
               ${isMe ? '<span class="absolute -top-1 -right-1 flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>' : ''}
             </div>
             <div>
               <span class="font-poppins font-black text-white block leading-tight">${studentInfo.fullName || studentInfo.email} ${isMe ? ' <span class="text-[8px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-black uppercase ml-1 border border-yellow-500/30">Cá nhân</span>' : ''}</span>
               <span class="text-[9px] text-slate-500 font-medium font-mono">${studentInfo.email}</span>
             </div>"""

replacement = """             <div class="relative">
               <img src="https://play.pokemonshowdown.com/sprites/xyani/${window.getShowdownFormName(studentInfo.pokemon || 'pikachu')}.gif" class="w-8 h-8 rounded-full bg-[#050811] border-2 ${isMe ? 'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : index===0 ? 'border-yellow-400' : index===1 ? 'border-slate-300' : index===2 ? 'border-amber-600' : 'border-white/10'} shrink-0 object-contain p-0.5 scale-[1.3]" onerror="this.src='https://projectpokemon.org/images/normal-sprite/${studentInfo.pokemon || 'pikachu'}.gif'">
               ${isMe ? '<span class="absolute -top-1 -right-1 flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>' : ''}
             </div>
             <div>
               <span class="font-poppins font-black text-white block leading-tight">${studentInfo.fullName || "Học viên vô danh"} ${isMe ? ' <span class="text-[8px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-black uppercase ml-1 border border-yellow-500/30">Cá nhân</span>' : ''}</span>
             </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched dashboard")
else:
    print("Target not found in dashboard")
