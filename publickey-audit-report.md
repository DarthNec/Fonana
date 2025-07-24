# PublicKey Usage Audit Report

Generated: 2025-07-24T14:45:44.994Z

## publicKey object checks

Found 14 occurrences:

- **app/messages/[id]/page.tsx**: `if (!publicKey || !participant || !tipAmount || isSendingTip) return`
- **app/messages/[id]/page.tsx**: `if (!publicKey || !participant || !message.price) return`
- **app/messages/[id]/page.tsx**: `if (!publicKey) {`
- **components/SubscriptionPayment.tsx**: `if (!publicKeyString || !connected) {`
- **components/BottomNav.tsx**: `if (!publicKeyString) {`
- **components/CreateFlashSale.tsx**: `if (!publicKeyString) return`
- **components/CreateFlashSale.tsx**: `if (!publicKey) {`
- **components/SubscribeModal.tsx**: `if (!connected || !publicKeyString) { // 🔥 M7 FIX`
- **components/PurchaseModal.tsx**: `if (!publicKeyString || !connected) {`
- **components/FlashSalesList.tsx**: `if (!publicKeyString) return`
- **components/CreatorsExplorer.tsx**: `if (!publicKeyString) {`
- **components/CreatorsExplorer.tsx**: `if (!publicKeyString) {`
- **components/SellablePostModal.tsx**: `if (!connected || !publicKeyString) {`
- **components/SellablePostModal.tsx**: `if (!connected || !publicKeyString) {`

## publicKey.toBase58() calls

Found 2 occurrences:

- **node_modules/@solana/wallet-adapter-react-ui/src/BaseWalletMultiButton.tsx**: `const base58 = publicKey.toBase58();`
- **node_modules/@solana/wallet-adapter-react-ui/src/BaseWalletMultiButton.tsx**: `await navigator.clipboard.writeText(publicKey.toBase58());`

## publicKey.toString() calls

Found 2 occurrences:

- **components/CreatePostModal.tsx**: `publicKey: publicKey ? publicKey.toString() : null,`
- **components/CreatePostModal.tsx**: `publicKey_value: publicKey ? publicKey.toString() : null,`

## Destructured publicKey from useWallet

Found 10 occurrences:

- **app/messages/[id]/page.tsx**: `const { publicKey, sendTransaction } = useWallet()`
- **node_modules/@solana/wallet-adapter-react-ui/src/BaseWalletMultiButton.tsx**: `const { buttonState, onConnect, onDisconnect, publicKey, walletIcon, walletName } = useWalletMultiBu...`
- **components/Navbar.tsx**: `const { connected, disconnect, publicKey } = useWallet()`
- **components/SubscriptionPayment.tsx**: `const { publicKey, connected, sendTransaction } = useWallet()`
- **components/UserSubscriptions.tsx**: `const { publicKey } = useWallet()`
- **components/BottomNav.tsx**: `const { publicKey, disconnect } = useWallet()`
- **components/FlashSalesList.tsx**: `const { publicKey } = useWallet()`
- **components/CreatorsExplorer.tsx**: `const { publicKey } = useWallet()`
- **components/SellablePostModal.tsx**: `const { connected, publicKey, sendTransaction } = useWallet()`
- **lib/providers/AppProvider.tsx**: `const { publicKey, connected } = useWallet()`

## Summary

Total files to fix: 14

## Fix Strategy

1. Add `const publicKeyString = publicKey?.toBase58() ?? null` after useWallet()
2. Replace `publicKey` with `publicKeyString` in:
   - useEffect dependencies
   - Conditional checks
   - String conversions
3. Keep `publicKey` object only for Transaction creation
