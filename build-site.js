"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Only these files belong on the public website. Never copy the whole repository.
const publicFiles = ["index.html", "sessions.js", "sessions.json"];
const outputDirectory = path.join(__dirname, "dist");

try {
  // Validate every input before changing the output.
  for (const name of publicFiles) {
    if (!fs.lstatSync(path.join(__dirname, name)).isFile()) {
      throw new Error(`Expected a regular public file: ${name}`);
    }
  }
  const feed = JSON.parse(fs.readFileSync(path.join(__dirname, "sessions.json"), "utf8"));
  if (!feed || !Array.isArray(feed.sessions)) {
    throw new Error("sessions.json must contain a sessions array.");
  }

  if (fs.existsSync(outputDirectory)) {
    if (!fs.lstatSync(outputDirectory).isDirectory()) {
      throw new Error("dist must be a regular directory, not a link.");
    }
    for (const name of fs.readdirSync(outputDirectory)) {
      if (!publicFiles.includes(name) || !fs.lstatSync(path.join(outputDirectory, name)).isFile()) {
        throw new Error("dist contains unexpected files. Move them out before building.");
      }
    }
  } else {
    fs.mkdirSync(outputDirectory);
  }

  for (const name of publicFiles) {
    fs.copyFileSync(path.join(__dirname, name), path.join(outputDirectory, name));
  }
  console.log(`Public upload ready in dist/: ${publicFiles.join(", ")}`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
}
