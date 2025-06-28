
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  emailVerified: 'emailVerified',
  name: 'name',
  image: 'image',
  nickname: 'nickname',
  fullName: 'fullName',
  bio: 'bio',
  avatar: 'avatar',
  backgroundImage: 'backgroundImage',
  website: 'website',
  twitter: 'twitter',
  telegram: 'telegram',
  location: 'location',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isVerified: 'isVerified',
  isCreator: 'isCreator',
  followersCount: 'followersCount',
  followingCount: 'followingCount',
  postsCount: 'postsCount',
  wallet: 'wallet',
  solanaWallet: 'solanaWallet',
  referrerId: 'referrerId'
};

exports.Prisma.PostScalarFieldEnum = {
  id: 'id',
  creatorId: 'creatorId',
  title: 'title',
  content: 'content',
  type: 'type',
  category: 'category',
  thumbnail: 'thumbnail',
  mediaUrl: 'mediaUrl',
  isLocked: 'isLocked',
  isPremium: 'isPremium',
  price: 'price',
  currency: 'currency',
  minSubscriptionTier: 'minSubscriptionTier',
  imageAspectRatio: 'imageAspectRatio',
  likesCount: 'likesCount',
  commentsCount: 'commentsCount',
  viewsCount: 'viewsCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isSellable: 'isSellable',
  sellType: 'sellType',
  quantity: 'quantity',
  auctionStartPrice: 'auctionStartPrice',
  auctionStepPrice: 'auctionStepPrice',
  auctionDepositAmount: 'auctionDepositAmount',
  auctionStartAt: 'auctionStartAt',
  auctionEndAt: 'auctionEndAt',
  auctionStatus: 'auctionStatus',
  soldAt: 'soldAt',
  soldToId: 'soldToId',
  soldPrice: 'soldPrice',
  sellerConfirmedAt: 'sellerConfirmedAt'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.PostTagScalarFieldEnum = {
  postId: 'postId',
  tagId: 'tagId'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  content: 'content',
  isAnonymous: 'isAnonymous',
  likesCount: 'likesCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  parentId: 'parentId'
};

exports.Prisma.LikeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  postId: 'postId',
  commentId: 'commentId',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  creatorId: 'creatorId',
  plan: 'plan',
  price: 'price',
  currency: 'currency',
  subscribedAt: 'subscribedAt',
  validUntil: 'validUntil',
  isActive: 'isActive',
  txSignature: 'txSignature',
  paymentStatus: 'paymentStatus',
  paymentAmount: 'paymentAmount',
  platformFee: 'platformFee',
  referrerFee: 'referrerFee',
  creatorAmount: 'creatorAmount'
};

exports.Prisma.FollowScalarFieldEnum = {
  id: 'id',
  followerId: 'followerId',
  followingId: 'followingId',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  subscriptionId: 'subscriptionId',
  postPurchaseId: 'postPurchaseId',
  txSignature: 'txSignature',
  fromWallet: 'fromWallet',
  toWallet: 'toWallet',
  amount: 'amount',
  currency: 'currency',
  type: 'type',
  status: 'status',
  senderId: 'senderId',
  receiverId: 'receiverId',
  platformFee: 'platformFee',
  referrerFee: 'referrerFee',
  referrerWallet: 'referrerWallet',
  metadata: 'metadata',
  errorMessage: 'errorMessage',
  confirmedAt: 'confirmedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.PostPurchaseScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  price: 'price',
  currency: 'currency',
  txSignature: 'txSignature',
  purchasedAt: 'purchasedAt',
  paymentStatus: 'paymentStatus',
  platformFee: 'platformFee',
  referrerFee: 'referrerFee',
  creatorAmount: 'creatorAmount'
};

exports.Prisma.UserSettingsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  notifyComments: 'notifyComments',
  notifyLikes: 'notifyLikes',
  notifyNewPosts: 'notifyNewPosts',
  notifySubscriptions: 'notifySubscriptions',
  showActivity: 'showActivity',
  allowMessages: 'allowMessages',
  showOnlineStatus: 'showOnlineStatus',
  theme: 'theme',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreatorTierSettingsScalarFieldEnum = {
  id: 'id',
  creatorId: 'creatorId',
  basicTier: 'basicTier',
  premiumTier: 'premiumTier',
  vipTier: 'vipTier',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  isRead: 'isRead',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.AuctionDepositScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  amount: 'amount',
  txSignature: 'txSignature',
  status: 'status',
  createdAt: 'createdAt',
  refundedAt: 'refundedAt',
  refundTxSignature: 'refundTxSignature',
  forfeitedAt: 'forfeitedAt'
};

exports.Prisma.AuctionBidScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  amount: 'amount',
  isWinning: 'isWinning',
  createdAt: 'createdAt'
};

exports.Prisma.AuctionPaymentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  amount: 'amount',
  txSignature: 'txSignature',
  status: 'status',
  dueAt: 'dueAt',
  paidAt: 'paidAt',
  sellerConfirmedAt: 'sellerConfirmedAt',
  createdAt: 'createdAt'
};

exports.Prisma.FlashSaleScalarFieldEnum = {
  id: 'id',
  creatorId: 'creatorId',
  postId: 'postId',
  subscriptionPlan: 'subscriptionPlan',
  discount: 'discount',
  maxRedemptions: 'maxRedemptions',
  usedCount: 'usedCount',
  startAt: 'startAt',
  endAt: 'endAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FlashSaleRedemptionScalarFieldEnum = {
  id: 'id',
  flashSaleId: 'flashSaleId',
  userId: 'userId',
  originalPrice: 'originalPrice',
  discountAmount: 'discountAmount',
  finalPrice: 'finalPrice',
  redeemedAt: 'redeemedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  lastMessageAt: 'lastMessageAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  senderId: 'senderId',
  content: 'content',
  mediaUrl: 'mediaUrl',
  mediaType: 'mediaType',
  isPaid: 'isPaid',
  price: 'price',
  isRead: 'isRead',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.MessagePurchaseScalarFieldEnum = {
  id: 'id',
  messageId: 'messageId',
  userId: 'userId',
  amount: 'amount',
  txSignature: 'txSignature',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.SellType = exports.$Enums.SellType = {
  FIXED_PRICE: 'FIXED_PRICE',
  AUCTION: 'AUCTION'
};

exports.AuctionStatus = exports.$Enums.AuctionStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  SOLD: 'SOLD',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  POST_PURCHASE: 'POST_PURCHASE',
  PLATFORM_FEE: 'PLATFORM_FEE',
  REFERRER_FEE: 'REFERRER_FEE',
  WITHDRAWAL: 'WITHDRAWAL',
  REFUND: 'REFUND',
  MESSAGE_PURCHASE: 'MESSAGE_PURCHASE',
  TIP: 'TIP'
};

exports.TransactionStatus = exports.$Enums.TransactionStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  LIKE_POST: 'LIKE_POST',
  LIKE_COMMENT: 'LIKE_COMMENT',
  COMMENT_POST: 'COMMENT_POST',
  REPLY_COMMENT: 'REPLY_COMMENT',
  NEW_SUBSCRIBER: 'NEW_SUBSCRIBER',
  POST_PURCHASE: 'POST_PURCHASE',
  NEW_POST_FROM_SUBSCRIPTION: 'NEW_POST_FROM_SUBSCRIPTION',
  AUCTION_NEW_BID: 'AUCTION_NEW_BID',
  AUCTION_WON: 'AUCTION_WON',
  AUCTION_PAYMENT_REMINDER: 'AUCTION_PAYMENT_REMINDER',
  AUCTION_DEPOSIT_REFUNDED: 'AUCTION_DEPOSIT_REFUNDED',
  TIP_RECEIVED: 'TIP_RECEIVED',
  NEW_MESSAGE: 'NEW_MESSAGE'
};

exports.DepositStatus = exports.$Enums.DepositStatus = {
  HELD: 'HELD',
  REFUNDED: 'REFUNDED',
  FORFEITED: 'FORFEITED'
};

exports.AuctionPaymentStatus = exports.$Enums.AuctionPaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Post: 'Post',
  Tag: 'Tag',
  PostTag: 'PostTag',
  Comment: 'Comment',
  Like: 'Like',
  Subscription: 'Subscription',
  Follow: 'Follow',
  Transaction: 'Transaction',
  Account: 'Account',
  Session: 'Session',
  PostPurchase: 'PostPurchase',
  UserSettings: 'UserSettings',
  CreatorTierSettings: 'CreatorTierSettings',
  Notification: 'Notification',
  AuctionDeposit: 'AuctionDeposit',
  AuctionBid: 'AuctionBid',
  AuctionPayment: 'AuctionPayment',
  FlashSale: 'FlashSale',
  FlashSaleRedemption: 'FlashSaleRedemption',
  Conversation: 'Conversation',
  Message: 'Message',
  MessagePurchase: 'MessagePurchase'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
