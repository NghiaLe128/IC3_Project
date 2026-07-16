const fs = require('fs');
let code = fs.readFileSync('admin/script.js', 'utf8');

const regex = /window\.savePokemonEvolutions = async function\(\) \{[\s\S]*?\};\n/m;
const newCode = `window.savePokemonEvolutions = async function() {
  try {
    const colRef = window.fStore.collection(window.db, "pokemonEvolutions");
    const snapshot = await window.fStore.getDocs(colRef);
    
    // First, delete forms that were removed
    for (const docSnap of snapshot.docs) {
      if (!currentAdminEvoMap[docSnap.id]) {
        await window.fStore.deleteDoc(docSnap.ref);
      }
    }
    
    // Upsert all current maps
    for (const [base, forms] of Object.entries(currentAdminEvoMap)) {
      const docRef = window.fStore.doc(window.db, "pokemonEvolutions", base);
      const images = forms.map(f => \`https://projectpokemon.org/images/normal-sprite/\${f}.gif\`);
      await window.fStore.setDoc(docRef, {
        id: base,
        basePokemon: base,
        forms: forms,
        images: images
      });
    }
    
    window.evoMap = JSON.parse(JSON.stringify(currentAdminEvoMap));
    alert("Lưu dữ liệu tiến hóa thành công!");
  } catch (e) {
    console.error(e);
    alert("Có lỗi khi lưu tiến hóa: " + e.message);
  }
};
`;

code = code.replace(regex, newCode);
fs.writeFileSync('admin/script.js', code);
