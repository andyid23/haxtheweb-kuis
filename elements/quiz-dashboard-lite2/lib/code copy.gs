/**
 * Google Apps Script — Full Quiz & Attendance Handler (v3 FINAL)
 * 
 * STRUKTUR SHEET:
 * - "[Nama Pertemuan] - Kuis"
 * - "[Nama Pertemuan] - Aktivitas"
 * - "Rangkuman"
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  const name = (e && e.parameter && e.parameter.name) || "";
  const sheet = (e && e.parameter && e.parameter.sheet) || "";
  const studentId = (e && e.parameter && e.parameter.studentId) || "";

  try {
    switch (action) {
      case "register": return response(registerUser(e.parameter));
      case "login": return response(loginUser(e.parameter));
      case "verify": return response(verifyUser(studentId));
      case "submit": {
        const result = saveQuiz(e.parameter);
        updateSummary();
        return response({ status: "success", message: "Hasil kuis tersimpan", data: result });
      }
      case "activity": {
        const result = saveAttendance(e.parameter);
        try { updateSummary(); } catch (_) {}
        return response({ status: "success", message: "Aktivitas tersimpan", data: result });
      }
      case "leaderboard": return response(getLeaderboard());
      case "summary": return response(getStudentSummary(name));
      case "pertemuan": return response(getPertemuanData(sheet));
      case "aktivitas": return response(getAktivitasLog(sheet, name));
      case "getScores": return response(getStudentScores(studentId));
      case "getStudentRoster": return response(getStudentRoster());
      case "generateReport": return response(generateReport(e.parameter));
      case "list": 
      default: return response(getSheetList());
    }
  } catch (error) {
    return response({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (_) {}
    }
    if (e.parameter) {
      data.name = data.name || e.parameter.name;
      data.score = data.score || (e.parameter.score ? parseInt(e.parameter.score) : null);
      data.sheet = data.sheet || e.parameter.sheet || e.parameter.sheetName || "Pertemuan";
      data.timestamp = data.timestamp || e.parameter.timestamp;
      data.totalQuestions = data.totalQuestions || (e.parameter.totalQuestions ? parseInt(e.parameter.totalQuestions) : 5);
      data.type = data.type || e.parameter.type || "quiz";
      data.activityType = data.activityType || e.parameter.activityType;
      data.description = data.description || e.parameter.description;
    }
// tambahan qwen

   // === AUTH ROUTING (BARU) ===
    if (data.action === "register") return response(registerUser(data));
    if (data.action === "login") return response(loginUser(data));
    if (data.action === "verify") return response(verifyUser(data.studentId || ""));
    if (data.action === "getScores") return response(getStudentScores(data.studentId || ""));
    if (data.action === "getStudentRoster") return response(getStudentRoster());
    if (data.action === "generateReport") return response(generateReport(data));

// ✅ PERBAIKAN: Prioritaskan nama dari database jika studentId valid
if (data.studentId) {
  const user = verifyUser(data.studentId);
  if (user.status === "success") {
    data.name = user.nama; // Override dengan nama asli dari DB
  } else {
    data.name = data.name || e.parameter.name; // Fallback
  }
} else {
  data.name = data.name || e.parameter.name;
}


    if (!data.name) return response({ status: "error", message: "Nama wajib diisi." });
    if (!data.sheet) return response({ status: "error", message: "Nama sheet/pertemuan wajib diisi." });

    let result;
    if (data.type === "attendance" || data.activityType) {
      result = saveAttendance(data);
    } else {
      if (data.score === null || data.score === undefined) {
        return response({ status: "error", message: "Skor wajib diisi untuk tipe quiz." });
      }
      result = saveQuiz(data);
    }

    try { updateSummary(); } catch (_) {}
    return response({ status: "success", message: "Data tersimpan!", data: result });

  } catch (error) {
    return response({ status: "error", message: "Error: " + error.toString() });
  }
}

// --- FUNGSI PENYIMPANAN ---

function getValidTimestamp_(value) {
  const parsed = value ? new Date(value) : new Date();
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function findStudentRow_(sheet, key, studentIdCol, fallbackCols) {
  if (!key || sheet.getLastRow() <= 1) return -1;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const studentId = String(row[studentIdCol] || "").trim();
    const fallbackKey = fallbackCols.map(col => String(row[col] || "").trim()).join("|");
    if (studentId === key || fallbackKey === key) return i + 1;
  }
  return -1;
}

function saveQuiz(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheet + " - Kuis";
  let sheet = ss.getSheetByName(sheetName);
  
  const headers = ["Timestamp", "Nama", "Skor (%)", "Total Soal", "Status", "Student ID", "NIS", "Absen", "Kelas", "Kategori Kuis"];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupHeader(sheet, headers);
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const score = parseInt(data.score) || 0;
  const totalSoal = parseInt(data.totalQuestions) || 5;
  const status = score >= 70 ? "LULUS" : "TIDAK LULUS";
  const timestamp = getValidTimestamp_(data.timestamp);
  const formattedTime = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  const studentId = String(data.studentId || "").trim();
  const nis = String(data.nis || "").trim();
  const absen = String(data.absen || "").trim();
  const kelas = String(data.kelas || "").trim();
  const quizCategory = String(data.quizCategory || data.category || "formatif").toLowerCase();
  const quizKey = studentId || [nis, absen, kelas, data.name].join("|");

  // Batasi 1 hasil kuis per siswa per pertemuan agar refresh/click URL exec tidak menggandakan baris.
  // Jika siswa mengerjakan ulang, baris lama diperbarui dengan hasil terbaru.
  const existingRow = findStudentRow_(sheet, quizKey, 5, [6, 7, 8, 1]);
  const rowValues = [formattedTime, data.name, score, totalSoal, status, studentId, nis, absen, kelas, quizCategory];
  let targetRow;
  if (existingRow > 0) {
    targetRow = existingRow;
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    targetRow = sheet.getLastRow();
  }
  
  const range = sheet.getRange(targetRow, 1, 1, headers.length);
  range.setBackground(score >= 70 ? "#d1fae5" : "#fee2e2");
  sheet.autoResizeColumns(1, headers.length);

  return { sheet: sheetName, row: targetRow, type: "quiz", name: data.name, score: score, status: status, category: quizCategory };
}

function countActivityForStudent_(sheet, studentId, nis, absen, kelas, name, activityType) {
  if (sheet.getLastRow() <= 1) return 0;
  const key = studentId || [nis, absen, kelas, name].join("|");
  const values = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowType = String(row[4] || "").trim();
    const rowStudentId = String(row[7] || "").trim();
    const rowKey = rowStudentId || [row[8], row[9], row[10], row[3]].map(v => String(v || "").trim()).join("|");
    if (rowType === activityType && rowKey === key) count++;
  }
  return count;
}

function countAllActivitiesForStudent_(sheet, studentId, nis, absen, kelas, name) {
  if (sheet.getLastRow() <= 1) return 0;
  const key = studentId || [nis, absen, kelas, name].join("|");
  const values = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowStudentId = String(row[7] || "").trim();
    const rowKey = rowStudentId || [row[8], row[9], row[10], row[3]].map(v => String(v || "").trim()).join("|");
    if (rowKey === key) count++;
  }
  return count;
}

function saveAttendance(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheet + " - Aktivitas";
  let sheet = ss.getSheetByName(sheetName);
  
  const headers = ["Timestamp", "Tanggal", "Hari", "Nama", "Tipe Aktivitas", "Deskripsi", "Count", "Student ID", "NIS", "Absen", "Kelas"];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupHeader(sheet, headers);
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const timestamp = getValidTimestamp_(data.timestamp);
  const formattedTime = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  const formattedDate = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy");
  const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][timestamp.getDay()];
  const activityType = data.activityType || "activity";
  const studentId = String(data.studentId || "").trim();
  const nis = String(data.nis || "").trim();
  const absen = String(data.absen || "").trim();
  const kelas = String(data.kelas || "").trim();

  // Batasi reading maksimal 5 log per siswa per pertemuan.
  if (activityType === "reading" && countActivityForStudent_(sheet, studentId, nis, absen, kelas, data.name, "reading") >= 5) {
    return { sheet: sheetName, row: sheet.getLastRow(), type: activityType, skipped: true, message: "Reading sudah mencapai batas 5 kali." };
  }

  // Hentikan pencatatan jika total aktivitas sudah mencapai 10 per siswa per pertemuan.
  if (countAllActivitiesForStudent_(sheet, studentId, nis, absen, kelas, data.name) >= 10) {
    return { sheet: sheetName, row: sheet.getLastRow(), type: activityType, skipped: true, message: "Aktivitas sudah mencapai batas 10 kali per pertemuan." };
  }

  sheet.appendRow([
    formattedTime,
    formattedDate,
    dayName,
    data.name,
    activityType,
    data.description || "Aktivitas",
    1,
    studentId,
    nis,
    absen,
    kelas
  ]);
  sheet.autoResizeColumns(1, 11);

  return { sheet: sheetName, row: sheet.getLastRow(), type: data.activityType };
}

function setupHeader(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight("bold");
  range.setBackground("#6750a4");
  range.setFontColor("white");
  range.setHorizontalAlignment("center");
}

// --- FUNGSI AGREGASI & PEMBACAAN ---

function updateSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  const studentStats = {};

  allSheets.forEach(sheet => {
    const name = sheet.getName();
    if (name === "Rangkuman" || sheet.getLastRow() <= 1) return;
    
    const isKuis = name.includes(" - Kuis");
    const isAktivitas = name.includes(" - Aktivitas");
    if (!isKuis && !isAktivitas) return;
    const pertemuanName = name.replace(" - Kuis", "").replace(" - Aktivitas", "");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Quiz: nama kolom 2, studentId kolom 6; Aktivitas: nama kolom 4, studentId kolom 8.
      const studentName = String(row[isAktivitas ? 3 : 1] || "").trim();
      const studentId = String(row[isAktivitas ? 7 : 5] || "").trim();
      if (!studentName) continue;
      const key = studentId || studentName;

      if (!studentStats[key]) {
        studentStats[key] = { studentId: studentId, nis: String(row[isAktivitas ? 8 : 6] || ""), absen: String(row[isAktivitas ? 9 : 7] || ""), kelas: String(row[isAktivitas ? 10 : 8] || ""), nama: studentName, totalKuis: 0, totalScore: 0, highestScore: 0, lowestScore: 100, reading: 0, quizActivity: 0, discussion: 0, download: 0, assignment: 0, totalActivity: 0, pertemuan: [], lastQuizStatus: "", kuisFormatif: 0, kuisSumatif: 0, skorUts: 0, skorUas: 0 };
      }

      const s = studentStats[key];
      if (isKuis) {
        const score = parseInt(row[2]) || 0;
        const category = String(row[9] || "formatif").toLowerCase();
        s.totalKuis++; s.totalScore += score;
        s.quizActivity++;
        if (score > s.highestScore) s.highestScore = score;
        if (score < s.lowestScore) s.lowestScore = score;
        s.lastQuizStatus = row[4] || "";
        if (category === "formatif") s.kuisFormatif++;
        else if (category === "sumatif" || category === "s") s.kuisSumatif++;
        else if (category === "uts") s.skorUts = Math.max(s.skorUts, score);
        else if (category === "uas") s.skorUas = Math.max(s.skorUas, score);
      }
      if (isAktivitas) {
        const type = row[4] || "activity";
        s.totalActivity++;
        if (type === "reading") s.reading = Math.min(s.reading + 1, 5);
        else if (type === "quiz") s.quizActivity++;
        else if (type === "discussion") s.discussion++;
        else if (type === "download") s.download++;
        else if (type === "assignment") s.assignment++;
      }
      if (!s.pertemuan.includes(pertemuanName)) s.pertemuan.push(pertemuanName);
    }
  });

  let summarySheet = ss.getSheetByName("Rangkuman");
  if (!summarySheet) { summarySheet = ss.insertSheet("Rangkuman"); }
  summarySheet.clear();

  const headers = ["Student ID", "NIS", "Nama", "Absen", "Kelas", "Total Kuis", "Rata-rata Skor", "Skor Tertinggi", "Skor Terendah", "Total Aktivitas", "Reading", "Quiz Activity", "Assignment", "Discussion", "Download", "Kuis Formatif", "Kuis Sumatif", "Skor UTS", "Skor UAS", "Jumlah Pertemuan", "Status Kuis Terakhir"];
  const hRange = summarySheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setFontWeight("bold");
  hRange.setBackground("#6750a4");
  hRange.setFontColor("white");
  hRange.setHorizontalAlignment("center");

  let rowNum = 2;
  Object.entries(studentStats).forEach(([, stats]) => {
    const avg = stats.totalKuis > 0 ? Math.round(stats.totalScore / stats.totalKuis) : 0;
    summarySheet.getRange(rowNum, 1, 1, headers.length).setValues([[
      stats.studentId, stats.nis, stats.nama, stats.absen, stats.kelas,
      stats.totalKuis, avg, stats.highestScore, stats.lowestScore,
      stats.totalActivity, stats.reading, stats.quizActivity, stats.assignment, stats.discussion, stats.download,
      stats.kuisFormatif, stats.kuisSumatif, stats.skorUts, stats.skorUas,
      stats.pertemuan.length, stats.lastQuizStatus || "N/A"
    ]]);
    
    if (stats.lastQuizStatus === "LULUS") summarySheet.getRange(rowNum, 1, 1, headers.length).setBackground("#d1fae5");
    else if (stats.lastQuizStatus === "TIDAK LULUS") summarySheet.getRange(rowNum, 1, 1, headers.length).setBackground("#fee2e2");
    rowNum++;
  });
  summarySheet.autoResizeColumns(1, headers.length);
}

function getSheetList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = ss.getSheets().map(s => s.getName()).filter(n => n !== "Rangkuman");
  return { status: "ok", pertemuan: list };
}

function getLeaderboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName("Rangkuman");
  if (!summarySheet || summarySheet.getLastRow() <= 1) return { status: "ok", message: "Belum ada data.", leaderboard: [] };

  const data = summarySheet.getDataRange().getValues();
  const headers = data[0];
  const leaderboard = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = data[i][idx] || ""; });
    leaderboard.push(row);
  }
  leaderboard.sort((a, b) => (parseInt(b["Rata-rata Skor"]) || 0) - (parseInt(a["Rata-rata Skor"]) || 0));
  return { status: "ok", leaderboard };
}

function getStudentSummary(studentName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName("Rangkuman");
  if (!summarySheet) return { status: "error", message: "Sheet Rangkuman belum ada." };

  const data = summarySheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === studentName.trim().toLowerCase()) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = data[i][idx] || ""; });
      return { status: "ok", data: row };
    }
  }
  return { status: "not_found", message: "Siswa tidak ditemukan." };
}

function getPertemuanData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const quizSheet = ss.getSheetByName(sheetName + " - Kuis");
  const result = [];
  if (quizSheet) {
    const data = quizSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (!data[i][1]) continue;
      result.push({ timestamp: data[i][0], nama: data[i][1], skor: parseInt(data[i][2]) || 0, totalSoal: parseInt(data[i][3]) || 5, status: data[i][4] || "" });
    }
  }
  return { status: "ok", pertemuan: sheetName, siswa: result };
}

function getAktivitasLog(sheetName, studentName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actSheet = ss.getSheetByName(sheetName + " - Aktivitas");
  const result = [];
  if (actSheet) {
    const data = actSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowName = String(data[i][3] || "").trim().toLowerCase();
      if (studentName && rowName !== studentName.trim().toLowerCase()) continue;
      result.push({ timestamp: data[i][0], nama: data[i][3], type: data[i][4] || "", deskripsi: data[i][5] || "", count: data[i][6] || 1 });
    }
  }
  return { status: "ok", pertemuan: sheetName, aktivitas: result };
}

// --- FUNGSI NILAI AKUMULASI RAPOR ---

function getStudentScores(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Coba ambil dari sheet Akumulasi Nilai Rapor dulu (sudah di-generate)
  const reportSheet = ss.getSheetByName("Akumulasi Nilai Rapor");
  if (reportSheet && reportSheet.getLastRow() > 1) {
    const data = reportSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() !== studentId) continue;
      return { status: "ok", data: {
        studentId: data[i][0],
        nama: data[i][2],
        kehadiran: parseInt(data[i][7]) || 0,
        ulanganHarian: { average: parseInt(data[i][8]) || 0, highest: parseInt(data[i][8]) || 0, count: parseInt(data[i][5]) || 0, all: [] },
        uts: { highest: parseInt(data[i][9]) || 0, all: [] },
        uas: { highest: parseInt(data[i][10]) || 0, all: [] },
        nilaiAkhir: parseFloat(data[i][11]) || 0,
        grade: data[i][12] || "N/A"
      }};
    }
  }

  // Fallback: hitung dari sheet kuis masing-masing
  const allSheets = ss.getSheets();
  const result = {
    studentId: studentId,
    ulanganHarian: { highest: 0, average: 0, sum: 0, count: 0, all: [] },
    uts: { highest: 0, all: [] },
    uas: { highest: 0, all: [] },
    formatif: { count: 0, all: [] }
  };

  allSheets.forEach(sheet => {
    const name = sheet.getName();
    if (name === "Rangkuman" || name === "Akumulasi Nilai Rapor" || name === "Users" || !name.includes(" - Kuis")) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][5] || "").trim() !== studentId) continue;
      const score = parseInt(data[i][2]) || 0;
      const category = String(data[i][9] || "formatif").toLowerCase();
      const pertemuan = name.replace(" - Kuis", "");
      if (category === "ulangan_harian") {
        result.ulanganHarian.all.push({ score, pertemuan });
        result.ulanganHarian.sum += score;
        result.ulanganHarian.count++;
        if (score > result.ulanganHarian.highest) result.ulanganHarian.highest = score;
      } else if (category === "uts") {
        result.uts.all.push({ score, pertemuan });
        if (score > result.uts.highest) result.uts.highest = score;
      } else if (category === "uas") {
        result.uas.all.push({ score, pertemuan });
        if (score > result.uas.highest) result.uas.highest = score;
      } else {
        result.formatif.all.push({ score, pertemuan });
        result.formatif.count++;
      }
    }
  });

  if (result.ulanganHarian.count > 0) {
    result.ulanganHarian.average = Math.round(result.ulanganHarian.sum / result.ulanganHarian.count);
  }

  return { status: "ok", data: result };
}

function generateReport(weights) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  const studentStats = {};

  // Dynamic weights from client, fallback to 1:3:2:2
  const wAtt = (weights && parseInt(weights.attendanceWeight)) || 1;
  const wUH = (weights && parseInt(weights.ulanganHarianWeight)) || 3;
  const wUts = (weights && parseInt(weights.utsWeight)) || 2;
  const wUas = (weights && parseInt(weights.uasWeight)) || 2;
  const tw = wAtt + wUH + wUts + wUas;

  allSheets.forEach(sheet => {
    const name = sheet.getName();
    if (name === "Rangkuman" || name === "Akumulasi Nilai Rapor" || name === "Users" || sheet.getLastRow() <= 1) return;
    if (!name.includes(" - Kuis") && !name.includes(" - Aktivitas")) return;
    const isKuis = name.includes(" - Kuis");
    const isAktivitas = name.includes(" - Aktivitas");
    const pertemuanName = name.replace(" - Kuis", "").replace(" - Aktivitas", "");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentName = String(row[isAktivitas ? 3 : 1] || "").trim();
      const studentId = String(row[isAktivitas ? 7 : 5] || "").trim();
      if (!studentName) continue;
      const key = studentId || studentName;

      if (!studentStats[key]) {
        studentStats[key] = {
          studentId: studentId,
          nis: String(row[isAktivitas ? 8 : 6] || ""),
          absen: String(row[isAktivitas ? 9 : 7] || ""),
          kelas: String(row[isAktivitas ? 10 : 8] || ""),
          nama: studentName,
          pertemuanActivities: {},
          uhScores: [],
          highestUTS: 0,
          highestUAS: 0
        };
      }

      const s = studentStats[key];
      if (isKuis) {
        const score = parseInt(row[2]) || 0;
        const category = String(row[9] || "formatif").toLowerCase();
        if (category === "ulangan_harian") s.uhScores.push(score);
        else if (category === "uts" && score > s.highestUTS) s.highestUTS = score;
        else if (category === "uas" && score > s.highestUAS) s.highestUAS = score;
      }
      if (isAktivitas) {
        if (!s.pertemuanActivities[pertemuanName]) s.pertemuanActivities[pertemuanName] = 0;
        s.pertemuanActivities[pertemuanName]++;
      }
    }
  });

  let reportSheet = ss.getSheetByName("Akumulasi Nilai Rapor");
  if (reportSheet) reportSheet.clear();
  else reportSheet = ss.insertSheet("Akumulasi Nilai Rapor");

  const headers = ["Student ID", "NIS", "Nama", "Absen", "Kelas", "Jumlah Pertemuan", "Rata Aktivitas/Pertemuan", "Kehadiran (skala 100)", "Rata-rata UH", "Skor UTS", "Skor UAS", "Nilai Akhir", "Grade"];
  const hRange = reportSheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setFontWeight("bold");
  hRange.setBackground("#6750a4");
  hRange.setFontColor("white");
  hRange.setHorizontalAlignment("center");

  let rowNum = 2;
  Object.values(studentStats).forEach(s => {
    const pertemuanCount = Object.keys(s.pertemuanActivities).length;
    const totalActivities = Object.values(s.pertemuanActivities).reduce((a, b) => a + b, 0);
    const avgPerPertemuan = pertemuanCount > 0 ? Math.round(totalActivities / pertemuanCount) : 0;
    const kehadiran = Math.min(avgPerPertemuan * 10, 100);
    const uh = s.uhScores.length > 0 ? Math.round(s.uhScores.reduce((a, b) => a + b, 0) / s.uhScores.length) : 0;
    const uts = s.highestUTS;
    const uas = s.highestUAS;
    const total = (kehadiran * wAtt/tw) + (uh * wUH/tw) + (uts * wUts/tw) + (uas * wUas/tw);
    const finalScore = Math.round(total * 10) / 10;
    const grade = finalScore >= 85 ? "A" : finalScore >= 75 ? "B+" : finalScore >= 65 ? "B" : finalScore >= 55 ? "C+" : finalScore >= 45 ? "C" : finalScore >= 35 ? "D" : "E";

    reportSheet.getRange(rowNum, 1, 1, headers.length).setValues([[
      s.studentId, s.nis, s.nama, s.absen, s.kelas,
      pertemuanCount, avgPerPertemuan, kehadiran,
      uh, uts, uas, finalScore, grade
    ]]);
    rowNum++;
  });

  reportSheet.autoResizeColumns(1, headers.length);
  return { status: "ok", message: "Laporan Akumulasi Nilai Rapor berhasil digenerate!", sheetName: "Akumulasi Nilai Rapor", totalSiswa: rowNum - 2, weights: { attendanceWeight: wAtt, ulanganHarianWeight: wUH, utsWeight: wUts, uasWeight: wUas, totalWeight: tw } };
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStudentRoster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = ss.getSheetByName("Users");
  const roster = [];

  // Read all registered users
  const users = [];
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      users.push({
        studentId: String(data[i][0] || "").trim(),
        nis: String(data[i][1] || "").trim(),
        nama: String(data[i][2] || "").trim(),
        email: String(data[i][3] || "").trim(),
        absen: String(data[i][4] || "").trim(),
        kelas: String(data[i][5] || "").trim()
      });
    }
  }

  // Read Akumulasi Nilai Rapor for scores
  const reportSheet = ss.getSheetByName("Akumulasi Nilai Rapor");
  const reportData = {};
  if (reportSheet && reportSheet.getLastRow() > 1) {
    const data = reportSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const sid = String(data[i][0] || "").trim();
      if (!sid) continue;
      reportData[sid] = {
        pertemuan: parseInt(data[i][5]) || 0,
        avgAktivitas: parseInt(data[i][6]) || 0,
        kehadiran: parseInt(data[i][7]) || 0,
        uh: parseInt(data[i][8]) || 0,
        uts: parseInt(data[i][9]) || 0,
        uas: parseInt(data[i][10]) || 0,
        nilaiAkhir: parseFloat(data[i][11]) || 0,
        grade: String(data[i][12] || "N/A").trim()
      };
    }
  }

  // Count total activities per student from * - Aktivitas sheets
  const actCounts = {};
  const allSheets = ss.getSheets();
  allSheets.forEach(sheet => {
    const name = sheet.getName();
    if (!name.includes(" - Aktivitas") || sheet.getLastRow() <= 1) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const sid = String(data[i][7] || "").trim();
      if (!sid) continue;
      actCounts[sid] = (actCounts[sid] || 0) + 1;
    }
  });

  users.forEach(u => {
    const report = reportData[u.studentId] || {};
    const totalActivities = actCounts[u.studentId] || 0;
    const nilaiAkhir = report.nilaiAkhir || 0;
    let statusAktivitas = "Belum Ada Aktivitas";
    let emoji = "📭";
    if (totalActivities >= 25) { statusAktivitas = "Sangat Aktif"; emoji = "🔥"; }
    else if (totalActivities >= 15) { statusAktivitas = "Konsisten"; emoji = "✅"; }
    else if (totalActivities >= 8) { statusAktivitas = "Aktif"; emoji = "📘"; }
    else if (totalActivities >= 3) { statusAktivitas = "Kurang Konsisten"; emoji = "⚠️"; }
    else if (totalActivities > 0) { statusAktivitas = "Minim"; emoji = "🟡"; }

    roster.push({
      studentId: u.studentId,
      nama: u.nama,
      nis: u.nis,
      absen: u.absen,
      kelas: u.kelas,
      totalActivities: totalActivities,
      statusAktivitas: statusAktivitas,
      emoji: emoji,
      logAktivitas: totalActivities + " aktivitas",
      nilaiAkhir: nilaiAkhir,
      grade: report.grade || "N/A",
      kehadiran: report.kehadiran || 0,
      uh: report.uh || 0,
      uts: report.uts || 0,
      uas: report.uas || 0
    });
  });

  // Sort by nilaiAkhir descending
  roster.sort((a, b) => b.nilaiAkhir - a.nilaiAkhir);

  return { status: "ok", roster: roster, total: roster.length };
}

// --- FUNGSI TESTING ---
function test() {
  saveQuiz({ name: "Andi", score: 85, sheet: "Pertemuan 1", timestamp: new Date().toISOString(), totalQuestions: 5 });
  saveAttendance({ name: "Andi", sheet: "Pertemuan 1", timestamp: new Date().toISOString(), activityType: "reading", description: "Membaca modul" });
  saveQuiz({ name: "Budi", score: 60, sheet: "Pertemuan 1", timestamp: new Date().toISOString(), totalQuestions: 5 });
  updateSummary();
  Logger.log("✅ Test complete! Cek sheet 'Pertemuan 1 - Kuis', 'Pertemuan 1 - Aktivitas', dan 'Rangkuman'.");
}


// ============================================
// AUTH SYSTEM - key: NIS + Email
// Sheet "Users" structure:
// | StudentID | NIS | Nama | Email | Absen | Kelas | RegisteredAt | LastLogin |
// ============================================

function getUsersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  const headers = ["StudentID", "NIS", "Nama", "Email", "Absen", "Kelas", "RegisteredAt", "LastLogin"];

  if (!sheet) {
    sheet = ss.insertSheet("Users");
    setupHeader(sheet, headers);
    return sheet;
  }

  // Migrate the old five-column Users sheet without losing existing data.
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  if (currentHeaders[1] !== "NIS") {
    sheet.insertColumnsAfter(1, 1); // NIS after StudentID
    sheet.insertColumnsAfter(4, 2); // Absen and Kelas after Email
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function registerUser(data) {
  const sheet = getUsersSheet_();

  const nama = (data.nama || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const nis = (data.nis || "").trim();
  const absen = (data.absen || "").trim();
  const kelas = (data.kelas || "").trim();

  if (!nis) return { status: "error", message: "NIS wajib diisi" };
  if (!nama || nama.length < 3) return { status: "error", message: "Nama minimal 3 karakter" };
  if (!email || !email.includes("@")) return { status: "error", message: "Email tidak valid" };
  if (!absen) return { status: "error", message: "Nomor absen wajib diisi" };
  if (!kelas) return { status: "error", message: "Kelas wajib diisi" };

  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    const rowNis = String(existing[i][1] || "").trim();
    const rowEmail = String(existing[i][3] || "").trim().toLowerCase();
    if (rowNis === nis || rowEmail === email) {
      return { status: "exists", message: "NIS atau email sudah terdaftar. Silakan login." };
    }
  }

  const studentId = "STD-" + new Date().getTime().toString().slice(-8);
  const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  sheet.appendRow([studentId, nis, nama, email, absen, kelas, now, now]);

  return {
    status: "success",
    message: "Registrasi berhasil!",
    studentId: studentId,
    nama: nama,
    email: email,
    nis: nis,
    absen: absen,
    kelas: kelas
  };
}

function loginUser(data) {
  const sheet = getUsersSheet_();
  if (sheet.getLastRow() <= 1) {
    return { status: "error", message: "Belum ada user terdaftar. Silakan register dulu." };
  }

  const nis = (data.nis || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const rowNis = String(rows[i][1] || "").trim();
    const rowEmail = String(rows[i][3] || "").trim().toLowerCase();
    if (rowNis === nis && rowEmail === email) {
      const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
      sheet.getRange(i + 1, 8).setValue(now);
      return {
        status: "success",
        message: "Login berhasil!",
        studentId: rows[i][0],
        nis: rows[i][1],
        nama: rows[i][2],
        email: rows[i][3],
        absen: rows[i][4],
        kelas: rows[i][5]
      };
    }
  }
  return { status: "error", message: "NIS atau email salah" };
}

function verifyUser(studentId) {
  const sheet = getUsersSheet_();
  if (sheet.getLastRow() <= 1) return { status: "error", message: "User tidak ditemukan" };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === studentId) {
      return {
        status: "success",
        studentId: rows[i][0],
        nis: rows[i][1],
        nama: rows[i][2],
        email: rows[i][3],
        absen: rows[i][4],
        kelas: rows[i][5]
      };
    }
  }
  return { status: "error", message: "Student ID tidak valid" };
}
