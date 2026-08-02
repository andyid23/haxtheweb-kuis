import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js"
import { LitElement, html, css } from "lit"
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js"

/**
 * <assignment-component>
 * Komponen pengumpulan tugas mandiri (dipisah dari assignment-forum).
 * Kirim ke forumApiUrl dengan action saveAssignment + kdMateri.
 * localStorage per kdMateri: hax_assignment_{kdMateri}
 */
export class AssignmentComponent extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "assignment-component"
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
      assignmentTitle: { type: String, attribute: "assignment-title" },
      assignmentInstruction: { type: String, attribute: "assignment-instruction" },
      hideDelete: { type: Boolean, attribute: "hide-delete", reflect: true },
      _assignmentText: { state: true },
      _assignmentLink: { state: true },
      _assignmentSubmitted: { state: true },
      _submitting: { state: true },
      _toastMsg: { state: true }
    }
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Assignment Component",
        description: "Komponen pengumpulan tugas mandiri terpisah",
        icon: "icons:assignment-turned-in",
        color: "blue",
        tags: ["Education", "Assignment"]
      },
      settings: {
        configure: [
          { property: "appsScriptUrl", title: "Apps Script URL (Activity)", inputMethod: "textfield" },
          { property: "forumApiUrl", title: "Forum API URL (Tugas)", inputMethod: "textfield" },
          { property: "sheetName", title: "Nama Sheet / KD Materi", inputMethod: "textfield", default: "Pertemuan" },
          { property: "assignmentTitle", title: "Judul Tugas", inputMethod: "textfield", default: "Tugas Mandiri" },
          { property: "assignmentInstruction", title: "Instruksi Tugas", inputMethod: "textfield", default: "Tuliskan refleksi atau jawaban tugas Anda." },
          { property: "hideDelete", title: "Sembunyikan Hapus", inputMethod: "boolean" }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: { unsetAttributes: [] }
    }
  }

  constructor() {
    super()
    this.appsScriptUrl = ""
    this.forumApiUrl = ""
    this.sheetName = "Pertemuan"
    this.studentId = ""
    this.studentName = ""
    this.studentNis = ""
    this.studentAbsen = ""
    this.studentKelas = ""
    this.assignmentTitle = "Tugas Mandiri"
    this.assignmentInstruction = "Tuliskan refleksi atau jawaban tugas Anda."
    this.hideDelete = false
    this._assignmentText = ""
    this._assignmentLink = ""
    this._assignmentSubmitted = false
    this._submitting = false
    this._toastMsg = ""

    // kdMateri derived from sheetName
    this.t = {
      ...this.t,
      assignmentTitle: "Tugas Mandiri",
      submitBtn: "Kirim & Kunci Tugas",
      submitting: "Mengirim...",
      submitted: "Tugas Diserahkan & Tersimpan ke Google Sheets",
      pending: "Belum Menyerahkan",
      resetBtn: "Ubah",
      placeholderTask: "Tulis jawaban tugas Anda di sini...",
      placeholderLink: "Link Google Drive / Google Doc (opsional)",
      invalidLink: "Format link tidak valid. Gunakan URL Google Drive/Doc.",
      emptyTask: "Isi tugas atau link Google Drive terlebih dahulu!",
      activityAssignment: "Tugas dikumpulkan"
    }
  }

  // kdMateri derived from sheetName
  get kdMateri() {
    return this.sheetName || "Pertemuan"
  }

  connectedCallback() {
    super.connectedCallback()
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability()
      if (store && !store.elementList[AssignmentComponent.tag]) {
        store.elementList[AssignmentComponent.tag] = AssignmentComponent.haxProperties
      }
    }
    this._loadFromStorage()
    this._listenSession()
  }

  disconnectedCallback() {
    globalThis.removeEventListener("quiz-user-session-changed", this._handleSessionChanged)
    super.disconnectedCallback()
  }

  _listenSession() {
    this._handleSessionChanged = this._handleSessionChanged.bind(this)
    globalThis.addEventListener("quiz-user-session-changed", this._handleSessionChanged)
    // Load initial session
    this._handleSessionChanged({ detail: this._loadSession() })
  }

  _loadSession() {
    try {
      const data = JSON.parse(localStorage.getItem("quiz_user_session"))
      if (data?.expiresAt && Date.now() > data.expiresAt) {
        localStorage.removeItem("quiz_user_session")
        return null
      }
      return data
    } catch { return null }
  }

  _handleSessionChanged(e) {
    const session = e?.detail || this._loadSession()
    if (session?.studentId) {
      this.studentId = session.studentId
      this.studentName = session.nama
      this.studentNis = session.nis || ""
      this.studentAbsen = session.absen || ""
      this.studentKelas = session.kelas || ""
    }
  }

  _storageKey() {
    return `hax_assignment_${this.kdMateri}`
  }

  _loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(this._storageKey()))
      if (data) {
        this._assignmentSubmitted = data.submitted === true
        this._assignmentText = data.text || ""
        this._assignmentLink = data.link || ""
      }
    } catch {}
  }

  _saveToStorage() {
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify({
        submitted: this._assignmentSubmitted,
        text: this._assignmentText,
        link: this._assignmentLink
      }))
    } catch {}
  }

  _isValidUrl(str) {
    try {
      const u = new URL(str)
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  }

  async _submitAssignment() {
    if (this._submitting) return
    const text = this._assignmentText.trim()
    if (!text && !this._assignmentLink) {
      globalThis.alert(this.t.emptyTask)
      return
    }
    if (this._assignmentLink && !this._isValidUrl(this._assignmentLink)) {
      globalThis.alert(this.t.invalidLink)
      return
    }
    this._submitting = true
    const url = this.forumApiUrl || this.appsScriptUrl
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "saveAssignment",
            studentId: this.studentId,
            name: this.studentName,
            sheet: this.sheetName,
            title: this.assignmentTitle,
            content: text,
            link: this._assignmentLink,
            kdMateri: this.kdMateri
          })
        })
      } catch (err) {
        console.error("[assignment-component] Save assignment failed:", err)
      }
    }
    this._assignmentSubmitted = true
    this._submitting = false
    this._saveToStorage()
    this._showToast(`✓ ${this.t.activityAssignment}`)
    this._dispatchActivity("assignment", `Tugas: ${this.assignmentTitle}`)
  }

  _resetAssignment() {
    this._assignmentSubmitted = false
    this._assignmentText = ""
    this._assignmentLink = ""
    this._saveToStorage()
  }

  _dispatchActivity(type, description) {
    globalThis.dispatchEvent(new CustomEvent(type === "assignment" ? "assignment-saved" : "discussion-saved", {
      detail: {
        title: this.assignmentTitle,
        studentId: this.studentId,
        kdMateri: this.kdMateri
      },
      bubbles: true,
      composed: true
    }))
    const url = this.appsScriptUrl
    if (url && this.studentId) {
      const params = new URLSearchParams({
        action: "activity",
        activityType: type,
        description,
        name: this.studentName,
        studentId: this.studentId,
        nis: this.studentNis || "",
        absen: this.studentAbsen || "",
        kelas: this.studentKelas || "",
        sheet: this.sheetName,
        kdMateri: this.kdMateri,
        timestamp: new Date().toISOString()
      })
      fetch(`${url}?${params.toString()}`, { redirect: "follow" }).catch(() => {})
    }
  }

  _showToast(msg) {
    this._toastMsg = msg
    setTimeout(() => {
      if (this._toastMsg === msg) this._toastMsg = ""
    }, 3000)
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-primary);
          color: var(--ddd-theme-default-text);
        }
        .card {
          background: var(--ddd-theme-default-surface);
          border-radius: var(--ddd-radius-lg);
          box-shadow: var(--ddd-shadow-1);
          padding: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
          border: 1px solid var(--ddd-theme-polaris-border);
        }
        h3 {
          margin: 0 0 var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-m);
          color: var(--ddd-theme-default-text);
          display: flex; align-items: center; gap: var(--ddd-spacing-2);
        }
        .meta {
          font-size: var(--ddd-font-size-xs);
          color: var(--ddd-theme-secondary);
          background: var(--ddd-theme-polaris-surface-hover);
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-full);
          display: inline-block;
          margin-bottom: var(--ddd-spacing-3);
        }
        .instruction {
          margin: 0 0 var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-secondary);
          line-height: 1.5;
        }
        textarea,
        input[type="url"],
        input[type="text"] {
          width: 100%;
          min-height: var(--ddd-spacing-20);
          padding: var(--ddd-spacing-3);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-s);
          box-sizing: border-box;
          resize: vertical;
          font-family: var(--ddd-font-primary);
          margin-bottom: var(--ddd-spacing-2);
          background: var(--ddd-theme-default-surface);
          color: var(--ddd-theme-default-text);
        }
        textarea:focus,
        input:focus {
          outline: none;
          border-color: var(--ddd-theme-primary);
          box-shadow: 0 0 0 2px var(--ddd-theme-polaris-focus-ring);
        }
        textarea:disabled,
        input:disabled {
          background: var(--ddd-theme-polaris-surface);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .btn-group {
          display: flex;
          gap: var(--ddd-spacing-2);
          flex-wrap: wrap;
          margin-top: var(--ddd-spacing-3);
        }
        .btn {
          border: none;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          font-family: var(--ddd-font-primary);
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
          color: var(--ddd-theme-on-primary);
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background: var(--ddd-theme-primary); }
        .btn-primary:hover:not(:disabled) { background: var(--ddd-theme-accent); }
        .btn-success { background: var(--ddd-theme-success); }
        .btn-success:hover:not(:disabled) { background: var(--ddd-theme-success-dark); }
        .btn-danger { background: var(--ddd-theme-error); }
        .btn-danger:hover:not(:disabled) { background: var(--ddd-theme-error-dark); }
        .btn-sm {
          padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
        }
        .badge-done {
          background: var(--ddd-theme-success-light);
          color: var(--ddd-theme-success-text);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-xs);
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-1);
          margin-top: var(--ddd-spacing-2);
        }
        .badge-pending {
          background: var(--ddd-theme-warning-light);
          color: var(--ddd-theme-warning-text);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-xs);
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-1);
          margin-top: var(--ddd-spacing-2);
        }
        .toast {
          position: fixed; bottom: var(--ddd-spacing-6); left: 50%;
          transform: translateX(-50%);
          background: var(--ddd-theme-default-text); color: var(--ddd-theme-on-primary);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-full);
          box-shadow: var(--ddd-shadow-2);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `
    ]
  }

  render() {
    return html`
      <section class="card" aria-labelledby="assignment-heading">
        <h3 id="assignment-heading">📝 ${this.assignmentTitle}</h3>
        <div class="meta">Formatif | ${this.t.assignmentTitle} | KD: ${this.kdMateri}</div>
        <p class="instruction">${this.assignmentInstruction}</p>
        <label class="sr-only" for="task-link">${this.t.placeholderLink}</label>
        <input
          id="task-link"
          type="url"
          placeholder="${this.t.placeholderLink}"
          .value="${this._assignmentLink}"
          @input="${e => { this._assignmentLink = e.target.value }}"
          ?disabled="${this._assignmentSubmitted}"
          aria-label="${this.t.placeholderLink}"
        >
        <label class="sr-only" for="task-text">${this.t.placeholderTask}</label>
        <textarea
          id="task-text"
          .value="${this._assignmentText}"
          @input="${e => { this._assignmentText = e.target.value }}"
          ?disabled="${this._assignmentSubmitted}"
          placeholder="${this.t.placeholderTask}"
          aria-label="${this.t.placeholderTask}"
        ></textarea>
        <div class="btn-group">
          ${this._assignmentSubmitted
            ? html`
              <button class="btn btn-success btn-sm" disabled aria-label="${this.t.submitted}">✅ ${this.t.submitted}</button>
              <button class="btn btn-danger btn-sm" @click="${this._resetAssignment}" aria-label="${this.t.resetBtn}">🔄 ${this.t.resetBtn}</button>
            `
            : html`
              <button
                class="btn btn-success"
                ?disabled="${this._submitting}"
                @click="${this._submitAssignment}"
                aria-label="${this.t.submitBtn}"
              >
                ${this._submitting ? `⏳ ${this.t.submitting}` : this.t.submitBtn}
              </button>
            `}
        </div>
        <div class="${this._assignmentSubmitted ? "badge-done" : "badge-pending"}" role="status" aria-live="polite">
          ${this._assignmentSubmitted ? `✅ ${this.t.submitted}` : `⚠️ ${this.t.pending}`}
        </div>
      </section>
      ${this._toastMsg ? html`<div class="toast">${this._toastMsg}</div>` : ""}
    `
  }
}

globalThis.customElements.define(AssignmentComponent.tag, AssignmentComponent)