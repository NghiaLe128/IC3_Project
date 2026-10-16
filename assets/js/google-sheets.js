/**
 * IC3 LMS - Google Sheets API & Auth Integration
 */

// We use window.fAuth and window.fStore provided by db-init.js to ensure consistent Firebase instances
const getFAuth = () => window.fAuth || {};

// Setup Google Auth Provider with Google Sheets Scope
let provider;
const getProvider = () => {
  if (!provider && window.fAuth && window.fAuth.GoogleAuthProvider) {
    provider = new window.fAuth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  }
  return provider;
};

/**
 * Perform Google Login for Student (Popup)
 */
window.googleSignInStudent = async () => {
  try {
    console.log("🔑 Initializing student Google OAuth with Sheets scope...");
    const fAuth = getFAuth();
    const currentProvider = getProvider();
    if (!window.auth || !fAuth.signInWithPopup || !currentProvider) {
      throw new Error("Hệ thống Google Auth chưa sẵn sàng, vui lòng thử lại sau vài giây!");
    }
    const result = await fAuth.signInWithPopup(window.auth, currentProvider);
    const credential = fAuth.GoogleAuthProvider.credentialFromResult(result);
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
    const db = window.db;
    const fStore = window.fStore;
    if (!db || !fStore) {
      console.warn("⚠️ window.db or window.fStore is not ready when calling getGoogleSheetsConfig");
      return null;
    }
    const docRef = fStore.doc(db, "settings", "google_sheets");
    const docSnap = await fStore.getDoc(docRef);
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
    const db = window.db;
    const fStore = window.fStore;
    if (!db || !fStore) throw new Error("Database is not ready!");
    const docRef = fStore.doc(db, "settings", "google_sheets");
    await fStore.setDoc(docRef, {
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
  if (!spreadsheetId) {
    console.warn("⚠️ No Spreadsheet ID provided to fetchGoogleSheetData.");
    return [];
  }
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

      // Attempt 1: Try API/Proxy (Proxy will automatically fallback to CSV if API fails or no service account key)
      try {
        const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:Z2000', token);
        if (data && data.values && data.values.length >= 2) {
          rows = data.values;
          console.log(`✅ Student data loaded via Google Sheets API (or proxy CSV fallback) for sheet [${singleSheetName}].`);
        } else if (data && data.error) {
          console.warn(`⚠️ Sheets API failed for [${singleSheetName}]. Error:`, data.error.message || data.error);
        }
      } catch (e) {
        console.warn(`⚠️ Proxy fetch failed for [${singleSheetName}]. Error:`, e.message);
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
      console.warn("⚠️ Không thể tải dữ liệu học sinh từ bất kỳ Tab nào được chỉ định. (Sheet trống hoặc ID không đúng)");
      return [];
    }

    return allParsedStudents;
  } catch (error) {
    console.error("❌ Critical error in fetchGoogleSheetData:", error);
    throw error;
  }
};

/**
 * Helper to convert column index (0-based) or letter to Column Letter (e.g. 0->A, 25->Z, 26->AA, 70->BS)
 */
const colIndexToLetter = (colIndex) => {
  if (typeof colIndex === 'string') return colIndex;
  if (typeof colIndex !== 'number' || isNaN(colIndex) || colIndex < 0) return 'A';
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

/**
 * Update a specific cell in the sheet (Attendance, Score, etc.)
 */
const updateSheetCell = async (spreadsheetId, sheetName, token, rowIndex, colIndex, value) => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  // Convert colIndex to letter (0 -> A, 1 -> B, 26 -> AA, 70 -> BS, or if string passed, use as-is)
  const colLetter = colIndexToLetter(colIndex);
  const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
  const range = `${quotedSheetName}!${colLetter}${rowIndex}`;
  
  if (token) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[value]] })
      });
      if (res.ok) {
        return await res.json();
      }
      console.warn("⚠️ Direct Sheets PUT returned status:", res.status, "- falling back to proxy.");
    } catch (e) {
      console.warn("⚠️ Direct Sheets PUT failed, falling back to proxy:", e.message);
    }
  }

  // Fallback to server-side proxy (No student login required)
  try {
    const res = await fetch('/api/sheets/proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spreadsheetId: cleanId,
        range: range,
        method: "PUT",
        body: { values: [[value]] }
      })
    });
    if (res.ok) {
      return await res.json();
    }
    console.warn("⚠️ Proxy Sheets PUT returned non-ok status:", res.status);
    return { success: false };
  } catch (proxyError) {
    console.warn("⚠️ Proxy Sheets PUT failed:", proxyError.message);
    return { success: false, error: proxyError.message };
  }
};

/**
 * Helper to fetch sheet data (headers, current values) using proxy if needed
 */
const fetchSheetsValues = async (spreadsheetId, range, token) => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (token) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      console.warn("⚠️ Direct Sheets GET returned status:", res.status, "- falling back to proxy.");
    } catch (e) {
      console.warn("⚠️ Direct Sheets GET failed, falling back to proxy:", e.message);
    }
  }

  // Server-side proxy fallback
  try {
    const res = await fetch('/api/sheets/proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spreadsheetId: cleanId,
        range: range,
        method: "GET"
      })
    });
    if (res.ok) {
      return await res.json();
    }
    console.warn("⚠️ Proxy Sheets GET returned non-ok status:", res.status);
    return { values: [] };
  } catch (proxyError) {
    console.warn("⚠️ Proxy Sheets GET failed:", proxyError.message);
    return { values: [], error: proxyError.message };
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
    const fStore = window.fStore;
    if (!db || !fStore) {
        throw new Error("Hệ thống Database chưa sẵn sàng, vui lòng thử lại sau vài giây!");
    }

    // Check if user already exists in Firestore "users" collection
    const userDocRef = fStore.doc(db, "users", generatedEmail);
    const userDocSnap = await fStore.getDoc(userDocRef);
    let firestoreUser = null;

    if (userDocSnap.exists()) {
      firestoreUser = userDocSnap.data();
    }

    // Validate against the original Google Sheet password
    if (found.password !== inputPassword) {
      return { success: false, message: "Mật khẩu không khớp với file Sheet!" };
    }

    // Mark Attendance (Safe non-blocking execution)
    try {
      const token = sessionStorage.getItem("google_sheets_token");
      const config = await window.getGoogleSheetsConfig();
      if (config && config.spreadsheetId) {
        const cleanId = extractSpreadsheetId(config.spreadsheetId);
        const sheetName = found.sheetName || config.studentSheetName || "Học sinh";
        const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
        // Fetch headers to find "Điểm danh"
        const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:ZZ1', token);
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
            const cellData = await fetchSheetsValues(cleanId, quotedSheetName + '!' + colIndexToLetter(diemDanhCol) + found.rowIndex, token);
            const currentVal = cellData.values && cellData.values[0] && cellData.values[0][0] ? cellData.values[0][0].toLowerCase() : "";
            if (currentVal !== "x") {
              await updateSheetCell(cleanId, sheetName, token, found.rowIndex, diemDanhCol, "x");
            }
          }
        }
      }
    } catch (attError) {
      console.warn("⚠️ Attendance auto-marking skipped due to non-blocking issue:", attError.message);
    }

    let targetClassId = "";
    let classesList = window.IC3_CACHE[window.IC3_KEYS.CLASSES] || [];
    
    if (classesList.length === 0) {
      const classesRef = fStore.collection(db, "classes");
      const classesSnap = await fStore.getDocs(classesRef);
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
      await fStore.setDoc(fStore.doc(db, "classes", targetClassId), newClass);
      if (!window.IC3_CACHE["classes"]) window.IC3_CACHE["classes"] = [];
      window.IC3_CACHE["classes"].push(newClass);
    }

    const studentDocRef = fStore.doc(db, "students", generatedEmail);
    const studentDocSnap = await fStore.getDoc(studentDocRef);
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
        await fStore.setDoc(studentDocRef, studentData, { merge: true });
      }
      localStorage.setItem("pendingStudentData", "");

      if (firestoreUser) {
        userData = { 
          ...firestoreUser, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false,
          loginTimestamp: Date.now()
        };
        await fStore.setDoc(userDocRef, userData);
      } else {
        userData = { 
          email: generatedEmail, 
          name: found.name, 
          role: "student", 
          password: inputPassword, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false,
          loginTimestamp: Date.now()
        };
        await fStore.setDoc(userDocRef, userData);
      }
    } else {
      const blockNumMatch = className.match(/([3-8])/);
      const studentBlockId = blockNumMatch ? `block_${blockNumMatch[1]}` : "block_3";
      
      studentData = {
        email: generatedEmail, 
        name: found.name, 
        schoolClass: `${school} - ${className}`,
        classId: targetClassId, 
        blockId: studentBlockId,
        sheetRowIndex: found.rowIndex,
        sheetName: found.sheetName || "",
        sheetSchool: school,
        sheetClassName: className,
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
          forceLogout: false,
          loginTimestamp: Date.now()
        };
      } else {
        userData = { 
          email: generatedEmail, 
          name: found.name, 
          role: "student", 
          password: inputPassword, 
          currentSessionToken: Math.random().toString(36).substring(2) + Date.now(), 
          forceLogout: false,
          loginTimestamp: Date.now()
        };
      }
      localStorage.setItem("pendingUserData", JSON.stringify(userData));
      // Create user doc immediately to satisfy session monitor
      await fStore.setDoc(userDocRef, userData);
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
    console.error("❌ Exception during Google Sheet login:", error);
    let errorMsg = error.message || "Không xác định";
    if (errorMsg === "Load failed" || errorMsg.includes("Failed to fetch") || errorMsg.includes("network")) {
      errorMsg = "Không thể kết nối đến máy chủ Google Sheet hoặc mạng bị gián đoạn. Vui lòng kiểm tra lại kết nối mạng và thử lại!";
    }
    return { success: false, message: "Lỗi hệ thống: " + errorMsg };
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
    let rowIndex = sessionStorage.getItem("sheet_student_row_index");
    if (!rowIndex && window.currentStudent) {
      if (window.currentStudent.sheetRowIndex) {
        rowIndex = window.currentStudent.sheetRowIndex;
      } else if (window.cachedSheetStudents && window.cachedSheetStudents.length > 0) {
        const found = window.cachedSheetStudents.find(s => 
          s.name && window.currentStudent.name && 
          s.name.trim().toLowerCase() === window.currentStudent.name.trim().toLowerCase()
        );
        if (found && found.rowIndex) {
          rowIndex = found.rowIndex;
          sessionStorage.setItem("sheet_student_row_index", found.rowIndex);
        }
      }
    }

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:ZZ1', token);
    const headers = data.values && data.values[0] ? data.values[0] : [];
    
    // Find column for the test
    let testCol = -1;
    if (testTitle) {
      let tLow = testTitle.toLowerCase().trim();
      let tNorm = tLow.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
      const isBoSung = tLow.includes("bổ sung") || tNorm.includes("bo sung") || tNorm === "bs" || tLow === "bổ sung";
      const isOtth = tLow.includes("ôn tập tổng hợp") || tNorm.includes("on tap tong hop") || tLow.includes("tổng hợp") || tNorm.includes("tong hop") || tNorm === "otth" || tLow === "otth";

      if (isOtth) {
        testCol = headers.findIndex(h => {
          if (!h) return false;
          let hl = h.toLowerCase().trim();
          let hNorm = hl.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
          return hl === "otth" || hl.includes("ôn tập tổng hợp") || hNorm.includes("on tap tong hop") || hl.includes("tổng hợp") || hNorm.includes("tong hop");
        });
        if (testCol === -1) {
          testCol = headers.findIndex(h => h && h.trim().toUpperCase() === "OTTH");
        }
      } else if (isBoSung) {
        testCol = headers.findIndex(h => {
          if (!h) return false;
          let hl = h.toLowerCase().trim();
          let hNorm = hl.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
          return hl.includes("bổ sung") || hNorm.includes("bo sung") || hl === "bs";
        });
        if (testCol === -1) {
          testCol = headers.findIndex(h => h && h.trim().toUpperCase() === "BS");
        }
      } else {
        // 1. Direct normalized match
        const cleanT = tNorm.replace(/ôn tập\s*/g, "ot").replace(/on tap\s*/g, "ot").replace(/đề\s*/g, "de").replace(/de\s*/g, "de").replace(/bài\s*/g, "bai").replace(/bai\s*/g, "bai").replace(/[^a-z0-9]/g, "");
        
        testCol = headers.findIndex(h => {
          if (!h) return false;
          const hNorm = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
          const cleanH = hNorm.replace(/ôn tập\s*/g, "ot").replace(/on tap\s*/g, "ot").replace(/đề\s*/g, "de").replace(/de\s*/g, "de").replace(/bài\s*/g, "bai").replace(/bai\s*/g, "bai").replace(/[^a-z0-9]/g, "");
          return cleanH === cleanT || cleanH.includes(cleanT) || cleanT.includes(cleanH);
        });

        // 2. Number based match (e.g. Test "Đề 1" -> matches "Đề 1 (45)", "OT1", "Đề 1", "Bài 1", "1")
        if (testCol === -1) {
          const numMatch = tLow.match(/(?:đề|bài|ot|ôn tập|lần|test|kt|de)\s*(\d+)/i) || tLow.match(/(\d+)/);
          if (numMatch) {
            const testNum = numMatch[1];
            testCol = headers.findIndex(h => {
              if (!h) return false;
              const hNorm = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
              const hNumMatch = hNorm.match(/(?:đề|bài|ot|ôn tập|lần|test|kt|de)\s*(\d+)/i) || hNorm.match(/(\d+)/);
              if (hNumMatch && hNumMatch[1] === testNum) {
                // If it has matching number and is an OT or De or Bai column
                if (hNorm.includes("ot") || hNorm.includes("de") || hNorm.includes("bai") || hNorm.includes("test") || hNorm.includes("on tap") || hNorm.includes("de thi")) {
                  return true;
                }
                // Or if header is just the number like "1", "2", "3"
                if (hNorm === testNum || hNorm.startsWith(testNum + " ") || hNorm.startsWith(testNum + "(")) {
                  return true;
                }
              }
              return false;
            });
          }
        }
      }
    }

    if (testCol === -1) return { success: false, message: "Không tìm thấy cột điểm phù hợp" };
  

    // Write correct count or fallback to score
    const valueToWrite = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
    
    // Read current score from sheet to check if we should update
    const colLetter = colIndexToLetter(testCol);
    const scoreCellRange = quotedSheetName + '!' + colLetter + rowIndex;
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
         const headerName = typeof testCol === 'number' && headers[testCol] ? headers[testCol] : "";
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
    const data = await fetchSheetsValues(cleanId, quotedSheetName + '!A1:ZZ1', token);
    const headers = data.values && data.values[0] ? data.values[0] : [];
    
    const noteCol = findColumnIndex(headers, ["ghi chú"]);
    const cheatCol = findColumnIndex(headers, ["gian lận"]);
    
    if (noteCol !== -1) {
      // Get current note
      const cellData = await fetchSheetsValues(cleanId, quotedSheetName + '!' + colIndexToLetter(noteCol) + rowIndex, token);
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
      const cellData = await fetchSheetsValues(cleanId, quotedSheetName + '!' + colIndexToLetter(cheatCol) + rowIndex, token);
      let currentCheat = cellData.values && cellData.values[0] && cellData.values[0][0] ? parseInt(cellData.values[0][0]) || 0 : 0;
      
      await updateSheetCell(cleanId, sheetName, token, rowIndex, cheatCol, (currentCheat + 1).toString());
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Exception during Google Sheet cheat sync:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Automatically fill score and class name for student into Google Sheet
 * Used by dedicated exam portal (kiemtra)
 */
window.syncExamResultToGoogleSheet = async ({ studentName, className, school, testTitle, score, score10, correctCount, totalCount, rank, timeSpent }) => {
  const token = sessionStorage.getItem("google_sheets_token");

  try {
    const config = await window.getGoogleSheetsConfig();
    const spreadsheetId = (config && config.spreadsheetId) ? config.spreadsheetId : "1_T54jBg20fY7Z9gRuEnLVTwh9uPEwZcnVD-OzFr4LfA";
    const cleanId = extractSpreadsheetId(spreadsheetId);

    // 1. Determine target sheet tab
    let availableTabs = [];
    try {
      const metaRes = await fetch('/api/sheets/proxy', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: cleanId, method: "METADATA" })
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta && meta.sheets) {
          availableTabs = meta.sheets.map(s => s.properties.title);
        }
      }
    } catch (e) {
      console.warn("Could not query sheet metadata:", e);
    }

    let targetTab = "";
    const norm = (s) => (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const normSchool = norm(school);

    if (school && availableTabs.length > 0) {
      // Find tab that best matches the school
      targetTab = availableTabs.find(tab => {
        const nTab = norm(tab);
        return nTab === normSchool || nTab.includes(normSchool) || normSchool.includes(nTab);
      });
    }

    if (!targetTab) {
      targetTab = sessionStorage.getItem("sheet_student_tab_name") || (config && config.studentSheetName) || "Tổng quát";
    }

    console.log(`📊 Syncing exam to Google Sheet [${cleanId}], Tab: [${targetTab}] for ${studentName} (${className} - ${school})`);

    // 2. Fetch headers and existing rows from target tab
    const quotedTargetTab = `'${targetTab.replace(/'/g, "''")}'`;
    const sheetData = await fetchSheetsValues(cleanId, `${quotedTargetTab}!A1:ZZ500`, token);
    const rows = (sheetData && sheetData.values) ? sheetData.values : [];
    const headers = rows.length > 0 ? rows[0] : [];

    if (headers.length === 0) {
      console.warn("⚠️ No headers found in sheet tab:", targetTab);
      return { success: false, message: "Không tìm thấy cấu trúc cột trong bảng tính" };
    }

    // 3. Locate columns
    const colStt = findColumnIndex(headers, ["stt", "no"]);
    const colHo = findColumnIndex(headers, ["họ", "last name"]);
    const colTen = findColumnIndex(headers, ["tên", "first name"]);
    const colHoTen = findColumnIndex(headers, ["họ và tên", "họ tên", "full name", "tên học sinh"]);
    const colTruong = findColumnIndex(headers, ["trường", "school"]);
    const colLop = findColumnIndex(headers, ["lớp", "class"]);
    const colXL = findColumnIndex(headers, ["xl", "xếp loại"]);
    const colGhiChu = findColumnIndex(headers, ["ghi chú", "note"]);

    // Find test column
    let testCol = -1;
    if (testTitle) {
      const tLow = testTitle.toLowerCase().trim();
      const tNorm = norm(tLow);
      const isBoSung = tLow.includes("bổ sung") || tNorm.includes("bo sung") || tNorm === "bs";
      const isOtth = tLow.includes("ôn tập tổng hợp") || tNorm.includes("on tap tong hop") || tLow.includes("tổng hợp") || tNorm.includes("tong hop") || tNorm === "otth";

      if (isOtth) {
        testCol = headers.findIndex(h => {
          if (!h) return false;
          const hl = norm(h);
          return hl === "otth" || hl.includes("tong hop");
        });
      } else if (isBoSung) {
        testCol = headers.findIndex(h => {
          if (!h) return false;
          const hl = norm(h);
          return hl.includes("bo sung") || hl === "bs";
        });
      } else {
        // Direct string search
        const cleanT = tNorm.replace(/ôn tập\s*/g, "ot").replace(/on tap\s*/g, "ot").replace(/đề\s*/g, "de").replace(/de\s*/g, "de").replace(/bài\s*/g, "bai").replace(/bai\s*/g, "bai").replace(/[^a-z0-9]/g, "");
        testCol = headers.findIndex(h => {
          if (!h) return false;
          const cleanH = norm(h).replace(/ôn tập\s*/g, "ot").replace(/on tap\s*/g, "ot").replace(/đề\s*/g, "de").replace(/de\s*/g, "de").replace(/bài\s*/g, "bai").replace(/bai\s*/g, "bai").replace(/[^a-z0-9]/g, "");
          return cleanH === cleanT || (cleanT && cleanH.includes(cleanT)) || (cleanH && cleanT.includes(cleanH));
        });

        // Number-based search (e.g. Test "1" matches "OT 1 (45)", "OT 1", "Đề 1")
        if (testCol === -1) {
          const numMatch = tLow.match(/(?:đề|bài|ot|ôn tập|lần|test|kt|de)\s*(\d+)/i) || tLow.match(/(\d+)/);
          if (numMatch) {
            const testNum = numMatch[1];
            testCol = headers.findIndex(h => {
              if (!h) return false;
              const hNorm = norm(h);
              const hNumMatch = hNorm.match(/(?:đề|bài|ot|ôn tập|lần|test|kt|de)\s*(\d+)/i) || hNorm.match(/(\d+)/);
              if (hNumMatch && hNumMatch[1] === testNum) {
                return true;
              }
              if (hNorm === testNum || hNorm.startsWith(testNum + " ") || hNorm.startsWith(testNum + "(")) {
                return true;
              }
              return false;
            });
          }
        }
      }
    }

    const valueToWrite = (correctCount !== undefined && correctCount !== null) ? correctCount : score;

    // 4. Search for student row in sheet
    let targetRowIndex = -1;
    const cleanStudentName = norm(studentName).replace(/\s+/g, " ");

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      let rFullName = "";
      if (colHo !== -1 && colTen !== -1) {
        const ho = r[colHo] ? String(r[colHo]).trim() : "";
        const ten = r[colTen] ? String(r[colTen]).trim() : "";
        rFullName = `${ho} ${ten}`.trim();
      } else if (colHoTen !== -1 && r[colHoTen]) {
        rFullName = String(r[colHoTen]).trim();
      } else if (colTen !== -1 && r[colTen]) {
        rFullName = String(r[colTen]).trim();
      }

      const cleanRName = norm(rFullName).replace(/\s+/g, " ");
      if (cleanRName && (cleanRName === cleanStudentName || cleanRName.includes(cleanStudentName) || cleanStudentName.includes(cleanRName))) {
        targetRowIndex = i + 1; // 1-indexed
        break;
      }
    }

    // 5. Fill score and class into sheet
    if (targetRowIndex > 0) {
      console.log(`✅ Found existing student in sheet at row ${targetRowIndex}. Updating Class & Score...`);
      // Update Class column (Fill tên lớp)
      if (colLop !== -1 && className) {
        await updateSheetCell(cleanId, targetTab, token, targetRowIndex, colLop, className);
      }
      // Update Test Score column (Fill điểm)
      if (testCol !== -1) {
        await updateSheetCell(cleanId, targetTab, token, targetRowIndex, testCol, valueToWrite);
      }
      // Update School if empty
      if (colTruong !== -1 && school) {
        const currentSchool = rows[targetRowIndex - 1] ? rows[targetRowIndex - 1][colTruong] : "";
        if (!currentSchool) {
          await updateSheetCell(cleanId, targetTab, token, targetRowIndex, colTruong, school);
        }
      }
      // Update XL & Ghi Chú (Quy chuẩn: 41/45 là loại A/Giỏi, 1 nửa câu tới 41 là B/Khá, dưới 1 nửa là C)
      const tot = totalCount || 45;
      const thresGioi = (tot === 45) ? 41 : Math.ceil(tot * (41 / 45));
      const thresKha = Math.ceil(tot / 2);
      const scoreOn10 = (score10 !== undefined && score10 !== null) 
        ? Number(score10).toFixed(1) 
        : (((correctCount || 0) / tot) * 10).toFixed(1);
      const rankLabel = rank || (valueToWrite >= thresGioi ? "Giỏi" : (valueToWrite >= thresKha ? "Khá" : "Cần cố gắng"));

      if (colXL !== -1) {
        const xlVal = valueToWrite >= thresGioi ? "A" : (valueToWrite >= thresKha ? "B" : "C");
        await updateSheetCell(cleanId, targetTab, token, targetRowIndex, colXL, xlVal);
      }
      if (colGhiChu !== -1) {
        const note = `Điểm: ${scoreOn10}/10 (${rankLabel}) • TG: ${timeSpent || "Vừa xong"}`;
        await updateSheetCell(cleanId, targetTab, token, targetRowIndex, colGhiChu, note);
      }

      return {
        success: true,
        action: "updated",
        tab: targetTab,
        rowIndex: targetRowIndex,
        testCol,
        classCol: colLop,
        scoreWritten: valueToWrite,
        classWritten: className
      };
    } else {
      // Student not found -> Append new row with School, Class, Name, and Score!
      console.log(`➕ Student not found in sheet. Appending new row with Class (${className}) and Score (${valueToWrite})...`);
      const newRow = new Array(headers.length).fill("");
      
      if (colStt !== -1) newRow[colStt] = rows.length; // Next STT
      
      // Name split
      const nameParts = studentName.trim().split(/\s+/);
      if (colHo !== -1 && colTen !== -1) {
        if (nameParts.length > 1) {
          newRow[colTen] = nameParts.pop();
          newRow[colHo] = nameParts.join(" ");
        } else {
          newRow[colTen] = studentName.trim();
          newRow[colHo] = "";
        }
      } else if (colHoTen !== -1) {
        newRow[colHoTen] = studentName.trim();
      } else if (colTen !== -1) {
        newRow[colTen] = studentName.trim();
      }

      if (colTruong !== -1 && school) newRow[colTruong] = school;
      if (colLop !== -1 && className) newRow[colLop] = className; // FILL TÊN LỚP!
      if (testCol !== -1) newRow[testCol] = valueToWrite; // FILL ĐIỂM!
      
      const tot = totalCount || 45;
      const thresGioi = (tot === 45) ? 41 : Math.ceil(tot * (41 / 45));
      const thresKha = Math.ceil(tot / 2);
      const scoreOn10 = (score10 !== undefined && score10 !== null) 
        ? Number(score10).toFixed(1) 
        : (((correctCount || 0) / tot) * 10).toFixed(1);
      const rankLabel = rank || (valueToWrite >= thresGioi ? "Giỏi" : (valueToWrite >= thresKha ? "Khá" : "Cần cố gắng"));

      if (colXL !== -1) {
        const xlVal = valueToWrite >= thresGioi ? "A" : (valueToWrite >= thresKha ? "B" : "C");
        newRow[colXL] = xlVal;
      }
      if (colGhiChu !== -1) {
        newRow[colGhiChu] = `Điểm: ${scoreOn10}/10 (${rankLabel}) • Tự động lưu (${timeSpent || "Vừa xong"})`;
      }

      // Append row via proxy
      const appendRes = await fetch('/api/sheets/proxy', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: cleanId,
          range: `${quotedTargetTab}!A1`,
          method: "APPEND",
          body: { values: [newRow] }
        })
      });

      return {
        success: appendRes.ok,
        action: "appended",
        tab: targetTab,
        scoreWritten: valueToWrite,
        classWritten: className
      };
    }
  } catch (error) {
    console.error("❌ Exception during Google Sheet exam sync:", error);
    return { success: false, error: error.message };
  }
};

