/**
 * Hyperbolic Reasoning Plugin - MCP Tools Tests
 *
 * Tests for MCP tool handlers with mock data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hyperbolicReasoningTools,
  getTool,
  getToolNames,
} from '../src/mcp-tools.js';

describe('hyperbolicReasoningTools', () => {
  it('should export 5 MCP tools', () => {
    expect(hyperbolicReasoningTools).toHaveLength(5);
  });

  it('should have unique tool names', () => {
    const names = hyperbolicReasoningTools.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have required tool properties', () => {
    for (const tool of hyperbolicReasoningTools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.handler).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });
});

describe('getTool', () => {
  it('should return tool by name', () => {
    const tool = getTool('hyperbolic_embed_hierarchy');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('hyperbolic_embed_hierarchy');
  });

  it('should return undefined for unknown tool', () => {
    const tool = getTool('unknown_tool');
    expect(tool).toBeUndefined();
  });
});

describe('getToolNames', () => {
  it('should return array of tool names', () => {
    const names = getToolNames();
    expect(names).toContain('hyperbolic_embed_hierarchy');
    expect(names).toContain('hyperbolic_taxonomic_reason');
    expect(names).toContain('hyperbolic_semantic_search');
    expect(names).toContain('hyperbolic_hierarchy_compare');
    expect(names).toContain('hyperbolic_entailment_graph');
  });
});

describe('hyperbolic_embed_hierarchy handler', () => {
  const tool = getTool('hyperbolic_embed_hierarchy')!;

  it('should handle valid hierarchy input', async () => {
    const input = {
      hierarchy: {
        nodes: [
          { id: 'root', parent: null, label: 'Root' },
          { id: 'child1', parent: 'root', label: 'Child 1' },
          { id: 'child2', parent: 'root', label: 'Child 2' },
          { id: 'grandchild', parent: 'child1', label: 'Grandchild' },
        ],
      },
      model: 'poincare_ball',
      parameters: {
        dimensions: 32,
        curvature: -1.0,
        epochs: 50,
        learningRate: 0.01,
      },
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed).toHaveProperty('embeddings');
    expect(parsed).toHaveProperty('metrics');
    expect(parsed).toHaveProperty('details');
  });

  it('should handle all model types', async () => {
    const models = ['poincare_ball', 'lorentz', 'klein', 'half_plane'];

    for (const model of models) {
      const input = {
        hierarchy: {
          nodes: [{ id: 'root', parent: null }],
        },
        model,
      };

      const result = await tool.handler(input);
      expect(result.isError).toBeUndefined();
    }
  });

  it('should compute embedding metrics', async () => {
    const input = {
      hierarchy: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'child', parent: 'root' },
        ],
      },
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.metrics).toHaveProperty('distortionMean');
    expect(parsed.metrics).toHaveProperty('distortionMax');
    expect(parsed.metrics).toHaveProperty('mapScore');
  });

  it('should return error for empty hierarchy', async () => {
    const input = {
      hierarchy: {
        nodes: [],
      },
    };

    const result = await tool.handler(input);

    expect(result.isError).toBe(true);
  });
});

describe('hyperbolic_taxonomic_reason handler', () => {
  const tool = getTool('hyperbolic_taxonomic_reason')!;

  it('should handle is_a query', async () => {
    const input = {
      query: {
        type: 'is_a',
        subject: 'dog',
        object: 'animal',
      },
      taxonomy: 'wordnet',
      inference: {
        transitive: true,
        fuzzy: false,
        confidence: 0.8,
      },
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed).toHaveProperty('result');
    expect(parsed).toHaveProperty('confidence');
    expect(parsed).toHaveProperty('details');
  });

  it('should handle all query types', async () => {
    const types = ['is_a', 'subsumption', 'lowest_common_ancestor', 'path', 'similarity'];

    for (const type of types) {
      const input = {
        query: {
          type,
          subject: 'concept1',
          object: type !== 'path' ? 'concept2' : undefined,
        },
        taxonomy: 'test-taxonomy',
      };

      const result = await tool.handler(input);
      expect(result.isError).toBeUndefined();
    }
  });

  it('should handle transitive reasoning', async () => {
    const input = {
      query: {
        type: 'is_a',
        subject: 'poodle',
        object: 'mammal',
      },
      taxonomy: 'animals',
      inference: {
        transitive: true,
      },
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.details).toHaveProperty('steps');
  });

  it('should return confidence score', async () => {
    const input = {
      query: {
        type: 'similarity',
        subject: 'cat',
        object: 'dog',
      },
      taxonomy: 'test',
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.confidence).toBeLessThanOrEqual(1);
  });
});

describe('hyperbolic_semantic_search handler', () => {
  const tool = getTool('hyperbolic_semantic_search')!;

  it('should handle valid search input', async () => {
    const input = {
      query: 'machine learning algorithms',
      index: 'knowledge-graph',
      searchMode: 'nearest',
      constraints: {
        maxDepth: 5,
      },
      topK: 10,
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed).toHaveProperty('results');
    expect(parsed).toHaveProperty('details');
  });

  it('should handle all search modes', async () => {
    const modes = ['nearest', 'subtree', 'ancestors', 'siblings', 'cone'];

    for (const searchMode of modes) {
      const input = {
        query: 'test query',
        index: 'test-index',
        searchMode,
      };

      const result = await tool.handler(input);
      expect(result.isError).toBeUndefined();
    }
  });

  it('should respect topK limit', async () => {
    const input = {
      query: 'test',
      index: 'test-index',
      topK: 5,
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.results.length).toBeLessThanOrEqual(5);
  });

  it('should return distance metrics', async () => {
    const input = {
      query: 'test',
      index: 'test-index',
      topK: 3,
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    for (const item of parsed.results) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('distance');
      expect(item.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it('should apply depth constraints', async () => {
    const input = {
      query: 'test',
      index: 'test-index',
      constraints: {
        maxDepth: 3,
        minDepth: 1,
      },
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
  });
});

describe('hyperbolic_hierarchy_compare handler', () => {
  const tool = getTool('hyperbolic_hierarchy_compare')!;

  it('should handle valid comparison input', async () => {
    const input = {
      source: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'a', parent: 'root' },
          { id: 'b', parent: 'root' },
        ],
      },
      target: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'a', parent: 'root' },
          { id: 'c', parent: 'root' },
        ],
      },
      alignment: 'gromov_wasserstein',
      metrics: ['structural_similarity', 'coverage'],
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed).toHaveProperty('similarity');
    expect(parsed).toHaveProperty('alignments');
    expect(parsed).toHaveProperty('details');
  });

  it('should handle all alignment methods', async () => {
    const methods = ['wasserstein', 'gromov_wasserstein', 'tree_edit', 'subtree_isomorphism'];

    for (const alignment of methods) {
      const input = {
        source: { nodes: [{ id: 'root', parent: null }] },
        target: { nodes: [{ id: 'root', parent: null }] },
        alignment,
      };

      const result = await tool.handler(input);
      expect(result.isError).toBeUndefined();
    }
  });

  it('should compute all metrics', async () => {
    const input = {
      source: { nodes: [{ id: 'a', parent: null }] },
      target: { nodes: [{ id: 'b', parent: null }] },
      metrics: ['structural_similarity', 'semantic_similarity', 'coverage', 'precision'],
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.details).toHaveProperty('metrics');
  });

  it('should return node alignments', async () => {
    const input = {
      source: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'child', parent: 'root' },
        ],
      },
      target: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'child', parent: 'root' },
        ],
      },
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(Array.isArray(parsed.alignments)).toBe(true);
    for (const alignment of parsed.alignments) {
      expect(alignment).toHaveProperty('source');
      expect(alignment).toHaveProperty('target');
      expect(alignment).toHaveProperty('confidence');
    }
  });

  it('should identify unmatched nodes', async () => {
    const input = {
      source: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'only-in-source', parent: 'root' },
        ],
      },
      target: {
        nodes: [
          { id: 'root', parent: null },
          { id: 'only-in-target', parent: 'root' },
        ],
      },
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.details).toHaveProperty('unmatchedSource');
    expect(parsed.details).toHaveProperty('unmatchedTarget');
  });
});

describe('hyperbolic_entailment_graph handler', () => {
  const tool = getTool('hyperbolic_entailment_graph')!;

  it('should handle build action', async () => {
    const input = {
      action: 'build',
      concepts: [
        { id: 'c1', text: 'All dogs are animals' },
        { id: 'c2', text: 'Fido is a dog' },
        { id: 'c3', text: 'Fido is an animal' },
      ],
      entailmentThreshold: 0.7,
      transitiveClosure: true,
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed).toHaveProperty('graph');
    expect(parsed).toHaveProperty('details');
  });

  it('should handle query action', async () => {
    const input = {
      action: 'query',
      graphId: 'test-graph',
      query: {
        premise: 'c1',
        hypothesis: 'c3',
      },
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
  });

  it('should handle expand action', async () => {
    const input = {
      action: 'expand',
      graphId: 'test-graph',
      concepts: [
        { id: 'c4', text: 'New concept' },
      ],
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
  });

  it('should handle prune action', async () => {
    const input = {
      action: 'prune',
      graphId: 'test-graph',
      pruneStrategy: 'transitive_reduction',
    };

    const result = await tool.handler(input);

    expect(result.isError).toBeUndefined();
  });

  it('should handle all prune strategies', async () => {
    const strategies = ['none', 'transitive_reduction', 'confidence_threshold'];

    for (const pruneStrategy of strategies) {
      const input = {
        action: 'prune',
        graphId: 'test',
        pruneStrategy,
      };

      const result = await tool.handler(input);
      expect(result.isError).toBeUndefined();
    }
  });

  it('should compute graph statistics', async () => {
    const input = {
      action: 'build',
      concepts: [
        { id: 'c1', text: 'Concept 1' },
        { id: 'c2', text: 'Concept 2' },
      ],
    };

    const result = await tool.handler(input);
    const parsed = JSON.parse(result.content[0].text!);

    expect(parsed.details).toHaveProperty('nodeCount');
    expect(parsed.details).toHaveProperty('edgeCount');
  });
});

describe('Tool metadata', () => {
  it('should have correct categories', () => {
    for (const tool of hyperbolicReasoningTools) {
      expect(tool.category).toBe('hyperbolic');
    }
  });

  it('should have version numbers', () => {
    for (const tool of hyperbolicReasoningTools) {
      expect(tool.version).toBeDefined();
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('should have tags', () => {
    for (const tool of hyperbolicReasoningTools) {
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(tool.tags!.length).toBeGreaterThan(0);
    }
  });
});
