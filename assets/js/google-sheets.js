/**
 * IC3 LMS - Google Sheets API & Auth Integration
 */

import { GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { doc, getDoc, setDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Setup Google Auth Provider with Google Sheets Scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

/**
 * Perform Google Login for Student (Popup)
 */
window.googleSignInStudent = async () => {
  try {
    console.log("🔑 Initializing student Google OAuth with Sheets scope...");
    if (!window.auth) {
      throw new Error("Firebase Auth chưa được khởi tạo!");
    }
    const result = await signInWithPopup(window.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Không lấy được mã Google Access Token!");
    }

    sessionStorage.setItem("google_sheets_token", credential.accessToken);
    sessionStorage.setItem("google_user_email", result.user.email);
    console.log("✅ Google Sign-In successful. Token cached.");

    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error("❌ Google Sign-In Error:", error);
    throw error;
  }
};

window.getGoogleSheetsConfig = async () => {
  try {
    if (!window.db) return null;
    const docRef = doc(window.db, "settings", "google_sheets");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching Google Sheet settings:", error);
    return null;
  }
};

window.saveGoogleSheetsConfig = async (config) => {
  try {
    if (!window.db) throw new Error("Database is not ready!");
    const docRef = doc(window.db, "settings", "google_sheets");
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    if (!window.IC3_CACHE["settings"]) window.IC3_CACHE["settings"] = [];
    const idx = window.IC3_CACHE["settings"].findIndex(s => s.id === "google_sheets");
    if (idx !== -1) {
      window.IC3_CACHE["settings"][idx] = { id: "google_sheets", ...config };
    } else {
      window.IC3_CACHE["settings"].push({ id: "google_sheets", ...config });
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Error saving Google Sheets settings:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean Spreadsheet ID from URL
 */
const extractSpreadsheetId = (input) => {
  if (input.includes("docs.google.com/spreadsheets")) {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  }
  return input;
};

/**
 * Find Column Index by Header Name
 */
const findColumnIndex = (headers, namesToMatch) => {
  return headers.findIndex(h => namesToMatch.some(name => (h || "").toLowerCase().includes(name.toLowerCase())));
};

/**
 * Fetch Google Sheet Data (Student List)
 */
window.fetchGoogleSheetData = async (spreadsheetId, sheetName = "Tổng quát") => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const token = sessionStorage.getItem("google_sheets_token");

  const parseCSV = (csvText) => {
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
          currentRow.push(currentCell); rows.push(currentRow); currentRow = []; currentCell = "";
        } else currentCell += char;
      }
    }
    if (currentCell !== "" || currentRow.length > 0) { currentRow.push(currentCell); rows.push(currentRow); }
    return rows;
  };

  try {
    let rows = null;

    // Attempt 1: Try API/Proxy
    try {
      const data = await fetchSheetsValues(cleanId, sheetName + '!A1:Z1000', token);
      if (data && data.values && data.values.length >= 2) {
        rows = data.values;
        console.log("✅ Student data loaded via Google Sheets API.");
      } else if (data && data.error) {
        console.warn("⚠️ Sheets API failed, falling back to CSV. Error:", data.error.message || data.error);
      }
    } catch (e) {
      console.warn("⚠️ Proxy fetch failed, trying CSV fallback...");
    }

    // Attempt 2: Fallback to Public CSV (Requires "Anyone with the link")
    if (!rows) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(csvUrl);
      if (res.ok) {
        const csvText = await res.text();
        rows = parseCSV(csvText);
        console.log("✅ Student data loaded via CSV fallback.");
      }
    }

    if (!rows || rows.length < 2) {
      throw new Error("Không thể tải dữ liệu học sinh. Hãy kiểm tra tên Sheet hoặc quyền truy cập của file Google Sheet.");
    }

    const headers = rows[0].map(h => h ? String(h).trim() : "");
    const colTruong = findColumnIndex(headers, ["trường", "school"]);
    const colLop = findColumnIndex(headers, ["lớp", "class"]);
    const colHo = findColumnIndex(headers, ["họ", "last name"]);
    const colTen = findColumnIndex(headers, ["tên", "first name", "name", "họ tên"]);
    const colMatKhau = findColumnIndex(headers, ["mật khẩu", "password", "mk"]);

    if (colLop === -1 || colTen === -1 || colMatKhau === -1) {
      throw new Error("Bảng tính cần có các cột: Lớp, Họ Tên, Mật khẩu!");
    }

    const parsedStudents = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const school = colTruong !== -1 && row[colTruong] ? String(row[colTruong]).trim() : "Mặc định";
      const className = row[colLop] ? String(row[colLop]).trim() : "";
      const firstName = row[colTen] ? String(row[colTen]).trim() : "";
      const lastName = (colHo !== -1 && row[colHo]) ? String(row[colHo]).trim() : "";
      const fullName = (lastName ? `${lastName} ${firstName}` : firstName).trim();
      const password = row[colMatKhau] ? String(row[colMatKhau]).trim() : "";

      if (className && firstName && password) {
        parsedStudents.push({ rowIndex: i + 1, school, className, name: fullName, password });
      }
    }

    return parsedStudents;
  } catch (error) {
    console.error("❌ Critical error in fetchGoogleSheetData:", error);
    throw error;
  }
};

/**
 * Update a specific cell in the sheet (Attendance, Score, etc.)
 */
const updateSheetCell = async (spreadsheetId, sheetName, token, rowIndex, colIndex, value) => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  // Convert colIndex to letter (0 -> A, 1 -> B, ...)
  const colLetter = String.fromCharCode(65 + colIndex);
  const range = `${sheetName}!${colLetter}${rowIndex}`;
  
  if (token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[value]] })
    });
  } else {
    // Fallback to server-side proxy (No student login required)
    await fetch('/api/sheets/proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spreadsheetId: cleanId,
        range: range,
        method: "PUT",
        body: { values: [[value]] }
      })
    });
  }
};

/**
 * Helper to fetch sheet data (headers, current values) using proxy if needed
 */
const fetchSheetsValues = async (spreadsheetId, range, token) => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  } else {
    // Server-side proxy fallback
    const res = await fetch('/api/sheets/proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spreadsheetId: cleanId,
        range: range,
        method: "GET"
      })
    });
    return res.json();
  }
};

/**
 * Finalize Google Sheet Login
 */
window.loginStudentWithGoogleSheet = async (school, className, studentName, inputPassword, googleUser, sheetStudentsList) => {
  try {
    const found = sheetStudentsList.find(s => 
      s.school.toLowerCase() === school.toLowerCase() &&
      s.className.toLowerCase() === className.toLowerCase() &&
      s.name.toLowerCase() === studentName.toLowerCase()
    );

    if (!found) return { success: false, message: "Không tìm thấy học sinh này trong bảng tính!" };
    if (found.password !== inputPassword) return { success: false, message: "Mật khẩu không khớp với file Sheet!" };

    // Mark Attendance
    const token = sessionStorage.getItem("google_sheets_token");
    const config = await window.getGoogleSheetsConfig();
    if (config) {
      const cleanId = extractSpreadsheetId(config.spreadsheetId);
      const sheetName = config.studentSheetName || "Học sinh";
      // Fetch headers to find "Điểm danh"
      const data = await fetchSheetsValues(cleanId, sheetName + '!A1:Z1', token);
      if (data && data.values) {
        const headers = data.values[0] || [];
        
        const today = new Date();
        const dateStr1 = `${today.getDate()}/${today.getMonth() + 1}`;
        const dateStr2 = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        const diemDanhCol = headers.findIndex(h => {
           if (!h) return false;
           const hl = h.toLowerCase();
           return hl.includes("điểm danh") && (hl.includes(dateStr1) || hl.includes(dateStr2));
        });
  
        if (diemDanhCol !== -1) {
          // Read current value
          const cellData = await fetchSheetsValues(cleanId, sheetName + '!' + String.fromCharCode(65 + diemDanhCol) + found.rowIndex, token);
          const currentVal = cellData.values && cellData.values[0] && cellData.values[0][0] ? cellData.values[0][0].toLowerCase() : "";
          if (currentVal !== "x") {
            await updateSheetCell(cleanId, sheetName, token, found.rowIndex, diemDanhCol, "x");
          }
        }
      }
    }

    const db = window.db;
    const email = googleUser.email;
    let targetClassId = "";
    const classesRef = collection(db, "classes");
    const classesSnap = await getDocs(classesRef);
    const classesList = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const matchingClass = classesList.find(c => c.name.toLowerCase() === className.toLowerCase());
    if (matchingClass) targetClassId = matchingClass.id;
    else {
      targetClassId = `class_sheet_${className.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")}`;
      const newClass = { id: targetClassId, name: className, teacherEmail: config?.configuredBy || "teacher@gmail.com", studentCount: 1 };
      await setDoc(doc(db, "classes", targetClassId), newClass);
      if (!window.IC3_CACHE["classes"]) window.IC3_CACHE["classes"] = [];
      window.IC3_CACHE["classes"].push(newClass);
    }

    const studentDocRef = doc(db, "students", email);
    const studentDocSnap = await getDoc(studentDocRef);
    let studentData = {};

    if (studentDocSnap.exists()) {
      studentData = studentDocSnap.data();
      studentData.name = studentName;
      studentData.classId = targetClassId;
      studentData.schoolClass = `${school} - ${className}`;
      await setDoc(studentDocRef, studentData, { merge: true });
    } else {
      studentData = {
        email: email, name: studentName, schoolClass: `${school} - ${className}`,
        classId: targetClassId, blockId: "block_3",
        pokemon: ["pikachu", "charmander", "bulbasaur", "squirtle", "eevee"][Math.floor(Math.random() * 5)],
        level: "Beginner", exp: 150, maxExp: 500, coins: 50, rank: "Bronze", badges: [],
        unlockedLessons: ["lesson_l1_1"], unlockedZones: ["level_1"]
      };
      await setDoc(studentDocRef, studentData);
    }

    const userDocRef = doc(db, "users", email);
    const userData = { email, name: studentName, role: "student", password: inputPassword, currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), forceLogout: false };
    await setDoc(userDocRef, userData);

    localStorage.setItem(window.IC3_KEYS.CURRENT_USER, JSON.stringify(userData));
    sessionStorage.setItem("sheet_student_name", studentName);
    sessionStorage.setItem("sheet_student_school", school);
    sessionStorage.setItem("sheet_student_class", className);
    sessionStorage.setItem("sheet_student_row_index", found.rowIndex);

    return { success: true, user: userData };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.message };
  }
};

/**
 * Automatically Sync Score & Ranking to Google Sheet
 */
window.syncScoreToGoogleSheet = async (score, testTitle, correctCount) => {
  const token = sessionStorage.getItem("google_sheets_token");
  
  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) return { success: false, message: "No sheet configured" };

    const cleanId = extractSpreadsheetId(config.spreadsheetId);
    const sheetName = config.studentSheetName || "Học sinh";
    const rowIndex = sessionStorage.getItem("sheet_student_row_index");

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const data = await fetchSheetsValues(cleanId, sheetName + '!A1:Z1', token);
    const headers = data.values && data.values[0] ? data.values[0] : [];
    
    // Find column for the test
    
    let testCol = -1;
    if (testTitle) {
      let normalizedTestTitle = testTitle.toLowerCase().replace(/ôn tập\s*/g, "ot").replace(/\s+/g, "");
      
      testCol = headers.findIndex(h => {
          if (!h) return false;
          let normalizedH = h.toLowerCase().replace(/\s+/g, "");
          return normalizedH.includes(normalizedTestTitle);
      });
    }

    if (testCol === -1) return { success: false, message: "Không tìm thấy cột điểm phù hợp" };
  

    // Write correct count or fallback to score
    const valueToWrite = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
    await updateSheetCell(cleanId, sheetName, token, rowIndex, testCol, valueToWrite);

    // Calculate XL and Ghi chú
    // Rule: Nếu 45 câu -> 41+ câu đúng = A, < 20 câu đúng = C
    const xlCol = findColumnIndex(headers, ["xl", "xếp loại"]);
    const noteCol = findColumnIndex(headers, ["ghi chú"]);

    if (xlCol !== -1 && noteCol !== -1) {
       let type = "";
       let note = "";
       const headerName = headers[testCol];
       if (headerName.includes("(45)")) {
          const val = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
          if (val >= 41 || (correctCount === undefined && val >= 91)) {
             type = "A";
             note = "Xuất sắc, cần duy trì phát huy.";
          } else if (val <= 20 || (correctCount === undefined && val <= 44)) {
             type = "C";
             note = "Cần cố gắng ôn tập nhiều hơn.";
          } else {
             type = "B";
          }
       }
       if (type) {
         await updateSheetCell(cleanId, sheetName, token, rowIndex, xlCol, type);
         await updateSheetCell(cleanId, sheetName, token, rowIndex, noteCol, note);
       }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Exception during Google Sheet sync:", error);
    return { success: false, error: error.message };
  }
};


/**
 * Automatically Sync Cheat to Google Sheet
 */
window.syncCheatToGoogleSheet = async (cheatReason) => {
  const token = sessionStorage.getItem("google_sheets_token");

  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) return { success: false, message: "No sheet configured" };

    const cleanId = extractSpreadsheetId(config.spreadsheetId);
    const sheetName = config.studentSheetName || "Học sinh";
    const rowIndex = sessionStorage.getItem("sheet_student_row_index");

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const data = await fetchSheetsValues(cleanId, sheetName + '!A1:Z1', token);
    const headers = data.values && data.values[0] ? data.values[0] : [];
    
    const noteCol = findColumnIndex(headers, ["ghi chú"]);
    const cheatCol = findColumnIndex(headers, ["gian lận"]);
    
    if (noteCol !== -1) {
      // Get current note
      const cellData = await fetchSheetsValues(cleanId, sheetName + '!' + String.fromCharCode(65 + noteCol) + rowIndex, token);
      let currentNote = cellData.values && cellData.values[0] && cellData.values[0][0] ? cellData.values[0][0] : "";
      
      if (currentNote && !currentNote.includes(cheatReason)) {
        currentNote += ", " + cheatReason;
      } else if (!currentNote) {
        currentNote = cheatReason;
      }
      
      await updateSheetCell(cleanId, sheetName, token, rowIndex, noteCol, currentNote);
    }
    
    if (cheatCol !== -1) {
      // Increment cheat counter
      const cellData = await fetchSheetsValues(cleanId, sheetName + '!' + String.fromCharCode(65 + cheatCol) + rowIndex, token);
      let currentCheat = cellData.values && cellData.values[0] && cellData.values[0][0] ? parseInt(cellData.values[0][0]) || 0 : 0;
      
      await updateSheetCell(cleanId, sheetName, token, rowIndex, cheatCol, (currentCheat + 1).toString());
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Exception during Google Sheet cheat sync:", error);
    return { success: false, error: error.message };
  }
};
