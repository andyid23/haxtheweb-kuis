import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

const LOGS_STORAGE_KEY = "a3_attendance_logs";
const LAST_DATE_KEY = "a3_last_activity_date";

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getInitialLogs() {
  const today = getTodayString();
  const lastDate = localStorage.getItem(LAST_DATE_KEY);
  if (lastDate !== today) {
    localStorage.setItem(LOGS_STORAGE_KEY, "[]");
    localStorage.setItem(LAST_DATE_KEY, today);
    return [];
  }
  const stored = localStorage.getItem(LOGS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function pushLocalLog(type, description) {
  const now = new Date();
  const today = getTodayString();
  const lastDate = localStorage.getItem(LAST_DATE_KEY);
  if (lastDate !== today) {
    localStorage.setItem(LOGS_STORAGE_KEY, "[]");
    localStorage.setItem(LAST_DATE_KEY, today);
  }
  const newLog = { id: "log-" + now.getTime(), timestamp: now.toISOString(), date: today, type, description };
  const currentLogs = getInitialLogs();
  const merged = [newLog, ...currentLogs];
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(merged));
  globalThis.dispatchEvent(new CustomEvent("a3-activity-logged", { detail: { log: newLog } }));
  return merged;
}

export { LOGS_STORAGE_KEY, LAST_DATE_KEY, getTodayString, getInitialLogs, pushLocalLog };

export class ActivityLogger extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() { return "activity-logger"; }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Activity Logger",
        description: "Pencatat aktivitas belajar siswa",
        icon: "icons:list-alt",
        color: "green",
        tags: ["Education", "Attendance"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
          },
          {
            property: "sheetName",
            title: "Nama Sheet",
            inputMethod: "textfield",
          }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: {
        unsetAttributes: []
      }
    };
  }
  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      forumApiUrl: { type: String, attribute: "forum-api-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      studentNis: { type: String, attribute: "student-nis" },
      studentAbsen: { type: String, attribute: "student-absen" },
      studentKelas: { type: String, attribute: "student-kelas" },
      _logs: { state: true },
      _expanded: { state: true },
      _toastMsg: { state: true }
    };
  }
  constructor() {
    super();
    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
    this._logs = getInitialLogs();
    this._expanded = false;
    this._toastMsg = "";
    this._lastScrollTime = 0;
    this._handleScroll = this._handleScroll.bind(this);
    this._handleQuizSaved = this._handleQuizSaved.bind(this);
    this._handleDiscussionSaved = this._handleDiscussionSaved.bind(this);
    this._handleAssignmentSaved = this._handleAssignmentSaved.bind(this);
    this._handleReadingSaved = this._handleReadingSaved.bind(this);
    this._handleSessionChanged = this._handleSessionChanged.bind(this);
  }
  // kdMateri derived from sheetName
  get kdMateri() {
    return this.sheetName || "Pertemuan"
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[ActivityLogger.tag]) {
        store.elementList[ActivityLogger.tag] = ActivityLogger.haxProperties;
      }
    }
    globalThis.addEventListener("scroll", this._handleScroll, { passive: true });
    globalThis.addEventListener("quiz-saved", this._handleQuizSaved);
    globalThis.addEventListener("discussion-saved", this._handleDiscussionSaved);
    globalThis.addEventListener("assignment-saved", this._handleAssignmentSaved);
    globalThis.addEventListener("reading-saved", this._handleReadingSaved);
    globalThis.addEventListener("download-saved", this._handleDownloadSaved);
    globalThis.addEventListener("quiz-user-session-changed", this._handleSessionChanged);
    this._downloadClickHandler = (e) => this._handleDownloadClick(e);
    globalThis.document.addEventListener("click", this._downloadClickHandler, true);
    const today = getTodayString();
    const lastDate = localStorage.getItem(LAST_DATE_KEY);
    if (lastDate !== today) {
      this._logs = [];
      localStorage.setItem(LOGS_STORAGE_KEY, "[]");
      localStorage.setItem(LAST_DATE_KEY, today);
    }
    // Load session if available
    this._handleSessionChanged({ detail: this._loadSession() });
  }
  _loadSession() {
    try {
      const data = JSON.parse(localStorage.getItem("quiz_user_session"));
      if (data?.expiresAt && Date.now() > data.expiresAt) {
        localStorage.removeItem("quiz_user_session");
        return null;
      }
      return data;
    } catch { return null; }
  }
  _handleSessionChanged(e) {
    const session = e?.detail || this._loadSession();
    if (session?.studentId) {
      this.studentId = session.studentId;
      this.studentName = session.nama;
      this.studentNis = session.nis || "";
      this.studentAbsen = session.absen || "";
      this.studentKelas = session.kelas || "";
    }
  }
  disconnectedCallback() {
    globalThis.removeEventListener("scroll", this._handleScroll);
    globalThis.removeEventListener("quiz-saved", this._handleQuizSaved);
    globalThis.removeEventListener("discussion-saved", this._handleDiscussionSaved);
    globalThis.removeEventListener("assignment-saved", this._handleAssignmentSaved);
    globalThis.removeEventListener("reading-saved", this._handleReadingSaved);
    globalThis.removeEventListener("download-saved", this._handleDownloadSaved);
    globalThis.removeEventListener("quiz-user-session-changed", this._handleSessionChanged);
    globalThis.document.removeEventListener("click", this._downloadClickHandler, true);
    super.disconnectedCallback();
  }
  _handleScroll() {
    const now = Date.now();
    if (now - this._lastScrollTime < 120000) return;
    if (globalThis.scrollY > 1000) {
      this._lastScrollTime = now;
      this.logActivity("reading", `Membaca materi (scroll ${Math.round(globalThis.scrollY)}px)`);
    }
  }
  _handleQuizSaved(e) {
    const score = e.detail?.score || 0;
    this.logActivity("quiz", `Kuis selesai (Skor: ${score}%)`);
  }
  _handleDiscussionSaved(e) {
    const thread = e.detail?.thread || e.detail?.title || "Forum";
    const kdMateri = e.detail?.kdMateri || this.kdMateri;
    this.logActivity("discussion", `Diskusi di: ${thread}`);
  }
  _handleAssignmentSaved(e) {
    const title = e.detail?.title || "Tugas";
    const kdMateri = e.detail?.kdMateri || this.kdMateri;
    this.logActivity("assignment", `Tugas dikumpulkan: ${title}`);
  }
  _handleReadingSaved(e) {
    const title = e.detail?.title || "Materi";
    this.logActivity("reading", `Membaca: ${title}`);
  }
  _handleDownloadSaved(e) {
    const title = e.detail?.title || "Materi";
    this.logActivity("download", `Download materi: ${title}`);
  }
  _handleDownloadClick(e) {
    if (!e.target) return;
    const a = e.target.closest ? e.target.closest('a[download], a[href*="/files/"], a[href*="files/"]') : null;
    if (!a) return;
    const title = a.getAttribute("download") || a.getAttribute("aria-label") || a.textContent.trim() || a.getAttribute("href") || "Materi";
    this.logActivity("download", `Download materi: ${title.substring(0, 60)}`);
  }
  logActivity(type, description) {
    pushLocalLog(type, description);
    this._logs = getInitialLogs();
    if (this.appsScriptUrl && this.studentId) {
      const params = new URLSearchParams({
        action: "logActivity", timestamp: new Date().toISOString(), date: getTodayString(),
        name: this.studentName, studentId: this.studentId,
        nis: this.studentNis || "", absen: this.studentAbsen || "", kelas: this.studentKelas || "",
        activityType: type, description, sheet: this.sheetName, kdMateri: this.kdMateri
      });
      fetch(`${this.appsScriptUrl}?${params.toString()}`, { redirect: "follow" }).catch(() => {});
    }
    this._showToast(`✓ ${description.substring(0, 40)}`);
  }
  _showToast(msg) {
    this._toastMsg = msg;
    setTimeout(() => { if (this._toastMsg === msg) this._toastMsg = ""; }, 3000);
  }
  _resetToday() {
    if (globalThis.confirm("Reset semua aktivitas hari ini?")) {
      this._logs = [];
      localStorage.setItem(LOGS_STORAGE_KEY, "[]");
      this._showToast("Aktivitas hari ini direset");
    }
  }
  static get styles() {
    return [
      super.styles,
      css`:host { display: block; font-family: var(--ddd-font-primary); } .floating-logger-pill { position: fixed; bottom: var(--ddd-spacing-6); right: var(--ddd-spacing-6); background-color: var(--ddd-theme-default-text); color: var(--ddd-theme-on-primary); padding: var(--ddd-spacing-3) var(--ddd-spacing-5); border-radius: var(--ddd-radius-full); box-shadow: var(--ddd-shadow-2); display: flex; align-items: center; gap: var(--ddd-spacing-3); cursor: pointer; z-index: 1000; transition: all 0.3s; font-size: var(--ddd-font-size-s); font-weight: var(--ddd-font-weight-medium); } .floating-logger-pill:hover { transform: translateY(-2px); box-shadow: var(--ddd-shadow-3); } .pulse-dot { width: 8px; height: 8px; background-color: var(--ddd-theme-success); border-radius: 50%; animation: pulse 1.6s infinite; } @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34,197,94,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0); } } .drawer { position: fixed; bottom: 84px; right: var(--ddd-spacing-6); width: 380px; max-height: 500px; background: var(--ddd-theme-default-surface); border-radius: var(--ddd-radius-lg); box-shadow: var(--ddd-shadow-3); border: 1px solid var(--ddd-theme-polaris-border); z-index: 1000; display: flex; flex-direction: column; overflow: hidden; } .drawer-header { background-color: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); padding: var(--ddd-spacing-4); font-weight: var(--ddd-font-weight-bold); display: flex; justify-content: space-between; align-items: center; } .close-btn { background: none; border: none; color: var(--ddd-theme-on-primary); font-size: var(--ddd-font-size-xl); cursor: pointer; } .drawer-content { padding: var(--ddd-spacing-4); overflow-y: auto; flex: 1; } .date-label { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); margin-bottom: var(--ddd-spacing-3); text-align: center; } .logs-list { display: flex; flex-direction: column; gap: var(--ddd-spacing-2); max-height: 280px; overflow-y: auto; } .log-item { padding: var(--ddd-spacing-2) var(--ddd-spacing-3); border-radius: var(--ddd-radius-md); background-color: var(--ddd-theme-polaris-surface-hover); font-size: var(--ddd-font-size-xs); border-left: 3px solid var(--ddd-theme-secondary); } .log-item.reading { border-left-color: var(--ddd-theme-link); } .log-item.quiz { border-left-color: var(--ddd-theme-accent); } .log-item.assignment { border-left-color: var(--ddd-theme-success); } .log-item.discussion { border-left-color: var(--ddd-theme-warning); } .log-time { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); margin-bottom: 2px; } .reset-btn { background: var(--ddd-theme-error); color: var(--ddd-theme-on-error); border: none; padding: var(--ddd-spacing-1) var(--ddd-spacing-3); border-radius: var(--ddd-radius-md); font-size: var(--ddd-font-size-xs); cursor: pointer; margin-top: var(--ddd-spacing-3); } .toast { position: fixed; bottom: 90px; right: var(--ddd-spacing-6); background-color: var(--ddd-theme-default-text); color: var(--ddd-theme-on-primary); padding: var(--ddd-spacing-3) var(--ddd-spacing-5); border-radius: var(--ddd-radius-md); box-shadow: var(--ddd-shadow-2); font-size: var(--ddd-font-size-s); z-index: 1001; animation: fadeInOut 3s forwards; } @keyframes fadeInOut { 0% { opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; } }`
    ];
  }
  render() {
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return html`
      <div class="floating-logger-pill" @click="${() => this._expanded = !this._expanded}">
        <span class="pulse-dot"></span>
        <span>Aktivitas Hari Ini (${this._logs.length})</span>
      </div>
      ${this._expanded ? html`
        <div class="drawer">
          <div class="drawer-header">
            <span>📊 Aktivitas Hari Ini</span>
            <button class="close-btn" @click="${() => this._expanded = false}">×</button>
          </div>
          <div class="drawer-content">
            <div class="date-label">📅 ${today}</div>
            <div class="logs-list">
              ${this._logs.length === 0 
                ? html`<div style="color: var(--ddd-theme-secondary); text-align: center; padding: var(--ddd-spacing-6) 0;">Belum ada aktivitas tercatat hari ini.</div>` 
                : this._logs.map(log => html`
                  <div class="log-item ${log.type}">
                    <div class="log-time">${new Date(log.timestamp).toLocaleTimeString("id-ID")}</div>
                    <div>${log.description}</div>
                  </div>
                `)}
            </div>
            <button class="reset-btn" @click="${this._resetToday}">🔄 Reset Hari Ini</button>
          </div>
        </div>
      ` : ""}
      ${this._toastMsg ? html`<div class="toast">${this._toastMsg}</div>` : ""}
    `;
  }
}
globalThis.customElements.define(ActivityLogger.tag, ActivityLogger);

export class AttendanceTracker extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() { return "attendance-tracker"; }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Attendance Tracker",
        description: "Rekap absensi dan aktivitas harian siswa",
        icon: "icons:check-circle",
        color: "green",
        tags: ["Education", "Attendance"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
          },
          {
            property: "forumApiUrl",
            title: "Forum API URL",
            inputMethod: "textfield",
          },
          {
            property: "sheetName",
            title: "Nama Sheet (KD Materi)",
            inputMethod: "textfield",
          }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: {
        unsetAttributes: []
      }
    };
  }
  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      forumApiUrl: { type: String, attribute: "forum-api-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      _logs: { state: true },
      _forumToday: { state: true }
    };
  }
  constructor() {
    super();
    this._logs = getInitialLogs();
    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this._forumToday = 0;
  }
  // kdMateri derived from sheetName
  get kdMateri() {
    return this.sheetName || "Pertemuan"
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[AttendanceTracker.tag]) {
        store.elementList[AttendanceTracker.tag] = AttendanceTracker.haxProperties;
      }
    }
    this._reloadHandler = () => { this._logs = getInitialLogs(); };
    this._forumHandler = () => { this._fetchForumToday(); };
    globalThis.addEventListener("a3-activity-logged", this._reloadHandler);
    globalThis.addEventListener("storage", this._reloadHandler);
    globalThis.addEventListener("discussion-saved", this._forumHandler);
    this._fetchForumToday();
  }
  disconnectedCallback() {
    globalThis.removeEventListener("a3-activity-logged", this._reloadHandler);
    globalThis.removeEventListener("storage", this._reloadHandler);
    globalThis.removeEventListener("discussion-saved", this._forumHandler);
    super.disconnectedCallback();
  }
  async _fetchForumToday() {
    if (!this.forumApiUrl || !this.studentId) {
      this._forumToday = 0;
      return;
    }
    try {
      const params = new URLSearchParams({ action: "getForumActivityHistory", studentId: this.studentId, days: 1, kdMateri: this.kdMateri });
      const res = await fetch(`${this.forumApiUrl}?${params.toString()}`);
      const data = await res.json();
      const history = data.history || [];
      this._forumToday = history.reduce((sum, h) => sum + (h.count || 0), 0);
    } catch (e) {
      console.error("[attendance-tracker] Forum fetch failed:", e);
      this._forumToday = 0;
    }
  }
  _getTodayStats() {
    const today = getTodayString();
    const todayLogs = this._logs.filter(log => log.date === today);
    const counts = {
      reading: todayLogs.filter(l => l.type === "reading").length,
      quiz: todayLogs.filter(l => l.type === "quiz").length,
      assignment: todayLogs.filter(l => l.type === "assignment").length,
      discussion: todayLogs.filter(l => l.type === "discussion").length,
      download: todayLogs.filter(l => l.type === "download").length,
      forum: this.forumApiUrl ? this._forumToday : 0,
      total: todayLogs.length
    };
    // FIX: 5-6 kriteria ketat — tidak bisa 100% tanpa kuis + tugas + baca materi + download + komentar forum
    const hasReading = counts.reading >= 3 ? 1 : 0;
    const hasQuiz = counts.quiz >= 1 ? 1 : 0;
    const hasAssignment = counts.assignment >= 1 ? 1 : 0;
    const hasDownload = counts.download >= 1 ? 1 : 0;
    const hasForum = this.forumApiUrl ? (counts.forum >= 1 ? 1 : 0) : null;
    const hasEnoughActivity = counts.total >= 8 ? 1 : 0;
    const totalCriteria = hasForum === null ? 5 : 6;
    const criteriaCount = hasReading + hasQuiz + hasAssignment + hasDownload + (hasForum || 0) + hasEnoughActivity;
    const attendancePercentage = Math.round((criteriaCount / totalCriteria) * 100);
    return { 
      counts, 
      attendancePercentage, 
      status: attendancePercentage >= 100 ? "LENGKAP" : attendancePercentage >= 50 ? "PROSES" : "BELUM MULAI"
    };
  }
  static get styles() {
    return [
      super.styles,
      css`:host { display: block; font-family: var(--ddd-font-primary); color: var(--ddd-theme-default-text); } .tracker-card { background: var(--ddd-theme-default-surface); border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-6); border: 1px solid var(--ddd-theme-polaris-border); box-shadow: var(--ddd-shadow-1); } h3 { margin: 0 0 var(--ddd-spacing-4) 0; font-size: var(--ddd-font-size-l); color: var(--ddd-theme-primary); display: flex; align-items: center; gap: var(--ddd-spacing-2); } .date-info { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); margin-bottom: var(--ddd-spacing-4); text-align: center; } .flex-container { display: flex; gap: var(--ddd-spacing-8); align-items: center; flex-wrap: wrap; } .gauge-section { flex: 1; min-width: 220px; display: flex; flex-direction: column; align-items: center; text-align: center; } .gauge-wrapper { position: relative; width: 160px; height: 160px; margin-bottom: var(--ddd-spacing-3); } svg { transform: rotate(-90deg); width: 160px; height: 160px; } circle { fill: none; stroke-width: 12; } .bg-circle { stroke: var(--ddd-theme-polaris-surface-hover); } .fg-circle { stroke: var(--ddd-theme-primary); stroke-linecap: round; transition: stroke-dashoffset 0.6s; } .gauge-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold); } .badge { padding: var(--ddd-spacing-2) var(--ddd-spacing-4); border-radius: var(--ddd-radius-full); font-size: var(--ddd-font-size-s); font-weight: var(--ddd-font-weight-bold); display: inline-block; margin-top: var(--ddd-spacing-2); } .badge.success { background-color: var(--ddd-theme-success-light); color: var(--ddd-theme-success-text); } .badge.warning { background-color: var(--ddd-theme-warning-light); color: var(--ddd-theme-warning-text); } .badge.info { background-color: var(--ddd-theme-polaris-surface-hover); color: var(--ddd-theme-secondary); } .criteria-list { flex: 2; min-width: 280px; display: flex; flex-direction: column; gap: var(--ddd-spacing-3); } .criteria-item { display: flex; align-items: center; justify-content: space-between; padding: var(--ddd-spacing-3) var(--ddd-spacing-4); border-radius: var(--ddd-radius-md); background-color: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border); } .crit-info { display: flex; align-items: center; gap: var(--ddd-spacing-3); } .icon { font-size: var(--ddd-font-size-l); width: 32px; height: 32px; background-color: var(--ddd-theme-polaris-surface-hover); border-radius: var(--ddd-radius-md); display: flex; align-items: center; justify-content: center; } .crit-name { font-weight: var(--ddd-font-weight-medium); font-size: var(--ddd-font-size-s); } .crit-progress { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); margin-top: 2px; } .status-indicator { font-size: var(--ddd-font-size-l); } .status-indicator.check { color: var(--ddd-theme-success); } .status-indicator.cross { color: var(--ddd-theme-polaris-border); }`
    ];
  }
  render() {
    const stats = this._getTodayStats();
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.attendancePercentage / 100) * circumference;
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    return html`
      <div class="tracker-card">
        <h3>📊 Status Kehadiran Hari Ini</h3>
        <div class="date-info">📅 ${today}</div>
        <div class="flex-container">
          <div class="gauge-section">
            <div class="gauge-wrapper">
              <svg><circle class="bg-circle" cx="80" cy="80" r="${radius}"></circle><circle class="fg-circle" cx="80" cy="80" r="${radius}" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"></circle></svg>
              <div class="gauge-value">${stats.attendancePercentage}%</div>
            </div>
            <span class="badge ${stats.attendancePercentage >= 100 ? 'success' : stats.attendancePercentage >= 50 ? 'warning' : 'info'}">Status: ${stats.status}</span>
          </div>
          <div class="criteria-list">
            <div class="criteria-item">
              <div class="crit-info"><div class="icon">📖</div><div><div class="crit-name">Membaca Materi</div><div class="crit-progress">Tercapai: ${stats.counts.reading} dari min. 3 kali</div></div></div>
              <div class="status-indicator ${stats.counts.reading >= 3 ? 'check' : 'cross'}">${stats.counts.reading >= 3 ? "✅" : "⏳"}</div>
            </div>
            <div class="criteria-item">
              <div class="crit-info"><div class="icon">🎯</div><div><div class="crit-name">Mengerjakan Kuis</div><div class="crit-progress">Tercapai: ${stats.counts.quiz} dari min. 1 kali</div></div></div>
              <div class="status-indicator ${stats.counts.quiz >= 1 ? 'check' : 'cross'}">${stats.counts.quiz >= 1 ? "✅" : "⏳"}</div>
            </div>
            <div class="criteria-item">
              <div class="crit-info"><div class="icon">📝</div><div><div class="crit-name">Mengumpulkan Tugas</div><div class="crit-progress">Tercapai: ${stats.counts.assignment} dari min. 1 kali</div></div></div>
              <div class="status-indicator ${stats.counts.assignment >= 1 ? 'check' : 'cross'}">${stats.counts.assignment >= 1 ? "✅" : "⏳"}</div>
            </div>
            <div class="criteria-item">
              <div class="crit-info"><div class="icon">⬇️</div><div><div class="crit-name">Download Materi</div><div class="crit-progress">Tercapai: ${stats.counts.download} dari min. 1 kali (klik link file/unduhan)</div></div></div>
              <div class="status-indicator ${stats.counts.download >= 1 ? 'check' : 'cross'}">${stats.counts.download >= 1 ? "✅" : "⏳"}</div>
            </div>
            ${this.forumApiUrl ? html`
              <div class="criteria-item">
                <div class="crit-info"><div class="icon">💬</div><div><div class="crit-name">Mengirim Komentar Forum</div><div class="crit-progress">Tercapai: ${stats.counts.forum} dari min. 1 kali (cek sheet Forum Log)</div></div></div>
                <div class="status-indicator ${stats.counts.forum >= 1 ? 'check' : 'cross'}">${stats.counts.forum >= 1 ? "✅" : "⏳"}</div>
              </div>
            ` : ""}
            <div class="criteria-item">
              <div class="crit-info"><div class="icon">🔥</div><div><div class="crit-name">Total Aktivitas Hari Ini</div><div class="crit-progress">Tercapai: ${stats.counts.total} dari min. 8 kali</div></div></div>
              <div class="status-indicator ${stats.counts.total >= 8 ? 'check' : 'cross'}">${stats.counts.total >= 8 ? "✅" : "⏳"}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
globalThis.customElements.define(AttendanceTracker.tag, AttendanceTracker);

export class EngagementScore extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() { return "engagement-score"; }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Engagement Score",
        description: "Skor keterlibatan belajar siswa (heatmap 6 minggu)",
        icon: "icons:whatshot",
        color: "orange",
        tags: ["Education", "Attendance"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
          },
          {
            property: "forumApiUrl",
            title: "Forum API URL",
            inputMethod: "textfield",
          },
          {
            property: "sheetName",
            title: "Nama Sheet (KD Materi)",
            inputMethod: "textfield",
          }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: {
        unsetAttributes: []
      }
    };
  }
  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      forumApiUrl: { type: String, attribute: "forum-api-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      _history: { state: true }
    };
  }
  constructor() {
    super();
    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this._history = [];
  }
  // kdMateri derived from sheetName
  get kdMateri() {
    return this.sheetName || "Pertemuan"
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[EngagementScore.tag]) {
        store.elementList[EngagementScore.tag] = EngagementScore.haxProperties;
      }
    }
    this._reloadHandler = () => this._fetchHistory();
    globalThis.addEventListener("a3-activity-logged", this._reloadHandler);
    globalThis.addEventListener("discussion-saved", this._reloadHandler);
    this._fetchHistory();
  }
  disconnectedCallback() {
    globalThis.removeEventListener("a3-activity-logged", this._reloadHandler);
    globalThis.removeEventListener("discussion-saved", this._reloadHandler);
    super.disconnectedCallback();
  }
  async _fetchHistory() {
    if (!this.appsScriptUrl || !this.studentId) {
      this._history = [{ date: getTodayString(), count: getInitialLogs().length }];
      return;
    }
    try {
      const params = new URLSearchParams({ action: "getActivityHistory", studentId: this.studentId, days: 42, kdMateri: this.kdMateri });
      const res = await fetch(`${this.appsScriptUrl}?${params.toString()}`);
      const data = await res.json();
      const map = {};
      (data.history || []).forEach(h => { map[h.date] = (map[h.date] || 0) + (h.count || 0); });
      if (this.forumApiUrl) {
        try {
          const fParams = new URLSearchParams({ action: "getForumActivityHistory", studentId: this.studentId, days: 42, kdMateri: this.kdMateri });
          const fRes = await fetch(`${this.forumApiUrl}?${fParams.toString()}`);
          const fData = await fRes.json();
          (fData.history || []).forEach(h => { map[h.date] = (map[h.date] || 0) + (h.count || 0); });
        } catch (fe) {
          console.error("[engagement-score] Forum fetch failed:", fe);
        }
      }
      this._history = Object.keys(map).map(date => ({ date, count: map[date] }));
    } catch (e) {
      console.error("[engagement-score] Fetch failed:", e);
      this._history = [{ date: getTodayString(), count: getInitialLogs().length }];
    }
  }
  _getActivityMap() {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const now = new Date();
    const todayStr = getTodayString();
    const start = new Date(now);
    start.setDate(start.getDate() - now.getDay() - 35);
    const cells = [];
    const weeks = [];
    let currentWeek = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayData = this._history.find(h => h.date === dateStr);
      const count = dayData ? dayData.count : 0;
      currentWeek.push({ date: d, dateStr, dayName: days[d.getDay()], count, isToday: dateStr === todayStr });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    cells.push(...weeks.flat());
    return { cells, weeks };
  }
  static get styles() {
    return [
      super.styles,
      css`:host { display: block; font-family: var(--ddd-font-primary); color: var(--ddd-theme-default-text); } .engagement-card { background: var(--ddd-theme-default-surface); border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-6); border: 1px solid var(--ddd-theme-polaris-border); box-shadow: var(--ddd-shadow-1); } h3 { margin: 0 0 var(--ddd-spacing-3) 0; font-size: var(--ddd-font-size-l); color: var(--ddd-theme-primary); display: flex; align-items: center; gap: var(--ddd-spacing-2); } .consistency-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ddd-spacing-3); } .stat-mini-card { background-color: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border); border-radius: var(--ddd-radius-md); padding: var(--ddd-spacing-4); display: flex; flex-direction: column; gap: var(--ddd-spacing-1); } .mini-label { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); font-weight: var(--ddd-font-weight-medium); } .mini-val { font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-primary); } .heatmap-layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--ddd-spacing-6); align-items: start; } .heatmap-col { min-width: 0; } .side-col { display: flex; flex-direction: column; gap: var(--ddd-spacing-4); min-width: 0; } .heatmap-wrap { display: flex; gap: 3px; max-width: 640px; margin: 0; } .heatmap-months { display: grid; grid-auto-flow: column; grid-auto-columns: 18px; gap: 3px; font-size: 10px; color: var(--ddd-theme-secondary); margin-bottom: 3px; margin-left: 32px; } .heatmap-months span { overflow: visible; white-space: nowrap; } .day-labels { display: grid; grid-template-rows: repeat(7, 18px); gap: 3px; font-size: 10px; color: var(--ddd-theme-secondary); text-align: right; padding-right: 8px; } .heatmap-grid { display: grid; grid-template-rows: repeat(7, 18px); grid-auto-flow: column; grid-auto-columns: 18px; gap: 3px; } .cell { width: 18px; height: 18px; background-color: var(--ddd-theme-polaris-surface-hover); border-radius: 3px; cursor: pointer; transition: transform 0.15s; } .cell:hover { transform: scale(1.3); z-index: 10; box-shadow: var(--ddd-shadow-1); } .cell.lvl-1 { background-color: var(--ddd-theme-accent-light); } .cell.lvl-2 { background-color: var(--ddd-theme-accent); } .cell.lvl-3 { background-color: var(--ddd-theme-primary); } .cell.lvl-4 { background-color: var(--ddd-theme-default-text); } .cell.today { outline: 2px solid var(--ddd-theme-accent); outline-offset: 1px; } .cell.today.done { background-color: var(--ddd-theme-accent); } .legend { display: flex; align-items: center; gap: var(--ddd-spacing-2); flex-wrap: wrap; font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); } .legend-cell { width: 12px; height: 12px; border-radius: 3px; } .heatmap-note { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); } .side-note-card { background-color: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border); border-radius: var(--ddd-radius-md); padding: var(--ddd-spacing-4); font-size: var(--ddd-font-size-s); color: var(--ddd-theme-secondary); line-height: 1.6; } @media (max-width: 768px) { .heatmap-layout { grid-template-columns: 1fr; } .heatmap-col { overflow-x: auto; } } @media (max-width: 480px) { .heatmap-grid { grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 2px; } .cell { width: 12px; height: 12px; } .day-labels { grid-template-rows: repeat(7, 12px); gap: 2px; } .heatmap-months { grid-auto-columns: 12px; gap: 2px; } }`
    ];
  }
  render() {
    const { cells, weeks } = this._getActivityMap();
    const totalInteractions = cells.reduce((sum, d) => sum + d.count, 0);
    const activeDays = cells.filter(day => day.count > 0).length;
    const consistencyIndex = Math.round((activeDays / 42) * 100);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const weekLabels = weeks.map((w, wi) => {
      const label = monthNames[w[0].date.getMonth()];
      if (wi === 0) return label;
      const prev = monthNames[weeks[wi - 1][0].date.getMonth()];
      return label === prev ? "" : label;
    });
    const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    return html`
      <div class="engagement-card">
        <h3>🔥 Heatmap Aktivitas 1 Bulan</h3>
        <div class="heatmap-layout">
          <div class="heatmap-col">
            <div class="heatmap-months">${weekLabels.map(l => html`<span>${l}</span>`)}</div>
            <div class="heatmap-wrap">
              <div class="day-labels">${dayLabels.map(d => html`<span>${d}</span>`)}</div>
              <div class="heatmap-grid">
                ${cells.map(cell => {
                  let lvl = "";
                  if (cell.count === 1) lvl = "lvl-1";
                  else if (cell.count === 2) lvl = "lvl-2";
                  else if (cell.count >= 3 && cell.count <= 5) lvl = "lvl-3";
                  else if (cell.count > 5) lvl = "lvl-4";
                  const today = cell.isToday ? "today" : "";
                  const done = cell.isToday && cell.count > 0 ? "done" : "";
                  const title = `${cell.dateStr}: ${cell.count} aktivitas${cell.isToday ? " (Hari ini)" : ""}`;
                  return html`<div class="cell ${lvl} ${today} ${done}" title="${title}"></div>`;
                })}
              </div>
            </div>
          </div>
          <div class="side-col">
            <div class="consistency-stats">
              <div class="stat-mini-card"><span class="mini-label">Total Aktivitas</span><span class="mini-val">${totalInteractions} kali</span></div>
              <div class="stat-mini-card"><span class="mini-label">Hari Aktif</span><span class="mini-val">${activeDays} / 42</span></div>
              <div class="stat-mini-card"><span class="mini-label">Indeks Konsistensi</span><span class="mini-val">${consistencyIndex}%</span></div>
            </div>
            <div class="side-note-card">${this.forumApiUrl
              ? html`📌 Heatmap menggabungkan aktivitas dari <strong>getActivityHistory</strong> (sheet Aktivitas + pertemuan-kuis) dan <strong>getForumActivityHistory</strong> (sheet Forum Log).`
              : html`📌 Hover sel untuk detail harian. Sumber: sheet Aktivitas + pertemuan-kuis (via getActivityHistory).`}
            </div>
            <div class="legend">
              <span>Sedikit</span>
              <div class="legend-cell" style="background: var(--ddd-theme-polaris-surface-hover);"></div>
              <div class="legend-cell" style="background: var(--ddd-theme-accent-light);"></div>
              <div class="legend-cell" style="background: var(--ddd-theme-accent);"></div>
              <div class="legend-cell" style="background: var(--ddd-theme-primary);"></div>
              <div class="legend-cell" style="background: var(--ddd-theme-default-text);"></div>
              <span>Banyak</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
globalThis.customElements.define(EngagementScore.tag, EngagementScore);

export class TransparentGradebook extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() { return "transparent-gradebook"; }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Transparent Gradebook",
        description: "Buku nilai transparan untuk siswa",
        icon: "icons:grade",
        color: "blue",
        tags: ["Education", "Gradebook"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
          }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: {
        unsetAttributes: []
      }
    };
  }
  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      viewMode: { type: String, attribute: "view-mode" },
      _scores: { state: true }
    };
  }
  constructor() {
    super();
    this.appsScriptUrl = "";
    this.studentId = "";
    this.studentName = "";
    this.viewMode = "student";
    this._scores = { kehadiran: 0, ulanganHarian: 0, uts: 0, uas: 0, sikap: 0, keterampilan: 0, formatif: { count: 0, all: [] } };
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[TransparentGradebook.tag]) {
        store.elementList[TransparentGradebook.tag] = TransparentGradebook.haxProperties;
      }
    }
    this._fetchScores();
  }
  async _fetchScores() {
    if (!this.appsScriptUrl || !this.studentId) return;
    try {
      const params = new URLSearchParams({ action: "getStudentScores", studentId: this.studentId });
      const res = await fetch(`${this.appsScriptUrl}?${params.toString()}`);
      const data = await res.json();
      if (data.status === "ok" && data.data) this._scores = data.data;
    } catch (e) { console.error("[gradebook] Fetch failed:", e); }
  }
  _getUH() {
    const v = this._scores.ulanganHarian;
    if (v == null) return 0;
    if (typeof v === "number") return v;
    return v.average || 0;
  }
  _getUTS() {
    const v = this._scores.uts;
    if (v == null) return 0;
    if (typeof v === "number") return v;
    return v.highest || 0;
  }
  _getUAS() {
    const v = this._scores.uas;
    if (v == null) return 0;
    if (typeof v === "number") return v;
    return v.highest || 0;
  }
  _getBreakdown() {
    const list = [];
    const push = (obj, label) => {
      if (obj && Array.isArray(obj.all)) {
        obj.all.forEach(x => list.push({ label, pertemuan: x.pertemuan || "—", score: x.score }));
      }
    };
    push(this._scores.ulanganHarian, "Ulangan Harian");
    push(this._scores.uts, "UTS");
    push(this._scores.uas, "UAS");
    push(this._scores.formatif, "Formatif");
    return list;
  }
  _getFinalScore() {
    const final = (this._scores.kehadiran * 0.125) + (this._getUH() * 0.375) + (this._getUTS() * 0.25) + (this._getUAS() * 0.25);
    return Math.round(final * 10) / 10;
  }
  _getGradeLetter(score) {
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 60) return "C+";
    return "D";
  }
  static get styles() {
    return [
      super.styles,
      css`:host { display: block; font-family: var(--ddd-font-primary); color: var(--ddd-theme-default-text); } .grade-card { background: var(--ddd-theme-default-surface); border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-6); border: 1px solid var(--ddd-theme-polaris-border); box-shadow: var(--ddd-shadow-1); } h3 { margin: 0; font-size: var(--ddd-font-size-l); color: var(--ddd-theme-primary); display: flex; align-items: center; gap: var(--ddd-spacing-2); } .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--ddd-spacing-4); margin: var(--ddd-spacing-6) 0; } .summary-item { background: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border); border-radius: var(--ddd-radius-md); padding: var(--ddd-spacing-4); text-align: center; } .summary-item.highlight { background-color: var(--ddd-theme-polaris-surface-hover); border-color: var(--ddd-theme-accent); } .summary-label { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--ddd-font-weight-medium); } .summary-val { font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold); margin-top: var(--ddd-spacing-1); } .summary-val.brand { color: var(--ddd-theme-primary); } .table-wrapper { width: 100%; overflow-x: auto; border-radius: var(--ddd-radius-md); border: 1px solid var(--ddd-theme-polaris-border); } table { width: 100%; border-collapse: collapse; text-align: left; font-size: var(--ddd-font-size-s); } th { background-color: var(--ddd-theme-polaris-surface-hover); color: var(--ddd-theme-secondary); font-weight: var(--ddd-font-weight-bold); padding: var(--ddd-spacing-3) var(--ddd-spacing-4); border-bottom: 2px solid var(--ddd-theme-polaris-border); } td { padding: var(--ddd-spacing-3) var(--ddd-spacing-4); border-bottom: 1px solid var(--ddd-theme-polaris-border); } .row-category { font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-primary); } .breakdown { margin-top: var(--ddd-spacing-5); } .breakdown-title { font-size: var(--ddd-font-size-m); font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-primary); margin-bottom: var(--ddd-spacing-3); } .breakdown-note { margin-top: var(--ddd-spacing-5); font-size: var(--ddd-font-size-s); color: var(--ddd-theme-secondary); background: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border); border-radius: var(--ddd-radius-md); padding: var(--ddd-spacing-4); } .breakdown-note code { background: var(--ddd-theme-polaris-surface-hover); padding: 2px 6px; border-radius: var(--ddd-radius-sm); }`
    ];
  }
  render() {
    const finalScore = this._getFinalScore();
    const gradeLetter = this._getGradeLetter(finalScore);
    const uh = this._getUH();
    const uts = this._getUTS();
    const uas = this._getUAS();
    const breakdown = this._getBreakdown();
    return html`
      <div class="grade-card">
        <h3>📖 Pencapaian Hasil Belajar</h3>
        <div class="summary-grid">
          <div class="summary-item"><span class="summary-label">Kehadiran</span><span class="summary-val">${this._scores.kehadiran || 0}%</span></div>
          <div class="summary-item"><span class="summary-label">Ulangan Harian</span><span class="summary-val">${uh}%</span></div>
          <div class="summary-item highlight"><span class="summary-label">Nilai Akhir</span><span class="summary-val brand">${finalScore}</span></div>
          <div class="summary-item highlight"><span class="summary-label">Grade</span><span class="summary-val brand">${gradeLetter}</span></div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Komponen</th><th>Bobot</th><th>Nilai</th></tr></thead>
            <tbody>
              <tr><td class="row-category">Kehadiran</td><td style="text-align: center;">12.5%</td><td>${this._scores.kehadiran || 0}</td></tr>
              <tr><td class="row-category">Ulangan Harian</td><td style="text-align: center;">37.5%</td><td>${uh}</td></tr>
              <tr><td class="row-category">UTS</td><td style="text-align: center;">25%</td><td>${uts || '—'}</td></tr>
              <tr><td class="row-category">UAS</td><td style="text-align: center;">25%</td><td>${uas || '—'}</td></tr>
              <tr><td class="row-category">Sikap</td><td style="text-align: center;">—</td><td>${this._scores.sikap || 0}</td></tr>
              <tr><td class="row-category">Keterampilan</td><td style="text-align: center;">—</td><td>${this._scores.keterampilan || 0}</td></tr>
            </tbody>
            <tfoot><tr><td colspan="2" style="font-weight: var(--ddd-font-weight-bold); text-align: right;">Nilai Akhir:</td><td style="font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-primary);">${finalScore} (${gradeLetter})</td></tr></tfoot>
          </table>
        </div>
        ${breakdown.length > 0 ? html`
          <div class="breakdown">
            <div class="breakdown-title">📋 Rincian per Materi (dari sheet pertemuan-kuis)</div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Komponen</th><th>Kode Materi</th><th>Skor</th></tr></thead>
                <tbody>
                  ${breakdown.slice(0, 10).map(x => html`
                    <tr><td>${x.label}</td><td>${x.pertemuan}</td><td>${x.score}</td></tr>
                  `)}
                </tbody>
              </table>
            </div>
          </div>
        ` : html`
          <div class="breakdown-note">Nilai UTS/UAS/UH bersumber dari sheet <code>pertemuan-kuis</code> (kolom Kategori Kuis + Kode Materi). Jalankan <strong>Generate Laporan</strong> di mode dosen untuk rekap resmi.</div>
        `}
      </div>
    `;
  }
}
globalThis.customElements.define(TransparentGradebook.tag, TransparentGradebook);