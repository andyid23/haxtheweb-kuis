import { LitElement, html, css } from "lit";

// Local storage keys
const LOGS_STORAGE_KEY = "a3_attendance_activity_logs";
const THRESHOLD_STORAGE_KEY = "a3_attendance_threshold_config";
const GRADES_STORAGE_KEY = "a3_attendance_grades_config";

// --- REAL ACTIVITY DATA ONLY ---
function getInitialLogs() {
  const stored = localStorage.getItem(LOGS_STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (_) { return []; }
  }

  // No seed/demo data. Fresh students start from an empty activity log.
  return [];

  // Legacy demo generator is kept unreachable for reference only.
  const logs = [];
  const now = new Date();

  // Helper to subtract days
  const subDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
  };

  // Activities to generate
  const activityTemplates = {
    reading: [
      "Membaca Modul 1: Pengenalan HAXcms",
      "Membaca Modul 2: Komponen Lit Element",
      "Membaca Modul 3: Integrasi API & State",
      "Membuka Slide Presentasi Kuliah",
      "Mengeksplorasi Halaman Pembelajaran"
    ],
    download: [
      "Mengunduh PDF Panduan Belajar.pdf",
      "Mengunduh Source Code Contoh Komponen.zip",
      "Mengunduh E-Book Referensi Kuliah.pdf"
    ],
    discussion: [
      "Mengirimkan pertanyaan di Forum Diskusi",
      "Membalas tanggapan teman di thread diskusi",
      "Memberikan tanggapan (like/reaction) di forum"
    ],
    quiz: [
      "Menyelesaikan Kuis Latihan 1 (Skor 80%)",
      "Menyelesaikan Kuis Latihan 2 (Skor 90%)",
      "Mencoba Kuis Pra-UTS (Skor 100%)"
    ]
  };

  // Populate mock data
  // Week -3 (21 to 15 days ago)
  for (let i = 21; i >= 15; i--) {
    if (i % 2 === 0) { // Active on even days
      const date = subDays(now, i);
      date.setHours(10 + (i % 4), 15 + (i % 30), 0);
      logs.push({
        id: "mock-" + Date.now() + "-" + Math.random(),
        timestamp: date.toISOString(),
        type: "reading",
        description: activityTemplates.reading[i % activityTemplates.reading.length]
      });
      if (i % 4 === 0) {
        logs.push({
          id: "mock-" + Date.now() + "-" + Math.random(),
          timestamp: subDays(date, 0).toISOString(),
          type: "download",
          description: activityTemplates.download[i % activityTemplates.download.length]
        });
      }
    }
  }

  // Week -2 (14 to 8 days ago)
  for (let i = 14; i >= 8; i--) {
    if (i % 3 !== 0) { // Active most days
      const date = subDays(now, i);
      date.setHours(9 + (i % 5), 20 + (i % 25), 0);
      logs.push({
        id: "mock-" + Date.now() + "-" + Math.random(),
        timestamp: date.toISOString(),
        type: "reading",
        description: activityTemplates.reading[i % activityTemplates.reading.length]
      });
      logs.push({
        id: "mock-" + Date.now() + "-" + Math.random(),
        timestamp: date.toISOString(),
        type: "discussion",
        description: activityTemplates.discussion[i % activityTemplates.discussion.length]
      });
    }
  }

  // Week -1 (7 to 1 days ago)
  for (let i = 7; i >= 1; i--) {
    if (i % 2 !== 0 || i === 2) {
      const date = subDays(now, i);
      date.setHours(14 + (i % 3), 5 + (i % 45), 0);
      logs.push({
        id: "mock-" + Date.now() + "-" + Math.random(),
        timestamp: date.toISOString(),
        type: "reading",
        description: activityTemplates.reading[i % activityTemplates.reading.length]
      });
      if (i === 3 || i === 7) {
        logs.push({
          id: "mock-" + Date.now() + "-" + Math.random(),
          timestamp: date.toISOString(),
          type: "quiz",
          description: activityTemplates.quiz[i % activityTemplates.quiz.length]
        });
      }
    }
  }

  // Save and return
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  return logs;
}

// Global threshold default config
const DEFAULT_THRESHOLDS = {
  minWeeklyActivities: 10,
  minReading: 5,
  minQuiz: 1,
  minAssignment: 1,
  minDiscussion: 1
};

function getThresholds() {
  const stored = localStorage.getItem(THRESHOLD_STORAGE_KEY);
  const parsed = stored ? JSON.parse(stored) : {};
  return { ...DEFAULT_THRESHOLDS, ...parsed, minReading: Math.max(parsed.minReading || 0, DEFAULT_THRESHOLDS.minReading) };
}

// Global grades config defaults — Bobot: Kehadiran(1) : Ulangan Harian(3) : UTS(2) : UAS(2) : Sikap(0) : Keterampilan(0) = Total 8
const DEFAULT_GRADES = {
  attendanceWeight: 1,
  ulanganHarianWeight: 3,
  utsWeight: 2,
  uasWeight: 2,
  attitudeWeight: 0,
  skillWeight: 0,
  totalWeight: 8,
  uts: 0,
  uas: 0,
  sikap: 0,
  keterampilan: 0
};

function getGradesConfig() {
  const stored = localStorage.getItem(GRADES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_GRADES;
}


// ==========================================
// 1. COMPONENT: <activity-logger>
// ==========================================
export class ActivityLogger extends LitElement {
  static get tag() {
    return "activity-logger";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      studentNis: { type: String, attribute: "student-nis" },
      studentAbsen: { type: String, attribute: "student-absen" },
      studentKelas: { type: String, attribute: "student-kelas" },
      _logs: { type: Array },
      _expanded: { type: Boolean },
      _toastMsg: { type: String }
    };
  }

  constructor() {
    super();
    // Tambahan: inisialisasi properti yang dapat di-bind dari atribut
    this.appsScriptUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
    this._logs = getInitialLogs();
    this._expanded = false;
    this._toastMsg = "";

    this._handleScroll = this._handleScroll.bind(this);
    this._handleClick = this._handleClick.bind(this);
    this._handleQuizSaved = this._handleQuizSaved.bind(this);
    this._handleDiscussionSaved = this._handleDiscussionSaved.bind(this);
    this._handleAssignmentSaved = this._handleAssignmentSaved.bind(this);
    this._lastScrollTime = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("scroll", this._handleScroll, { passive: true });
    window.addEventListener("click", this._handleClick);
    window.addEventListener("quiz-saved", this._handleQuizSaved);
    window.addEventListener("discussion-saved", this._handleDiscussionSaved);
    window.addEventListener("assignment-saved", this._handleAssignmentSaved);
    window.addEventListener("reading-saved", this._handleReadingSaved);
    window.addEventListener("quiz-saved", () => { this._quizCompleted = true; });
    window.addEventListener("a3-force-reload", () => {
      this._logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]");
    });
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this._handleScroll);
    window.removeEventListener("click", this._handleClick);
    window.removeEventListener("quiz-saved", this._handleQuizSaved);
    window.removeEventListener("discussion-saved", this._handleDiscussionSaved);
    window.removeEventListener("assignment-saved", this._handleAssignmentSaved);
    window.removeEventListener("reading-saved", this._handleReadingSaved);
    super.disconnectedCallback();
  }

  _handleScroll() {
    const now = Date.now();
    // Throttle scroll events to once every 60 seconds to avoid spamming logs
    if (now - this._lastScrollTime < 60000) return;

    if (window.scrollY > 300) {
      this._lastScrollTime = now;
      this.logActivity("reading", `Membaca materi pelajaran (Scroll ke baris ${Math.round(window.scrollY)}px)`);
    }
  }

  _handleClick(e) {
    // Check if clicked an anchor link or button with content
    const target = e.composedPath()[0];
    if (!target) return;

    // Detect download or link click
    if (target.tagName === "A" && target.href) {
      const isDownload = target.href.match(/\.(pdf|docx|zip|xlsx|pptx|mp4|png|jpg)$/i) || target.hasAttribute("download");
      if (isDownload) {
        const filename = target.href.substring(target.href.lastIndexOf('/') + 1) || "materi";
        this.logActivity("download", `Mengunduh file materi: ${decodeURIComponent(filename)}`);
      } else if (!target.href.includes("javascript:") && !target.href.startsWith("#")) {
        this.logActivity("reading", `Membuka tautan eksternal/internal: ${target.innerText.trim() || target.href}`);
      }
    }
    // Detect material buttons or card clicks
    else if (target.tagName === "MD-OUTLINED-BUTTON" || target.tagName === "MD-FILLED-BUTTON" || target.classList?.contains("card")) {
      const text = target.innerText || target.textContent || "";
      if (text.trim() && text.length < 50) {
        this.logActivity("reading", `Mengklik tombol menu: "${text.trim()}"`);
      }
    }
  }

  _handleQuizSaved(e) {
    const score = e.detail?.score || 0;
    this.logActivity("quiz", `Menyelesaikan Kuis Interaktif (Skor diperoleh: ${score}%)`);
  }

  _handleDiscussionSaved(e) {
    const thread = e.detail?.thread || e.detail?.title || "Umum";
    this.logActivity("discussion", `Aktif berdiskusi pada forum/chat: ${thread}`);
  }

  _handleAssignmentSaved(e) {
    const title = e.detail?.title || e.detail?.assignment || "Tugas";
    const category = e.detail?.category || "mandiri/terstruktur";
    this.logActivity("assignment", `Mengumpulkan tugas ${category}: ${title}`);
  }

  _handleReadingSaved(e) {
    const title = e.detail?.title || e.detail?.module || "Materi";
    this.logActivity("reading", `Membaca materi: ${title}`);
  }

  logActivity(type, description) {
    const newLog = {
      id: "log-" + Date.now() + "-" + Math.random(),
      timestamp: new Date().toISOString(),
      type,
      description
    };
    
    // 1. Simpan ke LocalStorage (untuk UI real-time)
    const currentLogs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]");
    currentLogs.unshift(newLog);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(currentLogs));
    this._logs = currentLogs;

    // 2. KIRIM KE APPS SCRIPT V3 (Jika URL tersedia)
  if (this.appsScriptUrl) {
    const params = new URLSearchParams({
      action: "activity",
      type: "attendance",
      timestamp: newLog.timestamp,
      name: this.studentName || "Student",
      studentId: this.studentId || "",
      nis: this.studentNis || "",
      absen: this.studentAbsen || "",
      kelas: this.studentKelas || "",
      activityType: type,
      description: description,
      sheet: this.sheetName || "Pertemuan"
    });
    const url = `${this.appsScriptUrl}?${params.toString()}`;
    fetch(url, { redirect: "follow" })
      .then(res => res.json())
      .then(data => console.log("[activity-logger] Tersimpan:", data))
      .catch(err => console.warn("[activity-logger] Gagal kirim ke Sheets:", err));
    }

    // 3. Trigger global notification event
    window.dispatchEvent(new CustomEvent("a3-activity-logged", {
      detail: newLog,
      bubbles: true,
      composed: true
    }));
    
    this._showToast(`Aktivitas tercatat: ${description.length > 35 ? description.substring(0, 35) + '...' : description}`);
  }

  _showToast(msg) {
    this._toastMsg = msg;
    setTimeout(() => {
      if (this._toastMsg === msg) {
        this._toastMsg = "";
      }
    }, 4000);
  }

  _clearLogs() {
    if (confirm("Apakah Anda yakin ingin menghapus semua log aktivitas lokal?")) {
      localStorage.removeItem(LOGS_STORAGE_KEY);
      this._logs = [];
      window.dispatchEvent(new CustomEvent("a3-activity-logged", { bubbles: true, composed: true }));
      this._showToast("Log aktivitas lokal telah dikosongkan.");
    }
  }

  _simulateActivity(type) {
    const descriptions = {
      reading: [
        "Membaca modul pembelajaran: Integrasi Google Sheets",
        "Membuka topik diskusi: Kolaborasi Pembelajaran",
        "Membaca materi penunjang pekan ini"
      ],
      download: [
        "Mengunduh file: Rencana_Pembelajaran_Semester.pdf",
        "Mengunduh file: Latihan_Kuis_LitElement.zip",
        "Mengunduh file: Panduan_Penilaian.docx"
      ],
      discussion: [
        "Memberikan komentar di forum kelas",
        "Membuat thread diskusi baru mengenai Lit Element",
        "Menjawab pertanyaan teman di chat pembelajaran"
      ],
      assignment: [
        "Mengumpulkan tugas mandiri: Ringkasan materi",
        "Mengumpulkan tugas terstruktur: Latihan integrasi data",
        "Menyelesaikan lembar kerja peserta didik"
      ]
    };

    const arr = descriptions[type];
    const desc = arr[Math.floor(Math.random() * arr.length)];
    this.logActivity(type, desc);
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
      }

      .floating-logger-pill {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background-color: #1c1b1f;
        color: #fff;
        padding: 12px 18px;
        border-radius: 50px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 13px;
        font-weight: 500;
        user-select: none;
        border: 1px solid rgba(255,255,255,0.1);
      }

      .floating-logger-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        background-color: #2b2a30;
      }

      .pulse-dot {
        width: 8px;
        height: 8px;
        background-color: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        animation: pulse 1.6s infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      .drawer {
        position: fixed;
        bottom: 84px;
        right: 24px;
        width: 380px;
        max-height: 500px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        border: 1px solid #e0e0e0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .drawer-header {
        background-color: #6750a4;
        color: white;
        padding: 16px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .drawer-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }

      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
      }

      .drawer-content {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .simulator-bar {
        background-color: #f3f0fa;
        padding: 12px;
        border-radius: 10px;
        border: 1px solid #e8e3f5;
      }

      .sim-title {
        font-size: 12px;
        font-weight: bold;
        color: #6750a4;
        margin-bottom: 8px;
      }

      .sim-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sim-btn {
        background: white;
        border: 1px solid #6750a4;
        color: #6750a4;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sim-btn:hover {
        background-color: #6750a4;
        color: white;
      }

      .logs-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
        max-height: 220px;
        overflow-y: auto;
      }

      .log-item {
        padding: 8px 10px;
        border-radius: 6px;
        background-color: #f8f9fa;
        font-size: 12px;
        border-left: 3px solid #6c757d;
        line-height: 1.4;
      }

      .log-item.reading { border-left-color: #4f46e5; }
      .log-item.download { border-left-color: #10b981; }
      .log-item.discussion { border-left-color: #f59e0b; }
      .log-item.quiz { border-left-color: #ec4899; }
      .log-item.assignment { border-left-color: #8b5cf6; }

      .log-time {
        font-size: 10px;
        color: #888;
        margin-bottom: 2px;
      }

      .drawer-footer {
        padding: 12px 16px;
        background-color: #f8f9fa;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .reset-btn {
        background: none;
        border: none;
        color: #dc3545;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: underline;
      }

      .toast {
        position: fixed;
        bottom: 90px;
        right: 24px;
        background-color: #323232;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 13px;
        z-index: 1001;
        animation: fadeInOut 4s forwards;
        max-width: 320px;
        pointer-events: none;
      }

      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(10px); }
      }

      .no-logs {
        color: #888;
        font-size: 12px;
        text-align: center;
        padding: 20px 0;
      }
    `;
  }

  render() {
    return html`
      <!-- Floating Pill -->
      <div class="floating-logger-pill" @click="${() => this._expanded = !this._expanded}">
        <span class="pulse-dot"></span>
        <span>Aktivitas Terrekam (${this._logs.length})</span>
      </div>

      <!-- Drawer Panel -->
      ${this._expanded ? html`
        <div class="drawer">
          <div class="drawer-header">
            <div class="drawer-title">
              📊 <span>Rekam Aktivitas Pembelajaran</span>
            </div>
            <button class="close-btn" @click="${() => this._expanded = false}">×</button>
          </div>
          <div class="drawer-content">
            <div class="simulator-bar">
              <div class="sim-title">Uji Coba Simulator (Sinyal Aktivitas)</div>
              <div class="sim-buttons">
                <button class="sim-btn" @click="${() => this._simulateActivity('reading')}">📖 Baca Modul</button>
                <button class="sim-btn" @click="${() => this._simulateActivity('assignment')}">📌 Tugas</button>
                <button class="sim-btn" @click="${() => this._simulateActivity('discussion')}">💬 Forum/Chat</button>
                <button class="sim-btn" @click="${() => this._simulateActivity('download')}">📥 Unduh PDF</button>
              </div>
            </div>

            <div class="sim-title" style="margin-top: 8px;">Log Real-Time Terbaru:</div>
            <div class="logs-list">
              ${this._logs.length === 0 ? html`
                <div class="no-logs">Belum ada aktivitas tercatat. Mulailah mengklik materi atau gunakan simulator di atas.</div>
              ` : this._logs.slice(0, 15).map(log => html`
                <div class="log-item ${log.type}">
                  <div class="log-time">${new Date(log.timestamp).toLocaleTimeString("id-ID")}</div>
                  <div>${log.description}</div>
                </div>
              `)}
            </div>
          </div>
          <div class="drawer-footer">
            <span style="font-size: 10px; color: #666;">Logging otomatis latar belakang aktif</span>
            <button class="reset-btn" @click="${this._clearLogs}">Set Ulang</button>
          </div>
        </div>
      ` : ""}

      <!-- Toast Popup -->
      ${this._toastMsg ? html`
        <div class="toast">
          ${this._toastMsg}
        </div>
      ` : ""}
    `;
  }
}
customElements.define(ActivityLogger.tag, ActivityLogger);


// ==========================================
// 2. COMPONENT: <attendance-tracker>
// ==========================================
export class AttendanceTracker extends LitElement {
  static get tag() {
    return "attendance-tracker";
  }

  static get properties() {
    return {
      _logs: { type: Array },
      _thresholds: { type: Object }
    };
  }

  constructor() {
    super();
    this._logs = getInitialLogs();
    this._thresholds = getThresholds();
  }

  connectedCallback() {
    super.connectedCallback();
    this._reloadHandler = () => {
      this._logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]");
      this._thresholds = getThresholds();
    };
    window.addEventListener("a3-activity-logged", this._reloadHandler);
    window.addEventListener("a3-force-reload", this._reloadHandler);
  }

  disconnectedCallback() {
    window.removeEventListener("a3-activity-logged", this._reloadHandler);
    window.removeEventListener("a3-force-reload", this._reloadHandler);
    super.disconnectedCallback();
  }

  _getWeeklyStats() {
    // We consider "current week" as logs within the last 7 days
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekLogs = this._logs.filter(log => new Date(log.timestamp) >= oneWeekAgo);

    const counts = {
      reading: weekLogs.filter(l => l.type === "reading").length,
      discussion: weekLogs.filter(l => l.type === "discussion").length,
      quiz: weekLogs.filter(l => l.type === "quiz").length,
      assignment: weekLogs.filter(l => l.type === "assignment").length,
      total: weekLogs.length
    };

    // Kriteria 100% hadir: kuis formatif + tugas + baca + forum/chat + minimal 10 aktivitas.
    const readingMet = counts.reading >= this._thresholds.minReading;
    const quizMet = counts.quiz >= this._thresholds.minQuiz;
    const assignmentMet = counts.assignment >= this._thresholds.minAssignment;
    const discussionMet = counts.discussion >= this._thresholds.minDiscussion;
    const totalMet = counts.total >= this._thresholds.minWeeklyActivities;

    const criteriaCount = (quizMet ? 1 : 0) + (assignmentMet ? 1 : 0) + (readingMet ? 1 : 0) + (discussionMet ? 1 : 0) + (totalMet ? 1 : 0);
    const attendancePercentage = Math.round((criteriaCount / 5) * 100);

    return {
      counts,
      goals: {
        reading: readingMet,
        quiz: quizMet,
        assignment: assignmentMet,
        discussion: discussionMet,
        total: totalMet
      },
      attendancePercentage,
      status: attendancePercentage >= 75 ? "HADIR" : "BELUM LENGKAP"
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
        color: #1c1b1f;
      }

      .tracker-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      }

      .flex-container {
        display: flex;
        gap: 32px;
        align-items: center;
        flex-wrap: wrap;
      }

      .gauge-section {
        flex: 1;
        min-width: 220px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .status-section {
        flex: 2;
        min-width: 280px;
      }

      /* Gauge layout */
      .gauge-wrapper {
        position: relative;
        width: 160px;
        height: 160px;
        margin-bottom: 12px;
      }

      svg {
        transform: rotate(-90deg);
        width: 160px;
        height: 160px;
      }

      circle {
        fill: none;
        stroke-width: 12;
      }

      .bg-circle {
        stroke: #f3f0fa;
      }

      .fg-circle {
        stroke: #6750a4;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .fg-circle.warning {
        stroke: #f59e0b;
      }

      .gauge-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 26px;
        font-weight: bold;
        color: #1c1b1f;
      }

      .badge {
        padding: 6px 14px;
        border-radius: 50px;
        font-size: 13px;
        font-weight: bold;
        display: inline-block;
        margin-top: 8px;
      }

      .badge.success {
        background-color: #d1fae5;
        color: #065f46;
      }

      .badge.warning {
        background-color: #fef3c7;
        color: #92400e;
      }

      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #6750a4;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .criteria-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .criteria-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 10px;
        background-color: #fcfbfe;
        border: 1px solid #f1f0f4;
        transition: all 0.2s;
      }

      .criteria-item:hover {
        background-color: #f6f5f9;
        transform: translateX(4px);
      }

      .crit-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .icon {
        font-size: 18px;
        width: 32px;
        height: 32px;
        background-color: #f3f0fa;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .crit-name {
        font-weight: 500;
        font-size: 14px;
      }

      .crit-progress {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .status-indicator {
        font-size: 20px;
      }

      .status-indicator.check {
        color: #10b981;
      }

      .status-indicator.cross {
        color: #d1d5db;
      }

      .desc-text {
        font-size: 13px;
        color: #555;
        line-height: 1.5;
        margin-bottom: 16px;
      }
    `;
  }

  render() {
    const stats = this._getWeeklyStats();

    // Gauge calculations
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.attendancePercentage / 100) * circumference;

    return html`
      <div class="tracker-card">
        <h3>📊 Kehadiran Pekan Ini (Mata Kuliah Aktif)</h3>
        <p class="desc-text">
          Sistem kehadiran dihitung secara otomatis berdasarkan <strong>Aktivitas Proses Belajar Anda</strong> dalam 7 hari terakhir. Tidak diperlukan tanda tangan manual.
        </p>

        <div class="flex-container">
          <!-- Gauge Display -->
          <div class="gauge-section">
            <div class="gauge-wrapper">
              <svg>
                <circle class="bg-circle" cx="80" cy="80" r="${radius}"></circle>
                <circle class="fg-circle ${stats.attendancePercentage < 75 ? 'warning' : ''}" 
                        cx="80" cy="80" r="${radius}" 
                        stroke-dasharray="${circumference}" 
                        stroke-dashoffset="${strokeDashoffset}"></circle>
              </svg>
              <div class="gauge-value">${stats.attendancePercentage}%</div>
            </div>
            <div style="font-size: 12px; color: #666; font-weight: 500;">Stabilitas Parameter Kehadiran</div>
            <span class="badge ${stats.attendancePercentage >= 75 ? 'success' : 'warning'}">
              Status: ${stats.status}
            </span>
          </div>

          <!-- Requirements Checklist -->
          <div class="status-section">
            <div class="criteria-list">
              <!-- Reading Modules -->
              <div class="criteria-item">
                <div class="crit-info">
                  <div class="icon">📖</div>
                  <div>
                    <div class="crit-name">Membaca Modul Pembelajaran</div>
                    <div class="crit-progress">Tercapai: ${stats.counts.reading} dari min. ${this._thresholds.minReading} kali</div>
                  </div>
                </div>
                <div class="status-indicator ${stats.goals.reading ? 'check' : 'cross'}">
                  ${stats.goals.reading ? "✅" : "⏳"}
                </div>
              </div>

              <!-- Quiz completed -->
              <div class="criteria-item">
                <div class="crit-info">
                  <div class="icon">📝</div>
                  <div>
                    <div class="crit-name">Kuis Eksplorasi / Formatif</div>
                    <div class="crit-progress">Tercapai: ${stats.counts.quiz} dari min. ${this._thresholds.minQuiz} kuis</div>
                  </div>
                </div>
                <div class="status-indicator ${stats.goals.quiz ? 'check' : 'cross'}">
                  ${stats.goals.quiz ? "✅" : "⏳"}
                </div>
              </div>

              <!-- Assignment activity -->
              <div class="criteria-item">
                <div class="crit-info">
                  <div class="icon">📌</div>
                  <div>
                    <div class="crit-name">Tugas Mandiri / Terstruktur</div>
                    <div class="crit-progress">Tercapai: ${stats.counts.assignment} dari min. ${this._thresholds.minAssignment} tugas</div>
                  </div>
                </div>
                <div class="status-indicator ${stats.goals.assignment ? 'check' : 'cross'}">
                  ${stats.goals.assignment ? "✅" : "⏳"}
                </div>
              </div>

              <!-- Discussion forum activity -->
              <div class="criteria-item">
                <div class="crit-info">
                  <div class="icon">💬</div>
                  <div>
                    <div class="crit-name">Partisipasi Forum & Diskusi</div>
                    <div class="crit-progress">Tercapai: ${stats.counts.discussion} dari min. ${this._thresholds.minDiscussion} kali</div>
                  </div>
                </div>
                <div class="status-indicator ${stats.goals.discussion ? 'check' : 'cross'}">
                  ${stats.goals.discussion ? "✅" : "⏳"}
                </div>
              </div>

              <!-- Cumulative activities -->
              <div class="criteria-item">
                <div class="crit-info">
                  <div class="icon">📈</div>
                  <div>
                    <div class="crit-name">Akumulasi Sinyal Aktivitas</div>
                    <div class="crit-progress">Tercapai: ${stats.counts.total} dari min. ${this._thresholds.minWeeklyActivities} interaksi</div>
                  </div>
                </div>
                <div class="status-indicator ${stats.goals.total ? 'check' : 'cross'}">
                  ${stats.goals.total ? "✅" : "⏳"}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define(AttendanceTracker.tag, AttendanceTracker);


// ==========================================
// 3. COMPONENT: <engagement-score>
// ==========================================
export class EngagementScore extends LitElement {
  static get tag() {
    return "engagement-score";
  }

  static get properties() {
    return {
      _logs: { type: Array },
      _selectedCell: { type: Object }
    };
  }

  constructor() {
    super();
    this._logs = getInitialLogs();
    this._selectedCell = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._reloadHandler = () => {
      this._logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]");
    };
    window.addEventListener("a3-activity-logged", this._reloadHandler);
    window.addEventListener("a3-force-reload", this._reloadHandler);
  }

  disconnectedCallback() {
    window.removeEventListener("a3-activity-logged", this._reloadHandler);
    window.removeEventListener("a3-force-reload", this._reloadHandler);
    super.disconnectedCallback();
  }

  _getActivityMap() {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const now = new Date();

    // Group logs by day offset for the past 28 days (4 weeks)
    const map = [];

    for (let offset = 27; offset >= 0; offset--) {
      const d = new Date();
      d.setDate(now.getDate() - offset);
      d.setHours(0, 0, 0, 0);

      const dayLogs = this._logs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === d.getTime();
      });

      map.push({
        date: d,
        dayName: days[d.getDay()],
        count: dayLogs.length,
        logs: dayLogs
      });
    }

    return map;
  }

  _getStreak() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let index = 0;
    let checkDate = new Date(now);

    while (index < 30) {
      const dayLogs = this._logs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });

      if (dayLogs.length > 0) {
        currentStreak++;
      } else {
        // If it's today and they have no logs yet, don't break streak if yesterday was active
        if (index === 0) {
          // just continue to check yesterday
        } else {
          break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
      index++;
    }

    return currentStreak;
  }

  _selectCell(cell) {
    this._selectedCell = cell;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
        color: #1c1b1f;
      }

      .engagement-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      }

      h3 {
        margin: 0 0 12px 0;
        font-size: 18px;
        color: #6750a4;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .consistency-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-mini-card {
        background-color: #fbf9ff;
        border: 1px solid #ece8f5;
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .mini-label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .mini-val {
        font-size: 20px;
        font-weight: bold;
        color: #6750a4;
      }

      /* Grid Heatmap styling */
      .heatmap-wrapper {
        margin: 20px 0;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      .heatmap-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        max-width: 500px;
        margin: 0 auto;
      }

      .heatmap-header-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        max-width: 500px;
        margin: 0 auto 6px auto;
        font-size: 10px;
        color: #666;
        text-align: center;
        font-weight: bold;
      }

      .cell {
        aspect-ratio: 1;
        background-color: #ebedf0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: rgba(255,255,255,0.8);
      }

      .cell:hover {
        transform: scale(1.15);
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .cell.lvl-0 { background-color: #f3f0fa; color: #9c99a6; }
      .cell.lvl-1 { background-color: #e3d9fc; color: #6750a4; }
      .cell.lvl-2 { background-color: #c7b3fc; color: #ffffff; }
      .cell.lvl-3 { background-color: #9d7bfc; color: #ffffff; }
      .cell.lvl-4 { background-color: #6750a4; color: #ffffff; }

      .cell.selected {
        border: 2px solid #1c1b1f;
        transform: scale(1.1);
      }

      .legend {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #666;
        margin-top: 14px;
      }

      .legend-box {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      /* Selected detail card */
      .detail-card {
        margin-top: 20px;
        background-color: #fcfbfe;
        border: 1px dashed #c7b3fc;
        border-radius: 12px;
        padding: 16px;
        animation: fadeIn 0.3s;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .detail-header {
        font-weight: bold;
        color: #6750a4;
        font-size: 13px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      }

      .detail-logs {
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 120px;
        overflow-y: auto;
      }

      .detail-item {
        padding: 6px 8px;
        background: white;
        border-radius: 6px;
        border-left: 3px solid #6750a4;
      }
    `;
  }

  render() {
    const activityMap = this._getActivityMap();
    const streak = this._getStreak();
    const totalInteractions = this._logs.length;

    // Calculate consistency index (percentage of days active in past 4 weeks)
    const activeDays = activityMap.filter(day => day.count > 0).length;
    const consistencyIndex = Math.round((activeDays / 28) * 100);

    return html`
      <div class="engagement-card">
        <h3>🔥 Tracker Konsistensi Pembelajaran</h3>
        <p style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 18px;">
          Pertahankan rekam aktivitas reguler Anda untuk melatih pemahaman dan memastikan validasi data kehadiran sistem.
        </p>

        <!-- Stats row -->
        <div class="consistency-stats">
          <div class="stat-mini-card">
            <span class="mini-label">Total Sinyal Aktivitas</span>
            <span class="mini-val">${totalInteractions} kali</span>
          </div>
          <div class="stat-mini-card">
            <span class="mini-label">Indeks Konsistensi (4 Pekan)</span>
            <span class="mini-val">${consistencyIndex}%</span>
          </div>
          <div class="stat-mini-card">
            <span class="mini-label">Streak Belajar Aktif</span>
            <span class="mini-val">🔥 ${streak} Hari</span>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: bold; color: #1c1b1f; margin-bottom: 10px; text-align: center;">
          Peta Pergerakan Aktivitas Harian (28 Hari Terakhir)
        </div>

        <!-- Heatmap Grid -->
        <div class="heatmap-wrapper">
          <div class="heatmap-header-days">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>
          <div class="heatmap-grid">
            ${activityMap.map(cell => {
      // Level categories based on activity counts
      let lvl = "lvl-0";
      if (cell.count > 0 && cell.count <= 2) lvl = "lvl-1";
      else if (cell.count > 2 && cell.count <= 4) lvl = "lvl-2";
      else if (cell.count > 4 && cell.count <= 7) lvl = "lvl-3";
      else if (cell.count > 7) lvl = "lvl-4";

      const isSelected = this._selectedCell && this._selectedCell.date.getTime() === cell.date.getTime();

      return html`
                <div class="cell ${lvl} ${isSelected ? 'selected' : ''}" 
                     @click="${() => this._selectCell(cell)}">
                  ${cell.count > 0 ? cell.count : ""}
                </div>
              `;
    })}
          </div>

          <div class="legend">
            <span>Sedikit</span>
            <div class="legend-box lvl-0"></div>
            <div class="legend-box lvl-1"></div>
            <div class="legend-box lvl-2"></div>
            <div class="legend-box lvl-3"></div>
            <div class="legend-box lvl-4"></div>
            <span>Banyak</span>
          </div>
        </div>

        <!-- Detail on select -->
        ${this._selectedCell ? html`
          <div class="detail-card">
            <div class="detail-header">
              <span>📅 Detail Aktivitas: ${this._selectedCell.dayName}, ${this._selectedCell.date.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span style="color: #666;">${this._selectedCell.count} Aktivitas</span>
            </div>
            <div class="detail-logs">
              ${this._selectedCell.count === 0 ? html`
                <div style="color: #888; text-align: center; padding: 10px;">Tidak ada rekam aktivitas tercatat pada hari ini.</div>
              ` : this._selectedCell.logs.map(log => html`
                <div class="detail-item">
                  <span style="color: #888; font-size: 10px; font-weight: bold; margin-right: 6px;">[${new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>${log.description}</span>
                </div>
              `)}
            </div>
          </div>
        ` : html`
          <div style="text-align: center; font-size: 11px; color: #888; margin-top: 10px;">
            💡 Klik salah satu kotak grid harian di atas untuk melihat rincian aktivitas hari tersebut!
          </div>
        `}
      </div>
    `;
  }
}
customElements.define(EngagementScore.tag, EngagementScore);


// ==========================================
// 4. COMPONENT: <transparent-gradebook>
// ==========================================
export class TransparentGradebook extends LitElement {
  static get tag() {
    return "transparent-gradebook";
  }

  static get properties() {
    return {
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      viewMode: { type: String, attribute: "view-mode" },
      showAfterQuiz: { type: Boolean, attribute: "show-after-quiz", reflect: true },
      showAfterDate: { type: String, attribute: "show-after-date" },
      _logs: { type: Array },
      _thresholds: { type: Object },
      _gradesConfig: { type: Object },
      _isLecturerMode: { type: Boolean },
      _scores: { type: Object },
      _reportStatus: { type: String },
      _roster: { type: Array }
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.studentId = "";
    this.studentName = "";
    this.viewMode = "student";
    this.showAfterQuiz = true;
    this.showAfterDate = "";
    this._quizCompleted = false;
    this._logs = getInitialLogs();
    this._thresholds = getThresholds();
    this._gradesConfig = getGradesConfig();
    this._isLecturerMode = false;
    this._scores = { ulanganHarian: { highest: 0 }, uts: { highest: 0 }, uas: { highest: 0 }, formatif: { count: 0 } };
    this._reportStatus = "";
    this._roster = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._reloadHandler = () => {
      this._logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]");
      this._thresholds = getThresholds();
      this._gradesConfig = getGradesConfig();
      this._fetchScores();
    };
    this._quizCompleteHandler = () => { this._quizCompleted = true; };
    window.addEventListener("a3-activity-logged", this._reloadHandler);
    window.addEventListener("a3-force-reload", this._reloadHandler);
    window.addEventListener("quiz-saved", this._quizCompleteHandler);
    this._fetchScores();
    this._fetchRoster();
  }

  disconnectedCallback() {
    window.removeEventListener("a3-activity-logged", this._reloadHandler);
    window.removeEventListener("a3-force-reload", this._reloadHandler);
    window.removeEventListener("quiz-saved", this._quizCompleteHandler);
    super.disconnectedCallback();
  }

  _fetchScores() {
    if (!this.appsScriptUrl || !this.studentId) {
      this._scores = { ulanganHarian: { highest: 0 }, uts: { highest: 0 }, uas: { highest: 0 }, formatif: { count: 0 } };
      return;
    }
    const url = `${this.appsScriptUrl}?action=getScores&studentId=${encodeURIComponent(this.studentId)}`;
    fetch(url, { redirect: "follow" })
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok" && data.data) this._scores = data.data;
      })
      .catch(() => {
        this._scores = { ulanganHarian: { highest: 0 }, uts: { highest: 0 }, uas: { highest: 0 }, formatif: { count: 0 } };
      });
  }

  _generateReport() {
    if (!this.appsScriptUrl) return;
    this._reportStatus = "Generating...";
    const params = new URLSearchParams({
      action: "generateReport",
      attendanceWeight: this._gradesConfig.attendanceWeight || 1,
      ulanganHarianWeight: this._gradesConfig.ulanganHarianWeight || 3,
      utsWeight: this._gradesConfig.utsWeight || 2,
      uasWeight: this._gradesConfig.uasWeight || 2,
      attitudeWeight: this._gradesConfig.attitudeWeight || 0,
      skillWeight: this._gradesConfig.skillWeight || 0
    });
    const url = `${this.appsScriptUrl}?${params.toString()}`;
    fetch(url, { redirect: "follow" })
      .then(r => r.json())
      .then(data => {
        this._reportStatus = data.status === "ok" ? `${data.message} (${data.totalSiswa} siswa)` : "Gagal generate";
        this._fetchRoster();
        setTimeout(() => { this._reportStatus = ""; }, 6000);
      })
      .catch(() => {
        this._reportStatus = "Gagal menghubungi server";
        setTimeout(() => { this._reportStatus = ""; }, 6000);
      });
  }

  _fetchRoster() {
    if (!this.appsScriptUrl) return;
    const url = `${this.appsScriptUrl}?action=getStudentRoster`;
    fetch(url, { redirect: "follow" })
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok" && data.roster) this._roster = data.roster;
      })
      .catch(() => { this._roster = []; });
  }

  _getAttendanceScore() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = this._logs.filter(log => new Date(log.timestamp) >= oneWeekAgo);

    const counts = {
      reading: Math.min(weekLogs.filter(l => l.type === "reading").length, this._thresholds.minReading),
      discussion: weekLogs.filter(l => l.type === "discussion").length,
      quiz: weekLogs.filter(l => l.type === "quiz").length,
      assignment: weekLogs.filter(l => l.type === "assignment").length,
      total: weekLogs.length
    };

    const readingMet = counts.reading >= this._thresholds.minReading;
    const quizMet = counts.quiz >= this._thresholds.minQuiz;
    const assignmentMet = counts.assignment >= this._thresholds.minAssignment;
    const discussionMet = counts.discussion >= this._thresholds.minDiscussion;
    const totalMet = counts.total >= this._thresholds.minWeeklyActivities;

    const criteriaCount = (quizMet ? 1 : 0) + (assignmentMet ? 1 : 0) + (readingMet ? 1 : 0) + (discussionMet ? 1 : 0) + (totalMet ? 1 : 0);
    const currentWeekAttendanceScore = Math.round((criteriaCount / 5) * 100);

    return {
      currentWeek: currentWeekAttendanceScore,
      overall: currentWeekAttendanceScore
    };
  }

  _shouldShowGradebook() {
    if (!this.showAfterQuiz && !this.showAfterDate) return true;
    if (this.showAfterQuiz && !this._quizCompleted) return false;
    if (this.showAfterDate && new Date() < new Date(this.showAfterDate)) return false;
    return true;
  }

  _getFinalScore() {
    const wA = this._gradesConfig.attendanceWeight || 1;
    const wU = this._gradesConfig.ulanganHarianWeight || 3;
    const wT = this._gradesConfig.utsWeight || 2;
    const wS = this._gradesConfig.uasWeight || 2;
    const wSk = this._gradesConfig.attitudeWeight || 0;
    const wKr = this._gradesConfig.skillWeight || 0;
    const tw = wA + wU + wT + wS + wSk + wKr;

    const attScore = this._scores.kehadiran || this._getAttendanceScore().overall;
    const uhScore = this._scores.ulanganHarian?.average || this._scores.ulanganHarian?.highest || 0;
    const utsScore = this._scores.uts?.highest || this._gradesConfig.uts || 0;
    const uasScore = this._scores.uas?.highest || this._gradesConfig.uas || 0;
    const sikapScore = this._scores.sikap || this._calcSikap();
    const skillScore = this._scores.keterampilan || this._calcSkill();

    const final = (attScore * wA/tw) + (uhScore * wU/tw) + (utsScore * wT/tw) +
                  (uasScore * wS/tw) + (sikapScore * wSk/tw) + (skillScore * wKr/tw);
    return Math.round(final * 10) / 10;
  }

  _calcSikap() {
    if (this._gradesConfig.sikap) return this._gradesConfig.sikap;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = this._logs.filter(l => new Date(l.timestamp) >= oneWeekAgo);
    const tasks = weekLogs.filter(l => l.type === "assignment").length;
    const forums = weekLogs.filter(l => l.type === "discussion").length;
    return Math.min((tasks * 25 + forums * 20), 100);
  }

  _calcSkill() {
    if (this._gradesConfig.keterampilan) return this._gradesConfig.keterampilan;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = this._logs.filter(l => new Date(l.timestamp) >= oneWeekAgo);
    const quizzes = weekLogs.filter(l => l.type === "quiz").length;
    const readings = weekLogs.filter(l => l.type === "reading").length;
    return Math.min((quizzes * 30 + readings * 10), 100);
  }

  _getGradeLetter(score) {
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "E";
  }

  _updateGradesConfig(e) {
    const key = e.target.id;
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      const updated = { ...this._gradesConfig, [key]: val };
      // Auto-recalculate totalWeight
      updated.totalWeight = (updated.attendanceWeight || 0) + (updated.ulanganHarianWeight || 0) + (updated.utsWeight || 0) + (updated.uasWeight || 0);
      localStorage.setItem(GRADES_STORAGE_KEY, JSON.stringify(updated));
      this._gradesConfig = updated;

      // sync with custom event
      window.dispatchEvent(new CustomEvent("a3-force-reload"));
    }
  }

  _updateThresholdConfig(e) {
    const key = e.target.id;
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      const updated = { ...this._thresholds, [key]: val };
      localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(updated));
      this._thresholds = updated;

      // sync with custom event
      window.dispatchEvent(new CustomEvent("a3-force-reload"));
    }
  }

  _resetWeights() {
    const defaults = { ...DEFAULT_GRADES };
    localStorage.setItem(GRADES_STORAGE_KEY, JSON.stringify(defaults));
    this._gradesConfig = defaults;
    window.dispatchEvent(new CustomEvent("a3-force-reload"));
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
        color: #1c1b1f;
      }

      .grade-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 18px;
        flex-wrap: wrap;
        gap: 12px;
      }

      h3 {
        margin: 0;
        font-size: 18px;
        color: #6750a4;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toggle-btn {
        background-color: #f3f0fa;
        color: #6750a4;
        border: 1px solid #ece8f5;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .toggle-btn:hover {
        background-color: #6750a4;
        color: white;
      }

      /* Grade summary bento */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }

      .summary-item {
        background: #fcfbfe;
        border: 1px solid #f1eef8;
        border-radius: 12px;
        padding: 14px;
        text-align: center;
      }

      .summary-item.highlight {
        background-color: #f3f0fa;
        border-color: #c7b3fc;
      }

      .summary-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }

      .summary-val {
        font-size: 24px;
        font-weight: bold;
        color: #1c1b1f;
        margin-top: 4px;
      }

      .summary-val.brand {
        color: #6750a4;
      }

      /* Responsive Tables */
      .table-wrapper {
        width: 100%;
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid #eee;
        margin-bottom: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 13px;
      }

      th {
        background-color: #f8f9fa;
        color: #49454f;
        font-weight: bold;
        padding: 12px 16px;
        border-bottom: 2px solid #eee;
      }

      td {
        padding: 12px 16px;
        border-bottom: 1px solid #f5f5f5;
        color: #1c1b1f;
      }

      tr:last-child td {
        border-bottom: none;
      }

      .row-category {
        font-weight: bold;
        color: #6750a4;
      }

      /* Lecturer Configuration Console */
      .lecturer-panel {
        background-color: #fcfbfe;
        border: 1px solid #6750a4;
        border-radius: 12px;
        padding: 20px;
        margin-top: 24px;
        animation: fadeIn 0.3s;
      }

      .lecturer-panel-title {
        color: #6750a4;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1px solid #ece8f5;
        padding-bottom: 8px;
      }

      .config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .config-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .config-label {
        font-size: 12px;
        font-weight: 500;
        color: #444;
      }

      .config-input {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 13px;
        background: white;
      }

      .config-input:focus {
        border-color: #6750a4;
        outline: none;
        box-shadow: 0 0 0 2px rgba(103, 80, 164, 0.2);
      }

      .weight-badge {
        font-size: 10px;
        background-color: #e3d9fc;
        color: #6750a4;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
      }

      .simulated-roster-section {
        margin-top: 16px;
      }

      .progress-bar-container {
        width: 100px;
        height: 6px;
        background-color: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background-color: #6750a4;
        border-radius: 3px;
      }
    `;
  }

  render() {
    const attendanceStats = this._getAttendanceScore();
    const uhScore = this._scores.ulanganHarian?.highest || 0;
    const utsScore = this._scores.uts?.highest || this._gradesConfig.uts || 0;
    const uasScore = this._scores.uas?.highest || this._gradesConfig.uas || 0;
    const sikapScore = this._scores.sikap || this._calcSikap();
    const skillScore = this._scores.keterampilan || this._calcSkill();
    const finalScore = this._getFinalScore();
    const gradeLetter = this._getGradeLetter(finalScore);
    const tw = (this._gradesConfig.attendanceWeight || 1) + (this._gradesConfig.ulanganHarianWeight || 3) + (this._gradesConfig.utsWeight || 2) + (this._gradesConfig.uasWeight || 2) + (this._gradesConfig.attitudeWeight || 0) + (this._gradesConfig.skillWeight || 0);
    const uhCount = this._scores.ulanganHarian?.count || 0;

    const rosterData = this._roster.length > 0 ? this._roster : [
      { nama: "Belum ada data", emoji: "📭", statusAktivitas: "Menunggu", logAktivitas: "0 aktivitas", nilaiAkhir: 0 }
    ];

    return html`
      ${this._shouldShowGradebook() ? html`
      <div class="grade-card">
        <div class="card-header">
          <h3>📖 Transparansi Nilai & Hasil Belajar</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 11px; color: #888;">Bobot: Kehadiran(${this._gradesConfig.attendanceWeight}) : UH(${this._gradesConfig.ulanganHarianWeight}) : UTS(${this._gradesConfig.utsWeight}) : UAS(${this._gradesConfig.uasWeight}) : Sikap(${this._gradesConfig.attitudeWeight}) : Skill(${this._gradesConfig.skillWeight}) = ${tw}</span>
            ${this.viewMode === "lecturer" ? html`
              <button class="toggle-btn" @click="${() => this._isLecturerMode = !this._isLecturerMode}">
                ⚙️ ${this._isLecturerMode ? "Kembali ke View Mahasiswa" : "Masuk Mode Dosen (Console)"}
              </button>
            ` : ""}
          </div>
        </div>

        <p style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 20px;">
          Bobot penilaian: <strong>Kehadiran(${this._gradesConfig.attendanceWeight}/${tw})</strong> + <strong>Ulangan Harian(${this._gradesConfig.ulanganHarianWeight}/${tw})</strong> + <strong>UTS(${this._gradesConfig.utsWeight}/${tw})</strong> + <strong>UAS(${this._gradesConfig.uasWeight}/${tw})</strong> + <strong>Sikap(${this._gradesConfig.attitudeWeight}/${tw})</strong> + <strong>Keterampilan(${this._gradesConfig.skillWeight}/${tw})</strong>. Kuis formatif hanya syarat hadir, tidak masuk akumulasi.
        </p>

        ${this._reportStatus ? html`<div class="msg msg-success">${this._reportStatus}</div>` : ""}

        <!-- Bento summary blocks -->
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Rata Kehadiran (${this._gradesConfig.attendanceWeight}/${tw})</span>
            <span class="summary-val">${attendanceStats.overall}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Skor Ulangan Harian (${this._gradesConfig.ulanganHarianWeight}/${tw})</span>
            <span class="summary-val">${uhScore}%</span>
            <span style="font-size: 11px; color: #888;">Rata-rata ${uhCount} kuis</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Skor UTS (${this._gradesConfig.utsWeight}/${tw})</span>
            <span class="summary-val">${utsScore > 0 ? utsScore + '%' : '—'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Skor UAS (${this._gradesConfig.uasWeight}/${tw})</span>
            <span class="summary-val">${uasScore > 0 ? uasScore + '%' : '—'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Sikap (${this._gradesConfig.attitudeWeight}/${tw})</span>
            <span class="summary-val">${this._gradesConfig.attitudeWeight > 0 ? sikapScore + '%' : '—'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Keterampilan (${this._gradesConfig.skillWeight}/${tw})</span>
            <span class="summary-val">${this._gradesConfig.skillWeight > 0 ? skillScore + '%' : '—'}</span>
          </div>
          <div class="summary-item highlight">
            <span class="summary-label">Nilai Akhir</span>
            <span class="summary-val brand">${finalScore}</span>
          </div>
          <div class="summary-item highlight" style="background-color: #f3f0fa;">
            <span class="summary-label">Grade Huruf</span>
            <span class="summary-val brand" style="color: #6750a4; font-size: 28px;">${gradeLetter}</span>
          </div>
        </div>

        <!-- Gradebook Table -->
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Komponen Nilai</th>
                <th>Sumber</th>
                <th>Bobot</th>
                <th>Nilai Maks</th>
                <th>Nilai Diperoleh</th>
              </tr>
            </thead>
            <tbody>
              <!-- Kehadiran -->
              <tr>
                <td class="row-category">Kehadiran (${this._gradesConfig.attendanceWeight}/${tw})</td>
                <td>Rata-rata kehadiran mingguan dari aktivitas (min 5 baca, 1 kuis, 1 tugas, 1 diskusi, 10 total)</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.attendanceWeight / tw) * 100)}%</td>
                <td>100</td>
                <td style="font-weight: bold; color: ${attendanceStats.currentWeek >= 75 ? '#059669' : '#d97706'}">
                  ${attendanceStats.overall}
                </td>
              </tr>

              <!-- Ulangan Harian -->
              <tr>
                <td class="row-category">Ulangan Harian (${this._gradesConfig.ulanganHarianWeight}/${tw})</td>
                <td>Skor tertinggi quiz kategori <code>ulangan_harian</code> (${uhCount} kuis dikerjakan)</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.ulanganHarianWeight / tw) * 100)}%</td>
                <td>100</td>
                <td style="font-weight: bold; color: #6750a4;">${uhScore}</td>
              </tr>

              <!-- UTS -->
              <tr>
                <td class="row-category">UTS (${this._gradesConfig.utsWeight}/${tw})</td>
                <td>Ujian Tengah Semester — dari quiz <code>category="uts"</code> atau input manual dosen</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.utsWeight / tw) * 100)}%</td>
                <td>100</td>
                <td>
                  ${this._isLecturerMode ? html`
                    <input type="number" id="uts" class="config-input" style="width: 70px; padding: 4px;"
                           .value="${this._gradesConfig.uts}" @change="${this._updateGradesConfig}">
                  ` : html`
                    <span style="font-weight: bold; color: ${utsScore > 0 ? '#059669' : '#999'};">${utsScore > 0 ? utsScore : '—'}</span>
                  `}
                </td>
              </tr>

              <!-- UAS -->
              <tr>
                <td class="row-category">UAS (${this._gradesConfig.uasWeight}/${tw})</td>
                <td>Ujian Akhir Semester — dari quiz <code>category="uas"</code> atau input manual dosen</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.uasWeight / tw) * 100)}%</td>
                <td>100</td>
                <td>
                  ${this._isLecturerMode ? html`
                    <input type="number" id="uas" class="config-input" style="width: 70px; padding: 4px;"
                           .value="${this._gradesConfig.uas}" @change="${this._updateGradesConfig}">
                  ` : html`
                    <span style="font-weight: bold; color: ${uasScore > 0 ? '#059669' : '#999'};">${uasScore > 0 ? uasScore : '—'}</span>
                  `}
                </td>
              </tr>

              <!-- Sikap -->
              <tr>
                <td class="row-category">Sikap (${this._gradesConfig.attitudeWeight}/${tw})</td>
                <td>Auto dari tugas + forum, atau input manual dosen</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.attitudeWeight / tw) * 100)}%</td>
                <td>100</td>
                <td>
                  ${this._isLecturerMode ? html`
                    <input type="number" id="sikap" class="config-input" style="width: 70px; padding: 4px;"
                           .value="${this._gradesConfig.sikap}" @change="${this._updateGradesConfig}">
                  ` : html`
                    <span style="font-weight: bold; color: ${sikapScore > 0 ? '#059669' : '#999'};">${this._gradesConfig.attitudeWeight > 0 ? sikapScore : '—'}</span>
                  `}
                </td>
              </tr>

              <!-- Keterampilan -->
              <tr>
                <td class="row-category">Keterampilan (${this._gradesConfig.skillWeight}/${tw})</td>
                <td>Auto dari quiz + baca, atau input manual dosen</td>
                <td style="text-align: center; font-weight: bold;">${Math.round((this._gradesConfig.skillWeight / tw) * 100)}%</td>
                <td>100</td>
                <td>
                  ${this._isLecturerMode ? html`
                    <input type="number" id="keterampilan" class="config-input" style="width: 70px; padding: 4px;"
                           .value="${this._gradesConfig.keterampilan}" @change="${this._updateGradesConfig}">
                  ` : html`
                    <span style="font-weight: bold; color: ${skillScore > 0 ? '#059669' : '#999'};">${this._gradesConfig.skillWeight > 0 ? skillScore : '—'}</span>
                  `}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Lecturer Mode Options panel -->
        ${this._isLecturerMode ? html`
          <div class="lecturer-panel">
            <div class="lecturer-panel-title">
              ⚙️ Konfigurasi Dosen & Generate Laporan
            </div>

            <div class="config-grid">
              <div class="config-group">
                <span class="config-label">Bobot Kehadiran (${this._gradesConfig.attendanceWeight}/${tw})</span>
                <input type="number" id="attendanceWeight" class="config-input"
                       .value="${this._gradesConfig.attendanceWeight}" @change="${this._updateGradesConfig}">
              </div>
              <div class="config-group">
                <span class="config-label">Bobot Ulangan Harian (${this._gradesConfig.ulanganHarianWeight}/${tw})</span>
                <input type="number" id="ulanganHarianWeight" class="config-input"
                       .value="${this._gradesConfig.ulanganHarianWeight}" @change="${this._updateGradesConfig}">
              </div>
              <div class="config-group">
                <span class="config-label">Bobot UTS (${this._gradesConfig.utsWeight}/${tw})</span>
                <input type="number" id="utsWeight" class="config-input"
                       .value="${this._gradesConfig.utsWeight}" @change="${this._updateGradesConfig}">
              </div>
              <div class="config-group">
                <span class="config-label">Bobot UAS (${this._gradesConfig.uasWeight}/${tw})</span>
                <input type="number" id="uasWeight" class="config-input"
                       .value="${this._gradesConfig.uasWeight}" @change="${this._updateGradesConfig}">
              </div>
              <div class="config-group">
                <span class="config-label">Bobot Sikap (${this._gradesConfig.attitudeWeight}/${tw})</span>
                <input type="number" id="attitudeWeight" class="config-input"
                       .value="${this._gradesConfig.attitudeWeight}" @change="${this._updateGradesConfig}">
              </div>
              <div class="config-group">
                <span class="config-label">Bobot Keterampilan (${this._gradesConfig.skillWeight}/${tw})</span>
                <input type="number" id="skillWeight" class="config-input"
                       .value="${this._gradesConfig.skillWeight}" @change="${this._updateGradesConfig}">
              </div>
            </div>

            <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
              <button class="toggle-btn" style="font-size:11px;padding:6px 10px;background:#f3f0fa;" @click="${() => this._resetWeights()}">
                🔄 Reset ke Default (1:3:2:2:0:0 = 8)
              </button>
            </div>

            <div style="margin-top: 16px; display: flex; gap: 12px; align-items: center;">
              <button class="toggle-btn" @click="${this._generateReport}">
                📥 Generate Laporan Rapor
              </button>
              <span style="font-size: 11px; color: #888;">Membuat sheet "Akumulasi Nilai Rapor" di Google Sheets</span>
            </div>

            <div class="simulated-roster-section">
              <div style="font-size: 12px; font-weight: bold; color: #6750a4; margin: 16px 0 8px;">
                📋 Daftar Mahasiswa & Status Aktivitas (${this._roster.length} terdaftar)
              </div>
              <div class="table-wrapper">
                <table style="font-size: 12px;">
                  <thead>
                    <tr>
                      <th>Nama Mahasiswa</th>
                      <th>Status Aktivitas</th>
                      <th>Log Aktivitas</th>
                      <th>Nilai Akhir Estimasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rosterData.map(s => html`
                      <tr>
                        <td style="font-weight: 500;">${s.nama}</td>
                        <td>
                          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold;
                                       background-color: ${s.nilaiAkhir >= 75 ? '#d1fae5' : s.nilaiAkhir >= 55 ? '#fef3c7' : '#fee2e2'};
                                       color: ${s.nilaiAkhir >= 75 ? '#065f46' : s.nilaiAkhir >= 55 ? '#92400e' : '#991b1b'};">
                            ${s.emoji || '📭'} ${s.statusAktivitas}
                          </span>
                        </td>
                        <td>${s.logAktivitas}</td>
                        <td style="font-weight: bold; color: #6750a4;">${s.nilaiAkhir}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : ""}
      </div>
      ` : html`<div class="grade-card"><p style="text-align:center;color:#888;padding:20px;">Transparansi nilai akan muncul setelah kuis diselesaikan atau pada waktu yang ditentukan.</p></div>`}
    `;
  }
}
customElements.define(TransparentGradebook.tag, TransparentGradebook);
