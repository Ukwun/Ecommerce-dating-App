const EVENT_TYPES = Object.freeze({
  // Discovery and browsing
  PRODUCT_VIEW: 'product_view',
  PRODUCT_SEARCH: 'product_search',
  PRODUCT_CLICK: 'product_click',
  CATEGORY_BROWSE: 'category_browse',
  SELLER_VIEW: 'seller_view',

  // Conversion funnel
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_COMPLETED: 'checkout_completed',
  PURCHASE: 'purchase',

  // Payment lifecycle
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',

  // Engagement / retention
  APP_OPEN: 'app_open',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  RETENTION_HEARTBEAT: 'retention_heartbeat',

  // Social / messaging
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',

  // Favorites / wishlist
  ADD_FAVORITE: 'add_favorite',
  REMOVE_FAVORITE: 'remove_favorite',
});

const FULL_FUNNEL_EVENTS = Object.freeze([
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.PRODUCT_SEARCH,
  EVENT_TYPES.ADD_TO_CART,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PAYMENT_SUCCESS,
  EVENT_TYPES.PAYMENT_FAILED,
  EVENT_TYPES.RETENTION_HEARTBEAT,
]);

const VALID_EVENT_TYPES = new Set(Object.values(EVENT_TYPES));

const isValidEventType = (eventType) => VALID_EVENT_TYPES.has(eventType);

module.exports = {
  EVENT_TYPES,
  FULL_FUNNEL_EVENTS,
  isValidEventType,
};
