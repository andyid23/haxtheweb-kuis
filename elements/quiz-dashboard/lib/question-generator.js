import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

const LITERASI_BANK = [
  {
    type: "mc",
    question:
      "Teks: 'Hujan asam terjadi ketika gas SO2 dan NOx dari pabrik bereaksi dengan uap air di atmosfer.' Pertanyaan: Dampak utama yang langsung ditimbulkan hujan asam adalah...",
    choices: [
      "Tanah menjadi lebih subur",
      "Air danau menjadi lebih asam sehingga biota terganggu",
      "Suhu udara meningkat drastis",
      "Angin bertiup lebih kencang",
    ],
    correctIndex: 1,
    points: 1,
  },
  {
    type: "mc",
    question:
      "Teks: 'Setelah membaca dua paragraf pertama, pembaca mengetahui bahwa tokoh utama merasa cemas sebelum ujian.' Simpulan paling tepat dari teks tersebut adalah...",
    choices: [
      "Tokoh utama selalu gagal dalam ujian",
      "Tokoh utama mengalami kecemasan menjelang ujian",
      "Ujian membuat tokoh utama bahagia",
      "Tokoh utama tidak pernah belajar",
    ],
    correctIndex: 1,
    points: 1,
  },
  {
    type: "mc",
    question:
      "Teks: 'Kata \"konvensional\" dalam kalimat berikut paling dekat maknanya dengan...' Kalimat: \"Metode konvensional sudah jarang digunakan di era digital.\"",
    choices: ["Modern", "Tradisional", "Canggih", "Otomatis"],
    correctIndex: 1,
    points: 1,
  },
  {
    type: "pgk",
    question: "Tentukan Benar atau Salah untuk setiap pernyataan tentang teks informasi:",
    statements: [
      { text: "Ide pokok biasanya terletak di kalimat utama paragraf.", answer: true },
      { text: "Kata tanya 'mengapa' digunakan untuk menanyakan tempat.", answer: false },
      { text: "Kesimpulan harus didukung oleh fakta dalam teks.", answer: true },
    ],
    points: 3,
  },
];

const NUMERASI_BANK = [
  {
    type: "mc",
    question: "Pak Budi membeli 3 lusin pensil. Setengahnya ia bagikan ke siswa. Berapa pensil yang dibagikan?",
    choices: ["12", "18", "24", "36"],
    correctIndex: 1,
    points: 1,
  },
  {
    type: "mc",
    question: "Sebuah kelas memiliki 30 siswa. 40% di antaranya laki-laki. Banyak siswa perempuan adalah...",
    choices: ["12 siswa", "15 siswa", "18 siswa", "20 siswa"],
    correctIndex: 2,
    points: 1,
  },
  {
    type: "matching",
    question: "Jodohkan bangun datar dengan banyak sisinya:",
    leftItems: ["Segitiga", "Persegi", "Lingkaran"],
    rightItems: ["3 sisi", "4 sisi", "Tanpa sisi"],
    correctPairs: { 0: 0, 1: 1, 2: 2 },
    points: 3,
  },
  {
    type: "shortAnswer",
    question: "Berapakah 15% dari 200?",
    acceptedAnswers: ["30", "tiga puluh"],
    points: 1,
  },
  {
    type: "shortAnswer",
    question: "Tentukan KPK dari 4 dan 6!",
    acceptedAnswers: ["12"],
    points: 1,
  },
  {
    type: "pgk",
    question: "Tentukan Benar atau Salah untuk setiap pernyataan:",
    statements: [
      { text: "7 adalah bilangan prima.", answer: true },
      { text: "Semua bilangan genap habis dibagi 4.", answer: false },
      { text: "Hasil 9 × 8 = 72.", answer: true },
    ],
    points: 3,
  },
  {
    type: "mc",
    question: "Sebuah bak mandi berisi 240 liter air. Setiap menit air berkurang 8 liter. Berapa menit hingga bak kosong?",
    choices: ["20 menit", "25 menit", "30 menit", "40 menit"],
    correctIndex: 2,
    points: 1,
  },
];

const MIXED_MC_KOMPLEKS = {
  type: "mc",
  question: "Pilih DUA pernyataan yang benar tentang kubus:",
  choices: [
    "Memiliki 6 sisi berbentuk persegi",
    "Memiliki 8 titik sudut",
    "Memiliki 10 rusuk",
    "Semua sisinya berbentuk segitiga",
  ],
  correctAnswers: [0, 1],
  points: 2,
};

export class QuestionGenerator extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "question-generator";
  }
static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      kategori: { type: String, attribute: "kategori" },
      quizSelector: { type: String, attribute: "quiz-selector" },
      loading: { type: Boolean },
      message: { type: String },
      messageType: { type: String, attribute: "message-type" },
    };
  }
  // kdMateri derived from quiz element's sheetName
  get kdMateri() {
    const quiz = this._getQuizElement();
    return quiz?.sheetName || quiz?.kdMateri || "Pertemuan";
  }
  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Question Generator",
        description: "Generator soal AKM campuran (template lokal & bank soal)",
        icon: "icons:playlist-add",
        color: "teal",
        tags: ["Education", "Assessment", "Content"],
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
          },
          {
            property: "kategori",
            title: "Kategori Soal",
            inputMethod: "select",
            options: {
              campur: "Campuran (Literasi + Numerasi)",
              literasi: "Literasi",
              numerasi: "Numerasi",
            },
          },
          {
            property: "quizSelector",
            title: "Selektor Target Kuis",
            description: "CSS selector elemen explode-quiz tempat soal diisi (mis. #quiz)",
            inputMethod: "textfield",
          },
        ],
        advanced: [],
        developer: [],
      },
      saveOptions: {
        unsetAttributes: ["_screen"],
      },
    };
  }
  constructor() {
    super();
    this.appsScriptUrl = "";
    this.kategori = "campur";
    this.quizSelector = "#quiz";
    this.loading = false;
    this.message = "";
    this.messageType = "info";
    this.t = {
      title: "Generator Soal AKM",
      templateBtn: "✨ Generate Soal Template Lokal",
      bankBtn: "🗂️ Generate Soal dari Bank Soal",
      ok: "ok",
      noQuiz: "Elemen kuis tidak ditemukan (pastikan selector benar).",
      noUrl: "Apps Script URL belum diisi.",
      bankEmpty: "Bank soal kosong untuk kategori tersebut.",
      bankError: "Gagal mengambil soal dari bank soal.",
    };
  }
  connectedCallback() {
    super.connectedCallback();
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[QuestionGenerator.tag]) {
        store.elementList[QuestionGenerator.tag] = QuestionGenerator.haxProperties;
      }
    }
  }
  _setMessage(message, type = "info") {
    this.message = message;
    this.messageType = type;
  }
  _getTemplateBank() {
    if (this.kategori === "literasi") return [...LITERASI_BANK];
    if (this.kategori === "numerasi") return [...NUMERASI_BANK];
    return [...LITERASI_BANK, ...NUMERASI_BANK];
  }
  _shuffleArray(a) {
    const arr = [...a];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  async _fetch(action, body) {
    if (!this.appsScriptUrl) {
      this._setMessage(this.t.noUrl, "error");
      return null;
    }
    try {
      const resp = await fetch(this.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      return await resp.json();
    } catch (e) {
      this._setMessage(this.t.bankError, "error");
      return null;
    }
  }
  _getQuizElement() {
    // 1. Traverse up shadow DOM host chain (existing logic)
    let scope = this.getRootNode();
    while (scope) {
      const found = scope.querySelector ? scope.querySelector(this.quizSelector) : null;
      if (found) return found;
      scope = scope.host ? scope.host.getRootNode() : null;
    }
    // 2. Fallback: search in document (light DOM)
    const docQuiz = document.querySelector(this.quizSelector);
    if (docQuiz) return docQuiz;
    // 3. Fallback: find any explode-quiz in document (shadow DOM piercing)
    const allQuizzes = document.querySelectorAll('explode-quiz');
    if (allQuizzes.length > 0) return allQuizzes[0];
    return null;
  }
  applyToQuiz(questions) {
    const quiz = this._getQuizElement();
    if (!quiz || typeof quiz.loadQuestions !== "function") {
      this._setMessage(this.t.noQuiz, "error");
      return false;
    }
    quiz.loadQuestions(questions);
    this.dispatchEvent(
      new CustomEvent("questions-generated", {
        bubbles: true,
        composed: true,
        detail: { questions, source: "template", kategori: this.kategori },
      }),
    );
    return true;
  }
  async generateFromTemplate() {
    this.loading = true;
    this._setMessage("");
    let bank = this._getTemplateBank();
    if (this.kategori === "campur") {
      bank = this._shuffleArray(bank);
      bank.push(MIXED_MC_KOMPLEKS);
      bank = this._shuffleArray(bank);
    } else {
      bank = this._shuffleArray(bank);
    }
    await new Promise((r) => setTimeout(r, 50));
    this.loading = false;
    if (this.applyToQuiz(bank)) {
      this._setMessage(
        `Soal template lokal dimuat: ${bank.length} soal (${this.kategori}).`,
        "ok",
      );
    }
    return bank;
  }
  async generateFromBankSoal() {
    this.loading = true;
    this._setMessage("");
    const json = await this._fetch("getBankSoal", { kategori: this.kategori });
    this.loading = false;
    if (!json || json.status !== "ok" || !Array.isArray(json.questions)) {
      this._setMessage(json?.message || this.t.bankEmpty, "error");
      return [];
    }
    const questions = json.questions.map((row) => this._mapBankRow(row)).filter(Boolean);
    if (questions.length === 0) {
      this._setMessage(this.t.bankEmpty, "error");
      return [];
    }
    if (this.applyToQuiz(questions)) {
      this._setMessage(
        `Soal dari Bank Soal dimuat: ${questions.length} soal (${this.kategori}).`,
        "ok",
      );
    }
    return questions;
  }
  _mapBankRow(row) {
    if (!row || typeof row !== "object") return null;
    if (row.type && row.question) return row;
    if (typeof row.Detail === "string" || typeof row.detail === "string") {
      const raw = typeof row.Detail === "string" ? row.Detail : row.detail;
      const q = { type: row.Tipe || row.tipe || "mc", question: row.Soal || row.question, points: row.Poin || row.points || 1 };
      if (row.Gambar || row.image) q.image = row.Gambar || row.image;
      try {
        Object.assign(q, JSON.parse(raw));
      } catch (e) {
        return null;
      }
      return q;
    }
    if (row.Soal || row.question) {
      const q = {
        type: (row.Tipe || row.tipe || "mc").toLowerCase(),
        question: row.Soal || row.question,
        points: row.Poin || row.points || 1,
      };
      if (row.Gambar || row.image) q.image = row.Gambar || row.image;
      const detail = row.Detail || row.detail;
      if (typeof detail === "object" && detail) Object.assign(q, detail);
      return q;
    }
    return null;
  }
  render() {
    return html`
      <div class="gen-wrap">
        <h3 class="gen-title">${this.t.title}</h3>
        <div class="gen-actions">
          <button class="gen-btn" @click="${this.generateFromTemplate}" ?disabled="${this.loading}">
            ${this.t.templateBtn}
          </button>
          <button class="gen-btn primary" @click="${this.generateFromBankSoal}" ?disabled="${this.loading}">
            ${this.t.bankBtn}
          </button>
        </div>
        ${this.message
          ? html`<div class="gen-message ${this.messageType}">${this.message}</div>`
          : ""}
      </div>
    `;
  }
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
        }
        .gen-wrap {
          font-family: var(--ddd-font-primary, inherit);
          padding: var(--ddd-spacing-4, 1rem);
        }
        .gen-title {
          margin: 0 0 var(--ddd-spacing-2, 0.5rem);
          font-size: 1.1rem;
        }
        .gen-actions {
          display: flex;
          gap: var(--ddd-spacing-2, 0.5rem);
          flex-wrap: wrap;
        }
        .gen-btn {
          cursor: pointer;
          border: 1px solid var(--ddd-theme-default-beaverBlue, #123);
          border-radius: 8px;
          padding: 0.5rem 0.9rem;
          background: var(--ddd-theme-default-white, #fff);
          color: var(--ddd-theme-default-beaverBlue, #123);
        }
        .gen-btn.primary {
          background: var(--ddd-theme-default-beaverBlue, #123);
          color: #fff;
        }
        .gen-btn[disabled] {
          opacity: 0.6;
          cursor: wait;
        }
        .gen-message {
          margin-top: var(--ddd-spacing-2, 0.5rem);
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .gen-message.ok {
          background: var(--ddd-theme-default-limestoneLight, #e8f5e9);
          color: var(--ddd-theme-default-forestGreen, #1b5e20);
        }
        .gen-message.error {
          background: var(--ddd-theme-default-sunnyLight, #fdecea);
          color: var(--ddd-theme-default-errorRed, #b71c1c);
        }
      `,
    ];
  }
}

customElements.define(QuestionGenerator.tag, QuestionGenerator);
