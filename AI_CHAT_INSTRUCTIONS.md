# Fonana Project - AI Assistant Instructions

## Project Context
- **Repository**: https://github.com/DukeDeSouth/Fonana (private)
- **Production**: 69.10.59.234:43988 (SSH)
- **Deploy Script**: `./deploy-to-production.sh`
- **Server Path**: `/var/www/fonana`
- **Language**: English UI, Russian comments OK

## Quick Start
```
Project: Fonana (Next.js + Solana)
Private repo: DukeDeSouth/Fonana
Server has Deploy Key, use ./deploy-to-production.sh
Production DB has real users and posts
```

## Technical Stack
- Next.js 14 + TypeScript
- PostgreSQL + Prisma ORM
- Solana Web3 integration
- PM2 process manager
- Port 3000 (default, may auto-increment if busy)

## Solana RPC
- HTTPS: `https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`
- WSS: `wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`

## Development Guidelines
1. **Analyze First**: Check both local and server states before changes
2. **Preserve Integrity**: Understand existing routes, data flows, and dependencies
3. **Test Locally**: Run changes on localhost:3000 before deploying
4. **Deploy Safely**: Use the deploy script, don't break production data

## Task Templates

### For Implementation
"Implement [feature]. Analyze current architecture, preserve existing systems, deploy when ready."

### For Fixes
"Fix [issue]. Check if it's a routing/data flow problem. Test locally first, then deploy."

### For Analysis
"Analyze [system/issue] on both local and production. Provide findings before making changes." 