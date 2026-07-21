/**
 * Google Apps Script untuk Menerima Hasil Kuis
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Sheets Anda
 * 2. Klik Extensions > Apps Script
 * 3. Copy-paste seluruh kode ini
 * 4. Klik "Save" (Simpan)
 * 5. Klik "Deploy" > "New deployment"
 * 6. Pilih type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"
 * 9. Klik "Deploy" dan copy URL yang diberikan
 * 10. Gunakan URL tersebut di dashboard kuis
 */

// Nama sheet tempat menyimpan hasil kuis
const SHEET_NAME = "Hasil Kuis";

/**
 * Fungsi yang dijalankan saat web app diakses via GET
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Quiz Result API is running"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi yang dijalankan saat web app menerima POST request
 * Ini yang dipanggil oleh quiz component untuk menyimpan hasil
 */
function doPost(e) {
  try {
    // Parse data yang diterima
    let data;
    
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      // Jika data dikirim sebagai form parameters
      data = {
        name: e.parameter.name || "Unknown",
        score: e.parameter.score || 0,
        timestamp: e.parameter.timestamp || new Date().toISOString()
      };
    }
    
    // Validasi data
    if (!data.name || data.score === undefined) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing required fields: name, score"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Simpan ke spreadsheet
    const result = saveToSheet(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Result saved successfully",
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error processing request:", error);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menyimpan hasil kuis ke Google Sheets
 */
function saveToSheet(data) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Buat atau dapatkan sheet "Hasil Kuis"
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    // Buat sheet baru jika belum ada
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    
    // Tambahkan header
    sheet.appendRow([
      "Timestamp",        // A: Waktu pengerjaan
      "Nama Siswa",       // B: Nama siswa
      "Skor (%)",         // C: Skor dalam persen
      "Jawaban Benar",    // D: Jumlah jawaban benar
      "Total Soal",       // E: Total soal
      "Status"            // F: Status (Lulus/Tidak Lulus)
    ]);
    
    // Format header
    const headerRange = sheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#6750a4");
    headerRange.setFontColor("white");
    headerRange.setHorizontalAlignment("center");
    
    // Set column widths
    sheet.setColumnWidth(1, 180);  // Timestamp
    sheet.setColumnWidth(2, 150);  // Nama
    sheet.setColumnWidth(3, 100);  // Skor
    sheet.setColumnWidth(4, 120);  // Jawaban Benar
    sheet.setColumnWidth(5, 100);  // Total Soal
    sheet.setColumnWidth(6, 120);  // Status
  }
  
  // Hitung jawaban benar berdasarkan skor
  const totalSoal = data.totalQuestions || 5;  // Default 5 soal
  const jawabanBenar = Math.round((data.score / 100) * totalSoal);
  
  // Tentukan status kelulusan (>= 70% dianggap lulus)
  const status = data.score >= 70 ? "LULUS" : "TIDAK LULUS";
  
  // Format timestamp
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
  const formattedTime = Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  
  // Tambahkan baris baru
  sheet.appendRow([
    formattedTime,
    data.name,
    data.score,
    jawabanBenar,
    totalSoal,
    status
  ]);
  
  // Format baris baru (warna berdasarkan status)
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow, 1, 1, 6);
  
  if (data.score >= 70) {
    range.setBackground("#d1fae5");  // Hijau muda untuk lulus
  } else {
    range.setBackground("#fee2e2");  // Merah muda untuk tidak lulus
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 6);
  
  return {
    row: lastRow,
    name: data.name,
    score: data.score,
    status: status
  };
}

/**
 * Fungsi untuk mengambil semua hasil kuis (opsional, untuk leaderboard)
 */
function getResults() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  const results = [];
  for (let i = 1; i < data.length; i++) {
    results.push({
      timestamp: data[i][0],
      name: data[i][1],
      score: data[i][2],
      correctAnswers: data[i][3],
      totalQuestions: data[i][4],
      status: data[i][5]
    });
  }
  
  return results;
}

/**
 * Fungsi untuk menghapus semua hasil (hanya untuk testing)
 */
function clearResults() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
}

/**
 * Fungsi untuk testing - bisa dijalankan langsung dari editor
 */
function testSaveResult() {
  const testData = {
    name: "Test Student",
    score: 85,
    timestamp: new Date().toISOString(),
    totalQuestions: 5
  };
  
  const result = saveToSheet(testData);
  console.log("Test result saved:", result);
}
