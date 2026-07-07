/**
 * Script to prepare Next.js standalone build for cPanel deployment.
 * Copies .next/static and public/ into the standalone output directory.
 * 
 * Usage: node prepare-deploy.js
 * Result: folder 'deploy/' siap di-zip dan upload ke cPanel
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");
const DEPLOY_DIR = path.join(ROOT, "deploy");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠ Source not found: ${src}`);
    return 0;
  }

  const stat = fs.statSync(src);
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return 1;
  }

  let count = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    count += copyRecursive(path.join(src, item), path.join(dest, item));
  }
  return count;
}

console.log("🚀 Preparing deployment package...\n");

// Clean deploy directory
if (fs.existsSync(DEPLOY_DIR)) {
  fs.rmSync(DEPLOY_DIR, { recursive: true });
  console.log("🗑️  Cleaned old deploy/ folder");
}

// 1. Copy standalone output
console.log("📦 Copying .next/standalone/ → deploy/");
const standaloneCount = copyRecursive(STANDALONE_DIR, DEPLOY_DIR);
console.log(`   ✅ ${standaloneCount} files copied`);

// 2. Copy .next/static into deploy/.next/static
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(DEPLOY_DIR, ".next", "static");
console.log("📦 Copying .next/static/ → deploy/.next/static/");
const staticCount = copyRecursive(staticSrc, staticDest);
console.log(`   ✅ ${staticCount} files copied`);

// 3. Copy public/ into deploy/public/
const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(DEPLOY_DIR, "public");
console.log("📦 Copying public/ → deploy/public/");
const publicCount = copyRecursive(publicSrc, publicDest);
console.log(`   ✅ ${publicCount} files copied`);

// 4. Copy app.js (Passenger startup file)
const appJsSrc = path.join(ROOT, "app.js");
const appJsDest = path.join(DEPLOY_DIR, "app.js");
if (fs.existsSync(appJsSrc)) {
  fs.copyFileSync(appJsSrc, appJsDest);
  console.log("📦 Copying app.js → deploy/app.js");
  console.log("   ✅ 1 file copied");
}

console.log("\n✅ Deploy package ready!");
console.log(`📁 Location: ${DEPLOY_DIR}`);
console.log(`\nNext steps:`);
console.log(`  1. Zip the 'deploy/' folder`);
console.log(`  2. Upload the zip to cPanel File Manager → /home/cosmica/elibrary/`);
console.log(`  3. Extract the zip in cPanel`);
console.log(`  4. Restart Node.js App in cPanel`);
