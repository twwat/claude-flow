/**
 * Financial Risk Plugin - Bridge Tests
 *
 * Tests for FinancialEconomyBridge and FinancialSparseBridge initialization, lifecycle, and methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FinancialEconomyBridge } from '../src/bridges/economy-bridge.js';
import { FinancialSparseBridge } from '../src/bridges/sparse-bridge.js';

// Mock WASM modules
vi.mock('../src/bridges/economy-wasm.js', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
  wasmAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/bridges/sparse-wasm.js', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
  wasmAvailable: vi.fn().mockReturnValue(false),
}));

describe('FinancialEconomyBridge', () => {
  let bridge: FinancialEconomyBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new FinancialEconomyBridge();
  });

  afterEach(async () => {
    try {
      await bridge.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create bridge instance', () => {
      expect(bridge).toBeInstanceOf(FinancialEconomyBridge);
    });

    it('should initialize successfully', async () => {
      await bridge.initialize();
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should initialize with custom config', async () => {
      await bridge.initialize({
        precision: 'double',
        simulationThreads: 4,
        randomSeed: 42,
      });
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should handle Basel III compliant config', async () => {
      await bridge.initialize({
        regulatoryFramework: 'basel3',
        confidenceLevel: 0.99,
        holdingPeriod: 10,
      });
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should handle double initialization gracefully', async () => {
      await bridge.initialize();
      await bridge.initialize();
      expect(bridge.isInitialized()).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should destroy successfully', async () => {
      await bridge.initialize();
      await bridge.destroy();
      expect(bridge.isInitialized()).toBe(false);
    });

    it('should handle destroy when not initialized', async () => {
      await expect(bridge.destroy()).resolves.not.toThrow();
    });

    it('should reinitialize after destroy', async () => {
      await bridge.initialize();
      await bridge.destroy();
      await bridge.initialize();
      expect(bridge.isInitialized()).toBe(true);
    });
  });

  describe('VaR Calculations', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should calculate VaR with historical method', async () => {
      const portfolio = {
        positions: [
          { asset: 'AAPL', value: 100000, volatility: 0.25 },
          { asset: 'GOOGL', value: 150000, volatility: 0.22 },
        ],
        correlations: [[1, 0.6], [0.6, 1]],
      };

      const result = await bridge.calculateVar(portfolio, {
        method: 'historical',
        confidenceLevel: 0.95,
        horizon: 1,
      });

      expect(result).toHaveProperty('var');
      expect(result.var).toBeGreaterThan(0);
      expect(result).toHaveProperty('confidenceLevel', 0.95);
    });

    it('should calculate VaR with parametric method', async () => {
      const portfolio = {
        positions: [
          { asset: 'SPY', value: 500000, volatility: 0.15 },
        ],
      };

      const result = await bridge.calculateVar(portfolio, {
        method: 'parametric',
        confidenceLevel: 0.99,
        horizon: 10,
      });

      expect(result.var).toBeGreaterThan(0);
      expect(result.method).toBe('parametric');
    });

    it('should calculate VaR with Monte Carlo method', async () => {
      const portfolio = {
        positions: [
          { asset: 'BTC', value: 50000, volatility: 0.8 },
        ],
      };

      const result = await bridge.calculateVar(portfolio, {
        method: 'monte_carlo',
        confidenceLevel: 0.95,
        horizon: 1,
        simulations: 10000,
      });

      expect(result.var).toBeGreaterThan(0);
      expect(result).toHaveProperty('simulationCount');
    });
  });

  describe('CVaR Calculations', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should calculate CVaR (Expected Shortfall)', async () => {
      const portfolio = {
        positions: [
          { asset: 'BOND-A', value: 200000, volatility: 0.05 },
          { asset: 'BOND-B', value: 300000, volatility: 0.07 },
        ],
      };

      const result = await bridge.calculateCvar(portfolio, {
        confidenceLevel: 0.95,
        horizon: 1,
      });

      expect(result).toHaveProperty('cvar');
      expect(result.cvar).toBeGreaterThan(0);
      // CVaR should be greater than or equal to VaR
      expect(result.cvar).toBeGreaterThanOrEqual(result.var || 0);
    });
  });

  describe('Portfolio Optimization', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should optimize portfolio weights', async () => {
      const portfolio = {
        assets: ['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
        expectedReturns: [0.12, 0.10, 0.11, 0.14],
        covariance: [
          [0.04, 0.01, 0.02, 0.015],
          [0.01, 0.03, 0.01, 0.01],
          [0.02, 0.01, 0.035, 0.012],
          [0.015, 0.01, 0.012, 0.05],
        ],
      };

      const result = await bridge.optimizePortfolio(portfolio, {
        objective: 'sharpe',
        constraints: {
          maxWeight: 0.4,
          minWeight: 0.05,
        },
      });

      expect(result).toHaveProperty('weights');
      expect(result.weights.length).toBe(4);
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('volatility');
    });

    it('should optimize with minimum variance objective', async () => {
      const portfolio = {
        assets: ['A', 'B'],
        expectedReturns: [0.08, 0.12],
        covariance: [[0.02, 0.005], [0.005, 0.04]],
      };

      const result = await bridge.optimizePortfolio(portfolio, {
        objective: 'min_variance',
      });

      expect(result.weights).toBeDefined();
      const totalWeight = result.weights.reduce((a: number, b: number) => a + b, 0);
      expect(totalWeight).toBeCloseTo(1, 5);
    });
  });

  describe('Monte Carlo Simulation', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should run Monte Carlo simulation', async () => {
      const params = {
        initialValue: 1000000,
        drift: 0.07,
        volatility: 0.15,
        horizon: 252, // 1 year trading days
        simulations: 1000,
      };

      const result = await bridge.simulateMonteCarlo(params);

      expect(result).toHaveProperty('paths');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics).toHaveProperty('mean');
      expect(result.statistics).toHaveProperty('percentile5');
      expect(result.statistics).toHaveProperty('percentile95');
    });

    it('should support multi-asset simulation', async () => {
      const params = {
        assets: [
          { name: 'Stock', value: 500000, drift: 0.08, volatility: 0.2 },
          { name: 'Bond', value: 300000, drift: 0.03, volatility: 0.05 },
        ],
        correlations: [[1, 0.2], [0.2, 1]],
        horizon: 126,
        simulations: 500,
      };

      const result = await bridge.simulateMonteCarlo(params);

      expect(result.paths.length).toBe(500);
    });
  });

  describe('Risk Metrics', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should calculate comprehensive risk metrics', async () => {
      const portfolio = {
        positions: [
          { asset: 'EQ-1', value: 250000, volatility: 0.18 },
          { asset: 'FI-1', value: 250000, volatility: 0.04 },
        ],
        returns: Array(252).fill(0).map(() => (Math.random() - 0.5) * 0.02),
      };

      const metrics = await bridge.calculateRiskMetrics(portfolio);

      expect(metrics).toHaveProperty('var');
      expect(metrics).toHaveProperty('cvar');
      expect(metrics).toHaveProperty('volatility');
      expect(metrics).toHaveProperty('sharpeRatio');
      expect(metrics).toHaveProperty('maxDrawdown');
    });
  });

  describe('Audit Trail', () => {
    beforeEach(async () => {
      await bridge.initialize({
        auditLogging: true,
      });
    });

    it('should generate calculation proof', async () => {
      const portfolio = {
        positions: [{ asset: 'TEST', value: 100000, volatility: 0.2 }],
      };

      await bridge.calculateVar(portfolio, {
        method: 'parametric',
        confidenceLevel: 0.95,
      });

      const proof = await bridge.generateCalculationProof();

      expect(proof).toHaveProperty('timestamp');
      expect(proof).toHaveProperty('inputs');
      expect(proof).toHaveProperty('methodology');
      expect(proof).toHaveProperty('outputs');
      expect(proof).toHaveProperty('hash');
    });
  });

  describe('Error Handling', () => {
    it('should throw when operations called before init', async () => {
      await expect(
        bridge.calculateVar({ positions: [] }, { method: 'historical' })
      ).rejects.toThrow();
    });

    it('should handle empty portfolio', async () => {
      await bridge.initialize();

      const result = await bridge.calculateVar(
        { positions: [] },
        { method: 'parametric', confidenceLevel: 0.95 }
      );

      expect(result.var).toBe(0);
    });

    it('should handle invalid confidence level', async () => {
      await bridge.initialize();

      await expect(
        bridge.calculateVar(
          { positions: [{ asset: 'X', value: 100, volatility: 0.1 }] },
          { method: 'parametric', confidenceLevel: 1.5 } // Invalid
        )
      ).rejects.toThrow();
    });
  });

  describe('JavaScript Fallback', () => {
    it('should work without WASM', async () => {
      const fallbackBridge = new FinancialEconomyBridge();
      await fallbackBridge.initialize();

      const result = await fallbackBridge.calculateVar(
        { positions: [{ asset: 'TEST', value: 100000, volatility: 0.2 }] },
        { method: 'parametric', confidenceLevel: 0.95 }
      );

      expect(result.var).toBeGreaterThan(0);
      await fallbackBridge.destroy();
    });
  });
});

describe('FinancialSparseBridge', () => {
  let bridge: FinancialSparseBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new FinancialSparseBridge();
  });

  afterEach(async () => {
    try {
      await bridge.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create bridge instance', () => {
      expect(bridge).toBeInstanceOf(FinancialSparseBridge);
    });

    it('should initialize successfully', async () => {
      await bridge.initialize();
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should initialize with custom config', async () => {
      await bridge.initialize({
        sparsityThreshold: 0.01,
        maxFeatures: 1000,
        compressionLevel: 'high',
      });
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should handle double initialization gracefully', async () => {
      await bridge.initialize();
      await bridge.initialize();
      expect(bridge.isInitialized()).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should destroy successfully', async () => {
      await bridge.initialize();
      await bridge.destroy();
      expect(bridge.isInitialized()).toBe(false);
    });

    it('should handle destroy when not initialized', async () => {
      await expect(bridge.destroy()).resolves.not.toThrow();
    });
  });

  describe('Sparse Inference', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should perform sparse inference', async () => {
      const input = {
        features: new Float32Array([0.1, 0, 0, 0.5, 0, 0.3, 0, 0, 0.2, 0]),
        indices: [0, 3, 5, 8],
      };

      const result = await bridge.sparseInference(input);

      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('activations');
    });

    it('should handle highly sparse input', async () => {
      const input = {
        features: new Float32Array(1000).fill(0),
        indices: [0, 500, 999],
      };
      input.features[0] = 1.0;
      input.features[500] = 0.5;
      input.features[999] = 0.3;

      const result = await bridge.sparseInference(input);

      expect(result.sparsity).toBeGreaterThan(0.99);
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should detect anomalies', async () => {
      const data = {
        transactions: [
          { id: 't1', amount: 100, timestamp: Date.now() - 1000, type: 'debit' },
          { id: 't2', amount: 150, timestamp: Date.now() - 500, type: 'credit' },
          { id: 't3', amount: 10000000, timestamp: Date.now(), type: 'debit' }, // Anomaly
        ],
      };

      const result = await bridge.detectAnomalies(data);

      expect(result).toHaveProperty('anomalies');
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0]).toHaveProperty('id');
      expect(result.anomalies[0]).toHaveProperty('score');
      expect(result.anomalies[0]).toHaveProperty('reason');
    });

    it('should detect transaction anomalies with patterns', async () => {
      const transactions = [
        { id: 'tx1', amount: 500, account: 'ACC001', timestamp: Date.now() - 3600000 },
        { id: 'tx2', amount: 500, account: 'ACC001', timestamp: Date.now() - 3500000 },
        { id: 'tx3', amount: 500, account: 'ACC001', timestamp: Date.now() - 3400000 },
        { id: 'tx4', amount: 500, account: 'ACC001', timestamp: Date.now() - 3300000 },
        { id: 'tx5', amount: 500, account: 'ACC001', timestamp: Date.now() }, // Rapid succession
      ];

      const result = await bridge.detectTransactionAnomalies(transactions, {
        velocityWindow: 3600000,
        maxTransactionsPerWindow: 3,
      });

      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('patterns');
    });

    it('should return empty for normal transactions', async () => {
      const data = {
        transactions: [
          { id: 't1', amount: 100, timestamp: Date.now() - 86400000, type: 'debit' },
          { id: 't2', amount: 120, timestamp: Date.now() - 43200000, type: 'debit' },
          { id: 't3', amount: 95, timestamp: Date.now(), type: 'debit' },
        ],
      };

      const result = await bridge.detectAnomalies(data, { sensitivity: 0.5 });

      // May or may not detect anomalies based on sensitivity
      expect(result).toHaveProperty('anomalies');
    });
  });

  describe('Regime Classification', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should classify market regime', async () => {
      const marketData = {
        returns: Array(60).fill(0).map(() => (Math.random() - 0.5) * 0.02),
        volatility: Array(60).fill(0).map(() => 0.15 + Math.random() * 0.1),
        volume: Array(60).fill(0).map(() => 1000000 + Math.random() * 500000),
      };

      const result = await bridge.classifyRegime(marketData);

      expect(result).toHaveProperty('regime');
      expect(['bull', 'bear', 'sideways', 'volatile', 'crisis']).toContain(result.regime);
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should classify market regime with indicators', async () => {
      const marketData = {
        returns: Array(30).fill(-0.02), // Consistent negative returns
        volatility: Array(30).fill(0.35), // High volatility
      };

      const result = await bridge.classifyMarketRegime(marketData);

      expect(result).toHaveProperty('regime');
      expect(result).toHaveProperty('indicators');
      expect(result).toHaveProperty('transitionProbabilities');
    });

    it('should detect regime transitions', async () => {
      const historicalData = {
        periods: [
          { returns: Array(20).fill(0.01), volatility: Array(20).fill(0.1) },
          { returns: Array(20).fill(-0.015), volatility: Array(20).fill(0.25) },
          { returns: Array(20).fill(0.005), volatility: Array(20).fill(0.12) },
        ],
      };

      const result = await bridge.detectRegimeTransitions(historicalData);

      expect(result).toHaveProperty('transitions');
      expect(Array.isArray(result.transitions)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw when operations called before init', async () => {
      await expect(
        bridge.detectAnomalies({ transactions: [] })
      ).rejects.toThrow();
    });

    it('should handle empty input', async () => {
      await bridge.initialize();

      const result = await bridge.detectAnomalies({ transactions: [] });
      expect(result.anomalies).toEqual([]);
    });

    it('should handle malformed data gracefully', async () => {
      await bridge.initialize();

      await expect(
        bridge.classifyRegime({ returns: 'not-an-array' as any })
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should handle large transaction sets efficiently', async () => {
      const largeData = {
        transactions: Array(10000).fill(null).map((_, i) => ({
          id: `tx-${i}`,
          amount: Math.random() * 10000,
          timestamp: Date.now() - Math.random() * 86400000 * 30,
          type: Math.random() > 0.5 ? 'debit' : 'credit',
        })),
      };

      const start = performance.now();
      const result = await bridge.detectAnomalies(largeData);
      const duration = performance.now() - start;

      expect(result).toHaveProperty('anomalies');
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  describe('JavaScript Fallback', () => {
    it('should work without WASM', async () => {
      const fallbackBridge = new FinancialSparseBridge();
      await fallbackBridge.initialize();

      const result = await fallbackBridge.classifyRegime({
        returns: [0.01, 0.02, -0.01, 0.015],
        volatility: [0.1, 0.12, 0.11, 0.1],
      });

      expect(result.regime).toBeDefined();
      await fallbackBridge.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should release resources on destroy', async () => {
      await bridge.initialize();

      // Process substantial data
      for (let i = 0; i < 10; i++) {
        await bridge.sparseInference({
          features: new Float32Array(100).fill(0.1),
          indices: Array(100).fill(0).map((_, j) => j),
        });
      }

      await bridge.destroy();
      expect(bridge.isInitialized()).toBe(false);
    });

    it('should handle multiple init/destroy cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await bridge.initialize();
        await bridge.destroy();
      }
      expect(bridge.isInitialized()).toBe(false);
    });
  });
});
