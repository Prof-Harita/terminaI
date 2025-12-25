import { DesktopDriver } from './types';
import { LinuxAtspiDriver } from './linuxAtspiDriver';
import { WindowsUiaDriver } from './windowsUiaDriver';
import { MockDriver } from './mockDriver';
import * as os from 'os';

let instance: DesktopDriver | undefined;

export function getDesktopDriver(): DesktopDriver {
  if (instance) return instance;

  const platform = os.platform();

  if (platform === 'linux') {
    instance = new LinuxAtspiDriver();
  } else if (platform === 'win32') {
    instance = new WindowsUiaDriver();
  } else {
    // Fallback or Mock (or throw?)
    // For now, let's use MockDriver if env var says so, or just log generic
    console.warn(
      `GUI Automation: Platform ${platform} not explicitly supported, using MockDriver.`,
    );
    instance = new MockDriver();
  }

  return instance;
}
