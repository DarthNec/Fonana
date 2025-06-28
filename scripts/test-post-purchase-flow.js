#!/usr/bin/env node

const fetch = require('node-fetch');
const WebSocket = require('ws');
const { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const { sign } = require('tweetnacl');
const bs58 = require('bs58');

// Constants
const API_URL = 'https://fonana.me/api';
const WS_URL = 'wss://fonana.me/ws';
const RPC_URL = 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/';

// Test wallets (you'll need to use real test wallets)
const TEST_WALLET_SECRET = process.env.TEST_WALLET_SECRET || '';
const TEST_CREATOR_ID = 'cm4reyqog00007cit00d4a7bx'; // fonanadev

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow :
                type === 'test' ? colors.cyan : colors.blue;
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function generateJWT(wallet) {
  // В реальности JWT должен быть получен через API авторизации
  // Здесь упрощенная версия для теста
  const response = await fetch(`${API_URL}/auth/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: wallet.publicKey.toBase58() })
  });
  
  if (!response.ok) {
    throw new Error('Failed to get JWT token');
  }
  
  const data = await response.json();
  return data.token;
}

async function connectWebSocket(jwt) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    ws.on('open', () => {
      log('WebSocket connected', 'success');
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'error');
      reject(error);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        log(`WebSocket event: ${message.type}`, 'test');
        console.log(message);
      } catch (e) {
        log(`WebSocket message: ${data}`, 'test');
      }
    });
  });
}

async function getPayablePosts(creatorId) {
  const response = await fetch(`${API_URL}/posts?creatorId=${creatorId}&isLocked=true`);
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  
  const data = await response.json();
  return data.posts.filter(post => post.price > 0 && !post.isPurchased);
}

async function createPurchaseTransaction(wallet, post) {
  const connection = new Connection(RPC_URL);
  const creatorWallet = new PublicKey(post.creator.solanaWallet || post.creator.wallet);
  const platformWallet = new PublicKey('npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4');
  
  const transaction = new Transaction();
  
  // Creator payment (90%)
  const creatorAmount = Math.floor(post.price * 0.9 * LAMPORTS_PER_SOL);
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: creatorWallet,
      lamports: creatorAmount
    })
  );
  
  // Platform fee (10%)
  const platformAmount = Math.floor(post.price * 0.1 * LAMPORTS_PER_SOL);
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: platformWallet,
      lamports: platformAmount
    })
  );
  
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;
  
  return transaction;
}

async function testPostPurchaseFlow() {
  log('=== Testing Post Purchase Flow ===', 'bright');
  
  let ws = null;
  
  try {
    // Step 1: Setup wallet
    log('Step 1: Setting up test wallet...');
    if (!TEST_WALLET_SECRET) {
      throw new Error('TEST_WALLET_SECRET environment variable is required');
    }
    
    const wallet = Keypair.fromSecretKey(bs58.decode(TEST_WALLET_SECRET));
    log(`Wallet: ${wallet.publicKey.toBase58()}`, 'success');
    
    // Step 2: Get JWT token
    log('Step 2: Getting JWT token...');
    const jwt = await generateJWT(wallet);
    log('JWT token obtained', 'success');
    
    // Step 3: Connect WebSocket
    log('Step 3: Connecting to WebSocket...');
    ws = await connectWebSocket(jwt);
    
    // Subscribe to events
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'user',
      userId: wallet.publicKey.toBase58()
    }));
    
    // Step 4: Get payable posts
    log('Step 4: Fetching payable posts...');
    const posts = await getPayablePosts(TEST_CREATOR_ID);
    
    if (posts.length === 0) {
      log('No payable posts found', 'warning');
      return;
    }
    
    log(`Found ${posts.length} payable posts`, 'success');
    const post = posts[0];
    log(`Selected post: "${post.title}" - Price: ${post.price} SOL`, 'test');
    
    // Step 5: Check balance
    log('Step 5: Checking wallet balance...');
    const connection = new Connection(RPC_URL);
    const balance = await connection.getBalance(wallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    log(`Balance: ${balanceSOL} SOL`, 'test');
    
    if (balanceSOL < post.price) {
      throw new Error(`Insufficient balance. Need ${post.price} SOL, have ${balanceSOL} SOL`);
    }
    
    // Step 6: Create and send transaction
    log('Step 6: Creating purchase transaction...');
    const transaction = await createPurchaseTransaction(wallet, post);
    
    log('Signing and sending transaction...');
    transaction.sign(wallet);
    const signature = await connection.sendTransaction(transaction);
    log(`Transaction sent: ${signature}`, 'success');
    
    // Step 7: Process payment on backend
    log('Step 7: Processing payment on backend...');
    const processResponse = await fetch(`${API_URL}/posts/process-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-wallet': wallet.publicKey.toBase58()
      },
      body: JSON.stringify({
        postId: post.id,
        userId: wallet.publicKey.toBase58(),
        price: post.price,
        currency: 'SOL',
        signature,
        creatorId: post.creator.id
      })
    });
    
    if (!processResponse.ok) {
      const error = await processResponse.json();
      throw new Error(`Payment processing failed: ${error.error}`);
    }
    
    const result = await processResponse.json();
    log('Payment processed successfully', 'success');
    
    // Step 8: Wait for WebSocket event
    log('Step 8: Waiting for WebSocket event...');
    let eventReceived = false;
    
    const eventPromise = new Promise((resolve) => {
      const handler = (data) => {
        const message = JSON.parse(data);
        if (message.type === 'post-purchased' && message.data.postId === post.id) {
          eventReceived = true;
          log('✅ WebSocket event received: post-purchased', 'success');
          ws.removeListener('message', handler);
          resolve();
        }
      };
      ws.on('message', handler);
    });
    
    // Wait max 10 seconds for event
    await Promise.race([
      eventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket event timeout')), 10000))
    ]).catch(err => {
      if (err.message === 'WebSocket event timeout') {
        log('⚠️  WebSocket event not received within 10 seconds', 'warning');
      } else {
        throw err;
      }
    });
    
    // Step 9: Verify post access
    log('Step 9: Verifying post access...');
    const postResponse = await fetch(`${API_URL}/posts/${post.id}`, {
      headers: { 'x-user-wallet': wallet.publicKey.toBase58() }
    });
    
    if (!postResponse.ok) {
      throw new Error('Failed to fetch post after purchase');
    }
    
    const purchasedPost = await postResponse.json();
    
    if (purchasedPost.post.isPurchased) {
      log('✅ Post access granted - content is now available', 'success');
    } else {
      log('❌ Post still locked after purchase', 'error');
    }
    
    // Summary
    log('\n=== Test Summary ===', 'bright');
    log('✅ JWT authentication: SUCCESS', 'success');
    log('✅ WebSocket connection: SUCCESS', 'success');
    log('✅ Transaction creation: SUCCESS', 'success');
    log('✅ Payment processing: SUCCESS', 'success');
    log(eventReceived ? '✅ Real-time event: SUCCESS' : '⚠️  Real-time event: TIMEOUT', eventReceived ? 'success' : 'warning');
    log(purchasedPost.post.isPurchased ? '✅ Content access: SUCCESS' : '❌ Content access: FAILED', purchasedPost.post.isPurchased ? 'success' : 'error');
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'error');
    console.error(error);
  } finally {
    if (ws) {
      ws.close();
    }
  }
}

// Test negative scenarios
async function testNegativeScenarios() {
  log('\n=== Testing Negative Scenarios ===', 'bright');
  
  try {
    // Test 1: Purchase without wallet
    log('Test 1: Attempting purchase without wallet...');
    const response1 = await fetch(`${API_URL}/posts/process-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'test123',
        price: 0.1,
        signature: 'fake-signature'
      })
    });
    
    if (response1.status === 401) {
      log('✅ Correctly rejected: No wallet', 'success');
    } else {
      log('❌ Should have rejected request without wallet', 'error');
    }
    
    // Test 2: Purchase with invalid signature
    log('Test 2: Attempting purchase with invalid signature...');
    const response2 = await fetch(`${API_URL}/posts/process-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-wallet': 'FakeWallet123'
      },
      body: JSON.stringify({
        postId: 'test123',
        userId: 'fakeuser',
        price: 0.1,
        signature: 'invalid-signature-123'
      })
    });
    
    const error2 = await response2.json();
    if (response2.status === 400 || response2.status === 404) {
      log('✅ Correctly rejected: Invalid data', 'success');
    } else {
      log('❌ Should have rejected invalid signature', 'error');
    }
    
    // Test 3: Double purchase attempt
    log('Test 3: Testing double purchase prevention...');
    // This would require a real previously purchased post
    log('⚠️  Skipping double purchase test (requires real data)', 'warning');
    
  } catch (error) {
    log(`Negative test error: ${error.message}`, 'error');
  }
}

// Main execution
async function main() {
  console.log('\n' + colors.bright + '🚀 Fonana Post Purchase Test Suite' + colors.reset + '\n');
  
  // Run positive test flow
  await testPostPurchaseFlow();
  
  // Run negative tests
  await testNegativeScenarios();
  
  console.log('\n' + colors.bright + '✅ All tests completed!' + colors.reset + '\n');
}

// Run tests
main().catch(console.error); 