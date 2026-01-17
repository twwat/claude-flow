/**
 * @claude-flow/attention - Type Definitions
 *
 * Comprehensive type system for 39 attention mechanisms
 * with WASM acceleration support.
 */

// ============================================================================
// Core Attention Types
// ============================================================================

/**
 * All 39 supported attention mechanism types
 */
export type AttentionMechanismType =
  // Multi-Head Attention (7 types)
  | 'standard-mha'
  | 'rotary-mha'
  | 'alibi-mha'
  | 'grouped-query-attention'
  | 'multi-query-attention'
  | 'differential-attention'
  | 'mixture-attention'
  // Self-Attention Variants (6 types)
  | 'causal-self-attention'
  | 'bidirectional-self-attention'
  | 'relative-position-attention'
  | 'disentangled-attention'
  | 'talking-heads-attention'
  | 'synthesizer-attention'
  // Cross-Attention (5 types)
  | 'cross-attention'
  | 'perceiver-attention'
  | 'gated-cross-attention'
  | 'memory-attention'
  | 'hierarchical-cross-attention'
  // Sparse Attention (8 types)
  | 'bigbird-attention'
  | 'longformer-attention'
  | 'local-attention'
  | 'strided-attention'
  | 'sparse-transformer-attention'
  | 'star-attention'
  | 'blockwise-attention'
  | 'random-attention'
  // Linear Attention (6 types)
  | 'linear-attention'
  | 'performer-attention'
  | 'cosformer-attention'
  | 'rfa-attention'
  | 'nystrom-attention'
  | 'linformer-attention'
  // Flash Attention (3 types)
  | 'flash-attention-v2'
  | 'flash-attention-v3'
  | 'flash-decoding'
  // Mixture of Experts (4 types)
  | 'moe-attention'
  | 'soft-moe-attention'
  | 'switch-attention'
  | 'expert-choice-attention';

/**
 * Attention mechanism categories for organization
 */
export type AttentionCategory =
  | 'multi-head'
  | 'self-attention'
  | 'cross-attention'
  | 'sparse'
  | 'linear'
  | 'flash'
  | 'moe'
  | 'graph'
  | 'hyperbolic'
  | 'temporal'
  | 'multimodal'
  | 'retrieval';

/**
 * Execution backend for attention computation
 */
export type AttentionBackend = 'wasm' | 'typescript' | 'webgpu' | 'auto';

/**
 * Precision levels for computation
 */
export type AttentionPrecision = 'fp32' | 'fp16' | 'bf16' | 'int8' | 'int4';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Base configuration for all attention mechanisms
 */
export interface AttentionBaseConfig {
  /** Number of attention heads (default: 8) */
  numHeads?: number;
  /** Embedding dimension (default: 384) */
  embedDim?: number;
  /** Dimension per head (default: embedDim / numHeads) */
  headDim?: number;
  /** Dropout rate (default: 0.0) */
  dropout?: number;
  /** Custom scaling factor (default: 1/sqrt(headDim)) */
  scaleFactor?: number;
  /** Include bias in projections (default: true) */
  useBias?: boolean;
}

/**
 * Configuration for sparse attention patterns
 */
export interface SparseAttentionConfig extends AttentionBaseConfig {
  /** Size of local attention window */
  windowSize?: number;
  /** Number of global attention tokens */
  numGlobalTokens?: number;
  /** Number of random attention blocks */
  numRandomBlocks?: number;
  /** Block size for sparse patterns */
  blockSize?: number;
  /** Dilation rates per layer */
  dilationRates?: number[];
}

/**
 * Configuration for linear attention approximations
 */
export interface LinearAttentionConfig extends AttentionBaseConfig {
  /** Number of random features for approximation */
  numFeatures?: number;
  /** Kernel type for feature mapping */
  kernelType?: 'elu' | 'relu' | 'softmax' | 'exp';
  /** Use orthogonal random features */
  orthogonalFeatures?: boolean;
}

/**
 * Configuration for Flash Attention
 */
export interface FlashAttentionConfig extends AttentionBaseConfig {
  /** Enable causal masking */
  causal?: boolean;
  /** Block size for queries */
  blockSizeQ?: number;
  /** Block size for keys/values */
  blockSizeKV?: number;
  /** Sliding window size [left, right] */
  windowSize?: [number, number];
}

/**
 * Configuration for Mixture of Experts attention
 */
export interface MoEAttentionConfig extends AttentionBaseConfig {
  /** Number of expert modules */
  numExperts?: number;
  /** Top-k experts per token */
  topK?: number;
  /** Expert capacity factor */
  capacityFactor?: number;
  /** Router type */
  routerType?: 'softmax' | 'sigmoid' | 'top-k';
  /** Enable load balancing loss */
  loadBalancingLoss?: boolean;
}

/**
 * Configuration for hyperbolic attention
 */
export interface HyperbolicAttentionConfig extends AttentionBaseConfig {
  /** Poincaré ball curvature (negative) */
  curvature?: number;
  /** Enable exponential map initialization */
  useExpMap?: boolean;
}

/**
 * Configuration for graph attention
 */
export interface GraphAttentionConfig extends AttentionBaseConfig {
  /** Include edge features */
  useEdgeFeatures?: boolean;
  /** Negative slope for LeakyReLU */
  negativeSlope?: number;
  /** Enable dual-space embeddings */
  dualSpace?: boolean;
}

/**
 * Union of all attention configurations
 */
export type AttentionConfig =
  | AttentionBaseConfig
  | SparseAttentionConfig
  | LinearAttentionConfig
  | FlashAttentionConfig
  | MoEAttentionConfig
  | HyperbolicAttentionConfig
  | GraphAttentionConfig;

// ============================================================================
// Input/Output Types
// ============================================================================

/**
 * Input for attention computation
 */
export interface AttentionInput {
  /** Query vectors [batch, seq_len, dim] or [seq_len, dim] */
  query: Float32Array | number[] | number[][];
  /** Key vectors */
  key: Float32Array | number[] | number[][];
  /** Value vectors */
  value: Float32Array | number[] | number[][];
  /** Optional attention mask */
  mask?: Float32Array | number[] | boolean[];
  /** Optional position IDs */
  positionIds?: number[];
}

/**
 * Output from attention computation
 */
export interface AttentionOutput {
  /** Attended output [batch, seq_len, dim] */
  output: Float32Array;
  /** Attention weights (optional, for visualization) */
  weights?: Float32Array;
  /** Per-head outputs (optional) */
  perHeadOutputs?: Float32Array[];
  /** Expert usage statistics (for MoE) */
  expertUsage?: Map<number, number>;
  /** Computation metadata */
  metadata: AttentionMetadata;
}

/**
 * Metadata about attention computation
 */
export interface AttentionMetadata {
  /** Mechanism type used */
  mechanism: AttentionMechanismType;
  /** Backend used for computation */
  backend: AttentionBackend;
  /** Computation time in milliseconds */
  latencyMs: number;
  /** Memory usage in bytes */
  memoryBytes: number;
  /** Sequence length processed */
  sequenceLength: number;
  /** Whether WASM acceleration was available */
  wasmAccelerated: boolean;
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Options for the AttentionService
 */
export interface AttentionServiceOptions {
  /** Preferred backend (default: 'auto') */
  backend?: AttentionBackend;
  /** Default mechanism type */
  defaultMechanism?: AttentionMechanismType;
  /** Fallback mechanism when primary fails */
  fallbackMechanism?: AttentionMechanismType;
  /** Sequence length threshold to switch mechanisms */
  longSequenceThreshold?: number;
  /** Precision level */
  precision?: AttentionPrecision;
  /** Enable caching of attention patterns */
  enableCache?: boolean;
  /** Maximum cache size in entries */
  maxCacheSize?: number;
}

/**
 * Benchmark result for a single mechanism
 */
export interface BenchmarkResult {
  mechanism: AttentionMechanismType;
  backend: AttentionBackend;
  sequenceLength: number;
  batchSize: number;
  latencyMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  throughputOpsPerSec: number;
  memoryBytes: number;
  iterations: number;
}

/**
 * Comparison of multiple mechanisms
 */
export interface BenchmarkComparison {
  baseline: BenchmarkResult;
  results: BenchmarkResult[];
  speedupFactors: Map<AttentionMechanismType, number>;
  recommendations: string[];
}

// ============================================================================
// Mechanism Interface
// ============================================================================

/**
 * Interface for attention mechanism implementations
 */
export interface IAttentionMechanism {
  /** Mechanism type identifier */
  readonly type: AttentionMechanismType;
  /** Human-readable name */
  readonly name: string;
  /** Description of the mechanism */
  readonly description: string;
  /** Category for organization */
  readonly category: AttentionCategory;
  /** Supported backends */
  readonly supportedBackends: AttentionBackend[];
  /** Time complexity */
  readonly complexity: string;

  /**
   * Compute attention for a single query
   */
  compute(
    query: number[],
    keys: number[][],
    values: number[][]
  ): Promise<number[]>;

  /**
   * Compute attention for a batch of queries
   */
  computeBatch(
    queries: number[][],
    keys: number[][],
    values: number[][]
  ): Promise<number[][]>;

  /**
   * Full attention with typed I/O
   */
  forward(input: AttentionInput): Promise<AttentionOutput>;

  /**
   * Generate SQL for database-side computation
   */
  toSQL?(input: AttentionInput): string;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Registry entry for an attention mechanism
 */
export interface RegistryEntry {
  mechanism: IAttentionMechanism;
  config: AttentionConfig;
  wasmAvailable: boolean;
  priority: number;
}

/**
 * Mechanism selector function type
 */
export type MechanismSelector = (
  sequenceLength: number,
  batchSize: number,
  config?: AttentionConfig
) => AttentionMechanismType;

// ============================================================================
// WASM Types
// ============================================================================

/**
 * WASM module interface for ruvector
 */
export interface RuVectorWASM {
  /** Initialize the WASM module */
  init(): Promise<void>;
  /** Check if SIMD is available */
  simdAvailable(): boolean;
  /** Compute dot product attention */
  dotProductAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number
  ): Float32Array;
  /** Compute flash attention */
  flashAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number,
    causal: boolean
  ): Float32Array;
  /** Compute linear attention */
  linearAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number,
    numFeatures: number
  ): Float32Array;
  /** Compute hyperbolic distance */
  poincareDistance(
    x: Float32Array,
    y: Float32Array,
    curvature: number
  ): number;
  /** HNSW search */
  hnswSearch(
    query: Float32Array,
    k: number,
    efSearch?: number
  ): { indices: Uint32Array; distances: Float32Array };
}

/**
 * WASM initialization options
 */
export interface WASMInitOptions {
  /** Path to WASM file (for custom builds) */
  wasmPath?: string;
  /** Enable SIMD if available */
  enableSIMD?: boolean;
  /** Thread count for parallel operations */
  numThreads?: number;
  /** Memory limit in bytes */
  memoryLimit?: number;
}
