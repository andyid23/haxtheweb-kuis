import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js"
import { LitElement, html, css } from "lit"
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js"

/**
 * <forum-component>
 * Komponen forum diskusi bertingkat (dipisah dari assignment-forum).
 * Kirim ke forumApiUrl dengan action saveForumComment + kdMateri.
 */
export class ForumComponent extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "forum-component"
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
      forumTopic: { type: String, attribute: "forum-topic" },
      viewMode: { type: String, attribute: "view-mode" },
      hideDelete: { type: Boolean, attribute: "hide-delete", reflect: true },
      _comments: { state: true },
      _activeReplyId: { state: true },
      _sortMode: { state: true },
      _submitting: { state: true },
      _loadingComments: { state: true },
      _toastMsg: { state: true }
    }
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Forum Component",
        description: "Komponen forum diskusi bertingkat terpisah",
        icon: "icons:forum",
        color: "purple",
        tags: ["Education", "Forum"]
      },
      settings: {
        configure: [
          { property: "appsScriptUrl", title: "Apps Script URL (Activity)", inputMethod: "textfield" },
          { property: "forumApiUrl", title: "Forum API URL", inputMethod: "textfield" },
          { property: "sheetName", title: "Nama Sheet / KD Materi", inputMethod: "textfield", default: "Pertemuan" },
          { property: "forumTopic", title: "Topik Forum", inputMethod: "textfield", default: "Forum Diskusi" },
          { property: "viewMode", title: "Mode Tampilan", inputMethod: "select", options: { student: "Siswa", lecturer: "Dosen" }, default: "student" },
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
    this.forumTopic = "Forum Diskusi"
    this.viewMode = "student"
    this.hideDelete = false
    this._comments = []
    this._activeReplyId = null
    this._sortMode = "best"
    this._submitting = false
    this._loadingComments = false
    this._toastMsg = ""

    this.t = {
      ...this.t,
      forumTitle: "Forum Diskusi",
      postComment: "Post Comment",
      posting: "Posting...",
      reply: "Balas",
      deleteBtn: "Hapus",
      noComments: "Belum ada komentar. Mulai diskusi!",
      sortBest: "Terbaik",
      sortNewest: "Terbaru",
      sortOldest: "Terlama",
      placeholderComment: "Tulis komentar...",
      placeholderReply: "Tulis balasan...",
      confirmDelete: "Hapus komentar ini?",
      activityForum: "Aktivitas forum tercatat",
      justNow: "Baru saja",
      minutesAgo: "menit lalu",
      hoursAgo: "jam lalu",
      daysAgo: "hari lalu"
    }
  }

  get kdMateri() {
    return this.sheetName || "Pertemuan"
  }

  connectedCallback() {
    super.connectedCallback()
    if (globalThis.HaxStore && typeof globalThis.HaxStore.requestAvailability === "function") {
      const store = globalThis.HaxStore.requestAvailability()
      if (store && !store.elementList[ForumComponent.tag]) {
        store.elementList[ForumComponent.tag] = ForumComponent.haxProperties
      }
    }
    this._authHandler = this._onUserLogin.bind(this)
    globalThis.addEventListener("quiz-user-login", this._authHandler)
    globalThis.addEventListener("quiz-user-session-changed", this._handleSessionChanged)
    this._loadForumComments()
  }

  disconnectedCallback() {
    if (this._authHandler) {
      globalThis.removeEventListener("quiz-user-login", this._authHandler)
    }
    globalThis.removeEventListener("quiz-user-session-changed", this._handleSessionChanged)
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

  _handleSessionChanged(e) {
    const session = e?.detail
    if (session?.studentId) {
      this.studentId = session.studentId
      this.studentName = session.nama
      this.studentNis = session.nis || ""
      this.studentAbsen = session.absen || ""
      this.studentKelas = session.kelas || ""
    }
  }

  async _loadForumComments() {
    const url = this.forumApiUrl || this.appsScriptUrl
    if (!url) return
    this._loadingComments = true
    try {
      const params = new URLSearchParams({ action: "getForumComments", kdMateri: this.kdMateri })
      const res = await fetch(`${url}?${params.toString()}`, { redirect: "follow" })
      const data = await res.json()
      if (data.status === "ok" && data.comments) {
        this._comments = this._buildThread(data.comments)
      }
    } catch (err) {
      console.error("[forum-component] Failed to load forum:", err)
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
      console.error("[forum-component] Submit failed:", err)
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
      console.error("[forum-component] Reply failed:", err)
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
      console.error("[forum-component] Delete failed:", err)
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

  _sendActivity(type, description) {
    globalThis.dispatchEvent(new CustomEvent("discussion-saved", {
      detail: {
        title: this.forumTopic,
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
        .input-container {
          display: flex; gap: var(--ddd-spacing-3); margin-bottom: var(--ddd-spacing-4);
        }
        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; font-size: var(--ddd-font-size-l);
          flex-shrink: 0;
        }
        .input-wrapper { flex: 1; display: flex; flex-direction: column; gap: var(--ddd-spacing-2); }
        .input-box {
          width: 100%; padding: var(--ddd-spacing-3); border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md); font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-s); min-height: 60px; resize: vertical;
          background: var(--ddd-theme-default-surface); color: var(--ddd-theme-default-text);
        }
        .input-box:focus { outline: none; border-color: var(--ddd-theme-primary); box-shadow: 0 0 0 2px var(--ddd-theme-polaris-focus-ring); }
        .btn-submit {
          align-self: flex-end; padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary);
          border: none; border-radius: var(--ddd-radius-md); font-weight: bold; cursor: pointer;
        }
        .btn-submit:hover:not(:disabled) { background: var(--ddd-theme-accent); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sort-bar { display: flex; gap: var(--ddd-spacing-2); margin-bottom: var(--ddd-spacing-4); }
        .sort-btn {
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3); border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-full); background: var(--ddd-theme-default-surface);
          font-size: var(--ddd-font-size-xs); cursor: pointer;
        }
        .sort-btn--active { background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); border-color: var(--ddd-theme-primary); }
        .comments-list { display: flex; flex-direction: column; gap: var(--ddd-spacing-3); }
        .comment-card {
          background: var(--ddd-theme-polaris-surface); border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md); padding: var(--ddd-spacing-3);
        }
        .comment-header { display: flex; align-items: center; gap: var(--ddd-spacing-2); margin-bottom: var(--ddd-spacing-1); }
        .comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: var(--ddd-font-size-s); }
        .comment-meta { display: flex; flex-direction: column; gap: 2px; }
        .comment-user { font-weight: bold; font-size: var(--ddd-font-size-s); }
        .comment-time { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); }
        .comment-text { font-size: var(--ddd-font-size-s); line-height: 1.5; margin-bottom: var(--ddd-spacing-2); }
        .comment-actions { display: flex; gap: var(--ddd-spacing-2); }
        .action-btn { padding: var(--ddd-spacing-1) var(--ddd-spacing-2); font-size: var(--ddd-font-size-xs); border: none; background: var(--ddd-theme-polaris-surface-hover); border-radius: var(--ddd-radius-sm); cursor: pointer; }
        .action-btn:hover { background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); }
        .reply-form { margin-top: var(--ddd-spacing-3); padding-left: var(--ddd-spacing-6); border-left: 2px solid var(--ddd-theme-polaris-border); }
        .reply-input { width: 100%; padding: var(--ddd-spacing-2); border: 1px solid var(--ddd-theme-polaris-border); border-radius: var(--ddd-radius-md); font-family: var(--ddd-font-primary); margin-bottom: var(--ddd-spacing-2); }
        .replies-list { margin-top: var(--ddd-spacing-3); padding-left: var(--ddd-spacing-6); border-left: 2px solid var(--ddd-theme-polaris-border); }
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
    const sorted = this._getSorted()
    return html`
      <section class="card" aria-labelledby="forum-heading">
        <h3 id="forum-heading">💬 ${this.forumTopic}</h3>
        <div class="meta">KD Materi: ${this.kdMateri}</div>

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

        <div class="comments-list">
          ${this._loadingComments
            ? html`<div style="text-align:center;padding:var(--ddd-spacing-6);color:var(--ddd-theme-secondary);">Memuat komentar...</div>`
            : sorted.length === 0
              ? html`<div style="text-align:center;padding:var(--ddd-spacing-6);color:var(--ddd-theme-secondary);">${this.t.noComments}</div>`
              : sorted.map(c => this._renderComment(c))}
        </div>
      </section>
      ${this._toastMsg ? html`<div class="toast">${this._toastMsg}</div>` : ""}
    `
  }

  _renderComment(c) {
    const isLiked = c.isLiked
    return html`
      <div class="comment-card" style="margin-bottom:var(--ddd-spacing-3);">
        <div class="comment-header">
          <div class="comment-avatar">${(c.user || "?")[0].toUpperCase()}</div>
          <div class="comment-meta">
            <span class="comment-user">${c.user}</span>
            <span class="comment-time">${this._timeAgo(c.time)}</span>
          </div>
        </div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-actions">
          <button class="action-btn" @click="${() => this._handleLike(c.id)}" aria-label="${isLiked ? "Unlike" : "Like"}">
            ${isLiked ? "❤️" : "🤍"} ${c.likes || 0}
          </button>
          <button class="action-btn" @click="${() => this._toggleReply(c.id)}">${this.t.reply}</button>
          ${!this.hideDelete && this.viewMode === "lecturer"
            ? html`<button class="action-btn" @click="${() => this._deleteComment(c.id)}" style="color:var(--ddd-theme-error);">${this.t.deleteBtn}</button>`
            : ""}
        </div>

        ${this._activeReplyId === c.id
          ? html`
            <div class="reply-form">
              <textarea
                id="reply-${c.id}"
                class="reply-input"
                rows="2"
                placeholder="${this.t.placeholderReply}"
                aria-label="${this.t.placeholderReply}"
              ></textarea>
              <button class="btn btn-primary btn-sm" @click="${() => this._submitReply(c.id)}" ?disabled="${this._submitting}">
                ${this._submitting ? "Mengirim..." : "Kirim Balasan"}
              </button>
            </div>
          ` : ""}

        ${c.replies && c.replies.length > 0
          ? html`
            <div class="replies-list">
              ${c.replies.map(r => this._renderComment(r))}
            </div>
          ` : ""}
      </div>
    `
  }
}

globalThis.customElements.define(ForumComponent.tag, ForumComponent)
