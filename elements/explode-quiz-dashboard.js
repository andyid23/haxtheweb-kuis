import { LitElement, html, css } from "lit";
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import * as d3 from "d3";

// Import Material Design components
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/progress/circular-progress.js";
import "@material/web/tabs/tabs.js";
import "@material/web/tabs/primary-tab.js";

class ExplodeQuizDashboard extends LitElement {
  static get tag() {
    return "explode-quiz-dashboard";
  }

  static get properties() {
    return {
      spreadsheetId: { type: String, attribute: "spreadsheet-id" },
      accessToken: { type: String, attribute: "access-token" },
      _user: { type: Object },
      _accessToken: { type: String },
      _loading: { type: Boolean },
      _activeTab: { type: Number },
      _spreadsheetId: { type: String },
      _spreadsheetUrl: { type: String },
      _leaderboard: { type: Array },
      _syncing: { type: Boolean },
      _errorMsg: { type: String },
      _successMsg: { type: String },
      _customQuestions: { type: Array },
      _showFirebaseConfigForm: { type: Boolean },
      _customFirebaseConfigInput: { type: String }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
        color: #1c1b1f;
        background-color: #fef7ff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
      }

      .title-section h1 {
        font-size: 24px;
        font-weight: 500;
        margin: 0 0 4px 0;
        color: #6750a4;
      }

      .title-section p {
        font-size: 14px;
        margin: 0;
        color: #49454f;
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #e8def8;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-info {
        font-size: 14px;
      }

      .user-name {
        font-weight: 500;
      }

      .user-email {
        color: #49454f;
        font-size: 12px;
      }

      .setup-card {
        background-color: #ffffff;
        border: 1px solid #cac4d0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .setup-card h2 {
        font-size: 18px;
        font-weight: 500;
        margin: 0 0 12px 0;
        color: #1c1b1f;
      }

      .setup-row {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .input-field {
        flex: 1;
        min-width: 280px;
      }

      .tab-container {
        margin-bottom: 24px;
        border-bottom: 1px solid #cac4d0;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        background-color: #f3edf7;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }

      .stat-label {
        font-size: 12px;
        color: #49454f;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 500;
        color: #6750a4;
      }

      .main-content {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #cac4d0;
        min-height: 400px;
      }

      .leaderboard-section {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
      }

      @media (min-width: 900px) {
        .leaderboard-section {
          grid-template-columns: 1fr 1fr;
        }
      }

      .table-wrapper {
        overflow-x: auto;
        border: 1px solid #cac4d0;
        border-radius: 8px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 14px;
      }

      th {
        background-color: #f3edf7;
        color: #1c1b1f;
        font-weight: 500;
        padding: 12px;
        border-bottom: 1px solid #cac4d0;
      }

      td {
        padding: 12px;
        border-bottom: 1px solid #cac4d0;
        color: #49454f;
      }

      tr:last-child td {
        border-bottom: none;
      }

      .chart-card {
        background-color: #ffffff;
        border: 1px solid #cac4d0;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .chart-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 16px;
        color: #49454f;
        align-self: flex-start;
      }

      #d3-chart {
        width: 100%;
        height: 280px;
      }

      .auth-prompt {
        text-align: center;
        padding: 48px 24px;
      }

      .auth-prompt svg {
        width: 64px;
        height: 64px;
        fill: #6750a4;
        margin-bottom: 16px;
      }

      .auth-prompt h2 {
        font-size: 20px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .auth-prompt p {
        color: #49454f;
        margin-bottom: 24px;
        font-size: 14px;
      }

      .iframe-notice {
        background-color: #fff8e1;
        border: 1px solid #ffe082;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }

      .iframe-notice p {
        margin: 0 0 12px 0;
        color: #5d4037;
        font-size: 13px;
        line-height: 1.5;
      }

      .iframe-notice-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: #ffb300;
        color: #000;
        text-decoration: none;
        font-weight: bold;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 13px;
        transition: background-color 0.2s;
      }

      .iframe-notice-link:hover {
        background-color: #ffa000;
      }

      .msg {
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 14px;
        white-space: pre-line;
        line-height: 1.5;
      }

      .msg-error {
        background-color: #ffeef0;
        color: #ba1a1a;
        border: 1px solid #ffb4ab;
      }

      .msg-success {
        background-color: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #a5d6a7;
      }

      .loader-overlay {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }

      /* Official Google Sign-In Button CSS */
      .gsi-material-button {
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        -webkit-appearance: none;
        background-color: WHITE;
        background-image: none;
        border: 1px solid #747775;
        -webkit-border-radius: 20px;
        border-radius: 20px;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        color: #1f1f1f;
        cursor: pointer;
        font-family: 'Roboto', arial, sans-serif;
        font-size: 14px;
        height: 40px;
        letter-spacing: 0.25px;
        outline: none;
        padding: 0 12px;
        position: relative;
        text-align: center;
        transition: background-color .218s, border-color .218s, box-shadow .218s;
        vertical-align: middle;
        white-space: nowrap;
        width: auto;
        max-width: 400px;
        min-width: min-content;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .gsi-material-button .gsi-material-button-icon {
        height: 20px;
        margin-right: 12px;
        min-width: 20px;
        width: 20px;
      }

      .gsi-material-button .gsi-material-button-content-wrapper {
        -webkit-align-items: center;
        align-items: center;
        display: flex;
        -webkit-flex-direction: row;
        flex-direction: row;
        -webkit-flex-wrap: nowrap;
        flex-wrap: nowrap;
        height: 100%;
        justify-content: space-between;
        position: relative;
        width: 100%;
      }

      .gsi-material-button .gsi-material-button-contents {
        -webkit-flex-grow: 1;
        flex-grow: 1;
        font-family: 'Google Sans',arial,sans-serif;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: top;
      }

      .gsi-material-button:hover {
        -webkit-box-shadow: 0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15);
        box-shadow: 0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15);
        background-color: #F7F8F8;
      }

      .gsi-material-button:focus {
        border-color: #4285F4;
        background-color: WHITE;
      }

      .gsi-material-button:active {
        background-color: #F1F3F4;
      }

      .google-sheet-link {
        color: #6750a4;
        font-size: 14px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        font-weight: 500;
      }

      .google-sheet-link:hover {
        text-decoration: underline;
      }
    `;
  }

  _getStorageItem(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  _setStorageItem(key, val) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) {
      // ignore
    }
  }

  _removeStorageItem(key) {
    try {
      if (window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // ignore
    }
  }

  _getSessionStorageItem(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  _setSessionStorageItem(key, val) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, val);
      }
    } catch (e) {
      // ignore
    }
  }

  _removeSessionStorageItem(key) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {
      // ignore
    }
  }

   constructor() {
    super();
    this.spreadsheetId = "";
    this.accessToken = "";
    this._user = null;
    this._accessToken = "";
    this._loading = true;
    this._activeTab = 0;
    this._spreadsheetId = this._getStorageItem("explode_quiz_sheet_id") || "";
    this._spreadsheetUrl = "";
    this._leaderboard = [];
    this._syncing = false;
    this._errorMsg = "";
    this._successMsg = "";
    this._showFirebaseConfigForm = false;
    this._customFirebaseConfigInput = this._getStorageItem("explode_quiz_custom_firebase_config") || "";

    const savedQs = this._getStorageItem("explode_quiz_custom_questions");
    try {
      this._customQuestions = savedQs ? JSON.parse(savedQs) : null;
    } catch (e) {
      this._customQuestions = null;
    }

    this._initFirebase();
  }

  async _initFirebase() {
    try {
      let config = null;
      const customConfigStr = this._getStorageItem("explode_quiz_custom_firebase_config");
      if (customConfigStr) {
        try {
          config = JSON.parse(customConfigStr);
          console.log("[dashboard] Menggunakan konfigurasi Firebase kustom:", config.projectId);
        } catch (e) {
          console.error("[dashboard] Gagal memparse custom Firebase config dari localStorage:", e);
        }
      }

      if (!config) {
        const res = await fetch("/firebase-applet-config.json");
        if (!res.ok) throw new Error("Gagal memuat konfigurasi Firebase default");
        config = await res.json();
      }

      const configStr = JSON.stringify(config);
      if (this._currentConfigStr === configStr && getApps().length > 0) {
        console.log("[dashboard] Firebase sudah terinisialisasi dengan konfigurasi yang sama.");
        return;
      }
      this._currentConfigStr = configStr;
      
      let app;
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        try {
          const currentApp = getApp();
          await deleteApp(currentApp);
          app = initializeApp(config);
        } catch (e) {
          console.error("[dashboard] Gagal mereset Firebase App lama:", e);
          app = getApp();
        }
      }
      
      const auth = getAuth(app);
      
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this._user = user;
          // Retrieve token from local cache or login
          this._accessToken = this._getStorageItem("explode_quiz_oauth_token") || this._getSessionStorageItem("explode_quiz_oauth_token") || "";
        } else {
          this._user = null;
          this._accessToken = "";
          this._removeStorageItem("explode_quiz_oauth_token");
          this._removeSessionStorageItem("explode_quiz_oauth_token");
        }
        if (this._spreadsheetId) {
          this._fetchLeaderboard();
        }
        this._loading = false;
      });
    } catch (err) {
      console.error("[dashboard] Firebase init error:", err);
      this._errorMsg = "Gagal menginisialisasi Firebase Auth: " + (err instanceof Error ? err.message : String(err));
      this._loading = false;
    }
  }

  async _handleSignIn() {
    this._loading = true;
    this._errorMsg = "";
    this._successMsg = "";
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/spreadsheets");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Gagal memperoleh access token dari Google");
      }

      this._user = result.user;
      this._accessToken = credential.accessToken;
      this._setStorageItem("explode_quiz_oauth_token", this._accessToken);
      this._setSessionStorageItem("explode_quiz_oauth_token", this._accessToken);
      this._successMsg = "Berhasil masuk dengan Google!";

      if (this._spreadsheetId) {
        this._fetchLeaderboard();
      }
    } catch (err) {
      if (err && (err.code === "auth/popup-closed-by-user" || err.message?.includes("popup-closed-by-user"))) {
        this._errorMsg = "Login dibatalkan karena jendela pop-up Google ditutup sebelum selesai.";
        console.warn("[dashboard] Login popup closed by user.");
      } else if (err && (err.message?.includes("Transition was aborted") || err.message?.includes("invalid state") || err.code === "auth/popup-blocked" || err.message?.includes("popup-blocked"))) {
        this._errorMsg = `Gagal Membuka Jendela Google Login: Jendela login diblokir atau dibatalkan karena dijalankan di dalam Frame (Pratinjau AI Studio).\n\n` +
          `👉 Cara Mengatasi:\n` +
          `Silakan klik tombol "Buka Aplikasi di Tab Baru" (ikon panah keluar) di bagian kanan atas layar atau di sudut preview HAXcms untuk membuka aplikasi secara penuh di tab baru, lalu coba masuk dengan Google dari tab tersebut agar login berjalan lancar!`;
        console.warn("[dashboard] Sign-in transition aborted due to iframe constraints:", err);
      } else if (err && (err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain"))) {
        const currentDomain = window.location.hostname;
        this._errorMsg = `Error: Domain '${currentDomain}' belum terdaftar di Firebase Console Anda.\n\n` +
          `👉 Cara Mengatasi:\n` +
          `1. Buka Firebase Console untuk proyek ini.\n` +
          `2. Masuk ke bagian "Authentication", pilih tab "Settings" di kanan atas.\n` +
          `3. Pada kolom "Authorized domains", klik tombol "Add domain".\n` +
          `4. Masukkan nama domain Anda: ${currentDomain}\n` +
          `5. Klik "Save" / "Tambah", tunggu beberapa saat, lalu segarkan halaman ini dan klik "Masuk dengan Google" kembali!`;
      } else {
        console.error("[dashboard] Sign-in error:", err);
        this._errorMsg = `Gagal masuk dengan Google: ${err.message}. Jika Anda berada di dalam iframe AI Studio preview, pastikan mengklik tombol "🚀 Buka Aplikasi di Tab Baru" di atas agar login lancar.`;
      }
    } finally {
      this._loading = false;
    }
  }

  async _handleSignOut() {
    try {
      const auth = getAuth();
      await signOut(auth);
      this._user = null;
      this._accessToken = "";
      this._leaderboard = [];
      this._removeStorageItem("explode_quiz_oauth_token");
      this._removeSessionStorageItem("explode_quiz_oauth_token");
      this._successMsg = "Berhasil keluar.";
    } catch (err) {
      console.error("[dashboard] Sign-out error:", err);
    }
  }

  async _handleSaveFirebaseConfig(e) {
    if (e) e.preventDefault();
    this._errorMsg = "";
    this._successMsg = "";
    try {
      const configInputEl = this.shadowRoot.getElementById("fb-config-input");
      let inputStr = configInputEl ? configInputEl.value.trim() : "";
      if (!inputStr) {
        inputStr = (this._customFirebaseConfigInput || "").trim();
      }
      
      if (!inputStr) {
        throw new Error("Konfigurasi tidak boleh kosong.");
      }
      
      // Ambil bagian di dalam tanda kurung kurawal jika user menyalin seluruh kode JS
      const firstBrace = inputStr.indexOf('{');
      const lastBrace = inputStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        inputStr = inputStr.substring(firstBrace, lastBrace + 1);
      }

      // Bersihkan komentar satu baris (//) secara aman tanpa merusak https://
      const lines = inputStr.split('\n').map(line => {
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          const prefix = line.substring(0, commentIndex);
          if (!prefix.endsWith('http:') && !prefix.endsWith('https:')) {
            return prefix;
          }
        }
        return line;
      }).join('\n');

      // Bersihkan komentar multi-baris (/* ... */)
      let cleanStr = lines.replace(/\/\*[\s\S]*?\*\//g, "").trim();

      let config;
      try {
        // Coba parse menggunakan standar JSON
        config = JSON.parse(cleanStr);
      } catch (jsonErr) {
        // Jika gagal, coba parse sebagai object literal JavaScript (mengatasi properti tanpa tanda kutip, komentar, trailing comma, dll.)
        try {
          config = (new Function(`return (${cleanStr});`))();
        } catch (evalErr) {
          throw new Error("Format input tidak valid. Pastikan Anda menyalin seluruh baris konfigurasi, termasuk tanda kurung kurawal { ... } dari Firebase Console.");
        }
      }
      
      if (!config || typeof config !== 'object') {
        throw new Error("Format tidak valid. Konfigurasi harus berupa objek { ... }.");
      }

      if (!config.apiKey || !config.projectId) {
        throw new Error("Konfigurasi Firebase tidak lengkap. Pastikan terdapat properti 'apiKey' dan 'projectId'.");
      }

      this._setStorageItem("explode_quiz_custom_firebase_config", JSON.stringify(config));
      this._successMsg = "Konfigurasi kustom berhasil disimpan! Halaman akan dimuat ulang dalam 2 detik untuk menerapkan perubahan secara bersih...";
      this._loading = true;
      
      // Reload halaman untuk inisialisasi ulang yang bersih tanpa konflik app-deleted
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      this._errorMsg = "Gagal memproses konfigurasi: " + (err instanceof Error ? err.message : String(err));
      console.error(err);
    }
  }

  async _handleResetFirebaseConfig() {
    this._errorMsg = "";
    this._successMsg = "";
    try {
      this._removeStorageItem("explode_quiz_custom_firebase_config");
      this._customFirebaseConfigInput = "";
      this._successMsg = "Berhasil menghapus konfigurasi kustom! Mengembalikan ke default dan memuat ulang halaman...";
      this._loading = true;
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      this._errorMsg = "Gagal mereset konfigurasi: " + (err instanceof Error ? err.message : String(err));
      console.error(err);
    }
  }

  async _handleCreateSheet() {
    if (!this._accessToken) return;
    this._syncing = true;
    this._errorMsg = "";
    this._successMsg = "";
    try {
      const res = await fetch("/api/create-quiz-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Hasil Kuis Interaktif - " + (this._user?.displayName || "Dosen"),
          accessToken: this._accessToken
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      this._spreadsheetId = data.spreadsheetId;
      this._spreadsheetUrl = data.spreadsheetUrl;
      this._setStorageItem("explode_quiz_sheet_id", this._spreadsheetId);
      this._successMsg = "Berhasil membuat Spreadsheet baru di Google Drive Anda!";
      this._fetchLeaderboard();
    } catch (err) {
      console.error("[dashboard] Create sheet error:", err);
      this._errorMsg = `Gagal membuat spreadsheet: ${err.message}`;
    } finally {
      this._syncing = false;
    }
  }

  _handleConnectSheet(e) {
    e.preventDefault();
    const input = this.shadowRoot.querySelector("#sheet-input");
    let val = input?.value?.trim() || "";
    if (!val) return;

    // Extract ID if link was pasted
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      val = match[1];
    }

    this._spreadsheetId = val;
    this._setStorageItem("explode_quiz_sheet_id", this._spreadsheetId);
    this._successMsg = "Spreadsheet ID berhasil dihubungkan!";
    this._fetchLeaderboard();
  }

  async _fetchLeaderboard() {
    if (!this._spreadsheetId) return;
    this._syncing = true;
    this._errorMsg = "";
    try {
      const res = await fetch("/api/get-quiz-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          spreadsheetId: this._spreadsheetId,
          accessToken: this._accessToken || ""
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      // Skip headers
      const rows = data.values || [];
      if (rows.length > 1) {
        this._leaderboard = rows.slice(1).map(r => ({
          time: r[0],
          name: r[1],
          score: parseFloat(r[2]) || 0
        })).reverse(); // Newest first
      } else {
        this._leaderboard = [];
      }
    } catch (err) {
      console.error("[dashboard] Fetch leaderboard error:", err);
      this._errorMsg = `Gagal memuat data dari Spreadsheet: Token kadaluarsa atau ID tidak valid. Silakan Masuk kembali.`;
    } finally {
      this._syncing = false;
    }
  }

  _onQuizSaved(e) {
    this._successMsg = `Skor ${e.detail.name} sebesar ${e.detail.score} berhasil disimpan ke Google Sheets secara real-time!`;
    this._fetchLeaderboard();
  }

  _onQuestionsChanged(e) {
    const questions = e.detail.questions;
    this._customQuestions = questions;
    this._setStorageItem("explode_quiz_custom_questions", JSON.stringify(questions));
    this._successMsg = "Daftar soal kuis berhasil disimpan secara lokal dan diperbarui!";
    setTimeout(() => {
      this._successMsg = "";
    }, 4000);
  }

  updated(changedProperties) {
    let changed = false;
    if (changedProperties.has("spreadsheetId") && this.spreadsheetId) {
      this._spreadsheetId = this.spreadsheetId;
      changed = true;
    }
    if (changedProperties.has("accessToken") && this.accessToken) {
      this._accessToken = this.accessToken;
      changed = true;
    }
    if (changed && this._spreadsheetId) {
      this._fetchLeaderboard();
    }
    if (changedProperties.has("_leaderboard")) {
      this._drawChart();
    }
  }

  _drawChart() {
    const container = this.shadowRoot.querySelector("#d3-chart");
    if (!container) return;
    container.innerHTML = "";

    if (this._leaderboard.length === 0) return;

    // Build score frequency map
    const scores = this._leaderboard.map(item => item.score);
    const counts = {};
    scores.forEach(s => counts[s] = (counts[s] || 0) + 1);

    const data = Object.keys(counts).map(score => ({
      score: parseFloat(score),
      count: counts[score]
    })).sort((a, b) => a.score - b.score);

    const margin = { top: 20, right: 20, bottom: 40, left: 45 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.score))
      .padding(0.2);

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, d3.max(data, d => d.count)]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d} Pts`))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#49454f");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(Math.min(5, d3.max(data, d => d.count))))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#49454f");

    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.score))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count))
      .attr("fill", "#6750a4")
      .attr("rx", 4);

    svg.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => x(d.score) + x.bandwidth() / 2)
      .attr("y", d => y(d.count) - 6)
      .attr("text-anchor", "middle")
      .text(d => `${d.count}x`)
      .style("font-size", "11px")
      .style("fill", "#6750a4")
      .style("font-weight", "500");
  }

  _onTabChange(e) {
    this._activeTab = e.target.activeTabIndex;
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loader-overlay">
          <md-circular-progress indeterminate></md-circular-progress>
        </div>
      `;
    }

    if (!this._user && !this._spreadsheetId) {
      const inIframe = window.self !== window.top;
      return html`
        <div class="auth-prompt">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <h2>Akses Google Sheets Diperlukan</h2>
          <p>Silakan Masuk dengan Google untuk menghubungkan Kuis dengan Google Sheets Anda dan melakukan Sinkronisasi Data Real-Time.</p>
          
          ${inIframe ? html`
            <div class="iframe-notice">
              <p>⚠️ <strong>Catatan untuk Frame:</strong> Google Sign-In memerlukan komunikasi jendela pop-up yang sering kali dibatasi atau diblokir oleh browser saat dijalankan di dalam frame situs (AI Studio preview).</p>
              <a href="${window.location.href}" target="_blank" class="iframe-notice-link">
                🚀 Buka Aplikasi di Tab Baru agar Login Lancar
              </a>
            </div>
          ` : ""}

          ${this._errorMsg ? html`<div class="msg msg-error" style="max-width: 500px; margin: 0 auto 16px auto; text-align: left;">${this._errorMsg}</div>` : ""}
          ${this._successMsg ? html`<div class="msg msg-success" style="max-width: 500px; margin: 0 auto 16px auto; text-align: left;">${this._successMsg}</div>` : ""}

          <button class="gsi-material-button" @click="${this._handleSignIn}">
            <div class="gsi-material-button-state"></div>
            <div class="gsi-material-button-content-wrapper">
              <div class="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display: block;">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span class="gsi-material-button-contents">Masuk dengan Google</span>
            </div>
          </button>

          <div class="custom-fb-config-toggle" style="margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 16px;">
            <md-outlined-button @click="${() => this._showFirebaseConfigForm = !this._showFirebaseConfigForm}">
              ⚙️ ${this._showFirebaseConfigForm ? 'Sembunyikan Pengaturan Firebase' : 'Integrasikan Proyek Firebase Saya (kuis-app-2cd57)'}
            </md-outlined-button>
          </div>

          ${this._showFirebaseConfigForm ? html`
            <div class="custom-fb-config-form" style="text-align: left; background-color: #ffffff; border: 1px solid #cac4d0; border-radius: 12px; padding: 20px; margin-top: 16px; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h3 style="margin-top: 0; color: #6750a4; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <span>⚙️ Konfigurasi Firebase Kustom</span>
                ${this._getStorageItem("explode_quiz_custom_firebase_config") ? html`
                  <span style="font-size: 11px; background-color: #e8def8; color: #6750a4; padding: 2px 8px; border-radius: 99px; font-weight: normal;">Kustom Aktif</span>
                ` : ""}
              </h3>
              <p style="font-size: 13px; color: #49454f; margin-bottom: 12px; line-height: 1.4;">
                Jika Anda ingin menghubungkan aplikasi ini ke proyek Firebase pribadi Anda (seperti <code>kuis-app-2cd57</code>) untuk memudahkan login secara lokal/localhost, silakan salin dan tempel JSON konfigurasi Web App Firebase Anda di bawah ini:
              </p>
              
              <form @submit="${this._handleSaveFirebaseConfig}">
                <md-outlined-text-field
                  type="textarea"
                  id="fb-config-input"
                  rows="6"
                  style="width: 100%; margin-bottom: 12px;"
                  label="Firebase Web App Config (JSON)"
                  placeholder='{\n  "apiKey": "AIzaSy...",\n  "authDomain": "kuis-app-2cd57.firebaseapp.com",\n  "projectId": "kuis-app-2cd57",\n  ...\n}'
                  value="${this._customFirebaseConfigInput}"
                  @input="${e => this._customFirebaseConfigInput = e.target.value}"
                  required>
                </md-outlined-text-field>
                
                <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                  ${this._getStorageItem("explode_quiz_custom_firebase_config") ? html`
                    <md-outlined-button type="button" @click="${this._handleResetFirebaseConfig}" style="--md-outlined-button-label-text-color: #ba1a1a; --md-outlined-button-outline-color: #ba1a1a;">
                      Reset ke Default
                    </md-outlined-button>
                  ` : ""}
                  <md-filled-button type="submit">Simpan & Hubungkan</md-filled-button>
                </div>
              </form>

              <div class="fb-instructions" style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cac4d0; font-size: 12px; color: #49454f; line-height: 1.5;">
                <strong style="color: #6750a4; display: block; margin-bottom: 4px;">⚠️ Langkah Konfigurasi Firebase Console:</strong>
                <ol style="margin: 0; padding-left: 18px;">
                  <li>Buka proyek <strong>kuis-app-2cd57</strong> di Firebase Console.</li>
                  <li>Masuk ke menu <strong>Authentication</strong> > <strong>Sign-in method</strong>, klik <strong>Add new provider</strong>, dan aktifkan <strong>Google</strong>.</li>
                  <li>Di menu <strong>Authentication</strong> > tab <strong>Settings</strong> (di kanan atas), cari bagian <strong>Authorized domains</strong>.</li>
                  <li>Pastikan domain lokal Anda (seperti <code>localhost</code>) terdaftar di daftar Authorized Domains agar login pop-up tidak diblokir secara lokal.</li>
                </ol>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }

    // Compute stats
    const totalParticipants = this._leaderboard.length;
    const avgScore = totalParticipants > 0 
      ? Math.round((this._leaderboard.reduce((acc, curr) => acc + curr.score, 0) / totalParticipants) * 10) / 10 
      : 0;
    const highestScore = totalParticipants > 0 
      ? Math.max(...this._leaderboard.map(item => item.score)) 
      : 0;

    return html`
      <div class="header">
        <div class="title-section">
          <h1>Kuis Interaktif & Sinkronisasi Sheets</h1>
          <p>Materi Pembelajaran HAXcms dengan Integrasi Google Sheets Real-Time</p>
        </div>
        ${this._user ? html`
          <div class="user-profile">
            <div class="user-avatar">
              ${this._user.photoURL ? html`<img src="${this._user.photoURL}" alt="avatar">` : html`👤`}
            </div>
            <div class="user-info">
              <div class="user-name">${this._user.displayName}</div>
              <div class="user-email">${this._user.email}</div>
            </div>
            <md-outlined-button @click="${this._handleSignOut}">Keluar</md-outlined-button>
          </div>
        ` : html`
          <div class="user-profile">
            <div class="user-avatar">👤</div>
            <div class="user-info">
              <div class="user-name" style="color: #6750a4; font-weight: bold;">Mode Siswa (Tamu)</div>
              <div class="user-email">Hasil Kuis Disimpan Otomatis</div>
            </div>
            <md-filled-button @click="${this._handleSignIn}">Masuk Google (Dosen)</md-filled-button>
          </div>
        `}
      </div>

      ${this._user && !this._accessToken ? html`
        <div class="msg msg-error" style="background-color: #fffbeb; color: #b45309; border-color: #fcd34d; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; text-align: left; margin-bottom: 16px; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d;">
          <div style="flex: 1; min-width: 280px; font-size: 14px; line-height: 1.5;">
            ⚠️ <strong>Otorisasi Google Sheets Tidak Aktif:</strong> Anda telah masuk sebagai <strong>${this._user.email}</strong>, tetapi otorisasi Google Sheets (access token) tidak aktif atau terputus (terutama jika Anda merefresh halaman, membuka di tab baru, atau berada di mode Incognito). Silakan klik tombol di sebelah kanan untuk menghubungkan ulang akun Anda agar sinkronisasi Google Sheets berfungsi kembali.
          </div>
          <md-filled-button @click="${this._handleSignIn}">Hubungkan Ulang Google Sheets</md-filled-button>
        </div>
      ` : ""}

      ${this._errorMsg ? html`<div class="msg msg-error">${this._errorMsg}</div>` : ""}
      ${this._successMsg ? html`<div class="msg msg-success">${this._successMsg}</div>` : ""}

      ${this._user ? html`
        <div class="setup-card">
          <h2>Langkah 1: Hubungkan dengan Google Sheets</h2>
          <div class="setup-row">
            <form @submit="${this._handleConnectSheet}" style="display: flex; gap: 12px; flex: 1; align-items: center; flex-wrap: wrap;">
              <md-outlined-text-field
                id="sheet-input"
                class="input-field"
                label="Masukkan ID atau Link Google Spreadsheet"
                value="${this._spreadsheetId}"
                placeholder="Contoh: 1ix2... atau URL penuh"
                required>
              </md-outlined-text-field>
              <md-filled-button type="submit">Hubungkan ID</md-filled-button>
            </form>
            <span style="color: #49454f; font-weight: 500;">ATAU</span>
            <md-outlined-button ?disabled="${this._syncing}" @click="${this._handleCreateSheet}">
              ${this._syncing ? "Membuat..." : "Buat Spreadsheet Baru"}
            </md-outlined-button>
          </div>
          ${this._spreadsheetId ? html`
            <a class="google-sheet-link" href="https://docs.google.com/spreadsheets/d/${this._spreadsheetId}" target="_blank">
              <svg style="width: 18px; height: 18px; fill: #107c41;" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Buka Google Sheets Hasil Kuis
            </a>
          ` : ""}
        </div>
      ` : html`
        <div class="setup-card" style="background-color: #f0fdf4; border-color: #bbf7d0; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #14532d; font-size: 16px; margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
            ✅ Terhubung ke Google Spreadsheet Kelas
          </h2>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #166534;">
            Nilai kuis Anda akan langsung disinkronkan secara real-time ke lembar penilaian Google Sheets yang telah disediakan oleh Dosen.
          </p>
          <a class="google-sheet-link" style="color: #166534; margin-top: 4px;" href="https://docs.google.com/spreadsheets/d/${this._spreadsheetId}" target="_blank">
            <svg style="width: 18px; height: 18px; fill: #15803d;" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Lihat Spreadsheet Lembar Nilai
          </a>
        </div>
      `}

      <div class="tab-container">
        <md-tabs @change="${this._onTabChange}" .activeTabIndex="${this._activeTab}">
          <md-primary-tab>📝 Ambil Kuis</md-primary-tab>
          <md-primary-tab>📊 Hasil & Sinkronisasi Real-Time</md-primary-tab>
          <md-primary-tab>📅 Kehadiran & Aktivitas Otomatis</md-primary-tab>
          <md-primary-tab>📖 Panduan Penggunaan</md-primary-tab>
        </md-tabs>
      </div>

      <div class="main-content">
        ${this._activeTab === 0 ? html`
          <div>
            ${!this._spreadsheetId ? html`
              <div style="text-align: center; padding: 40px; color: #49454f;">
                <h3>⚠️ Mohon hubungkan Google Sheets terlebih dahulu di atas</h3>
                <p>Setelah terhubung, Anda dapat mulai mengerjakan kuis interaktif di sini.</p>
              </div>
            ` : html`
              <explode-quiz
                .spreadsheetId="${this._spreadsheetId}"
                .accessToken="${this._accessToken || ''}"
                .editable="${true}"
                .questions="${this._customQuestions || undefined}"
                @quiz-saved="${this._onQuizSaved}"
                @questions-changed="${this._onQuestionsChanged}">
              </explode-quiz>
            `}
          </div>
        ` : this._activeTab === 1 ? html`
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 500;">Statistik Real-Time & Hasil Kuis</h2>
              <md-filled-button ?disabled="${this._syncing}" @click="${this._fetchLeaderboard}">
                ${this._syncing ? "Mensinkronkan..." : "🔄 Sinkronisasi Sekarang"}
              </md-filled-button>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Partisipan</div>
                <div class="stat-value">${totalParticipants}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Rata-Rata Skor</div>
                <div class="stat-value">${avgScore}%</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Skor Tertinggi</div>
                <div class="stat-value">${highestScore}%</div>
              </div>
            </div>

            <div class="leaderboard-section">
              <div class="chart-card">
                <div class="chart-title">Distribusi Frekuensi Skor (D3)</div>
                <div id="d3-chart"></div>
                ${totalParticipants === 0 ? html`<div style="color: #49454f; margin-top: 60px;">Belum ada data untuk divisualisasikan</div>` : ""}
              </div>

              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500; color: #49454f;">Papan Peringkat Terkini</h3>
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Nama Siswa</th>
                        <th>Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this._leaderboard.length === 0 ? html`
                        <tr>
                          <td colspan="3" style="text-align: center; color: #888;">Belum ada data hasil kuis. Selesaikan kuis untuk menambahkan hasil.</td>
                        </tr>
                      ` : this._leaderboard.map(item => html`
                        <tr>
                          <td>${item.time}</td>
                          <td style="font-weight: 500;">${item.name}</td>
                          <td style="color: #6750a4; font-weight: bold;">${item.score}%</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ` : this._activeTab === 2 ? html`
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Automated activity logger background notifier instructions -->
            <div style="background-color: #fef7ff; border-radius: 12px; border: 1px solid #c7b3fc; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="font-size: 32px;">⏰</div>
              <div style="flex: 1;">
                <h2 style="margin: 0 0 6px 0; font-size: 16px; font-weight: bold; color: #6750a4;">A3-Tracker Background Logging Berjalan</h2>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #49454f;">
                  Komponen <code>&lt;activity-logger&gt;</code> saat ini aktif di halaman latar belakang. Setiap scroll membaca modul, unduhan referensi, komentar diskusi, dan hasil pengerjaan kuis dicatat secara otomatis untuk memvalidasi presensi Anda. Gunakan tombol melayang di pojok kanan bawah untuk rincian real-time!
                </p>
              </div>
            </div>

            <!-- Bento-style grid of Tracker metrics -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;">
              <attendance-tracker></attendance-tracker>
              <engagement-score></engagement-score>
            </div>

            <transparent-gradebook></transparent-gradebook>
          </div>
        ` : html`
          <div class="user-guide">
            <h2 style="color: #6750a4; margin-top: 0; font-size: 20px; font-weight: 500;">📖 Panduan Penggunaan Kuis Interaktif & Sinkronisasi</h2>
            
            <div class="guide-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
              <div class="guide-card" style="background: #fdfbff; padding: 20px; border-radius: 12px; border: 1px solid #eaddf0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <h3 style="color: #6750a4; margin-top: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                  <span>🚀</span> 1. Menambahkan Elemen Kuis
                </h3>
                <p style="font-size: 13.5px; line-height: 1.6; color: #49454f; margin-bottom: 0;">
                  Jika Anda menulis tag <code>&lt;explode-quiz&gt;</code> secara langsung di editor teks biasa, editor visual HAXcms akan membersihkannya dan mengubahnya menjadi tag <code>&lt;p&gt;</code>.<br><br>
                  <strong>Cara Benar:</strong><br>
                  1. Di panel kiri editor HAXcms, klik tombol <strong>Tambah Elemen (+)</strong>.<br>
                  2. Cari kata kunci <strong>"Explode Quiz"</strong> di bilah pencarian.<br>
                  3. Klik atau seret elemen ke halaman untuk menyisipkannya dengan aman.<br>
                  4. Atau, klik mode <strong>Source (HTML)</strong> di editor HAXcms lalu paste tag <code>&lt;explode-quiz&gt;&lt;/explode-quiz&gt;</code> secara langsung.
                </p>
              </div>

              <div class="guide-card" style="background: #fdfbff; padding: 20px; border-radius: 12px; border: 1px solid #eaddf0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <h3 style="color: #6750a4; margin-top: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                  <span>🛠️</span> 2. Mengedit & Menambah Soal
                </h3>
                <p style="font-size: 13.5px; line-height: 1.6; color: #49454f; margin-bottom: 0;">
                  Anda dapat mengedit soal kuis langsung dari dashboard ini tanpa masuk ke panel admin utama HAXcms:<br><br>
                  1. Masuk ke tab <strong>📝 Ambil Kuis</strong> di atas.<br>
                  2. Di bagian bawah layar kuis, klik tombol <strong>Edit Soal Kuis</strong>.<br>
                  3. Tulis pertanyaan baru, isi 4 pilihan jawaban, pilih radio jawaban yang benar, lalu klik <strong>Tambah Soal</strong>.<br>
                  4. Klik tombol <strong>Simpan & Keluar</strong> untuk menerapkan perubahan. Soal kuis kustom Anda akan disimpan secara lokal di browser secara otomatis!
                </p>
              </div>

              <div class="guide-card" style="background: #fdfbff; padding: 20px; border-radius: 12px; border: 1px solid #eaddf0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <h3 style="color: #6750a4; margin-top: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                  <span>📊</span> 3. Sinkronisasi Google Sheets
                </h3>
                <p style="font-size: 13.5px; line-height: 1.6; color: #49454f; margin-bottom: 0;">
                  Setiap kali siswa menyelesaikan kuis, hasilnya dikirim langsung ke Google Sheets Anda secara real-time:<br><br>
                  1. Pastikan Anda telah <strong>Masuk dengan Google</strong> di bagian kanan atas dashboard.<br>
                  2. Hubungkan ID Spreadsheet Anda, atau klik <strong>Buat Spreadsheet Baru</strong> untuk membuat otomatis.<br>
                  3. Klik tautan <strong>Buka Google Sheets Hasil Kuis</strong> untuk memantau data siswa.<br>
                  4. Klik <strong>Sinkronisasi Sekarang</strong> di tab Hasil untuk menyinkronkan data dan memperbarui grafik D3 serta papan peringkat terbaru.
                </p>
              </div>
            </div>

            <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 16px; border-radius: 8px; margin-top: 24px; font-size: 13.5px; color: #5d4037; line-height: 1.5; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">💡</span>
              <div>
                <strong>Tips Penting Jendela Pop-up:</strong> Layanan masuk Google memerlukan pop-up otorisasi browser. Jika Anda menjalankan situs ini di dalam iframe AI Studio preview, pastikan untuk mengklik tombol <strong>"🚀 Buka Aplikasi di Tab Baru"</strong> pada kotak login di atas agar pop-up browser tidak diblokir.
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
}

customElements.define(ExplodeQuizDashboard.tag, ExplodeQuizDashboard);
