/**
 * Legal Contracts Plugin - Validation Script
 * Validates that all MCP tools work correctly with test data.
 */

import {
  legalContractsTools,
  clauseExtractTool,
  riskAssessTool,
  contractCompareTool,
  obligationTrackTool,
  playbookMatchTool,
  toolHandlers,
  createToolContext,
} from '../dist/mcp-tools.js';

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';

interface ValidationResult {
  tool: string;
  passed: boolean;
  error?: string;
}

// Sample contract text for testing
const sampleContract = `
CONFIDENTIALITY AGREEMENT

This Agreement is entered into as of January 1, 2024.

ARTICLE 1 - CONFIDENTIALITY
The receiving party shall maintain the confidentiality of all proprietary information disclosed hereunder. This obligation shall survive for a period of 5 years following termination.

ARTICLE 2 - INDEMNIFICATION
Party A shall indemnify and hold harmless Party B from any claims arising from breach of this Agreement. This is an unlimited indemnification provision.

ARTICLE 3 - TERMINATION
Either party may terminate this Agreement upon 30 days written notice. Upon termination, all confidential information shall be returned or destroyed.

ARTICLE 4 - LIMITATION OF LIABILITY
Neither party shall be liable for indirect, consequential, or punitive damages. Total liability shall not exceed $1,000,000.

ARTICLE 5 - PAYMENT TERMS
Party A shall pay all invoices within 30 days of receipt. Payment shall be made via wire transfer.

ARTICLE 6 - GOVERNING LAW
This Agreement shall be governed by the laws of the State of Delaware.
`;

const comparisonContract = `
CONFIDENTIALITY AGREEMENT

This Agreement is entered into as of February 1, 2024.

ARTICLE 1 - CONFIDENTIALITY
The receiving party shall maintain the confidentiality of all proprietary information disclosed hereunder. This obligation shall survive for a period of 3 years following termination.

ARTICLE 2 - INDEMNIFICATION
Party A shall indemnify and hold harmless Party B from any claims arising from breach of this Agreement, subject to a cap of $500,000.

ARTICLE 3 - TERMINATION
Either party may terminate this Agreement upon 60 days written notice with immediate termination rights for material breach.

ARTICLE 4 - ARBITRATION
Any disputes shall be resolved by binding arbitration in accordance with AAA rules.
`;

async function validateTool(
  name: string,
  handler: (input: unknown, context: unknown) => Promise<{ content: Array<{ type: string; text: string }>; data?: unknown }>,
  input: unknown,
  context: unknown
): Promise<ValidationResult> {
  try {
    const result = await handler(input, context);

    if (!result.content || result.content.length === 0) {
      return { tool: name, passed: false, error: 'No content returned' };
    }

    const parsed = JSON.parse(result.content[0].text);

    if (!parsed.success && parsed.error) {
      return { tool: name, passed: false, error: parsed.error };
    }

    return { tool: name, passed: true };
  } catch (err) {
    return { tool: name, passed: false, error: String(err) };
  }
}

async function main() {
  console.log('Legal Contracts Plugin - MCP Tools Validation\n');
  console.log('='.repeat(60));

  const results: ValidationResult[] = [];
  const context = createToolContext();

  // 1. Clause Extract Tool
  console.log('\n1. Testing legal/clause-extract...');
  results.push(await validateTool(
    'legal/clause-extract',
    clauseExtractTool.handler,
    {
      document: sampleContract,
      clauseTypes: ['confidentiality', 'indemnification', 'termination'],
      jurisdiction: 'US',
    },
    context
  ));

  // 2. Risk Assess Tool
  console.log('2. Testing legal/risk-assess...');
  results.push(await validateTool(
    'legal/risk-assess',
    riskAssessTool.handler,
    {
      document: sampleContract,
      partyRole: 'buyer',
      riskCategories: ['financial', 'operational', 'legal'],
      threshold: 'medium',
    },
    context
  ));

  // 3. Contract Compare Tool
  console.log('3. Testing legal/contract-compare...');
  results.push(await validateTool(
    'legal/contract-compare',
    contractCompareTool.handler,
    {
      baseDocument: sampleContract,
      compareDocument: comparisonContract,
      comparisonMode: 'full',  // Valid options: 'structural', 'semantic', 'full'
      generateRedline: true,
    },
    context
  ));

  // 4. Obligation Track Tool
  console.log('4. Testing legal/obligation-track...');
  results.push(await validateTool(
    'legal/obligation-track',
    obligationTrackTool.handler,
    {
      document: sampleContract,
      obligationTypes: ['payment', 'delivery', 'notification'],
      party: 'Party A',
    },
    context
  ));

  // 5. Playbook Match Tool
  console.log('5. Testing legal/playbook-match...');
  results.push(await validateTool(
    'legal/playbook-match',
    playbookMatchTool.handler,
    {
      document: sampleContract,
      playbook: JSON.stringify({
        id: 'standard-nda',
        name: 'Standard NDA Playbook',
        contractType: 'NDA',
        jurisdiction: 'US',
        partyRole: 'buyer',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        positions: [
          {
            clauseType: 'confidentiality',
            preferredLanguage: 'The receiving party shall maintain the confidentiality of all proprietary information for 5 years.',
            acceptableVariations: ['3-7 year confidentiality period'],
            redLines: ['perpetual confidentiality'],
            fallbackPositions: [],
            negotiationNotes: '',
            businessJustification: '',
          },
        ],
      }),
      strictness: 'moderate',
      suggestAlternatives: true,
    },
    context
  ));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    console.log(`  ${result.passed ? PASS : FAIL} ${result.tool}`);
    if (result.error) {
      console.log(`      Error: ${result.error.slice(0, 100)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('Exported tools:', legalContractsTools.length);
  console.log('Handler map size:', toolHandlers.size);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
