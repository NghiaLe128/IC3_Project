import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
  authDomain: "semiotic-particle-j7c1c.firebaseapp.com",
  storageBucket: "semiotic-particle-j7c1c.firebasestorage.app",
  messagingSenderId: "649030206931",
  firestoreDatabaseId: "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865"
};

async function test() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    
    console.log("Checking tests collection...");
    const testsSnap = await getDocs(collection(db, "tests"));
    const tests = testsSnap.docs.map(d => ({ id: d.id, title: d.data().title, qCount: d.data().questions?.length }));
    console.log("Tests found:", JSON.stringify(tests, null, 2));

    console.log("Checking questions count...");
    const qsSnap = await getDocs(collection(db, "questions"));
    console.log("Total questions found in DB:", qsSnap.size);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
