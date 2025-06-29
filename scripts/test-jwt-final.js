#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const JWT_SECRET = envVars.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;

console.log('\n🔍 JWT Final Test');
console.log('=================');
console.log(`NEXTAUTH_SECRET from .env: ${JWT_SECRET ? 'Found' : 'Not found'}`);
console.log(`Secret length: ${JWT_SECRET ? JWT_SECRET.length : 0}`);

if (!JWT_SECRET) {
  console.error('❌ No JWT secret found!');
  process.exit(1);
}

// Create test token
console.log('\n1️⃣ Creating JWT token...');
const testPayload = {
  userId: 'test123',
  wallet: 'testwallet',
  sub: 'test123'
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '30d' });
  console.log('✅ Token created successfully');
  console.log(`Token: ${token.substring(0, 50)}...`);
  
  // Verify token
  console.log('\n2️⃣ Verifying JWT token...');
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', decoded);
  
  // Test with WebSocket server's approach
  console.log('\n3️⃣ Testing WebSocket-style verification...');
  try {
    const wsDecoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ WebSocket-style verification successful');
  } catch (err) {
    console.error('❌ WebSocket-style verification failed:', err.message);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n✅ All tests completed'); 