const fs = require('fs');
let html = fs.readFileSync('student/index.html', 'utf-8');

html = html.replace(/<div id="catch-pokemon-overlay"[\s\S]*?<!-- Result Overlay \(hidden by default\) -->/m, `<div id="catch-pokemon-overlay" class="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden hidden font-poppins">
      
      <!-- Immersive Background with CSS Parallax & Gradients -->
      <div class="absolute inset-0 bg-slate-950">
        <!-- Radial glow based on rarity (we can update color in JS, but let's use a nice neutral/cyan for now) -->
        <div id="catch-bg-glow" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none transition-colors duration-700"></div>
        <!-- Grid Floor -->
        <div class="absolute bottom-0 left-0 w-full h-1/2 bg-[linear-gradient(transparent_0%,rgba(15,23,42,0.8)_100%),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)]" style="background-size: 100% 100%, 40px 40px, 40px 40px; transform: perspective(500px) rotateX(60deg); transform-origin: top;"></div>
        <!-- Particles/Stars -->
        <div class="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==')] pointer-events-none"></div>
      </div>

      <!-- Top HUD / Title -->
      <div class="absolute top-8 left-0 w-full flex flex-col items-center z-20 pointer-events-none">
        <div class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-black text-xs md:text-sm tracking-[0.2em] uppercase animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)] backdrop-blur-md">
          <i class="fa-solid fa-triangle-exclamation"></i> CẢNH BÁO CHẠM TRÁN <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 class="mt-4 font-black text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase tracking-tighter text-center drop-shadow-2xl">
          SINH VẬT HOANG DÃ XUẤT HIỆN
        </h2>
      </div>

      <!-- Center Stage: Pokemon & Scanner HUD -->
      <div class="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-screen z-10 p-4">
        
        <!-- Scanner Ring -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 border-2 border-cyan-500/30 rounded-full border-dashed animate-[spin_20s_linear_infinite] pointer-events-none"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[420px] md:h-[420px] border border-indigo-500/20 rounded-full animate-[spin_30s_linear_infinite_reverse] pointer-events-none"></div>

        <!-- The Pokemon -->
        <div class="relative z-20 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-500">
          <!-- Shadow/Platform -->
          <div class="absolute bottom-4 w-48 h-8 bg-black/60 rounded-full blur-md"></div>
          <img id="wild-pokemon-img" src="" class="relative z-10 w-56 h-56 md:w-72 md:h-72 object-contain animate-[bounce_3s_infinite_ease-in-out]" style="filter: drop-shadow(0 25px 25px rgba(0,0,0,0.7));" alt="Wild Pokemon">
        </div>

        <!-- Thrown Pokeball -->
        <img id="thrown-pokeball" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="absolute bottom-20 z-30 w-16 h-16 hidden transition-all duration-[800ms] ease-in-out drop-shadow-2xl filter brightness-110" alt="Pokeball">

        <!-- Left HUD: Details Panel -->
        <div class="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 w-64 md:w-72 hidden md:block">
          <div class="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]"></div>
            <h3 class="text-xs font-black text-cyan-400 tracking-[0.15em] uppercase mb-4 flex items-center gap-2">
              <i class="fa-solid fa-microchip"></i> DỮ LIỆU SINH VẬT
            </h3>
            <div class="space-y-4">
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">ĐỊNH DANH (NAME)</p>
                <p id="catch-poke-name" class="text-xl font-black text-white uppercase tracking-tight truncate">Unknown</p>
              </div>
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">ĐỘ HIẾM (RARITY)</p>
                <span id="catch-rarity-badge" class="inline-block mt-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-700 text-white shadow-inner border border-slate-600/50">NORMAL</span>
              </div>
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">HỆ (ELEMENT)</p>
                <p id="catch-element" class="text-sm font-bold text-emerald-400">Không rõ</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right HUD: Stats Panel -->
        <div class="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-64 md:w-72 hidden md:block">
          <div class="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-1 h-full bg-rose-500 shadow-[0_0_15px_#f43f5e]"></div>
            <h3 class="text-xs font-black text-rose-400 tracking-[0.15em] uppercase mb-4 flex items-center gap-2 justify-end">
              PHÂN TÍCH (ANALYSIS) <i class="fa-solid fa-crosshairs"></i>
            </h3>
            <div class="space-y-4 text-right">
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">TỈ LỆ XUẤT HIỆN</p>
                <p id="catch-spawn-rate" class="text-lg font-black text-white">0%</p>
              </div>
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">XÁC SUẤT BẮT (CATCH RATE)</p>
                <p id="catch-success-rate" class="text-lg font-black text-yellow-400">0%</p>
              </div>
              <div>
                <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">SỐ BÓNG CÒN LẠI</p>
                <div id="pokeballs-container" class="flex gap-1.5 justify-end mt-1">
                  <!-- Pokeballs rendered here -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile HUD (Visible only on small screens) -->
        <div class="md:hidden absolute top-32 w-[90%] max-w-sm bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl z-20">
          <div class="flex justify-between items-center border-b border-slate-700/50 pb-2 mb-2">
            <p id="catch-poke-name-mobile" class="text-lg font-black text-white uppercase tracking-tight truncate flex-1">Unknown</p>
            <span id="catch-rarity-badge-mobile" class="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-700 text-white ml-2">NORMAL</span>
          </div>
          <div class="flex justify-between text-xs">
             <span class="text-slate-400 font-bold uppercase">Xác suất: <span id="catch-success-rate-mobile" class="text-yellow-400">0%</span></span>
             <div id="pokeballs-container-mobile" class="flex gap-1"></div>
          </div>
        </div>

        <!-- Action Controls -->
        <div id="catch-actions" class="absolute bottom-8 md:bottom-12 z-30 flex flex-col md:flex-row gap-4 md:gap-6 w-full justify-center px-4">
          <button onclick="handleThrowPokeballAnimated()" class="group relative py-4 md:py-5 px-10 md:px-14 bg-rose-600 hover:bg-rose-500 rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:shadow-[0_0_40px_rgba(225,29,72,0.6)] transition-all transform active:scale-95 overflow-hidden border border-rose-400/50">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span class="relative flex items-center justify-center gap-3 text-white font-black text-base md:text-lg uppercase tracking-[0.2em]">
              NÉM BÓNG 
              <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-6 h-6 md:w-8 md:h-8 group-hover:animate-spin-slow drop-shadow-md">
            </span>
          </button>
          
          <button onclick="closeCatchScreen()" class="py-4 md:py-5 px-8 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-white rounded-2xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs md:text-sm font-bold backdrop-blur-md">
            BỎ CHẠY <i class="fa-solid fa-person-running ml-1"></i>
          </button>
        </div>

        <!-- Catch Message Popup -->
        <div id="catch-message" class="absolute top-1/4 w-full flex justify-center z-40 pointer-events-none"></div>

      </div>

      <!-- Result Overlay (hidden by default) -->`);
fs.writeFileSync('student/index.html', html);
