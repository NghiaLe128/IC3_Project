const fs = require('fs');
let code = fs.readFileSync('assets/js/db-init.js', 'utf-8');

if (!code.includes('const pokemonNames = {')) {
  const insertIndex = code.indexOf('    // Initial configuration check');
  if (insertIndex !== -1) {
    const toInsert = `
    // Initialize Pokemons if empty
    let pokemonsData = window.IC3_CACHE[IC3_KEYS.POKEMONS];
    if (!pokemonsData || pokemonsData.length === 0) {
      console.log("Initializing Pokemons data...");
      const pokemonNames = {
        pichu: "Pichu Nhỏ Bé", pikachu: "Pikachu Tia Chớp", raichu: "Raichu Sấm Sét", "raichu-alola": "Raichu Lướt Sóng", "pikachu-gmax": "Pikachu Khổng Lồ",
        charmander: "Charmander Ngọn Lửa", charmeleon: "Charmeleon Hỏa Chiến", charizard: "Charizard Rồng Lửa", "charizard-megax": "Mega Charizard X", "charizard-megay": "Mega Charizard Y",
        bulbasaur: "Bulbasaur Mầm Non", ivysaur: "Ivysaur Nụ Hoa", venusaur: "Venusaur Hoa Lớn", "venusaur-mega": "Mega Venusaur", "venusaur-gmax": "Venusaur Khổng Lồ",
        squirtle: "Squirtle Rùa Nước", wartortle: "Wartortle Rùa Chiến", blastoise: "Blastoise Pháo Thủy", "blastoise-mega": "Mega Blastoise", "blastoise-gmax": "Blastoise Khổng Lồ",
        eevee: "Eevee Đa Năng", vaporeon: "Vaporeon Thủy Cung", jolteon: "Jolteon Sấm Sét", flareon: "Flareon Hỏa Cực", espeon: "Espeon Tâm Linh", umbreon: "Umbreon Bóng Tối", sylveon: "Sylveon Tiên Nữ",
        munchlax: "Munchlax Ham Ăn", snorlax: "Snorlax Ngủ Ngày", "snorlax-gmax": "Snorlax Đảo Khổng Lồ",
        gastly: "Gastly Bóng Ma", haunter: "Haunter Trêu Chọc", gengar: "Gengar Hắc Ám", "gengar-mega": "Mega Gengar", "gengar-gmax": "Gengar Khổng Lồ",
        riolu: "Riolu Sóng Âm", lucario: "Lucario Chiến Binh", "lucario-mega": "Mega Lucario",
        dratini: "Dratini Rồng Nhỏ", dragonair: "Dragonair Rồng Ngọc", dragonite: "Dragonite Vua Rồng",
        mewtwo: "Mewtwo Nhân Tạo", "mewtwo-megax": "Mega Mewtwo Bá Vương X", "mewtwo-megay": "Mega Mewtwo Thần Lực Y",
        rayquaza: "Rayquaza Không Vương", "rayquaza-mega": "Mega Rayquaza Sáng Thế",
        arceus: "Arceus Đấng Sáng Thế"
      };

      const pokemonRarity = {
        pichu: "Thường", pikachu: "Thường", charmander: "Thường", bulbasaur: "Thường", squirtle: "Thường",
        eevee: "Thường", munchlax: "Thường", gastly: "Thường", riolu: "Thường", dratini: "Thường",
        raichu: "Hiếm", "raichu-alola": "Hiếm", "pikachu-gmax": "Hiếm",
        charmeleon: "Hiếm", charizard: "Hiếm", "charizard-megax": "Hiếm", "charizard-megay": "Hiếm",
        ivysaur: "Hiếm", venusaur: "Hiếm", "venusaur-gmax": "Hiếm", "venusaur-mega": "Hiếm",
        wartortle: "Hiếm", blastoise: "Hiếm", "blastoise-gmax": "Hiếm", "blastoise-mega": "Hiếm",
        vaporeon: "Hiếm", jolteon: "Hiếm", flareon: "Hiếm", espeon: "Hiếm", umbreon: "Hiếm", sylveon: "Hiếm",
        snorlax: "Hiếm", "snorlax-gmax": "Hiếm",
        haunter: "Hiếm", gengar: "Hiếm", "gengar-mega": "Hiếm", "gengar-gmax": "Hiếm",
        lucario: "Hiếm", "lucario-mega": "Hiếm",
        dragonair: "Hiếm", dragonite: "Hiếm",
        mewtwo: "Thần Thoại", "mewtwo-megax": "Thần Thoại", "mewtwo-megay": "Thần Thoại",
        rayquaza: "Thần Thoại", "rayquaza-mega": "Thần Thoại",
        arceus: "Thần Thoại"
      };
      
      const pokemonTypes = {
          pichu: "Hệ Điện", pikachu: "Hệ Điện", charmander: "Hệ Lửa", bulbasaur: "Hệ Cỏ", squirtle: "Hệ Nước",
          eevee: "Hệ Thường", munchlax: "Hệ Thường", gastly: "Hệ Ma", riolu: "Hệ Võ Thuật", dratini: "Hệ Rồng",
          raichu: "Hệ Điện", "raichu-alola": "Hệ Điện", "pikachu-gmax": "Hệ Điện",
          charmeleon: "Hệ Lửa", charizard: "Hệ Lửa", "charizard-megax": "Hệ Lửa", "charizard-megay": "Hệ Lửa",
          ivysaur: "Hệ Cỏ", venusaur: "Hệ Cỏ", "venusaur-gmax": "Hệ Cỏ", "venusaur-mega": "Hệ Cỏ",
          wartortle: "Hệ Nước", blastoise: "Hệ Nước", "blastoise-gmax": "Hệ Nước", "blastoise-mega": "Hệ Nước",
          vaporeon: "Hệ Nước", jolteon: "Hệ Điện", flareon: "Hệ Lửa", espeon: "Hệ Tâm Linh", umbreon: "Hệ Bóng Tối", sylveon: "Hệ Tiên",
          snorlax: "Hệ Thường", "snorlax-gmax": "Hệ Thường",
          haunter: "Hệ Ma", gengar: "Hệ Ma", "gengar-mega": "Hệ Ma", "gengar-gmax": "Hệ Ma",
          lucario: "Hệ Võ Thuật", "lucario-mega": "Hệ Võ Thuật",
          dragonair: "Hệ Rồng", dragonite: "Hệ Rồng",
          mewtwo: "Hệ Tâm Linh", "mewtwo-megax": "Hệ Tâm Linh", "mewtwo-megay": "Hệ Tâm Linh",
          rayquaza: "Hệ Rồng", "rayquaza-mega": "Hệ Rồng",
          arceus: "Hệ Thường"
      };

      const defaultPokemons = Object.keys(pokemonNames).map(id => ({
        id,
        name: pokemonNames[id],
        rarity: pokemonRarity[id] || "Thường",
        element: pokemonTypes[id] || "Hệ Thường",
        image: "https://projectpokemon.org/images/normal-sprite/" + id.toLowerCase() + ".gif"
      }));
      
      window.IC3_CACHE[IC3_KEYS.POKEMONS] = defaultPokemons;
      window.saveData(IC3_KEYS.POKEMONS, defaultPokemons, defaultPokemons.map(p => p.id));
    }
`;
    code = code.substring(0, insertIndex) + toInsert + code.substring(insertIndex);
    fs.writeFileSync('assets/js/db-init.js', code);
    console.log("Inserted!");
  }
}
