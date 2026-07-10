import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

dotenv.config();

const firebaseConfig = {
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
  authDomain: "semiotic-particle-j7c1c.firebaseapp.com",
  storageBucket: "semiotic-particle-j7c1c.firebasestorage.app",
  messagingSenderId: "649030206931",
  firestoreDatabaseId: "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865"
};

const getRuntimePath = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return fileURLToPath(import.meta.url);
    }
  } catch (e) {
    // Ignore error and fallback
  }
  return typeof __filename !== 'undefined' ? __filename : process.cwd();
};

const __filename = getRuntimePath();
const __dirname = path.dirname(__filename);

// Query Firestore and write to a file
async function dumpFirestore() {
  try {
    console.log("[IC3 Server DB Diagnostic] Initializing Firebase...");
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    
    console.log("[IC3 Server DB Diagnostic] Fetching tests...");
    const testsSnap = await getDocs(collection(db, "tests"));
    const tests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log("[IC3 Server DB Diagnostic] Fetching questions...");
    const questionsSnap = await getDocs(collection(db, "questions"));
    const questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const dump = { tests, questions };
    fs.writeFileSync(path.join(__dirname, "firestore-dump.json"), JSON.stringify(dump, null, 2));
    console.log("[IC3 Server DB Diagnostic] Successfully dumped to firestore-dump.json!");
  } catch (err: any) {
    console.error("[IC3 Server DB Diagnostic] Error dumping Firestore:", err.message);
    fs.writeFileSync(path.join(__dirname, "firestore-dump.json"), JSON.stringify({ error: err.message }, null, 2));
  }
}

dumpFirestore();

// Determine if we are running in the dist folder
const isBundled = __dirname.endsWith('dist');
const rootDir = isBundled ? path.resolve(__dirname, '..') : __dirname;
const publicDir = isBundled ? __dirname : path.join(__dirname, 'dist');

const app = express();
const PORT = 3000;

// Enable JSON parser for potential future API extensions
app.use(express.json());

// Serve static resources explicitly
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use("/teacher", express.static(path.join(__dirname, "teacher")));
app.use("/student", express.static(path.join(__dirname, "student")));

// Serve root directory static files (e.g. main index.html landing page)
app.use(express.static(__dirname));

// Route handlers for SPA/routing fallbacks if needed
app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

app.get("/teacher/*", (req, res) => {
  res.sendFile(path.join(__dirname, "teacher", "index.html"));
});

app.get("/student/*", (req, res) => {
  res.sendFile(path.join(__dirname, "student", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[IC3 LMS Server] Server running on http://localhost:${PORT}`);
});
