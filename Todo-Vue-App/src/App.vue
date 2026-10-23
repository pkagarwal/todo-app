<script setup>
import { useRouter } from "vue-router";
import { auth } from "./auth";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const d = new Date();
const todayDisplay = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

const router = useRouter();
async function handleLogout() {
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <header class="topbar">
    <RouterLink class="brand" to="/">
      <span class="brand-mark">&#10003;</span>
      <span class="brand-name">Tasklist</span>
    </RouterLink>
    <span class="topbar-date">{{ todayDisplay }}</span>
    <form v-if="auth.loggedIn" class="logout-form" @submit.prevent="handleLogout">
      <button type="submit" class="link-btn">Log out</button>
    </form>
  </header>
  <div class="wrap">
    <RouterView />
  </div>
</template>
