import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc } from "firebase/firestore";

const app = initializeApp({
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
});
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865");
getDoc(doc(db, "users", "test")).then(snap => console.log("OK", snap.exists())).catch(err => console.error("ERR", err));
