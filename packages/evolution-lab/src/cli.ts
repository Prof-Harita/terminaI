/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Adversary } from './adversary.js';
import { Runner } from './runner.js';
import { Aggregator } from './aggregator.js';
import { DEFAULT_CONFIG } from './types.js';

void yargs(hideBin(process.argv))
  .scriptName('evolution-lab')
  .usage('$0 <command> [options]')
  .command(
    'adversary',
    'Generate synthetic tasks',
    (yargs) =>
      yargs
        .option('count', {
          alias: 'c',
          type: 'number',
          default: 100,
          describe: 'Number of tasks to generate',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          default: 'tasks.json',
          describe: 'Output file path',
        }),
    async (argv) => {
      console.log(`Generating ${argv.count} tasks...`);
      const adversary = new Adversary();
      const tasks = adversary.generateBatch(argv.count);
      await adversary.saveTasks(tasks, argv.output);
      console.log(`Saved ${tasks.length} tasks to ${argv.output}`);
    },
  )
  .command(
    'run',
    'Execute tasks in sandbox',
    (yargs) =>
      yargs
        .option('tasks', {
          alias: 't',
          type: 'string',
          required: true,
          describe: 'Path to tasks.json file',
        })
        .option('parallelism', {
          alias: 'p',
          type: 'number',
          default: DEFAULT_CONFIG.parallelism,
          describe: 'Number of parallel executions',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          default: 'results.json',
          describe: 'Output file for results',
        }),
    async (argv) => {
      const adversary = new Adversary();
      const tasks = await adversary.loadTasks(argv.tasks);
      console.log(`Loaded ${tasks.length} tasks`);

      const config = { ...DEFAULT_CONFIG, parallelism: argv.parallelism };
      const runner = new Runner(config);

      console.log(`Running with parallelism=${config.parallelism}...`);
      const results = await runner.runBatch(tasks, (completed, total) => {
        process.stdout.write(`\rProgress: ${completed}/${total}`);
      });
      console.log('');

      const fs = await import('node:fs/promises');
      await fs.writeFile(argv.output, JSON.stringify(results, null, 2));
      console.log(`Saved results to ${argv.output}`);

      const successful = results.filter((r) => r.success).length;
      console.log(`Success rate: ${successful}/${results.length}`);
    },
  )
  .command(
    'aggregate',
    'Aggregate results and generate report',
    (yargs) =>
      yargs
        .option('results', {
          alias: 'r',
          type: 'string',
          required: true,
          describe: 'Path to results.json file',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          default: 'report.md',
          describe: 'Output file for report',
        }),
    async (argv) => {
      const fs = await import('node:fs/promises');
      const resultsJson = await fs.readFile(argv.results, 'utf-8');
      const results = JSON.parse(resultsJson);

      console.log(`Aggregating ${results.length} results...`);
      const aggregator = new Aggregator();
      await aggregator.addResults(results);
      await aggregator.saveReport(argv.output);
      console.log(`Report saved to ${argv.output}`);
    },
  )
  .command(
    'full',
    'Run full evolution cycle: generate → run → aggregate',
    (yargs) =>
      yargs
        .option('count', {
          alias: 'c',
          type: 'number',
          default: 10,
          describe: 'Number of tasks',
        })
        .option('parallelism', {
          alias: 'p',
          type: 'number',
          default: 2,
          describe: 'Parallelism',
        }),
    async (argv) => {
      console.log('=== Evolution Lab Full Cycle ===');

      // Generate
      console.log(`\n[1/3] Generating ${argv.count} tasks...`);
      const adversary = new Adversary();
      const tasks = adversary.generateBatch(argv.count);
      console.log(`Generated ${tasks.length} tasks across categories`);

      // Run
      console.log(`\n[2/3] Running tasks (parallelism=${argv.parallelism})...`);
      const config = { ...DEFAULT_CONFIG, parallelism: argv.parallelism };
      const runner = new Runner(config);
      const results = await runner.runBatch(tasks, (completed, total) => {
        process.stdout.write(`\rProgress: ${completed}/${total}`);
      });
      console.log('');

      // Aggregate
      console.log('\n[3/3] Aggregating results...');
      const aggregator = new Aggregator();
      await aggregator.addResults(results);

      const successful = results.filter((r) => r.success).length;
      console.log(`\n=== Results ===`);
      console.log(`Success rate: ${successful}/${results.length}`);

      const clusters = aggregator.clusterFailures();
      if (clusters.length > 0) {
        console.log('\nFailure clusters:');
        for (const cluster of clusters) {
          console.log(
            `  - ${cluster.errorType}: ${cluster.affectedSessions} sessions`,
          );
        }
      }

      const reportPath = `evolution-report-${Date.now()}.md`;
      await aggregator.saveReport(reportPath);
      console.log(`\nReport saved to ${reportPath}`);
    },
  )
  .demandCommand(1, 'You must specify a command')
  .help()
  .parse();
