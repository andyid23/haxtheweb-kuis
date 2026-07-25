import { LitElement, html, css } from "lit";

const STORAGE_KEY_ASSIGNMENT = "hax_assignment_submitted";
const STORAGE_KEY_FORUM = "hax_forum_posts";

export class AssignmentForum extends LitElement {
  static get tag() { return "assignment-forum"; }

  static get properties() {
    return {
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      sheetName: { type: String, attribute: "sheet-name" },
      studentId: { type: String, attribute: "student-id" },
      studentName: { type: String, attribute: "student-name" },
      assignmentTitle: { type: String, attribute: "assignment-title" },
      assignmentInstruction: { type: String, attribute: "assignment-instruction" },
      forumTopic: { type: String, attribute: "forum-topic" },
      _assignmentText: { state: true },
      _assignmentSubmitted: { state: true },
      _forumText: { state: true },
      _forumPosts: { state: true },
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this.studentName = "";
    this.assignmentTitle = "Tugas Mandiri";
    this.assignmentInstruction = "Tuliskan refleksi atau jawaban tugas Anda di bawah ini.";
    this.forumTopic = "Forum Diskusi";
    this._assignmentText = "";
    this._assignmentSubmitted = localStorage.getItem(STORAGE_KEY_ASSIGNMENT) === "true";
    this._assignmentText = localStorage.getItem("hax_assignment_text") || "";
    this._forumText = "";
    this._forumPosts = JSON.parse(localStorage.getItem(STORAGE_KEY_FORUM) || "[]");
  }

  static get styles() {
    return css`
      :host { display: block; font-family: system-ui; color: #2d3748; }
      .card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
      h3 { margin: 0 0 8px; font-size: 16px; color: #1a202c; display: flex; align-items: center; gap: 8px; }
      .meta { font-size: 12px; color: #718096; background: #edf2f7; padding: 4px 10px; border-radius: 12px; display: inline-block; margin-bottom: 12px; }
      textarea { width: 100%; min-height: 90px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; }
      textarea:focus { outline: none; border-color: #3182ce; }
      textarea:disabled { background: #f7fafc; cursor: not-allowed; }
      .btn-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
      .btn { border: none; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background 0.2s; color: white; }
      .btn-primary { background: #3182ce; }
      .btn-primary:hover { background: #2b6cb0; }
      .btn-success { background: #38a169; }
      .btn-success:hover { background: #2f855a; }
      .btn-danger { background: #e53e3e; }
      .btn-danger:hover { background: #9b2c2c; }
      .btn-sm { padding: 5px 10px; font-size: 11px; }
      .badge-done { background: #c6f6d5; color: #22543d; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; }
      .badge-pending { background: #feebc8; color: #c05621; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; }
      .comment-list { margin-top: 14px; max-height: 250px; overflow-y: auto; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      .comment-item { background: #f7fafc; border-left: 3px solid #3182ce; padding: 10px; border-radius: 0 6px 6px 0; margin-bottom: 8px; font-size: 13px; }
      .comment-header { display: flex; justify-content: space-between; font-size: 11px; color: #a0aec0; margin-bottom: 3px; }
      .user-name { font-weight: bold; color: #4a5568; }
      .summary-bar { display: flex; gap: 12px; margin-top: 12px; padding: 10px; background: #f7fafc; border-radius: 8px; font-size: 12px; }
      .summary-item { display: flex; align-items: center; gap: 4px; }
    `;
  }

  _submitAssignment() {
    const text = this._assignmentText.trim();
    if (!text) { alert("Isi tugas terlebih dahulu!"); return; }
    localStorage.setItem(STORAGE_KEY_ASSIGNMENT, "true");
    localStorage.setItem("hax_assignment_text", text);
    this._assignmentSubmitted = true;
    this._sendActivity("assignment", `Tugas: ${this.assignmentTitle}`);
  }

  _resetAssignment() {
    localStorage.removeItem(STORAGE_KEY_ASSIGNMENT);
    localStorage.removeItem("hax_assignment_text");
    this._assignmentSubmitted = false;
    this._assignmentText = "";
  }

  _exportAssignment() {
    const text = this._assignmentText || localStorage.getItem("hax_assignment_text") || "";
    const content = `=== LAPORAN TUGAS MANDIRI ===\nTanggal: ${new Date().toLocaleDateString("id-ID")}\nTugas: ${this.assignmentTitle}\n\n${text}\n\n===`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Tugas_${this.assignmentTitle.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  _submitForum() {
    const text = this._forumText.trim();
    if (!text) { alert("Tulis komentar forum terlebih dahulu!"); return; }
    const post = { name: this.studentName || "Siswa", text, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
    this._forumPosts = [post, ...this._forumPosts];
    localStorage.setItem(STORAGE_KEY_FORUM, JSON.stringify(this._forumPosts));
    this._forumText = "";
    this._sendActivity("discussion", `Forum: ${text.substring(0, 50)}...`);
  }

  _sendActivity(type, description) {
    if (!this.appsScriptUrl || !this.studentId) return;
    const params = new URLSearchParams({
      action: "activity", activityType: type, description,
      name: this.studentName, studentId: this.studentId,
      sheet: this.sheetName, timestamp: new Date().toISOString(),
    });
    fetch(`${this.appsScriptUrl}?${params.toString()}`, { redirect: "follow" })
      .then(r => r.json())
      .then(d => console.log("[assignment-forum] Activity saved:", d))
      .catch(e => console.error("[assignment-forum] Error:", e));
    window.dispatchEvent(new CustomEvent("a3-activity-logged", { bubbles: true, composed: true }));
  }

  render() {
    const assignmentDone = this._assignmentSubmitted;
    const forumCount = this._forumPosts.length;
    return html`
      <!-- SUMMARY BAR -->
      <div class="summary-bar">
        <div class="summary-item">${assignmentDone ? "✅" : "⏳"} Tugas: ${assignmentDone ? "Selesai" : "Belum"}</div>
        <div class="summary-item">💬 Forum: ${forumCount} postingan</div>
      </div>

      <!-- ASSIGNMENT CARD -->
      <div class="card">
        <h3>📝 ${this.assignmentTitle}</h3>
        <div class="meta">Formatif | Tugas Mandiri</div>
        <p style="margin:0 0 10px;font-size:13px;color:#4a5568;line-height:1.5;">${this.assignmentInstruction}</p>
        <textarea .value="${this._assignmentText}" @input="${(e) => { this._assignmentText = e.target.value; }}"
          ?disabled="${assignmentDone}" placeholder="Tulis jawaban tugas Anda di sini..."></textarea>
        <div class="btn-group">
          ${assignmentDone
            ? html`
              <button class="btn btn-success btn-sm" disabled>✅ Tugas Terkirim</button>
              <button class="btn btn-primary btn-sm" @click="${this._exportAssignment}">📥 Ekspor</button>
              <button class="btn btn-danger btn-sm" @click="${this._resetAssignment}">🔄 Ubah Jawaban</button>
            `
            : html`<button class="btn btn-success" @click="${this._submitAssignment}">Kirim & Kunci Tugas</button>`}
        </div>
        <div class="${assignmentDone ? "badge-done" : "badge-pending"}">
          ${assignmentDone ? "✅ Tugas Berhasil Diserahkan" : "⚠️ Belum Menyerahkan Tugas"}
        </div>
      </div>

      <!-- FORUM CARD -->
      <div class="card">
        <h3>💬 ${this.forumTopic}</h3>
        <p style="margin:0 0 10px;font-size:13px;color:#4a5568;">Bagikan pendapatmu atau tanggapi diskusi kelas.</p>
        <textarea .value="${this._forumText}" @input="${(e) => { this._forumText = e.target.value; }}"
          placeholder="Tulis komentar atau pertanyaan forum..." style="min-height:60px;"></textarea>
        <button class="btn btn-primary" @click="${this._submitForum}">Kirim ke Forum</button>

        <div class="comment-list">
          ${this._forumPosts.map(p => html`
            <div class="comment-item">
              <div class="comment-header"><span class="user-name">👤 ${p.name}</span><span>${p.time}</span></div>
              <div style="color:#4a5568;">${p.text}</div>
            </div>
          `)}
          ${this._forumPosts.length === 0 ? html`<p style="font-size:12px;color:#a0aec0;text-align:center;">Belum ada postingan forum</p>` : ""}
        </div>
      </div>
    `;
  }
}

customElements.define(AssignmentForum.tag, AssignmentForum);
