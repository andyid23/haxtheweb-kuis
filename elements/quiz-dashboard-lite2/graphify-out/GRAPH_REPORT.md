# Graph Report - .  (2026-07-25)

## Corpus Check
- Corpus is ~21,833 words - fits in a single context window. You may not need a graph.

## Summary
- 217 nodes · 303 edges · 11 communities (6 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Quiz Engine Core
- Activity Tracking System
- Build Toolchain
- Package Config
- Module Wiring
- User Authentication
- Activity Logger Logic
- Engagement Scoring
- External Dependencies
- Dev Server Config

## God Nodes (most connected - your core abstractions)
1. `ExplodeQuiz` - 46 edges
2. `ActivityLogger` - 17 edges
3. `TransparentGradebook` - 17 edges
4. `QuizUserAuth` - 16 edges
5. `EngagementScore` - 12 edges
6. `QuizDashboardLite2` - 12 edges
7. `AttendanceTracker` - 10 edges
8. `scripts` - 8 edges
9. `getThresholds()` - 7 edges
10. `getInitialLogs()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 5 thin omitted)

### Community 1 - "Activity Tracking System"
Cohesion: 0.09
Nodes (7): AttendanceTracker, DEFAULT_GRADES, DEFAULT_THRESHOLDS, getGradesConfig(), getInitialLogs(), getThresholds(), TransparentGradebook

### Community 2 - "Build Toolchain"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 3 - "Package Config"
Cohesion: 0.07
Nodes (26): author, name, customElements, description, hax, cli, license, main (+18 more)

### Community 4 - "Module Wiring"
Cohesion: 0.10
Nodes (6): DEFAULT_QUESTIONS, keywords, QuizDashboardLite2, haxtheweb, lit, webcomponents

### Community 8 - "External Dependencies"
Cohesion: 0.22
Nodes (9): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, lit, dependencies, canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager (+1 more)

## Knowledge Gaps
- **47 isolated node(s):** `DEFAULT_THRESHOLDS`, `DEFAULT_GRADES`, `DEFAULT_QUESTIONS`, `name`, `version` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lit` connect `Module Wiring` to `Activity Tracking System`?**
  _High betweenness centrality (0.542) - this node is a cross-community bridge._
- **Why does `keywords` connect `Module Wiring` to `Package Config`?**
  _High betweenness centrality (0.440) - this node is a cross-community bridge._
- **Why does `ExplodeQuiz` connect `Quiz Engine Core` to `Module Wiring`?**
  _High betweenness centrality (0.365) - this node is a cross-community bridge._
- **What connects `DEFAULT_THRESHOLDS`, `DEFAULT_GRADES`, `DEFAULT_QUESTIONS` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Quiz Engine Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08115942028985507 - nodes in this community are weakly interconnected._
- **Should `Activity Tracking System` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `Build Toolchain` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._