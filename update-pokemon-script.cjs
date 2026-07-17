const fs = require('fs');
let code = fs.readFileSync('admin/script.js', 'utf-8');

const targetFunction = /function renderPokemonEvoList\(\) \{[\s\S]*?window\.savePokemonEvolutions = async function\(\) \{[\s\S]*?\n\}/m;

const newLogic = `
function renderPokemonEvoList() {
  const container = document.getElementById("pokemon-evo-list");
  if (!container) return;
  
  const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
  const searchQuery = document.getElementById("searchPokemon") ? document.getElementById("searchPokemon").value.trim().toLowerCase() : "";
  
  const filteredAll = pokemons.filter(p => 
      p.id.toLowerCase().includes(searchQuery) || 
      p.name.toLowerCase().includes(searchQuery)
  );
  
  const currentPage = window.adminPagination.pokemons || 1;
  const filtered = filteredAll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  renderPagination(filteredAll.length, currentPage, 'pokemons-pagination', 'pokemons');

  if (filtered.length === 0) {
    container.innerHTML = \`<p class="text-slate-500 text-sm py-4 text-center">Không tìm thấy Pokemon nào.</p>\`;
    return;
  }

  let html = \`<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">\`;
  
  filtered.forEach(poke => {
    const evos = window.currentAdminEvoMap[poke.id] || [];
    const rarityColors = poke.rarity === "Hiếm" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
                        (poke.rarity === "Thần Thoại" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : 
                        "bg-slate-700/50 text-slate-300 border-slate-600");
                        
    html += \`
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col hover:border-blue-500/50 transition-colors">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
            <img src="\${poke.image}" class="w-12 h-12 object-contain drop-shadow-md" alt="\${poke.name}">
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-white text-sm truncate">\${poke.name}</h4>
            <p class="text-xs text-slate-400 truncate mt-0.5">ID: \${poke.id}</p>
            <div class="flex gap-2 mt-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border \${rarityColors}">\${poke.rarity || 'Thường'}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">\${poke.element || 'Không rõ'}</span>
            </div>
          </div>
        </div>
        
        \${evos.length > 0 ? \`
        <div class="mt-4 pt-4 border-t border-slate-700">
          <p class="text-[10px] uppercase font-bold text-slate-500 mb-2">Tiến Hóa</p>
          <div class="flex flex-wrap gap-2">
            \${evos.map(e => \`<span class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300">\${e}</span>\`).join('')}
          </div>
        </div>
        \` : ''}
        
        <div class="mt-4 pt-3 border-t border-slate-700 flex justify-end gap-2">
            <button onclick="window.openEditPokemonModal('\${poke.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="window.deletePokemon('\${poke.id}')" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold rounded-lg transition-colors">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
      </div>
    \`;
  });
  
  html += \`</div>\`;
  container.innerHTML = html;
}

window.openAddPokemonModal = function() {
    document.getElementById("pokeMode").value = "add";
    document.getElementById("pokeOriginalId").value = "";
    document.getElementById("pokeId").value = "";
    document.getElementById("pokeName").value = "";
    document.getElementById("pokeRarity").value = "Thường";
    document.getElementById("pokeElement").value = "";
    document.getElementById("pokeImage").value = "https://projectpokemon.org/images/normal-sprite/";
    document.getElementById("pokeEvoForms").value = "";
    
    document.getElementById("pokemonModalTitle").innerText = "Thêm Pokemon Mới";
    document.getElementById("pokemonModal").classList.remove("hidden");
};

window.openEditPokemonModal = function(id) {
    const pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
    const poke = pokemons.find(p => p.id === id);
    if (!poke) return;
    
    document.getElementById("pokeMode").value = "edit";
    document.getElementById("pokeOriginalId").value = poke.id;
    document.getElementById("pokeId").value = poke.id;
    document.getElementById("pokeName").value = poke.name || "";
    document.getElementById("pokeRarity").value = poke.rarity || "Thường";
    document.getElementById("pokeElement").value = poke.element || "";
    document.getElementById("pokeImage").value = poke.image || "";
    
    const evos = window.currentAdminEvoMap[poke.id] || [];
    document.getElementById("pokeEvoForms").value = evos.join(", ");
    
    document.getElementById("pokemonModalTitle").innerText = "Chỉnh Sửa Pokemon";
    document.getElementById("pokemonModal").classList.remove("hidden");
};

window.closePokemonModal = function() {
    document.getElementById("pokemonModal").classList.add("hidden");
};

window.handlePokemonSubmit = async function(e) {
    e.preventDefault();
    
    const mode = document.getElementById("pokeMode").value;
    const originalId = document.getElementById("pokeOriginalId").value;
    
    const id = document.getElementById("pokeId").value.trim().toLowerCase();
    const name = document.getElementById("pokeName").value.trim();
    const rarity = document.getElementById("pokeRarity").value;
    const element = document.getElementById("pokeElement").value.trim();
    const image = document.getElementById("pokeImage").value.trim();
    const evosStr = document.getElementById("pokeEvoForms").value.trim();
    
    if (!id || !name || !image) {
        Swal.fire({
            title: 'THIẾU THÔNG TIN',
            text: 'Vui lòng điền đầy đủ ID, Tên và Ảnh.',
            icon: 'warning',
            confirmButtonColor: '#3b82f6',
            background: '#0f172a',
            color: '#fff'
        });
        return;
    }
    
    let pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
    
    if (mode === "add" && pokemons.some(p => p.id === id)) {
        Swal.fire({
            title: 'LỖI',
            text: 'ID Pokemon này đã tồn tại!',
            icon: 'error',
            confirmButtonColor: '#ef4444',
            background: '#0f172a',
            color: '#fff'
        });
        return;
    }
    
    const newPoke = { id, name, rarity, element, image };
    
    if (mode === "add") {
        pokemons.push(newPoke);
    } else {
        const idx = pokemons.findIndex(p => p.id === originalId);
        if (idx !== -1) {
            pokemons[idx] = newPoke;
            // If ID changed, we also need to handle deletion of old doc in firestore, but window.saveData handles updates by ID. 
            // For simplicity, we just save. But actually we might need to delete old ID.
        }
    }
    
    // Save to Cache & Cloud
    window.IC3_CACHE[window.IC3_KEYS.POKEMONS] = pokemons;
    await window.saveData(window.IC3_KEYS.POKEMONS, pokemons, [id]);
    
    // Handle Evolutions
    const evosList = evosStr ? evosStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];
    if (mode === "edit" && originalId !== id) {
        // ID changed, delete old evo
        delete window.currentAdminEvoMap[originalId];
    }
    
    if (evosList.length > 0) {
        window.currentAdminEvoMap[id] = evosList;
    } else {
        delete window.currentAdminEvoMap[id];
    }
    
    // Save Evolutions to Cloud
    await window.savePokemonEvolutions();
    
    closePokemonModal();
    renderPokemonEvoList();
    Swal.fire({
        title: 'THÀNH CÔNG',
        text: 'Đã lưu Pokemon thành công!',
        icon: 'success',
        confirmButtonColor: '#10b981',
        background: '#0f172a',
        color: '#fff'
    });
};

window.deletePokemon = function(id) {
    Swal.fire({
        title: 'XÁC NHẬN XÓA',
        text: \`Bạn có chắc muốn xóa Pokemon \${id}?\`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa ngay',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        background: '#0f172a',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            let pokemons = window.IC3_CACHE[window.IC3_KEYS.POKEMONS] || [];
            pokemons = pokemons.filter(p => p.id !== id);
            window.IC3_CACHE[window.IC3_KEYS.POKEMONS] = pokemons;
            
            // Cloud sync
            try {
               window.fStore.deleteDoc(window.fStore.doc(window.db, window.IC3_KEYS.POKEMONS, id));
            } catch(e) {}
            
            delete window.currentAdminEvoMap[id];
            window.savePokemonEvolutions();
            
            renderPokemonEvoList();
            window.showToast("Đã xóa Pokemon!", "success");
        }
    });
};

window.savePokemonEvolutions = async function() {
  try {
    const colRef = window.fStore.collection(window.db, "pokemonEvolutions");
    const snapshot = await window.fStore.getDocs(colRef);
    
    // First, delete forms that were removed
    for (const docSnap of snapshot.docs) {
      if (!currentAdminEvoMap[docSnap.id]) {
        await window.fStore.deleteDoc(docSnap.ref);
      }
    }
`;

code = code.replace(targetFunction, newLogic);
fs.writeFileSync('admin/script.js', code);
