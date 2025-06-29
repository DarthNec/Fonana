#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

// Parse .env file
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('🔧 Setting environment variables for Next.js...');
console.log(`  Found ${Object.keys(envVars).length} variables in .env`);

// Merge with existing environment
const finalEnv = {
  ...process.env,
  ...envVars,
  NODE_ENV: 'production',
  PORT: process.env.PORT || '3000'
};

// Log important variables
console.log('📊 Final environment check:');
console.log(`  NEXTAUTH_SECRET: ${finalEnv.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]'}`);
console.log(`  DATABASE_URL: ${finalEnv.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
console.log(`  PORT: ${finalEnv.PORT}`);
console.log(`  NODE_ENV: ${finalEnv.NODE_ENV}`);

// Start Next.js with merged environment
console.log('🚀 Starting Next.js with environment variables...');
const next = spawn('npm', ['run', 'start'], {
  stdio: 'inherit',
  env: finalEnv,
  shell: true
});

next.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

next.on('exit', (code) => {
  process.exit(code || 0);
}); 