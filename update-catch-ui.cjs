const fs = require('fs');
let html = fs.readFileSync('student/index.html', 'utf-8');

// Ensure it's not duplicated
html = html.replace(/<!-- ==================== SCREEN: POKEMON CATCHING ==================== -->[\s\S]*<\/html>/, '</html>');

const catchUI = `
    <!-- ==================== SCREEN: POKEMON CATCHING ==================== -->
    <div id="catch-pokemon-overlay" class="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-hidden hidden">
      <!-- Background Effects -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-rose-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
        <!-- Stars/Particles -->
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 24px 24px;"></div>
      </div>

      <div class="relative w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 z-10">
        
        <!-- Left: Pokemon Info -->
        <div class="flex-1 w-full flex flex-col items-center md:items-start space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm tracking-widest uppercase animate-pulse">
            <i class="fa-solid fa-exclamation-triangle"></i> Cảnh Báo Chạm Trán
          </div>
          
          <h2 class="font-poppins font-black text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 drop-shadow-sm uppercase tracking-tighter text-center md:text-left leading-tight">
            Pokémon Hoang Dã<br/>Xuất Hiện!
          </h2>

          <div id="catch-pokemon-details" class="bg-slate-900/80 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md w-full max-w-sm">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 id="catch-poke-name" class="text-2xl font-black text-white uppercase tracking-tight">Pikachu</h3>
                <p id="catch-subtitle" class="text-slate-400 text-sm font-medium">Bạn đã tìm thấy một sinh vật bí ẩn!</p>
              </div>
              <span id="catch-rarity-badge" class="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-700 text-white shadow-inner">Normal</span>
            </div>
            
            <div class="space-y-3 mt-6">
              <div class="flex justify-between items-center py-2 border-b border-slate-800">
                <span class="text-slate-400 text-xs font-bold uppercase"><i class="fa-solid fa-fire text-orange-500 w-4"></i> Hệ (Type)</span>
                <span id="catch-element" class="text-white font-bold text-sm">Hệ Điện</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-slate-800">
                <span class="text-slate-400 text-xs font-bold uppercase"><i class="fa-solid fa-chart-pie text-blue-400 w-4"></i> Tỉ lệ xuất hiện</span>
                <span id="catch-spawn-rate" class="text-emerald-400 font-black text-sm">70%</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-slate-800">
                <span class="text-slate-400 text-xs font-bold uppercase"><i class="fa-solid fa-bullseye text-rose-400 w-4"></i> Tỉ lệ bắt thành công</span>
                <span id="catch-success-rate" class="text-yellow-400 font-black text-sm">45%</span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-slate-400 text-xs font-bold uppercase"><i class="fa-solid fa-compact-disc text-purple-400 w-4"></i> Số bóng hiện có</span>
                <div id="pokeballs-container" class="flex gap-1.5">
                  <!-- Pokeballs rendered here -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: The Encounter Stage -->
        <div class="flex-1 w-full flex flex-col items-center justify-center relative min-h-[400px]">
          <!-- Stage Platform -->
          <div class="absolute bottom-10 w-64 md:w-80 h-24 bg-gradient-to-t from-emerald-900/60 to-transparent rounded-full blur-xl"></div>
          <div class="absolute bottom-12 w-48 md:w-64 h-12 bg-black/60 rounded-full blur-md"></div>
          
          <!-- Pokemon Image -->
          <img id="wild-pokemon-img" src="" class="relative z-10 w-48 h-48 md:w-64 md:h-64 object-contain animate-bounce transition-all duration-300" style="filter: drop-shadow(0 20px 20px rgba(0,0,0,0.5));" alt="Wild Pokemon">
          
          <!-- Throw Animation Ball -->
          <img id="thrown-pokeball" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="absolute bottom-0 z-20 w-16 h-16 hidden transition-all duration-700 ease-in-out drop-shadow-2xl" alt="Pokeball">

          <!-- Action Container -->
          <div id="catch-actions" class="absolute -bottom-4 md:bottom-0 z-30 flex gap-4 w-full justify-center">
            <button onclick="handleThrowPokeballAnimated()" class="group relative py-4 px-8 bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 border border-rose-400 rounded-2xl shadow-xl shadow-rose-600/40 transition-all transform active:scale-95 overflow-hidden">
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span class="relative flex items-center gap-2 text-white font-black uppercase tracking-wider text-sm">
                Ném Bóng <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-6 h-6 animate-spin-slow">
              </span>
            </button>
            <button onclick="closeCatchScreen()" class="py-4 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold rounded-2xl transition-all shadow-lg hover:text-white uppercase tracking-wider text-xs">
              Bỏ Chạy
            </button>
          </div>

          <!-- Message Overlay -->
          <div id="catch-message" class="absolute top-0 w-full text-center z-40"></div>
        </div>

      </div>

      <!-- Result Overlay (hidden by default) -->
      <div id="catch-results" class="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center transform scale-95 animate-fade-in flex flex-col items-center">
          <div id="result-icon" class="text-7xl mb-6 animate-bounce">✨</div>
          <h2 id="result-title" class="text-4xl font-black text-white uppercase tracking-tighter mb-4">Kết Quả</h2>
          <p id="result-desc" class="text-slate-300 text-lg font-medium mb-10 leading-relaxed"></p>
          <button onclick="closeCatchScreen()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all active:scale-95 text-sm uppercase tracking-widest border border-indigo-400/50">
            Tiếp Tục Hành Trình
          </button>
        </div>
      </div>
    </div>
  </body>
</html>`;

html = html.replace('</body>', catchUI);
fs.writeFileSync('student/index.html', html);
