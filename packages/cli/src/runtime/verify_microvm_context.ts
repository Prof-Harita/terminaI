import { MicroVMRuntimeContext } from '../../../../packages/microvm/dist/MicroVMRuntimeContext.js';

async function main() {
  console.log('=== Verifying MicroVM Runtime Context ===');

  const ctx = new MicroVMRuntimeContext();

  console.log('1. Health Check...');
  const health = await ctx.healthCheck();
  console.log('Health:', health);
  if (!health.ok) {
    console.error('Health check failed, skipping verification.');
    return;
  }

  try {
    console.log('2. Initialization (Booting VM)...');
    await ctx.initialize();
    console.log('VM Initialized.');

    console.log('3. Test Execute (echo hello)...');
    const res = await ctx.execute('echo "Hello from MicroVM"');
    console.log('Result:', res);
    if (!res.stdout.includes('Hello from MicroVM')) {
      throw new Error('Execute failed to echo');
    }

    console.log('4. Test Spawn (streaming)...');
    const proc = await ctx.spawn(
      'python3 -c "import time; print(1); time.sleep(0.5); print(2)"',
    );

    proc.stdout?.on('data', (d) => console.log('STDOUT:', d.toString().trim()));
    proc.stderr?.on('data', (d) => console.log('STDERR:', d.toString().trim()));

    await new Promise<void>((resolve, reject) => {
      proc.on('exit', (code) => {
        console.log('Process exited with code:', code);
        if (code === 0) resolve();
        else reject(new Error(`Exit code ${code}`));
      });
      proc.on('error', reject);
    });

    console.log('5. File System Test (Write/Read)...');
    // Since we don't have direct file tools exposed in this test script, we use execute
    await ctx.execute('echo "secret data" > /tmp/secret.txt');
    const readRes = await ctx.execute('cat /tmp/secret.txt');
    console.log('Read Result:', readRes.stdout.trim());
    if (readRes.stdout.trim() !== 'secret data') {
      throw new Error('File system verification failed');
    }
  } catch (e) {
    console.error('Verification Failed:', e);
    process.exit(1);
  } finally {
    console.log('6. Cleanup...');
    await ctx.dispose();
  }
}

main();
