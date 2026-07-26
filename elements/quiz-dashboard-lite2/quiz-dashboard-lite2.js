import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "./lib/attendance-system.js";
import "./lib/explode-quiz.js";
import "./lib/quiz-user-auth.js";

const STORAGE_KEY = "quiz_lite_sheet_id";

class QuizDashboardLite2 extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "quiz-dashboard-lite2";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      viewMode: { type: String, attribute: "view-mode" },
      quizTabHidden: { type: Boolean, attribute: "quiz-tab-hidden", reflect: true },
      _spreadsheetId: { state: true },
      _activeTab: { state: true },
      _successMsg: { state: true },
      _errorMsg: { state: true },
      _user: { state: true }
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.sheetName = "Pertemuan";
    this.viewMode = "student";
    this.quizTabHidden = true; // "student" atau "lecturer"
    this._user = null;
    this._spreadsheetId = "";
    this._activeTab = 0;
    this._successMsg = "";
    this._errorMsg = "";
    this.t = {
      ...this.t,
      title: "Kuis Interaktif & Kehadiran",
      subtitle: "Sistem Kuis dengan Pelacakan Aktivitas Otomatis",
      tabQuiz: "📝 Ambil Kuis",
      tabAttendance: "📅 Kehadiran & Aktivitas",
      tabGuide: "📖 Panduan",
      tabNilai: "📊 Daftar Nilai",
      welcome: "Selamat datang",
      dataRecorded: "Data kuis & aktivitas akan tercatat atas nama Anda"
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("quiz-user-login", this._onUserLogin.bind(this));
    window.addEventListener("quiz-user-logout", this._onUserLogout.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener("quiz-user-login", this._onUserLogin.bind(this));
    window.removeEventListener("quiz-user-logout", this._onUserLogout.bind(this));
    super.disconnectedCallback();
  }

  _onUserLogin(e) {
    this._user = e.detail;
    this._successMsg = `${this.t.welcome}, ${this._user.nama}! ${this.t.dataRecorded}.`;
    setTimeout(() => { this._successMsg = ""; }, 4000);
  }

  _onUserLogout() {
    this._user = null;
    this._successMsg = "Anda telah keluar.";
    setTimeout(() => { this._successMsg = ""; }, 3000);
  }

  _onQuizSaved(e) {
    window.dispatchEvent(new CustomEvent("quiz-saved", {
      detail: e.detail, bubbles: true, composed: true
    }));
    this._successMsg = `Skor ${e.detail.name} sebesar ${e.detail.score}% berhasil disimpan!`;
    setTimeout(() => { this._successMsg = ""; }, 4000);
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-primary);
          color: var(--ddd-theme-default-text);
          background-color: var(--ddd-theme-polaris-surface);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          box-shadow: var(--ddd-shadow-2);
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid var(--ddd-theme-polaris-border);
          padding-bottom: var(--ddd-spacing-4); margin-bottom: var(--ddd-spacing-6);
          flex-wrap: wrap; gap: var(--ddd-spacing-4);
        }
        .title-section h1 {
          font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold);
          margin: 0 0 var(--ddd-spacing-1) 0; color: var(--ddd-theme-primary);
        }
        .title-section p {
          font-size: var(--ddd-font-size-m); margin: 0; color: var(--ddd-theme-secondary);
        }
        .badge {
          font-size: var(--ddd-font-size-xs);
          background-color: var(--ddd-theme-success-light);
          color: var(--ddd-theme-success-text);
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border-radius: 99px; font-weight: var(--ddd-font-weight-bold);
        }
        .tab-container {
          display: flex; gap: var(--ddd-spacing-1); margin-bottom: var(--ddd-spacing-6);
          border-bottom: 2px solid var(--ddd-theme-polaris-border); overflow-x: auto;
        }
        .tab-btn {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          font-size: var(--ddd-font-size-m); font-weight: var(--ddd-font-weight-medium);
          font-family: var(--ddd-font-primary); background: transparent;
          color: var(--ddd-theme-secondary); border: none;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .tab-btn:hover { color: var(--ddd-theme-primary); background: rgba(103,80,164,0.05); }
        .tab-btn.active {
          color: var(--ddd-theme-primary);
          border-bottom-color: var(--ddd-theme-primary);
          font-weight: var(--ddd-font-weight-bold);
        }
        .main-content {
          background-color: var(--ddd-theme-default-surface);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          border: 1px solid var(--ddd-theme-polaris-border);
          min-height: 400px;
        }
        .msg {
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-m);
        }
        .msg-success {
          background-color: var(--ddd-theme-success-light);
          color: var(--ddd-theme-on-success);
          border: 1px solid var(--ddd-theme-success);
        }
        .tracker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: var(--ddd-spacing-6);
        }
        .guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--ddd-spacing-5); margin-top: var(--ddd-spacing-5);
        }
        .guide-card {
          background: var(--ddd-theme-polaris-surface-hover);
          padding: var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-lg);
          border: 1px solid var(--ddd-theme-polaris-border);
        }
        .guide-card h3 {
          color: var(--ddd-theme-primary); margin: 0 0 var(--ddd-spacing-3) 0;
          font-size: var(--ddd-font-size-l); display: flex; align-items: center; gap: var(--ddd-spacing-2);
        }
        .guide-card p {
          font-size: var(--ddd-font-size-m); line-height: 1.6;
          color: var(--ddd-theme-secondary); margin: 0;
        }
      `
    ];
  }

  render() {
    return html`
      <div class="header">
        <div class="title-section">
          <h1>${this.t.title}</h1>
          <p>${this.t.subtitle}</p>
        </div>
        <span class="badge">HAXcms Ready</span>
      </div>

      ${this._successMsg ? html`<div class="msg msg-success">${this._successMsg}</div>` : ""}

      <!-- Auth Component -->
      <quiz-user-auth .appsScriptUrl="${this.appsScriptUrl}"></quiz-user-auth>

      <!-- Tabs: Panduan → Ambil Kuis → Aktivitas → Daftar Nilai -->
      <div class="tab-container">
        <button class="tab-btn ${this._activeTab === 0 ? 'active' : ''}" @click="${() => this._activeTab = 0}">${this.t.tabGuide}</button>
        ${!this.quizTabHidden ? html`<button class="tab-btn ${this._activeTab === 1 ? 'active' : ''}" @click="${() => this._activeTab = 1}">${this.t.tabQuiz}</button>` : ""}
        <button class="tab-btn ${this._activeTab === 2 ? 'active' : ''}" @click="${() => this._activeTab = 2}">${this.t.tabAttendance}</button>
        <button class="tab-btn ${this._activeTab === 3 ? 'active' : ''}" @click="${() => this._activeTab = 3}">${this.t.tabNilai}</button>
      </div>

      <activity-logger
        .appsScriptUrl="${this.appsScriptUrl}"
        .sheetName="${this.sheetName}"
        .studentId="${this._user?.studentId || ''}"
        .studentName="${this._user?.nama || ''}"
        .studentNis="${this._user?.nis || ''}"
        .studentAbsen="${this._user?.absen || ''}"
        .studentKelas="${this._user?.kelas || ''}">
      </activity-logger>

      <div class="main-content">
        ${this._activeTab === 0 ? html`
          <h2 style="color: var(--ddd-theme-primary);">${this.t.tabGuide}</h2>
          <div class="guide-grid">
            <div class="guide-card">
              <h3>🚀 Memulai Kuis</h3>
              <p>Login terlebih dahulu, lalu kerjakan kuis. Skor tersimpan otomatis ke Google Sheets atas nama Anda.</p>
            </div>
            <div class="guide-card">
              <h3>📅 Kehadiran</h3>
              <p>Dihitung otomatis dari aktivitas: scroll, download, kuis, diskusi. Semua tercatat atas nama login Anda.</p>
            </div>
            <div class="guide-card">
              <h3>🔗 Integrasi</h3>
              <p>Data tersinkron ke Google Sheets via Apps Script. Gunakan atribut <code>apps-script-url</code> dan <code>sheet-name</code>.</p>
            </div>
          </div>
        ` : this._activeTab === 1 && !this.quizTabHidden ? html`
          <explode-quiz
            .appsScriptUrl="${this.appsScriptUrl}"
            .sheetName="${this.sheetName}"
              .studentId="${this._user?.studentId || ''}"
              .studentName="${this._user?.nama || ''}"
              .studentNis="${this._user?.nis || ''}"
              .studentAbsen="${this._user?.absen || ''}"
              .studentKelas="${this._user?.kelas || ''}"
              .editable="${true}"
            @quiz-saved="${this._onQuizSaved}">
          </explode-quiz>
        ` : this._activeTab === 2 ? html`
          <div class="tracker-grid" style="margin-top: var(--ddd-spacing-6);">
            <attendance-tracker></attendance-tracker>
            <engagement-score></engagement-score>
          </div>
        ` : html`
          <div style="margin-top: var(--ddd-spacing-6);">
            <transparent-gradebook
              .appsScriptUrl="${this.appsScriptUrl}"
              .studentId="${this._user?.studentId || ''}"
              .studentName="${this._user?.nama || ''}"
              .viewMode="${this.viewMode}"
              .showAfterQuiz="${true}">
            </transparent-gradebook>
          </div>
        `}
      </div>
    `;
  }

  static get haxProperties() {
    return {
      canScale: true,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Quiz Dashboard Lite",
        description: "Dashboard kuis modular dengan attendance tracking, login siswa, dan integrasi Google Sheets",
        icon: "icons:quiz",
        color: "purple",
        tags: ["Education", "Assessment", "Interactive"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
            description: "URL Google Apps Script Web App"
          },
          {
            property: "sheetName",
            title: "Nama Pertemuan",
            inputMethod: "textfield",
            default: "Pertemuan"
          },
          {
            property: "viewMode",
            title: "Mode Tampilan",
            inputMethod: "select",
            options: {
              student: "View Mahasiswa",
              lecturer: "Mode Dosen (Console)"
            },
            default: "student",
            description: "Disable mode tertentu: 'student' = mahasiswa hanya lihat, 'lecturer' = dosen bisa input nilai"
          }
        ]
      }
    };
  }
}

globalThis.customElements.define(QuizDashboardLite2.tag, QuizDashboardLite2);
export { QuizDashboardLite2 };