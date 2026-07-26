// elements/quiz-dashboard-lite/lib/quiz-user-auth.js
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

class QuizUserAuth extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "quiz-user-auth";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url" },
      _screen: { state: true },
      _nama: { state: true },
      _email: { state: true },
      _nis: { state: true },
      _absen: { state: true },
      _kelas: { state: true },
      _studentId: { state: true },
      _errorMsg: { state: true },
      _successMsg: { state: true },
      _loading: { state: true }
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = ""; 
    this._screen = "check";
    this._nama = "";
    this._email = "";
    this._nis = "";
    this._absen = "";
    this._kelas = "";
    this._studentId = "";
    this._errorMsg = "";
    this._successMsg = "";
    this._loading = false;
    this.t = {
      ...this.t,
      login: "Masuk",
      register: "Daftar",
      nama: "Nama Lengkap",
      email: "Email",
      nis: "NIS",
      absen: "Nomor Absen",
      kelas: "Kelas",
      namaPlaceholder: "Contoh: Ahmad Dahlan",
      emailPlaceholder: "contoh@email.com",
      nisPlaceholder: "Contoh: 1234567",
      absenPlaceholder: "Contoh: 01",
      kelasPlaceholder: "Contoh: XII-IPA-1",
      welcome: "Selamat datang",
      logout: "Keluar",
      id: "ID"
    };
  }

  connectedCallback() {
    super.connectedCallback();
    const saved = this._load("quiz_user_session");
    if (saved?.studentId) {
      this._studentId = saved.studentId;
      this._nama = saved.nama;
      this._email = saved.email;
      this._nis = saved.nis || "";
      this._absen = saved.absen || "";
      this._kelas = saved.kelas || "";
      // Defer verifySession to avoid Lit double-update warning
      queueMicrotask(() => this._verifySession());
    } else {
      this._screen = "login";
    }
  }

  _load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  _save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  _clear(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  async _verifySession() {
    if (!this.appsScriptUrl || this.appsScriptUrl.trim() === "") {
      this._screen = "login";
      return;
    }
    this._loading = true;
    try {
      const url = `${this.appsScriptUrl}?action=verify&studentId=${encodeURIComponent(this._studentId)}`;
      const res = await fetch(url);

            // TAMBAH: Cek apakah respons benar-benar JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respon bukan JSON");
      }

      const data = await res.json();
      if (data.status === "success") {
        this._nama = data.nama;
        this._nis = data.nis || "";
        this._absen = data.absen || "";
        this._kelas = data.kelas || "";
        this._screen = "logged-in";
        this._dispatchLogin();
      } else {
        this._clear("quiz_user_session");
        this._screen = "login";
      }
    } catch {
      // this._screen = "logged-in";
      // this._dispatchLogin();
      // Jika gagal verifikasi, izinkan login manual
      this._screen = "login";
    }
    this._loading = false;
  }

  async _handleLogin(e) {
    e.preventDefault();
    this._errorMsg = "";

        // TAMBAH: Validasi URL sebelum fetch
    if (!this.appsScriptUrl || this.appsScriptUrl.trim() === "") {
      this._errorMsg = "URL Apps Script belum dikonfigurasi. Harap hubungi administrator.";
      return;
    }

    this._loading = true;
    try {
      const url = `${this.appsScriptUrl}?action=login&nis=${encodeURIComponent(this._nis.trim())}&email=${encodeURIComponent(this._email.trim())}`;
      const res = await fetch(url);

            // TAMBAH: Cek content-type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respon dari server bukan format JSON. Periksa URL Apps Script.");
      }

      const data = await res.json();
      if (data.status === "success") {
        this._studentId = data.studentId;
        this._nama = data.nama;
        this._nis = data.nis || this._nis;
        this._absen = data.absen || "";
        this._kelas = data.kelas || "";
        this._save("quiz_user_session", {
          studentId: data.studentId,
          nama: data.nama,
          email: this._email.trim(),
          nis: this._nis,
          absen: this._absen,
          kelas: this._kelas
        });
        this._screen = "logged-in";
        this._dispatchLogin();
      } else {
        this._errorMsg = data.message || "Login gagal";
      }
    } catch (err) {
      this._errorMsg = "Gagal menghubungi server";
    }
    this._loading = false;
  }

  async _handleRegister(e) {
    e.preventDefault();
    this._errorMsg = "";

        // TAMBAH: Validasi URL sebelum fetch
    if (!this.appsScriptUrl || this.appsScriptUrl.trim() === "") {
      this._errorMsg = "URL Apps Script belum dikonfigurasi. Harap hubungi administrator.";
      this._loading = false;
      return;
    }

    this._loading = true;
    try {
      const params = new URLSearchParams({
        action: "register",
        nama: this._nama.trim(),
        email: this._email.trim(),
        nis: this._nis.trim(),
        absen: this._absen.trim(),
        kelas: this._kelas.trim()
      });
      const url = `${this.appsScriptUrl}?${params.toString()}`;
      const res = await fetch(url, {
        redirect: "follow"
      });

            // TAMBAH: Cek content-type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respon dari server bukan format JSON. Periksa URL Apps Script.");
      }
      
      const data = await res.json();
      if (data.status === "success") {
        this._successMsg = "Pendaftaran berhasil!";
        this._screen = "login";
      } else {
        this._errorMsg = data.message || "Gagal mendaftar";
      }
    } catch (err) {
      console.error(err);
      this._errorMsg = "Gagal menghubungi server.";
    } finally {
      this._loading = false;
    }
  }

  _handleLogout() {
    this._clear("quiz_user_session");
    this._studentId = "";
    this._nama = "";
    this._email = "";
    this._nis = "";
    this._absen = "";
    this._kelas = "";
    this._screen = "login";
    window.dispatchEvent(new CustomEvent("quiz-user-logout", { bubbles: true, composed: true }));
  }

  _dispatchLogin() {
    window.dispatchEvent(new CustomEvent("quiz-user-login", {
      detail: {
        studentId: this._studentId,
        nama: this._nama,
        email: this._email,
        nis: this._nis,
        absen: this._absen,
        kelas: this._kelas
      },
      bubbles: true, composed: true
    }));
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host { display: block; margin-bottom: var(--ddd-spacing-4); }
        .auth-card {
          background: var(--ddd-theme-polaris-surface);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          border: 1px solid var(--ddd-theme-polaris-border);
          max-width: 420px;
          margin: 0 auto;
        }
        h2 { color: var(--ddd-theme-primary); font-size: var(--ddd-font-size-l); margin: 0 0 var(--ddd-spacing-2) 0; text-align: center; }
        .subtitle { color: var(--ddd-theme-secondary); font-size: var(--ddd-font-size-s); text-align: center; margin-bottom: var(--ddd-spacing-4); }
        .field { margin-bottom: var(--ddd-spacing-3); }
        .field-row { display: flex; gap: var(--ddd-spacing-3); }
        .field-row .field { flex: 1; }
        .field label { display: block; font-size: var(--ddd-font-size-s); font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-secondary); margin-bottom: var(--ddd-spacing-1); }
        .field input {
          width: 100%; padding: var(--ddd-spacing-3); border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md); font-size: var(--ddd-font-size-m); font-family: var(--ddd-font-primary);
          box-sizing: border-box;
        }
        .field input:focus { outline: none; border-color: var(--ddd-theme-primary); box-shadow: 0 0 0 2px rgba(103,80,164,0.15); }
        .btn {
          width: 100%; padding: var(--ddd-spacing-3); border: none; border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-m); font-weight: var(--ddd-font-weight-bold); cursor: pointer;
          font-family: var(--ddd-font-primary); margin-top: var(--ddd-spacing-2);
          background: var(--ddd-theme-polaris-primary); color: var(--ddd-theme-on-primary);
        }
        .btn:hover { background: var(--ddd-theme-accent); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-link { background: none; color: var(--ddd-theme-primary); font-size: var(--ddd-font-size-s); text-decoration: underline; margin-top: var(--ddd-spacing-3); font-weight: var(--ddd-font-weight-medium); }
        .msg { padding: var(--ddd-spacing-3); border-radius: var(--ddd-radius-md); font-size: var(--ddd-font-size-s); margin-bottom: var(--ddd-spacing-3); }
        .msg-error { background: var(--ddd-theme-error-light); color: var(--ddd-theme-on-error); border: 1px solid var(--ddd-theme-error); }
        .msg-success { background: var(--ddd-theme-success-light); color: var(--ddd-theme-on-success); border: 1px solid var(--ddd-theme-success); }
        .user-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--ddd-theme-polaris-surface-hover); border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-4); border: 1px solid var(--ddd-theme-polaris-border);
        }
        .user-info { display: flex; align-items: center; gap: var(--ddd-spacing-3); }
        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: var(--ddd-font-weight-bold); font-size: var(--ddd-font-size-l);
        }
        .user-name { font-weight: var(--ddd-font-weight-bold); font-size: var(--ddd-font-size-m); }
        .user-email { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); }
        .user-meta { font-size: var(--ddd-font-size-xs); color: var(--ddd-theme-secondary); margin-top: var(--ddd-spacing-1); }
        .logout-btn {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3); border: 1px solid var(--ddd-theme-error);
          color: var(--ddd-theme-error); background: none; border-radius: var(--ddd-radius-sm);
          font-size: var(--ddd-font-size-xs); cursor: pointer; font-family: var(--ddd-font-primary);
        }
        .logout-btn:hover { background: var(--ddd-theme-error); color: var(--ddd-theme-on-error); }
        .loading { text-align: center; padding: var(--ddd-spacing-8); color: var(--ddd-theme-primary); }
      `
    ];
  }

  render() {
    if (this._loading && this._screen === "check") {
      return html`<div class="loading">⏳ Memverifikasi sesi...</div>`;
    }

    if (this._screen === "logged-in") {
      const initial = this._nama ? this._nama.charAt(0).toUpperCase() : "?";
      return html`
        <div class="user-bar">
          <div class="user-info">
            <div class="avatar">${initial}</div>
            <div>
              <div class="user-name">${this._nama}</div>
              <div class="user-email">${this._email}</div>
              <div class="user-meta">NIS: ${this._nis} | Absen: ${this._absen} | Kelas: ${this._kelas}</div>
            </div>
          </div>
          <button class="logout-btn" @click="${this._handleLogout}">${this.t.logout}</button>
        </div>
      `;
    }

    return html`
      <div class="auth-card">
        <h2>🔐 ${this._screen === "register" ? this.t.register : this.t.login}</h2>
        <p class="subtitle">
          ${this._screen === "register"
            ? "Buat akun untuk menyimpan hasil kuis & aktivitas"
            : "Masuk dengan email yang sudah terdaftar"}
        </p>

        ${this._errorMsg ? html`<div class="msg msg-error">${this._errorMsg}</div>` : ""}

        ${this._screen === "register" ? html`
          <form @submit="${this._handleRegister}">
            <div class="field">
              <label>${this.t.nis}</label>
              <input type="text" .value="${this._nis}"
                @input="${e => this._nis = e.target.value}"
                placeholder="${this.t.nisPlaceholder}" required>
            </div>
            <div class="field">
              <label>${this.t.nama}</label>
              <input type="text" .value="${this._nama}"
                @input="${e => this._nama = e.target.value}"
                placeholder="${this.t.namaPlaceholder}" required minlength="3">
            </div>
            <div class="field">
              <label>${this.t.email}</label>
              <input type="email" .value="${this._email}"
                @input="${e => this._email = e.target.value}"
                placeholder="${this.t.emailPlaceholder}" required>
            </div>
            <div class="field-row">
              <div class="field">
                <label>${this.t.absen}</label>
                <input type="text" .value="${this._absen}"
                  @input="${e => this._absen = e.target.value}"
                  placeholder="${this.t.absenPlaceholder}" required>
              </div>
              <div class="field">
                <label>${this.t.kelas}</label>
                <input type="text" .value="${this._kelas}"
                  @input="${e => this._kelas = e.target.value}"
                  placeholder="${this.t.kelasPlaceholder}" required>
              </div>
            </div>
            <button class="btn" type="submit" ?disabled="${this._loading}">
              ${this._loading ? "⏳ Mendaftar..." : this.t.register}
            </button>
          </form>
          <button class="btn-link" @click="${() => { this._screen = "login"; this._errorMsg = ""; }}">
            Sudah punya akun? ${this.t.login}
          </button>
        ` : html`
          <form @submit="${this._handleLogin}">
            <div class="field">
              <label>${this.t.nis}</label>
              <input type="text" .value="${this._nis}"
                @input="${e => this._nis = e.target.value}"
                placeholder="${this.t.nisPlaceholder}" required>
            </div>
            <div class="field">
              <label>${this.t.email}</label>
              <input type="email" .value="${this._email}"
                @input="${e => this._email = e.target.value}"
                placeholder="${this.t.emailPlaceholder}" required>
            </div>
            <button class="btn" type="submit" ?disabled="${this._loading}">
              ${this._loading ? "⏳ Masuk..." : this.t.login}
            </button>
          </form>
          <button class="btn-link" @click="${() => { this._screen = "register"; this._errorMsg = ""; }}">
            Belum punya akun? ${this.t.register}
          </button>
        `}
      </div>
    `;
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Quiz User Auth",
        description: "Sistem login/registrasi siswa untuk dashboard kuis",
        icon: "icons:account-circle",
        color: "purple",
        tags: ["Education", "Auth"]
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
            required: true
          }
        ]
      }
    };
  }
}

globalThis.customElements.define(QuizUserAuth.tag, QuizUserAuth);
export { QuizUserAuth };