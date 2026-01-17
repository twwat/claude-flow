/**
 * Attention Helper Utilities
 *
 * High-level utility functions for working with @claude-flow/attention.
 * Can be used directly or generated via `claude-flow init`.
 */

/**
 * Attention mechanism type
 */
export type AttentionMechanismType =
  | 'standard-mha'
  | 'rotary-mha'
  | 'alibi-mha'
  | 'grouped-query-attention'
  | 'multi-query-attention'
  | 'flash-attention-v2'
  | 'flash-attention-v3'
  | 'linear-attention'
  | 'performer-attention'
  | 'linformer-attention'
  | 'bigbird-attention'
  | 'longformer-attention'
  | 'moe-attention';

/**
 * Attention configuration
 */
export interface AttentionConfig {
  mechanism?: AttentionMechanismType;
  sequenceThreshold?: number;
  enableCache?: boolean;
  enableWASM?: boolean;
}

/**
 * Simple attention computation result
 */
export interface AttentionResult {
  output: number[];
  latencyMs: number;
  mechanism: string;
  wasmAccelerated: boolean;
}

// Cached service instance
let cachedService: any = null;

/**
 * Get or create the attention service
 */
async function getAttentionService(config?: AttentionConfig) {
  if (cachedService) return cachedService;

  try {
    const { createAttentionService } = await import('@claude-flow/attention');
    cachedService = await createAttentionService({
      backend: config?.enableWASM !== false ? 'auto' : 'typescript',
      defaultMechanism: config?.mechanism ?? 'flash-attention-v2',
      enableCache: config?.enableCache ?? true,
      longSequenceThreshold: config?.sequenceThreshold ?? 8192,
    });
    return cachedService;
  } catch (e) {
    console.warn('[Attention Helper] @claude-flow/attention not available');
    return null;
  }
}

/**
 * Simple attention computation
 *
 * @example
 * ```typescript
 * import { computeAttention } from './helpers/attention-helper';
 *
 * const result = await computeAttention(
 *   [0.1, 0.2, 0.3, 0.4],
 *   [[0.1, 0.2, 0.3, 0.4], [0.4, 0.3, 0.2, 0.1]],
 *   [[1, 0, 0, 0], [0, 1, 0, 0]]
 * );
 * console.log(result.output);
 * ```
 */
export async function computeAttention(
  query: number[],
  keys: number[][],
  values: number[][],
  mechanism?: AttentionMechanismType
): Promise<AttentionResult> {
  const service = await getAttentionService();

  if (!service) {
    // Fallback: simple dot-product attention
    return computeFallbackAttention(query, keys, values);
  }

  const result = mechanism
    ? await service.compute({ query, key: keys, value: values }, mechanism)
    : await service.forward({ query, key: keys, value: values });

  return {
    output: Array.from(result.output),
    latencyMs: result.metadata.latencyMs,
    mechanism: result.metadata.mechanism,
    wasmAccelerated: result.metadata.wasmAccelerated,
  };
}

/**
 * Get recommended mechanism for a sequence length
 */
export async function recommendMechanism(sequenceLength: number): Promise<{
  mechanism: AttentionMechanismType;
  reason: string;
  alternatives: AttentionMechanismType[];
}> {
  if (sequenceLength > 8192) {
    return {
      mechanism: 'linear-attention',
      reason: 'Very long sequence - linear complexity required',
      alternatives: ['performer-attention', 'linformer-attention'],
    };
  }

  if (sequenceLength > 2048) {
    return {
      mechanism: 'flash-attention-v2',
      reason: 'Long sequence - memory-efficient tiling beneficial',
      alternatives: ['flash-attention-v3', 'linear-attention'],
    };
  }

  if (sequenceLength > 512) {
    return {
      mechanism: 'flash-attention-v2',
      reason: 'Medium sequence - Flash Attention optimal',
      alternatives: ['standard-mha'],
    };
  }

  return {
    mechanism: 'standard-mha',
    reason: 'Short sequence - standard attention works well',
    alternatives: ['flash-attention-v2'],
  };
}

/**
 * Check if WASM acceleration is available
 */
export async function isWASMAvailable(): Promise<boolean> {
  try {
    const { isWASMAvailable: check } = await import('@claude-flow/attention');
    return await check();
  } catch {
    return false;
  }
}

/**
 * Get attention system status
 */
export async function getAttentionStatus(): Promise<{
  available: boolean;
  wasmAccelerated: boolean;
  backend: string;
  mechanisms: number;
}> {
  const service = await getAttentionService();

  if (!service) {
    return {
      available: false,
      wasmAccelerated: false,
      backend: 'none',
      mechanisms: 0,
    };
  }

  try {
    const { registry } = await import('@claude-flow/attention');
    return {
      available: true,
      wasmAccelerated: service.isAccelerated(),
      backend: service.getBackend(),
      mechanisms: registry.list().length,
    };
  } catch {
    return {
      available: true,
      wasmAccelerated: service.isAccelerated(),
      backend: service.getBackend(),
      mechanisms: 39,
    };
  }
}

/**
 * Compute hyperbolic (Poincaré ball) distance
 */
export function hyperbolicDistance(
  x: number[],
  y: number[],
  curvature = -1.0
): number {
  const c = Math.abs(curvature);

  let normX = 0;
  let normY = 0;
  let normDiff = 0;

  for (let i = 0; i < x.length; i++) {
    normX += x[i] * x[i];
    normY += y[i] * y[i];
    const diff = x[i] - y[i];
    normDiff += diff * diff;
  }

  normX = Math.sqrt(normX);
  normY = Math.sqrt(normY);
  normDiff = Math.sqrt(normDiff);

  const sqrtC = Math.sqrt(c);
  const num = 2 * normDiff * normDiff;
  const denom = (1 - normX * normX) * (1 - normY * normY);

  return (1 / sqrtC) * Math.acosh(1 + num / Math.max(denom, 1e-6));
}

/**
 * Fallback attention when @claude-flow/attention is not available
 */
function computeFallbackAttention(
  query: number[],
  keys: number[][],
  values: number[][]
): AttentionResult {
  const startTime = performance.now();
  const dim = query.length;
  const seqLen = keys.length;
  const scale = 1 / Math.sqrt(dim);

  // Compute attention scores
  const scores: number[] = [];
  for (let i = 0; i < seqLen; i++) {
    let score = 0;
    for (let j = 0; j < dim; j++) {
      score += query[j] * keys[i][j];
    }
    scores.push(score * scale);
  }

  // Softmax
  const maxScore = Math.max(...scores);
  let sumExp = 0;
  for (let i = 0; i < seqLen; i++) {
    scores[i] = Math.exp(scores[i] - maxScore);
    sumExp += scores[i];
  }
  for (let i = 0; i < seqLen; i++) {
    scores[i] /= sumExp;
  }

  // Weighted sum
  const output = new Array(dim).fill(0);
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < dim; j++) {
      output[j] += scores[i] * values[i][j];
    }
  }

  return {
    output,
    latencyMs: performance.now() - startTime,
    mechanism: 'fallback-dot-product',
    wasmAccelerated: false,
  };
}

/**
 * Batch compute attention for multiple queries
 */
export async function computeAttentionBatch(
  queries: number[][],
  keys: number[][],
  values: number[][],
  mechanism?: AttentionMechanismType
): Promise<AttentionResult[]> {
  const results: AttentionResult[] = [];

  for (const query of queries) {
    const result = await computeAttention(query, keys, values, mechanism);
    results.push(result);
  }

  return results;
}

/**
 * Clear cached attention service (useful for testing)
 */
export function clearAttentionCache(): void {
  if (cachedService) {
    cachedService.clearCache?.();
  }
  cachedService = null;
}
