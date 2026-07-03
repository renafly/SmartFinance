#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'src/features/dashboard'];
const EXTENSIONS = new Set(['.ts', '.tsx']);

const PROP_REGEX = /\b(title|subtitle|label|placeholder|nullLabel|message)\s*=\s*(["'])([^"'{}][^"']*)\2/g;
const TEXT_NODE_REGEX = /<Text[^>]*>\s*([^<{\n][^<{]*?)\s*<\/Text>/g;
const ALLOWED_LITERALS = new Set(['SmartFinance', 'member@email.com']);

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name);
    if (EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
}

function isSkippableText(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (ALLOWED_LITERALS.has(trimmed)) return true;
  if (/^e\.g\./i.test(trimmed)) return true;
  if (trimmed.startsWith('#')) return true;
  if (trimmed.includes('@')) return true;
  if (/^[+\-*/#%!?.,:;()\[\]{}\s0-9]+$/.test(trimmed)) return true;
  if (/^\p{Emoji}+$/u.test(trimmed)) return true;
  return false;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function collectViolations(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  for (const match of source.matchAll(PROP_REGEX)) {
    const text = match[3];
    if (isSkippableText(text)) continue;

    violations.push({
      line: getLineNumber(source, match.index),
      kind: 'prop',
      text,
    });
  }

  for (const match of source.matchAll(TEXT_NODE_REGEX)) {
    const text = match[1];
    if (isSkippableText(text)) continue;

    violations.push({
      line: getLineNumber(source, match.index),
      kind: 'text',
      text,
    });
  }

  return violations;
}

function main() {
  const files = [];
  for (const targetDir of TARGET_DIRS) {
    walk(path.join(ROOT, targetDir), files);
  }

  const allViolations = [];

  for (const filePath of files) {
    const violations = collectViolations(filePath);
    if (violations.length === 0) continue;

    const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    for (const violation of violations) {
      allViolations.push({
        file: relativePath,
        ...violation,
      });
    }
  }

  if (allViolations.length === 0) {
    console.log('No hardcoded UI strings found.');
    process.exit(0);
  }

  console.error('Found hardcoded UI strings:');
  for (const item of allViolations) {
    console.error(`- ${item.file}:${item.line} [${item.kind}] "${item.text}"`);
  }

  process.exit(1);
}

main();
