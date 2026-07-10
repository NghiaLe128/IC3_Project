import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
