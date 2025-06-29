#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const TEST_WALLET = 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'; // Dogwater

async function testJWTValidation() {
  console.log('🔍 Testing JWT Token Creation and Validation\n');
  
  try {
    // Step 1: Get JWT token from API
    console.log('1. Getting JWT token from API...');
    const response = await fetch(`${API_URL}/auth/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wallet: TEST_WALLET })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get JWT: ${response.status}`);
    }
    
    const data = await response.json();
    const token = data.token;
    
    console.log('✅ JWT obtained from API');
    console.log('Token length:', token.length);
    
    // Step 2: Decode token without verification
    console.log('\n2. Decoding token without verification...');
    const decoded = jwt.decode(token);
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Step 3: Try to verify with different secrets
    console.log('\n3. Testing token verification...');
    
    // Test with actual secret
    const NEXTAUTH_SECRET = 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=';
    
    try {
      console.log('\nVerifying with NEXTAUTH_SECRET...');
      const verified1 = jwt.verify(token, NEXTAUTH_SECRET);
      console.log('✅ Verification successful with NEXTAUTH_SECRET');
    } catch (error) {
      console.log('❌ Verification failed:', error.message);
    }
    
    // Test with issuer/audience
    try {
      console.log('\nVerifying with issuer/audience...');
      const verified2 = jwt.verify(token, NEXTAUTH_SECRET, {
        issuer: 'fonana.me',
        audience: 'fonana-websocket'
      });
      console.log('✅ Verification successful with issuer/audience');
    } catch (error) {
      console.log('❌ Verification failed:', error.message);
    }
    
    // Step 4: Create our own token with same payload
    console.log('\n4. Creating test token with same payload...');
    const testToken = jwt.sign(
      {
        userId: decoded.userId,
        wallet: decoded.wallet,
        nickname: decoded.nickname,
        isCreator: decoded.isCreator,
        isVerified: decoded.isVerified
      },
      NEXTAUTH_SECRET,
      {
        expiresIn: '30m',
        issuer: 'fonana.me',
        audience: 'fonana-websocket'
      }
    );
    
    console.log('Test token created');
    console.log('Test token length:', testToken.length);
    
    // Verify our test token
    try {
      const verifiedTest = jwt.verify(testToken, NEXTAUTH_SECRET);
      console.log('✅ Test token verification successful');
    } catch (error) {
      console.log('❌ Test token verification failed:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testJWTValidation(); 