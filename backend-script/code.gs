// =====================================
// CBT Serverless - Google Apps Script Backend
// Version: 2.0
// =====================================

// ===== CONFIGURATION =====
const CACHE_DURATION = 60; // seconds
const cache = CacheService.getScriptCache();

// ===== HELPER FUNCTIONS =====

/**
 * Get a sheet by name
 */
function getSheet(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(tabName);
}

/**
 * Parse Google Drive image URL to direct URL
 */
function parseGDriveImageUrl(url) {
  if (!url || url.trim() === "") return null;
  
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /file\/d\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  
  return url;
}

/**
 * Get config from Config sheet
 */
function getConfig() {
  const cached = cache.get("config");
  if (cached) return JSON.parse(cached);
  
  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  const config = {};
  
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  
  cache.put("config", JSON.stringify(config), CACHE_DURATION);
  return config;
}

/**
 * Create JSON response with CORS headers
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== MAIN ENDPOINTS =====

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    
    switch (action) {
      case "getConfig":
        result = handleGetConfig();
        break;
      case "getQuestions":
        result = handleGetQuestions();
        break;
      case "getLiveScore":
        result = handleGetLiveScore();
        break;
      case "getUsers":
        result = handleGetUsers(e.parameter);
        break;
      case "exportResults":
        result = handleExportResults();
        break;
      case "getExamPinStatus":
        result = handleGetExamPinStatus();
        break;
      case "getUsersForPrint":
        result = handleGetUsersForPrint();
        break;
      default:
        result = { success: false, message: "Unknown action" };
    }
    
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let result;
    
    switch (action) {
      case "login":
        result = handleLogin(params);
        break;
      case "syncAnswers":
        result = handleSyncAnswers(params);
        break;
      case "submitExam":
        result = handleSubmitExam(params);
        break;
      case "reportViolation":
        result = handleReportViolation(params);
        break;
      case "adminLogin":
        result = handleAdminLogin(params);
        break;
      case "createQuestion":
        result = handleCreateQuestion(params);
        break;
      case "updateQuestion":
        result = handleUpdateQuestion(params);
        break;
      case "deleteQuestion":
        result = handleDeleteQuestion(params);
        break;
      case "updateConfig":
        result = handleUpdateConfig(params);
        break;
      case "resetUserLogin":
        result = handleResetUserLogin(params);
        break;
      case "validateExamPin":
        result = handleValidateExamPin(params);
        break;
      case "setExamPin":
        result = handleSetExamPin(params);
        break;
      case "resetTodayExam":
        result = handleResetTodayExam(params);
        break;
      default:
        result = { success: false, message: "Unknown action" };
    }
    
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

// ===== GET HANDLERS =====

function handleGetConfig() {
  const config = getConfig();
  // Remove sensitive data
  const safeConfig = {
    exam_name: config.exam_name,
    exam_duration: config.exam_duration,
    max_violations: config.max_violations,
    auto_submit: config.auto_submit,
    shuffle_questions: config.shuffle_questions
  };
  return { success: true, data: safeConfig };
}

function handleGetQuestions() {
  // Get active package filter from Config
  const config = getConfig();
  const activePaket = (config.active_paket || "").toString().trim();
  
  // Create cache key that includes paket filter (so different pakets have different caches)
  const cacheKey = activePaket ? `questions_${activePaket}` : "questions";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = getSheet("Questions");
  const data = sheet.getDataRange().getValues();
  const questions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    // Get paket from column P (index 15)
    const paketSoal = row[15] ? row[15].toString().trim() : "";
    
    // Filter by active paket if set
    // If activePaket is set, only include questions that match OR have no paket set
    if (activePaket && paketSoal && paketSoal !== activePaket) {
      continue;
    }
    
    questions.push({
      id_soal: row[0],
      nomor_urut: row[1],
      tipe: row[2],
      pertanyaan: row[3],
      gambar_url: parseGDriveImageUrl(row[4]),
      opsi_a: row[5],
      opsi_b: row[6],
      opsi_c: row[7],
      opsi_d: row[8],
      opsi_e: row[9] || null,
      bobot: row[11] || 1,
      kategori: row[12] || null,
      paket: paketSoal,
      // TRUE_FALSE_MULTI specific fields (optional)
      statements_json: row[13] ? JSON.parse(row[13]) : null,
      answer_json: row[14] ? JSON.parse(row[14]) : null
      // kunci_jawaban (row[10]) is NOT sent to client
    });
  }
  
  questions.sort((a, b) => a.nomor_urut - b.nomor_urut);
  
  const result = { success: true, data: questions };
  cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION);
  
  return result;
}

function handleGetLiveScore() {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const scores = [];
  
  let totalUsers = 0;
  let sedang = 0;
  let selesai = 0;
  let diskualifikasi = 0;
  let belum = 0;
  
  // Get questions for real-time grading (only load once for all students)
  const qSheet = getSheet("Questions");
  const questions = qSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    totalUsers++;
    const status = row[10];
    const id_siswa = row[0];
    
    if (status === "SEDANG") {
      sedang++;
      
      // Real-time scoring: Get cached answers and calculate temporary score
      const cachedAnswers = cache.get(`answers_${id_siswa}`);
      let tempScore = 0;
      let answeredCount = 0;
      
      if (cachedAnswers) {
        const answers = JSON.parse(cachedAnswers);
        answeredCount = Object.keys(answers).length;
        
        // Calculate score using same logic as handleSubmitExam
        let totalScore = 0;
        let maxScore = 0;
        
        for (let j = 1; j < questions.length; j++) {
          const q = questions[j];
          if (!q[0]) continue;
          
          const id_soal = q[0];
          const tipe = q[2];
          const kunci = q[10];
          const bobot = q[11] || 1;
          const jawaban = answers[id_soal];
          
          maxScore += bobot;
          
          if (!jawaban) continue;
          
          if (tipe === "SINGLE") {
            if (jawaban === kunci) {
              totalScore += bobot;
            }
          } else if (tipe === "COMPLEX") {
            const kunciArray = kunci.toString().split(",").map(k => k.trim()).sort();
            const jawabanArray = Array.isArray(jawaban) 
              ? jawaban.sort() 
              : jawaban.toString().split(",").map(j => j.trim()).sort();
            
            if (JSON.stringify(kunciArray) === JSON.stringify(jawabanArray)) {
              totalScore += bobot;
            }
          } else if (tipe === "TRUE_FALSE_MULTI") {
            const correctAnswers = q[14] ? JSON.parse(q[14]) : [];
            const studentAnswers = jawaban;
            if (Array.isArray(studentAnswers) && Array.isArray(correctAnswers) && correctAnswers.length > 0) {
              let correctCount = 0;
              correctAnswers.forEach((correct, idx) => {
                if (studentAnswers[idx] === correct) correctCount++;
              });
              totalScore += (correctCount / correctAnswers.length) * bobot;
            }
          }
        }
        
        tempScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      }
      
      // Add active student with real-time score
      scores.push({
        rank: 0,
        nama: row[3],
        kelas: row[4],
        skor: parseFloat(tempScore.toFixed(2)),
        status: "SEDANG",
        waktu_selesai: "Live...",
        waktu_submit_ms: Date.now(), // Use current time for sorting active students
        soal_dijawab: answeredCount,
        is_live: true
      });
      
    } else if (status === "SELESAI") {
      selesai++;
      scores.push({
        rank: 0,
        nama: row[3],
        kelas: row[4],
        skor: parseFloat(row[8]) || 0,
        status: status,
        waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : "-",
        waktu_submit_ms: row[7] ? new Date(row[7]).getTime() : 0,
        is_live: false
      });
    } else if (status === "DISKUALIFIKASI") {
      diskualifikasi++;
      scores.push({
        rank: 0,
        nama: row[3],
        kelas: row[4],
        skor: parseFloat(row[8]) || 0,
        status: status,
        waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : "-",
        waktu_submit_ms: row[7] ? new Date(row[7]).getTime() : 0,
        is_live: false
      });
    } else {
      belum++;
    }
  }
  
  // Sort: Score DESC, then by status (SELESAI first, then SEDANG), then Time ASC
  scores.sort((a, b) => {
    // First by score (descending)
    if (b.skor !== a.skor) return b.skor - a.skor;
    // Then finished students come before active students at same score
    if (a.is_live !== b.is_live) return a.is_live ? 1 : -1;
    // Then by time (ascending)
    return a.waktu_submit_ms - b.waktu_submit_ms;
  });
  
  // Add rank
  scores.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return {
    success: true,
    data: scores,
    stats: {
      total: totalUsers,
      sedang: sedang,
      selesai: selesai,
      diskualifikasi: diskualifikasi,
      belum: belum
    }
  };
}

function handleGetUsers(params) {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    users.push({
      id_siswa: row[0],
      username: row[1],
      nama_lengkap: row[3],
      kelas: row[4],
      status_login: row[5],
      waktu_mulai: row[6] ? new Date(row[6]).toLocaleString("id-ID") : null,
      waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : null,
      skor_akhir: row[8],
      violation_count: row[9] || 0,
      status_ujian: row[10] || "BELUM",
      last_seen: row[11] ? new Date(row[11]).toLocaleString("id-ID") : null
    });
  }
  
  return { success: true, data: users };
}

/**
 * Get users WITH password for admin print login cards
 * This is an admin-only feature for printing student credentials
 */
function handleGetUsersForPrint() {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    users.push({
      id_siswa: row[0],
      username: row[1],
      password: row[2],  // Include password for print cards
      nama_lengkap: row[3],
      kelas: row[4]
    });
  }
  
  return { success: true, data: users };
}

function handleExportResults() {
  const sheet = getSheet("Responses");
  const data = sheet.getDataRange().getValues();
  
  return { success: true, data: data };
}

// ===== POST HANDLERS =====

function handleLogin(params) {
  const { username, password } = params;
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1].toString().toLowerCase() === username.toLowerCase() && row[2].toString() === password) {
      const statusUjian = row[10];
      
      if (statusUjian === "SELESAI" || statusUjian === "DISKUALIFIKASI") {
        return { success: false, message: "Anda sudah menyelesaikan ujian." };
      }
      
      // Check if already logged in elsewhere
      if (row[5] === true) {
        return { success: false, message: "Akun sudah login di perangkat lain." };
      }
      
      // Update status login & waktu mulai
      sheet.getRange(i + 1, 6).setValue(true); // status_login
      if (!row[6]) {
        sheet.getRange(i + 1, 7).setValue(new Date()); // waktu_mulai
        sheet.getRange(i + 1, 11).setValue("SEDANG"); // status_ujian
      }
      sheet.getRange(i + 1, 12).setValue(new Date()); // last_seen
      
      // Get config for exam duration
      const config = getConfig();
      
      return {
        success: true,
        data: {
          id_siswa: row[0],
          username: row[1],
          nama_lengkap: row[3],
          kelas: row[4],
          status_ujian: row[10] || "SEDANG",
          waktu_mulai: row[6] ? row[6] : new Date().toISOString(),
          exam_duration: parseInt(config.exam_duration) || 90
        }
      };
    }
  }
  
  return { success: false, message: "Username atau password salah." };
}

function handleSyncAnswers(params) {
  const { id_siswa, answers } = params;
  
  // Save to cache as backup
  cache.put(`answers_${id_siswa}`, JSON.stringify(answers), 3600);
  
  // Update last_seen
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      sheet.getRange(i + 1, 12).setValue(new Date());
      break;
    }
  }
  
  return { success: true, message: "Synced" };
}

function handleSubmitExam(params) {
  const { id_siswa, answers, forced } = params;
  
  // Get questions for grading
  const qSheet = getSheet("Questions");
  const questions = qSheet.getDataRange().getValues();
  
  let totalScore = 0;
  let maxScore = 0;
  
  // Grading Logic
  for (let i = 1; i < questions.length; i++) {
    const q = questions[i];
    if (!q[0]) continue;
    
    const id_soal = q[0];
    const tipe = q[2];
    const kunci = q[10];
    const bobot = q[11] || 1;
    const jawaban = answers[id_soal];
    
    maxScore += bobot;
    
    if (!jawaban) continue;
    
    if (tipe === "SINGLE") {
      if (jawaban === kunci) {
        totalScore += bobot;
      }
    } else if (tipe === "COMPLEX") {
      const kunciArray = kunci.toString().split(",").map(k => k.trim()).sort();
      const jawabanArray = Array.isArray(jawaban) 
        ? jawaban.sort() 
        : jawaban.toString().split(",").map(j => j.trim()).sort();
      
      if (JSON.stringify(kunciArray) === JSON.stringify(jawabanArray)) {
        totalScore += bobot;
      }
    } else if (tipe === "TRUE_FALSE_MULTI") {
      // Proportional scoring for TRUE_FALSE_MULTI
      const correctAnswers = q[14] ? JSON.parse(q[14]) : []; // answer_json
      const studentAnswers = jawaban; // array of booleans
      if (Array.isArray(studentAnswers) && Array.isArray(correctAnswers) && correctAnswers.length > 0) {
        let correctCount = 0;
        correctAnswers.forEach((correct, i) => {
          if (studentAnswers[i] === correct) correctCount++;
        });
        totalScore += (correctCount / correctAnswers.length) * bobot;
      }
    }
  }
  
  // Convert to 0-100 scale
  const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  
  // Update Users table
  const uSheet = getSheet("Users");
  const users = uSheet.getDataRange().getValues();
  let userName = "", userClass = "", waktuMulai = null, violationLog = "";
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === id_siswa) {
      userName = users[i][3];
      userClass = users[i][4];
      waktuMulai = users[i][6];
      violationLog = `Tab switch/violations: ${users[i][9] || 0}x`;
      
      uSheet.getRange(i + 1, 6).setValue(false); // status_login
      uSheet.getRange(i + 1, 8).setValue(new Date()); // waktu_selesai
      uSheet.getRange(i + 1, 9).setValue(finalScore.toFixed(2)); // skor_akhir
      uSheet.getRange(i + 1, 11).setValue(forced ? "DISKUALIFIKASI" : "SELESAI");
      break;
    }
  }
  
  // Calculate duration
  const durasiMenit = waktuMulai 
    ? Math.round((new Date() - new Date(waktuMulai)) / 60000)
    : 0;
  
  // Save to Responses table
  const rSheet = getSheet("Responses");
  rSheet.appendRow([
    new Date(),
    id_siswa,
    userName,
    userClass,
    JSON.stringify(answers),
    finalScore.toFixed(2),
    durasiMenit,
    forced ? "DISKUALIFIKASI - Auto Submit" : violationLog,
    ""
  ]);
  
  // Clear questions cache
  cache.remove("questions");
  
  return { 
    success: true, 
    score: finalScore.toFixed(2),
    status: forced ? "DISKUALIFIKASI" : "SELESAI"
  };
}

function handleReportViolation(params) {
  const { id_siswa, type } = params;
  
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const config = getConfig();
  const maxViolations = parseInt(config.max_violations) || 3;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      const currentCount = data[i][9] || 0;
      const newCount = currentCount + 1;
      
      sheet.getRange(i + 1, 10).setValue(newCount);
      
      if (newCount >= maxViolations) {
        sheet.getRange(i + 1, 11).setValue("DISKUALIFIKASI");
        return { 
          success: true, 
          disqualified: true,
          violations: newCount 
        };
      }
      
      return { 
        success: true, 
        disqualified: false,
        violations: newCount 
      };
    }
  }
  
  return { success: false, message: "User not found" };
}

function handleAdminLogin(params) {
  const { password } = params;
  const config = getConfig();
  
  if (password === config.admin_password) {
    return { success: true, message: "Login successful" };
  }
  
  return { success: false, message: "Password salah" };
}

function handleCreateQuestion(params) {
  const sheet = getSheet("Questions");
  const { data } = params;
  
  sheet.appendRow([
    data.id_soal,
    data.nomor_urut,
    data.tipe,
    data.pertanyaan,
    data.gambar_url || "",
    data.opsi_a || "",
    data.opsi_b || "",
    data.opsi_c || "",
    data.opsi_d || "",
    data.opsi_e || "",
    data.kunci_jawaban || "",
    data.bobot || 1,
    data.kategori || "",
    // TRUE_FALSE_MULTI specific fields (optional)
    data.statements_json ? JSON.stringify(data.statements_json) : "",
    data.answer_json ? JSON.stringify(data.answer_json) : "",
    // Paket soal (column P, index 15)
    data.paket || ""
  ]);
  
  // Clear all question-related caches (base + all paket variants)
  cache.remove("questions");
  cache.remove("questions_Paket1");
  cache.remove("questions_Paket2");
  cache.remove("questions_Paket3");
  cache.remove("questions_Paket4");
  cache.remove("questions_Paket5");
  
  return { success: true, message: "Question created" };
}

function handleUpdateQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal, data } = params;
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === id_soal) {
      const row = i + 1;
      sheet.getRange(row, 1, 1, 16).setValues([[
        data.id_soal,
        data.nomor_urut,
        data.tipe,
        data.pertanyaan,
        data.gambar_url || "",
        data.opsi_a || "",
        data.opsi_b || "",
        data.opsi_c || "",
        data.opsi_d || "",
        data.opsi_e || "",
        data.kunci_jawaban || "",
        data.bobot || 1,
        data.kategori || "",
        // TRUE_FALSE_MULTI specific fields (optional)
        data.statements_json ? JSON.stringify(data.statements_json) : "",
        data.answer_json ? JSON.stringify(data.answer_json) : "",
        // Paket soal (column P, index 15)
        data.paket || ""
      ]]);
      
      // Clear all question-related caches (base + all paket variants)
      cache.remove("questions");
      cache.remove("questions_Paket1");
      cache.remove("questions_Paket2");
      cache.remove("questions_Paket3");
      cache.remove("questions_Paket4");
      cache.remove("questions_Paket5");
      return { success: true, message: "Question updated" };
    }
  }
  
  return { success: false, message: "Question not found" };
}

function handleDeleteQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal } = params;
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_soal) {
      sheet.deleteRow(i + 1);
      // Clear all question-related caches
      cache.remove("questions");
      cache.remove("questions_Paket1");
      cache.remove("questions_Paket2");
      cache.remove("questions_Paket3");
      cache.remove("questions_Paket4");
      cache.remove("questions_Paket5");
      return { success: true, message: "Question deleted" };
    }
  }
  
  return { success: false, message: "Question not found" };
}

function handleUpdateConfig(params) {
  const sheet = getSheet("Config");
  const { key, value } = params;
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      cache.remove("config");
      return { success: true, message: "Config updated" };
    }
  }
  
  // If key doesn't exist, add new row
  sheet.appendRow([key, value, ""]);
  cache.remove("config");
  
  return { success: true, message: "Config added" };
}

function handleResetUserLogin(params) {
  const { id_siswa } = params;
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      sheet.getRange(i + 1, 6).setValue(false); // status_login = false
      return { success: true, message: "Login reset successful" };
    }
  }
  
  return { success: false, message: "User not found" };
}

// ===== PIN AUTHENTICATION HANDLERS =====

function handleGetExamPinStatus() {
  const config = getConfig();
  // Ensure exam_pin is a string
  const examPin = String(config.exam_pin || "");
  
  // Return true if PIN is required (not empty)
  return { 
    success: true, 
    data: {
      isPinRequired: examPin.trim() !== ""
    }
  };
}

function handleValidateExamPin(params) {
  // Handle missing params
  if (!params || !params.pin) {
    return { success: false, message: "PIN is required" };
  }
  
  const { pin } = params;
  const config = getConfig();
  const examPin = String(config.exam_pin || "");
  
  // If no PIN set, validation always succeeds (backward compatible)
  if (examPin.trim() === "") {
    return { success: true, message: "No PIN required" };
  }
  
  // Validate PIN
  if (pin && String(pin).trim() === examPin.trim()) {
    return { success: true, message: "PIN valid" };
  }
  
  return { success: false, message: "PIN salah" };
}

function handleSetExamPin(params) {
  // Handle missing params
  if (!params) {
    return { success: false, message: "Invalid request" };
  }
  
  const { pin, adminPassword } = params;
  
  // Verify admin password
  const config = getConfig();
  if (adminPassword !== config.admin_password) {
    return { success: false, message: "Unauthorized" };
  }
  
  // Update PIN in Config sheet
  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "exam_pin") {
      sheet.getRange(i + 1, 2).setValue(pin || "");
      cache.remove("config");
      return { success: true, message: "PIN updated" };
    }
  }
  
  // If exam_pin doesn't exist, add it
  sheet.appendRow(["exam_pin", pin || "", "PIN for exam start"]);
  cache.remove("config");
  
  return { success: true, message: "PIN set" };
}

/**
 * Reset all users' exam status for today
 * Clears: status_login, waktu_mulai, waktu_selesai, skor_akhir, violation_count, status_ujian
 * Also clears cached answers
 */
function handleResetTodayExam(params) {
  // Verify admin password
  if (!params || !params.adminPassword) {
    return { success: false, message: "Admin password required" };
  }
  
  const config = getConfig();
  if (params.adminPassword !== config.admin_password) {
    return { success: false, message: "Unauthorized - Invalid admin password" };
  }
  
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  
  let resetCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const id_siswa = row[0];
    const currentStatus = row[10]; // status_ujian column
    
    // Only reset users who have started or completed exam
    if (currentStatus === "SEDANG" || currentStatus === "SELESAI" || currentStatus === "DISKUALIFIKASI") {
      // Reset exam-related columns
      // Column F (6): status_login -> false
      sheet.getRange(i + 1, 6).setValue(false);
      // Column G (7): waktu_mulai -> clear
      sheet.getRange(i + 1, 7).setValue("");
      // Column H (8): waktu_selesai -> clear  
      sheet.getRange(i + 1, 8).setValue("");
      // Column I (9): skor_akhir -> clear
      sheet.getRange(i + 1, 9).setValue("");
      // Column J (10): violation_count -> 0
      sheet.getRange(i + 1, 10).setValue(0);
      // Column K (11): status_ujian -> BELUM
      sheet.getRange(i + 1, 11).setValue("BELUM");
      // Column L (12): last_seen -> clear
      sheet.getRange(i + 1, 12).setValue("");
      
      // Clear cached answers for this user
      cache.remove(`answers_${id_siswa}`);
      
      resetCount++;
    }
  }
  
  // Clear all question caches
  cache.remove("questions");
  cache.remove("questions_Paket1");
  cache.remove("questions_Paket2");
  cache.remove("questions_Paket3");
  cache.remove("questions_Paket4");
  cache.remove("questions_Paket5");
  
  return { 
    success: true, 
    message: `Berhasil mereset ${resetCount} peserta ujian`,
    resetCount: resetCount
  };
}
