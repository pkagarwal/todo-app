<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";

const PRIORITIES = ["low", "medium", "high"];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const todayIso = new Date().toISOString().slice(0, 10);

const route = useRoute();
const router = useRouter();
const status = computed(() => route.query.status ?? "all");
const priority = computed(() => route.query.priority ?? "all");

const tasks = ref([]);
const total = ref(0);
const done = ref(0);
const emptyForm = () => ({ title: "", notes: "", priority: "medium", due_date: "" });
const form = ref(emptyForm());

async function load() {
  const data = await api.listTasks(new URLSearchParams({ status: status.value, priority: priority.value }));
  tasks.value = data.tasks;
  total.value = data.total;
  done.value = data.done;
}

watch([status, priority], load, { immediate: true });

const filterLink = (overrides) => ({
  path: "/",
  query: { status: status.value, priority: priority.value, ...overrides },
});

async function handleAdd() {
  await api.addTask(form.value);
  form.value = emptyForm();
  await router.push("/");
  load();
}

async function handleToggle(id) {
  await api.toggleTask(id);
  load();
}

async function handleDelete(id) {
  if (!window.confirm("Delete this task?")) return;
  await api.deleteTask(id);
  load();
}

async function handleClearDone() {
  await api.clearDone();
  await router.push("/");
  load();
}
</script>

<template>
  <header class="page-header">
    <h1>To-Do List</h1>
    <div v-if="total > 0" class="progress">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: Math.round((done / total) * 100) + '%' }"></div>
      </div>
      <p class="stats">{{ done }} of {{ total }} tasks done</p>
    </div>
    <p v-else class="stats">Nothing on your list yet</p>
  </header>

  <form class="add-form" @submit.prevent="handleAdd">
    <input type="text" name="title" placeholder="What needs doing?" required autofocus v-model="form.title">
    <div class="add-form-row">
      <input type="text" name="notes" placeholder="Notes (optional)" v-model="form.notes">
      <select name="priority" v-model="form.priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <input type="date" name="due_date" :min="todayIso" v-model="form.due_date">
      <button type="submit">Add</button>
    </div>
  </form>

  <nav class="filters">
    <div class="filter-group">
      <RouterLink :class="{ active: status === 'all' }" :to="filterLink({ status: 'all' })">All</RouterLink>
      <RouterLink :class="{ active: status === 'active' }" :to="filterLink({ status: 'active' })">Active</RouterLink>
      <RouterLink :class="{ active: status === 'done' }" :to="filterLink({ status: 'done' })">Done</RouterLink>
    </div>
    <div class="filter-group">
      <RouterLink :class="{ active: priority === 'all' }" :to="filterLink({ priority: 'all' })">Any priority</RouterLink>
      <RouterLink v-for="p in PRIORITIES" :key="p" :class="{ active: priority === p }" :to="filterLink({ priority: p })">
        {{ capitalize(p) }}
      </RouterLink>
    </div>
  </nav>

  <ul class="task-list">
    <li v-if="tasks.length === 0" class="empty">Nothing here. Add a task above.</li>
    <li v-for="task in tasks" :key="task.id" :class="['task', `priority-${task.priority}`, { done: task.done }]">
      <form class="toggle-form" @submit.prevent="handleToggle(task.id)">
        <button type="submit" class="checkbox" aria-label="Toggle done">{{ task.done ? "✓" : "" }}</button>
      </form>
      <div class="task-body">
        <div class="task-title">{{ task.title }}</div>
        <div v-if="task.notes" class="task-notes">{{ task.notes }}</div>
        <div class="task-meta">
          <span :class="['badge', `badge-${task.priority}`]">{{ task.priority }}</span>
          <span v-if="task.due_date" class="due">Due {{ task.due_date }}</span>
        </div>
      </div>
      <div class="task-actions">
        <RouterLink :to="`/edit/${task.id}`">Edit</RouterLink>
        <form @submit.prevent="handleDelete(task.id)">
          <button type="submit" class="link-btn">Delete</button>
        </form>
      </div>
    </li>
  </ul>

  <form v-if="done > 0" class="clear-form" @submit.prevent="handleClearDone">
    <button type="submit" class="link-btn">Clear completed</button>
  </form>
</template>
