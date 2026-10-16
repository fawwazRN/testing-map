// Menjalankan backend dan frontend sekaligus: npm run dev:all
import { spawn } from "node:child_process";

const procs = [
  spawn("node", ["server/index.js"], { stdio: "inherit" }),
  spawn("npx", ["vite"], { stdio: "inherit", shell: process.platform === "win32" }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("exit", stop);
procs.forEach((p) => p.on("exit", (code) => { if (code) { stop(); process.exit(code); } }));
