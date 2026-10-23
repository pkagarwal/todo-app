<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";

const PRIORITIES = ["low", "medium", "high"];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const route = useRoute();
const router = useRouter();
const form = ref(null);

onMounted(async () => {
  try {
    const task = await api.getTask(route.params.id);
    form.value = { title: task.title, notes: task.notes, priority: task.priority, due_date: task.due_date || "" };
  } catch {
    router.replace("/");
  }
});

async function handleSubmit() {
  await api.updateTask(route.params.id, form.value);
  router.push("/");
}
</script>

<template>
  <template v-if="form">
    <header>
      <h1>Edit Task</h1>
    </header>

    <form class="edit-form" @submit.prevent="handleSubmit">
      <label>
        Title
        <input type="text" name="title" v-model="form.title" required>
      </label>
      <label>
        Notes
        <textarea name="notes" rows="3" v-model="form.notes"></textarea>
      </label>
      <label>
        Priority
        <select name="priority" v-model="form.priority">
          <option v-for="p in PRIORITIES" :key="p" :value="p">{{ capitalize(p) }}</option>
        </select>
      </label>
      <label>
        Due date
        <input type="date" name="due_date" v-model="form.due_date">
      </label>
      <div class="edit-actions">
        <button type="submit">Save</button>
        <RouterLink to="/" class="cancel-link">Cancel</RouterLink>
      </div>
    </form>
  </template>
</template>
