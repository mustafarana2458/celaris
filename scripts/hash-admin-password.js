#!/usr/bin/env node
// One-off admin bootstrap helper -- NOT part of the app build, not
// imported by any app code. Run manually (locally or via `docker exec`
// on the server) to produce a bcrypt hash for the first admin_users
// row's password_hash column -- see sql/admin_auth_schema.sql.
//
// Prompts interactively rather than accepting the password as a CLI
// argument, so it never lands in shell history or a process list
// (`ps aux` etc). Input is visible on screen while typing (not masked
// with asterisks) -- a masked-input prompt would need readline's
// internal, TTY-dependent _writeToOutput API, and this deliberately
// avoids that: for a one-time credential bootstrap, correctness matters
// more than hiding characters during a private terminal session you
// already control.
//
// Uses the line-event API (rl.on("line", ...)) rather than rl.question()
// -- verified during testing that rl.question() (both the callback and
// the readline/promises forms) can hang indefinitely with piped/non-TTY
// stdin depending on the environment, while the line-event API is
// reliable in every environment tested (real TTY and piped alike).
//
// Usage: node scripts/hash-admin-password.js

const readline = require("readline");
const bcrypt = require("bcryptjs");

const BCRYPT_COST = 12;
const MIN_LENGTH = 12;
const PROMPTS = ["Admin password: ", "Confirm password: "];

function readTwoLines() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const answers = [];
    process.stdout.write(PROMPTS[0]);
    rl.on("line", (line) => {
      answers.push(line);
      if (answers.length < PROMPTS.length) {
        process.stdout.write(PROMPTS[answers.length]);
      } else {
        rl.close();
      }
    });
    rl.on("close", () => resolve(answers));
  });
}

async function main() {
  const [password, confirm] = await readTwoLines();
  process.stdout.write("\n");

  if (password !== confirm) {
    console.error("Passwords did not match.");
    process.exitCode = 1;
    return;
  }
  if (password.length < MIN_LENGTH) {
    console.error(`Use at least ${MIN_LENGTH} characters for an admin password.`);
    process.exitCode = 1;
    return;
  }

  const hash = bcrypt.hashSync(password, BCRYPT_COST);
  console.log("bcrypt hash -- paste this into the SQL INSERT's password_hash value:\n");
  console.log(hash);
}

main();
