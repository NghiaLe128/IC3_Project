import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
  const colRef = collection(db, "pokemonEvolutions");
  const snapshot = await getDocs(colRef);
  console.log("=== DB POKEMON EVOLUTIONS ===");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Document [${docSnap.id}]:`);
    console.log(`  basePokemon: ${data.basePokemon}`);
    console.log(`  forms (${data.forms ? data.forms.length : 0}):`, data.forms);
    console.log(`  images (${data.images ? data.images.length : 0}):`, data.images);
  });
  process.exit(0);
}

check().catch(console.error);
