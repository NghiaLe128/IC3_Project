const fs = require('fs');
let code = fs.readFileSync('student/index.html', 'utf-8');

code = code.replace(`        <!-- Action Buttons -->
        <div class="flex flex-col gap-3">
          <button id="victory-review-btn"`, `        <!-- Action Buttons -->
        <div class="flex flex-col gap-3">
          <button id="victory-catch-btn" onclick="startCatchPokemonSequenceFromVictory()" class="hidden w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 animate-pulse border border-rose-400">
            Phát hiện Pokémon hoang dã! Bắt ngay <i class="fa-solid fa-star"></i>
          </button>
          <button id="victory-review-btn"`);

fs.writeFileSync('student/index.html', code);
