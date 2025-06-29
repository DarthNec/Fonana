#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

console.log('🔍 Debugging JWT Signature Issue\n');

async function debugJWT() {
  try {
    // 1. Проверяем текущее значение NEXTAUTH_SECRET
    const currentSecret = process.env.NEXTAUTH_SECRET;
    console.log('Environment NEXTAUTH_SECRET:');
    console.log('  Exists:', !!currentSecret);
    if (currentSecret) {
      console.log('  Length:', currentSecret.length);
      console.log('  First 10 chars:', currentSecret.substring(0, 10));
      console.log('  Last 5 chars:', currentSecret.substring(currentSecret.length - 5));
      console.log('  Has quotes:', currentSecret.includes('"'));
      console.log('  Full value (base64):', Buffer.from(currentSecret).toString('base64'));
    }
    
    // 2. Тестируем различные варианты секретов
    const secrets = {
      'env_var': currentSecret || 'not_found',
      'expected': 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
      'with_quotes': '"rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U="'
    };
    
    // 3. Получаем токен от API
    console.log('\n🔑 Getting JWT token from API...');
    const tokenResponse = await fetch('http://localhost:3000/api/auth/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        wallet: 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG' 
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`API error: ${tokenResponse.status}`);
    }
    
    const { token } = await tokenResponse.json();
    console.log('✅ Token received from API');
    console.log('   Token length:', token.length);
    
    // 4. Пробуем верифицировать токен с разными секретами
    console.log('\n🔐 Testing token verification with different secrets:');
    
    Object.entries(secrets).forEach(([name, secret]) => {
      console.log(`\n  Testing with "${name}":`);
      try {
        const decoded = jwt.verify(token, secret);
        console.log(`    ✅ SUCCESS! Token verified`);
        console.log(`    User ID: ${decoded.userId}`);
        console.log(`    Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
      } catch (error) {
        console.log(`    ❌ FAILED: ${error.message}`);
      }
    });
    
    // 5. Создаем свой токен и проверяем
    console.log('\n🔨 Creating our own token with expected secret:');
    const ourToken = jwt.sign(
      { userId: 'test123', wallet: 'testWallet' },
      secrets.expected,
      { expiresIn: '30m', issuer: 'fonana.me', audience: 'fonana-websocket' }
    );
    
    // Проверяем наш токен
    try {
      jwt.verify(ourToken, secrets.expected);
      console.log('✅ Our token verifies with expected secret');
    } catch (e) {
      console.log('❌ Our token failed verification:', e.message);
    }
    
    // 6. Сравниваем подписи
    console.log('\n🔬 Comparing token signatures:');
    const apiSignature = token.split('.')[2];
    const ourSignature = ourToken.split('.')[2];
    console.log('API token signature (first 20):', apiSignature.substring(0, 20));
    console.log('Our token signature (first 20):', ourSignature.substring(0, 20));
    console.log('Signatures match:', apiSignature === ourSignature);
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

// Запускаем отладку
debugJWT(); 