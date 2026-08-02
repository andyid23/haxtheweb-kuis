import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js"
import { LitElement, html, css } from "lit"
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js"

/**
 * <assignment-forum>
 * Komponen forum diskusi bertingkat + pengumpulan tugas mandiri.
 * Terintegrasi dengan 2 endpoint Apps Script:
 *   - appsScriptUrl: untuk activity logging (ke code.gs utama)
 *   - forumApiUrl: untuk forum & tugas (ke code-forum-tugas.gs terpisah)
 */
export class AssignmentForum extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "assignment-forum"
  }

  static get properties() {
    return {
      ...super.properties,
      // === Public attributes ===
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
      forumTopic: { type: String, attribute: "forum-topic" },
      viewMode: { type: String, attribute: "view-mode" },
      hideDelete: { type: Boolean, attribute: "hide-delete", reflect: true },
      hideTugas: { type: Boolean, attribute: "hide-tugas", reflect: true },
      // === Internal state ===
      _comments: { state: true },
      _activeReplyId: { state: true },
      _sortMode: { state: true },
      _assignmentText: { state: true },
      _assignmentLink: { state: true },
      _assignmentSubmitted: { state: true },
      _submitting: { state: true },
      _loadingComments: { state: true },
      _toastMsg: { state: true }
    }
  }

  constructor() {
    super()
    // Public defaults
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
    this.forumTopic = "Forum Diskusi"
    this.viewMode = "student"
    this.hideDelete = false
    this.hideTugas = false
    // Internal state
    this._comments = []
    this._activeReplyId = null
    this._sortMode = "best"
    this._assignmentText = localStorage.getItem("hax_assignment_text") || ""
    this._assignmentLink = localStorage.getItem("hax_assignment_link") || ""
    this._assignmentSubmitted = localStorage.getItem("hax_assignment_submitted") === "true"
    this._submitting = false
    this._loadingComments = false
    this._toastMsg = ""
    // i18n
    this.t = {
      ...this.t,
      assignmentTitle: "Tugas Mandiri",
      submitBtn: "Kirim & Kunci Tugas",
      submitting: "Mengirim...",
      submitted: "Tugas Diserahkan & Tersimpan ke Google Sheets",
      pending: "Belum Menyerahkan",
      resetBtn: "Ubah",
      forumTitle: "Forum Diskusi",
      postComment: "Post Comment",
      posting: "Posting...",
      reply: "Reply",
      deleteBtn: "Hapus",
      noComments: "Belum ada komentar. Mulai diskusi!",
      sortBest: "Terbaik",
      sortNewest: "Terbaru",
      sortOldest: "Terlama",
      placeholderComment: "Tulis komentar...",
      placeholderReply: "Tulis balasan...",
      placeholderTask: "Tulis jawaban tugas Anda di sini...",
      placeholderLink: "Link Google Drive / Google Doc (opsional)",
      invalidLink: "Format link tidak valid. Gunakan URL Google Drive/Doc.",
      emptyTask: "Isi tugas atau link Google Drive terlebih dahulu!",
      confirmDelete: "Hapus komentar ini?",
      taskDone: "Selesai",
      taskPending: "Belum",
      justNow: "Baru saja",
      minutesAgo: "menit lalu",
      hoursAgo: "jam lalu",
      daysAgo: "hari lalu",
      activityForum: "Aktivitas forum tercatat",
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
      if (store && !store.elementList[AssignmentForum.tag]) {
        store.elementList[AssignmentForum.tag] = AssignmentForum.haxProperties
      }
    }
    // FIX: Bind handler untuk proper removal di disconnectedCallback
    this._authHandler = this._onUserLogin.bind(this)
    globalThis.addEventListener("quiz-user-login", this._authHandler)
    this._loadForumComments()
  }

  disconnectedCallback() {
    // FIX: Cleanup event listener dengan referensi yang sama
    if (this._authHandler) {
      globalThis.removeEventListener("quiz-user-login", this._authHandler)
    }
    super.disconnectedCallback()
  }

  _onUserLogin(e) {
    if (!e.detail) return
    if (e.detail.studentId) this.studentId = e.detail.studentId
    if (e.detail.nama) this.studentName = e.detail.nama
    if (e.detail.nis) this.studentNis = e.detail.nis
    if (e.detail.absen) this.studentAbsen = e.detail.absen
    if (e.detail.kelas) this.studentKelas = e.detail.kelas
  }

  // === FORUM CRUD ===
  async _loadForumComments() {
    const url = this.forumApiUrl || this.appsScriptUrl
    if (!url) return
    this._loadingComments = true
    try {
      const res = await fetch(`${url}?action=getForumComments`, { redirect: "follow" })
      const data = await res.json()
      if (data.status === "ok" && data.comments) {
        this._comments = this._buildThread(data.comments)
      }
    } catch (err) {
      console.error("[assignment-forum] Failed to load forum:", err)
    }
    this._loadingComments = false
  }

  _buildThread(flat) {
    const map = {}
    const roots = []
    flat.forEach(c => { map[c.id] = { ...c, replies: [] } })
    flat.forEach(c => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].replies.push(map[c.id])
      } else if (map[c.id]) {
        roots.push(map[c.id])
      }
    })
    return roots
  }

  _getSorted() {
    const list = [...this._comments]
    if (this._sortMode === "newest") {
      list.sort((a, b) => new Date(b.time) - new Date(a.time))
    } else if (this._sortMode === "oldest") {
      list.sort((a, b) => new Date(a.time) - new Date(b.time))
    } else {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    }
    return list
  }

  _setSort(mode) {
    this._sortMode = mode
    this._comments = [...this._comments]
  }

  async _submitMainComment() {
    if (this._submitting) return
    const el = this.shadowRoot.querySelector("#main-input")
    if (!el) return
    const text = el.value.trim()
    if (!text) return
    this._submitting = true
    const url = this.forumApiUrl || this.appsScriptUrl
    const payload = {
      action: "saveForumComment",
      id: Date.now(),
      parentId: null,
      user: this.studentName || "Siswa",
      studentId: this.studentId || "",
      text,
      sheet: this.sheetName,
      kdMateri: this.kdMateri
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (result.status === "ok" && result.data) {
        this._comments = [...this._comments, { ...result.data, replies: [] }]
      }
      el.value = ""
    } catch (err) {
      console.error("[assignment-forum] Submit failed:", err)
    }
    this._submitting = false
    this._sendActivity("discussion", `Forum: ${text.substring(0, 50)}`)
  }

  async _submitReply(parentId) {
    if (this._submitting) return
    const el = this.shadowRoot.querySelector(`#reply-${parentId}`)
    if (!el) return
    const text = el.value.trim()
    if (!text) return
    this._submitting = true
    const url = this.forumApiUrl || this.appsScriptUrl
    const payload = {
      action: "saveForumComment",
      id: Date.now(),
      parentId,
      user: this.studentName || "Siswa",
      studentId: this.studentId || "",
      text,
      sheet: this.sheetName,
      kdMateri: this.kdMateri
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (result.status === "ok" && result.data) {
        this._comments = this._comments.map(c =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, { ...result.data, replies: [] }] }
            : c
        )
      }
      this._activeReplyId = null
    } catch (err) {
      console.error("[assignment-forum] Reply failed:", err)
    }
    this._submitting = false
    this._sendActivity("discussion", `Reply: ${text.substring(0, 50)}`)
  }

  async _deleteComment(commentId) {
    if (!globalThis.confirm(this.t.confirmDelete)) return
    const url = this.forumApiUrl || this.appsScriptUrl
    if (!url) return
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "deleteForumComment", id: commentId })
      })
      const idsToDelete = new Set([commentId])
      this._comments.forEach(c => {
        if (c.id === commentId && c.replies) {
          c.replies.forEach(r => idsToDelete.add(r.id))
        }
      })
      this._comments = this._comments
        .filter(c => !idsToDelete.has(c.id))
        .map(c => ({
          ...c,
          replies: (c.replies || []).filter(r => !idsToDelete.has(r.id))
        }))
    } catch (err) {
      console.error("[assignment-forum] Delete failed:", err)
    }
  }

  _findAndUpdateComment(comments, id, updater) {
    return comments.map(c => {
      if (c.id === id) return updater(c)
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: this._findAndUpdateComment(c.replies, id, updater) }
      }
      return c
    })
  }

  _handleLike(commentId) {
    this._comments = this._findAndUpdateComment(this._comments, commentId, c => {
      const isLiked = !c.isLiked
      return { ...c, isLiked, likes: isLiked ? (c.likes || 0) + 1 : (c.likes || 0) - 1 }
    })
    this._syncLike(commentId)
  }

  _syncLike(commentId) {
    const url = this.forumApiUrl || this.appsScriptUrl
    if (!url) return
    const c = this._comments.find(x => x.id === commentId)
    if (c) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "saveForumComment",
          id: commentId,
          actionType: "like",
          isLiked: c.isLiked
        })
      }).catch(() => {})
    }
  }

  _toggleReply(commentId) {
    this._activeReplyId = this._activeReplyId === commentId ? null : commentId
  }

  // === ASSIGNMENT ===
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
        console.error("[assignment-forum] Save assignment failed:", err)
      }
    }
    localStorage.setItem("hax_assignment_submitted", "true")
    localStorage.setItem("hax_assignment_text", text)
    localStorage.setItem("hax_assignment_link", this._assignmentLink)
    this._assignmentSubmitted = true
    this._submitting = false
    this._showToast(`✓ ${this.t.activityAssignment}`)
    this._sendActivity("assignment", `Tugas: ${this.assignmentTitle}`)
  }

  _resetAssignment() {
    localStorage.removeItem("hax_assignment_submitted")
    localStorage.removeItem("hax_assignment_text")
    localStorage.removeItem("hax_assignment_link")
    this._assignmentSubmitted = false
    this._assignmentText = ""
    this._assignmentLink = ""
  }

  // === ACTIVITY LOGGING ===
  _sendActivity(type, description) {
    const eventName = type === "assignment" ? "assignment-saved" : "discussion-saved"
    // FIX: Pakai globalThis sesuai code-standards.md
    globalThis.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        title: this.assignmentTitle,
        thread: this.forumTopic,
        studentId: this.studentId,
        kdMateri: this.kdMateri
      },
      bubbles: true,
      composed: true
    }))
    // FIX: Kirim ke Apps Script dengan payload LENGKAP (termasuk nis, absen, kelas, kdMateri)
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

  // === UTILITIES ===
  _timeAgo(isoStr) {
    if (!isoStr) return ""
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return this.t.justNow
    if (mins < 60) return `${mins} ${this.t.minutesAgo}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ${this.t.hoursAgo}`
    const days = Math.floor(hrs / 24)
    return `${days} ${this.t.daysAgo}`
  }

  _showToast(msg) {
    this._toastMsg = msg
    setTimeout(() => {
      if (this._toastMsg === msg) this._toastMsg = ""
    }, 3000)
  }

  // === STYLES (100% DDD tokens) ===
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
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
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
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
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
          margin-top: var(--ddd-spacing-3);
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
          margin-top: var(--ddd-spacing-3);
        }
        .summary-bar {
          display: flex;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-4);
          padding: var(--ddd-spacing-3);
          background: var(--ddd-theme-polaris-surface-hover);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-xs);
        }
        .input-container {
          display: flex;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-6);
          align-items: flex-start;
        }
        .avatar {
          width: var(--ddd-spacing-10);
          height: var(--ddd-spacing-10);
          border-radius: var(--ddd-radius-full);
          background: var(--ddd-theme-polaris-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--ddd-font-size-l);
          flex-shrink: 0;
          color: var(--ddd-theme-default-text);
        }
        .avatar-sm {
          width: var(--ddd-spacing-8);
          height: var(--ddd-spacing-8);
          font-size: var(--ddd-font-size-m);
        }
        .input-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-2);
        }
        .input-box {
          width: 100%;
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-s);
          box-sizing: border-box;
          font-family: var(--ddd-font-primary);
          resize: none;
          min-height: auto;
          background: var(--ddd-theme-default-surface);
          color: var(--ddd-theme-default-text);
        }
        .input-box:focus {
          outline: none;
          border-color: var(--ddd-theme-primary);
          box-shadow: 0 0 0 2px var(--ddd-theme-polaris-focus-ring);
        }
        .btn-submit {
          align-self: flex-end;
          background: var(--ddd-theme-primary);
          color: var(--ddd-theme-on-primary);
          border: none;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-family: var(--ddd-font-primary);
          cursor: pointer;
          font-size: var(--ddd-font-size-s);
        }
        .btn-submit:hover:not(:disabled) { background: var(--ddd-theme-accent); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .comment-card {
          display: flex;
          gap: var(--ddd-spacing-3);
          padding: var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md);
          margin-bottom: var(--ddd-spacing-3);
          position: relative;
          background: var(--ddd-theme-default-surface);
          border: 1px solid var(--ddd-theme-polaris-surface-hover);
        }
        .comment-content {
          flex: 1;
          min-width: 0;
        }
        .comment-header {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
          margin-bottom: var(--ddd-spacing-1);
          flex-wrap: wrap;
        }
        .user-name {
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-default-text);
          font-size: var(--ddd-font-size-s);
        }
        .time-stamp {
          color: var(--ddd-theme-secondary);
          font-size: var(--ddd-font-size-xs);
        }
        .text-comment {
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-default-text);
          line-height: 1.5;
          word-break: break-word;
        }
        .action-bar {
          display: flex;
          gap: var(--ddd-spacing-4);
          margin-top: var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
          color: var(--ddd-theme-secondary);
          font-weight: var(--ddd-font-weight-bold);
          align-items: center;
        }
        .action-btn {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          user-select: none;
          padding: 3px 5px;
          border-radius: var(--ddd-radius-sm);
          background: transparent;
          border: none;
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-xs);
          color: inherit;
        }
        .action-btn:hover {
          background: var(--ddd-theme-polaris-surface-hover);
          color: var(--ddd-theme-default-text);
        }
        .action-btn--danger:hover {
          color: var(--ddd-theme-error);
        }
        .sort-bar {
          display: flex;
          justify-content: flex-end;
          gap: var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-secondary);
        }
        .sort-btn {
          cursor: pointer;
          background: transparent;
          border: none;
          padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-secondary);
          border-radius: var(--ddd-radius-sm);
        }
        .sort-btn:hover { color: var(--ddd-theme-default-text); }
        .sort-btn--active { color: var(--ddd-theme-primary); }
        .reply-container {
          display: flex;
          gap: var(--ddd-spacing-2);
          margin-top: var(--ddd-spacing-2);
          padding-left: var(--ddd-spacing-3);
          border-left: 2px solid var(--ddd-theme-polaris-border);
        }
        .reply-container input {
          flex: 1;
          padding: var(--ddd-spacing-2);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-sm);
          font-size: var(--ddd-font-size-xs);
          font-family: var(--ddd-font-primary);
          min-height: auto;
          margin: 0;
        }
        .replies-list {
          margin-top: var(--ddd-spacing-3);
          padding-left: var(--ddd-spacing-4);
          border-left: 2px solid var(--ddd-theme-polaris-surface-hover);
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-2);
        }
        .reply-item {
          display: flex;
          gap: var(--ddd-spacing-2);
          background: var(--ddd-theme-polaris-surface);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-sm);
        }
        .empty-state {
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-secondary);
          text-align: center;
          padding: var(--ddd-spacing-5);
        }
        .toast {
          position: fixed;
          bottom: var(--ddd-spacing-6);
          left: 50%;
          transform: translateX(-50%);
          background: var(--ddd-theme-default-text);
          color: var(--ddd-theme-on-primary);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-md);
          box-shadow: var(--ddd-shadow-2);
          font-size: var(--ddd-font-size-s);
          z-index: 1001;
          animation: toastFade 3s forwards;
        }
        @keyframes toastFade {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 10px); }
        }
      `
    ]
  }

  // === RENDER ===
  render() {
    const sorted = this._getSorted()
    return html`
      <div class="summary-bar" role="status" aria-live="polite">
        <div>${this._assignmentSubmitted ? "✅" : "⏳"} ${this.t.assignmentTitle}: ${this._assignmentSubmitted ? this.t.taskDone : this.t.taskPending}</div>
        <div>💬 ${this.t.forumTitle}: ${sorted.length}</div>
      </div>

      ${!this.hideTugas ? html`
      <section class="card" aria-labelledby="assignment-heading">
        <h3 id="assignment-heading">📝 ${this.assignmentTitle}</h3>
        <div class="meta">Formatif | ${this.t.assignmentTitle}</div>
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
      ` : ""}

      <section class="card" aria-labelledby="forum-heading">
        <h3 id="forum-heading">💬 ${this.forumTopic}</h3>
        <div class="input-container">
          <div class="avatar" aria-hidden="true">👤</div>
          <div class="input-wrapper">
            <label class="sr-only" for="main-input">${this.t.placeholderComment}</label>
            <textarea
              id="main-input"
              class="input-box"
              rows="2"
              placeholder="${this.t.placeholderComment}"
              aria-label="${this.t.placeholderComment}"
            ></textarea>
            <button
              class="btn-submit"
              ?disabled="${this._submitting}"
              @click="${this._submitMainComment}"
              aria-label="${this.t.postComment}"
            >
              ${this._submitting ? this.t.posting : this.t.postComment}
            </button>
          </div>
        </div>

        <div class="sort-bar" role="tablist" aria-label="Sort comments">
          <button
            class="sort-btn ${this._sortMode === "best" ? "sort-btn--active" : ""}"
            @click="${() => this._setSort("best")}"
            role="tab"
            aria-selected="${this._sortMode === "best"}"
          >${this.t.sortBest}</button>
          <button
            class="sort-btn ${this._sortMode === "newest" ? "sort-btn--active" : ""}"
            @click="${() => this._setSort("newest")}"
            role="tab"
            aria-selected="${this._sortMode === "newest"}"
          >${this.t.sortNewest}</button>
          <button
            class="sort-btn ${this._sortMode === "oldest" ? "sort-btn--active" : ""}"
            @click="${() => this._setSort("oldest")}"
            role="tab"
            aria-selected="${this._sortMode === "oldest"}"
          >${this.t.sortOldest}</button>
        </div>

        ${this._loadingComments
          ? html`<div class="empty-state">Loading...</div>`
          : sorted.length === 0
            ? html`<div class="empty-state">${this.t.noComments}</div>`
            : sorted.map(c => this._renderComment(c))}
      </section>

      ${this._toastMsg ? html`<div class="toast" role="status" aria-live="polite">${this._toastMsg}</div>` : ""}
    `
  }

  _renderComment(c) {
    const initial = c.user ? c.user.charAt(0).toUpperCase() : "?"
    const canDelete = this.viewMode === "lecturer" && !this.hideDelete
    return html`
      <article class="comment-card" aria-label="${this.t.forumTitle}">
        <div class="avatar" aria-hidden="true">${initial}</div>
        <div class="comment-content">
          <header class="comment-header">
            <span class="user-name">${c.user}</span>
            <time class="time-stamp" datetime="${c.time}">${this._timeAgo(c.time)}</time>
          </header>
          <div class="text-comment">${c.text}</div>
          <nav class="action-bar" aria-label="Comment actions">
            <button
              class="action-btn"
              @click="${() => this._handleLike(c.id)}"
              aria-label="Like (${c.likes || 0})"
            >🔺 ${c.likes || 0}</button>
            <button
              class="action-btn"
              @click="${() => this._toggleReply(c.id)}"
              aria-label="${this.t.reply}"
            >${this.t.reply}</button>
            ${canDelete ? html`
              <button
                class="action-btn action-btn--danger"
                @click="${() => this._deleteComment(c.id)}"
                aria-label="${this.t.deleteBtn}"
              >🗑️ ${this.t.deleteBtn}</button>
            ` : ""}
          </nav>
          ${this._activeReplyId === c.id ? html`
            <div class="reply-container">
              <label class="sr-only" for="reply-${c.id}">${this.t.placeholderReply}</label>
              <input
                id="reply-${c.id}"
                type="text"
                placeholder="${this.t.placeholderReply}"
                aria-label="${this.t.placeholderReply}"
              >
              <button
                class="btn-submit"
                ?disabled="${this._submitting}"
                @click="${() => this._submitReply(c.id)}"
                aria-label="${this.t.reply}"
              >${this._submitting ? "..." : this.t.reply}</button>
            </div>
          ` : ""}
          ${c.replies && c.replies.length > 0 ? html`
            <div class="replies-list">
              ${c.replies.map(r => this._renderReply(r))}
            </div>
          ` : ""}
        </div>
      </article>
    `
  }

  _renderReply(r) {
    const initial = r.user ? r.user.charAt(0).toUpperCase() : "?"
    return html`
      <article class="reply-item" aria-label="${this.t.reply}">
        <div class="avatar avatar-sm" aria-hidden="true">${initial}</div>
        <div class="comment-content">
          <header class="comment-header">
            <span class="user-name" style="font-size: var(--ddd-font-size-xs);">${r.user}</span>
            <time class="time-stamp" datetime="${r.time}">${this._timeAgo(r.time)}</time>
          </header>
          <div class="text-comment" style="font-size: var(--ddd-font-size-xs);">${r.text}</div>
        </div>
      </article>
    `
  }

  // === HAX PROPERTIES ===
  static get haxProperties() {
    return {
      canScale: true,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Assignment Forum",
        description: "Forum diskusi bertingkat + pengumpulan tugas dengan integrasi Google Sheets (2 deployment terpisah untuk quota Apps Script)",
        icon: "icons:forum",
        color: "blue",
        tags: ["Education", "Communication", "Assessment"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL (Main)",
            description: "URL deployment utama untuk activity logging",
            inputMethod: "textfield",
            required: true
          },
          {
            property: "forumApiUrl",
            title: "Forum API URL (Terpisah)",
            description: "URL deployment terpisah untuk forum & tugas (hemat quota)",
            inputMethod: "textfield"
          },
          {
            property: "sheetName",
            title: "Nama Sheet/Pertemuan",
            description: "Nama sheet di Google Sheets",
            inputMethod: "textfield",
            default: "Pertemuan"
          },
          {
            property: "assignmentTitle",
            title: "Judul Tugas",
            inputMethod: "textfield",
            default: "Tugas Mandiri"
          },
          {
            property: "assignmentInstruction",
            title: "Instruksi Tugas",
            inputMethod: "textarea"
          },
          {
            property: "forumTopic",
            title: "Topik Forum",
            inputMethod: "textfield",
            default: "Forum Diskusi"
          },
          {
            property: "viewMode",
            title: "Mode Tampilan",
            inputMethod: "select",
            options: {
              student: "Siswa",
              lecturer: "Dosen (bisa hapus komentar)"
            },
            default: "student"
          },
          {
            property: "hideDelete",
            title: "Sembunyikan Tombol Hapus",
            inputMethod: "boolean",
            default: false
          }
        ],
        advanced: [],
        developer: []
      },
      saveOptions: {
        unsetAttributes: [
          "_comments",
          "_activeReplyId",
          "_sortMode",
          "_assignmentText",
          "_assignmentLink",
          "_assignmentSubmitted",
          "_submitting",
          "_loadingComments",
          "_toastMsg"
        ]
      }
    }
  }
}

globalThis.customElements.define(AssignmentForum.tag, AssignmentForum)