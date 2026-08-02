import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js"
import { LitElement, html, css } from "lit"
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js"

export class LecturerConsole extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "lecturer-console";
  }
  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      quizSelector: { type: String, attribute: "quiz-selector" },
      kategori: { type: String, attribute: "kategori" },
      roster: { type: Array },
      loading: { type: Boolean },
      generating: { type: Boolean },
      message: { type: String },
      messageType: { type: String, attribute: "message-type" },
      weights: { type: Object },
      manualUts: { type: Object },
      manualUas: { type: Object },
    };
  }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Lecturer Console",
        description: "Konsol penilaian untuk guru (rapor A3)",
        icon: "icons:assignment-turned-in",
        color: "blue",
        tags: ["Education", "Assessment"]
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
  constructor() {
    super();
    this.appsScriptUrl = "";
    this.quizSelector = "#quiz";
    this.kategori = "campur";
    this.roster = [];
    this.loading = false;
    this.generating = false;
    this.message = "";
    this.messageType = "info";
    this.weights = {
      attendanceWeight: 1,
      ulanganHarianWeight: 3,
      utsWeight: 2,
      uasWeight: 2,
      attitudeWeight: 0,
      skillWeight: 0,
    };
    this.manualUts = {};
    this.manualUas = {};
    try {
      const saved = JSON.parse(localStorage.getItem("a3-report-weights"));
      if (saved && typeof saved === "object") {
        this.weights = { ...this.weights, ...saved };
      }
    } catch (e) {
      // abaikan localStorage rusak
    }
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[LecturerConsole.tag]) {
        store.elementList[LecturerConsole.tag] = LecturerConsole.haxProperties;
      }
    }
    this.loadRoster();
  }
  _setMessage(message, type = "info") {
    this.message = message;
    this.messageType = type;
  }
  _weightsUpdated() {
    try {
      localStorage.setItem("a3-report-weights", JSON.stringify(this.weights));
    } catch (e) {
      // abaikan
    }
  }
  async _fetch(action, body) {
    if (!this.appsScriptUrl) {
      this._setMessage("Apps Script URL belum dikonfigurasi di halaman dashboard.", "error");
      return null;
    }
    try {
      const resp = await fetch(this.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, ...body }),
      });
      const json = await resp.json();
      if (json && json.status === "error") {
        this._setMessage(json.message || "Terjadi kesalahan di server.", "error");
        return null;
      }
      return json;
    } catch (e) {
      this._setMessage("Gagal terhubung ke server: " + e.message, "error");
      return null;
    }
  }
  async loadRoster() {
    this.loading = true;
    this._setMessage("");
    const json = await this._fetch("getStudentRoster");
    if (json && json.roster) {
      this.roster = json.roster;
      json.roster.forEach(s => {
        if (s.uts) this.manualUts[s.studentId] = s.uts;
        if (s.uas) this.manualUas[s.studentId] = s.uas;
      });
      this._setMessage("Roster dimuat (" + json.total + " siswa).", "ok");
    } else if (!this.message) {
      this._setMessage("Roster kosong atau belum ada siswa terdaftar.", "warn");
    }
    this.loading = false;
    this.requestUpdate();
  }
  async generateReport() {
    this.generating = true;
    this._setMessage("Menghitung rapor...");
    const json = await this._fetch("generateReport", { ...this.weights });
    if (json && json.status === "ok") {
      this._setMessage(json.message + " Total " + json.totalSiswa + " siswa.", "ok");
      await this.loadRoster();
    }
    this.generating = false;
  }
  _getGenerator() {
    if (!this._gen) {
      this._gen = document.createElement("question-generator");
      this.shadowRoot.appendChild(this._gen);
    }
    this._gen.appsScriptUrl = this.appsScriptUrl;
    this._gen.quizSelector = this.quizSelector;
    this._gen.kategori = this.kategori;
    return this._gen;
  }
  async generateFromTemplate() {
    const gen = this._getGenerator();
    const questions = await gen.generateFromTemplate();
    if (questions && questions.length) {
      this._setMessage(`Soal template lokal dimuat: ${questions.length} soal (${this.kategori}).`, "ok");
    } else {
      this._setMessage(gen.message || "Gagal memuat soal template.", "error");
    }
    return questions;
  }
  async generateFromBankSoal() {
    const gen = this._getGenerator();
    const questions = await gen.generateFromBankSoal();
    if (questions && questions.length) {
      this._setMessage(`Soal dari Bank Soal dimuat: ${questions.length} soal (${this.kategori}).`, "ok");
    } else {
      this._setMessage(gen.message || "Gagal memuat soal dari Bank Soal.", "error");
    }
    return questions;
  }
  async saveManualScore(studentId, kategori) {
    const val = kategori === "uts" ? this.manualUts[studentId] : this.manualUas[studentId];
    const skor = parseInt(val);
    if (isNaN(skor)) {
      this._setMessage("Skor " + kategori.toUpperCase() + " harus berupa angka 0-100.", "warn");
      return;
    }
    this._setMessage("Menyimpan nilai " + kategori.toUpperCase() + " " + studentId + "...");
    const json = await this._fetch("setManualScore", { studentId: studentId, kategori: kategori, skor: skor });
    if (json && json.status === "ok") {
      this._setMessage(json.message, "ok");
      await this.loadRoster();
    }
  }
  _onWeightChange(e) {
    const name = e.target.getAttribute("name");
    const value = Math.max(0, parseInt(e.target.value) || 0);
    this.weights = { ...this.weights, [name]: value };
    this._weightsUpdated();
  }
  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--ddd-font-primary);
        color: var(--ddd-theme-default-text);
      }
      .console-card {
        background: var(--ddd-theme-default-surface);
        border-radius: var(--ddd-radius-lg);
        padding: var(--ddd-spacing-6);
        border: 1px solid var(--ddd-theme-polaris-border);
        box-shadow: var(--ddd-shadow-1);
      }
      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--ddd-spacing-3);
        margin-bottom: var(--ddd-spacing-5);
      }
      h2 {
        margin: 0;
        font-size: var(--ddd-font-size-xl);
        color: var(--ddd-theme-primary);
      }
      .actions {
        display: flex;
        gap: var(--ddd-spacing-2);
        flex-wrap: wrap;
      }
      button {
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-s);
        font-weight: var(--ddd-font-weight-medium);
        border: 1px solid var(--ddd-theme-polaris-border);
        border-radius: var(--ddd-radius-sm);
        padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
        cursor: pointer;
        background: var(--ddd-theme-polaris-surface);
        color: var(--ddd-theme-default-text);
        transition: background 0.15s;
      }
      button:hover {
        background: var(--ddd-theme-polaris-surface-hover);
      }
      button.primary {
        background: var(--ddd-theme-primary);
        border-color: var(--ddd-theme-primary);
        color: white;
      }
      button.primary:hover {
        background: var(--ddd-theme-primary-hover);
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .message {
        padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
        border-radius: var(--ddd-radius-sm);
        margin-bottom: var(--ddd-spacing-4);
        font-size: var(--ddd-font-size-s);
      }
      .message.ok {
        background: color-mix(in srgb, var(--ddd-theme-success) 15%, transparent);
        color: var(--ddd-theme-success);
      }
      .message.error {
        background: color-mix(in srgb, var(--ddd-theme-error) 15%, transparent);
        color: var(--ddd-theme-error);
      }
      .message.warn {
        background: color-mix(in srgb, var(--ddd-theme-warning) 15%, transparent);
        color: var(--ddd-theme-warning);
      }
      .message.info {
        background: var(--ddd-theme-polaris-surface);
        color: var(--ddd-theme-secondary);
      }
      .weights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--ddd-spacing-3);
        margin-bottom: var(--ddd-spacing-5);
      }
      .weight-item {
        display: flex;
        flex-direction: column;
        gap: var(--ddd-spacing-1);
        background: var(--ddd-theme-polaris-surface);
        border: 1px solid var(--ddd-theme-polaris-border);
        border-radius: var(--ddd-radius-md);
        padding: var(--ddd-spacing-3);
      }
      .weight-item label {
        font-size: var(--ddd-font-size-xs);
        color: var(--ddd-theme-secondary);
        font-weight: var(--ddd-font-weight-medium);
      }
      .weight-item input {
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-m);
        width: 100%;
        box-sizing: border-box;
        padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
        border: 1px solid var(--ddd-theme-polaris-border);
        border-radius: var(--ddd-radius-sm);
        background: var(--ddd-theme-default-surface);
        color: var(--ddd-theme-default-text);
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--ddd-theme-polaris-border);
        border-radius: var(--ddd-radius-md);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--ddd-font-size-s);
      }
      th,
      td {
        padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
        text-align: left;
        border-bottom: 1px solid var(--ddd-theme-polaris-border);
        white-space: nowrap;
      }
      th {
        background: var(--ddd-theme-polaris-surface);
        color: var(--ddd-theme-secondary);
        font-weight: var(--ddd-font-weight-medium);
        position: sticky;
        top: 0;
      }
      tr:last-child td {
        border-bottom: none;
      }
      td input {
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-s);
        width: 60px;
        padding: var(--ddd-spacing-1);
        border: 1px solid var(--ddd-theme-polaris-border);
        border-radius: var(--ddd-radius-sm);
        background: var(--ddd-theme-default-surface);
        color: var(--ddd-theme-default-text);
      }
      .empty {
        text-align: center;
        color: var(--ddd-theme-secondary);
        padding: var(--ddd-spacing-6);
      }
      @media (max-width: 640px) {
        .console-card {
          padding: var(--ddd-spacing-4);
        }
        th,
        td {
          padding: var(--ddd-spacing-2);
        }
      }
    `;
  }
  render() {
    return html`
      <div class="console-card">
        <div class="header-row">
          <h2>🛠️ Console Dosen</h2>
          <div class="actions">
            <button @click="${this.loadRoster}" ?disabled="${this.loading}">${this.loading ? "Memuat..." : "↻ Muat Ulang Roster"}</button>
            <button class="primary" @click="${this.generateReport}" ?disabled="${this.generating}">${this.generating ? "Menghitung..." : "📊 Generate Laporan Rapor"}</button>
            <button @click="${this.generateFromTemplate}" ?disabled="${this.loading}">✨ Generate Soal Template Lokal</button>
            <button @click="${this.generateFromBankSoal}" ?disabled="${this.loading}">🗂️ Generate Soal dari Bank Soal</button>
          </div>
        </div>
        ${this.message ? html`<div class="message ${this.messageType}">${this.message}</div>` : ""}
        <div class="weights-grid">
          <div class="weight-item">
            <label for="w-attendance">Bobot Kehadiran</label>
            <input id="w-attendance" name="attendanceWeight" type="number" min="0" max="10" .value="${this.weights.attendanceWeight}" @input="${this._onWeightChange}" />
          </div>
          <div class="weight-item">
            <label for="w-uh">Bobot Ulangan Harian</label>
            <input id="w-uh" name="ulanganHarianWeight" type="number" min="0" max="10" .value="${this.weights.ulanganHarianWeight}" @input="${this._onWeightChange}" />
          </div>
          <div class="weight-item">
            <label for="w-uts">Bobot UTS</label>
            <input id="w-uts" name="utsWeight" type="number" min="0" max="10" .value="${this.weights.utsWeight}" @input="${this._onWeightChange}" />
          </div>
          <div class="weight-item">
            <label for="w-uas">Bobot UAS</label>
            <input id="w-uas" name="uasWeight" type="number" min="0" max="10" .value="${this.weights.uasWeight}" @input="${this._onWeightChange}" />
          </div>
          <div class="weight-item">
            <label for="w-sikap">Bobot Sikap</label>
            <input id="w-sikap" name="attitudeWeight" type="number" min="0" max="10" .value="${this.weights.attitudeWeight}" @input="${this._onWeightChange}" />
          </div>
          <div class="weight-item">
            <label for="w-keterampilan">Bobot Keterampilan</label>
            <input id="w-keterampilan" name="skillWeight" type="number" min="0" max="10" .value="${this.weights.skillWeight}" @input="${this._onWeightChange}" />
          </div>
        </div>
        <div class="table-wrap">
          ${this.roster.length === 0
            ? html`<div class="empty">${this.loading ? "Memuat roster..." : "Belum ada data siswa. Pastikan sheet Users terisi."}</div>`
            : html`
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>NIS</th>
                      <th>Aktivitas</th>
                      <th>Kehadiran</th>
                      <th>UH</th>
                      <th>UTS Manual</th>
                      <th>UAS Manual</th>
                      <th>Nilai Akhir</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.roster.map(
                      s => html`
                        <tr>
                          <td><strong>${s.nama}</strong></td>
                          <td>${s.nis}</td>
                          <td>${s.emoji} ${s.totalActivities}</td>
                          <td>${s.kehadiran}</td>
                          <td>${s.uh}</td>
                          <td>
                            <input type="number" min="0" max="100" .value="${this.manualUts[s.studentId] || ""}" @change="${e => {
                              this.manualUts = { ...this.manualUts, [s.studentId]: e.target.value };
                              this.saveManualScore(s.studentId, "uts");
                            }}" />
                          </td>
                          <td>
                            <input type="number" min="0" max="100" .value="${this.manualUas[s.studentId] || ""}" @change="${e => {
                              this.manualUas = { ...this.manualUas, [s.studentId]: e.target.value };
                              this.saveManualScore(s.studentId, "uas");
                            }}" />
                          </td>
                          <td>${s.nilaiAkhir}</td>
                          <td>${s.grade}</td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
        </div>
      </div>
    `;
  }
}
globalThis.customElements.define(LecturerConsole.tag, LecturerConsole);
