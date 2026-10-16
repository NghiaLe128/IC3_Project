import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

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

const app = express();
const PORT = 3000;

// Enable JSON parser for potential future API extensions
app.use(express.json());

// Health check endpoint for Cloud Run and monitoring
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

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
    } else if (method === "METADATA") {
      const result = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      return res.json(result.data);
    }
    
    res.status(400).json({ success: false, message: "Unsupported method" });
  } catch (error: any) {
    const errorMsg = error.message || "Unknown error";
    console.error("❌ [Sheets Proxy Error]:", errorMsg);
    
    // Fallback to Public CSV fetch if GET method and it failed (no key, or api disabled)
    if (method === "GET" && spreadsheetId && range) {
      console.log(`♻️ Attempting CSV fallback for ${spreadsheetId} range ${range}...`);
      try {
        let sheetName = "";
        if (range.includes("!")) {
          const parts = range.split("!");
          sheetName = parts[0];
          if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
            sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
          }
        } else {
          sheetName = range;
        }
        
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const csvRes = await fetch(csvUrl);
        
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          
          // Simple CSV parser
          const rows = [];
          let currentRow = [];
          let currentCell = "";
          let inQuotes = false;
          for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            if (inQuotes) {
              if (char === '"') {
                if (i + 1 < csvText.length && csvText[i + 1] === '"') {
                  currentCell += '"'; i++;
                } else inQuotes = false;
              } else currentCell += char;
            } else {
              if (char === '"') inQuotes = true;
              else if (char === ',') { currentRow.push(currentCell); currentCell = ""; }
              else if (char === '\n' || char === '\r') {
                if (char === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') i++;
                currentRow.push(currentCell); rows.push(currentRow);
                currentRow = []; currentCell = "";
              } else currentCell += char;
            }
          }
          if (currentCell !== "" || currentRow.length > 0) { currentRow.push(currentCell); rows.push(currentRow); }
          
          console.log(`✅ CSV Fallback successful for ${sheetName}`);
          return res.json({ values: rows });
        }
      } catch (fallbackError) {
        console.error("❌ [CSV Fallback Error]:", fallbackError);
      }
    }
    
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
app.use("/student_test", express.static(path.join(__dirname, "student_test")));
app.use("/kiemtra", express.static(path.join(__dirname, "kiemtra")));
app.use("/exam", express.static(path.join(__dirname, "kiemtra")));

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

app.get("/student_test/*", (req, res) => {
  res.sendFile(path.join(__dirname, "student_test", "index.html"));
});

app.get("/kiemtra/*", (req, res) => {
  res.sendFile(path.join(__dirname, "kiemtra", "index.html"));
});

app.get("/exam/*", (req, res) => {
  res.sendFile(path.join(__dirname, "kiemtra", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[IC3 LMS Server] Server running on http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

