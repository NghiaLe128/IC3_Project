import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
  authDomain: "semiotic-particle-j7c1c.firebaseapp.com",
  storageBucket: "semiotic-particle-j7c1c.firebasestorage.app",
  messagingSenderId: "649030206931",
  firestoreDatabaseId: "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

const evoMap = {
    "bulbasaur": ["bulbasaur", "ivysaur", "venusaur", "venusaur-mega"],
    "charmander": ["charmander", "charmeleon", "charizard", "charizard-megax", "charizard-megay"],
    "squirtle": ["squirtle", "wartortle", "blastoise", "blastoise-mega"],
    "pikachu": ["pichu", "pikachu", "raichu", "raichu-alola"],
    "eevee": ["eevee", "vaporeon", "jolteon", "flareon", "espeon", "umbreon", "sylveon"],
    "snorlax": ["munchlax", "snorlax"],
    "gengar": ["gastly", "haunter", "gengar", "gengar-mega"],
    "lucario": ["riolu", "lucario", "lucario-mega"],
    "dragonite": ["dratini", "dragonair", "dragonite"],
    "mewtwo": ["mewtwo", "mewtwo-megax", "mewtwo-megay"],
    "rayquaza": ["rayquaza", "rayquaza-mega"],
    "arceus": ["arceus"]
};

async function seed() {
  for (const [basePokemon, forms] of Object.entries(evoMap)) {
    const images = forms.map(form => `https://projectpokemon.org/images/normal-sprite/${form}.gif`);
    await setDoc(doc(db, "pokemonEvolutions", basePokemon), {
      id: basePokemon,
      basePokemon: basePokemon,
      forms: forms,
      images: images
    });
    console.log(`Seeded ${basePokemon}`);
  }
  console.log("Done");
  process.exit(0);
}

seed();
