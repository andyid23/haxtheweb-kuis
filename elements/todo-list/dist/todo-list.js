import { DDDSuper } from '@haxtheweb/d-d-d/d-d-d.js';
import { LitElement, css, html } from 'lit';
import { I18NMixin } from '@haxtheweb/i18n-manager/lib/I18NMixin.js';

class TodoList extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "todo-list";
  }

  static get properties() {
    return {
      ...super.properties,
      tasks: {
        type: Array,
        attribute: "tasks",
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
                Array.isArray(parsed.tasks)
              ) {
                return parsed.tasks;
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
      editable: { type: Boolean, attribute: true, reflect: true },
      editing: { type: Boolean, attribute: true, reflect: true },
      _validationError: { type: String },
      _screen: { state: true },
      _tempTasks: { state: true },
      _editingIndex: { state: true },
      _tempTaskText: { state: true },
      _editorOrigin: { state: true },
    };
  }

  constructor() {
    super();
    this.tasks = [];
    this.editable = false;
    this.editing = false;
    this._validationError = "";
    this._screen = "list";
    this._tempTasks = [];
    this._editingIndex = -1;
    this._tempTaskText = "";
    this._editorOrigin = "list";
    this.t = {
      addTask: "Add Task",
      inputPlaceholder: "Enter a new task...",
      deleteTask: "Delete task",
      emptyMessage: "No tasks yet. Add one above!",
      taskCompleted: "Mark as incomplete",
      taskIncomplete: "Mark as complete",
      validationErrorMinLength: "Task must be at least 3 characters",
      validationErrorMaxLength: "Task must be no more than 50 characters",
      editTitle: "Edit Task List",
      closeEditor: "Close Editor",
      addTaskBtnEditor: "Add Task",
      editTaskBtn: "Edit",
      saveEditBtn: "Save",
      cancelEditBtn: "Cancel",
      saveAllBtn: "Save & Exit",
      cancelAllBtn: "Cancel",
      emptyTaskError: "Task cannot be empty",
      ariaEditTitle: "Task list editor panel",
      ariaOpenEditor: "Open task list editor",
      ariaCloseEditor: "Close task list editor",
      ariaTaskInputEditor: "Editor task input",
      ariaTasksListEditor: "Editable task list",
      ariaEditTask: "Edit this task",
      ariaDeleteTask: "Delete this task",
      ariaSaveAll: "Save all task changes",
      ariaCancelAll: "Cancel all task changes",
    };
  }

  updated(changedProperties) {
    if (super.updated) {
      super.updated(changedProperties);
    }
    if (!Array.isArray(this.tasks)) {
      this.tasks = [];
    }
  }

  get _inHaxEditor() {
    return !!(
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function" &&
      globalThis.HaxStore.requestAvailability().editMode
    );
  }

  static get styles() {
    return [
      super.styles,
      css`
        /* ── Polaris Theme: host container ───────────────────────────────── */
        :host {
          display: block;
          font-family: var(--ddd-font-primary);
          padding: var(--ddd-spacing-8);
          background: var(
            --ddd-theme-polaris-background,
            var(--ddd-theme-background)
          );
          color: var(--ddd-theme-polaris-text, var(--ddd-theme-primary));
          max-width: 640px;
          border-radius: var(--ddd-radius-lg);
          box-shadow: 0 var(--ddd-spacing-1) var(--ddd-spacing-5)
            rgba(0, 0, 0, 0.08);
        }

        /* ── Polaris heading ─────────────────────────────────────────────── */
        .todo-heading {
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-xl);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-polaris-primary, var(--ddd-theme-primary));
          margin: 0 0 var(--ddd-spacing-6) 0;
          letter-spacing: -0.01em;
        }

        /* ── Input area ──────────────────────────────────────────────────── */
        .input-area {
          display: flex;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-3);
        }

        .task-input {
          flex: 1;
          padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-s);
          border: 1.5px solid
            var(--ddd-theme-polaris-border, var(--ddd-theme-accent));
          border-radius: var(--ddd-radius-md);
          background: var(
            --ddd-theme-polaris-surface,
            var(--ddd-theme-background)
          );
          color: var(--ddd-theme-polaris-text, var(--ddd-theme-primary));
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .task-input:focus {
          border-color: var(--ddd-theme-polaris-accent, var(--ddd-theme-link));
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        /* ── Polaris pill-style Add button ───────────────────────────────── */
        .add-button {
          padding: var(--ddd-spacing-4) var(--ddd-spacing-7);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          background: var(--ddd-theme-polaris-primary, var(--ddd-theme-accent));
          color: var(
            --ddd-theme-polaris-primary-text,
            var(--ddd-theme-background)
          );
          border: none;
          border-radius: var(--ddd-radius-xl);
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            box-shadow 0.15s ease;
          box-shadow: 0 var(--ddd-spacing-1) var(--ddd-spacing-3)
            rgba(0, 0, 0, 0.12);
        }

        .add-button:hover {
          background: var(
            --ddd-theme-polaris-primary-hover,
            var(--ddd-theme-link)
          );
          box-shadow: 0 var(--ddd-spacing-1) var(--ddd-spacing-4)
            rgba(0, 0, 0, 0.18);
        }

        .add-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        /* ── Task list ───────────────────────────────────────────────────── */
        .task-list {
          list-style: none;
          padding: var(--ddd-spacing-0, 0);
          margin: var(--ddd-spacing-4) 0 0 0;
        }

        /* ── Polaris card-style task item ────────────────────────────────── */
        .task-item {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-4);
          padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-3);
          background: var(
            --ddd-theme-polaris-surface,
            var(--ddd-theme-background-secondary)
          );
          border-radius: var(--ddd-radius-lg);
          border-left: var(--ddd-spacing-1) solid
            var(--ddd-theme-polaris-accent, var(--ddd-theme-accent));
          box-shadow: 0 1px var(--ddd-spacing-3) rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.15s ease;
        }

        .task-item:hover {
          box-shadow: 0 var(--ddd-spacing-1) var(--ddd-spacing-5)
            rgba(0, 0, 0, 0.1);
        }

        /* ── Checkbox ────────────────────────────────────────────────────── */
        .task-checkbox {
          width: var(--ddd-spacing-5);
          height: var(--ddd-spacing-5);
          cursor: pointer;
          accent-color: var(
            --ddd-theme-polaris-primary,
            var(--ddd-theme-accent)
          );
          flex-shrink: 0;
        }

        .task-checkbox:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            var(--ddd-theme-polaris-focus-ring, var(--ddd-theme-link-light));
        }

        /* ── Task text ───────────────────────────────────────────────────── */
        .task-text {
          flex: 1;
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-polaris-text, var(--ddd-theme-primary));
          line-height: 1.5;
        }

        .task-text.completed {
          text-decoration: line-through;
          color: var(--ddd-theme-disabled);
          opacity: var(--ddd-opacity-50);
        }

        /* ── Polaris rounded-rectangle Delete button ─────────────────────── */
        .delete-button {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-xs);
          font-weight: var(--ddd-font-weight-bold);
          background: transparent;
          color: var(--ddd-theme-error);
          border: 1.5px solid var(--ddd-theme-error);
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          flex-shrink: 0;
          transition:
            background 0.15s ease,
            color 0.15s ease;
        }

        .delete-button:hover {
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-polaris-surface, var(--ddd-theme-background));
        }

        .delete-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px
            rgba(var(--ddd-theme-error-rgb, 220, 38, 38), 0.25);
        }

        /* ── Polaris empty state ─────────────────────────────────────────── */
        .empty-message {
          text-align: center;
          padding: var(--ddd-spacing-10) var(--ddd-spacing-8);
          color: var(--ddd-theme-disabled);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-m);
          font-style: italic;
          background: var(
            --ddd-theme-polaris-surface,
            var(--ddd-theme-background-secondary)
          );
          border-radius: var(--ddd-radius-lg);
          border: 1.5px dashed
            var(--ddd-theme-polaris-border, var(--ddd-theme-accent));
          margin-top: var(--ddd-spacing-4);
        }

        /* ── Validation error ────────────────────────────────────────────── */
        .validation-error {
          color: var(--ddd-theme-error);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-xs);
          margin: var(--ddd-spacing-0, 0);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-1);
        }
      `,
    ];
  }

  render() {
    if (this._screen === "editor") {
      return this._renderEditorScreen();
    }
    return html`
      <div class="input-area">
        <input
          id="task-input"
          class="task-input"
          type="text"
          placeholder="${this.t.inputPlaceholder}"
          aria-label="${this.t.addTask}"
          aria-describedby="task-input-error"
          @keydown="${this._handleInputKeydown}"
          @input="${this._handleInputChange}"
        />
        <button
          class="add-button"
          aria-label="${this.t.addTask}"
          @click="${this._handleAddClick}"
          ?hidden="${this._inHaxEditor}"
        >
          ${this.t.addTask}
        </button>
      </div>

      ${this._validationError
        ? html`<p id="task-input-error" role="alert" class="validation-error">
            ${this._validationError}
          </p>`
        : ""}
      ${this.tasks.length === 0
        ? html`<p class="empty-message">${this.t.emptyMessage}</p>`
        : html`
            <ul class="task-list" aria-label="Task list">
              ${this.tasks.map((task) => this._renderTask(task))}
            </ul>
          `}

      <button
        class="edit-questions-btn"
        @click="${this._openEditor}"
        aria-label="${this.t.ariaOpenEditor}"
        ?hidden="${!this._inHaxEditor}"
      >
        ${this.t.editTitle}
      </button>
    `;
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
        <div class="add-question-form">
          <div class="input-area">
            <input
              class="task-input"
              type="text"
              .value="${this._tempTaskText}"
              @input="${(e) => (this._tempTaskText = e.target.value)}"
              placeholder="${this.t.inputPlaceholder}"
              aria-label="${this.t.ariaTaskInputEditor}"
            />
            <button
              class="add-button"
              @click="${this._addTaskEditor}"
              aria-label="${this.t.addTaskBtnEditor}"
            >
              ${this.t.addTaskBtnEditor}
            </button>
          </div>
        </div>

        <div class="questions-list" aria-label="${this.t.ariaTasksListEditor}">
          ${this._tempTasks.map(
            (task, index) => html`
              <div class="question-card">
                ${this._editingIndex === index
                  ? html`
                      <div class="edit-form">
                        <input
                          class="edit-choice-input"
                          type="text"
                          .value="${this._tempTaskText}"
                          @input="${(e) =>
                            (this._tempTaskText = e.target.value)}"
                          aria-label="${this.t.ariaTaskInputEditor}"
                        />
                        <div class="edit-form-actions">
                          <button
                            class="save-edit-btn"
                            @click="${this._saveEditTask}"
                          >
                            ${this.t.saveEditBtn}
                          </button>
                          <button
                            class="cancel-edit-btn"
                            @click="${this._cancelEditTask}"
                          >
                            ${this.t.cancelEditBtn}
                          </button>
                        </div>
                      </div>
                    `
                  : html`
                      <div class="card-header">
                        <span
                          class="question-preview ${task.completed
                            ? "completed"
                            : ""}"
                        >
                          ${task.text}
                        </span>
                        <div class="card-actions">
                          <input
                            type="checkbox"
                            class="task-checkbox"
                            .checked="${task.completed}"
                            @change="${(e) =>
                              this._toggleCompleteEditor(
                                index,
                                e.target.checked,
                              )}"
                            aria-label="${task.completed
                              ? this.t.taskCompleted
                              : this.t.taskIncomplete}"
                          />
                          <button
                            class="edit-btn"
                            @click="${() => this._startEditTask(index)}"
                            aria-label="${this.t.ariaEditTask}"
                          >
                            ${this.t.editTaskBtn}
                          </button>
                          <button
                            class="delete-btn"
                            @click="${() => this._deleteTaskEditor(index)}"
                            aria-label="${this.t.ariaDeleteTask}"
                          >
                            ${this.t.deleteTask}
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

  _renderTask(task) {
    return html`
      <li class="task-item" data-id="${task.id}">
        <input
          type="checkbox"
          class="task-checkbox"
          .checked="${task.completed}"
          aria-label="${task.completed
            ? this.t.taskCompleted
            : this.t.taskIncomplete}"
          aria-checked="${task.completed}"
          @change="${(e) =>
            this._handleToggleComplete(task.id, e.target.checked)}"
        />
        <span class="task-text ${task.completed ? "completed" : ""}"
          >${task.text}</span
        >
        <button
          class="delete-button"
          aria-label="${this.t.deleteTask}: ${task.text}"
          @click="${() => this._handleDelete(task.id)}"
          ?hidden="${this._inHaxEditor}"
        >
          ${this.t.deleteTask}
        </button>
      </li>
    `;
  }

  _handleInputKeydown(e) {
    if (e.key === "Enter") {
      this._addTask();
    }
  }

  _handleAddClick() {
    this._addTask();
  }

  _handleInputChange(e) {
    if (e.target.value.trim().length === 0) {
      this._validationError = "";
    }
  }

  _handleDelete(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  _handleToggleComplete(id, checked) {
    this.tasks = this.tasks.map((task) =>
      task.id === id ? { ...task, completed: checked } : task,
    );
  }

  _addTask() {
    const input = this.shadowRoot.querySelector("#task-input");
    const text = input.value.trim();

    // Empty/whitespace check — clear error and return
    if (!text) {
      this._validationError = "";
      return;
    }

    // Min length check
    if (text.length < 3) {
      this._validationError = this.t.validationErrorMinLength;
      return;
    }

    // Max length check
    if (text.length > 50) {
      this._validationError = this.t.validationErrorMaxLength;
      return;
    }

    // Valid — clear error and add task
    this._validationError = "";
    const newTask = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now(),
      text,
      completed: false,
    };
    this.tasks = [...this.tasks, newTask];
    input.value = "";
    input.focus();
  }

  _openEditor() {
    if (this._screen !== "list") return;
    if (this.editing) return;
    this.editing = true;
    this._editingIndex = -1;
    this._tempTaskText = "";
    this._tempTasks = JSON.parse(JSON.stringify(this.tasks || []));
    this._editorOrigin = "list";
    this._screen = "editor";
  }

  _addTaskEditor() {
    const text = (this._tempTaskText || "").trim();
    if (!text) return;
    if (text.length < 3) {
      this._validationError = this.t.validationErrorMinLength;
      return;
    }
    if (text.length > 50) {
      this._validationError = this.t.validationErrorMaxLength;
      return;
    }
    this._validationError = "";
    this._tempTasks = [
      ...this._tempTasks,
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now(),
        text,
        completed: false,
      },
    ];
    this._tempTaskText = "";
  }

  _deleteTaskEditor(index) {
    this._tempTasks = this._tempTasks.filter((_, i) => i !== index);
    if (this._editingIndex === index) {
      this._editingIndex = -1;
      this._tempTaskText = "";
    } else if (this._editingIndex > index) {
      this._editingIndex = this._editingIndex - 1;
    }
  }

  _toggleCompleteEditor(index, checked) {
    this._tempTasks = this._tempTasks.map((task, i) =>
      i === index ? { ...task, completed: checked } : task,
    );
  }

  _startEditTask(index) {
    this._editingIndex = index;
    this._tempTaskText = this._tempTasks[index]?.text || "";
  }

  _saveEditTask() {
    const text = (this._tempTaskText || "").trim();
    if (!text) {
      this._validationError = this.t.emptyTaskError;
      return;
    }
    if (text.length < 3) {
      this._validationError = this.t.validationErrorMinLength;
      return;
    }
    if (text.length > 50) {
      this._validationError = this.t.validationErrorMaxLength;
      return;
    }
    if (this._editingIndex < 0 || this._editingIndex >= this._tempTasks.length)
      return;

    this._validationError = "";
    this._tempTasks = this._tempTasks.map((task, i) =>
      i === this._editingIndex ? { ...task, text } : task,
    );
    this._editingIndex = -1;
    this._tempTaskText = "";
  }

  _cancelEditTask() {
    this._editingIndex = -1;
    this._tempTaskText = "";
  }

  _saveAll() {
    if (this._screen !== "editor") return;
    this.tasks = JSON.parse(JSON.stringify(this._tempTasks || []));
    this.editing = false;
    this._editingIndex = -1;
    this._tempTaskText = "";
    this._screen = this._editorOrigin || "list";
    this._editorOrigin = "list";
  }

  _cancelAll() {
    if (this._screen !== "editor") return;
    this.editing = false;
    this._editingIndex = -1;
    this._tempTaskText = "";
    this._screen = this._editorOrigin || "list";
    this._editorOrigin = "list";
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: false,
      canEditSource: false,
      gizmo: {
        title: "Todo List",
        description: "A simple task management web component",
        icon: "icons:assignment",
        color: "blue",
        tags: ["Productivity", "Content"],
      },
      settings: {
        configure: [],
        advanced: [],
        developer: [],
      },
      saveOptions: {
        unsetAttributes: [
          "_validationError",
          "_screen",
          "_tempTasks",
          "_editingIndex",
          "_tempTaskText",
          "_editorOrigin",
          "editing",
          "editable",
        ],
      },
    };
  }
}

globalThis.customElements.define(TodoList.tag, TodoList);
//# sourceMappingURL=todo-list.js.map
