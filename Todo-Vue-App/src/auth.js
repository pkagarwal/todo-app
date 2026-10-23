import { reactive } from "vue";
import { api } from "./api";

export const auth = reactive({
  loggedIn: null, // null = unknown
  async check() {
    try {
      this.loggedIn = (await api.session()).logged_in;
    } catch {
      this.loggedIn = false;
    }
  },
  async login(username, password) {
    await api.login(username, password);
    this.loggedIn = true;
  },
  async logout() {
    await api.logout();
    this.loggedIn = false;
  },
});
