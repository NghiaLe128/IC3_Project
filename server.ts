import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { google } from "googleapis";

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

// Determine if we are running in the dist folder
const isBundled = __dirname.endsWith('dist');
const rootDir = isBundled ? path.resolve(__dirname, '..') : __dirname;
const publicDir = isBundled ? __dirname : path.join(__dirname, 'dist');

const app = express();
const PORT = 3000;

// Enable JSON parser for potential future API extensions
app.use(express.json());

// Google Sheets Service Account Auth
async function getSheetsClient() {
  const keyContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyContent) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable. System cannot fill sheets without authentication.");
  }
  
  let credentials;
  try {
    credentials = JSON.parse(keyContent);
  } catch (e) {
    // If not valid JSON, maybe it's base64 encoded?
    try {
      credentials = JSON.parse(Buffer.from(keyContent, 'base64').toString());
    } catch (e2) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not a valid JSON string or base64 encoded JSON.");
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Smart Proxy for Google Sheets (System Sync)
app.post("/api/sheets/proxy", async (req, res) => {
  const { spreadsheetId, range, method, body } = req.body;
  
  try {
    const sheets = await getSheetsClient();
    
    if (method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return res.json(result.data);
    } else if (method === "PUT" || method === "UPDATE") {
      const result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: body,
      });
      return res.json(result.data);
    } else if (method === "APPEND") {
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: body,
      });
      return res.json(result.data);
    }
    
    res.status(400).json({ success: false, message: "Unsupported method" });
  } catch (error: any) {
    const errorMsg = error.message || "Unknown error";
    console.error("❌ [Sheets Proxy Error]:", errorMsg);
    
    // Check if it's an API disabled error
    if (errorMsg.includes("has not been used in project") || errorMsg.includes("is disabled")) {
       return res.status(403).json({ 
         success: false, 
         error: "Google Sheets API is disabled. Please enable it in Google Cloud Console.",
         setupUrl: "https://console.developers.google.com/apis/api/sheets.googleapis.com/overview"
       });
    }
    
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Serve static resources explicitly
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.use("/teacher", express.static(path.join(__dirname, "teacher")));
app.use("/student", express.static(path.join(__dirname, "student")));
app.use("/student_practice", express.static(path.join(__dirname, "student_practice")));

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

app.get("/student_practice/*", (req, res) => {
  res.sendFile(path.join(__dirname, "student_practice", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[IC3 LMS Server] Server running on http://localhost:${PORT}`);
});
