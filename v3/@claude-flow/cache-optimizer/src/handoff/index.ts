/**
 * @claude-flow/cache-optimizer - Handoff Module
 *
 * Background process model handoffs for requesting other AI models
 * (local via Ollama or remote via API) and injecting responses back.
 */

export {
  HandoffManager,
  handoff,
  DEFAULT_HANDOFF_CONFIG,
} from './handoff-manager.js';

export {
  BackgroundHandler,
  createHandoffChain,
} from './background-handler.js';

// Re-export types
export type {
  HandoffConfig,
  HandoffProviderConfig,
  HandoffProviderType,
  BackgroundProcessConfig,
  HandoffRetryConfig,
  HandoffTimeoutConfig,
  HandoffRequest,
  HandoffContext,
  HandoffMetadata,
  HandoffRequestOptions,
  HandoffResponse,
  HandoffTokenUsage,
  HandoffStatus,
  HandoffQueueItem,
  HandoffMetrics,
} from '../types.js';
