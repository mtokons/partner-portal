import fs from "fs";

const jsonPath = process.argv[2] || "./SCCGFirebase.json";
const envPath = process.argv[3];

if (!envPath) {
  console.error("Usage: node extract-firebase-env.mjs <jsonPath> <envPath>");
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`File not found: ${jsonPath}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(jsonPath, "utf8");
  const j = JSON.parse(content);
  if (!j.project_id || !j.client_email || !j.private_key) {
    console.error("Missing required Firebase fields in JSON.");
    process.exit(2);
  }

  const extraEnv = `\nFIREBASE_PROJECT_ID=${JSON.stringify(j.project_id)}\nFIREBASE_CLIENT_EMAIL=${JSON.stringify(j.client_email)}\nFIREBASE_PRIVATE_KEY=${JSON.stringify(j.private_key)}\n`;
  fs.appendFileSync(envPath, extraEnv);
  console.log("Firebase credentials successfully appended to environment.");
} catch (err) {
  console.error("Failed to parse or write Firebase config:", err);
  process.exit(1);
}
