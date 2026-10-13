
const STORAGE_KEY = "taskflow-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const submitButton = document.querySelector("#submit-button");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const totalCount = document.querySelector("#total-count");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const remainingText = document.querySelector("#remaining-text");
const clearCompletedButton = document.querySelector("#clear-completed");
const statusMessage = document.querySelector("#status-message");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);

    if (!storedTasks) return [];

    const parsedTasks = JSON.parse(storedTasks);

    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showStatus("Could not save tasks in this browser.");
    return false;
  }
}

function showStatus(message) {
  statusMessage.textContent = message;
}

function getVisibleTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function updateSummary() {
  const completed = tasks.filter((task) => task.completed).length;
  const active = tasks.length - completed;

  totalCount.textContent = tasks.length;
  activeCount.textContent = active;
  completedCount.textContent = completed;
  remainingText.textContent =
    `${active} ${active === 1 ? "task" : "tasks"} remaining`;

  clearCompletedButton.disabled = completed === 0;
  clearCompletedButton.style.opacity = completed === 0 ? "0.5" : "1";
}

function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    item.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Complete task: ${task.text}`);
    checkbox.dataset.action = "toggle";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Edit";
    editButton.dataset.action = "edit";
    editButton.setAttribute("aria-label", `Edit task: ${task.text}`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.text}`);

    actions.append(editButton, deleteButton);
    item.append(checkbox, text, actions);
    taskList.append(item);
  });

  emptyState.hidden = visibleTasks.length > 0;
  emptyState.textContent =
    tasks.length === 0
      ? "No tasks here yet. Add your first task above!"
      : "No tasks match this filter.";

  updateSummary();

  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function resetEditor() {
  editingTaskId = null;
  taskInput.value = "";
  submitButton.textContent = "Add task";
  document.querySelector("#form-hint").textContent =
    "Press Enter or click Add task.";
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    showStatus("Please enter a task.");
    taskInput.focus();
    return;
  }

  if (editingTaskId !== null) {
    const task = tasks.find((item) => item.id === editingTaskId);

    if (task) {
      task.text = text;
      showStatus("Task updated.");
    }

    resetEditor();
  } else {
    tasks.unshift({
      id: createId(),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    });

    showStatus("Task added.");
  }

  saveTasks();
  renderTasks();
  taskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

// Event delegation handles actions for dynamically created tasks.
taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const item = button.closest(".task-item");
  if (!item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  const action = button.dataset.action;

  if (action === "edit") {
    editingTaskId = task.id;
    taskInput.value = task.text;
    submitButton.textContent = "Save changes";
    document.querySelector("#form-hint").textContent =
      "Edit the task above, then save your changes.";
    showStatus("Editing task.");
    taskInput.focus();
  }

  if (action === "delete") {
    tasks = tasks.filter((entry) => entry.id !== task.id);

    if (editingTaskId === task.id) {
      resetEditor();
    }

    saveTasks();
    renderTasks();
    showStatus("Task deleted.");
  }
});

taskList.addEventListener("change", (event) => {
  if (!event.target.matches('input[data-action="toggle"]')) return;

  const item = event.target.closest(".task-item");
  if (!item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  task.completed = event.target.checked;
  saveTasks();
  renderTasks();
  showStatus(task.completed ? "Task completed." : "Task marked active.");
});

clearCompletedButton.addEventListener("click", () => {
  const completed = tasks.filter((task) => task.completed).length;

  if (completed === 0) return;

  tasks = tasks.filter((task) => !task.completed);

  if (editingTaskId !== null && !tasks.some((task) => task.id === editingTaskId)) {
    resetEditor();
  }

  saveTasks();
  renderTasks();
  showStatus("Completed tasks cleared.");
});

renderTasks();
