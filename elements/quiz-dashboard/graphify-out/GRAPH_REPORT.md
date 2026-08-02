# Graph Report - .  (2026-08-02)

## Corpus Check
- 64 files · ~50,349 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 496 nodes · 791 edges · 20 communities (9 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Assignment & Attendance
- Quiz Engine (ExplodeQuiz)
- AKM Demos & Sheets Flow
- Package Dependencies
- Tutorials & Grading Docs
- Build Tooling
- Lecturer Console & Criteria
- Forum Thread Component
- Discussion Forum Component
- Assignment Component
- Activity Tracking
- Lecturer Console Logic
- Question Generator
- User Auth & Sessions
- Transparent Gradebook
- Dashboard Orchestrator
- CI/CD Workflows
- Dev Server Config

## God Nodes (most connected - your core abstractions)
1. `ExplodeQuiz` - 55 edges
2. `AssignmentForum` - 30 edges
3. `ForumComponent` - 27 edges
4. `ActivityLogger` - 23 edges
5. `AssignmentComponent` - 21 edges
6. `LecturerConsole` - 18 edges
7. `QuestionGenerator` - 18 edges
8. `QuizUserAuth` - 17 edges
9. `quiz-user-auth Web Component` - 16 edges
10. `Tutorial & Dokumentasi â€” main changelog (weights, multi-correct, AKM types, roster, assignment-forum)` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Dynamic Weight Auto-calc â€” totalWeight recomputed from weights (client & server)` --rationale_for--> `generateReport â€” dynamic-weight final score + grade into Akumulasi Nilai Rapor`  [INFERRED]
  demo/tutorial.html → lib/code.gs.md
- `Tutorial: Materi, Aktivitas, dan Kuis (deployment & data flow)` --references--> `code.gs.md â€” Quiz, Attendance & Auth Apps Script backend`  [EXTRACTED]
  demo/tutorial-materi.html → lib/code.gs.md
- `Activity Event Bus â€” a3-activity-logged + a3-force-reload + quiz-saved + storage events` --conceptually_related_to--> `saveAttendance â€” writes '<Pertemuan> - Aktivitas', anti-spam caps (15 reading / 50 total per day)`  [INFERRED]
  demo/tutorial-dosen-kriteria.html → lib/code.gs.md
- `Tutorial & Dokumentasi â€” main changelog (weights, multi-correct, AKM types, roster, assignment-forum)` --references--> `generateReport â€” dynamic-weight final score + grade into Akumulasi Nilai Rapor`  [EXTRACTED]
  demo/tutorial.html → lib/code.gs.md
- `Tutorial & Dokumentasi â€” main changelog (weights, multi-correct, AKM types, roster, assignment-forum)` --references--> `getStudentRoster â€” merges Users + Akumulasi Nilai Rapor + Aktivitas counts into roster`  [EXTRACTED]
  demo/tutorial.html → lib/code.gs.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AKM Five Question-Type Demos** — elements_quiz_dashboard_demo_akm_quiz, elements_quiz_dashboard_demo_soal_akm_lengkap, elements_quiz_dashboard_demo_ulangan_harian_campuran [INFERRED 0.85]
- **Assessment Demos Feeding Final Grade Weighting** — elements_quiz_dashboard_demo_uas, elements_quiz_dashboard_demo_uts, elements_quiz_dashboard_demo_ulangan_harian, elements_quiz_dashboard_demo_ulangan_harian2, elements_quiz_dashboard_demo_ulangan_harian3, elements_quiz_dashboard_demo_ulangan_harian4, elements_quiz_dashboard_demo_ulangan_harian_campuran, elements_quiz_dashboard_demo_uas_bobot_nilai [INFERRED 0.85]
- **Student Activity Event Pipeline to Google Sheets** — elements_quiz_dashboard_lib_quiz_user_auth_quiz_user_login, elements_quiz_dashboard_lib_assignment_forum_assignment_saved, elements_quiz_dashboard_lib_assignment_forum_discussion_saved, elements_quiz_dashboard_lib_explode_quiz_quiz_saved, elements_quiz_dashboard_lib_activity_logger_reading_saved, elements_quiz_dashboard_demo_integrasi_aktifitas_alur_data_gsheets [EXTRACTED 1.00]
- **AKM Question Type Family â€” PG / PG Kompleks / PGK / Menjodohkan / Isian Singkat across docs** — elements_quiz_dashboard_demo_tutor_tutor_soal_akm_lengkap_html_akm_question_types, elements_quiz_dashboard_demo_tutor_tutor_soal_akm_lengkap_html, elements_quiz_dashboard_demo_tutor_tutor_contoh_akm_quiz_html, elements_quiz_dashboard_demo_tutorial_html [INFERRED 0.85]
- **Cross-page Activity Logging Flow â€” local log + events drive attendance criteria** — elements_quiz_dashboard_demo_tutorial_dosen_kriteria_html_activity_event_bus, elements_quiz_dashboard_lib_explode_quiz_js_explodequiz, elements_quiz_dashboard_demo_tutorial_dosen_kriteria_html_attendance_criteria_checklist [INFERRED 0.75]
- **Lecturer Report Generation Pipeline â€” console triggers report/summary/roster/weights** — elements_quiz_dashboard_demo_tutorial_dosen_kriteria_html_lecturer_console_mode, elements_quiz_dashboard_lib_code_gs_md_generate_report, elements_quiz_dashboard_lib_code_gs_md_update_summary, elements_quiz_dashboard_lib_code_gs_md_get_student_roster, elements_quiz_dashboard_demo_tutorial_mode_dosen_html_grade_card_weights [INFERRED 0.75]

## Communities (20 total, 11 thin omitted)

### Community 0 - "Assignment & Attendance"
Cohesion: 0.05
Nodes (11): AttendanceTracker, EngagementScore, getInitialLogs(), getTodayString(), pushLocalLog(), DEFAULT_QUESTIONS, LITERASI_BANK, MIXED_MC_KOMPLEKS (+3 more)

### Community 2 - "AKM Demos & Sheets Flow"
Cohesion: 0.08
Nodes (52): AKM Quiz Standalone Template (akm-quiz.html), Five AKM Question Types Pattern, HAXcms HTML Source View Integration, hitungSkorAKM() client-side scoring, KUNCI hardcoded answer key, Demo: Mode Dosen (Lecturer), Integration Demo: Aktivitas + Tugas + Forum + Kuis, Data Flow Table to Google Sheets (+44 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (38): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, lit, author, name, customElements, dependencies (+30 more)

### Community 4 - "Tutorials & Grading Docs"
Cohesion: 0.07
Nodes (39): Tutor: Contoh Soal AKM Quiz â€” single-file vanilla HTML/CSS/JS template, hitungSkorAKM â€” vanilla client-side AKM scorer (hardcoded answer key), Tutor: Soal AKM Lengkap â€” explode-quiz demo of AKM types + editor + quiz-user-login wiring, AKM Question Types â€” PG, PG Kompleks, PGK Benar/Salah, Menjodohkan, Isian Singkat, Tutorial & Dokumentasi â€” main changelog (weights, multi-correct, AKM types, roster, assignment-forum), DEFAULT_GRADES 1:3:2:2 (total 8) â€” attendance/UH/UTS/UAS weights, Dynamic Weight Auto-calc â€” totalWeight recomputed from weights (client & server), Tutorial v3 â€” bug fixes (delete reply, vote button) + new properties (hide-delete, tab/gradebook visibility, show-after-*) (+31 more)

### Community 5 - "Build Tooling"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 6 - "Lecturer Console & Criteria"
Cohesion: 0.11
Nodes (32): Tutorial: Konsol Dosen & Kriteria Aktivitas, Activity Event Bus â€” a3-activity-logged + a3-force-reload + quiz-saved + storage events, Activity Heatmap â€” 1-month / 6-week GitHub-style heatmap (2-column grid, responsive), Daily Attendance Criteria Checklist â€” 5/6 criteria with thresholds (reading>=3, quiz>=1, assignment>=1, download>=1, forum>=1, total>=8), Lecturer Console Mode (view-mode='lecturer'), Tutorial: Materi, Aktivitas, dan Kuis (deployment & data flow), Tutorial Mode Dosen â€” single pertemuan-kuis sheet, tag/Kode Materi, grade card weights, Grade Card Weights â€” Nilai Akhir = Kehadiran 12.5% + UH 37.5% + UTS 25% + UAS 25% (+24 more)

### Community 16 - "CI/CD Workflows"
Cohesion: 0.67
Nodes (3): GitHub Actions â€” Build and Deploy to gh-pages (public folder), README â€” OpenWC + DDD + Lit web component package docs, .travis.yml â€” legacy Travis CI (npm test via xvfb)

## Knowledge Gaps
- **84 isolated node(s):** `DEFAULT_QUESTIONS`, `LITERASI_BANK`, `NUMERASI_BANK`, `MIXED_MC_KOMPLEKS`, `name` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lit` connect `Assignment & Attendance` to `Package Dependencies`?**
  _High betweenness centrality (0.295) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Dependencies` to `Assignment & Attendance`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `ExplodeQuiz` connect `Quiz Engine (ExplodeQuiz)` to `Assignment & Attendance`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `DEFAULT_QUESTIONS`, `LITERASI_BANK`, `NUMERASI_BANK` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Assignment & Attendance` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._
- **Should `Quiz Engine (ExplodeQuiz)` be split into smaller, more focused modules?**
  _Cohesion score 0.07811447811447811 - nodes in this community are weakly interconnected._
- **Should `AKM Demos & Sheets Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._