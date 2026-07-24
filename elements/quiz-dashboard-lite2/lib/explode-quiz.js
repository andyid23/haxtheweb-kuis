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
    const currentQuestion = this.questions[this._currentIndex];
    const progressLabel = `${this.t.questionOf} ${this._currentIndex + 1} ${this.t.of} ${this.questions.length}`;

    return html`
      <header class="quiz-header">
        <span class="progress-label" aria-label="${this.t.ariaProgressLabel}"
          >${progressLabel}</span
        >
        <span class="score-display" aria-label="${this.t.ariaScoreDisplay}"
          >${this.t.scoreLabel}: ${this._score}</span
        >
      </header>

      <div class="question-text">${currentQuestion.question}</div>

      <div class="answer-grid">
        ${currentQuestion.choices.map((choice, index) => {
          let btnClass = "answer-btn";
          if (this._answered) {
            if (index === currentQuestion.correctIndex) {
              btnClass += " answer-btn--correct";
            } else if (index === this._selectedIndex) {
              btnClass += " answer-btn--wrong";
            }
          }

          return html`
            <button
              class="${btnClass}"
              ?disabled="${this._answered}"
              @click="${() => this._selectAnswer(index)}"
              aria-label="${this.t.ariaAnswerButton}: ${choice}"
            >
              ${choice}
            </button>
          `;
        })}
      </div>

      ${this._feedbackText
        ? html`
            <div
              class="feedback-area ${this._feedbackPositive
                ? "positive"
                : "negative"}"
              aria-live="polite"
              aria-label="${this.t.ariaFeedback}"
            >
              ${this._feedbackText}
            </div>
          `
        : ""}
    `;
  }

  _selectAnswer(choiceIndex) {
    if (this._answered) return;

    this._answered = true;
    this._selectedIndex = choiceIndex;

    const currentQuestion = this.questions[this._currentIndex];
    const correctIndex = currentQuestion.correctIndex;
    const isCorrect = choiceIndex === correctIndex;

    if (isCorrect) {
      this._score += 1;
      this._feedbackText = this.t.feedbackCorrect;
      this._feedbackPositive = true;
      this._fireConfetti();
    } else {
      this._feedbackText = `${this.t.feedbackWrongPrefix}${currentQuestion.choices[correctIndex]}`;
      this._feedbackPositive = false;
    }

    // Schedule advance after delay
    setTimeout(() => {
      this._advanceQuiz();
    }, 1200);
  }

  _advanceQuiz() {
    if (this._currentIndex < this.questions.length - 1) {
      this._currentIndex += 1;
      this._answered = false;
      this._selectedIndex = -1;
      this._feedbackText = "";
      this._feedbackPositive = false;
    } else {
      this._submitToSheets(this._studentName, this._score);
      
      // Always dispatch quiz-saved event for activity tracking
      const percentage = Math.round((this._score / this.questions.length) * 100);
      this.dispatchEvent(new CustomEvent("quiz-saved", {
        detail: { name: this._studentName, score: percentage },
        bubbles: true,
        composed: true
      }));
      
      this._screen = "result";
      // Trigger confetti if score >= 80%
      if (this._score / this.questions.length >= 0.8) {
        this._fireConfetti();
      }
    }
  }

  _renderResultScreen() {
    const percentage = Math.round((this._score / this.questions.length) * 100);
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
        ${this.t.resultScore}: ${this._score} / ${this.questions.length}
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
    const percentage = Math.round((score / this.questions.length) * 100);

    // Priority 1: Use Apps Script URL directly (no backend needed!)
    if (this.appsScriptUrl) {
      console.log("[explode-quiz] Mengirim ke Apps Script URL...", name, percentage);

      // Use GET because it matches the working Apps Script cross-origin auth flow.
      const params = new URLSearchParams({
        action: "submit",
        name: name,
        score: percentage,
        totalQuestions: this.questions.length,
        timestamp: new Date().toISOString(),
        sheet: this.sheetName || "Pertemuan",
        studentId: this.studentId || "",
        nis: this.studentNis || "",
        absen: this.studentAbsen || "",
        kelas: this.studentKelas || "",
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
    // Guard: only allow opening editor from 'result' screen
    if (this._screen !== "result") return;
    if (this._editing) return;

    this._editing = true;
    this._editingIndex = -1;
    // Deep copy questions to tempQuestions
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
    return html`
      <header class="edit-header">
        <h2 class="edit-title">${this.t.editTitle}</h2>
        <button
          class="close-editor-btn"
          @click="${this._saveAll}"
          aria-label="${this.t.ariaCloseEditor}"
        >
          ${this.t.closeEditor}
        </button>
      </header>

      <div class="editor-content">
        <form class="add-question-form">
          <textarea
            class="question-text-input"
            .value="${this._tempQuestionText}"
            @input="${(e) => (this._tempQuestionText = e.target.value)}"
            placeholder="${this.t.questionPlaceholder}"
            aria-label="${this.t.ariaQuestionInput}"
          ></textarea>

          <div class="choices-container">
            ${[0, 1, 2, 3].map(
              (index) => html`
                <div class="choice-input-wrapper">
                  <input
                    class="choice-input"
                    .value="${this[`_tempChoice${index}`]}"
                    @input="${(e) =>
                      (this[`_tempChoice${index}`] = e.target.value)}"
                    placeholder="${this.t.choicePlaceholder.replace(
                      "{N}",
                      index + 1,
                    )}"
                    aria-label="${this.t.ariaChoiceInput.replace(
                      "{N}",
                      index + 1,
                    )}"
                  />
                  <label class="choice-label">
                    <input
                      type="radio"
                      name="correct-choice"
                      .checked="${this._tempCorrectIndex == index}"
                      @change="${() => (this._tempCorrectIndex = index)}"
                      aria-label="${this.t.ariaCorrectChoice}"
                    />
                    ${this.t.choiceCorrectLabel}
                  </label>
                </div>
              `,
            )}
          </div>

          <button
            type="button"
            class="add-question-btn"
            @click="${this._addQuestion}"
            aria-label="${this.t.ariaAddForm}"
          >
            ${this.t.addQuestionBtn}
          </button>
        </form>

        <div class="questions-list" aria-label="${this.t.ariaQuestionsList}">
          ${this._tempQuestions.map(
            (question, index) => html`
              <div
                class="question-card"
                aria-label="${this.t.ariaQuestionCard}"
              >
                ${this._editingIndex === index
                  ? html`
                      <!-- Hidden edit form -->
                      <div class="edit-form">
                        <textarea
                          class="edit-question-text-input"
                          .value="${this._tempQuestionText}"
                          @input="${(e) =>
                            (this._tempQuestionText = e.target.value)}"
                          placeholder="${this.t.questionPlaceholder}"
                          aria-label="${this.t.ariaQuestionInput}"
                        ></textarea>
                        <div class="choices-container">
                          ${[0, 1, 2, 3].map(
                            (choiceIndex) => html`
                              <div class="choice-input-wrapper">
                                <input
                                  class="edit-choice-input"
                                  .value="${this[`_tempChoice${choiceIndex}`]}"
                                  @input="${(e) =>
                                    (this[`_tempChoice${choiceIndex}`] =
                                      e.target.value)}"
                                  placeholder="${this.t.choicePlaceholder.replace(
                                    "{N}",
                                    choiceIndex + 1,
                                  )}"
                                  aria-label="${this.t.ariaChoiceInput.replace(
                                    "{N}",
                                    choiceIndex + 1,
                                  )}"
                                />
                                <label class="choice-label">
                                  <input
                                    type="radio"
                                    name="correct-choice-edit"
                                    .checked="${this._tempCorrectIndex ==
                                    choiceIndex}"
                                    @change="${() =>
                                      (this._tempCorrectIndex = choiceIndex)}"
                                    aria-label="${this.t.ariaCorrectChoice}"
                                  />
                                  ${this.t.choiceCorrectLabel}
                                </label>
                              </div>
                            `,
                          )}
                        </div>
                        <div class="edit-form-actions">
                          <button
                            type="button"
                            class="save-edit-btn"
                            @click="${this._saveEditQuestion}"
                            aria-label="${this.t.ariaSaveEdit}"
                          >
                            ${this.t.saveEditBtn}
                          </button>
                          <button
                            type="button"
                            class="cancel-edit-btn"
                            @click="${this._cancelEditQuestion}"
                            aria-label="${this.t.ariaCancelEdit}"
                          >
                            ${this.t.cancelEditBtn}
                          </button>
                        </div>
                      </div>
                    `
                  : html`
                      <!-- Question preview with actions -->
                      <div class="card-header">
                        <span class="question-preview">
                          ${question.question}
                        </span>
                        <div class="card-actions">
                          <button
                            class="edit-btn"
                            @click="${() => this._startEditQuestion(index)}"
                            aria-label="${this.t.ariaEditQuestion}"
                          >
                            ${this.t.editQuestionBtn}
                          </button>
                          <button
                            class="delete-btn"
                            ?disabled="${this._tempQuestions.length <= 3}"
                            @click="${() => this._deleteQuestion(index)}"
                            aria-label="${this.t.ariaDeleteQuestion}"
                          >
                            ${this.t.deleteQuestionBtn}
                          </button>
                        </div>
                      </div>
                    `}
              </div>
            `,
          )}
        </div>
      </div>

      <div class="editor-actions">
        <button
          class="save-all-btn"
          @click="${this._saveAll}"
          aria-label="${this.t.ariaSaveAll}"
        >
          ${this.t.saveAllBtn}
        </button>
        <button
          class="cancel-all-btn"
          @click="${this._cancelAll}"
          aria-label="${this.t.ariaCancelAll}"
        >
          ${this.t.cancelAllBtn}
        </button>
      </div>
    `;
  }

  _addQuestion() {
    // Guard: validate form
    if (
      !this._tempQuestionText.trim() ||
      !this._tempChoice0.trim() ||
      !this._tempChoice1.trim() ||
      !this._tempChoice2.trim() ||
      !this._tempChoice3.trim()
    ) {
      console.warn(this.t.emptyChoiceError);
      return;
    }

    const newQuestion = {
      question: this._tempQuestionText.trim(),
      choices: [
        this._tempChoice0.trim(),
        this._tempChoice1.trim(),
        this._tempChoice2.trim(),
        this._tempChoice3.trim(),
      ],
      correctIndex: parseInt(this._tempCorrectIndex, 10),
    };

    // Reassign so Lit detects the change and re-renders
    this._tempQuestions = [...this._tempQuestions, newQuestion];
    this._tempQuestionText = "";
    this._tempChoice0 = "";
    this._tempChoice1 = "";
    this._tempChoice2 = "";
    this._tempChoice3 = "";
    this._tempCorrectIndex = "0";
  }

  _deleteQuestion(index) {
    // Guard: ensure minimum 3 questions remain
    if (this._tempQuestions.length <= 3) {
      console.warn(this.t.minQuestionsError);
      return;
    }

    // Reassign so Lit detects the change and re-renders
    this._tempQuestions = this._tempQuestions.filter((_, i) => i !== index);
    if (this._editingIndex === index) {
      this._editingIndex = -1;
      this._tempQuestionText = "";
      this._tempChoice0 = "";
      this._tempChoice1 = "";
      this._tempChoice2 = "";
      this._tempChoice3 = "";
      this._tempCorrectIndex = "0";
    } else if (this._editingIndex > index) {
      // Shift editing index down if item above it was removed
      this._editingIndex = this._editingIndex - 1;
    }
  }

  _startEditQuestion(index) {
    if (index < 0 || index >= this._tempQuestions.length) return;

    this._editingIndex = index;
    const question = this._tempQuestions[index];
    this._tempQuestionText = question.question;
    this._tempChoice0 = question.choices[0] || "";
    this._tempChoice1 = question.choices[1] || "";
    this._tempChoice2 = question.choices[2] || "";
    this._tempChoice3 = question.choices[3] || "";
    this._tempCorrectIndex = question.correctIndex.toString();
  }

  _saveEditQuestion() {
    // Guard: validate form
    if (
      !this._tempQuestionText.trim() ||
      !this._tempChoice0.trim() ||
      !this._tempChoice1.trim() ||
      !this._tempChoice2.trim() ||
      !this._tempChoice3.trim()
    ) {
      console.warn(this.t.emptyChoiceError);
      return;
    }

    // Guard: must be editing an existing question
    if (
      this._editingIndex < 0 ||
      this._editingIndex >= this._tempQuestions.length
    )
      return;

    // Reassign so Lit detects the change and re-renders
    this._tempQuestions = this._tempQuestions.map((q, i) =>
      i === this._editingIndex
        ? {
            question: this._tempQuestionText.trim(),
            choices: [
              this._tempChoice0.trim(),
              this._tempChoice1.trim(),
              this._tempChoice2.trim(),
              this._tempChoice3.trim(),
            ],
            correctIndex: parseInt(this._tempCorrectIndex, 10),
          }
        : q,
    );

    this._editingIndex = -1;
    this._tempQuestionText = "";
    this._tempChoice0 = "";
    this._tempChoice1 = "";
    this._tempChoice2 = "";
    this._tempChoice3 = "";
    this._tempCorrectIndex = "0";
  }

  _cancelEditQuestion() {
    // Guard: must be editing an existing question
    if (this._editingIndex < 0) return;

    this._editingIndex = -1;
    this._tempQuestionText = "";
    this._tempChoice0 = "";
    this._tempChoice1 = "";
    this._tempChoice2 = "";
    this._tempChoice3 = "";
    this._tempCorrectIndex = "0";
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
          background: var(--ddd-theme-polaris-primary);
          color: var(--ddd-theme-on-primary);
          border: none;
          border-radius: var(--ddd-radius-md);
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
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          margin-bottom: var(--ddd-spacing-6);
          color: var(--ddd-theme-secondary);
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
          background: var(--ddd-theme-polaris-surface);
          color: var(--ddd-theme-on-surface);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
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
          background: var(--ddd-theme-success);
          color: var(--ddd-theme-on-success);
          border-color: var(--ddd-theme-success);
        }

        .answer-btn--wrong {
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-on-error);
          border-color: var(--ddd-theme-error);
        }

        .feedback-area {
          padding: var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-medium);
          text-align: center;
        }

        .feedback-area.positive {
          background: var(--ddd-theme-success);
          color: var(--ddd-theme-on-success);
        }

        .feedback-area.negative {
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-on-error);
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
}

globalThis.customElements.define(ExplodeQuiz.tag, ExplodeQuiz);

export { ExplodeQuiz, DEFAULT_QUESTIONS };
