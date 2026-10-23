import path from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { createApp } from "./app.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  secretKey = "dev-only-insecure-secret-key";
  console.warn("WARNING: SECRET_KEY not set, using an insecure default. Set the SECRET_KEY env var in production.");
}

const authUsername = process.env.AUTH_USERNAME || "admin";
let authPasswordHash = process.env.AUTH_PASSWORD_HASH;
if (!authPasswordHash) {
  authPasswordHash = bcrypt.hashSync("admin", 10);
  console.warn(
    "WARNING: AUTH_PASSWORD_HASH not set, defaulting to username 'admin' / password 'admin'. " +
      "Generate a real hash with bcryptjs.hashSync('yourpassword', 10) and set AUTH_USERNAME / " +
      "AUTH_PASSWORD_HASH env vars in production."
  );
}

const app = createApp({
  dbPath: path.join(__dirname, "..", "todo.db"),
  secretKey,
  authUsername,
  authPasswordHash,
});

const port = Number(process.env.API_PORT || 5052);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
