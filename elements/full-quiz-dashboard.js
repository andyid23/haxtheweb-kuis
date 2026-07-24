/**
 * <full-quiz-dashboard> - Web Component Vanilla JS
 * Satu elemen untuk SEMUA: Kuis + Attendance + Heatmap + Gradebook
 * 
 * Cara pakai:
 *   <full-quiz-dashboard></full-quiz-dashboard>
 *   <full-quiz-dashboard apps-script-url="https://script.google.com/macros/s/xxx/exec"></full-quiz-dashboard>
 *   <full-quiz-dashboard spreadsheet-id="your-sheet-id"></full-quiz-dashboard>
 * 
 * Fitur:
 *  - Kuis interaktif (5 soal default, bisa edit/tambah)
 *  - Pelacakan aktivitas otomatis (scroll, klik)
 *  - Attendance tracker mingguan (gauge + checklist)
 *  - Heatmap aktivitas 28 hari (seperti GitHub)
 *  - Gradebook transparan (bobot bisa diatur)
 *  - Integrasi Google Sheets via Apps Script
 *  - Semua data ke localStorage + Google Sheets
 *  - 0 dependencies, pure vanilla JS
 */
class FullQuizDashboard extends HTMLElement {
  // ==========================================
  // CONSTANTS
  // ==========================================
  static LOGS_KEY     = 'a3_attendance_activity_logs';
  static THRESHOLD_KEY = 'a3_attendance_threshold_config';
  static GRADES_KEY   = 'a3_attendance_grades_config';
  static SHEETS_KEY   = 'quiz_sheet_id';
  static SCRIPT_KEY   = 'apps_script_url';
  static QUESTIONS_KEY = 'quiz_custom_questions';

  static QUESTIONS = [
    { question: 'Apa ibu kota Indonesia?', choices: ['Bandung','Surabaya','Jakarta','Medan'], correctIndex: 2 },
    { question: 'Berapa hasil dari 7 × 8?', choices: ['54','56','58','60'], correctIndex: 1 },
    { question: 'Planet terdekat dengan Matahari?', choices: ['Venus','Bumi','Mars','Merkurius'], correctIndex: 3 },
    { question: 'Siapa presiden pertama Indonesia?', choices: ['Soeharto','Soekarno','Habibie','Megawati'], correctIndex: 1 },
    { question: 'Berapa jumlah provinsi di Indonesia?', choices: ['32','34','36','38'], correctIndex: 2 }
  ];

  static THRESHOLDS = { minWeeklyActivities:5, minReading:2, minQuiz:1, minDiscussion:1 };
  static GRADES     = { uts:85, uas:88, attendanceWeight:30, quizWeight:20, utsWeight:25, uasWeight:25 };

  static get observedAttributes() { return ['apps-script-url','spreadsheet-id','questions']; }

  // ==========================================
  // LIFECYCLE
  // ==========================================
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._init();
  }

  _init() {
    this._sid  = this._load(FullQuizDashboard.SHEETS_KEY, '');
    this._url  = this._load(FullQuizDashboard.SCRIPT_KEY, '');
    this.questions = this._load(FullQuizDashboard.QUESTIONS_KEY, null) || FullQuizDashboard.QUESTIONS;
    this.thresholds = { ...FullQuizDashboard.THRESHOLDS, ...this._load(FullQuizDashboard.THRESHOLD_KEY, {}) };
    this.grades     = { ...FullQuizDashboard.GRADES,     ...this._load(FullQuizDashboard.GRADES_KEY, {}) };

    this.quiz = { screen:'name', name:'', idx:0, score:0, answered:false, sel:-1, fb:'', fbPos:false };
    this._tab = 'setup';
    this._toast = '';
    this._toastT = null;
    this._lastScroll = 0;
    this._editing = false;
    this._editIdx = -1;
    this._edit = { q:'', c0:'', c1:'', c2:'', c3:'', correct:'0' };
    this._onScroll = this._onScroll.bind(this);
    this._onClick  = this._onClick.bind(this);
  }

  connectedCallback() {
    this._render();
    addEventListener('scroll', this._onScroll, { passive:true });
    addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    removeEventListener('scroll', this._onScroll);
    removeEventListener('click', this._onClick);
  }

  attributeChangedCallback(name, _, val) {
    if (name === 'apps-script-url') this._url = val;
    if (name === 'spreadsheet-id')  this._sid = val;
    if (name === 'questions' && val) { try { this.questions = JSON.parse(val); } catch(_){} }
    if (this.isConnected) this._render();
  }

  // ==========================================
  // STORAGE
  // ==========================================
  _load(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
  _save(k, v)  { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  _rem(k)      { try { localStorage.removeItem(k); } catch {} }

  _logs() { return this._load(FullQuizDashboard.LOGS_KEY, []); }

  // ==========================================
  // TOAST
  // ==========================================
  _show(msg) {
    this._toast = msg;
    if (this._toastT) clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { this._toast = ''; this._render(); }, 3000);
    this._render();
  }

  // ==========================================
  // APPS SCRIPT / SHEETS
  // ==========================================
  get _connected() { return !!(this._url || this._sid); }

  _connect(url) {
    if (!url?.includes?.('script.google.com')) return this._show('URL tidak valid!');
    this._url = url.trim();
    this._save(FullQuizDashboard.SCRIPT_KEY, this._url);
    this._show('Terhubung ke Apps Script!');
    this._render();
  }

  _connectSheets(v) {
    let id = v.trim();
    const m = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) id = m[1];
    if (!id) return this._show('ID tidak valid!');
    this._sid = id;
    this._save(FullQuizDashboard.SHEETS_KEY, this._sid);
    this._show('Sheet ID terhubung!');
    this._render();
  }

  _disc() {
    this._url = ''; this._sid = '';
    this._rem(FullQuizDashboard.SCRIPT_KEY);
    this._rem(FullQuizDashboard.SHEETS_KEY);
    this._show('Koneksi diputuskan');
    this._render();
  }

  _send(data) {
    if (!this._url) return;
    fetch(this._url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(data) })
      .catch(() => {});
  }

  // ==========================================
  // ACTIVITY LOGGING
  // ==========================================
  _onScroll() {
    const now = Date.now();
    if (scrollY < 300 || now - this._lastScroll < 60000) return;
    this._lastScroll = now;
    this._log('reading', `Membaca materi (Scroll ${Math.round(scrollY)}px)`);
  }

  _onClick(e) {
    const t = e.composedPath()[0];
    if (!t || t.closest?.('full-quiz-dashboard')) return;
    if (t.tagName === 'A' && t.href) {
      const dl = t.href.match(/\.(pdf|docx|zip|xlsx|pptx|mp4|png|jpg)$/i) || t.hasAttribute('download');
      if (dl) {
        const fn = t.href.substring(t.href.lastIndexOf('/')+1) || 'materi';
        this._log('download', `Mengunduh: ${decodeURIComponent(fn)}`);
      }
    }
  }

  _log(type, desc) {
    const logs = this._logs();
    const l = { id:'log-'+Date.now()+'-'+Math.random(), timestamp:new Date().toISOString(), type, description:desc };
    logs.unshift(l);
    this._save(FullQuizDashboard.LOGS_KEY, logs);
    this._send({ type:'attendance', timestamp:l.timestamp, name:'Student', activityType:type, description:desc });
    if (this._tab === 'attendance' || this._tab === 'grades') this._render();
  }

  _sim(type) {
    const t = {
      reading: ['Membaca Modul 1','Membaca Modul 2','Mengeksplorasi Halaman'],
      download: ['Mengunduh PDF Panduan.pdf','Mengunduh Source Code.zip'],
      discussion: ['Mengirimkan pertanyaan di Forum','Membalas tanggapan di diskusi']
    };
    const arr = t[type];
    this._log(type, arr[Math.floor(Math.random()*arr.length)]);
    this._show(`Simulasi ${type} tercatat!`);
  }

  _clearLogs() {
    this._rem(FullQuizDashboard.LOGS_KEY);
    this._show('Log direset!');
    this._render();
  }

  // ==========================================
  // QUIZ
  // ==========================================
  _start(name) {
    if (!name || name.length <= 2) return this._show('Nama minimal 3 karakter!');
    this.quiz = { screen:'question', name, idx:0, score:0, answered:false, sel:-1, fb:'', fbPos:false };
    this._render();
  }

  _select(i) {
    if (this.quiz.answered) return;
    this.quiz.answered = true; this.quiz.sel = i;
    const q = this.questions[this.quiz.idx];
    if (i === q.correctIndex) { this.quiz.score++; this.quiz.fb = '✅ Benar!'; this.quiz.fbPos = true; }
    else { this.quiz.fb = `❌ Salah. Jawaban: ${q.choices[q.correctIndex]}`; this.quiz.fbPos = false; }
    this._render();
    setTimeout(() => this._next(), 1200);
  }

  _next() {
    if (this.quiz.idx < this.questions.length-1) {
      this.quiz.idx++; this.quiz.answered = false; this.quiz.sel = -1; this.quiz.fb = '';
    } else {
      const pct = Math.round((this.quiz.score/this.questions.length)*100);
      this._log('quiz', `Menyelesaikan Kuis (Skor: ${pct}%)`);
      this._send({ timestamp:new Date().toISOString(), name:this.quiz.name, score:pct, totalQuestions:this.questions.length });
      this.quiz.screen = 'result';
    }
    this._render();
  }

  _restart() {
    this.quiz = { screen:'name', name:'', idx:0, score:0, answered:false, sel:-1, fb:'', fbPos:false };
    this._render();
  }

  // ==========================================
  // ATTENDANCE MATH
  // ==========================================
  _weekly() {
    const logs = this._logs();
    const wa = new Date(Date.now() - 7*86400000);
    const wl = logs.filter(l => new Date(l.timestamp) >= wa);
    const t = this.thresholds;
    const c = { reading: wl.filter(l=>l.type==='reading').length, quiz:wl.filter(l=>l.type==='quiz').length, discussion:wl.filter(l=>l.type==='discussion').length, total:wl.length };
    const g = { reading:c.reading>=t.minReading, quiz:c.quiz>=t.minQuiz, discussion:c.discussion>=t.minDiscussion, total:c.total>=t.minWeeklyActivities };
    const met = (g.reading?1:0)+(g.quiz?1:0)+(g.discussion?1:0)+(g.total?1:0);
    return { counts:c, goals:g, pct:Math.round((met/4)*100), status:met>=3?'HADIR':'BELUM LENGKAP' };
  }

  _streak() {
    const logs = this._logs();
    let s = 0, d = new Date(); d.setHours(0,0,0,0);
    for (let i=0; i<30; i++) {
      if (logs.filter(l=>{const ld=new Date(l.timestamp); ld.setHours(0,0,0,0); return ld.getTime()===d.getTime();}).length>0) s++;
      else if (i>0) break;
      d.setDate(d.getDate()-1);
    }
    return s;
  }

  _heatmap() {
    const logs = this._logs();
    const r = [];
    for (let o=27; o>=0; o--) {
      const d = new Date(); d.setDate(d.getDate()-o); d.setHours(0,0,0,0);
      r.push({ date:d, count:logs.filter(l=>{const ld=new Date(l.timestamp); ld.setHours(0,0,0,0); return ld.getTime()===d.getTime();}).length });
    }
    return r;
  }

  _grade() {
    const a = this._weekly().pct;
    const ql = this._logs().filter(l=>l.type==='quiz');
    let qs = 0;
    if (ql.length) qs = Math.max(...ql.map(l=>{const m=l.description.match(/Skor:\s*(\d+)%/); return m?parseInt(m[1]):0;}));
    const g = this.grades;
    const fin = ((a * g.attendanceWeight) + (qs * g.quizWeight) + (g.uts * g.utsWeight) + (g.uas * g.uasWeight)) / 100;
    let l = 'E';
    if (fin>=85) l='A'; else if (fin>=80) l='A-'; else if (fin>=75) l='B+'; else if (fin>=70) l='B'; else if (fin>=65) l='B-'; else if (fin>=60) l='C+'; else if (fin>=55) l='C'; else if (fin>=40) l='D';
    return { att:a, quiz:qs, final:Math.round(fin*10)/10, grade:l };
  }

  // ==========================================
  // EDITOR
  // ==========================================
  _addQ() {
    const d = this._edit;
    if (!d.q || !d.c0 || !d.c1 || !d.c2 || !d.c3) return this._show('Semua field harus diisi!');
    this.questions = [...this.questions, { question:d.q, choices:[d.c0,d.c1,d.c2,d.c3], correctIndex:parseInt(d.correct) }];
    this._save(FullQuizDashboard.QUESTIONS_KEY, this.questions);
    this._edit = { q:'', c0:'', c1:'', c2:'', c3:'', correct:'0' };
    this._show('Soal ditambahkan!');
    this._render();
  }

  _editQ(i) {
    const q = this.questions[i];
    this._editIdx = i;
    this._edit = { q:q.question, c0:q.choices[0], c1:q.choices[1], c2:q.choices[2], c3:q.choices[3], correct:String(q.correctIndex) };
    this._render();
  }

  _saveQ() {
    const d = this._edit;
    if (!d.q) return this._show('Pertanyaan tidak boleh kosong!');
    this.questions = this.questions.map((q,i)=>i===this._editIdx?{question:d.q,choices:[d.c0,d.c1,d.c2,d.c3],correctIndex:parseInt(d.correct)}:q);
    this._save(FullQuizDashboard.QUESTIONS_KEY, this.questions);
    this._editIdx = -1; this._edit = { q:'', c0:'', c1:'', c2:'', c3:'', correct:'0' };
    this._show('Soal diupdate!');
    this._render();
  }

  _delQ(i) {
    if (this.questions.length <= 3) return this._show('Minimal 3 soal!');
    this.questions = this.questions.filter((_,j)=>j!==i);
    this._save(FullQuizDashboard.QUESTIONS_KEY, this.questions);
    if (this._editIdx===i) { this._editIdx=-1; this._edit={q:'',c0:'',c1:'',c2:'',c3:'',correct:'0'}; }
    this._show('Soal dihapus!');
    this._render();
  }

  _updThreshold(key, val) {
    this.thresholds = { ...this.thresholds, [key]:parseInt(val) };
    this._save(FullQuizDashboard.THRESHOLD_KEY, this.thresholds);
    this._render();
  }

  _updGrade(key, val) {
    this.grades = { ...this.grades, [key]:parseInt(val) };
    this._save(FullQuizDashboard.GRADES_KEY, this.grades);
    this._render();
  }

  // ==========================================
  // RENDER
  // ==========================================
  _render() {
    this.shadowRoot.innerHTML = `
      <style>${FullQuizDashboard.CSS}</style>
      ${this._renderToast()}
      ${this._connected ? this._renderHeader() : ''}
      ${this._renderTabs()}
      ${this._renderContent()}
    `;
    this._bind();
  }

  _renderToast() { return this._toast ? `<div class="t">${this._toast}</div>` : ''; }

  _renderHeader() {
    return `<div class="hd"><div><h1>🎯 Dashboard Pembelajaran</h1><p>Kuis + Kehadiran + Nilai</p></div><div class="hdr"><span class="b g">Online</span><button class="bs" data-a="disc">🔌</button></div></div>`;
  }

  _renderTabs() {
    const tabs = this._connected
      ? [['quiz','📝 Kuis'],['attendance','📊 Kehadiran'],['grades','📖 Nilai'],['editor','⚙️ Soal'],['settings','🔧 Atur']]
      : [['setup','⚙️ Setup']];
    return `<div class="tb">${tabs.map(([k,l])=>`<button class="tbb ${this._tab===k?'a':''}" data-tab="${k}">${l}</button>`).join('')}</div>`;
  }

  _renderContent() {
    if (!this._connected || this._tab==='setup') return this._renderSetup();
    switch (this._tab) {
      case 'quiz': return this._renderQuiz();
      case 'attendance': return this._renderAtt();
      case 'grades': return this._renderGrade();
      case 'editor': return this._renderEditor();
      case 'settings': return this._renderSettings();
      default: return this._renderQuiz();
    }
  }

  // --- SETUP ---
  _renderSetup() {
    return `
      <div class="c sc">
        <h2>🔗 Hubungkan ke Google Sheets</h2>
        <p style="font-size:13px;color:#666;margin-bottom:20px">Pilih metode untuk menyimpan data kuis dan attendance.</p>
        <div class="so">
          <h3>📋 Apps Script (Recommended)</h3>
          <p>Deploy script ke Sheets, dapatkan URL.</p>
          <div class="ir"><input id="ai" placeholder="https://script.google.com/macros/s/xxx/exec" value="${this._url||''}"><button id="ca" class="b p">Hubungkan</button></div>
        </div>
        <div class="dv"></div>
        <div class="so">
          <h3>📊 Sheet ID + Backend</h3>
          <p>Gunakan jika ada endpoint /api/save-quiz-result</p>
          <div class="ir"><input id="si" placeholder="Sheet ID atau URL" value="${this._sid||''}"><button id="cs" class="b s">Hubungkan</button></div>
        </div>
        <div class="ti"><strong>💡 Tutorial:</strong> <a href="tutorial.html" target="_blank" style="color:#6750a4">Buka panduan setup →</a></div>
      </div>
      <div class="c sb"><h3>⚠️ Dashboard Belum Terhubung</h3><p>Hubungkan di tab Setup untuk mengaktifkan semua fitur.</p><p style="font-size:12px;color:#888">Tanpa koneksi, tetap berfungsi secara lokal.</p></div>
    `;
  }

  // --- QUIZ ---
  _renderQuiz() {
    switch (this.quiz.screen) {
      case 'name': return this._renderQName();
      case 'question': return this._renderQQuestion();
      case 'result': return this._renderQResult();
      default: return this._renderQName();
    }
  }

  _renderQName() {
    return `<div class="c"><div class="qc"><h2>📝 Kuis Interaktif</h2><p style="color:#666;margin-bottom:16px">Masukkan nama Anda.</p><div class="qi"><input id="qn" placeholder="Nama Anda..." autofocus></div><button id="qs" class="b p fw">Mulai Kuis</button><p style="text-align:center;font-size:12px;color:#888;margin-top:12px">${this.questions.length} soal</p></div></div>`;
  }

  _renderQQuestion() {
    const q = this.questions[this.quiz.idx];
    return `<div class="c"><div class="qc">
      <div class="qh"><span>Soal ${this.quiz.idx+1}/${this.questions.length}</span><span>Skor: ${this.quiz.score}</span></div>
      <div class="qq">${q.question}</div>
      <div class="qa">${q.choices.map((c,i)=>{
        let cl = 'qab';
        if (this.quiz.answered) { if (i===q.correctIndex) cl+=' cc'; else if (i===this.quiz.sel) cl+=' cw'; }
        return `<button class="${cl}" ${this.quiz.answered?'disabled':''} data-choice="${i}">${c}</button>`;
      }).join('')}</div>
      ${this.quiz.fb?`<div class="qf ${this.quiz.fbPos?'p':'n'}">${this.quiz.fb}</div>`:''}
    </div></div>`;
  }

  _renderQResult() {
    const pct = Math.round((this.quiz.score/this.questions.length)*100);
    let m = 'Jangan Menyerah! Coba Lagi!';
    if (pct>=80) m='Luar Biasa! 🎉'; else if (pct>=50) m='Bagus! 💪';
    return `<div class="c"><div class="rc">
      <h2>🎊 Hasil Kuis</h2><div class="ri">Nama: <strong>${this.quiz.name}</strong></div><div class="ri">Skor: <strong>${this.quiz.score}/${this.questions.length}</strong></div>
      <div class="rp">${pct}%</div><p class="rm">${m}</p><button id="qr" class="b p fw">Mulai Ulang</button>
      ${this._url?`<p style="text-align:center;font-size:12px;color:#4caf50;margin-top:12px">✅ Tersimpan ke Sheets</p>`:''}
    </div></div>`;
  }

  // --- ATTENDANCE ---
  _renderAtt() {
    const s = this._weekly();
    const streak = this._streak();
    const hm = this._heatmap();
    const logs = this._logs();
    const tr = this.thresholds;
    const gR = 56, gC = 2*Math.PI*gR, gOff = gC-(s.pct/100)*gC;

    return `
      <div class="c"><h2>📊 Pelacakan Aktivitas</h2><p style="font-size:13px;color:#666;margin-bottom:4px">Total: <strong>${logs.length}</strong> | Streak: <strong>🔥 ${streak} hari</strong></p>
        <div class="smb"><span class="sl">Simulasi:</span><button class="bs" data-sim="reading">📖</button><button class="bs" data-sim="download">📥</button><button class="bs" data-sim="discussion">💬</button><button class="bs dg" id="cl">🗑️ Reset</button></div>
      </div>
      <div class="g2">
        <div class="c"><h3>📅 Kehadiran Pekan Ini</h3>
          <div class="gw"><svg width="140" height="140" viewBox="0 0 140 140" style="transform:rotate(-90deg)"><circle fill="none" stroke="#f3f0fa" stroke-width="10" cx="70" cy="70" r="${gR}"/><circle fill="none" stroke="#6750a4" stroke-width="10" stroke-linecap="round" cx="70" cy="70" r="${gR}" stroke-dasharray="${gC}" stroke-dashoffset="${gOff}"/></svg><div class="gv">${s.pct}%</div></div>
          <div style="text-align:center;margin-top:8px"><span class="b ${s.pct>=75?'g':'o'}">${s.status}</span></div>
          <div class="cll" style="margin-top:16px">
            ${this._cri('📖','Membaca Modul',s.counts.reading,tr.minReading,s.goals.reading)}
            ${this._cri('📝','Kuis Selesai',s.counts.quiz,tr.minQuiz,s.goals.quiz)}
            ${this._cri('💬','Forum & Diskusi',s.counts.discussion,tr.minDiscussion,s.goals.discussion)}
            ${this._cri('📈','Total Aktivitas',s.counts.total,tr.minWeeklyActivities,s.goals.total)}
          </div>
        </div>
        <div class="c"><h3>🔥 Konsistensi Belajar</h3>
          <div class="sm2"><div class="sm"><div class="sml">Total</div><div class="smv">${logs.length}</div></div><div class="sm"><div class="sml">Streak</div><div class="smv">🔥 ${streak} hari</div></div></div>
          <div style="font-size:12px;font-weight:600;color:#666;text-align:center;margin:16px 0 8px">Peta Aktivitas 28 Hari</div>
          <div class="hmh"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div>
          <div class="hmg">${hm.map(d=>{let l='';if(d.count>0&&d.count<=2)l='l1';else if(d.count>2&&d.count<=4)l='l2';else if(d.count>4&&d.count<=7)l='l3';else if(d.count>7)l='l4';return `<div class="hc ${l}" title="${d.date.toLocaleDateString('id-ID')}: ${d.count}">${d.count||''}</div>`;}).join('')}</div>
          <div class="hml"><span>Sedikit</span><div class="lb" style="background:#f3f0fa"></div><div class="lb" style="background:#e3d9fc"></div><div class="lb" style="background:#c7b3fc"></div><div class="lb" style="background:#9d7bfc"></div><div class="lb" style="background:#6750a4"></div><span>Banyak</span></div>
          <div style="margin-top:16px;max-height:200px;overflow-y:auto">
            <div style="font-size:12px;font-weight:600;color:#666;margin-bottom:8px">Log Terbaru:</div>
            ${logs.slice(0,5).map(l=>`<div class="li ${l.type}"><span class="lt">${new Date(l.timestamp).toLocaleString('id-ID')}</span><span class="ld">${l.description}</span></div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  _cri(icon, name, cnt, min, met) {
    return `<div class="cri"><div class="crl"><span class="cric">${icon}</span><div><div class="crn">${name}</div><div class="crp">${cnt} dari ${min}</div></div></div><span>${met?'✅':'⏳'}</span></div>`;
  }

  // --- GRADES ---
  _renderGrade() {
    const gr = this._grade();
    const g = this.grades;
    return `<div class="c"><h2>📖 Transparansi Nilai</h2>
      <div class="gg">
        <div class="gi"><div class="gl">Kehadiran</div><div class="gv">${gr.att}%</div></div>
        <div class="gi"><div class="gl">Kuis</div><div class="gv">${gr.quiz}%</div></div>
        <div class="gi"><div class="gl">UTS</div><div class="gv">${g.uts}%</div></div>
        <div class="gi"><div class="gl">UAS</div><div class="gv">${g.uas}%</div></div>
        <div class="gi hl"><div class="gl">Nilai Akhir</div><div class="gv br">${gr.final}</div></div>
        <div class="gi hl"><div class="gl">Grade</div><div class="gv br" style="font-size:32px">${gr.grade}</div></div>
      </div>
      <table class="gt"><thead><tr><th>Komponen</th><th>Bobot</th><th>Nilai</th></tr></thead><tbody>
        <tr><td class="bld">Kehadiran</td><td>${g.attendanceWeight}%</td><td>${gr.att}</td></tr>
        <tr><td class="bld">Kuis</td><td>${g.quizWeight}%</td><td>${gr.quiz}</td></tr>
        <tr><td class="bld">UTS</td><td>${g.utsWeight}%</td><td>${g.uts}</td></tr>
        <tr><td class="bld">UAS</td><td>${g.uasWeight}%</td><td>${g.uas}</td></tr>
        <tr><td class="bld" colspan="3">Final = (${gr.att}×${g.attendanceWeight}% + ${gr.quiz}×${g.quizWeight}% + ${g.uts}×${g.utsWeight}% + ${g.uas}×${g.uasWeight}%)÷100 = <strong>${gr.final}</strong> (${gr.grade})</td></tr>
      </tbody></table>
      <div class="ti">🧮 Bobot bisa diubah di tab <strong>Atur</strong></div>
    </div>`;
  }

  // --- EDITOR ---
  _renderEditor() {
    const d = this._edit;
    return `<div class="c"><h2>⚙️ Edit Soal (${this.questions.length})</h2>
      <div class="ef"><h3>${this._editIdx>=0?'Edit #'+(this._editIdx+1):'Tambah Baru'}</h3>
        <textarea class="et" data-ed="q" placeholder="Pertanyaan...">${d.q||''}</textarea>
        <div class="ec">${[0,1,2,3].map(i=>`<div class="ecr"><input data-ed="c${i}" placeholder="Pilihan ${i+1}" value="${d['c'+i]||''}"><label class="rl"><input type="radio" name="ca" value="${i}" ${String(d.correct)===String(i)?'checked':''} data-ed="correct"> Benar</label></div>`).join('')}</div>
        ${this._editIdx>=0?`<div class="ea"><button id="sv" class="b p">Simpan</button><button id="cx" class="b s">Batal</button></div>`:`<button id="aq" class="b p fw">Tambah Soal</button>`}
      </div>
      <div style="margin-top:20px"><h3>Daftar Soal</h3>
        ${this.questions.map((q,i)=>`<div class="qcrd"><div class="qi2"><span class="qn">#${i+1}</span><span>${q.question}</span></div><div class="qa2"><button class="bs" data-edit="${i}">✏️</button><button class="bs dg" data-del="${i}" ${this.questions.length<=3?'disabled':''}>🗑️</button></div></div>`).join('')}
      </div>
    </div>`;
  }

  // --- SETTINGS ---
  _renderSettings() {
    const t = this.thresholds, g = this.grades;
    return `<div class="c"><h2>🔧 Pengaturan</h2>
      <h3 style="margin-top:20px">Threshold Kehadiran</h3>
      <div class="sg">${[{l:'Total Aktivitas',k:'minWeeklyActivities',v:t.minWeeklyActivities},{l:'Membaca',k:'minReading',v:t.minReading},{l:'Kuis',k:'minQuiz',v:t.minQuiz},{l:'Diskusi',k:'minDiscussion',v:t.minDiscussion}].map(x=>`<div class="si"><label>${x.l}</label><input class="sin" data-key="${x.k}" data-type="th" value="${x.v}" type="number"></div>`).join('')}</div>
      <h3 style="margin-top:20px">Bobot Nilai</h3>
      <div class="sg">${[{l:'Nilai UTS',k:'uts',v:g.uts},{l:'Nilai UAS',k:'uas',v:g.uas},{l:'Bobot Kehadiran (%)',k:'attendanceWeight',v:g.attendanceWeight},{l:'Bobot Kuis (%)',k:'quizWeight',v:g.quizWeight},{l:'Bobot UTS (%)',k:'utsWeight',v:g.utsWeight},{l:'Bobot UAS (%)',k:'uasWeight',v:g.uasWeight}].map(x=>`<div class="si"><label>${x.l}</label><input class="sin" data-key="${x.k}" data-type="gr" value="${x.v}" type="number"></div>`).join('')}</div>
      <div class="ti w">⚠️ Total bobot: ${g.attendanceWeight+g.quizWeight+g.utsWeight+g.uasWeight}% (sebaiknya 100%)</div>
    </div>`;
  }

  // ==========================================
  // EVENTS
  // ==========================================
  _bind() {
    const $ = s => this.shadowRoot.querySelector(s);
    const $$ = s => this.shadowRoot.querySelectorAll(s);

    // Tabs
    $$('.tbb').forEach(b => b.onclick = () => { this._tab = b.dataset.tab; this._render(); });

    // Setup connect
    const ca = $('#ca'); if (ca) ca.onclick = () => { const i = $('#ai'); if (i) this._connect(i.value); };
    const cs = $('#cs'); if (cs) cs.onclick = () => { const i = $('#si'); if (i) this._connectSheets(i.value); };

    // Disconnect
    const d = $('[data-a="disc"]'); if (d) d.onclick = () => this._disc();

    // Quiz
    const qs = $('#qs'); if (qs) qs.onclick = () => { const i = $('#qn'); if (i) this._start(i.value); };
    const qn = $('#qn'); if (qn) qn.onkeydown = e => { if (e.key==='Enter') this._start(qn.value); };
    $$('.qab:not([disabled])').forEach(b => b.onclick = () => this._select(parseInt(b.dataset.choice)));
    const qr = $('#qr'); if (qr) qr.onclick = () => this._restart();

    // Simulate
    $$('[data-sim]').forEach(b => b.onclick = () => this._sim(b.dataset.sim));
    const cl = $('#cl'); if (cl) cl.onclick = () => this._clearLogs();

    // Editor add
    const aq = $('#aq'); if (aq) aq.onclick = () => this._addQ();
    const sv = $('#sv'); if (sv) sv.onclick = () => this._saveQ();
    const cx = $('#cx'); if (cx) cx.onclick = () => { this._editIdx=-1; this._edit={q:'',c0:'',c1:'',c2:'',c3:'',correct:'0'}; this._render(); };
    $$('[data-edit]').forEach(b => b.onclick = () => this._editQ(parseInt(b.dataset.edit)));
    $$('[data-del]').forEach(b => b.onclick = () => this._delQ(parseInt(b.dataset.del)));

    // Editor inputs
    $$('[data-ed]').forEach(el => el.oninput = e => {
      const k = e.target.dataset.ed;
      this._edit[k==='correct'?'correct':k] = e.target.type==='radio'?e.target.value:e.target.value;
    });

    // Settings
    $$('.sin[data-type="th"]').forEach(el => el.onchange = e => this._updThreshold(e.target.dataset.key, e.target.value));
    $$('.sin[data-type="gr"]').forEach(el => el.onchange = e => this._updGrade(e.target.dataset.key, e.target.value));
  }

  // ==========================================
  // CSS
  // ==========================================
  static CSS = `
    :host { display:block; font-family:'Roboto','Segoe UI',sans-serif; color:#1c1b1f; max-width:960px; margin:0 auto; }
    * { box-sizing:border-box; margin:0; padding:0; }

    .hd { background:linear-gradient(135deg,#6750a4,#9c7cf4); color:white; border-radius:16px; padding:20px 24px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .hd h1 { font-size:22px; margin-bottom:4px; }
    .hd p { font-size:13px; opacity:0.9; }
    .hdr { display:flex; gap:8px; align-items:center; }

    .b { display:inline-block; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:500; }
    .b.g { background:#d1fae5; color:#065f46; }
    .b.o { background:#fef3c7; color:#92400e; }

    .tb { display:flex; border-bottom:2px solid #e0e0e0; margin-bottom:20px; overflow-x:auto; }
    .tbb { padding:10px 18px; background:none; border:none; border-bottom:3px solid transparent; margin-bottom:-2px; cursor:pointer; font-size:13px; font-weight:500; color:#666; white-space:nowrap; transition:all .2s; }
    .tbb:hover { color:#6750a4; background:#f3f0fa; }
    .tbb.a { color:#6750a4; border-bottom-color:#6750a4; }

    .c { background:white; border-radius:14px; padding:22px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,.06); border:1px solid #e8e3f5; }
    .c h2 { color:#6750a4; font-size:18px; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
    .c h3 { color:#49454f; font-size:15px; margin-bottom:10px; }

    .b { display:inline-block; padding:10px 20px; border:none; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; }
    .b.p { background:#6750a4; color:white; }
    .b.p:hover { background:#7c6bb5; }
    .b.s { background:transparent; color:#6750a4; border:1px solid #6750a4; }
    .b.s:hover { background:#f3f0fa; }
    .b.fw { width:100%; text-align:center; }

    .bs { padding:5px 10px; border:1px solid #e0e0e0; border-radius:6px; background:white; font-size:12px; cursor:pointer; transition:all .2s; }
    .bs:hover { background:#f3f0fa; }
    .bs.dg { color:#ba1a1a; border-color:#ffcdd2; }
    .bs.dg:hover { background:#ffebee; }

    /* Setup */
    .sc { max-width:600px; margin:20px auto; text-align:center; }
    .so { background:#fcfbfe; border-radius:10px; padding:18px; margin-bottom:16px; text-align:left; }
    .so h3 { font-size:14px; color:#6750a4; margin-bottom:6px; }
    .so p { font-size:12px; color:#666; margin-bottom:10px; }
    .ir { display:flex; gap:8px; }
    .ir input { flex:1; padding:10px 12px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; }
    .ir input:focus { outline:none; border-color:#6750a4; box-shadow:0 0 0 2px rgba(103,80,164,.2); }
    .dv { height:1px; background:#e0e0e0; margin:16px 0; }
    .sb { text-align:center; border:2px dashed #c7b3fc; background:#fef7ff; }
    .sb h3 { color:#6750a4; }

    /* Quiz */
    .qc { max-width:560px; margin:0 auto; }
    .qi { margin-bottom:16px; }
    .qi input { width:100%; padding:12px 16px; border:2px solid #e0e0e0; border-radius:10px; font-size:16px; font-family:inherit; }
    .qi input:focus { outline:none; border-color:#6750a4; }
    .qh { display:flex; justify-content:space-between; font-weight:600; color:#6750a4; margin-bottom:20px; }
    .qq { font-size:18px; font-weight:600; margin-bottom:20px; line-height:1.5; }
    .qa { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
    .qab { padding:14px 16px; background:white; border:2px solid #e0e0e0; border-radius:10px; font-size:14px; cursor:pointer; transition:all .2s; text-align:left; font-family:inherit; }
    .qab:hover:not(:disabled) { border-color:#6750a4; background:#f3f0fa; }
    .qab:disabled { cursor:not-allowed; opacity:.7; }
    .qab.cc { border-color:#10b981; background:#d1fae5; color:#065f46; }
    .qab.cw { border-color:#ef4444; background:#fee2e2; color:#991b1b; }
    .qf { padding:14px; border-radius:10px; text-align:center; font-weight:600; }
    .qf.p { background:#d1fae5; color:#065f46; }
    .qf.n { background:#fee2e2; color:#991b1b; }

    /* Result */
    .rc { text-align:center; }
    .ri { font-size:16px; margin-bottom:8px; color:#49454f; }
    .rp { font-size:48px; font-weight:700; color:#6750a4; margin:16px 0; }
    .rm { font-size:18px; color:#6750a4; margin-bottom:20px; }

    /* Attendance */
    .g2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:20px; margin-bottom:20px; }
    .gw { position:relative; width:140px; height:140px; margin:0 auto; }
    .gv { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:26px; font-weight:700; }
    .cll { display:flex; flex-direction:column; gap:10px; }
    .cri { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#fcfbfe; border-radius:8px; }
    .crl { display:flex; align-items:center; gap:10px; }
    .cric { font-size:20px; }
    .crn { font-weight:500; font-size:13px; }
    .crp { font-size:11px; color:#666; }
    .smb { display:flex; align-items:center; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
    .sl { font-size:12px; color:#666; font-weight:500; }
    .sm2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
    .sm { background:#fbf9ff; border-radius:8px; padding:12px; text-align:center; }
    .sml { font-size:11px; color:#666; }
    .smv { font-size:20px; font-weight:700; color:#6750a4; margin-top:4px; }

    .hmh { display:flex; justify-content:center; gap:5px; margin-bottom:6px; font-size:10px; color:#666; font-weight:600; }
    .hmh span { width:28px; text-align:center; }
    .hmg { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; max-width:280px; margin:0 auto; }
    .hc { aspect-ratio:1; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; cursor:default; color:#9c99a6; background:#f3f0fa; transition:transform .15s; }
    .hc:hover { transform:scale(1.2); }
    .hc.l1 { background:#e3d9fc; color:#6750a4; }
    .hc.l2 { background:#c7b3fc; color:white; }
    .hc.l3 { background:#9d7bfc; color:white; }
    .hc.l4 { background:#6750a4; color:white; }
    .hml { display:flex; justify-content:center; align-items:center; gap:4px; margin-top:10px; font-size:10px; color:#666; }
    .lb { width:12px; height:12px; border-radius:2px; }

    .li { display:flex; gap:8px; align-items:flex-start; padding:6px 8px; border-radius:4px; font-size:11px; border-left:3px solid #ccc; margin-bottom:4px; background:#f8f9fa; }
    .li.reading { border-left-color:#4f46e5; }
    .li.quiz { border-left-color:#ec4899; }
    .li.download { border-left-color:#10b981; }
    .li.discussion { border-left-color:#f59e0b; }
    .lt { color:#888; min-width:120px; }
    .ld { flex:1; }

    /* Grades */
    .gg { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px; margin-bottom:20px; }
    .gi { background:#fcfbfe; border:1px solid #f1eef8; border-radius:10px; padding:14px; text-align:center; }
    .gi.hl { background:#f3f0fa; border-color:#c7b3fc; }
    .gl { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }
    .gv { font-size:22px; font-weight:700; color:#1c1b1f; margin-top:4px; }
    .gv.br { color:#6750a4; }
    .gt { width:100%; border-collapse:collapse; font-size:13px; }
    .gt th { background:#f3f0fa; color:#6750a4; font-weight:600; padding:10px; text-align:left; }
    .gt td { padding:10px; border-bottom:1px solid #f0f0f0; }
    .bld { font-weight:600; }

    /* Editor */
    .ef { background:#fcfbfe; border-radius:10px; padding:16px; margin-bottom:16px; }
    .et { width:100%; min-height:70px; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:13px; font-family:inherit; resize:vertical; margin-bottom:12px; }
    .et:focus { outline:none; border-color:#6750a4; }
    .ecr { display:flex; gap:10px; align-items:center; margin-bottom:8px; }
    .ecr input[type="text"] { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:6px; font-size:13px; font-family:inherit; }
    .ecr input[type="text"]:focus { outline:none; border-color:#6750a4; }
    .rl { font-size:12px; color:#666; display:flex; align-items:center; gap:4px; cursor:pointer; }
    .ea { display:flex; gap:8px; margin-top:10px; }
    .qcrd { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#f8f9fa; border-radius:6px; margin-bottom:6px; }
    .qi2 { display:flex; align-items:center; gap:10px; flex:1; }
    .qn { font-weight:600; color:#6750a4; min-width:30px; }
    .qa2 { display:flex; gap:4px; }

    /* Settings */
    .sg { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; }
    .si { margin-bottom:8px; }
    .si label { display:block; font-size:12px; color:#666; font-weight:500; margin-bottom:4px; }
    .sin { width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-size:13px; font-family:inherit; }
    .sin:focus { outline:none; border-color:#6750a4; }

    /* Tips */
    .ti { padding:12px 16px; border-radius:8px; font-size:13px; margin:12px 0; background:#e3f2fd; border-left:4px solid #2196f3; color:#1565c0; }
    .ti.w { background:#fff3e0; border-left-color:#ff9800; color:#e65100; }

    /* Toast */
    .t { position:fixed; bottom:24px; right:24px; background:#323232; color:white; padding:12px 20px; border-radius:8px; font-size:14px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,.2); animation:si .3s ease; }
    @keyframes si { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    @media(max-width:600px){ .qa,.hmg{grid-template-columns:1fr} .ir{flex-direction:column} .g2{grid-template-columns:1fr} .gg{grid-template-columns:repeat(3,1fr)} .sg{grid-template-columns:1fr 1fr} }
  `;
}

customElements.define('full-quiz-dashboard', FullQuizDashboard);
