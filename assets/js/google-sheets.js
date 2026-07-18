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
 * Supports comma-separated sheet names to merge multiple school/class sheets in parallel
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

  // Split sheetNames by commas (e.g., "Trường Sparks, Trường Horizon, Trường Nguyễn Huệ")
  const sheetNames = sheetName.split(",")
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (sheetNames.length === 0) {
    sheetNames.push("Tổng quát");
  }

  const allParsedStudents = [];

  const fetchSingleSheet = async (singleSheetName) => {
    try {
      let rows = null;
      // Wrap sheet name in single quotes to handle spaces correctly for Sheets API
      const quotedSheetName = `'${singleSheetName.replace(/'/g, "''")}'`;

      // Attempt 1: Try API/Proxy
      try {
        const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:Z2000', token);
        if (data && data.values && data.values.length >= 2) {
          rows = data.values;
          console.log(`✅ Student data loaded via Google Sheets API for sheet [${singleSheetName}].`);
        } else if (data && data.error) {
          console.warn(`⚠️ Sheets API failed for [${singleSheetName}], falling back to CSV. Error:`, data.error.message || data.error);
        }
      } catch (e) {
        console.warn(`⚠️ Proxy fetch failed for [${singleSheetName}], trying CSV fallback...`);
      }

      // Attempt 2: Fallback to Public CSV (Requires "Anyone with the link")
      if (!rows) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(singleSheetName)}`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          const csvText = await res.text();
          rows = parseCSV(csvText);
          console.log(`✅ Student data loaded via CSV fallback for [${singleSheetName}].`);
        }
      }

      if (!rows || rows.length < 2) {
        console.warn(`⚠️ Tab [${singleSheetName}] không có dữ liệu hoặc không truy cập được.`);
        return [];
      }

      const headers = rows[0].map(h => h ? String(h).trim() : "");
      const colTruong = findColumnIndex(headers, ["trường", "school"]);
      const colLop = findColumnIndex(headers, ["lớp", "class"]);
      const colHo = findColumnIndex(headers, ["họ", "last name"]);
      const colTen = findColumnIndex(headers, ["tên", "first name", "name", "họ tên"]);
      const colMatKhau = findColumnIndex(headers, ["mật khẩu", "password", "mk"]);
      const colDiscovery = findColumnIndex(headers, ["tab danh sách", "sheet name", "tab name", "danh sách tab", "trường", "school"]);

      // If this is a discovery sheet (like TỔNG QUÁT), and we found a discovery column
      if (colDiscovery !== -1 && singleSheetName.toUpperCase().includes("TỔNG QUÁT")) {
         const extraSheetNames = [];
         for (let i = 1; i < rows.length; i++) {
            const val = rows[i][colDiscovery];
            if (val && String(val).trim() && !sheetNames.includes(String(val).trim())) {
               extraSheetNames.push(String(val).trim());
            }
         }
         if (extraSheetNames.length > 0) {
            console.log(`🔍 Discovery: Found ${extraSheetNames.length} additional sheets to fetch from [${singleSheetName}]:`, extraSheetNames);
            const discoveredResults = await Promise.all(extraSheetNames.map(name => fetchSingleSheet(name)));
            const combined = [];
            for (const list of discoveredResults) combined.push(...list);
            // Also include current sheet data if it has students
            if (colLop !== -1 && colTen !== -1 && colMatKhau !== -1) {
               // Proceed to parse current rows too
            } else {
               return combined;
            }
         }
      }

      if (colLop === -1 || colTen === -1 || colMatKhau === -1) {
        console.warn(`⚠️ Tab [${singleSheetName}] thiếu các cột bắt buộc (Lớp, Tên, Mật khẩu) hoặc không phải Tab dữ liệu học sinh.`);
        return [];
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
          parsedStudents.push({ 
            rowIndex: i + 1, 
            school, 
            className, 
            name: fullName, 
            password,
            sheetName: singleSheetName // Store specific sheet name tab to write back scores correctly
          });
        }
      }
      return parsedStudents;
    } catch (err) {
      console.error(`❌ Error fetching sheet [${singleSheetName}]:`, err);
      return [];
    }
  };

  try {
    // Fetch all configured sheet tabs concurrently
    const results = await Promise.all(sheetNames.map(name => fetchSingleSheet(name)));
    for (const list of results) {
      allParsedStudents.push(...list);
    }

    if (allParsedStudents.length === 0) {
      throw new Error("Không thể tải dữ liệu học sinh từ bất kỳ Tab nào được chỉ định. Hãy kiểm tra lại tên Sheet hoặc quyền truy cập.");
    }

    return allParsedStudents;
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
  const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
  const range = `${quotedSheetName}!${colLetter}${rowIndex}`;
  
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
window.loginStudentWithGoogleSheet = async (school, className, studentRowIndex, inputPassword, googleUser, sheetStudentsList) => {
  try {
    // Find precise student matching school, class AND row index to handle overlapping indices across sheets
    const found = sheetStudentsList.find(s => 
      s.rowIndex === parseInt(studentRowIndex) &&
      s.className.toLowerCase() === className.toLowerCase() &&
      s.school.toLowerCase() === school.toLowerCase()
    );

    if (!found) return { success: false, message: "Không tìm thấy học sinh này trong bảng tính!" };
    
    // Helper to generate a unique clean ID
    const cleanStringForId = (str) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove Vietnamese diacritics
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]/g, ""); // keep only safe alphanumeric chars
    };

    const studentId = cleanStringForId(found.name) + "_" + cleanStringForId(className) + "_" + cleanStringForId(school) + "_" + found.rowIndex;
    const generatedEmail = `${studentId}@ic3lms.edu.vn`;

    const db = window.db;

    // Check if user already exists in Firestore "users" collection
    const userDocRef = doc(db, "users", generatedEmail);
    const userDocSnap = await getDoc(userDocRef);
    let firestoreUser = null;

    if (userDocSnap.exists()) {
      firestoreUser = userDocSnap.data();
    }

    // Validate against the original Google Sheet password
    if (found.password !== inputPassword) {
      return { success: false, message: "Mật khẩu không khớp với file Sheet!" };
    }

    // Mark Attendance
    const token = sessionStorage.getItem("google_sheets_token");
    const config = await window.getGoogleSheetsConfig();
    if (config) {
      const cleanId = extractSpreadsheetId(config.spreadsheetId);
      const sheetName = found.sheetName || config.studentSheetName || "Học sinh";
      const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
      // Fetch headers to find "Điểm danh"
      const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:Z1', token);
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

    let targetClassId = "";
    let classesList = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
    
    if (classesList.length === 0) {
      const classesRef = collection(db, "classes");
      const classesSnap = await getDocs(classesRef);
      classesList = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      window.IC3_CACHE[window.IC3_KEYS.CLASSES] = classesList;
    }

    targetClassId = `class_${cleanStringForId(school)}_${cleanStringForId(className)}`;

    const matchingClass = classesList.find(c => c.id === targetClassId);
    if (!matchingClass) {
      const teacherEmail = config?.configuredBy || "teacher@gmail.com";
      const newClass = { 
        id: targetClassId, 
        name: `${className} - ${school}`, 
        teacherEmail: teacherEmail, 
        studentCount: 1,
        isFromSheet: true,
        sheetSchool: school,
        sheetClassName: className,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "classes", targetClassId), newClass);
      if (!window.IC3_CACHE["classes"]) window.IC3_CACHE["classes"] = [];
      window.IC3_CACHE["classes"].push(newClass);
    }

    const studentDocRef = doc(db, "students", generatedEmail);
    const studentDocSnap = await getDoc(studentDocRef);
    let studentData = {};
    let userData = {};

    if (studentDocSnap.exists()) {
      studentData = studentDocSnap.data();
      studentData.name = found.name;
      studentData.classId = targetClassId;
      studentData.schoolClass = `${school} - ${className}`;
      // Ensure bananas and pokemonFedBananas exist and are preserved
      studentData.bananas = studentData.bananas !== undefined ? studentData.bananas : 0;
      studentData.pokemonFedBananas = studentData.pokemonFedBananas !== undefined ? studentData.pokemonFedBananas : 0;
      
      // ONLY update if they already have a Pokémon (meaning they finished setup)
      if (studentData.pokemon) {
        await setDoc(studentDocRef, studentData, { merge: true });
      }
      localStorage.setItem("pendingStudentData", "");

      if (firestoreUser) {
        userData = { 
          ...firestoreUser, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false 
        };
        await setDoc(userDocRef, userData);
      } else {
        userData = { 
          email: generatedEmail, 
          name: found.name, 
          role: "student", 
          password: inputPassword, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false 
        };
        await setDoc(userDocRef, userData);
      }
    } else {
      studentData = {
        email: generatedEmail, 
        name: found.name, 
        schoolClass: `${school} - ${className}`,
        classId: targetClassId, 
        blockId: "block_3",
        level: "Beginner", 
        exp: 150, 
        maxExp: 500, 
        coins: 50, 
        rank: "Bronze", 
        badges: [],
        unlockedLessons: ["lesson_l1_1"], 
        unlockedZones: ["level_1"],
        bananas: 0,
        pokemonFedBananas: 0,
        isFirstLogin: true
      };
      localStorage.setItem("pendingStudentData", JSON.stringify(studentData));
      
      // Also store user data to be created later
      if (firestoreUser) {
        userData = { 
          ...firestoreUser, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false 
        };
      } else {
        userData = { 
          email: generatedEmail, 
          name: found.name, 
          role: "student", 
          password: inputPassword, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false 
        };
      }
      localStorage.setItem("pendingUserData", JSON.stringify(userData));
      // Create user doc immediately to satisfy session monitor
      await setDoc(userDocRef, userData);
    }

    // Only set the user in local storage for session management, don't create doc in DB yet
    const userKey = (window.IC3_KEYS && window.IC3_KEYS.CURRENT_USER) ? window.IC3_KEYS.CURRENT_USER : "ic3_current_user";
    localStorage.setItem(userKey, JSON.stringify(userData || {email: generatedEmail, name: found.name, role: "student"}));
    sessionStorage.setItem("sheet_student_name", found.name);
    sessionStorage.setItem("sheet_student_school", school);
    sessionStorage.setItem("sheet_student_class", className);
    sessionStorage.setItem("sheet_student_row_index", found.rowIndex);
    sessionStorage.setItem("sheet_student_tab_name", found.sheetName || "");

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
    const sheetName = sessionStorage.getItem("sheet_student_tab_name") || config.studentSheetName || "Học sinh";
    const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const rowIndex = sessionStorage.getItem("sheet_student_row_index");

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:Z1', token);
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
    
    // Read current score from sheet to check if we should update
    const scoreCellRange = sheetName + '!' + String.fromCharCode(65 + testCol) + rowIndex;
    const currentScoreData = await fetchSheetsValues(cleanId, scoreCellRange, token);
    const currentScoreStr = currentScoreData.values && currentScoreData.values[0] && currentScoreData.values[0][0] ? currentScoreData.values[0][0] : "";
    const currentScoreVal = parseInt(currentScoreStr);

    let shouldUpdate = false;
    if (isNaN(currentScoreVal) || valueToWrite > currentScoreVal) {
        shouldUpdate = true;
    }

    if (shouldUpdate) {
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
            const val = valueToWrite;
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
    } else {
      console.log(`Bỏ qua cập nhật Google Sheet vì điểm mới (${valueToWrite}) <= điểm cũ (${currentScoreVal})`);
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
    const sheetName = sessionStorage.getItem("sheet_student_tab_name") || config.studentSheetName || "Học sinh";
    const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const rowIndex = sessionStorage.getItem("sheet_student_row_index");

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:Z1', token);
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
