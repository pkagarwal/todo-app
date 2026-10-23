<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { auth } from "../auth";

const route = useRoute();
const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref(null);

async function handleSubmit() {
  try {
    await auth.login(username.value, password.value);
    router.push(route.query.next || "/");
  } catch {
    error.value = "Invalid username or password.";
  }
}
</script>

<template>
  <header class="page-header">
    <h1>Log In</h1>
  </header>

  <form class="edit-form" @submit.prevent="handleSubmit">
    <p v-if="error" class="stats">{{ error }}</p>
    <label>
      Username
      <input type="text" name="username" v-model="username" required autofocus>
    </label>
    <label>
      Password
      <input type="password" name="password" v-model="password" required>
    </label>
    <div class="edit-actions">
      <button type="submit">Log In</button>
    </div>
  </form>
</template>
