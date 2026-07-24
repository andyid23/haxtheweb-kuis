/**
 * Google Apps Script - Full Quiz & Attendance Handler
 * 
 * Menerima data dari <full-quiz-dashboard> web component
 * Menangani: Hasil Kuis + Log Attendance
 * 
 * CARA SETUP:
 * 1. Buka Google Sheets
 * 2. Extension > Apps Script
 * 3. Copy-paste seluruh kode ini
 * 4. Save project
 * 5. Deploy > New deployment > Web app
 * 6. Execute as: Me, Who has access: Anyone
 * 7. Copy URL dan gunakan di dashboard
 */

const SHEET_QUIZ = "Hasil Kuis";
const SHEET_ATTENDANCE = "Log Aktivitas";
const SHEET_SUMMARY = "Rangkuman";

/**
 * GET - Health check
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Quiz & Attendance API is running",
    sheets: [SHEET_QUIZ, SHEET_ATTENDANCE, SHEET_SUMMARY]
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST - Terima data kuis atau attendance
 */
function doPost(e) {
  try {
    let data;

    // Coba parse JSON body
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (_) {
        // Fallback ke form parameters
        data = {
          name: e.parameter.name,
          score: e.parameter.score ? parseInt(e.parameter.score) : null,
          type: e.parameter.type || "quiz",
          timestamp: e.parameter.timestamp || new Date().toISOString(),
          activityType: e.parameter.activityType,
          description: e.parameter.description,
          totalQuestions: e.parameter.totalQuestions ? parseInt(e.parameter.totalQuestions) : 5
        };
      }
    } else {
      // Form parameters
      data = {
        name: e.parameter.name || "Unknown",
        score: e.parameter.score ? parseInt(e.parameter.score) : null,
        type: e.parameter.type || "quiz",
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        activityType: e.parameter.activityType,
        description: e.parameter.description,
        totalQuestions: e.parameter.totalQuestions ? parseInt(e.parameter.totalQuestions) : 5
      };
    }

    // Validasi
    if (!data.name) {
      return response({ status: "error", message: "Missing name" });
    }

    // Route berdasarkan tipe data
    let result;
    if (data.type === "attendance" || data.activityType) {
      result = saveAttendance(data);
    } else {
      result = saveQuiz(data);
    }

    // Update summary
    updateSummary();

    return response({ status: "success", message: "Data saved", data: result });

  } catch (error) {
    console.error("Error:", error);
    return response({ status: "error", message: error.toString() });
  }
}

/**
 * Helper: Kirim response JSON
 */
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Simpan hasil kuis
 */
function saveQuiz(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_QUIZ);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_QUIZ);
    setupSheet(sheet, SHEET_QUIZ);
  }

  const score = data.score || 0;
  const totalSoal = data.totalQuestions || 5;
  const status = score >= 70 ? "LULUS" : "TIDAK LULUS";
  const timestamp = new Date(data.timestamp || Date.now());
  const formattedTime = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  sheet.appendRow([
    formattedTime,
    data.name,
    score,
    totalSoal,
    status
  ]);

  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow, 1, 1, 5);

  // Warna baris
  if (score >= 70) {
    range.setBackground("#d1fae5");
  } else {
    range.setBackground("#fee2e2");
  }

  sheet.autoResizeColumns(1, 5);

  return { sheet: SHEET_QUIZ, row: lastRow, name: data.name, score, status };
}

/**
 * Simpan log attendance
 */
function saveAttendance(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ATTENDANCE);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ATTENDANCE);
    setupSheet(sheet, SHEET_ATTENDANCE);
  }

  const timestamp = new Date(data.timestamp || Date.now());
  const formattedTime = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  const formattedDate = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy");
  const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][timestamp.getDay()];

  sheet.appendRow([
    formattedTime,
    formattedDate,
    dayName,
    data.name,
    data.activityType || data.type || "activity",
    data.description || "Aktivitas pembelajaran",
    1 // count = 1 per log
  ]);

  sheet.autoResizeColumns(1, 7);

  return { sheet: SHEET_ATTENDANCE, row: sheet.getLastRow(), type: data.activityType };
}

/**
 * Setup header sheet baru
 */
function setupSheet(sheet, sheetType) {
  let headers;

  switch (sheetType) {
    case SHEET_QUIZ:
      headers = ["Timestamp", "Nama", "Skor (%)", "Total Soal", "Status"];
      break;
    case SHEET_ATTENDANCE:
      headers = ["Timestamp", "Tanggal", "Hari", "Nama", "Tipe Aktivitas", "Deskripsi", "Count"];
      break;
    case SHEET_SUMMARY:
      headers = ["Nama", "Total Aktivitas", "Reading", "Quiz", "Discussion", "Download", "Skor Kuis Tertinggi", "Status Terakhir"];
      break;
    default:
      headers = [];
  }

  if (headers.length > 0) {
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");
    range.setBackground("#6750a4");
    range.setFontColor("white");
    range.setHorizontalAlignment("center");
  }
}

/**
 * Update sheet Rangkuman (agregasi per siswa)
 */
function updateSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const quizSheet = ss.getSheetByName(SHEET_QUIZ);

  if (!attSheet && !quizSheet) return;

  let sheet = ss.getSheetByName(SHEET_SUMMARY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SUMMARY);
    setupSheet(sheet, SHEET_SUMMARY);
  }

  // Kumpulkan data per siswa
  const studentData = {};

  // Attendance data
  if (attSheet && attSheet.getLastRow() > 1) {
    const attData = attSheet.getDataRange().getValues();
    for (let i = 1; i < attData.length; i++) {
      const row = attData[i];
      const name = row[3]; // Nama
      if (!name) continue;

      if (!studentData[name]) {
        studentData[name] = { total: 0, reading: 0, quiz: 0, discussion: 0, download: 0, score: 0 };
      }

      const type = row[4]; // Tipe
      studentData[name].total++;
      if (type === "reading") studentData[name].reading++;
      else if (type === "quiz") studentData[name].quiz++;
      else if (type === "discussion") studentData[name].discussion++;
      else if (type === "download") studentData[name].download++;
    }
  }

  // Quiz data
  if (quizSheet && quizSheet.getLastRow() > 1) {
    const quizData = quizSheet.getDataRange().getValues();
    for (let i = 1; i < quizData.length; i++) {
      const row = quizData[i];
      const name = row[1]; // Nama
      const score = row[2]; // Skor
      const status = row[4]; // Status
      if (!name) continue;

      if (!studentData[name]) {
        studentData[name] = { total: 0, reading: 0, quiz: 0, discussion: 0, download: 0, score: 0, status: "" };
      }

      if (score > studentData[name].score) {
        studentData[name].score = score;
      }
      studentData[name].status = status;
    }
  }

  // Clear old data (keep header)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  // Write summary
  Object.entries(studentData).forEach(([name, data]) => {
    sheet.appendRow([
      name,
      data.total,
      data.reading,
      data.quiz,
      data.discussion,
      data.download,
      data.score,
      data.status || "N/A"
    ]);
  });

  sheet.autoResizeColumns(1, 8);
}

/**
 * Test function - run manually from editor
 */
function testAll() {
  // Test quiz save
  saveQuiz({
    name: "Test Student",
    score: 85,
    timestamp: new Date().toISOString(),
    totalQuestions: 5
  });

  // Test attendance save
  saveAttendance({
    name: "Test Student",
    timestamp: new Date().toISOString(),
    activityType: "reading",
    description: "Membaca modul pembelajaran"
  });

  updateSummary();

  Logger.log("All tests completed! Check your sheets.");
}
