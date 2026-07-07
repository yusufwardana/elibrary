// cPanel Passenger startup file for Next.js standalone
const path = require("path");
const fs = require("fs");

// Set production environment
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";

// In the deploy folder, server.js is at the same level as app.js
const standaloneServerPath = path.join(__dirname, "server.js");

if (!fs.existsSync(standaloneServerPath)) {
  console.error("ERROR: server.js not found at:", standaloneServerPath);
  console.error("Make sure you uploaded the contents of the deploy/ folder.");
  process.exit(1);
}

// Start the Next.js standalone server
// Passenger will set the PORT environment variable automatically
require(standaloneServerPath);
