import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import confetti from "canvas-confetti";

const DEFAULT_QUESTIONS = [
  {
    question: "Apa ibu kota Indonesia?",
    choices: ["Bandung", "Surabaya", "Jakarta", "Medan"],
    correctIndex: 2,
  },
  {
    question: "Berapa hasil dari 7 × 8?",
    choices: ["54", "56", "58", "60"],
    correctIndex: 1,
  },
  {
    question: "Planet terdekat dengan Matahari adalah?",
    choices: ["Venus", "Bumi", "Mars", "Merkurius"],
    correctIndex: 3,
  },
];

class ExplodeQuiz extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "explode-quiz";
  }

  static get haxProperties() {
    return {
      canScale: true,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Explode Quiz",
        description:
          "Interactive multiple-choice quiz with confetti and Google Sheets integration",
        icon: "icons:question-answer",
        color: "purple",
        tags: ["Education", "Interactive", "Content"],
      },
      settings: {
        configure: [
          {
            property: "scriptFunctionName",
            title: "Nama Fungsi Apps Script",
            description:
              "Nama fungsi Google Apps Script untuk menerima hasil kuis",
            inputMethod: "textfield",
          },
          {
            property: "quizCategory",
            title: "Kategori Kuis",
            description:
              "Kategori kuis: formatif, ulangan_harian, uts, atau uas",
            inputMethod: "select",
            options: {
              formatif: "Formatif (Absensi)",
              ulangan_harian: "Ulangan Harian",
              uts: "UTS",
              uas: "UAS",
            },
          },
          {
            property: "shuffleChoices",
            title: "Acak Pilihan Jawaban",
            description: "Mengacak urutan pilihan jawaban setiap kali kuis dimulai",
            inputMethod: "boolean",
          },
          {
            property: "hideAnswers",
            title: "Sembunyikan Jawaban",
            description: "Tidak menampilkan jawaban benar/salah setelah menjawab",
            inputMethod: "boolean",
          },
          {
            property: "hideConfetti",
            title: "Nonaktifkan Confetti",
            description: "Tidak menampilkan efek confetti saat jawaban benar",
            inputMethod: "boolean",
          },
        ],
        advanced: [],
        developer: [],
      },
      saveOptions: {
        unsetAttributes: [
          "_screen",
          "_studentName",
          "_currentIndex",
          "_score",
          "_answered",
          "_selectedIndex",
          "_feedbackText",
          "_feedbackPositive",
          "_validationError",
          "_nameInputValue",
          "_editing",
          "_tempQuestions",
          "_editingIndex",
          "_tempQuestionText",
          "_tempChoice0",
          "_tempChoice1",
          "_tempChoice2",
          "_tempChoice3",
          "_tempCorrectIndex",
          "_editorOrigin",
          "editing",
          "editable",
        ],
      },
    };
  }

  static get properties() {
    return {
      ...super.properties,
      questions: {
        type: Array,
        attribute: "questions",
        reflect: true,
        converter: {
          fromAttribute(value) {
            if (value == null || value === "") return undefined;
            if (Array.isArray(value)) return value;
            if (typeof value === "object") return value;

            const text = String(value).trim();
            if (
              !text ||
              text === "[object Object]" ||
              text === "undefined" ||
              text === "null"
            ) {
              return undefined;
            }

            if (!(text.startsWith("[") || text.startsWith("{"))) {
              return undefined;
            }

            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) return parsed;
              if (
                parsed &&
                typeof parsed === "object" &&
                Array.isArray(parsed.questions)
              ) {
                return parsed.questions;
              }
              return undefined;
            } catch (_) {
              return undefined;
            }
          },
          toAttribute(value) {
            if (!Array.isArray(value)) return null;
            try {
              return JSON.stringify(value);
            } catch (_) {
              return null;
            }
          },
        },
      },
      scriptFunctionName: { type: String, attribute: true },
      spreadsheetId: { type: String, attribute: "spreadsheet-id", reflect: true },
      accessToken: { type: String, attribute: "access-token" },
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      quizCategory: { type: String, attribute: "quiz-category" },
      shuffleChoices: { type: Boolean, attribute: "shuffle-choices", reflect: true },
      hideAnswers: { type: Boolean, attribute: "hide-answers", reflect: true },
      hideConfetti: { type: Boolean, attribute: "hide-confetti", reflect: true },
      studentName: { type: String, attribute: "student-name" },
      studentId: { type: String, attribute: "student-id" },
      studentNis: { type: String, attribute: "student-nis" },
      studentAbsen: { type: String, attribute: "student-absen" },
      studentKelas: { type: String, attribute: "student-kelas" },
      editable: { type: Boolean, attribute: true, reflect: true },
      editing: { type: Boolean, attribute: true, reflect: true },
      _screen: { state: true },
      _studentName: { state: true },
      _currentIndex: { state: true },
      _score: { state: true },
      _answered: { state: true },
      _selectedIndex: { state: true },
      _feedbackText: { state: true },
      _feedbackPositive: { state: true },
      _validationError: { state: true },
      _nameInputValue: { state: true },
      _editing: { state: true },
      _tempQuestions: { state: true },
      _editingIndex: { state: true },
      // Temporary form state for editor
      _tempQuestionText: { state: true },
      _tempChoice0: { state: true },
      _tempChoice1: { state: true },
      _tempChoice2: { state: true },
      _tempChoice3: { state: true },
      _tempCorrectIndex: { state: true },
      _editorOrigin: { state: true },
      _tempQuestionImage: { state: true },
      _tempQuestionType: { state: true },
      _tempCorrectAnswers: { state: true },
      _tempLeftItems: { state: true },
      _tempRightItems: { state: true },
      _tempCorrectPairs: { state: true },
      _tempAcceptedAnswers: { state: true },
      _tempAcceptedStatements: { state: true },
      _shuffledQuestions: { state: true },
      _selectedAnswers: { state: true },
      _matchAnswers: { state: true },
      _shortAnswerText: { state: true },
      _tempQuestionPoints: { state: true },
      _tempChoiceImage0: { state: true },
      _tempChoiceImage1: { state: true },
      _tempChoiceImage2: { state: true },
      _tempChoiceImage3: { state: true },
      _maxPoints: { state: true },
    };
  }

  constructor() {
    super();
    let fn = confetti;
    if (fn && typeof fn !== "function" && typeof fn.default === "function") {
      fn = fn.default;
    }
    this._confettiFn = fn;
    this.questions = DEFAULT_QUESTIONS;
    this.scriptFunctionName = "submitQuizResult";
    this.spreadsheetId = "";
    this.accessToken = "";
    this.appsScriptUrl = "";
    this.sheetName = "Pertemuan";
    this.quizCategory = "formatif";
    this.shuffleChoices = false;
    this.hideAnswers = false;
    this.hideConfetti = false;
    this.studentName = "";
    this.studentId = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
    this.editable = false;
    this._screen = "name";
    this._studentName = "";
    this._currentIndex = 0;
    this._score = 0;
    this._answered = false;
    this._selectedIndex = -1;
    this._feedbackText = "";
    this._feedbackPositive = false;
    this._validationError = "";
    this._nameInputValue = "";
    this._editing = false;
    this._tempQuestions = [];
    this._editingIndex = -1;
    this._tempQuestionText = "";
    this._tempChoice0 = "";
    this._tempChoice1 = "";
    this._tempChoice2 = "";
    this._tempChoice3 = "";
    this._tempCorrectIndex = "0";
    this._editorOrigin = "result";
    this._shuffledQuestions = [];
    this._selectedAnswers = new Set();
    this._matchAnswers = {};
    this._shortAnswerText = "";
    this._tempQuestionImage = "";
    this._tempQuestionType = "mc";
    this._tempCorrectAnswers = [];
    this._tempLeftItems = ["", ""];
    this._tempRightItems = ["", ""];
    this._tempCorrectPairs = {};
    this._tempAcceptedAnswers = "";
    this._tempAcceptedStatements = "[]";
    this._maxPoints = 0;
    this._tempQuestionPoints = 1;
    this._tempChoiceImage0 = "";
    this._tempChoiceImage1 = "";
    this._tempChoiceImage2 = "";
    this._tempChoiceImage3 = "";
    this.t = {
      quizTitle: "Kuis Interaktif",
      quizInstruction: "Masukkan nama Anda untuk memulai kuis.",
      namePlaceholder: "Nama Anda...",
      startButton: "Mulai Kuis",
      validationNameEmpty: "Nama tidak boleh kosong.",
      validationNameShort: "Nama harus lebih dari 2 karakter.",

      // Layar_Soal
      questionOf: "Soal",
      of: "dari",
      scoreLabel: "Skor",
      feedbackCorrect: "Mantap, Benar!",
      feedbackWrongPrefix: "Yah, Salah. Jawaban benar: ",

      // Layar_Hasil
      resultHeading: "Hasil Kuis",
      resultName: "Nama",
      resultScore: "Skor",
      resultTotal: "Total Soal",
      resultPercentage: "Persentase",
      messageHigh: "Luar Biasa! Kamu Hebat!",
      messageMedium: "Bagus! Terus Berlatih!",
      messageLow: "Jangan Menyerah! Coba Lagi!",
      restartButton: "Mulai Ulang",

      // Editor
      editTitle: "Edit Soal Kuis",
      closeEditor: "Tutup Editor",
      questionPlaceholder: "Tulis pertanyaan...",
      choicePlaceholder: "Pilihan {N}",
      choiceCorrectLabel: "Benar",
      addQuestionBtn: "Tambah Soal",
      editQuestionBtn: "Edit",
      deleteQuestionBtn: "Hapus",
      saveEditBtn: "Simpan Perubahan",
      cancelEditBtn: "Batal",
      saveAllBtn: "Simpan & Keluar",
      cancelAllBtn: "Batal",
      minQuestionsError: "Minimal 3 soal harus tersedia",
      emptyQuestionError: "Pertanyaan tidak boleh kosong",
      emptyChoiceError: "Semua pilihan jawaban harus diisi",

      // Aksesibilitas aria-label
      ariaNameInput: "Kolom nama siswa",
      ariaStartButton: "Tombol mulai kuis",
      ariaAnswerButton: "Pilihan jawaban",
      ariaRestartButton: "Mulai ulang kuis",
      ariaScoreDisplay: "Skor saat ini",
      ariaProgressLabel: "Kemajuan kuis",
      ariaFeedback: "Umpan balik jawaban",

      // Editor aria-labels
      ariaEditTitle: "Panel editor soal kuis",
      ariaCloseEditor: "Tutup panel editor",
      ariaAddForm: "Formulir tambah soal baru",
      ariaQuestionInput: "Teks pertanyaan",
      ariaChoiceInput: "Pilihan jawaban {N}",
      ariaCorrectChoice: "Pilihan jawaban benar",
      ariaQuestionsList: "Daftar soal yang tersedia",
      ariaQuestionCard: "Kartu soal",
      ariaEditQuestion: "Edit soal ini",
      ariaDeleteQuestion: "Hapus soal ini",
      ariaSaveEdit: "Simpan perubahan soal",
      ariaCancelEdit: "Batal mengedit soal",
      ariaSaveAll: "Simpan semua perubahan dan keluar",
      ariaCancelAll: "Batal semua perubahan dan keluar",
    };
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (this.questions && this.questions.length === 0) {
      this.questions = DEFAULT_QUESTIONS;
    }
    if (changedProperties.has("studentName") && this.studentName) {
      this._studentName = this.studentName;
      if (this._screen === "name") {
        this._screen = "quiz";
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();

    // Internal auth listener — catches quiz-user-login even if demo listener is missing
    this._authHandler = (e) => {
      if (e.detail.studentId) this.studentId = e.detail.studentId;
      if (e.detail.nama) this.studentName = e.detail.nama;
      if (e.detail.nis) this.studentNis = e.detail.nis;
      if (e.detail.absen) this.studentAbsen = e.detail.absen;
      if (e.detail.kelas) this.studentKelas = e.detail.kelas;
    };
    window.addEventListener("quiz-user-login", this._authHandler);

    // HAXcms autoloader integration: register with HAXStore element tray
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[ExplodeQuiz.tag]) {
        store.elementList[ExplodeQuiz.tag] = ExplodeQuiz.haxProperties;
      }
    }
  }

  /** Only true inside HAX editor (hax start / haxcms local dev) */
  get _inHaxEditor() {
    return !!(
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function" &&
      globalThis.HaxStore.requestAvailability().editMode
    );
  }

  _fireConfetti() {
    if (typeof this._confettiFn !== "function") return;
    try {
      const base = {
        ticks: 220,
        gravity: 0.85,
        decay: 0.92,
        startVelocity: 42,
        zIndex: 9999,
      };

      // Center pop
      this._confettiFn({
        ...base,
        particleCount: 70,
        spread: 85,
        scalar: 1.05,
        origin: { x: 0.5, y: 0.62 },
      });

      // Left burst
      this._confettiFn({
        ...base,
        particleCount: 45,
        angle: 58,
        spread: 65,
        scalar: 1.1,
        origin: { x: 0.1, y: 0.7 },
      });

      // Right burst
      this._confettiFn({
        ...base,
        particleCount: 45,
        angle: 122,
        spread: 65,
        scalar: 1.1,
        origin: { x: 0.9, y: 0.7 },
      });
    } catch (err) {
      console.error("[explode-quiz] Konfeti gagal dieksekusi:", err);
    }
  }

  _fireMegaConfetti() {
    if (typeof this._confettiFn !== "function") return;
    try {
      const duration = 900;
      const end = Date.now() + duration;
      const frame = () => {
        this._confettiFn({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"],
        });
        this._confettiFn({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch (err) {
      console.error("[explode-quiz] Mega konfeti gagal dieksekusi:", err);
    }
  }

  _getMaxPoints() {
    return (this.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
  }

  _shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _startQuiz() {
    const trimmed = this._nameInputValue.trim();
    if (trimmed.length <= 2) {
      this._validationError =
        trimmed.length === 0
          ? this.t.validationNameEmpty
          : this.t.validationNameShort;
      return;
    }
    this._studentName = trimmed;
    this._validationError = "";
    this._selectedAnswers = new Set();
    this._matchAnswers = {};
    this._shortAnswerText = "";
    if (this.shuffleChoices) {
      this._shuffledQuestions = this.questions.map(q => {
        if (!q.choices) return { ...q };
        const pairs = q.choices.map((c, i) => ({ text: c, origIndex: i }));
        const shuffled = this._shuffleArray(pairs);
        return { ...q, choices: shuffled.map(p => p.text), _correctMap: shuffled.map(p => p.origIndex) };
      });
    } else {
      this._shuffledQuestions = [];
    }
    this._screen = "question";
  }

  _renderNameScreen() {
    return html`
      <h1 class="quiz-title">${this.t.quizTitle}</h1>
      <p class="quiz-instruction">${this.t.quizInstruction}</p>
      <div class="input-group">
        <input
          id="name-input"
          .value="${this._nameInputValue}"
          @input="${(e) => (this._nameInputValue = e.target.value)}"
          @keydown="${(e) => {
            if (e.key === "Enter") this._startQuiz();
          }}"
          .placeholder="${this.t.namePlaceholder}"
          aria-label="${this.t.ariaNameInput}"
          type="text"
        />
      </div>
      <button
        class="start-btn"
        @click="${this._startQuiz}"
        aria-label="${this.t.ariaStartButton}"
      >
        ${this.t.startButton}
      </button>
      ${this._validationError
        ? html`<p class="validation-error">${this._validationError}</p>`
        : ""}
      <button
        class="edit-questions-btn"
        @click="${this._openEditorFromName}"
        aria-label="${this.t.ariaCloseEditor}"
        ?hidden="${!this._inHaxEditor && !this.editable}"
      >
        ${this.t.editTitle}
      </button>
    `;
  }

  _renderQuestionScreen() {
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const q = activeQuestions[this._currentIndex];
    const progressLabel = `${this.t.questionOf} ${this._currentIndex + 1} ${this.t.of} ${activeQuestions.length}`;
    const qType = q.type || "mc";
    const isMulti = Array.isArray(q.correctAnswers);

    return html`
      <header class="quiz-header">
        <span class="progress-label">${progressLabel}</span>
        <span class="score-display">${this.t.scoreLabel}: ${this._score}</span>
      </header>

      <div class="question-text">${q.question}</div>
      ${q.image ? html`<div style="text-align:center;margin:12px 0;"><img src="${q.image}" alt="Gambar soal" style="max-width:100%;border-radius:8px;border:1px solid #e0e0e0;"></div>` : ""}

      ${qType === "matching" ? this._renderMatching(q) : ""}
      ${qType === "shortAnswer" ? this._renderShortAnswer(q) : ""}
      ${qType === "pgk" ? this._renderPGK(q) : ""}
      ${qType === "mc" ? this._renderMC(q, isMulti) : ""}

      ${this._feedbackText
        ? html`<div class="feedback-area ${this._feedbackPositive ? "positive" : "negative"}" aria-live="polite">${this._feedbackText}</div>`
        : ""}

      ${this.editable ? html`<button class="edit-questions-btn" style="margin-top:12px;font-size:12px;padding:6px 12px;" @click="${this._openEditor}">✏️ Edit Soal</button>` : ""}
    `;
  }

  _getChoiceText(choice) {
    return typeof choice === 'string' ? choice : (choice?.text || '');
  }
  _getChoiceImage(choice) {
    return typeof choice === 'string' ? null : (choice?.image || null);
  }

  _renderMC(q, isMulti) {
    return html`<div class="answer-grid">
      ${q.choices.map((choice, index) => {
        let btnClass = "answer-btn";
        const isSelected = isMulti ? this._selectedAnswers.has(index) : index === this._selectedIndex;
        if (this._answered && !this.hideAnswers) {
          const correctIndices = q.correctAnswers || (q.correctIndex != null ? [q.correctIndex] : []);
          const mappedCorrect = q._correctMap || correctIndices;
          const isCorrectChoice = mappedCorrect.includes(index);
          if (isCorrectChoice) btnClass += " answer-btn--correct";
          else if (isSelected) btnClass += " answer-btn--wrong";
        } else if (isMulti && isSelected) {
          btnClass += " answer-btn--selected";
        } else if (!isMulti && isSelected) {
          btnClass += " answer-btn--selected";
        }
        return html`<button class="${btnClass}" ?disabled="${this._answered}"
          @click="${() => isMulti ? this._toggleMultiAnswer(index) : this._selectAnswer(index)}"
          aria-label="${this.t.ariaAnswerButton}: ${this._getChoiceText(choice)}">
          ${this._getChoiceImage(choice) ? html`<img src="${this._getChoiceImage(choice)}" alt="" style="max-height:60px;border-radius:6px;object-fit:contain;display:block;margin:0 auto 4px;">` : ""}
          ${isMulti && isSelected ? "✓ " : ""}${this._getChoiceText(choice)}</button>`;
      })}
      ${isMulti && !this._answered ? html`<button class="start-btn" style="margin-top:12px;font-size:13px;" @click="${() => this._submitMultiAnswers()}">Kirim Jawaban (${this._selectedAnswers.size} dipilih)</button>` : ""}
    </div>`;
  }

  _renderPGK(q) {
    const statements = q.statements || [];
    return html`<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
      <thead><tr style="background:#f3f0fa;">
        <th style="text-align:left;padding:8px;">Pernyataan</th>
        <th style="text-align:center;width:80px;">Benar</th>
        <th style="text-align:center;width:80px;">Salah</th>
      </tr></thead>
      <tbody>
        ${statements.map((s, i) => html`<tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">${s.text}</td>
          <td style="text-align:center;"><input type="radio" name="pgk_${this._currentIndex}_${i}" value="true"
            ?disabled="${this._answered}" @change="${() => this._setPGK(i, true)}"
            ${this._matchAnswers[i] === true ? "checked" : ""}></td>
          <td style="text-align:center;"><input type="radio" name="pgk_${this._currentIndex}_${i}" value="false"
            ?disabled="${this._answered}" @change="${() => this._setPGK(i, false)}"
            ${this._matchAnswers[i] === false ? "checked" : ""}></td>
        </tr>`)}
      </tbody>
    </table>
    ${!this._answered ? html`<button class="start-btn" style="margin-top:12px;font-size:13px;" @click="${() => this._submitPGK()}">Kirim Jawaban</button>` : ""}`;
  }

  _renderMatching(q) {
    const left = q.leftItems || [];
    const right = q.rightItems || [];
    return html`<div style="margin:12px 0;">
      ${left.map((item, i) => html`<div style="display:flex;align-items:center;gap:12px;margin:8px 0;font-size:13px;">
        <span style="min-width:200px;font-weight:500;">${i + 1}. ${item}</span>
        <span style="font-size:18px;">→</span>
        <select ?disabled="${this._answered}" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"
          @change="${(e) => { this._matchAnswers = { ...this._matchAnswers, [i]: parseInt(e.target.value) }; this.requestUpdate(); }}">
          <option value="-1">-- Pilih --</option>
          ${right.map((r, ri) => html`<option value="${ri}" ?selected="${this._matchAnswers[i] === ri}">${String.fromCharCode(65 + ri)}. ${r}</option>`)}
        </select>
      </div>`)}
      ${!this._answered ? html`<button class="start-btn" style="margin-top:12px;font-size:13px;" @click="${() => this._submitMatching()}">Kirim Jawaban</button>` : ""}
    </div>`;
  }

  _renderShortAnswer(q) {
    return html`<div style="margin:12px 0;">
      <input type="text" ?disabled="${this._answered}" placeholder="Ketik jawaban..."
        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #ccc;font-size:14px;box-sizing:border-box;"
        .value="${this._shortAnswerText}" @input="${(e) => { this._shortAnswerText = e.target.value; }}">
      ${!this._answered ? html`<button class="start-btn" style="margin-top:12px;font-size:13px;" @click="${() => this._submitShortAnswer()}">Kirim Jawaban</button>` : ""}
    </div>`;
  }

  _selectAnswer(choiceIndex) {
    if (this._answered) return;

    this._answered = true;
    this._selectedIndex = choiceIndex;

    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const currentQuestion = activeQuestions[this._currentIndex];
    const correctIndices = currentQuestion.correctAnswers || (currentQuestion.correctIndex != null ? [currentQuestion.correctIndex] : []);
    const isCorrect = correctIndices.includes(choiceIndex);

    if (isCorrect) {
      this._score += (currentQuestion.points || 1);
      if (!this.hideAnswers) {
        this._feedbackText = this.t.feedbackCorrect;
        this._feedbackPositive = true;
      }
      if (!this.hideConfetti) this._fireConfetti();
    } else {
      if (!this.hideAnswers) {
        const correctNames = correctIndices.map(i => currentQuestion.choices[i]).join(", ");
        this._feedbackText = `${this.t.feedbackWrongPrefix}${correctNames}`;
        this._feedbackPositive = false;
      }
    }

    // Schedule advance after delay
    setTimeout(() => {
      this._advanceQuiz();
    }, 1200);
  }

  _toggleMultiAnswer(index) {
    if (this._answered) return;
    const s = new Set(this._selectedAnswers);
    if (s.has(index)) s.delete(index); else s.add(index);
    this._selectedAnswers = s;
  }

  _submitMultiAnswers() {
    if (this._answered || this._selectedAnswers.size === 0) return;
    this._answered = true;
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const q = activeQuestions[this._currentIndex];
    const correct = new Set(q.correctAnswers || []);
    const selected = this._selectedAnswers;
    const isCorrect = correct.size === selected.size && [...correct].every(c => selected.has(c));
    if (isCorrect) {
      this._score += (q.points || 1);
      if (!this.hideAnswers) {
        this._feedbackText = this.t.feedbackCorrect;
        this._feedbackPositive = true;
      }
      if (!this.hideConfetti) this._fireConfetti();
    } else {
      if (!this.hideAnswers) {
        const correctNames = [...correct].map(i => q.choices[i]).join(", ");
        this._feedbackText = `${this.t.feedbackWrongPrefix}${correctNames}`;
        this._feedbackPositive = false;
      }
    }
    setTimeout(() => this._advanceQuiz(), 1200);
  }

  _setPGK(index, value) {
    if (this._answered) return;
    this._matchAnswers = { ...this._matchAnswers, [index]: value };
  }

  _submitPGK() {
    if (this._answered) return;
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const q = activeQuestions[this._currentIndex];
    const statements = q.statements || [];
    if (Object.keys(this._matchAnswers).length < statements.length) return;
    this._answered = true;
    const correctAnswers = statements.map(s => s.answer);
    let allCorrect = true;
    for (let i = 0; i < statements.length; i++) {
      if (this._matchAnswers[i] !== correctAnswers[i]) { allCorrect = false; break; }
    }
    if (allCorrect) {
      this._score += (q.points || 1);
      if (!this.hideAnswers) {
        this._feedbackText = this.t.feedbackCorrect;
        this._feedbackPositive = true;
      }
      if (!this.hideConfetti) this._fireConfetti();
    } else {
      if (!this.hideAnswers) {
        const answerText = statements.map((s, i) => `${i + 1}: ${s.answer ? "Benar" : "Salah"}`).join(", ");
        this._feedbackText = `${this.t.feedbackWrongPrefix}${answerText}`;
        this._feedbackPositive = false;
      }
    }
    setTimeout(() => this._advanceQuiz(), 1200);
  }

  _submitMatching() {
    if (this._answered) return;
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const q = activeQuestions[this._currentIndex];
    const left = q.leftItems || [];
    const correctPairs = q.correctPairs || {};
    if (Object.keys(this._matchAnswers).length < left.length) return;
    this._answered = true;

    // Partial score: count correct pairs
    let correctCount = 0;
    for (let i = 0; i < left.length; i++) {
      if (this._matchAnswers[i] === correctPairs[i]) correctCount++;
    }
    const totalPoints = q.points || 1;
    const earned = Math.round((correctCount / left.length) * totalPoints);
    this._score += earned;

    if (!this.hideAnswers) {
      if (correctCount === left.length) {
        this._feedbackText = `${this.t.feedbackCorrect} (${correctCount}/${left.length} pasangan benar, +${earned} poin)`;
        this._feedbackPositive = true;
      } else if (correctCount > 0) {
        this._feedbackText = `${correctCount}/${left.length} pasangan benar (+${earned} poin). Lanjutkan!`;
        this._feedbackPositive = true;
      } else {
        const correctText = Object.entries(correctPairs).map(([k, v]) => `${parseInt(k) + 1}→${String.fromCharCode(65 + v)}`).join(", ");
        this._feedbackText = `${this.t.feedbackWrongPrefix}${correctText}`;
        this._feedbackPositive = false;
      }
    }
    if (!this.hideConfetti && correctCount === left.length) this._fireConfetti();
    setTimeout(() => this._advanceQuiz(), 1200);
  }

  _submitShortAnswer() {
    if (this._answered) return;
    const text = this._shortAnswerText.trim().toLowerCase();
    if (!text) return;
    this._answered = true;
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    const q = activeQuestions[this._currentIndex];
    const accepted = (q.acceptedAnswers || []).map(a => a.toLowerCase());
    const isCorrect = accepted.some(a => text.includes(a));
    if (isCorrect) {
      this._score += (q.points || 1);
      if (!this.hideAnswers) {
        this._feedbackText = this.t.feedbackCorrect;
        this._feedbackPositive = true;
      }
      if (!this.hideConfetti) this._fireConfetti();
    } else {
      if (!this.hideAnswers) {
        this._feedbackText = `${this.t.feedbackWrongPrefix}${(q.acceptedAnswers || []).join(" / ")}`;
        this._feedbackPositive = false;
      }
    }
    setTimeout(() => this._advanceQuiz(), 1200);
  }

  _advanceQuiz() {
    const activeQuestions = this._shuffledQuestions.length > 0 ? this._shuffledQuestions : this.questions;
    if (this._currentIndex < activeQuestions.length - 1) {
      this._currentIndex += 1;
      this._answered = false;
      this._selectedIndex = -1;
      this._feedbackText = "";
      this._feedbackPositive = false;
    this._selectedAnswers = new Set();
    this._matchAnswers = {};
    this._shortAnswerText = "";
    this._maxPoints = this._getMaxPoints();
    } else {
      this._submitToSheets(this._studentName, this._score);
      
      // Always dispatch quiz-saved event for activity tracking
      const percentage = Math.round((this._score / this._maxPoints) * 100);
      this.dispatchEvent(new CustomEvent("quiz-saved", {
        detail: { name: this._studentName, score: percentage },
        bubbles: true,
        composed: true
      }));
      
      this._screen = "result";
      // Trigger confetti if score >= 80%
      if (this._score / this._maxPoints >= 0.8) {
        this._fireConfetti();
      }
    }
  }

  _renderResultScreen() {
    const percentage = Math.round((this._score / this._maxPoints) * 100);
    let message = this.t.messageLow;

    if (percentage >= 80) {
      message = this.t.messageHigh;
    } else if (percentage >= 50) {
      message = this.t.messageMedium;
    }

    return html`
      <h2 class="result-heading">${this.t.resultHeading}</h2>

      <div class="result-name">${this.t.resultName}: ${this._studentName}</div>
      <div class="result-score">
        ${this.t.resultScore}: ${this._score} / ${this._maxPoints} poin
      </div>
      <div class="result-percentage">
        ${this.t.resultPercentage}: ${percentage}%
      </div>

      <p class="result-message">${message}</p>

      <button
        class="restart-btn"
        @click="${this._restartQuiz}"
        aria-label="${this.t.ariaRestartButton}"
      >
        ${this.t.restartButton}
      </button>
      <button
        class="edit-questions-btn"
        @click="${this._openEditor}"
        aria-label="${this.t.ariaCloseEditor}"
        ?hidden="${!this._inHaxEditor && !this.editable}"
      >
        ${this.t.editTitle}
      </button>
    `;
  }

  _restartQuiz() {
    this._screen = this.studentName ? "quiz" : "name";
    this._studentName = this.studentName || "";
    this._currentIndex = 0;
    this._score = 0;
    this._answered = false;
    this._selectedIndex = -1;
    this._feedbackText = "";
    this._feedbackPositive = false;
    this._validationError = "";
    this._nameInputValue = "";
    this._editing = false;
    this._tempQuestions = [];
    this._editingIndex = -1;
    this._tempQuestionText = "";
    this._tempChoice0 = "";
    this._tempChoice1 = "";
    this._tempChoice2 = "";
    this._tempChoice3 = "";
    this._tempCorrectIndex = "0";
    this._editorOrigin = "result";
  }

  _submitToSheets(name, score) {
    const percentage = Math.round((score / this._maxPoints) * 100);

    // Priority 1: Use Apps Script URL directly (no backend needed!)
    if (this.appsScriptUrl) {
      console.log("[explode-quiz] Mengirim ke Apps Script URL...", name, percentage);

      // Use GET because it matches the working Apps Script cross-origin auth flow.
      const params = new URLSearchParams({
        action: "submit",
        name: name,
        score: percentage,
        totalQuestions: this.questions.length,
        totalPoints: this._maxPoints,
        timestamp: new Date().toISOString(),
        sheet: this.sheetName || "Pertemuan",
        studentId: this.studentId || "",
        nis: this.studentNis || "",
        absen: this.studentAbsen || "",
        kelas: this.studentKelas || "",
        quizCategory: this.quizCategory || "formatif",
        type: "quiz"
      });
      const url = `${this.appsScriptUrl}?${params.toString()}`;

      fetch(url, { redirect: "follow" })
        .then(res => res.json())
        .then(data => {
          console.log("[explode-quiz] Tersimpan:", data);
          this.dispatchEvent(new CustomEvent("quiz-saved", {
            detail: { name, score: percentage, data },
            bubbles: true,
            composed: true
          }));
        })
        .catch(err => {
          console.error("[explode-quiz] Error menyimpan ke Google Sheets:", err);
        });
      return;
    }
    
    // Priority 2: Use backend API with spreadsheetId
    if (this.spreadsheetId) {
      console.log("[explode-quiz] Mengirim ke Sheets API via backend...", name, score);
      fetch('/api/save-quiz-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spreadsheetId: this.spreadsheetId,
          name,
          score,
          accessToken: this.accessToken || ""
        })
      })
      .then(res => {
        if (!res.ok) throw new Error("Gagal menyimpan hasil kuis");
        return res.json();
      })
      .then(data => {
        console.log("[explode-quiz] Data berhasil disimpan ke Google Sheets:", data);
        this.dispatchEvent(new CustomEvent("quiz-saved", {
          detail: { name, score: percentage, data },
          bubbles: true,
          composed: true
        }));
      })
      .catch(err => {
        console.error("[explode-quiz] Error menyimpan ke Google Sheets:", err);
      });
      return;
    }

    if (
      typeof globalThis.google !== "undefined" &&
      globalThis.google?.script?.run
    ) {
      const payload = {
        timestamp: new Date().toISOString(),
        name,
        score,
      };

      globalThis.google.script.run
        .withSuccessHandler(() =>
          console.log("[explode-quiz] Data berhasil dikirim ke Sheets"),
        )
        .withFailureHandler((err) =>
          console.error("[explode-quiz] Gagal mengirim ke Sheets:", err),
        )
        [this.scriptFunctionName](payload);
      return;
    }

    console.warn(
      "[explode-quiz] Google Sheets belum dikonfigurasi (spreadsheet-id / access-token kosong)",
    );
  }

  _openEditor() {
    if (this._editing) return;
    if (this._screen !== "result" && this._screen !== "question") return;

    this._editing = true;
    this._editingIndex = -1;
    this._tempQuestions = JSON.parse(JSON.stringify(this.questions));
    this._screen = "editor";
  }

  _openEditorFromName() {
    if (this._screen !== "name") return;
    if (this._editing) return;

    this._editing = true;
    this._editingIndex = -1;
    this._tempQuestions = JSON.parse(JSON.stringify(this.questions));
    // Remember we came from name screen so save/cancel go back there
    this._editorOrigin = "name";
    this._screen = "editor";
  }

  _renderEditorScreen() {
    const qType = this._tempQuestionType || "mc";
    return html`
      <header class="edit-header">
        <h2 class="edit-title">${this.t.editTitle}</h2>
        <button class="close-editor-btn" @click="${this._saveAll}">${this.t.closeEditor}</button>
      </header>

      <div class="editor-content">
        <form class="add-question-form">
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <select style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;" .value="${qType}" @change="${(e) => { this._tempQuestionType = e.target.value; }}">
              <option value="mc">Pilihan Ganda</option>
              <option value="pgk">PG Kompleks (Benar/Salah)</option>
              <option value="matching">Menjodohkan</option>
              <option value="shortAnswer">Isian Singkat</option>
            </select>
            <input type="text" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"
              placeholder="URL gambar (opsional)" .value="${this._tempQuestionImage}"
              @input="${(e) => { this._tempQuestionImage = e.target.value; }}">
            <label style="font-size:12px;color:#555;white-space:nowrap;">Poin:</label>
            <input type="number" min="1" style="width:50px;padding:6px;border-radius:6px;border:1px solid #ccc;font-size:13px;text-align:center;"
              .value="${this._tempQuestionPoints}" @input="${(e) => { this._tempQuestionPoints = parseInt(e.target.value) || 1; }}">
          </div>
          ${this._tempQuestionImage ? html`<div style="text-align:center;margin:8px 0;"><img src="${this._tempQuestionImage}" style="max-width:200px;border-radius:6px;border:1px solid #ddd;"></div>` : ""}

          <textarea class="question-text-input" .value="${this._tempQuestionText}"
            @input="${(e) => (this._tempQuestionText = e.target.value)}"
            placeholder="${this.t.questionPlaceholder}"></textarea>

          ${qType === "mc" ? this._renderEditorMC() : ""}
          ${qType === "pgk" ? this._renderEditorPGK() : ""}
          ${qType === "matching" ? this._renderEditorMatching() : ""}
          ${qType === "shortAnswer" ? this._renderEditorShortAnswer() : ""}

          <button type="button" class="add-question-btn" @click="${this._addQuestion}">${this.t.addQuestionBtn}</button>
        </form>

        <div class="questions-list">
          ${this._tempQuestions.map((question, index) => html`
            <div class="question-card">
              ${this._editingIndex === index ? html`
                <div class="edit-form">
                  <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <select style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"
                      .value="${this._tempQuestionType}" @change="${(e) => { this._tempQuestionType = e.target.value; }}">
                      <option value="mc">Pilihan Ganda</option>
                      <option value="pgk">PG Kompleks</option>
                      <option value="matching">Menjodohkan</option>
                      <option value="shortAnswer">Isian Singkat</option>
                    </select>
                    <input type="text" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"
                      placeholder="URL gambar" .value="${this._tempQuestionImage}"
                      @input="${(e) => { this._tempQuestionImage = e.target.value; }}">
                    <label style="font-size:12px;color:#555;white-space:nowrap;">Poin:</label>
                    <input type="number" min="1" style="width:50px;padding:6px;border-radius:6px;border:1px solid #ccc;font-size:13px;text-align:center;"
                      .value="${this._tempQuestionPoints}" @input="${(e) => { this._tempQuestionPoints = parseInt(e.target.value) || 1; }}">
                  </div>
                  <textarea class="edit-question-text-input" .value="${this._tempQuestionText}"
                    @input="${(e) => (this._tempQuestionText = e.target.value)}"
                    placeholder="${this.t.questionPlaceholder}"></textarea>
                  ${this._tempQuestionType === "mc" ? this._renderEditorMC() : ""}
                  ${this._tempQuestionType === "pgk" ? this._renderEditorPGK() : ""}
                  ${this._tempQuestionType === "matching" ? this._renderEditorMatching() : ""}
                  ${this._tempQuestionType === "shortAnswer" ? this._renderEditorShortAnswer() : ""}
                  <div style="display:flex;gap:8px;margin-top:8px;">
                    <button type="button" class="add-question-btn" @click="${this._saveEditQuestion}">${this.t.saveEditBtn}</button>
                    <button type="button" class="add-question-btn" style="background:#ccc;color:#333;" @click="${this._cancelEditQuestion}">${this.t.cancelEditBtn}</button>
                  </div>
                </div>
              ` : html`
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <strong style="color:#6750a4;">[${(question.type || "mc").toUpperCase()}]</strong> ${question.question}
                    ${question.image ? html`<span style="font-size:11px;color:#888;">[gambar]</span>` : ""}
                    <span style="font-size:11px;color:#059669;font-weight:bold;">[${question.points || 1} poin]</span>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="edit-btn" @click="${() => this._startEditQuestion(index)}">${this.t.editQuestionBtn}</button>
                    <button class="delete-btn" @click="${() => this._deleteQuestion(index)}">${this.t.deleteQuestionBtn}</button>
                  </div>
                </div>
              `}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  _renderEditorMC() {
    const isMulti = this._tempCorrectAnswers.length > 1;
    return html`
      <div class="choices-container">
        ${[0, 1, 2, 3].map(index => html`
          <div class="choice-input-wrapper" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;">
            <input class="choice-input" style="flex:1;min-width:120px;" .value="${this[`_tempChoice${index}`]}"
              @input="${(e) => (this[`_tempChoice${index}`] = e.target.value)}"
              placeholder="${this.t.choicePlaceholder.replace("{N}", index + 1)}" />
            <input type="url" placeholder="🖼️ URL gambar" style="width:150px;padding:6px;border-radius:4px;border:1px solid #ccc;font-size:12px;"
              .value="${this[`_tempChoiceImage${index}`] || ''}"
              @input="${(e) => (this[`_tempChoiceImage${index}`] = e.target.value)}" />
            <label class="choice-label" style="font-size:12px;">
              <input type="checkbox" ?checked="${this._tempCorrectAnswers.includes(index)}"
                @change="${(e) => {
                  if (e.target.checked) this._tempCorrectAnswers = [...this._tempCorrectAnswers, index];
                  else this._tempCorrectAnswers = this._tempCorrectAnswers.filter(i => i !== index);
                  if (this._tempCorrectAnswers.length <= 1) this._tempCorrectIndex = index.toString();
                }}" />
              ${this.t.choiceCorrectLabel}
            </label>
            ${this[`_tempChoiceImage${index}`] ? html`<img src="${this[`_tempChoiceImage${index}`]}" style="max-height:32px;border-radius:3px;margin-left:auto;">` : ""}
          </div>
        `)}
      </div>
      ${this._tempCorrectAnswers.length <= 1 ? html`
        <div style="font-size:11px;color:#888;margin-top:4px;">Pilih 1 jawaban benar. Centang lebih dari 1 untuk mode PG Kompleks.</div>
      ` : html`
        <div style="font-size:11px;color:#6750a4;margin-top:4px;font-weight:bold;">Mode PG Kompleks: ${this._tempCorrectAnswers.length} jawaban benar dipilih</div>
      `}
    `;
  }

  _renderEditorPGK() {
    let statements = [];
    try { statements = JSON.parse(this._tempAcceptedStatements || "[]"); } catch (_) {}
    return html`<div style="margin:8px 0;font-size:13px;">
      <div style="font-weight:500;margin-bottom:4px;">Pernyataan (JSON array, format: [{"text":"...","answer":true}]):</div>
      <textarea style="width:100%;min-height:80px;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:12px;font-family:monospace;"
        .value="${this._tempAcceptedStatements}" @input="${(e) => { this._tempAcceptedStatements = e.target.value; }}"></textarea>
    </div>`;
  }

  _renderEditorMatching() {
    return html`<div style="margin:8px 0;font-size:13px;">
      <div style="display:flex;gap:16px;">
        <div style="flex:1;">
          <div style="font-weight:500;margin-bottom:4px;">Item Kiri:</div>
          ${this._tempLeftItems.map((item, i) => html`
            <input style="width:100%;padding:4px 8px;margin:4px 0;border-radius:4px;border:1px solid #ccc;font-size:12px;"
              .value="${item}" @input="${(e) => { const a = [...this._tempLeftItems]; a[i] = e.target.value; this._tempLeftItems = a; }}"
              placeholder="Item ${i + 1}">
          `)}
          <button type="button" style="font-size:11px;margin-top:4px;padding:2px 8px;border-radius:4px;border:1px solid #ccc;"
            @click="${() => { this._tempLeftItems = [...this._tempLeftItems, ""]; }}">+ Tambah</button>
        </div>
        <div style="flex:1;">
          <div style="font-weight:500;margin-bottom:4px;">Item Kanan:</div>
          ${this._tempRightItems.map((item, i) => html`
            <input style="width:100%;padding:4px 8px;margin:4px 0;border-radius:4px;border:1px solid #ccc;font-size:12px;"
              .value="${item}" @input="${(e) => { const a = [...this._tempRightItems]; a[i] = e.target.value; this._tempRightItems = a; }}"
              placeholder="Item ${String.fromCharCode(65 + i)}">
          `)}
          <button type="button" style="font-size:11px;margin-top:4px;padding:2px 8px;border-radius:4px;border:1px solid #ccc;"
            @click="${() => { this._tempRightItems = [...this._tempRightItems, ""]; }}">+ Tambah</button>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div style="font-weight:500;margin-bottom:4px;">Kunci Jawaban (JSON: {"0":1,"1":0} artinya Item Kiri 0→Item Kanan B):</div>
        <input style="width:100%;padding:6px 8px;border-radius:4px;border:1px solid #ccc;font-size:12px;font-family:monospace;"
          .value="${JSON.stringify(this._tempCorrectPairs)}"
          @input="${(e) => { try { this._tempCorrectPairs = JSON.parse(e.target.value); } catch(_){} }}">
      </div>
    </div>`;
  }

  _renderEditorShortAnswer() {
    return html`<div style="margin:8px 0;font-size:13px;">
      <div style="font-weight:500;margin-bottom:4px;">Jawaban yang diterima (pisahkan koma):</div>
      <input style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;"
        placeholder="contoh: biomassa, sekam padi, limbah pertanian"
        .value="${this._tempAcceptedAnswers}" @input="${(e) => { this._tempAcceptedAnswers = e.target.value; }}">
    </div>`;
  }

  _addQuestion() {
    if (!this._tempQuestionText.trim()) { console.warn(this.t.emptyQuestionError); return; }

    const qType = this._tempQuestionType || "mc";
    const newQuestion = { type: qType, question: this._tempQuestionText.trim() };

    if (this._tempQuestionImage.trim()) newQuestion.image = this._tempQuestionImage.trim();
    if (this._tempQuestionPoints > 1) newQuestion.points = this._tempQuestionPoints;

    if (qType === "mc") {
      if (!this._tempChoice0.trim() || !this._tempChoice1.trim()) { console.warn(this.t.emptyChoiceError); return; }
      newQuestion.choices = [0, 1, 2, 3]
        .map(i => {
          const text = this[`_tempChoice${i}`]?.trim();
          if (!text) return null;
          const img = this[`_tempChoiceImage${i}`]?.trim();
          return img ? { text, image: img } : text;
        })
        .filter(Boolean);
      if (this._tempCorrectAnswers.length > 1) newQuestion.correctAnswers = [...this._tempCorrectAnswers];
      else newQuestion.correctIndex = parseInt(this._tempCorrectIndex, 10);
    } else if (qType === "pgk") {
      newQuestion.statements = JSON.parse(this._tempAcceptedStatements || "[]");
    } else if (qType === "matching") {
      newQuestion.leftItems = [...this._tempLeftItems];
      newQuestion.rightItems = [...this._tempRightItems];
      newQuestion.correctPairs = { ...this._tempCorrectPairs };
    } else if (qType === "shortAnswer") {
      newQuestion.acceptedAnswers = this._tempAcceptedAnswers.split(",").map(s => s.trim()).filter(Boolean);
    }

    this._tempQuestions = [...this._tempQuestions, newQuestion];
    this._resetEditorForm();
  }

  _deleteQuestion(index) {
    if (this._tempQuestions.length <= 3) { console.warn(this.t.minQuestionsError); return; }
    this._tempQuestions = this._tempQuestions.filter((_, i) => i !== index);
    if (this._editingIndex === index) { this._editingIndex = -1; this._resetEditorForm(); }
    else if (this._editingIndex > index) this._editingIndex--;
  }

  _resetEditorForm() {
    this._tempQuestionText = "";
    this._tempChoice0 = ""; this._tempChoice1 = ""; this._tempChoice2 = ""; this._tempChoice3 = "";
    this._tempChoiceImage0 = ""; this._tempChoiceImage1 = ""; this._tempChoiceImage2 = ""; this._tempChoiceImage3 = "";
    this._tempCorrectIndex = "0"; this._tempCorrectAnswers = [];
    this._tempQuestionImage = ""; this._tempQuestionType = "mc"; this._tempQuestionPoints = 1;
    this._tempLeftItems = ["", ""]; this._tempRightItems = ["", ""];
    this._tempCorrectPairs = {}; this._tempAcceptedAnswers = "";
    this._tempAcceptedStatements = "[]";
  }

  _startEditQuestion(index) {
    if (index < 0 || index >= this._tempQuestions.length) return;
    this._editingIndex = index;
    const q = this._tempQuestions[index];
    this._tempQuestionText = q.question;
    this._tempQuestionImage = q.image || "";
    this._tempQuestionType = q.type || "mc";
    this._tempQuestionPoints = q.points || 1;
    const choices = q.choices || [];
    this._tempChoice0 = this._getChoiceText(choices[0]) || "";
    this._tempChoice1 = this._getChoiceText(choices[1]) || "";
    this._tempChoice2 = this._getChoiceText(choices[2]) || "";
    this._tempChoice3 = this._getChoiceText(choices[3]) || "";
    this._tempChoiceImage0 = this._getChoiceImage(choices[0]) || "";
    this._tempChoiceImage1 = this._getChoiceImage(choices[1]) || "";
    this._tempChoiceImage2 = this._getChoiceImage(choices[2]) || "";
    this._tempChoiceImage3 = this._getChoiceImage(choices[3]) || "";
    this._tempCorrectIndex = q.correctIndex != null ? q.correctIndex.toString() : "0";
    this._tempCorrectAnswers = q.correctAnswers || [];
    this._tempLeftItems = q.leftItems || ["", ""];
    this._tempRightItems = q.rightItems || ["", ""];
    this._tempCorrectPairs = q.correctPairs || {};
    this._tempAcceptedAnswers = (q.acceptedAnswers || []).join(", ");
    this._tempAcceptedStatements = JSON.stringify(q.statements || []);
  }

  _saveEditQuestion() {
    if (!this._tempQuestionText.trim()) { console.warn(this.t.emptyQuestionError); return; }
    if (this._editingIndex < 0 || this._editingIndex >= this._tempQuestions.length) return;

    const qType = this._tempQuestionType || "mc";
    const updated = { type: qType, question: this._tempQuestionText.trim() };
    if (this._tempQuestionImage.trim()) updated.image = this._tempQuestionImage.trim();
    if (this._tempQuestionPoints > 1) updated.points = this._tempQuestionPoints;

    if (qType === "mc") {
      updated.choices = [0, 1, 2, 3]
        .map(i => {
          const text = this[`_tempChoice${i}`]?.trim();
          if (!text) return null;
          const img = this[`_tempChoiceImage${i}`]?.trim();
          return img ? { text, image: img } : text;
        })
        .filter(Boolean);
      if (this._tempCorrectAnswers.length > 1) updated.correctAnswers = [...this._tempCorrectAnswers];
      else updated.correctIndex = parseInt(this._tempCorrectIndex, 10);
    } else if (qType === "pgk") {
      updated.statements = JSON.parse(this._tempAcceptedStatements || "[]");
    } else if (qType === "matching") {
      updated.leftItems = [...this._tempLeftItems];
      updated.rightItems = [...this._tempRightItems];
      updated.correctPairs = { ...this._tempCorrectPairs };
    } else if (qType === "shortAnswer") {
      updated.acceptedAnswers = this._tempAcceptedAnswers.split(",").map(s => s.trim()).filter(Boolean);
    }

    this._tempQuestions = this._tempQuestions.map((q, i) => i === this._editingIndex ? updated : q);
    this._editingIndex = -1;
    this._resetEditorForm();
  }

  _cancelEditQuestion() {
    if (this._editingIndex < 0) return;
    this._editingIndex = -1;
    this._resetEditorForm();
  }

  _saveAll() {
    // Guard: only allow saving from 'editor' screen
    if (this._screen !== "editor") return;

    this.questions = JSON.parse(JSON.stringify(this._tempQuestions));
    this._editing = false;
    this._editingIndex = -1;
    this._screen = this._editorOrigin || "result";
    this._editorOrigin = "result";

    // Dispatch questions-changed event
    this.dispatchEvent(new CustomEvent("questions-changed", {
      bubbles: true,
      composed: true,
      detail: { questions: this.questions }
    }));
  }

  _cancelAll() {
    // Guard: only allow cancelling from 'editor' screen
    if (this._screen !== "editor") return;

    this._editing = false;
    this._editingIndex = -1;
    this._screen = this._editorOrigin || "result";
    this._editorOrigin = "result";
  }

  render() {
    switch (this._screen) {
      case "name":
        return this._renderNameScreen();
      case "question":
        return this._renderQuestionScreen();
      case "result":
        return this._renderResultScreen();
      case "editor":
        return this._renderEditorScreen();
      default:
        return this._renderNameScreen();
    }
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          max-width: 640px;
          margin: 0 auto;
          padding: var(--ddd-spacing-8);
          font-family: var(--ddd-font-primary);
        }

        .quiz-title {
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          margin-bottom: var(--ddd-spacing-4);
          color: var(--ddd-theme-primary);
        }

        .quiz-instruction {
          font-size: var(--ddd-font-size-m);
          margin-bottom: var(--ddd-spacing-6);
          color: var(--ddd-theme-secondary);
        }

        .input-group {
          margin-bottom: var(--ddd-spacing-4);
        }

        input#name-input {
          width: 100%;
          padding: var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-m);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
          box-sizing: border-box;
          font-family: var(--ddd-font-primary);
        }

        input#name-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .start-btn {
          width: 100%;
          padding: var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-m);
          font-weight: var(--ddd-font-weight-bold);
          background: var(--ddd-theme-polaris-primary, #007bff);
          color: var(--ddd-theme-on-primary, #fff);
          border: none;
          border-radius: var(--ddd-radius-md, 8px);
          cursor: pointer;
          transition: background 0.2s;
        }

        .start-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .start-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .validation-error {
          margin-top: var(--ddd-spacing-2);
          color: var(--ddd-theme-error);
          font-size: var(--ddd-font-size-s);
        }

        /* Question Screen Styles */
        .quiz-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--ddd-spacing-6);
          font-weight: var(--ddd-font-weight-bold);
        }

        .progress-label,
        .score-display {
          color: var(--ddd-theme-primary);
        }

        .question-text {
          font-size: var(--ddd-font-size-m, 1rem);
          font-weight: var(--ddd-font-weight-regular, normal);
          line-height: var(--ddd-line-height, 1.6);
          text-align: justify;
          color: var(--ddd-theme-on-surface, #333);
          background: var(--ddd-theme-polaris-surface-hover, #f8f9fa);
          border-left: 4px solid var(--ddd-theme-polaris-primary, #007bff);
          padding: var(--ddd-spacing-4, 14px) var(--ddd-spacing-5, 18px);
          border-radius: 0 8px 8px 0;
          margin-bottom: var(--ddd-spacing-6, 24px);
        }

        .answer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-6);
        }

        @media (max-width: 480px) {
          .answer-grid {
            grid-template-columns: 1fr;
          }

          .answer-btn {
            min-height: 44px;
          }
        }

        .answer-btn {
          padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
          font-size: var(--ddd-font-size-m);
          font-weight: var(--ddd-font-weight-medium);
          background: var(--ddd-theme-polaris-surface, #fff);
          color: var(--ddd-theme-on-surface, #333);
          border: 1px solid var(--ddd-theme-polaris-border, #d1d5db);
          border-radius: var(--ddd-radius-md, 8px);
          cursor: pointer;
          transition:
            background 0.2s,
            border-color 0.2s;
        }

        .answer-btn:hover:not([disabled]) {
          background: var(--ddd-theme-polaris-surface-hover);
        }

        .answer-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .answer-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .answer-btn--correct {
          background: var(--ddd-theme-success, #28a745) !important;
          color: var(--ddd-theme-on-success, #fff) !important;
          border-color: var(--ddd-theme-success, #28a745) !important;
        }

        .answer-btn--selected {
          background: #e3d9fc !important;
          color: #6750a4 !important;
          border-color: #6750a4 !important;
          box-shadow: 0 0 0 2px rgba(103, 80, 164, 0.3);
        }

        .answer-btn--wrong {
          background: var(--ddd-theme-error, #dc3545) !important;
          color: var(--ddd-theme-on-error, #fff) !important;
          border-color: var(--ddd-theme-error, #dc3545) !important;
        }

        .feedback-area {
          padding: var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-medium);
          text-align: center;
        }

        .feedback-area.positive {
          background: var(--ddd-theme-success, #d4edda);
          color: var(--ddd-theme-on-success, #155724);
        }

        .feedback-area.negative {
          background: var(--ddd-theme-error, #f8d7da);
          color: var(--ddd-theme-on-error, #721c24);
        }

        /* Result Screen Styles */
        .result-heading {
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          margin-bottom: var(--ddd-spacing-6);
          color: var(--ddd-theme-primary);
        }

        .result-name,
        .result-score,
        .result-percentage {
          font-size: var(--ddd-font-size-m);
          margin-bottom: var(--ddd-spacing-4);
          color: var(--ddd-theme-secondary);
        }

        .result-message {
          font-size: var(--ddd-font-size-l);
          font-weight: var(--ddd-font-weight-bold);
          margin: var(--ddd-spacing-6) 0;
          color: var(--ddd-theme-primary);
          text-align: center;
        }

        .restart-btn {
          width: 100%;
          padding: var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-m);
          font-weight: var(--ddd-font-weight-bold);
          background: var(--ddd-theme-polaris-primary);
          color: var(--ddd-theme-on-primary);
          border: none;
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }

        .restart-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .restart-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .edit-questions-btn {
          width: 100%;
          margin-top: var(--ddd-spacing-3);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          background: transparent;
          color: var(--ddd-theme-primary);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }

        .edit-questions-btn:hover {
          background: var(--ddd-theme-polaris-surface-hover);
        }

        .edit-questions-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        /* Editor Screen Styles */
        .edit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--ddd-spacing-6);
          padding-bottom: var(--ddd-spacing-4);
          border-bottom: 1px solid var(--ddd-theme-polaris-border);
        }

        .edit-title {
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-primary);
          margin: 0;
        }

        .close-editor-btn {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-on-error);
          border: none;
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }

        .close-editor-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .close-editor-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .editor-content {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-6);
        }

        .add-question-form {
          padding: var(--ddd-spacing-4);
          background: var(--ddd-theme-polaris-surface);
          border-radius: var(--ddd-radius-md);
          border: 1px solid var(--ddd-theme-polaris-border);
        }

        .question-text-input {
          width: 100%;
          min-height: 80px;
          padding: var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-m);
          font-family: var(--ddd-font-primary);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-sm);
          resize: vertical;
          box-sizing: border-box;
          margin-bottom: var(--ddd-spacing-4);
        }

        .question-text-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .choices-container {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-4);
        }

        .choice-input-wrapper {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
        }

        .choice-input,
        .edit-choice-input {
          flex: 1;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-m);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-sm);
          font-family: var(--ddd-font-primary);
        }

        .choice-input:focus-visible,
        .edit-choice-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .choice-label {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-secondary);
          cursor: pointer;
        }

        .add-question-btn,
        .save-all-btn,
        .cancel-all-btn {
          width: 100%;
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-m);
          font-weight: var(--ddd-font-weight-bold);
          border: none;
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-question-btn {
          background: var(--ddd-theme-polaris-primary);
          color: var(--ddd-theme-on-primary);
        }

        .add-question-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .add-question-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .questions-list {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-4);
        }

        .question-card {
          padding: var(--ddd-spacing-4);
          background: var(--ddd-theme-polaris-surface);
          border-radius: var(--ddd-radius-md);
          border: 1px solid var(--ddd-theme-polaris-border);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--ddd-spacing-4);
        }

        .question-preview {
          flex: 1;
          font-size: var(--ddd-font-size-m);
          color: var(--ddd-theme-secondary);
          word-break: break-word;
        }

        .card-actions {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-2);
        }

        .edit-btn,
        .delete-btn {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          border: none;
          border-radius: var(--ddd-radius-sm);
          cursor: pointer;
          transition:
            background 0.2s,
            color 0.2s;
        }

        .edit-btn {
          background: var(--ddd-theme-polaris-surface-hover);
          color: var(--ddd-theme-primary);
        }

        .edit-btn:hover:not([disabled]) {
          background: var(--ddd-theme-accent);
        }

        .edit-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        .delete-btn {
          background: transparent;
          color: var(--ddd-theme-error);
        }

        .delete-btn:hover:not([disabled]) {
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-on-error);
        }

        .delete-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-3);
        }

        .edit-question-text-input {
          width: 100%;
          min-height: 80px;
          padding: var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-m);
          font-family: var(--ddd-font-primary);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-sm);
          resize: vertical;
          box-sizing: border-box;
        }

        .edit-form-actions {
          display: flex;
          gap: var(--ddd-spacing-3);
        }

        .save-edit-btn {
          flex: 1;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          background: var(--ddd-theme-success);
          color: var(--ddd-theme-on-success);
          border: none;
          border-radius: var(--ddd-radius-sm);
          cursor: pointer;
        }

        .save-edit-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .cancel-edit-btn {
          flex: 1;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          background: transparent;
          color: var(--ddd-theme-secondary);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-sm);
          cursor: pointer;
        }

        .cancel-edit-btn:hover {
          background: var(--ddd-theme-polaris-surface-hover);
        }

        .editor-actions {
          display: flex;
          gap: var(--ddd-spacing-4);
          margin-top: var(--ddd-spacing-4);
        }

        .save-all-btn {
          flex: 1;
          background: var(--ddd-theme-polaris-primary);
          color: var(--ddd-theme-on-primary);
        }

        .save-all-btn:hover {
          background: var(--ddd-theme-accent);
        }

        .cancel-all-btn {
          flex: 1;
          background: transparent;
          color: var(--ddd-theme-secondary);
          border: 1px solid var(--ddd-theme-polaris-border);
        }

        .cancel-all-btn:hover {
          background: var(--ddd-theme-polaris-surface-hover);
        }

        .save-all-btn:focus-visible,
        .cancel-all-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        @media (max-width: 480px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .card-actions {
            flex-direction: row;
            width: 100%;
          }

          .edit-btn,
          .delete-btn {
            flex: 1;
          }

          .editor-actions {
            flex-direction: column;
          }

          .save-all-btn,
          .cancel-all-btn {
            width: 100%;
          }
        }
      `,
    ];
    }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._authHandler) window.removeEventListener("quiz-user-login", this._authHandler);
  }
  }

globalThis.customElements.define(ExplodeQuiz.tag, ExplodeQuiz);

export { ExplodeQuiz, DEFAULT_QUESTIONS };
