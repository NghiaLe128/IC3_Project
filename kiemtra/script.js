/**
 * Cổng Kiểm Tra Đề Trực Tuyến - IC3 LMS
 * Tự động lấy chung Database Firestore và đồng bộ Điểm + Tên lớp vào Google Sheet
 */

// ================= GLOBAL STATE =================
let allTests = [];
let allQuestions = [];
let activeBlockFilter = "all";
let currentSearchQuery = "";

// Dynamic Sheet Cache
let sheetTabsList = [];
let sheetSchools = [];
let schoolToClassesMap = {};
let studentNamesBySchoolClass = {};

// Active Exam State
let selectedTest = null;
let currentCandidate = {
  name: "",
  className: "",
  school: ""
};

let examQuestions = [];
let activeQuestionIndex = 0;
let candidateAnswers = []; // indexed by active question
let flaggedQuestions = new Set(); // indexes flagged
let examRemainingSeconds = 0;
let examTotalSeconds = 0;
let examTimerInterval = null;
let examStartTime = null;
let isExamSubmitted = false;
let lastExamResult = null;

// ================= DRIVE IMAGE HELPER =================
function convertDriveUrl(url) {
  if (!url || typeof url !== "string") return url || "";
  let fileId = "";
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  } else if (url.includes("drive.google.com/open?id=")) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  } else if (url.includes("docs.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
  }
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

function formatItemText(item) {
  if (item === undefined || item === null) return "";
  if (typeof item === "object") {
    return item.text || item.title || item.name || item.term || item.definition || item.label || item.value || item.content || (item.toString && item.toString() !== "[object Object]" ? item.toString() : JSON.stringify(item));
  }
  return String(item);
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  if (window.IC3_DB_INITIALIZED) {
    initExamPortal();
  } else {
    window.addEventListener("ic3-db-ready", initExamPortal);
  }
});

async function initExamPortal() {
  console.log("🚀 Khởi chạy Cổng Kiểm Tra Trực Tuyến...");
  if (typeof window.hideGlobalLoader === "function") {
    window.hideGlobalLoader();
  }

  // 1. Load Tests and Questions from shared Database Cache
  loadDatabaseItems();

  // 2. Load Google Sheets Structure (Schools, Classes, Names)
  await loadGoogleSheetsDirectory();

  // 3. Render Tests Catalog
  renderTestsCatalog();
}

function loadDatabaseItems() {
  const cache = window.IC3_CACHE || {};
  allTests = cache[window.IC3_KEYS ? window.IC3_KEYS.TESTS : "tests"] || [];
  allQuestions = cache[window.IC3_KEYS ? window.IC3_KEYS.QUESTIONS : "questions"] || [];

  console.log(`📚 Đã nạp ${allTests.length} đề thi và ${allQuestions.length} câu hỏi từ Database.`);
}

/**
 * Quét thông tin Trường & Lớp từ Google Sheet qua proxy
 */
async function loadGoogleSheetsDirectory() {
  try {
    const config = (typeof window.getGoogleSheetsConfig === "function") ? await window.getGoogleSheetsConfig() : null;
    const spreadsheetId = (config && config.spreadsheetId) ? config.spreadsheetId : "1_T54jBg20fY7Z9gRuEnLVTwh9uPEwZcnVD-OzFr4LfA";
    const cleanId = (typeof extractSpreadsheetId === "function") ? extractSpreadsheetId(spreadsheetId) : spreadsheetId;

    // Fetch Tabs metadata
    let tabs = [];
    try {
      const metaRes = await fetch("/api/sheets/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: cleanId, method: "METADATA" })
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta && meta.sheets) {
          tabs = meta.sheets.map(s => s.properties.title);
        }
      }
    } catch (e) {
      console.warn("Could not fetch metadata:", e);
    }

    if (!tabs || tabs.length === 0) {
      tabs = ["THCS Nguyễn An Ninh", "THCS Phong Phú - LV1", "THCS Phong Phú - LV2", "THCS Đào Duy Anh", "THCS Văn Thân"];
    }
    sheetTabsList = tabs;

    // Filter out generic tab
    const schoolTabs = tabs.filter(t => t !== "Tổng quát" && t !== "Settings" && t !== "Cấu hình");

    // Extract School Names from Tabs
    const schoolsSet = new Set();
    schoolTabs.forEach(tab => {
      // Clean tab name: e.g. "THCS Phong Phú - LV1" -> "THCS Phong Phú"
      let sName = tab.split(" - ")[0].trim();
      schoolsSet.add(sName);
    });

    // Also include default schools
    schoolsSet.add("THCS Nguyễn An Ninh");
    schoolsSet.add("THCS Phong Phú");
    schoolsSet.add("THCS Đào Duy Anh");
    schoolsSet.add("THCS Văn Thân");
    schoolsSet.add("Trường khác");

    sheetSchools = Array.from(schoolsSet);

    // Pre-populate school select dropdown
    populateSchoolDropdown();

    // Fetch sample data from tabs in background to populate classes and student names
    loadClassesAndStudentsFromTabs(cleanId, schoolTabs);

  } catch (err) {
    console.error("Lỗi nạp cấu trúc Google Sheet:", err);
    sheetSchools = ["THCS Nguyễn An Ninh", "THCS Phong Phú", "THCS Đào Duy Anh", "THCS Văn Thân", "Trường khác"];
    populateSchoolDropdown();
  }
}

async function loadClassesAndStudentsFromTabs(cleanId, tabs) {
  schoolToClassesMap = {
    "THCS Nguyễn An Ninh": ["7.1", "7.2", "7.5", "6A1", "6A2", "8A1", "9A1"],
    "THCS Phong Phú": ["6/1", "6/2", "7/1", "7/2", "8/1", "8/2"],
    "THCS Đào Duy Anh": ["6A1", "6A2", "7A1", "7A2", "8A1"],
    "THCS Văn Thân": ["6A1", "6A2", "7A1", "7A2", "8A1"],
    "Trường khác": ["Lớp 6A", "Lớp 7A", "Lớp 8A", "Lớp khác..."]
  };

  try {
    for (const tab of tabs.slice(0, 5)) {
      const sName = tab.split(" - ")[0].trim();
      const res = await fetch("/api/sheets/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: cleanId,
          range: `'${tab}'!A1:G150`,
          method: "GET"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        if (rows.length > 1) {
          const headers = rows[0].map(h => (h || "").toLowerCase().trim());
          const colLop = headers.findIndex(h => h.includes("lớp") || h.includes("class"));
          const colHo = headers.findIndex(h => h.includes("họ") || h.includes("last"));
          const colTen = headers.findIndex(h => h.includes("tên") || h.includes("first"));

          if (colLop !== -1) {
            if (!schoolToClassesMap[sName]) schoolToClassesMap[sName] = [];
            const existingSet = new Set(schoolToClassesMap[sName]);

            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r) continue;
              const lopVal = r[colLop] ? String(r[colLop]).trim() : "";
              if (lopVal) {
                existingSet.add(lopVal);
              }

              // Also collect student full names for datalist
              if (colTen !== -1) {
                const ho = colHo !== -1 && r[colHo] ? String(r[colHo]).trim() : "";
                const ten = r[colTen] ? String(r[colTen]).trim() : "";
                const fullName = `${ho} ${ten}`.trim();
                if (fullName) {
                  const key = `${sName}_${lopVal}`;
                  if (!studentNamesBySchoolClass[key]) studentNamesBySchoolClass[key] = [];
                  if (!studentNamesBySchoolClass[key].includes(fullName)) {
                    studentNamesBySchoolClass[key].push(fullName);
                  }
                }
              }
            }
            schoolToClassesMap[sName] = Array.from(existingSet).sort();
          }
        }
      }
    }
  } catch (err) {
    console.warn("Không thể tải chi tiết lớp học từ Sheet, dùng danh sách dự phòng:", err);
  }
}

function populateSchoolDropdown() {
  const select = document.getElementById("selectSchool");
  if (!select) return;

  select.innerHTML = '<option value="">-- Chọn trường học của bạn --</option>';
  sheetSchools.forEach(school => {
    const opt = document.createElement("option");
    opt.value = school;
    opt.textContent = school;
    select.appendChild(opt);
  });
}

window.onSchoolChanged = function(school) {
  const classSelect = document.getElementById("selectClass");
  const customWrapper = document.getElementById("customClassInputWrapper");
  if (customWrapper) customWrapper.classList.add("hidden");

  if (!classSelect) return;
  classSelect.innerHTML = '<option value="">-- Chọn lớp học --</option>';

  if (!school) {
    classSelect.disabled = true;
    return;
  }
  classSelect.disabled = false;

  const classes = schoolToClassesMap[school] || ["Lớp 6A", "Lớp 6B", "Lớp 7A", "Lớp 7B", "Lớp 8A", "Lớp 8B"];
  classes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    const cleanLabel = c.toLowerCase().startsWith("lớp") ? c : `Lớp ${c}`;
    opt.textContent = cleanLabel;
    classSelect.appendChild(opt);
  });

  // Always add custom option
  const otherOpt = document.createElement("option");
  otherOpt.value = "custom";
  otherOpt.textContent = "+ Nhập lớp khác...";
  classSelect.appendChild(otherOpt);

  updateStudentNamesDatalist();
};

window.onClassChanged = function(cls) {
  const customWrapper = document.getElementById("customClassInputWrapper");
  const customInput = document.getElementById("customClassInput");

  if (cls === "custom") {
    if (customWrapper) customWrapper.classList.remove("hidden");
    if (customInput) customInput.focus();
  } else {
    if (customWrapper) customWrapper.classList.add("hidden");
  }

  updateStudentNamesDatalist();
};

function updateStudentNamesDatalist() {
  const school = document.getElementById("selectSchool").value;
  let cls = document.getElementById("selectClass").value;
  if (cls === "custom") {
    cls = (document.getElementById("customClassInput").value || "").trim();
  }

  const datalist = document.getElementById("studentNamesDatalist");
  if (!datalist) return;
  datalist.innerHTML = "";

  const key = `${school}_${cls}`;
  const names = studentNamesBySchoolClass[key] || [];
  names.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    datalist.appendChild(opt);
  });
}

// ================= TEST CATALOG RENDERING =================
function renderTestsCatalog() {
  const grid = document.getElementById("testsGrid");
  const emptyState = document.getElementById("emptyTestsState");
  if (!grid) return;

  grid.innerHTML = "";

  // Filter tests
  let filtered = allTests.filter(t => {
    // 0. Exclude Hidden Tests
    if (t.hidden === true || t.isHidden === true || t.visible === false) {
      return false;
    }

    // 1. Block Filter
    if (activeBlockFilter !== "all") {
      const blockNum = activeBlockFilter.replace(/\D/g, "");
      const tBlock = (t.blockId || t.level || "").toLowerCase();
      const tTitle = (t.title || t.name || "").toLowerCase();
      const matchBlock = tBlock.includes(activeBlockFilter) || tBlock.includes(blockNum) || tTitle.includes(`khối ${blockNum}`) || tTitle.includes(`k${blockNum}`) || tTitle.includes(`lớp ${blockNum}`);
      if (!matchBlock && t.blockId && t.blockId !== "all") {
        return false;
      }
    }

    // 2. Search Query
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const title = (t.title || t.name || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      if (!title.includes(q) && !desc.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sort: OT 1, 2, 3, 4, 5... -> Bổ sung (BS) -> Tổng hợp (OTTH)
  filtered.sort((a, b) => {
    const titleA = (a.title || a.name || "").toLowerCase();
    const titleB = (b.title || b.name || "").toLowerCase();
    const numA = (titleA.match(/\d+/) || [0])[0];
    const numB = (titleB.match(/\d+/) || [0])[0];
    return parseInt(numA) - parseInt(numB);
  });

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  filtered.forEach(test => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group";

    const qCount = test.questions ? test.questions.length : (test.questionCount || 45);
    const duration = test.duration || 45;
    const title = test.title || test.name || "Bài kiểm tra IC3";
    const blockLabel = test.blockId ? test.blockId.replace("block_", "Khối ") : "Khối học";
    const hasPassword = Boolean(test.password && test.password.trim());

    card.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            ${blockLabel}
          </span>
          ${hasPassword 
            ? `<span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <i class="fa-solid fa-lock text-[10px]"></i> Có mật khẩu
              </span>`
            : `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sẵn sàng
              </span>`
          }
        </div>

        <div>
          <h3 class="font-extrabold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
            ${title}
          </h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2">
            ${test.description || "Bài kiểm tra đánh giá kiến thức tin học chuẩn quốc tế IC3."}
          </p>
        </div>

        <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
          <div class="flex items-center gap-2">
            <i class="fa-regular fa-clock text-blue-500"></i>
            <span><b>${duration}</b> phút</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="fa-regular fa-circle-question text-indigo-500"></i>
            <span><b>${qCount}</b> câu hỏi</span>
          </div>
        </div>
      </div>

      <div class="pt-6">
        <button onclick="openCandidateModal('${test.id}')"
          class="w-full py-3.5 rounded-2xl bg-slate-900 group-hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
          <span>VÀO KIỂM TRA ĐỀ</span>
          <i class="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

window.setBlockFilter = function(block) {
  activeBlockFilter = block;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    if (btn.getAttribute("data-block") === block) {
      btn.className = "filter-btn active shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-md shadow-blue-500/20";
    } else {
      btn.className = "filter-btn shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700";
    }
  });
  renderTestsCatalog();
};

window.onSearchInput = function(query) {
  currentSearchQuery = query;
  renderTestsCatalog();
};

// ================= TOGGLE PASSWORD VISIBILITY =================
window.toggleExamPasswordVisibility = function() {
  const input = document.getElementById("inputExamPassword");
  const icon = document.getElementById("toggleExamPasswordIcon");
  if (!input || !icon) return;

  if (input.type === "password") {
    input.type = "text";
    icon.className = "fa-regular fa-eye-slash text-blue-600";
  } else {
    input.type = "password";
    icon.className = "fa-regular fa-eye text-slate-400";
  }
};

// ================= MODAL: CANDIDATE INFO =================
window.openCandidateModal = function(testId) {
  selectedTest = allTests.find(t => t.id === testId);
  if (!selectedTest) {
    Swal.fire("Lỗi", "Không tìm thấy thông tin đề kiểm tra này!", "error");
    return;
  }

  if (selectedTest.hidden === true || selectedTest.isHidden === true || selectedTest.visible === false) {
    Swal.fire("Thông báo", "Bộ đề thi này hiện đang được giáo viên tạm ẩn!", "warning");
    return;
  }

  const modal = document.getElementById("modal-student-info");
  const modalTitle = document.getElementById("modalTestTitle");
  const modalMeta = document.getElementById("modalTestMeta");

  const qCount = selectedTest.questions ? selectedTest.questions.length : (selectedTest.questionCount || 45);
  const duration = selectedTest.duration || 45;

  if (modalTitle) modalTitle.innerText = selectedTest.title || selectedTest.name || "Bộ đề thi";
  if (modalMeta) modalMeta.innerText = `Thời gian làm bài: ${duration} phút • Số lượng: ${qCount} câu hỏi`;

  // Manage password requirement
  const pwWrapper = document.getElementById("testPasswordWrapper");
  const pwInput = document.getElementById("inputExamPassword");
  const eyeIcon = document.getElementById("toggleExamPasswordIcon");

  if (pwInput) {
    pwInput.value = "";
    pwInput.type = "password";
  }
  if (eyeIcon) {
    eyeIcon.className = "fa-regular fa-eye text-slate-400";
  }

  const hasPassword = Boolean(selectedTest.password && selectedTest.password.trim());
  if (hasPassword) {
    if (pwWrapper) pwWrapper.classList.remove("hidden");
    if (pwInput) pwInput.required = true;
  } else {
    if (pwWrapper) pwWrapper.classList.add("hidden");
    if (pwInput) pwInput.required = false;
  }

  if (modal) modal.classList.remove("hidden");
};

window.closeStudentModal = function() {
  const modal = document.getElementById("modal-student-info");
  if (modal) modal.classList.add("hidden");
};

window.handleStartExamSubmit = function(e) {
  e.preventDefault();

  const school = document.getElementById("selectSchool").value;
  let cls = document.getElementById("selectClass").value;
  if (cls === "custom") {
    cls = (document.getElementById("customClassInput").value || "").trim();
  }
  const name = (document.getElementById("inputStudentName").value || "").trim();

  if (!school) {
    Swal.fire("Chưa chọn trường", "Vui lòng chọn Trường học của bạn!", "warning");
    return;
  }
  if (!cls) {
    Swal.fire("Chưa chọn lớp", "Vui lòng chọn hoặc nhập Lớp học của bạn!", "warning");
    return;
  }
  if (!name) {
    Swal.fire("Chưa nhập họ tên", "Vui lòng nhập Họ và tên của học sinh!", "warning");
    return;
  }

  // Validate test password if configured by teacher
  if (selectedTest && selectedTest.password && selectedTest.password.trim()) {
    const enteredPass = (document.getElementById("inputExamPassword")?.value || "").trim();
    const correctPass = selectedTest.password.trim();
    if (!enteredPass) {
      Swal.fire({
        title: "Chưa nhập mật khẩu!",
        text: "Bộ đề này yêu cầu mật khẩu để vào thi. Vui lòng nhập mật khẩu do giáo viên cung cấp!",
        icon: "warning",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "Đã hiểu"
      });
      return;
    }
    if (enteredPass !== correctPass) {
      Swal.fire({
        title: "Mật khẩu không đúng!",
        text: "Mật khẩu vào bộ đề không chính xác. Vui lòng kiểm tra lại hoặc liên hệ giáo viên để nhận mật khẩu đúng!",
        icon: "error",
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Nhập lại"
      });
      return;
    }
  }

  currentCandidate = {
    school,
    className: cls,
    name
  };

  closeStudentModal();
  startExamSession(selectedTest, currentCandidate);
};

// ================= START LIVE EXAM SESSION =================
function startExamSession(test, candidate) {
  console.log(`🎬 Bắt đầu làm bài kiểm tra: [${test.title}] cho thí sinh: [${candidate.name}] - Lớp: [${candidate.className}] - Trường: [${candidate.school}]`);

  // 1. Gather Questions
  const testQRefs = test.questions || [];
  let matched = allQuestions.filter(q => testQRefs.includes(q.id));

  // If questions not directly matched, take questions belonging to this test
  if (matched.length === 0) {
    matched = allQuestions.filter(q => q.testId === test.id);
  }

  // Fallback: If still empty, pull available questions from the same block
  if (matched.length === 0) {
    matched = allQuestions.slice(0, 45);
  }

  if (matched.length === 0) {
    Swal.fire("Chưa có câu hỏi", "Bộ đề này hiện chưa có câu hỏi nào trong hệ thống!", "error");
    return;
  }

  // Shuffle questions order for fairness
  examQuestions = [...matched];
  for (let i = examQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [examQuestions[i], examQuestions[j]] = [examQuestions[j], examQuestions[i]];
  }

  // Reset exam state
  activeQuestionIndex = 0;
  candidateAnswers = new Array(examQuestions.length).fill("");
  flaggedQuestions.clear();
  isExamSubmitted = false;
  examStartTime = new Date();

  // Set duration
  const durationMins = test.duration || 45;
  examTotalSeconds = durationMins * 60;
  examRemainingSeconds = examTotalSeconds;

  // Switch screens
  document.getElementById("screen-catalog").classList.add("hidden");
  document.getElementById("screen-result").classList.add("hidden");
  document.getElementById("screen-exam").classList.remove("hidden");

  // Setup Live Header UI
  document.getElementById("examLiveTitle").innerText = test.title || test.name || "Bộ đề kiểm tra";
  document.getElementById("examCandidateName").innerText = candidate.name;
  document.getElementById("examCandidateClass").innerText = `Lớp: ${candidate.className}`;
  document.getElementById("examCandidateSchool").innerText = `Trường: ${candidate.school}`;

  // Build matrix grid
  buildQuestionMatrix();

  // Render question 1
  renderActiveQuestion();

  // Start timer
  startExamTimer();
}

// ================= TIMER =================
function startExamTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);

  updateTimerDisplay();

  examTimerInterval = setInterval(() => {
    examRemainingSeconds--;
    updateTimerDisplay();

    if (examRemainingSeconds <= 0) {
      clearInterval(examTimerInterval);
      examRemainingSeconds = 0;
      updateTimerDisplay();

      // Lock interactions so student cannot alter answers after time is up
      const examArea = document.getElementById("screen-exam");
      if (examArea) {
        examArea.style.pointerEvents = "none";
        examArea.style.opacity = "0.75";
      }

      // Close any active modal (confirmations, reviews, etc.)
      if (typeof Swal !== "undefined" && Swal.isVisible()) {
        Swal.close();
      }

      Swal.fire({
        title: "HẾT GIỜ LÀM BÀI!",
        text: "Thời gian làm bài quy định đã kết thúc. Hệ thống đang tự động nộp bài và đồng bộ điểm số...",
        icon: "warning",
        allowOutsideClick: false,
        allowEscapeKey: false,
        timer: 1800,
        showConfirmButton: false
      }).then(() => {
        executeSubmitExam();
      });

      // Failsafe auto-submit in case modal resolution is blocked
      setTimeout(() => {
        if (!isExamSubmitted) {
          executeSubmitExam();
        }
      }, 2200);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(examRemainingSeconds / 60);
  const secs = examRemainingSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const timerEl = document.getElementById("examTimerDisplay");
  const cardEl = document.getElementById("examTimerCard");

  if (timerEl) timerEl.innerText = timeStr;

  if (cardEl) {
    if (examRemainingSeconds <= 300) {
      // Under 5 minutes: Warning red pulse
      cardEl.className = "px-4 py-2 rounded-2xl bg-red-50 border border-red-300 text-red-600 font-mono font-black text-base sm:text-lg flex items-center gap-2 shadow-inner animate-pulse";
    } else if (examRemainingSeconds <= 600) {
      // Under 10 minutes: Warning amber
      cardEl.className = "px-4 py-2 rounded-2xl bg-amber-50 border border-amber-300 text-amber-700 font-mono font-black text-base sm:text-lg flex items-center gap-2 shadow-inner";
    } else {
      cardEl.className = "px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-mono font-black text-base sm:text-lg flex items-center gap-2 shadow-inner";
    }
  }
}

// ================= QUESTION MATRIX =================
function buildQuestionMatrix() {
  const grid = document.getElementById("questionMatrixGrid");
  if (!grid) return;
  grid.innerHTML = "";

  examQuestions.forEach((_, idx) => {
    const btn = document.createElement("button");
    btn.id = `matrix-btn-${idx}`;
    btn.type = "button";
    btn.className = getMatrixButtonClass(idx);
    btn.innerText = idx + 1;
    btn.onclick = () => jumpToQuestion(idx);
    grid.appendChild(btn);
  });

  updateMatrixCounters();
}

function isCandidateAnswerValid(ans) {
  if (ans === "" || ans === undefined || ans === null) return false;
  if (Array.isArray(ans)) {
    return ans.length > 0 && ans.some(v => v !== "" && v !== undefined && v !== null);
  }
  if (typeof ans === "string") {
    if (!ans.trim()) return false;
    try {
      const parsed = JSON.parse(ans);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 && parsed.some(v => v !== "" && v !== undefined && v !== null);
      }
    } catch (e) {}
  }
  return true;
}

function getMatrixButtonClass(idx) {
  const isCurrent = idx === activeQuestionIndex;
  const isFlagged = flaggedQuestions.has(idx);
  const isAnswered = isCandidateAnswerValid(candidateAnswers[idx]);

  let base = "h-9 w-full rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ";

  if (isCurrent) {
    base += "ring-2 ring-offset-2 ring-blue-600 scale-105 z-10 ";
  }

  if (isFlagged) {
    return base + "bg-amber-500 text-white shadow-sm";
  } else if (isAnswered) {
    return base + "bg-blue-600 text-white shadow-sm";
  } else {
    return base + "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200";
  }
}

function updateMatrixCounters() {
  const answeredCount = candidateAnswers.filter(isCandidateAnswerValid).length;
  const total = examQuestions.length;
  const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const badge = document.getElementById("matrixAnsweredBadge");
  const progressCount = document.getElementById("examProgressCount");
  const progressBar = document.getElementById("examProgressBar");

  if (badge) badge.innerText = `${answeredCount} / ${total} đã làm`;
  if (progressCount) progressCount.innerText = `${answeredCount} / ${total} câu (${percent}%)`;
  if (progressBar) progressBar.style.width = `${percent}%`;

  // Update matrix button styling
  examQuestions.forEach((_, idx) => {
    const btn = document.getElementById(`matrix-btn-${idx}`);
    if (btn) btn.className = getMatrixButtonClass(idx);
  });
}

// ================= RENDER QUESTION =================
function renderActiveQuestion() {
  const q = examQuestions[activeQuestionIndex];
  if (!q) return;

  // Question number badge
  const numBadge = document.getElementById("badgeQuestionNumber");
  if (numBadge) {
    numBadge.innerHTML = `<i class="fa-solid fa-file-lines text-[10px]"></i> <span>Câu ${activeQuestionIndex + 1} / ${examQuestions.length}</span>`;
  }

  // Type badge with icon and clear descriptive label
  const typeBadge = document.getElementById("badgeQuestionType");
  const type = q.type || "choice";
  const typeMeta = {
    choice: { label: "Trắc nghiệm 1 đáp án", icon: "fa-regular fa-circle-dot" },
    multiple_choice: { label: "Trắc nghiệm 1 đáp án", icon: "fa-regular fa-circle-dot" },
    multi_choice: { label: "Chọn nhiều đáp án đúng", icon: "fa-solid fa-list-check" },
    true_false: { label: "Đúng / Sai", icon: "fa-solid fa-scale-balanced" },
    table_match: { label: "Nối bảng (Đúng / Sai)", icon: "fa-solid fa-table-cells" },
    drag_text: { label: "Ghép nối định nghĩa", icon: "fa-solid fa-arrow-right-arrow-left" },
    drag_image_text: { label: "Ghép hình ảnh & từ khóa", icon: "fa-solid fa-images" },
    image_choice: { label: "Chọn hình ảnh phù hợp", icon: "fa-regular fa-image" },
    fill_blank: { label: "Điền từ vào chỗ trống", icon: "fa-solid fa-pen-nib" },
    fill_in_the_blank: { label: "Điền từ vào chỗ trống", icon: "fa-solid fa-pen-nib" },
    hotspot: { label: "Nhấp vị trí trên ảnh (Hotspot)", icon: "fa-solid fa-bullseye" }
  };
  const currentMeta = typeMeta[type] || { label: "Trắc nghiệm", icon: "fa-solid fa-circle-question" };
  if (typeBadge) {
    typeBadge.innerHTML = `<i class="${currentMeta.icon} text-[10px] text-blue-600"></i> <span>${currentMeta.label}</span>`;
  }

  // Instruction Hint
  const hintEl = document.getElementById("questionInstructionHint");
  const countBadge = document.getElementById("questionSelectedCountBadge");
  if (countBadge) countBadge.classList.add("hidden");

  if (hintEl) {
    if (type === "multi_choice") {
      hintEl.innerText = "Lưu ý: Câu hỏi có nhiều đáp án đúng, hãy nhấp chọn tất cả phương án phù hợp:";
    } else if (type === "table_match") {
      hintEl.innerText = "Đối với mỗi dòng, hãy lựa chọn phương án Đúng / Sai hoặc đáp án tương ứng:";
    } else if (type === "drag_text") {
      hintEl.innerText = "Nhấp vào thẻ từ bên dưới để điền vào ô trống (nhấp vào ô đã điền để gỡ bỏ):";
    } else if (type === "drag_image_text") {
      hintEl.innerText = "Nhấp vào thẻ tên bên dưới để ghép vào hình ảnh tương ứng:";
    } else if (type === "hotspot") {
      hintEl.innerText = `Nhấp chuột vào đúng ${q.requiredCount || 1} vị trí trên hình ảnh:`;
    } else if (type === "fill_blank" || type === "fill_in_the_blank") {
      hintEl.innerText = "Nhập câu trả lời chính xác vào ô bên dưới:";
    } else if (type === "image_choice") {
      hintEl.innerText = "Quan sát các hình ảnh và nhấp chọn hình ảnh phù hợp nhất:";
    } else {
      hintEl.innerText = "Vui lòng lựa chọn 1 phương án trả lời đúng nhất:";
    }
  }

  // Flag button state
  const isFlagged = flaggedQuestions.has(activeQuestionIndex);
  const flagBtn = document.getElementById("btnFlagQuestion");
  const flagText = document.getElementById("btnFlagText");
  if (flagBtn) {
    if (isFlagged) {
      flagBtn.className = "px-3.5 py-1.5 rounded-xl border border-amber-500 bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm";
      if (flagText) flagText.innerText = "Đã đánh dấu xem lại";
    } else {
      flagBtn.className = "px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer";
      if (flagText) flagText.innerText = "Đánh dấu xem lại";
    }
  }

  // Question body text
  const bodyText = document.getElementById("questionBodyText");
  if (bodyText) {
    bodyText.innerHTML = formatItemText(q.question);
  }

  // Question Image Attachment
  const imgWrapper = document.getElementById("questionImageWrapper");
  const imgEl = document.getElementById("questionImageEl");
  const mainImgUrl = q.image || q.imageUrl;
  if (mainImgUrl && type !== "hotspot") {
    imgEl.src = convertDriveUrl(mainImgUrl);
    imgWrapper.classList.remove("hidden");
  } else {
    imgWrapper.classList.add("hidden");
    imgEl.src = "";
  }

  // Render Option cards based on type
  renderQuestionOptions(q);

  // Prev / Next button state
  const prevBtn = document.getElementById("btnPrevQuestion");
  const nextBtn = document.getElementById("btnNextQuestion");
  if (prevBtn) prevBtn.disabled = activeQuestionIndex === 0;
  if (nextBtn) {
    if (activeQuestionIndex === examQuestions.length - 1) {
      nextBtn.innerHTML = '<span>Nộp bài thi</span> <i class="fa-solid fa-flag-checkered"></i>';
      nextBtn.className = "px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer";
    } else {
      nextBtn.innerHTML = '<span>Câu tiếp theo</span> <i class="fa-solid fa-chevron-right"></i>';
      nextBtn.className = "px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer";
    }
  }

  updateMatrixCounters();
}

function renderQuestionOptions(q) {
  const container = document.getElementById("questionOptionsList");
  if (!container) return;
  container.innerHTML = "";

  const type = q.type || "choice";
  const savedAnswer = candidateAnswers[activeQuestionIndex];
  const prefixes = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // ================= 1. SINGLE CHOICE & TRUE/FALSE =================
  if (type === "choice" || type === "true_false" || type === "multiple_choice") {
    const options = q.options || (type === "true_false" ? ["Đúng", "Sai"] : []);

    options.forEach((opt, idx) => {
      const optText = formatItemText(opt);
      const isSelected = savedAnswer !== "" && savedAnswer !== undefined && (
        String(savedAnswer) === String(idx) ||
        savedAnswer === optText
      );

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `option-card w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center justify-between shadow-sm cursor-pointer ${
        isSelected
          ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20"
          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-800 bg-white"
      }`;

      btn.innerHTML = `
        <div class="flex items-center gap-3.5 pr-4 flex-grow">
          <span class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          }">${prefixes[idx] || (idx + 1)}</span>
          <span class="leading-relaxed break-words">${optText}</span>
        </div>
        <div class="shrink-0">
          <i class="${isSelected ? "fa-solid fa-circle-dot text-blue-600 text-lg" : "fa-regular fa-circle text-slate-300 text-lg"}"></i>
        </div>
      `;

      btn.onclick = () => {
        candidateAnswers[activeQuestionIndex] = idx;
        renderActiveQuestion();
      };

      container.appendChild(btn);
    });

  // ================= 2. MULTI CHOICE (CHỌN NHIỀU ĐÁP ÁN) =================
  } else if (type === "multi_choice") {
    const options = q.options || [];
    let selectedArr = [];
    try {
      selectedArr = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? JSON.parse(savedAnswer) : []);
    } catch (e) {
      selectedArr = [];
    }
    if (!Array.isArray(selectedArr)) selectedArr = [];

    // Update count badge
    const countBadge = document.getElementById("questionSelectedCountBadge");
    if (countBadge) {
      countBadge.innerText = `Đã chọn: ${selectedArr.length} đáp án`;
      countBadge.classList.remove("hidden");
    }

    options.forEach((opt, idx) => {
      const optText = formatItemText(opt);
      const isSelected = selectedArr.includes(idx) || selectedArr.includes(String(idx)) || selectedArr.includes(optText);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `option-card w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base flex items-center justify-between shadow-sm cursor-pointer ${
        isSelected
          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800 bg-white"
      }`;

      btn.innerHTML = `
        <div class="flex items-center gap-3.5 pr-4 flex-grow">
          <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
          }">
            ${isSelected ? '<i class="fa-solid fa-check text-xs"></i>' : ""}
          </div>
          <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
            isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
          }">${prefixes[idx] || (idx + 1)}</span>
          <span class="leading-relaxed break-words">${optText}</span>
        </div>
        <div class="shrink-0 text-xs font-bold ${isSelected ? "text-indigo-600" : "text-slate-400"}">
          ${isSelected ? "Đã chọn" : "Nhấp để chọn"}
        </div>
      `;

      btn.onclick = () => {
        let current = [];
        try {
          const raw = candidateAnswers[activeQuestionIndex];
          current = Array.isArray(raw) ? [...raw] : (raw ? JSON.parse(raw) : []);
        } catch (e) {
          current = [];
        }
        if (!Array.isArray(current)) current = [];

        const existingIdx = current.findIndex(x => x === idx || String(x) === String(idx));
        if (existingIdx !== -1) {
          current.splice(existingIdx, 1);
        } else {
          current.push(idx);
        }

        candidateAnswers[activeQuestionIndex] = current;
        renderActiveQuestion();
      };

      container.appendChild(btn);
    });

  // ================= 3. TABLE MATCH (NỐI BẢNG / ĐÚNG - SAI) =================
  } else if (type === "table_match") {
    const rows = q.rows || [];
    const options = q.options || ["Đúng", "Sai"];
    
    let savedRows = [];
    try {
      savedRows = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? JSON.parse(savedAnswer) : []);
    } catch (e) {
      savedRows = [];
    }
    if (!Array.isArray(savedRows)) savedRows = new Array(rows.length).fill("");

    const tableCard = document.createElement("div");
    tableCard.className = "w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm";

    // Check if 2 options (like Đúng / Sai) -> Render radio matrix buttons!
    if (options.length === 2) {
      let html = `
        <div class="hidden sm:grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div class="col-span-8">Nội dung tuyên bố / Khái niệm</div>
          <div class="col-span-2 text-center">${formatItemText(options[0])}</div>
          <div class="col-span-2 text-center">${formatItemText(options[1])}</div>
        </div>
        <div class="divide-y divide-slate-100">
      `;

      rows.forEach((row, rIdx) => {
        const rowText = formatItemText(row);
        const curVal = savedRows[rIdx];
        const isOpt0 = curVal !== undefined && curVal !== "" && (parseInt(curVal) === 0 || String(curVal) === "0" || curVal === options[0]);
        const isOpt1 = curVal !== undefined && curVal !== "" && (parseInt(curVal) === 1 || String(curVal) === "1" || curVal === options[1]);

        html += `
          <div class="p-4 sm:p-4.5 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-2 items-start sm:items-center hover:bg-slate-50/50 transition-colors">
            <div class="sm:col-span-8 text-sm font-semibold text-slate-800 leading-relaxed pr-2">
              <span class="inline-flex w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs items-center justify-center mr-2">${rIdx + 1}</span>
              ${rowText}
            </div>
            
            <div class="sm:col-span-2 w-full flex justify-center">
              <button type="button" onclick="setTableMatchRow(${rIdx}, 0)"
                class="w-full sm:w-24 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isOpt0
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }">
                <i class="${isOpt0 ? "fa-solid fa-circle-check" : "fa-regular fa-circle text-slate-400"}"></i>
                <span>${formatItemText(options[0])}</span>
              </button>
            </div>

            <div class="sm:col-span-2 w-full flex justify-center">
              <button type="button" onclick="setTableMatchRow(${rIdx}, 1)"
                class="w-full sm:w-24 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isOpt1
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }">
                <i class="${isOpt1 ? "fa-solid fa-circle-check" : "fa-regular fa-circle text-slate-400"}"></i>
                <span>${formatItemText(options[1])}</span>
              </button>
            </div>
          </div>
        `;
      });

      html += `</div>`;
      tableCard.innerHTML = html;

    } else {
      // More than 2 options: dropdown format
      let html = `
        <div class="bg-slate-50 border-b border-slate-200 p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
          <span>Nội dung / Khái niệm</span>
          <span class="w-56 text-right">Lựa chọn ghép nối</span>
        </div>
        <div class="divide-y divide-slate-100">
      `;

      rows.forEach((row, rIdx) => {
        const rowText = formatItemText(row);
        const curVal = savedRows[rIdx];

        html += `
          <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
            <div class="text-sm font-semibold text-slate-800 leading-relaxed pr-4">
              <span class="inline-flex w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs items-center justify-center mr-2">${rIdx + 1}</span>
              ${rowText}
            </div>
            <div class="w-full sm:w-60 shrink-0">
              <select onchange="setTableMatchRow(${rIdx}, this.value)"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white cursor-pointer">
                <option value="">-- Chọn đáp án --</option>
                ${options.map((opt, oIdx) => {
                  const optT = formatItemText(opt);
                  const isSel = curVal !== undefined && curVal !== "" && (parseInt(curVal) === oIdx || String(curVal) === String(oIdx) || curVal === optT);
                  return `<option value="${oIdx}" ${isSel ? "selected" : ""}>${optT}</option>`;
                }).join("")}
              </select>
            </div>
          </div>
        `;
      });

      html += `</div>`;
      tableCard.innerHTML = html;
    }

    container.appendChild(tableCard);

  // ================= 4. DRAG TEXT (GHÉP THẺ TỪ KHÓA) =================
  } else if (type === "drag_text") {
    const rows = q.rows || [];
    const options = (q.options || []).map(formatItemText);

    let placedAnswers = [];
    try {
      placedAnswers = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? JSON.parse(savedAnswer) : []);
    } catch (e) {
      placedAnswers = [];
    }
    if (!Array.isArray(placedAnswers)) placedAnswers = new Array(rows.length).fill("");
    while (placedAnswers.length < rows.length) placedAnswers.push("");

    window._activeDragAnswers = placedAnswers;
    window._activeDragOptions = options;

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-4 w-full";

    // 1. Target Slots List
    let slotsHtml = `<div class="space-y-3">`;
    rows.forEach((row, rIdx) => {
      const rowText = formatItemText(row);
      const placed = formatItemText(placedAnswers[rIdx]);

      slotsHtml += `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 gap-3 shadow-sm">
          <div class="text-sm font-semibold text-slate-800 flex-1 break-words leading-relaxed pr-3">
            <span class="inline-flex w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs items-center justify-center mr-2">${rIdx + 1}</span>
            ${rowText}
          </div>
          <div class="shrink-0 w-full sm:w-64">
            <div onclick="clearDragTextSlot(${rIdx})"
              class="w-full min-h-[46px] rounded-xl p-2.5 flex items-center justify-center text-center text-xs font-bold transition-all cursor-pointer ${
                placed
                  ? "border-2 border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                  : "border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500"
              }">
              ${placed ? `<span>${placed}</span> <i class="fa-solid fa-xmark ml-2 text-slate-400 hover:text-red-500"></i>` : "Nhấp chọn từ bên dưới..."}
            </div>
          </div>
        </div>
      `;
    });
    slotsHtml += `</div>`;

    // 2. Chip Pool
    let poolHtml = `
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mt-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            <i class="fa-solid fa-cube mr-1 text-blue-600"></i> Thẻ từ khóa có sẵn (nhấp để chọn):
          </span>
          <button type="button" onclick="resetAllDragText()" class="text-[11px] font-bold text-red-500 hover:underline">
            <i class="fa-solid fa-rotate-left mr-1"></i> Xóa ghép nối
          </button>
        </div>
        <div class="flex flex-wrap gap-2.5 pt-1">
    `;

    options.forEach((optText, oIdx) => {
      const isUsed = placedAnswers.map(formatItemText).includes(optText);
      poolHtml += `
        <button type="button" onclick="placeDragTextChip('${oIdx}')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isUsed
              ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-40 pointer-events-none"
              : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer"
          }">
          ${optText}
        </button>
      `;
    });

    poolHtml += `
        </div>
      </div>
    `;

    wrapper.innerHTML = slotsHtml + poolHtml;
    container.appendChild(wrapper);

  // ================= 5. DRAG IMAGE TEXT (GHÉP ẢNH VÀ TỪ) =================
  } else if (type === "drag_image_text") {
    const images = q.leftImages || [];
    const options = (q.options || []).map(formatItemText);

    let placedAnswers = [];
    try {
      placedAnswers = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? JSON.parse(savedAnswer) : []);
    } catch (e) {
      placedAnswers = [];
    }
    if (!Array.isArray(placedAnswers)) placedAnswers = new Array(images.length).fill("");
    while (placedAnswers.length < images.length) placedAnswers.push("");

    window._activeDragAnswers = placedAnswers;
    window._activeDragOptions = options;

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-4 w-full";

    let gridHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
    images.forEach((imgUrl, idx) => {
      const placed = formatItemText(placedAnswers[idx]);
      gridHtml += `
        <div class="flex items-center p-3.5 rounded-2xl bg-white border border-slate-200 gap-3.5 shadow-sm">
          <img src="${convertDriveUrl(imgUrl)}" class="w-16 h-16 object-contain rounded-xl bg-slate-50 p-1 border border-slate-100 shrink-0" alt="Ảnh">
          <div class="flex-grow">
            <div onclick="clearDragTextSlot(${idx})"
              class="w-full min-h-[44px] rounded-xl p-2 flex items-center justify-center text-center text-xs font-bold transition-all cursor-pointer ${
                placed
                  ? "border-2 border-blue-600 bg-blue-50 text-blue-900"
                  : "border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 text-blue-500"
              }">
              ${placed ? `<span>${placed}</span> <i class="fa-solid fa-xmark ml-2 text-slate-400"></i>` : "Nhấp chọn từ..."}
            </div>
          </div>
        </div>
      `;
    });
    gridHtml += `</div>`;

    let poolHtml = `
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mt-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Thẻ tên gọi phù hợp (nhấp để chọn):</span>
          <button type="button" onclick="resetAllDragText()" class="text-[11px] font-bold text-red-500 hover:underline">Xóa tất cả</button>
        </div>
        <div class="flex flex-wrap gap-2.5 pt-1">
    `;

    options.forEach((optText, oIdx) => {
      const isUsed = placedAnswers.map(formatItemText).includes(optText);
      poolHtml += `
        <button type="button" onclick="placeDragTextChip('${oIdx}')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isUsed
              ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-40 pointer-events-none"
              : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer"
          }">
          ${optText}
        </button>
      `;
    });
    poolHtml += `</div></div>`;

    wrapper.innerHTML = gridHtml + poolHtml;
    container.appendChild(wrapper);

  // ================= 6. IMAGE CHOICE (LỰA CHỌN HÌNH ẢNH) =================
  } else if (type === "image_choice") {
    const options = q.options || [];
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 sm:grid-cols-3 gap-4 w-full";

    options.forEach((imgUrl, idx) => {
      const isSelected = savedAnswer !== "" && savedAnswer !== undefined && (parseInt(savedAnswer) === idx || String(savedAnswer) === String(idx));

      const card = document.createElement("div");
      card.className = `option-card relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all bg-white shadow-sm ${
        isSelected
          ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20"
          : "border-slate-200 hover:border-blue-300"
      }`;

      card.innerHTML = `
        <div class="relative w-full h-32 flex items-center justify-center mb-2.5 bg-slate-50 rounded-xl overflow-hidden p-2">
          <img src="${convertDriveUrl(imgUrl)}" class="max-h-full max-w-full object-contain" alt="Hình ảnh lựa chọn ${idx + 1}" />
        </div>
        <span class="text-xs font-bold ${isSelected ? "text-blue-700" : "text-slate-600"}">Lựa chọn ${prefixes[idx] || (idx + 1)}</span>
        <div class="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
          isSelected ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-transparent"
        }">
          <i class="fa-solid fa-check"></i>
        </div>
      `;

      card.onclick = () => {
        candidateAnswers[activeQuestionIndex] = idx;
        renderActiveQuestion();
      };

      grid.appendChild(card);
    });

    container.appendChild(grid);

  // ================= 7. FILL IN THE BLANK =================
  } else if (type === "fill_blank" || type === "fill_in_the_blank") {
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3";
    inputWrapper.innerHTML = `
      <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        <i class="fa-solid fa-keyboard mr-1.5 text-blue-600"></i> Nhập câu trả lời của bạn:
      </label>
      <input type="text" id="fillBlankInput" value="${savedAnswer || ""}" placeholder="Gõ câu trả lời vào đây..."
        class="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-5 py-4 text-sm sm:text-base font-bold text-slate-800 transition-all outline-none" />
      <p class="text-[11px] text-slate-400">Gõ đầy đủ đáp án theo yêu cầu của đề bài.</p>
    `;

    container.appendChild(inputWrapper);

    const input = document.getElementById("fillBlankInput");
    if (input) {
      input.focus();
      input.oninput = (e) => {
        candidateAnswers[activeQuestionIndex] = e.target.value.trim();
        updateMatrixCounters();
      };
    }

  // ================= 8. HOTSPOT (NHẤP VỊ TRÍ ẢNH) =================
  } else if (type === "hotspot") {
    let clicks = [];
    try {
      clicks = Array.isArray(savedAnswer) ? savedAnswer : (savedAnswer ? JSON.parse(savedAnswer) : []);
    } catch (e) {
      clicks = [];
    }
    if (!Array.isArray(clicks)) clicks = [];

    const reqCount = q.requiredCount || 1;

    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-3 w-full";
    wrapper.innerHTML = `
      <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
        <span class="text-slate-600 font-semibold">
          Đã chọn: <b class="text-blue-600">${clicks.length}/${reqCount}</b> vị trí trên hình ảnh
        </span>
        <button type="button" onclick="clearHotspotClicks()" class="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa hết vị trí
        </button>
      </div>
      <div id="student-hotspot-container" class="relative inline-block border border-slate-200 rounded-2xl bg-slate-100 max-w-full overflow-hidden self-center shadow-sm">
        <img id="student-hotspot-img" src="${convertDriveUrl(q.imageUrl || q.image)}" class="max-w-full block select-none" draggable="false" alt="Hotspot">
        <div id="student-hotspot-overlay" class="absolute inset-0"></div>
      </div>
    `;

    container.appendChild(wrapper);

    setTimeout(() => {
      const overlay = document.getElementById("student-hotspot-overlay");
      if (!overlay) return;

      const drawClicks = () => {
        overlay.innerHTML = "";
        let currentClicks = [];
        try {
          const raw = candidateAnswers[activeQuestionIndex];
          currentClicks = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
        } catch (e) {
          currentClicks = [];
        }
        if (!Array.isArray(currentClicks)) currentClicks = [];

        currentClicks.forEach((click, i) => {
          const marker = document.createElement("div");
          marker.className = "absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md z-10 cursor-pointer animate-in zoom-in-50 duration-150";
          marker.style.left = `${click.x}%`;
          marker.style.top = `${click.y}%`;
          marker.innerText = i + 1;
          overlay.appendChild(marker);
        });
      };

      overlay.onclick = (e) => {
        const rect = overlay.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

        let cur = [];
        try {
          const raw = candidateAnswers[activeQuestionIndex];
          cur = Array.isArray(raw) ? [...raw] : (raw ? JSON.parse(raw) : []);
        } catch (e) {
          cur = [];
        }
        if (!Array.isArray(cur)) cur = [];

        if (cur.length < reqCount) {
          cur.push({ x, y });
        } else {
          cur.shift();
          cur.push({ x, y });
        }

        candidateAnswers[activeQuestionIndex] = cur;
        drawClicks();
        updateMatrixCounters();
      };

      drawClicks();
    }, 50);

  // ================= FALLBACK =================
  } else {
    (q.options || []).forEach((opt, idx) => {
      const optText = formatItemText(opt);
      const isSelected = String(savedAnswer) === String(idx);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `option-card w-full p-4 rounded-2xl border text-left font-semibold text-sm ${isSelected ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white"}`;
      btn.innerText = optText;
      btn.onclick = () => {
        candidateAnswers[activeQuestionIndex] = idx;
        renderActiveQuestion();
      };
      container.appendChild(btn);
    });
  }
}

// ================= INTERACTIVE HELPER FUNCTIONS =================
window.setTableMatchRow = function(rowIdx, optVal) {
  let cur = [];
  try {
    const raw = candidateAnswers[activeQuestionIndex];
    cur = Array.isArray(raw) ? [...raw] : (raw ? JSON.parse(raw) : []);
  } catch (e) {
    cur = [];
  }
  const q = examQuestions[activeQuestionIndex];
  const rowCount = q && q.rows ? q.rows.length : 1;
  while (cur.length < rowCount) cur.push("");

  cur[rowIdx] = optVal;
  candidateAnswers[activeQuestionIndex] = cur;
  renderActiveQuestion();
};

window.placeDragTextChip = function(oIdx) {
  const q = examQuestions[activeQuestionIndex];
  if (!q) return;

  let currentPlaced = window._activeDragAnswers || [];
  const options = window._activeDragOptions || [];
  const textToPlace = options[parseInt(oIdx)];
  if (!textToPlace) return;

  const emptyIdx = currentPlaced.findIndex(ans => !ans);
  if (emptyIdx === -1) {
    Swal.fire({
      title: "Vị trí đã đầy",
      text: "Tất cả các vị trí đã có thẻ từ. Hãy nhấp vào một ô trên nếu muốn gỡ bỏ để thay thế!",
      icon: "info",
      timer: 2000,
      showConfirmButton: false
    });
    return;
  }

  currentPlaced[emptyIdx] = textToPlace;
  candidateAnswers[activeQuestionIndex] = currentPlaced;
  renderActiveQuestion();
};

window.clearDragTextSlot = function(slotIdx) {
  let currentPlaced = window._activeDragAnswers || [];
  if (currentPlaced[slotIdx]) {
    currentPlaced[slotIdx] = "";
    candidateAnswers[activeQuestionIndex] = currentPlaced;
    renderActiveQuestion();
  }
};

window.resetAllDragText = function() {
  const q = examQuestions[activeQuestionIndex];
  const count = (q.rows || q.leftImages || []).length;
  candidateAnswers[activeQuestionIndex] = new Array(count).fill("");
  renderActiveQuestion();
};

window.clearHotspotClicks = function() {
  candidateAnswers[activeQuestionIndex] = [];
  renderActiveQuestion();
};

// ================= EXAM NAVIGATION =================
window.jumpToQuestion = function(idx) {
  if (idx >= 0 && idx < examQuestions.length) {
    activeQuestionIndex = idx;
    renderActiveQuestion();
  }
};

window.goToPreviousQuestion = function() {
  if (activeQuestionIndex > 0) {
    activeQuestionIndex--;
    renderActiveQuestion();
  }
};

window.goToNextQuestion = function() {
  if (activeQuestionIndex < examQuestions.length - 1) {
    activeQuestionIndex++;
    renderActiveQuestion();
  } else {
    confirmSubmitExam();
  }
};

window.toggleFlagCurrentQuestion = function() {
  if (flaggedQuestions.has(activeQuestionIndex)) {
    flaggedQuestions.delete(activeQuestionIndex);
  } else {
    flaggedQuestions.add(activeQuestionIndex);
  }
  renderActiveQuestion();
};

window.openImageModal = function(src) {
  Swal.fire({
    imageUrl: src,
    imageAlt: "Hình ảnh câu hỏi",
    showCloseButton: true,
    showConfirmButton: false,
    width: "80%"
  });
};

window.promptExitExam = function() {
  Swal.fire({
    title: "Thoát khỏi bài thi?",
    text: "Nếu bạn thoát bây giờ, bài làm sẽ bị hủy và điểm số sẽ không được lưu!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Đồng ý thoát",
    cancelButtonText: "Tiếp tục làm bài"
  }).then((res) => {
    if (res.isConfirmed) {
      if (examTimerInterval) clearInterval(examTimerInterval);
      backToTestCatalog();
    }
  });
};

// ================= CONFIRM & SUBMIT EXAM =================
window.confirmSubmitExam = function() {
  const unansweredCount = candidateAnswers.filter(a => a === "" || a === undefined || a === null).length;
  const flaggedCount = flaggedQuestions.size;

  let msg = `<p class="text-sm text-slate-600">Bạn đã hoàn thành <b>${examQuestions.length - unansweredCount}/${examQuestions.length}</b> câu hỏi.</p>`;
  if (unansweredCount > 0) {
    msg += `<p class="text-xs text-red-500 font-bold mt-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Bạn vẫn còn <b>${unansweredCount}</b> câu hỏi chưa trả lời!</p>`;
  }
  if (flaggedCount > 0) {
    msg += `<p class="text-xs text-amber-600 font-semibold mt-1"><i class="fa-solid fa-flag mr-1"></i> Có <b>${flaggedCount}</b> câu bạn đang đánh dấu xem lại.</p>`;
  }

  Swal.fire({
    title: "Nộp bài kiểm tra?",
    html: msg,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Xác nhận nộp bài",
    cancelButtonText: "Xem lại bài"
  }).then((res) => {
    if (res.isConfirmed) {
      executeSubmitExam();
    }
  });
};

// ================= CORE GRADING & GOOGLE SHEET SYNC =================
async function executeSubmitExam() {
  if (isExamSubmitted) return;
  isExamSubmitted = true;
  if (examTimerInterval) clearInterval(examTimerInterval);

  const examArea = document.getElementById("screen-exam");
  if (examArea) {
    examArea.style.pointerEvents = "auto";
    examArea.style.opacity = "1";
  }

  Swal.fire({
    title: "Đang chấm điểm & nạp Google Sheet...",
    text: "Hệ thống đang tự động tính điểm và fill dữ liệu vào Google Sheet của trường, vui lòng đợi giây lát!",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // 1. Calculate Score & Rank (Thang điểm 10 & Phân loại)
  let correctCount = 0;

  examQuestions.forEach((q, idx) => {
    const studentAns = candidateAnswers[idx];
    if (checkAnswerIsCorrect(q, studentAns)) {
      correctCount++;
    }
  });

  const totalQuestions = examQuestions.length;
  // Tính theo thang điểm 10 và phân loại: 41/45 là loại giỏi, 1 nửa câu tới 41 là loại khá
  const rankInfo = calculateExamRank(correctCount, totalQuestions);
  const score10 = rankInfo.score10;
  const scorePercent = rankInfo.scorePercent;

  // Time spent
  const secondsSpent = examTotalSeconds - examRemainingSeconds;
  const mins = Math.floor(secondsSpent / 60);
  const secs = secondsSpent % 60;
  const timeSpentText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const testTitle = selectedTest.title || selectedTest.name || "Bài kiểm tra";

  // 2. Save Score to Shared Firestore Database (collection: scores)
  const scoreDocId = `${currentCandidate.name.replace(/\s+/g, "_")}_${selectedTest.id}_${Date.now()}`;
  const scoreRecord = {
    id: scoreDocId,
    testId: selectedTest.id,
    testTitle: testTitle,
    studentName: currentCandidate.name,
    studentEmail: `${currentCandidate.name.toLowerCase().replace(/\s+/g, "")}@sheet.edu`,
    className: currentCandidate.className,
    classId: currentCandidate.className,
    school: currentCandidate.school,
    score: score10, // Lưu theo hệ 10
    score10: score10,
    scorePercent: scorePercent,
    correctCount: correctCount,
    totalCount: totalQuestions,
    rank: rankInfo.rankName,
    sheetGrade: rankInfo.sheetGrade,
    timeSpent: timeSpentText,
    userAnswers: [...candidateAnswers],
    completedAt: new Date().toISOString(),
    portal: "kiemtra"
  };

  try {
    const allScores = window.IC3_CACHE[window.IC3_KEYS ? window.IC3_KEYS.SCORES : "scores"] || [];
    allScores.push(scoreRecord);
    if (typeof window.saveData === "function") {
      await window.saveData(window.IC3_KEYS ? window.IC3_KEYS.SCORES : "scores", allScores, scoreDocId);
    }
  } catch (dbErr) {
    console.warn("Lỗi lưu điểm vào Firestore (sẽ tiếp tục sync Google Sheet):", dbErr);
  }

  // 3. CRITICAL: SYNC TO GOOGLE SHEET (Tự fill điểm và fill tên lớp)
  let sheetSyncResult = { success: false, message: "Chưa nạp Sheet" };

  try {
    if (typeof window.syncExamResultToGoogleSheet === "function") {
      sheetSyncResult = await window.syncExamResultToGoogleSheet({
        studentName: currentCandidate.name,
        className: currentCandidate.className, // Fill tên lớp
        school: currentCandidate.school,
        testTitle: testTitle,
        score: score10, // Thang điểm 10
        score10: score10,
        scorePercent: scorePercent,
        correctCount: correctCount, // Fill điểm (số câu đúng vào cột bài test)
        totalCount: totalQuestions,
        rank: rankInfo.rankName,
        timeSpent: timeSpentText
      });
    }
  } catch (sheetErr) {
    console.error("Lỗi sync Google Sheet:", sheetErr);
    sheetSyncResult = { success: false, error: sheetErr.message };
  }

  Swal.close();

  // 4. Show Confetti & Results Screen
  lastExamResult = {
    testTitle,
    score10,
    scorePercent,
    correctCount,
    totalQuestions,
    timeSpentText,
    rank: rankInfo,
    sheetSyncResult
  };

  showExamResultsScreen(lastExamResult);
}

function checkAnswerIsCorrect(q, studentAns) {
  if (studentAns === undefined || studentAns === null || studentAns === "") return false;
  const type = q.type || "choice";

  // 1. Single Choice & Image Choice
  if (type === "choice" || type === "image_choice") {
    const userIdx = parseInt(studentAns);
    if (!isNaN(userIdx)) {
      if (q.correctIndex !== undefined && userIdx === parseInt(q.correctIndex)) return true;
      if (q.options && q.options[userIdx] !== undefined && q.options[userIdx] === q.answer) return true;
    }
    if (typeof studentAns === "string" && q.answer !== undefined) {
      return studentAns.trim().toLowerCase() === (q.answer || "").toString().trim().toLowerCase();
    }
    return false;

  // 2. True / False
  } else if (type === "true_false") {
    const userIdx = parseInt(studentAns);
    if (!isNaN(userIdx)) {
      if (q.correctIndex !== undefined && userIdx === parseInt(q.correctIndex)) return true;
      if (q.options && q.options[userIdx] !== undefined) {
        if (q.options[userIdx] === q.answer) return true;
        if (q.answer === "Đúng" && userIdx === 0) return true;
        if (q.answer === "Sai" && userIdx === 1) return true;
      }
      if (q.answer === "Đúng" || q.answer === "True" || q.answer === "0") return userIdx === 0;
      if (q.answer === "Sai" || q.answer === "False" || q.answer === "1") return userIdx === 1;
    }
    if (typeof studentAns === "string") {
      const uStr = studentAns.trim().toLowerCase();
      const aStr = (q.answer || "").toString().trim().toLowerCase();
      if (uStr === aStr) return true;
      if ((uStr === "0" || uStr === "đúng" || uStr === "true") && (aStr === "đúng" || aStr === "true" || aStr === "0")) return true;
      if ((uStr === "1" || uStr === "sai" || uStr === "false") && (aStr === "sai" || aStr === "false" || aStr === "1")) return true;
    }
    return false;

  // 3. Multiple Choice (single answer with startsWith or index)
  } else if (type === "multiple_choice") {
    if (q.answer !== undefined && (studentAns === q.answer || (typeof q.answer === "string" && (q.answer.startsWith(studentAns) || studentAns.startsWith(q.answer))))) return true;
    const userIdx = parseInt(studentAns);
    if (!isNaN(userIdx)) {
      if (q.correctIndex !== undefined && userIdx === parseInt(q.correctIndex)) return true;
      if (q.options && q.options[userIdx] !== undefined) {
        const optText = q.options[userIdx];
        if (optText === q.answer || optText.startsWith(q.answer) || (typeof q.answer === "string" && q.answer.startsWith(optText.charAt(0)))) return true;
      }
    }
    return false;

  // 4. Fill in the Blank
  } else if (type === "fill_blank" || type === "fill_in_the_blank") {
    return (studentAns || "").toString().trim().toLowerCase() === (q.answer || "").toString().trim().toLowerCase();

  // 5. Table Match, Drag Text, Drag Image Text
  } else if (type === "drag_text" || type === "drag_image_text" || type === "table_match") {
    let parsed = studentAns;
    if (typeof studentAns === "string") {
      try { parsed = JSON.parse(studentAns); } catch (e) { parsed = studentAns; }
    }
    if (!Array.isArray(parsed) || !Array.isArray(q.correctAnswers)) return false;
    if (parsed.length !== q.correctAnswers.length) return false;

    return parsed.every((val, idx) => {
      const expected = q.correctAnswers[idx];
      if (val === undefined || val === null || val === "") return false;
      if (val == expected) return true;
      if (q.options && q.options[val] !== undefined && q.options[val] == expected) return true;
      if (q.options && typeof expected === "number" && q.options[expected] !== undefined && q.options[expected] == val) return true;
      return String(val).trim().toLowerCase() === String(expected).trim().toLowerCase();
    });

  // 6. Hotspot
  } else if (type === "hotspot") {
    let clicks = studentAns;
    if (typeof studentAns === "string") {
      try { clicks = JSON.parse(studentAns); } catch (e) { clicks = []; }
    }
    if (!Array.isArray(clicks) || clicks.length < (q.requiredCount || 1)) return false;
    let allValid = true;
    clicks.forEach(click => {
      let hit = false;
      (q.hotspots || []).forEach(area => {
        const tolerance = 4;
        if (click.x >= area.x - tolerance && click.x <= area.x + area.w + tolerance && click.y >= area.y - tolerance && click.y <= area.y + area.h + tolerance) hit = true;
      });
      if (!hit) allValid = false;
    });
    return allValid;

  // 7. Multi Choice (checkboxes)
  } else if (type === "multi_choice") {
    let parsed = studentAns;
    if (typeof studentAns === "string") {
      try { parsed = JSON.parse(studentAns); } catch (e) { parsed = []; }
    }
    if (!Array.isArray(parsed)) return false;

    const correctList = Array.isArray(q.correctIndices) ? q.correctIndices : (Array.isArray(q.correctAnswers) ? q.correctAnswers : []);
    if (correctList.length > 0) {
      if (parsed.length !== correctList.length) return false;
      const normParsed = parsed.map(String).sort();
      const normCorrect = correctList.map(String).sort();
      return JSON.stringify(normParsed) === JSON.stringify(normCorrect);
    }
    if (q.answer && typeof q.answer === "string") {
      const expectedItems = q.answer.split(/,\s*/).map(s => s.trim().toLowerCase());
      const studentItems = parsed.map(idx => (q.options && q.options[idx] ? q.options[idx] : idx).toString().trim().toLowerCase());
      if (studentItems.length !== expectedItems.length) return false;
      return expectedItems.every(exp => studentItems.some(st => st.includes(exp) || exp.includes(st)));
    }
    return false;
  }

  return String(studentAns).trim().toLowerCase() === String(q.answer || q.correctAnswer || "").trim().toLowerCase();
}

// ================= RANKING & SCORE 10-SCALE CALCULATION =================
// Quy chuẩn giáo viên:
// - 41/45 câu là loại giỏi (thang điểm 10 >= 9.1 hoặc >= 41 câu với đề 45 câu)
// - 1 nửa câu tới 41 thì loại khá (từ nửa số câu ví dụ 23/45 tới dưới 41 câu)
// - Dưới 1 nửa câu: Cần cố gắng / Chưa đạt
function calculateExamRank(correctCount, totalQuestions) {
  const total = totalQuestions || 45;
  // Threshold Giỏi: 41 câu nếu đề 45 câu, hoặc quy đổi tỷ lệ 41/45 (91.1%)
  const thresholdGioi = (total === 45) ? 41 : Math.ceil(total * (41 / 45));
  // Threshold Khá: 1 nửa số câu (45/2 = 22.5 -> 23 câu)
  const thresholdKha = Math.ceil(total / 2);

  const score10 = Number(((correctCount / total) * 10).toFixed(1));
  const scorePercent = Math.round((correctCount / total) * 100);

  if (correctCount >= thresholdGioi) {
    return {
      rankKey: "gioi",
      rankName: "Loại Giỏi",
      badgeText: "LOẠI GIỎI",
      bannerText: "XẾP LOẠI: GIỎI (XUẤT SẮC)",
      badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-black",
      bannerClass: "bg-emerald-100 text-emerald-900 border border-emerald-300",
      trophyClass: "w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-4xl mx-auto shadow-md animate-bounce",
      icon: "🏆",
      sheetGrade: "A",
      isPass: true,
      score10,
      scorePercent
    };
  } else if (correctCount >= thresholdKha) {
    return {
      rankKey: "kha",
      rankName: "Loại Khá",
      badgeText: "LOẠI KHÁ",
      bannerText: "XẾP LOẠI: KHÁ (ĐẠT CHỈ TIÊU)",
      badgeClass: "bg-blue-100 text-blue-800 border border-blue-300 font-black",
      bannerClass: "bg-blue-100 text-blue-900 border border-blue-300",
      trophyClass: "w-24 h-24 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-4xl mx-auto shadow-md",
      icon: "⭐",
      sheetGrade: "B",
      isPass: true,
      score10,
      scorePercent
    };
  } else {
    return {
      rankKey: "chuadat",
      rankName: "Cần Cố Gắng",
      badgeText: "CẦN CỐ GẮNG",
      bannerText: "XẾP LOẠI: CẦN CỐ GẮNG THÊM",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-300 font-black",
      bannerClass: "bg-amber-100 text-amber-900 border border-amber-300",
      trophyClass: "w-24 h-24 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-4xl mx-auto shadow-md",
      icon: "📝",
      sheetGrade: "C",
      isPass: false,
      score10,
      scorePercent
    };
  }
}

// ================= RESULT DISPLAY =================
function showExamResultsScreen(res) {
  document.getElementById("screen-exam").classList.add("hidden");
  document.getElementById("screen-result").classList.remove("hidden");

  const rank = res.rank || calculateExamRank(res.correctCount, res.totalQuestions);

  // Confetti trigger (dành cho Loại Giỏi và Loại Khá)
  if (rank.isPass && typeof confetti === "function") {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // Candidate info
  document.getElementById("resultCandidateName").innerText = currentCandidate.name;
  document.getElementById("resultCandidateClass").innerText = currentCandidate.className;
  document.getElementById("resultCandidateSchool").innerText = currentCandidate.school;
  document.getElementById("resultTestTitle").innerText = res.testTitle;

  // Numbers (Thang điểm 10 là chính)
  const score10El = document.getElementById("resultScore10");
  if (score10El) {
    score10El.innerText = (res.score10 !== undefined ? res.score10 : rank.score10).toFixed(1);
  }
  const scorePercentEl = document.getElementById("resultScorePercent");
  if (scorePercentEl) {
    scorePercentEl.innerText = res.scorePercent;
  }
  document.getElementById("resultCorrectCount").innerText = `${res.correctCount} / ${res.totalQuestions}`;
  document.getElementById("resultTimeSpent").innerText = res.timeSpentText;

  // Trophy Icon & Rank Banner
  const trophy = document.getElementById("resultTrophyIcon");
  if (trophy) {
    trophy.innerHTML = rank.icon;
    trophy.className = rank.trophyClass;
  }

  const rankBanner = document.getElementById("resultRankBanner");
  if (rankBanner) {
    rankBanner.innerText = rank.bannerText;
    rankBanner.className = `px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase shadow-sm ${rank.bannerClass}`;
  }

  // Pass badge in Card 2
  const passBadge = document.getElementById("resultPassBadge");
  if (passBadge) {
    passBadge.innerText = rank.badgeText;
    passBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${rank.badgeClass}`;
  }

  // Google Sheet Sync Status Report
  const syncMsg = document.getElementById("sheetSyncMainMessage");
  const scoreVal = document.getElementById("sheetSyncScoreVal");
  const classVal = document.getElementById("sheetSyncClassVal");
  const tabVal = document.getElementById("sheetSyncTabVal");

  if (res.sheetSyncResult && res.sheetSyncResult.success) {
    const act = res.sheetSyncResult.action === "appended" ? "Đã thêm dòng mới và điền điểm" : "Đã tìm thấy học sinh và cập nhật";
    if (syncMsg) {
      syncMsg.innerHTML = `<span class="text-emerald-700 font-extrabold"><i class="fa-solid fa-circle-check mr-1 text-emerald-600"></i> ${act} thành công vào Google Sheet!</span>`;
    }
    if (scoreVal) scoreVal.innerText = `${(res.score10 !== undefined ? res.score10 : rank.score10).toFixed(1)} điểm (Hệ 10) • ${res.correctCount}/${res.totalQuestions} câu • ${rank.rankName}`;
    if (classVal) classVal.innerText = `${res.sheetSyncResult.classWritten} (Đã fill vào cột LỚP)`;
    if (tabVal) tabVal.innerText = `Tab [${res.sheetSyncResult.tab}]`;
  } else {
    if (syncMsg) {
      syncMsg.innerHTML = `<span class="text-amber-700 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1 text-amber-500"></i> ${res.sheetSyncResult ? res.sheetSyncResult.message || res.sheetSyncResult.error || "Lỗi nạp Google Sheet" : "Không thể kết nối Sheet"}</span>`;
    }
    if (scoreVal) scoreVal.innerText = `${(res.score10 !== undefined ? res.score10 : rank.score10).toFixed(1)}/10 điểm (${res.correctCount} câu đúng • ${rank.rankName})`;
    if (classVal) classVal.innerText = currentCandidate.className;
    if (tabVal) tabVal.innerText = "Chưa kết nối";
  }
}

// ================= REVIEW EXAM ANSWERS MODAL =================
window.handleReviewExamAnswers = function() {
  const modal = document.getElementById("modal-review-exam");
  const container = document.getElementById("reviewQuestionsContainer");
  const subtitle = document.getElementById("reviewSubtitle");

  if (subtitle) {
    const s10 = (lastExamResult.score10 !== undefined ? lastExamResult.score10 : ((lastExamResult.correctCount / lastExamResult.totalQuestions) * 10)).toFixed(1);
    const rName = lastExamResult.rank ? lastExamResult.rank.rankName : "";
    subtitle.innerText = `Thí sinh: ${currentCandidate.name} • Lớp: ${currentCandidate.className} • Điểm: ${s10}/10 (${lastExamResult.scorePercent}%) • Xếp loại: ${rName} (${lastExamResult.correctCount}/${lastExamResult.totalQuestions} câu đúng)`;
  }

  if (container) {
    container.innerHTML = "";

    examQuestions.forEach((q, idx) => {
      const studentAns = candidateAnswers[idx];
      const isCorrect = checkAnswerIsCorrect(q, studentAns);
      const type = q.type || "choice";

      const card = document.createElement("div");
      card.className = `p-5 sm:p-6 rounded-3xl border ${isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-red-50/40 border-red-200"} space-y-4 shadow-sm`;

      // Format Student Answer representation
      let ansDisplay = "Chưa trả lời";
      let correctDisplay = "Xem đáp án chuẩn";

      if (type === "choice" || type === "true_false" || type === "multiple_choice") {
        if (studentAns !== "" && studentAns !== undefined) {
          const opt = q.options ? q.options[studentAns] : null;
          ansDisplay = opt ? formatItemText(opt) : formatItemText(studentAns);
        }
        if (q.correctIndex !== undefined && q.options && q.options[q.correctIndex]) {
          correctDisplay = formatItemText(q.options[q.correctIndex]);
        } else if (q.answer) {
          correctDisplay = formatItemText(q.answer);
        }

      } else if (type === "multi_choice") {
        let arr = [];
        try { arr = Array.isArray(studentAns) ? studentAns : JSON.parse(studentAns); } catch (e) {}
        if (arr && arr.length > 0) {
          ansDisplay = arr.map(i => q.options && q.options[i] ? formatItemText(q.options[i]) : i).join("; ");
        }
        if (Array.isArray(q.correctIndices) && q.options) {
          correctDisplay = q.correctIndices.map(i => formatItemText(q.options[i])).join("; ");
        } else if (q.answer) {
          correctDisplay = formatItemText(q.answer);
        }

      } else if (type === "table_match") {
        let arr = [];
        try { arr = Array.isArray(studentAns) ? studentAns : JSON.parse(studentAns); } catch (e) {}
        const rows = q.rows || [];
        const opts = q.options || ["Đúng", "Sai"];
        if (arr && arr.length > 0) {
          ansDisplay = rows.map((r, i) => {
            const v = arr[i];
            const optLabel = v !== undefined && v !== "" && opts[v] ? opts[v] : (v || "(trống)");
            return `• Dòng ${i + 1}: ${formatItemText(optLabel)}`;
          }).join("<br>");
        }
        if (Array.isArray(q.correctAnswers)) {
          correctDisplay = rows.map((r, i) => {
            const v = q.correctAnswers[i];
            const optLabel = opts[v] || v;
            return `• Dòng ${i + 1}: ${formatItemText(optLabel)}`;
          }).join("<br>");
        }

      } else if (type === "drag_text" || type === "drag_image_text") {
        let arr = [];
        try { arr = Array.isArray(studentAns) ? studentAns : JSON.parse(studentAns); } catch (e) {}
        const rows = q.rows || q.leftImages || [];
        if (arr && arr.length > 0) {
          ansDisplay = rows.map((r, i) => `• Khái niệm ${i + 1} (${formatItemText(r)}): <b>${formatItemText(arr[i] || "Chưa ghép")}</b>`).join("<br>");
        }
        if (Array.isArray(q.correctAnswers)) {
          correctDisplay = rows.map((r, i) => `• Khái niệm ${i + 1} (${formatItemText(r)}): <b>${formatItemText(q.correctAnswers[i])}</b>`).join("<br>");
        }

      } else if (type === "fill_blank" || type === "fill_in_the_blank") {
        ansDisplay = studentAns ? formatItemText(studentAns) : "Chưa nhập";
        correctDisplay = formatItemText(q.answer);

      } else if (type === "hotspot") {
        let arr = [];
        try { arr = Array.isArray(studentAns) ? studentAns : JSON.parse(studentAns); } catch (e) {}
        ansDisplay = arr && arr.length > 0 ? `Đã định vị ${arr.length} vị trí trên ảnh` : "Chưa chọn vị trí";
        correctDisplay = `Yêu cầu đúng ${q.requiredCount || 1} vùng đáp án theo đề thi`;

      } else if (type === "image_choice") {
        ansDisplay = studentAns !== "" && studentAns !== undefined ? `Lựa chọn hình ảnh số ${parseInt(studentAns) + 1}` : "Chưa chọn";
        correctDisplay = q.correctIndex !== undefined ? `Lựa chọn hình ảnh số ${parseInt(q.correctIndex) + 1}` : (q.answer || "Hình ảnh đúng");
      }

      const mainImgUrl = q.image || q.imageUrl;

      card.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b ${isCorrect ? "border-emerald-200" : "border-red-200"}">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-xl text-xs font-black ${isCorrect ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}">
              ${isCorrect ? '<i class="fa-solid fa-check mr-1"></i> Câu ' + (idx + 1) + ': ĐÚNG' : '<i class="fa-solid fa-xmark mr-1"></i> Câu ' + (idx + 1) + ': CHƯA ĐÚNG'}
            </span>
          </div>
        </div>

        <div class="text-sm font-bold text-slate-900 leading-relaxed">
          ${formatItemText(q.question)}
        </div>

        ${mainImgUrl ? `
          <div class="rounded-xl overflow-hidden max-h-48 bg-slate-50 border border-slate-200 flex justify-center p-2">
            <img src="${convertDriveUrl(mainImgUrl)}" class="max-h-44 object-contain rounded-lg" alt="Ảnh câu hỏi" />
          </div>
        ` : ""}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div class="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
            <span class="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Đáp án của bạn:</span>
            <div class="font-bold ${isCorrect ? "text-emerald-700" : "text-red-600"} leading-relaxed">${ansDisplay}</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
            <span class="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Đáp án chính xác:</span>
            <div class="font-bold text-emerald-700 leading-relaxed">${correctDisplay}</div>
          </div>
        </div>

        ${q.explanation ? `
          <div class="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs leading-relaxed space-y-1 shadow-sm">
            <div class="font-extrabold text-blue-800 flex items-center gap-1.5">
              <i class="fa-solid fa-lightbulb text-amber-500"></i>
              <span>Giải thích kiến thức:</span>
            </div>
            <p class="font-medium text-slate-700">${formatItemText(q.explanation)}</p>
          </div>
        ` : ""}
      `;

      container.appendChild(card);
    });
  }

  if (modal) modal.classList.remove("hidden");
};

window.closeReviewModal = function() {
  const modal = document.getElementById("modal-review-exam");
  if (modal) modal.classList.add("hidden");
};

window.backToTestCatalog = function() {
  document.getElementById("screen-exam").classList.add("hidden");
  document.getElementById("screen-result").classList.add("hidden");
  document.getElementById("screen-catalog").classList.remove("hidden");
  renderTestsCatalog();
};
