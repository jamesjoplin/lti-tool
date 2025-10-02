import type { LTILaunchConfig, LTIStorage } from '../interfaces/index.js';

export async function getValidLaunchConfig(
  storage: LTIStorage,
  iss: string,
  clientId: string,
  deploymentId: string,
): Promise<LTILaunchConfig> {
  const launchConfig = await storage.getLaunchConfig(iss, clientId, deploymentId);

  if (!launchConfig) {
    throw new Error('No valid launch config found');
  }

  return launchConfig;
}
