// cPanel Passenger startup file for Next.js standalone
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Set production environment
process.env.NODE_ENV = "production";

// Path to the standalone server
const standaloneServerPath = path.join(
  __dirname,
  ".next",
  "standalone",
  "server.js"
);

if (!fs.existsSync(standaloneServerPath)) {
  console.error("Standalone server not found. Run 'npm run build' first.");
  console.error("Expected path:", standaloneServerPath);
  process.exit(1);
}

// Passenger expects the app to listen on the port specified in the PORT env var
// or on the Unix socket specified in the PASSENGER_BASE_URI env var
require(standaloneServerPath);
