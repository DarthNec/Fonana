# Project Brief: Fonana

## Project Overview

Fonana is a Next.js-based creator monetization platform that enables content creators to monetize their audience through subscriptions, posts, and direct interactions. The platform integrates Solana blockchain for payments and provides a social media-like experience for creators and subscribers.

## Core Requirements

### Primary Goals
1. **Creator Monetization**: Enable creators to earn through subscriptions, paid posts, and tips
2. **Social Interaction**: Provide feed, comments, likes, and direct messaging
3. **Blockchain Integration**: Use Solana for secure, fast payments
4. **Real-time Experience**: Live notifications, messages, and feed updates

### Key Features
- Creator profiles with subscription tiers
- Content posting with paid/free tiers
- Feed algorithm for discovering content
- Direct messaging between users
- Real-time notifications
- Flash sales and auction system
- Referral program
- Mobile-responsive design

## Technical Stack

- **Frontend**: Next.js 14.1.0, React, TypeScript, Tailwind CSS
- **Backend**: PostgreSQL database with Prisma ORM
- **Authentication**: NextAuth.js with Solana wallet integration
- **Blockchain**: Solana for payments and transactions
- **Real-time**: WebSocket server (port 3002)
- **Hosting**: Local development environment

## Success Criteria

1. Creators can successfully monetize content
2. Users can discover and consume creator content
3. Payment system works reliably with Solana
4. Real-time features function without major issues
5. Platform scales to support growing user base

## Current Status

**Development Phase**: Architecture stabilization and bug fixing
**Database**: Migrated from Supabase to local PostgreSQL
**Data**: 53 creators, 10 posts loaded from production dump
**Priority**: Fixing frontend/backend data structure mismatches

## Known Critical Issues

1. Database schema doesn't match TypeScript interfaces
2. Frontend components expect fields not present in database
3. Data normalization layer has architectural problems
4. WebSocket authentication issues
5. Multiple API endpoints have compatibility problems 