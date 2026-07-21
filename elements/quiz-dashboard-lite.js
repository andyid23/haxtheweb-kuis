import { LitElement, html, css } from "lit";
import "./attendance-system.js";
import "./explode/explode-quiz.js";

// Import Material Design components
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/tabs/tabs.js";
import "@material/web/tabs/primary-tab.js";

const STORAGE_KEY = "quiz_lite_sheet_id";

class QuizDashboardLite extends LitElement {
  static get tag() {
    return "quiz-dashboard-lite";
  }

  static get properties() {
    return {
      _spreadsheetId: { type: String },
      _activeTab: { type: Number },
      _successMsg: { type: String },
      _errorMsg: { type: String }
    };
  }

  constructor() {
    super();
    this._spreadsheetId = this._getStorageItem(STORAGE_KEY) || "";
    this._activeTab = 0;
    this._successMsg = "";
    this._errorMsg = "";
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
    this._setStorageItem(STORAGE_KEY, this._spreadsheetId);
    this._successMsg = "Spreadsheet ID berhasil dihubungkan!";
    setTimeout(() => {
      this._successMsg = "";
    }, 3000);
  }

  _handleDisconnect() {
    this._spreadsheetId = "";
    this._setStorageItem(STORAGE_KEY, "");
    this._successMsg = "Spreadsheet berhasil diputuskan.";
    setTimeout(() => {
      this._successMsg = "";
    }, 3000);
  }

  _onQuizSaved(e) {
    this._successMsg = `Skor ${e.detail.name} sebesar ${e.detail.score} berhasil disimpan!`;
    setTimeout(() => {
      this._successMsg = "";
    }, 4000);
  }

  _onTabChange(e) {
    this._activeTab = e.target.activeTabIndex;
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

      .badge {
        font-size: 11px;
        background-color: #d1fae5;
        color: #065f46;
        padding: 4px 10px;
        border-radius: 99px;
        font-weight: 500;
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

      .connected-card {
        background-color: #f0fdf4;
        border-color: #bbf7d0;
        padding: 16px;
        margin-bottom: 24px;
      }

      .connected-card h2 {
        color: #14532d;
        font-size: 16px;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .connected-card p {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: #166534;
      }

      .google-sheet-link {
        color: #166534;
        font-size: 14px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        font-weight: 500;
      }

      .google-sheet-link:hover {
        text-decoration: underline;
      }

      .tab-container {
        margin-bottom: 24px;
        border-bottom: 1px solid #cac4d0;
      }

      .main-content {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #cac4d0;
        min-height: 400px;
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

      .tracker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }

      .info-banner {
        background-color: #fef7ff;
        border-radius: 12px;
        border: 1px solid #c7b3fc;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        margin-bottom: 24px;
      }

      .info-banner .icon {
        font-size: 32px;
      }

      .info-banner h2 {
        margin: 0 0 6px 0;
        font-size: 16px;
        font-weight: bold;
        color: #6750a4;
      }

      .info-banner p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: #49454f;
      }

      .guide-card {
        background: #fdfbff;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #eaddf0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      }

      .guide-card h3 {
        color: #6750a4;
        margin-top: 0;
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .guide-card p {
        font-size: 13.5px;
        line-height: 1.6;
        color: #49454f;
        margin-bottom: 0;
      }

      .guide-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .tip-box {
        background: #fff8e1;
        border: 1px solid #ffe082;
        padding: 16px;
        border-radius: 8px;
        margin-top: 24px;
        font-size: 13.5px;
        color: #5d4037;
        line-height: 1.5;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .tip-box .icon {
        font-size: 18px;
      }
    `;
  }

  render() {
    return html`
      <div class="header">
        <div class="title-section">
          <h1>Kuis Interaktif & Kehadiran</h1>
          <p>Sistem Kuis dengan Pelacakan Aktivitas Otomatis</p>
        </div>
        <span class="badge">Tanpa Firebase</span>
      </div>

      ${this._errorMsg ? html`<div class="msg msg-error">${this._errorMsg}</div>` : ""}
      ${this._successMsg ? html`<div class="msg msg-success">${this._successMsg}</div>` : ""}

      ${!this._spreadsheetId ? html`
        <div class="setup-card">
          <h2>Hubungkan dengan Google Sheets</h2>
          <p style="font-size: 13px; color: #49454f; margin-bottom: 12px;">
            Masukkan ID atau URL Google Spreadsheet untuk menyimpan hasil kuis secara otomatis.
            <br><small style="color: #888;">Tanpa ID, kuis tetap berfungsi secara lokal.</small>
          </p>
          <form @submit="${this._handleConnectSheet}" class="setup-row">
            <md-outlined-text-field
              id="sheet-input"
              class="input-field"
              label="ID atau URL Google Spreadsheet"
              placeholder="Contoh: 1ix2abc... atau URL penuh">
            </md-outlined-text-field>
            <md-filled-button type="submit">Hubungkan</md-filled-button>
          </form>
        </div>
      ` : html`
        <div class="setup-card connected-card">
          <h2>✅ Terhubung ke Google Spreadsheet</h2>
          <p>Hasil kuis akan disimpan ke spreadsheet yang terhubung.</p>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <a class="google-sheet-link" href="https://docs.google.com/spreadsheets/d/${this._spreadsheetId}" target="_blank">
              <svg style="width: 18px; height: 18px; fill: #15803d;" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Buka Google Sheets
            </a>
            <md-outlined-button @click="${this._handleDisconnect}" style="--md-outlined-button-label-text-color: #ba1a1a; --md-outlined-button-outline-color: #ba1a1a;">
              Putuskan
            </md-outlined-button>
          </div>
        </div>
      `}

      <div class="tab-container">
        <md-tabs @change="${this._onTabChange}" .activeTabIndex="${this._activeTab}">
          <md-primary-tab>📝 Ambil Kuis</md-primary-tab>
          <md-primary-tab>📅 Kehadiran & Aktivitas</md-primary-tab>
          <md-primary-tab>📖 Panduan</md-primary-tab>
        </md-tabs>
      </div>

      <div class="main-content">
        ${this._activeTab === 0 ? html`
          <explode-quiz
            .spreadsheetId="${this._spreadsheetId}"
            .editable="${true}"
            @quiz-saved="${this._onQuizSaved}">
          </explode-quiz>
        ` : this._activeTab === 1 ? html`
          <div>
            <div class="info-banner">
              <div class="icon">⏰</div>
              <div>
                <h2>Pelacakan Aktivitas Otomatis</h2>
                <p>
                  Komponen <code>&lt;activity-logger&gt;</code> mencatat setiap scroll, unduhan, dan klik secara otomatis. 
                  Gunakan tombol melayang di pojok kanan bawah untuk detail real-time!
                </p>
              </div>
            </div>

            <div class="tracker-grid">
              <attendance-tracker></attendance-tracker>
              <engagement-score></engagement-score>
            </div>

            <div style="margin-top: 24px;">
              <transparent-gradebook></transparent-gradebook>
            </div>
          </div>
        ` : html`
          <div>
            <h2 style="color: #6750a4; margin-top: 0; font-size: 20px; font-weight: 500;">📖 Panduan Penggunaan</h2>
            
            <div class="guide-grid">
              <div class="guide-card">
                <h3><span>🚀</span> 1. Memulai Kuis</h3>
                <p>
                  Masukkan nama Anda di halaman kuis, lalu klik "Mulai Kuis". Jawab setiap pertanyaan dengan memilih salah satu pilihan. Skor Anda akan dihitung otomatis.
                </p>
              </div>

              <div class="guide-card">
                <h3><span>📊</span> 2. Menghubungkan Google Sheets</h3>
                <p>
                  Di bagian atas dashboard, masukkan ID atau URL Google Spreadsheet. Setelah terhubung, setiap hasil kuis akan otomatis tersimpan ke spreadsheet tersebut.
                </p>
              </div>

              <div class="guide-card">
                <h3><span>📅</span> 3. Pelacakan Kehadiran</h3>
                <p>
                  Sistem kehadiran dihitung berdasarkan aktivitas Anda: membaca modul, mengerjakan kuis, dan berpartisipasi di forum. Semua tercatat otomatis!
                </p>
              </div>
            </div>

            <div class="tip-box">
              <span class="icon">💡</span>
              <div>
                <strong>Tips:</strong> Kuis tetap berfungsi tanpa Google Sheets. Hasil hanya tersimpan lokal di browser. Hubungkan Google Sheets untuk sinkronisasi dan backup data.
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
}

customElements.define(QuizDashboardLite.tag, QuizDashboardLite);

export { QuizDashboardLite };
