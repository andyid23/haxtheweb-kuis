/**
 * Copyright 2026 andyinformatika23-hash
 * @license Apache-2.0, see LICENSE for full text.
 */

import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

import "./lib/attendance-system.js";
import "./lib/explode-quiz.js";
import "./lib/quiz-user-auth.js";
import "./lib/assignment-forum.js";
import "./lib/assignment-component.js";
import "./lib/forum-component.js";
import "./lib/lecturer-console.js";
import "./lib/question-generator.js";

/**
 * `quiz-dashboard`
 *
 * Dashboard kuis modular dengan attendance tracking, login siswa,
 * integrasi Google Sheets, dan mode dosen.
 *
 * @demo index.html
 * @element quiz-dashboard
 */
export class QuizDashboard extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "quiz-dashboard";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      forumApiUrl: { type: String, attribute: "forum-api-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      viewMode: { type: String, attribute: "view-mode" },
      quizTabHidden: {
        type: Boolean,
        attribute: "quiz-tab-hidden",
        reflect: true,
      },
      questions: { type: Array },
      _spreadsheetId: { state: true },
      _activeTab: { state: true },
      _successMsg: { state: true },
      _errorMsg: { state: true },
      _user: { state: true },
    };
  }

  constructor() {
    super();

    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.sheetName = "Pertemuan";
    this.viewMode = "student";
    this.quizTabHidden = false;
    this.questions = [];

    this._user = null;
    this._spreadsheetId = "";
    this._activeTab = 0;
    this._successMsg = "";
    this._errorMsg = "";

    this.t = {
      ...this.t,
      title: "Kuis Interaktif & Kehadiran",
      subtitle: "Sistem Belajar dan Latihan Kuis dengan Aktivitas Otomatis",
      tabQuiz: "📝 Ambil Kuis",
      tabAttendance: "📅 Kehadiran & Aktivitas",
      tabGuide: "📖 Panduan",
      tabNilai: "📊 Daftar Skor",
      welcome: "Selamat datang",
      dataRecorded: "Data kuis & aktivitas akan tercatat atas nama Anda",
    };

    this._onUserLoginBound = this._onUserLogin.bind(this);
    this._onUserLogoutBound = this._onUserLogout.bind(this);
    this._onQuizSaved = this._onQuizSaved.bind(this);
    this._onQuizQuestionsChanged = this._onQuizQuestionsChanged.bind(this);
    this._onQuestionsGenerated = this._onQuestionsGenerated.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    globalThis.addEventListener("quiz-user-login", this._onUserLoginBound);
    globalThis.addEventListener("quiz-user-logout", this._onUserLogoutBound);

    // Integrasi HAX Store agar komponen muncul di HAX authoring.
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();

      if (store) {
        store.elementList = store.elementList || {};

        if (!store.elementList[QuizDashboard.tag]) {
          store.elementList[QuizDashboard.tag] = QuizDashboard.haxProperties;
        }
      }
    }
  }

  disconnectedCallback() {
    globalThis.removeEventListener("quiz-user-login", this._onUserLoginBound);
    globalThis.removeEventListener("quiz-user-logout", this._onUserLogoutBound);

    super.disconnectedCallback();
  }

  _onUserLogin(e) {
    this._user = e.detail;

    this._successMsg = `${this.t.welcome}, ${this._user.nama}! ${this.t.dataRecorded}.`;

    setTimeout(() => {
      this._successMsg = "";
    }, 4000);
  }

  _onUserLogout() {
    this._user = null;

    this._successMsg = "Anda telah keluar.";

    setTimeout(() => {
      this._successMsg = "";
    }, 3000);
  }

  _onQuizSaved(e) {
    // Catatan:
    // `explode-quiz` sudah mengirim event `quiz-saved` dengan bubbles + composed.
    // Jadi umumnya tidak perlu dispatch global ulang di sini.
    //
    // Jika sistem lama Anda bergantung pada event global yang dikirim dashboard,
    // Anda bisa aktifkan kembali dispatch di bawah ini:
    //
    // globalThis.dispatchEvent(
    //   new CustomEvent("quiz-saved", {
    //     detail: e.detail,
    //     bubbles: true,
    //     composed: true,
    //   })
    // );

    const name = e?.detail?.name || this._user?.nama || "Siswa";
    const score = e?.detail?.score ?? 0;

    this._successMsg = `Skor ${name} sebesar ${score}% berhasil disimpan!`;

    setTimeout(() => {
      this._successMsg = "";
    }, 4000);
  }

  _onQuizQuestionsChanged(e) {
    const qs = e && e.detail && e.detail.questions;

    if (!Array.isArray(qs)) return;

    this.questions = qs;

    try {
      this.setAttribute("questions", JSON.stringify(qs));
    } catch (err) {
      // Atribut terlalu besar atau tidak bisa diserialisasi.
      // Biarkan hanya sebagai property.
    }
  }

  _onQuestionsGenerated() {
    this._activeTab = 1;
  }

  _simReading() {
    globalThis.dispatchEvent(
      new CustomEvent("reading-saved", {
        detail: { title: `Materi ${this.sheetName}` },
        bubbles: true,
        composed: true,
      })
    );

    globalThis.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
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

        explode-quiz[hidden] {
          display: none !important;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--ddd-theme-polaris-border);
          padding-bottom: var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-6);
          flex-wrap: wrap;
          gap: var(--ddd-spacing-4);
        }

        .title-section h1 {
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          margin: 0 0 var(--ddd-spacing-1) 0;
          color: var(--ddd-theme-primary);
        }

        .title-section p {
          font-size: var(--ddd-font-size-m);
          margin: 0;
          color: var(--ddd-theme-secondary);
        }

        .badge {
          font-size: var(--ddd-font-size-xs);
          background-color: var(--ddd-theme-success-light);
          color: var(--ddd-theme-success-text);
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-full);
          font-weight: var(--ddd-font-weight-bold);
        }

        .tab-container {
          display: flex;
          gap: var(--ddd-spacing-1);
          margin-bottom: var(--ddd-spacing-6);
          border-bottom: 2px solid var(--ddd-theme-polaris-border);
          overflow-x: auto;
        }

        .tab-btn {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          font-size: var(--ddd-font-size-m);
          font-weight: var(--ddd-font-weight-medium);
          font-family: var(--ddd-font-primary);
          background: transparent;
          color: var(--ddd-theme-secondary);
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: var(--ddd-theme-primary);
          background: rgba(103, 80, 164, 0.05);
        }

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
          gap: var(--ddd-spacing-5);
          margin-top: var(--ddd-spacing-5);
        }

        .guide-card {
          background: var(--ddd-theme-polaris-surface-hover);
          padding: var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-lg);
          border: 1px solid var(--ddd-theme-polaris-border);
        }

        .guide-card h3 {
          color: var(--ddd-theme-primary);
          margin: 0 0 var(--ddd-spacing-3) 0;
          font-size: var(--ddd-font-size-l);
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
        }

        .guide-card p {
          font-size: var(--ddd-font-size-m);
          line-height: 1.6;
          color: var(--ddd-theme-secondary);
          margin: 0;
        }
      `,
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

      ${this._successMsg
        ? html`<div class="msg msg-success">${this._successMsg}</div>`
        : ""}

      <quiz-user-auth .appsScriptUrl="${this.appsScriptUrl}"></quiz-user-auth>

      <div class="tab-container">
        <button
          class="tab-btn ${this._activeTab === 0 ? "active" : ""}"
          @click="${() => (this._activeTab = 0)}"
        >
          ${this.t.tabGuide}
        </button>

        ${!this.quizTabHidden
          ? html`
              <button
                class="tab-btn ${this._activeTab === 1 ? "active" : ""}"
                @click="${() => (this._activeTab = 1)}"
              >
                ${this.t.tabQuiz}
              </button>
            `
          : ""}

        <button
          class="tab-btn ${this._activeTab === 2 ? "active" : ""}"
          @click="${() => (this._activeTab = 2)}"
        >
          ${this.t.tabAttendance}
        </button>

        <button
          class="tab-btn ${this._activeTab === 3 ? "active" : ""}"
          @click="${() => (this._activeTab = 3)}"
        >
          ${this.t.tabNilai}
        </button>
      </div>

      <activity-logger
        .appsScriptUrl="${this.appsScriptUrl}"
        .sheetName="${this.sheetName}"
        .studentId="${this._user?.studentId || ""}"
        .studentName="${this._user?.nama || ""}"
        .studentNis="${this._user?.nis || ""}"
        .studentAbsen="${this._user?.absen || ""}"
        .studentKelas="${this._user?.kelas || ""}"
      >
      </activity-logger>

      ${!this.quizTabHidden
        ? html`
            <explode-quiz
              id="quiz"
              ?hidden="${this._activeTab !== 1}"
              .appsScriptUrl="${this.appsScriptUrl}"
              .sheetName="${this.sheetName}"
              .questions="${this.questions}"
              .studentId="${this._user?.studentId || ""}"
              .studentName="${this._user?.nama || ""}"
              .studentNis="${this._user?.nis || ""}"
              .studentAbsen="${this._user?.absen || ""}"
              .studentKelas="${this._user?.kelas || ""}"
              .editable="${true}"
              @quiz-saved="${this._onQuizSaved}"
              @questions-changed="${this._onQuizQuestionsChanged}"
            >
            </explode-quiz>
          `
        : ""}

      <div class="main-content">
        ${this._activeTab === 0
          ? html`
              <h2 style="color: var(--ddd-theme-primary);">
                ${this.t.tabGuide}
              </h2>

              <div class="guide-grid">
                <div class="guide-card">
                  <h3>🚀 Memulai Kuis</h3>
                  <p>
                    Login terlebih dahulu, lalu kerjakan kuis. Skor tersimpan
                    otomatis ke Google Sheets atas nama Anda.
                  </p>
                </div>

                <div class="guide-card">
                  <h3>📅 Kehadiran</h3>
                  <p>
                    Dihitung otomatis dari aktivitas: scroll, download, kuis,
                    diskusi. Semua tercatat atas nama login Anda.
                  </p>
                </div>

                <div class="guide-card">
                  <h3>🔗 Integrasi</h3>
                  <p>
                    Data tersinkron ke Google Sheets via Apps Script. Gunakan
                    atribut <code>apps-script-url</code> dan
                    <code>sheet-name</code>.
                  </p>
                </div>
              </div>
            `
          : this._activeTab === 2
          ? html`
              <div class="tracker-grid" style="margin-top: var(--ddd-spacing-6);">
                <attendance-tracker
                  .appsScriptUrl="${this.appsScriptUrl}"
                  .forumApiUrl="${this.forumApiUrl}"
                  .studentId="${this._user?.studentId || ""}"
                >
                </attendance-tracker>

                <engagement-score
                  .appsScriptUrl="${this.appsScriptUrl}"
                  .forumApiUrl="${this.forumApiUrl}"
                  .studentId="${this._user?.studentId || ""}"
                >
                </engagement-score>
              </div>
            `
          : html`
              <div style="margin-top: var(--ddd-spacing-6);">
                ${this.viewMode === "lecturer"
                  ? html`
                      <lecturer-console
                        .appsScriptUrl="${this.appsScriptUrl}"
                        .quizSelector="${"#quiz"}"
                        @questions-generated="${this._onQuestionsGenerated}"
                      >
                      </lecturer-console>
                    `
                  : html`
                      <transparent-gradebook
                        .appsScriptUrl="${this.appsScriptUrl}"
                        .studentId="${this._user?.studentId || ""}"
                        .studentName="${this._user?.nama || ""}"
                        .viewMode="${this.viewMode}"
                        .showAfterQuiz="${true}"
                      >
                      </transparent-gradebook>
                    `}
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
        title: "Quiz Dashboard",
        description:
          "Dashboard kuis modular dengan attendance tracking, login siswa, dan integrasi Google Sheets",
        icon: "icons:quiz",
        color: "purple",
        tags: ["Education", "Assessment", "Interactive"],
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
            description: "URL Google Apps Script Web App",
          },
          {
            property: "forumApiUrl",
            title: "Forum Apps Script URL (Opsional)",
            inputMethod: "textfield",
            description:
              "URL Web App code-forum-tugas.gs — untuk kriteria Mengirim Komentar Forum & heatmap",
          },
          {
            property: "sheetName",
            title: "Nama Pertemuan",
            inputMethod: "textfield",
            default: "Pertemuan",
          },
          {
            property: "viewMode",
            title: "Mode Tampilan",
            inputMethod: "select",
            options: {
              student: "View Mahasiswa",
              lecturer: "Mode Dosen (Console)",
            },
            default: "student",
          },
          {
            property: "quizTabHidden",
            title: "Sembunyikan Tab Kuis",
            inputMethod: "boolean",
            default: false,
          },
        ],
        advanced: [],
        developer: [],
      },
      saveOptions: {
        unsetAttributes: [
          "_activeTab",
          "_successMsg",
          "_errorMsg",
          "_user",
          "_spreadsheetId",
        ],
      },
    };
  }
}

globalThis.customElements.define(QuizDashboard.tag, QuizDashboard);