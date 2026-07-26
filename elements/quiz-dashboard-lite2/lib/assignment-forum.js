import { LitElement, html, css } from "lit";

export class AssignmentForum extends LitElement {
  static get tag() { return "assignment-forum"; }

  static get properties() {
    return {
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      forumApiUrl: { type: String, attribute: "forum-api-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      assignmentTitle: { type: String, attribute: "assignment-title" },
      assignmentInstruction: { type: String, attribute: "assignment-instruction" },
      forumTopic: { type: String, attribute: "forum-topic" },
      _comments: { state: true },
      _activeReplyId: { state: true },
      _sortMode: { state: true },
      _assignmentText: { state: true },
      _assignmentLink: { state: true },
      _assignmentSubmitted: { state: true },
      _submitting: { state: true },
      viewMode: { type: String, attribute: "view-mode" },
      hideDelete: { type: Boolean, attribute: "hide-delete", reflect: true },
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this.studentName = "";
    this.assignmentTitle = "Tugas Mandiri";
    this.assignmentInstruction = "Tuliskan refleksi atau jawaban tugas Anda.";
    this.forumTopic = "Forum Diskusi";
    this._comments = [];
    this._activeReplyId = null;
    this._sortMode = "best";
    this._assignmentText = localStorage.getItem("hax_assignment_text") || "";
    this._assignmentSubmitted = localStorage.getItem("hax_assignment_submitted") === "true";
    this._assignmentLink = localStorage.getItem("hax_assignment_link") || "";
    this._submitting = false;
    this.hideDelete = false;
  }

  connectedCallback() {
    super.connectedCallback();

    // Internal auth listener — catches quiz-user-login even if demo listener is missing
    this._authHandler = (e) => {
      if (e.detail.studentId) this.studentId = e.detail.studentId;
      if (e.detail.nama) this.studentName = e.detail.nama;
    };
    window.addEventListener("quiz-user-login", this._authHandler);

    this._loadForumComments();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._authHandler) window.removeEventListener("quiz-user-login", this._authHandler);
  }

  static get styles() {
    return css`
      :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1c1e21; }
      .card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
      h3 { margin: 0 0 8px; font-size: 16px; color: #1a202c; display: flex; align-items: center; gap: 8px; }
      .meta { font-size: 12px; color: #718096; background: #edf2f7; padding: 4px 10px; border-radius: 12px; display: inline-block; margin-bottom: 12px; }

      /* Assignment */
      textarea { width: 100%; min-height: 90px; padding: 10px; border: 1px solid #dbdbdb; border-radius: 8px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; }
      textarea:focus { outline: none; border-color: #002f6c; }
      textarea:disabled { background: #f7fafc; cursor: not-allowed; }
      .btn-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
      .btn { border: none; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background 0.2s; color: white; }
      .btn-primary { background: #002f6c; }
      .btn-primary:hover { background: #001f4c; }
      .btn-success { background: #38a169; }
      .btn-success:hover { background: #2f855a; }
      .btn-danger { background: #e53e3e; }
      .btn-danger:hover { background: #9b2c2c; }
      .btn-sm { padding: 5px 10px; font-size: 11px; }
      .badge-done { background: #c6f6d5; color: #22543d; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; }
      .badge-pending { background: #feebc8; color: #c05621; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; }
      .summary-bar { display: flex; gap: 12px; margin-bottom: 16px; padding: 10px; background: #f7fafc; border-radius: 8px; font-size: 12px; }
      .summary-item { display: flex; align-items: center; gap: 4px; }

      /* Disqus-style Forum */
      .input-container { display: flex; gap: 12px; margin-bottom: 24px; align-items: flex-start; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
      .input-wrapper { flex: 1; display: flex; flex-direction: column; gap: 8px; }
      .input-box { width: 100%; padding: 10px 12px; border: 1px solid #dbdbdb; border-radius: 8px; font-size: 14px; box-sizing: border-box; font-family: inherit; resize: none; }
      .input-box:focus { outline: none; border-color: #002f6c; }
      .btn-submit { align-self: flex-end; background: #002f6c; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }

      .nav-sort { display: flex; justify-content: flex-end; gap: 14px; font-size: 13px; font-weight: bold; color: #65676b; border-bottom: 2px solid #f0f2f5; padding-bottom: 8px; margin-bottom: 16px; }
      .sort-btn { cursor: pointer; padding: 2px 0; }
      .sort-btn.active { color: #002f6c; border-bottom: 2px solid #002f6c; padding-bottom: 6px; margin-bottom: -8px; }

      .comment-card { display: flex; gap: 12px; padding: 14px; border-radius: 8px; margin-bottom: 10px; position: relative; background: #ffffff; border: 1px solid #f0f2f5; }
      .comment-card.pinned { background: #f5f7f9; border-left: 3px solid #002f6c; }
      .pin-icon { position: absolute; top: 10px; right: 14px; font-size: 13px; color: #65676b; }
      .comment-content { flex: 1; min-width: 0; }
      .comment-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
      .user-name { font-weight: bold; color: #1c1e21; font-size: 14px; }
      .badge-staff { background: #002f6c; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
      .time-stamp { color: #8a8d91; font-size: 12px; }
      .text-comment { font-size: 14px; color: #1c1e21; line-height: 1.5; word-break: break-word; }

      .action-bar { display: flex; gap: 14px; margin-top: 8px; font-size: 12px; color: #65676b; font-weight: bold; align-items: center; }
      .action-btn { cursor: pointer; display: flex; align-items: center; gap: 3px; user-select: none; padding: 3px 5px; border-radius: 4px; }
      .action-btn:hover { background: #f2f3f5; color: #1c1e21; }
      .action-btn.liked { color: #007bff; }

      .reply-form-box { display: flex; gap: 8px; margin-top: 10px; padding-left: 10px; border-left: 2px solid #e4e6eb; }
      .reply-input { flex: 1; padding: 8px 10px; border: 1px solid #dbdbdb; border-radius: 6px; font-size: 13px; font-family: inherit; }
      .reply-input:focus { outline: none; border-color: #002f6c; }

      .replies-wrapper { margin-top: 10px; padding-left: 18px; border-left: 2px solid #edf2f7; display: flex; flex-direction: column; gap: 8px; }
      .reply-card { display: flex; gap: 8px; background: #fafafa; padding: 8px 10px; border-radius: 6px; }
      .reply-card .avatar { width: 30px; height: 30px; font-size: 14px; }
      .reply-card .user-name { font-size: 13px; }
      .reply-card .text-comment { font-size: 13px; }
    `;
  }

  async _loadForumComments() {
    const url = this.forumApiUrl || this.appsScriptUrl;
    if (!url) return;
    try {
      const res = await fetch(`${url}?action=getForumComments`, { redirect: "follow" });
      const data = await res.json();
      if (data.status === "ok" && data.comments) {
        this._comments = this._buildThread(data.comments);
      }
    } catch (e) {
      console.error("[assignment-forum] Failed to load forum:", e);
    }
  }

  _buildThread(flat) {
    const map = {};
    const roots = [];
    flat.forEach(c => { map[c.id] = { ...c, replies: [] }; });
    flat.forEach(c => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].replies.push(map[c.id]);
      } else if (map[c.id]) {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  _getSorted() {
    const list = [...this._comments];
    if (this._sortMode === "newest") list.sort((a, b) => new Date(b.time) - new Date(a.time));
    else if (this._sortMode === "oldest") list.sort((a, b) => new Date(a.time) - new Date(b.time));
    else list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return list;
  }

  _setSort(mode) {
    this._sortMode = mode;
    this._comments = [...this._comments];
  }

  async _submitMainComment() {
    if (this._submitting) return;
    const el = this.shadowRoot.querySelector("#main-input");
    const text = el.value.trim();
    if (!text) return;

    this._submitting = true;
    const url = this.forumApiUrl || this.appsScriptUrl;

    const payload = {
      action: "saveForumComment",
      id: Date.now(), parentId: null,
      user: this.studentName || "Siswa",
      studentId: this.studentId || "",
      text, sheet: this.sheetName
    };

    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.status === "ok" && result.data) {
        this._comments = [...this._comments, { ...result.data, replies: [] }];
      }
      el.value = "";
    } catch (e) {
      console.error("[assignment-forum] Submit failed:", e);
    }

    this._submitting = false;

    this._sendActivity("discussion", `Forum: ${text.substring(0, 50)}`);
  }

  async _submitReply(parentId) {
    if (this._submitting) return;
    const el = this.shadowRoot.querySelector(`#reply-${parentId}`);
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;

    this._submitting = true;
    const url = this.forumApiUrl || this.appsScriptUrl;

    const payload = {
      action: "saveForumComment",
      id: Date.now(), parentId,
      user: this.studentName || "Siswa",
      studentId: this.studentId || "",
      text, sheet: this.sheetName
    };

    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.status === "ok" && result.data) {
        this._comments = this._comments.map(c =>
          c.id === parentId ? { ...c, replies: [...c.replies, { ...result.data, replies: [] }] } : c
        );
      }
      this._activeReplyId = null;
    } catch (e) {
      console.error("[assignment-forum] Reply failed:", e);
    }

    this._submitting = false;

    this._sendActivity("discussion", `Reply: ${text.substring(0, 50)}`);
  }

  async _deleteComment(commentId) {
    if (!confirm("Hapus komentar ini?")) return;
    const url = this.forumApiUrl || this.appsScriptUrl;
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "deleteForumComment", id: commentId })
      });
      // Collect all IDs to delete (parent + children)
      const idsToDelete = new Set([commentId]);
      this._comments.forEach(c => {
        if (c.id === commentId && c.replies) {
          c.replies.forEach(r => idsToDelete.add(r.id));
        }
      });
      this._comments = this._comments.filter(c => !idsToDelete.has(c.id))
        .map(c => ({ ...c, replies: (c.replies || []).filter(r => !idsToDelete.has(r.id)) }));
    } catch (e) {
      console.error("[assignment-forum] Delete failed:", e);
    }
  }

  _findAndUpdateComment(comments, id, updater) {
    return comments.map(c => {
      if (c.id === id) return updater(c);
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: this._findAndUpdateComment(c.replies, id, updater) };
      }
      return c;
    });
  }

  _handleLike(commentId) {
    this._comments = this._findAndUpdateComment(this._comments, commentId, c => {
      const isLiked = !c.isLiked;
      return { ...c, isLiked, likes: isLiked ? (c.likes || 0) + 1 : (c.likes || 0) - 1 };
    });
    this._syncLike(commentId);
  }

  _handleDislike(commentId) {
    this._comments = this._findAndUpdateComment(this._comments, commentId, c => {
      const isDisliked = !c.isDisliked;
      return { ...c, isDisliked, likes: (c.likes || 0) + (isDisliked ? -1 : 1) };
    });
    this._syncLike(commentId);
  }

  _syncLike(commentId) {
    const likeUrl = this.forumApiUrl || this.appsScriptUrl;
    if (!likeUrl) return;
    const c = this._comments.find(c => c.id === commentId);
    if (c) {
      fetch(likeUrl, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "saveForumComment", id: commentId, actionType: "like", isLiked: c.isLiked })
      }).catch(() => {});
    }
  }

  _toggleReply(commentId) {
    this._activeReplyId = this._activeReplyId === commentId ? null : commentId;
  }

  _isValidUrl(str) {
    try { const u = new URL(str); return u.protocol === "http:" || u.protocol === "https:"; }
    catch { return false; }
  }

  async _submitAssignment() {
    if (this._submitting) return;
    const text = this._assignmentText.trim();
    if (!text && !this._assignmentLink) { alert("Isi tugas atau link Google Drive terlebih dahulu!"); return; }
    if (this._assignmentLink && !this._isValidUrl(this._assignmentLink)) {
      alert("Format link tidak valid. Gunakan URL Google Drive/Doc.");
      return;
    }

    this._submitting = true;
    const tugasUrl = this.forumApiUrl || this.appsScriptUrl;
    if (tugasUrl) {
      try {
        await fetch(tugasUrl, {
          method: "POST", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "saveAssignment",
            studentId: this.studentId, name: this.studentName,
            sheet: this.sheetName, title: this.assignmentTitle,
            content: text, link: this._assignmentLink
          })
        });
      } catch (e) {
        console.error("[assignment-forum] Save assignment failed:", e);
      }
    }

    localStorage.setItem("hax_assignment_submitted", "true");
    localStorage.setItem("hax_assignment_text", text);
    localStorage.setItem("hax_assignment_link", this._assignmentLink);
    this._assignmentSubmitted = true;
    this._submitting = false;
    this._sendActivity("assignment", `Tugas: ${this.assignmentTitle}`);
  }

  _resetAssignment() {
    localStorage.removeItem("hax_assignment_submitted");
    localStorage.removeItem("hax_assignment_text");
    localStorage.removeItem("hax_assignment_link");
    this._assignmentSubmitted = false;
    this._assignmentText = "";
    this._assignmentLink = "";
  }

  _exportAssignment() {
    const text = this._assignmentText || localStorage.getItem("hax_assignment_text") || "";
    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${this.assignmentTitle}</title>
<style>body{font-family:system-ui;max-width:700px;margin:40px auto;padding:20px;color:#333;}
h1{color:#002f6c;} .meta{color:#888;font-size:13px;} .content{line-height:1.8;margin-top:20px;white-space:pre-wrap;}</style></head>
<body><h1>${this.assignmentTitle}</h1><div class="meta">${this.studentName} | ${new Date().toLocaleDateString("id-ID")}</div>
<div class="content">${text}</div></body></html>`;
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Tugas_${this.assignmentTitle.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  _sendActivity(type, description) {
    // Always dispatch event for activity-logger (localStorage tracking)
    const eventName = type === "assignment" ? "assignment-saved" : "discussion-saved";
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: { title: this.assignmentTitle, thread: this.forumTopic, studentId: this.studentId },
      bubbles: true, composed: true
    }));

    // Also send to Google Sheets if configured
    const url = this.appsScriptUrl;
    if (url && this.studentId) {
      const params = new URLSearchParams({
        action: "activity", activityType: type, description,
        name: this.studentName, studentId: this.studentId,
        sheet: this.sheetName, timestamp: new Date().toISOString(),
      });
      fetch(`${url}?${params.toString()}`, { redirect: "follow" }).catch(() => {});
    }
  }

  _timeAgo(isoStr) {
    if (!isoStr) return "";
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    const days = Math.floor(hrs / 24);
    return `${days} hari lalu`;
  }

  render() {
    const sorted = this._getSorted();
    return html`
      <!-- SUMMARY -->
      <div class="summary-bar">
        <div class="summary-item">${this._assignmentSubmitted ? "✅" : "⏳"} Tugas: ${this._assignmentSubmitted ? "Selesai" : "Belum"}</div>
        <div class="summary-item">💬 Forum: ${sorted.length} komentar</div>
      </div>

      <!-- ASSIGNMENT -->
      <div class="card">
        <h3>📝 ${this.assignmentTitle}</h3>
        <div class="meta">Formatif | Tugas Mandiri</div>
        <p style="margin:0 0 10px;font-size:13px;color:#4a5568;line-height:1.5;">${this.assignmentInstruction}</p>
        <input type="url" placeholder="🔗 Link Google Drive / Google Doc (opsional)"
          .value="${this._assignmentLink}"
          @input="${e => { this._assignmentLink = e.target.value; }}"
          ?disabled="${this._assignmentSubmitted}"
          style="width:100%;padding:8px 12px;border:1px solid #dbdbdb;border-radius:8px;font-size:13px;margin-bottom:8px;box-sizing:border-box;">
        <textarea .value="${this._assignmentText}" @input="${(e) => { this._assignmentText = e.target.value; }}"
          ?disabled="${this._assignmentSubmitted}" placeholder="Tulis jawaban tugas Anda di sini..."></textarea>
        <div class="btn-group">
          ${this._assignmentSubmitted
            ? html`
              <button class="btn btn-success btn-sm" disabled>✅ Terkirim</button>
              <button class="btn btn-primary btn-sm" @click="${this._exportAssignment}">📥 Ekspor HTML</button>
              <button class="btn btn-danger btn-sm" @click="${this._resetAssignment}">🔄 Ubah</button>
            `
            : html`<button class="btn btn-success" ?disabled="${this._submitting}" @click="${this._submitAssignment}">${this._submitting ? "⏳ Mengirim..." : "Kirim & Kunci Tugas"}</button>`}
        </div>
        <div class="${this._assignmentSubmitted ? "badge-done" : "badge-pending"}">
          ${this._assignmentSubmitted ? "✅ Tugas Diserahkan & Tersimpan ke Google Sheets" : "⚠️ Belum Menyerahkan"}
        </div>
        ${this._assignmentSubmitted && this._assignmentLink ? html`<div style="margin-top:8px;"><a href="${this._assignmentLink}" target="_blank" style="color:#002f6c;font-size:13px;text-decoration:underline;">🔗 Lihat File Tugas</a></div>` : ""}
      </div>

      <!-- FORUM (Disqus-style) -->
      <div class="card">
        <h3>💬 ${this.forumTopic}</h3>

        <!-- Input -->
        <div class="input-container">
          <div class="avatar">👤</div>
          <div class="input-wrapper">
            <textarea id="main-input" class="input-box" rows="2" placeholder="Tulis komentar..."></textarea>
            <button class="btn-submit" ?disabled="${this._submitting}" @click="${this._submitMainComment}">${this._submitting ? "Posting..." : "Post Comment"}</button>
          </div>
        </div>

        <!-- Sort tabs -->
        <div class="nav-sort">
          <span class="sort-btn ${this._sortMode === "best" ? "active" : ""}" @click="${() => this._setSort('best')}">Best</span>
          <span class="sort-btn ${this._sortMode === "newest" ? "active" : ""}" @click="${() => this._setSort('newest')}">Newest</span>
          <span class="sort-btn ${this._sortMode === "oldest" ? "active" : ""}" @click="${() => this._setSort('oldest')}">Oldest</span>
        </div>

        <!-- Comments -->
        ${sorted.map(c => html`
          <div class="comment-card ${c.pinned ? "pinned" : ""}">
            ${c.pinned ? html`<span class="pin-icon">📌 Pinned</span>` : ""}
            <div class="avatar">${c.user ? c.user.charAt(0).toUpperCase() : "?"}</div>
            <div class="comment-content">
              <div class="comment-header">
                <span class="user-name">${c.user}</span>
                ${c.user === "Guru" || c.user === "Dosen" ? html`<span class="badge-staff">Guru</span>` : ""}
                <span class="time-stamp">${this._timeAgo(c.time)}</span>
              </div>
              <div class="text-comment">${c.text}</div>
              <div class="action-bar">
                <span class="action-btn ${c.isLiked ? "liked" : ""}" @click="${() => this._handleLike(c.id)}">
                  🔺 ${c.likes || 0}
                </span>
                <span class="action-btn" @click="${() => this._handleDislike(c.id)}">🔻</span>
                <span class="action-btn" @click="${() => this._toggleReply(c.id)}">Reply</span>
                ${this.viewMode === "lecturer" && !this.hideDelete ? html`<span class="action-btn" style="color:#e53e3e;" @click="${() => this._deleteComment(c.id)}">🗑️ Hapus</span>` : ""}
              </div>

              ${this._activeReplyId === c.id ? html`
                <div class="reply-form-box">
                  <input id="reply-${c.id}" class="reply-input" type="text" placeholder="Tulis balasan...">
                  <button class="btn-submit" style="font-size:12px;padding:6px 12px;" ?disabled="${this._submitting}" @click="${() => this._submitReply(c.id)}">${this._submitting ? "..." : "Reply"}</button>
                </div>
              ` : ""}

              ${c.replies && c.replies.length > 0 ? html`
                <div class="replies-wrapper">
                  ${c.replies.map(r => html`
                    <div class="reply-card">
                      <div class="avatar" style="width:30px;height:30px;font-size:14px;">${r.user ? r.user.charAt(0).toUpperCase() : "?"}</div>
                      <div class="comment-content">
                        <div class="comment-header">
                          <span class="user-name" style="font-size:13px;">${r.user}</span>
                          <span class="time-stamp">${this._timeAgo(r.time)}</span>
                        </div>
                        <div class="text-comment" style="font-size:13px;">${r.text}</div>
                        <div class="action-bar" style="margin-top:4px;">
                          <span class="action-btn" @click="${() => this._handleLike(r.id)}">🔺 ${r.likes || 0}</span>
                          <span class="action-btn" @click="${() => this._handleDislike(r.id)}">🔻</span>
                          ${this.viewMode === "lecturer" && !this.hideDelete ? html`<span class="action-btn" style="color:#e53e3e;" @click="${() => this._deleteComment(r.id)}">🗑️ Hapus</span>` : ""}
                        </div>
                      </div>
                    </div>
                  `)}
                </div>
              ` : ""}
            </div>
          </div>
        `)}

        ${sorted.length === 0 ? html`<p style="font-size:13px;color:#a0aec0;text-align:center;padding:20px;">Belum ada komentar. Mulai diskusi!</p>` : ""}
      </div>
    `;
  }
}

customElements.define(AssignmentForum.tag, AssignmentForum);
