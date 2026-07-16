const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf-8');

const target = `<section id="tab-pokemon-evo" class="tab-content space-y-6 hidden">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-white text-base">Cấu hình dạng tiến hóa Pokemon (3D Models)</h3>
            <button onclick="window.savePokemonEvolutions()" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/10">
              <i class="fa-solid fa-save"></i> Lưu cấu hình
            </button>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div id="pokemon-evo-list" class="space-y-4">
              <!-- Dynamically populated -->
              <p class="text-slate-400">Đang tải dữ liệu...</p>
            </div>
            <button onclick="window.addPokemonEvoRow()" class="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors border border-slate-700">
              <i class="fa-solid fa-plus mr-1"></i> Thêm Pokemon
            </button>
          </div>
        </section>`;

const replacement = `<section id="tab-pokemon-evo" class="tab-content space-y-6 hidden">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-white text-base">Quản lý Pokemon & Tiến Hóa</h3>
            <div class="flex gap-2">
                <input type="text" id="searchPokemon" placeholder="Tìm Pokemon..." oninput="window.adminPagination.pokemons=1; renderPokemonEvoList()" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 w-64">
                <button onclick="window.openAddPokemonModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10">
                  <i class="fa-solid fa-plus"></i> Thêm Pokemon Mới
                </button>
            </div>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div id="pokemon-evo-list" class="space-y-4">
              <!-- Dynamically populated -->
              <p class="text-slate-400">Đang tải dữ liệu...</p>
            </div>
            <div id="pokemons-pagination" class="flex justify-center items-center mt-6 gap-2"></div>
          </div>
        </section>
        
        <!-- Modal: Add/Edit Pokemon -->
        <div id="pokemonModal" class="modal-overlay hidden">
          <div class="bg-slate-900 border border-slate-800 w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onclick="closePokemonModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 id="pokemonModalTitle" class="font-poppins font-bold text-lg text-white mb-4">Thêm Pokemon Mới</h3>
            <form id="pokemonForm" onsubmit="handlePokemonSubmit(event)" class="space-y-4">
              <input type="hidden" id="pokeMode" value="add">
              <input type="hidden" id="pokeOriginalId" value="">
              
              <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">ID (vd: pikachu)</label>
                    <input type="text" id="pokeId" required class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Tên Hiển Thị</label>
                    <input type="text" id="pokeName" required class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Độ Hiếm</label>
                    <select id="pokeRarity" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                      <option value="Thường">Thường</option>
                      <option value="Hiếm">Hiếm</option>
                      <option value="Thần Thoại">Thần Thoại</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Hệ (Element)</label>
                    <input type="text" id="pokeElement" placeholder="vd: Hệ Điện" required class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  </div>
              </div>
              
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">URL Hình Ảnh</label>
                <input type="url" id="pokeImage" placeholder="https://..." required class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              </div>
              
              <div class="border-t border-slate-800 pt-4 mt-4">
                <h4 class="font-bold text-white text-sm mb-2">Các Dạng Tiến Hóa (ID)</h4>
                <p class="text-xs text-slate-400 mb-2">Nhập ID của các dạng tiến hóa, cách nhau bởi dấu phẩy. Vd: charmander, charmeleon, charizard</p>
                <input type="text" id="pokeEvoForms" placeholder="pichu, pikachu, raichu" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              </div>
              
              <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onclick="closePokemonModal()" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">Hủy</button>
                <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md">Lưu Pokemon</button>
              </div>
            </form>
          </div>
        </div>`;

if (html.includes('Cấu hình dạng tiến hóa Pokemon (3D Models)')) {
    html = html.replace(target, replacement);
    fs.writeFileSync('admin/index.html', html);
}
