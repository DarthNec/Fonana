# Optimized First Message for AI Chat

## Copy this message to start a new chat:

```
Project: Fonana - Next.js + Solana platform
GitHub: https://github.com/DukeDeSouth/Fonana (private repo with deploy key)
Production: 69.10.59.234:43988, path: /var/www/fonana
Deploy: ./deploy-to-production.sh
RPC: https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/

Guidelines:
- Parallelize operations when possible
- Analyze before changing (check local & server)
- Preserve existing systems and data flows
- Test locally (port 3000) before deploying
- Use English for UI, Russian comments OK
- Production has real users/data - be careful

[YOUR TASK HERE]
```

## How to Use Effectively:

### 1. **Keep Context Between Chats**
- Save important findings in markdown files in the project
- Reference previous work: "Continue from CASE_INSENSITIVE_USERNAME_FIX.md"
- Mention recent changes: "Just implemented X, now need Y"

### 2. **Be Specific About Tasks**
Instead of: "Fix the bug with usernames"
Use: "Fix: Usernames with capital letters return 404. Check /[username]/page.tsx"

### 3. **Provide Current State**
- "Getting error X when doing Y"
- "This works locally but not on production"
- Include error messages or logs

### 4. **Use Task Prefixes**
- `Implement:` for new features
- `Fix:` for bugs
- `Analyze:` for investigation
- `Deploy:` when ready to push to production
- `Optimize:` for performance improvements

### 5. **Reference Documentation**
The project has these docs:
- `AI_ASSISTANT_QUICK_START.md` - Basic info
- `GITHUB_PRIVATE_REPO_SETUP.md` - GitHub setup
- Feature-specific docs (e.g., `REFERRAL_SYSTEM.md`)

## Example Good First Messages:

### For Bug Fix:
```
[paste the base message above]

Fix: Profile page shows infinite loading for non-logged users. 
Last changes were in REFERRAL_SYSTEM_UPDATE.md
Need to check /app/[username]/page.tsx and user loading logic.
```

### For New Feature:
```
[paste the base message above]

Implement: Add email notifications when users receive likes.
Should integrate with existing notification system in /lib/notifications.ts
Check NOTIFICATION_SYSTEM.md for current implementation.
```

### For Deployment:
```
[paste the base message above]

Deploy: Changes from local are tested and ready.
Files changed: /app/api/posts/route.ts, /components/PostCard.tsx
Commit message should be: "Add post filtering by category"
```

## Pro Tips:

1. **Start Simple**: Give core info + specific task
2. **Add Context Gradually**: AI will ask if needs more info
3. **Reference Files**: "Look at X.tsx line 50" is better than explaining
4. **Use Existing Patterns**: "Do it like in /app/api/user/route.ts"
5. **Save Progress**: Ask AI to create summary docs for complex tasks

## What NOT to Include:

❌ Long philosophical guidelines about code quality
❌ Duplicate information (say things once)
❌ Vague requirements ("make it better")
❌ Information AI can find itself ("analyze everything")

## Quick Troubleshooting:

- **If AI seems lost**: "Check AI_ASSISTANT_QUICK_START.md for project overview"
- **If deploy fails**: "The repo is private, use SCP method in deploy script"
- **If confused about architecture**: "Run 'find . -name "*.md" | grep -E "(FEATURE|SYSTEM|UPDATE)"' to see all docs"
- **If port 3000 is busy**: Next.js will auto-increment (3001, 3002, etc.) 