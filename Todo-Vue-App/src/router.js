import { createRouter, createWebHistory } from "vue-router";
import { auth } from "./auth";
import LoginPage from "./pages/LoginPage.vue";
import TaskListPage from "./pages/TaskListPage.vue";
import EditTaskPage from "./pages/EditTaskPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage, meta: { title: "Log In" } },
    { path: "/", component: TaskListPage, meta: { title: "My To-Do List", requiresLogin: true } },
    { path: "/edit/:id", component: EditTaskPage, meta: { title: "Edit Task", requiresLogin: true } },
  ],
});

router.beforeEach(async (to) => {
  if (auth.loggedIn === null) await auth.check();
  if (to.meta.requiresLogin && !auth.loggedIn) {
    return { path: "/login", query: { next: to.fullPath } };
  }
});

router.afterEach((to) => {
  document.title = to.meta.title || "To-Do";
});

export default router;
