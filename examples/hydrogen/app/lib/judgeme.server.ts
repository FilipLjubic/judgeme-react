import {
  resolveJudgeMeV3AssetDeployment,
  type JudgeMeV3AssetDeployment,
} from '@judgeme-react/core';

let reportedDiscoveryFailure = false;

export async function resolveJudgeMeAssets({
  fallbackAssetBaseUrl,
  shopDomain,
  storefrontUrl,
}: {
  fallbackAssetBaseUrl?: string;
  shopDomain: string;
  storefrontUrl?: string;
}): Promise<JudgeMeV3AssetDeployment | null> {
  try {
    return await resolveJudgeMeV3AssetDeployment({
      fallbackAssetBaseUrl,
      shopDomain,
      storefrontUrl,
    });
  } catch (error) {
    if (!reportedDiscoveryFailure) {
      reportedDiscoveryFailure = true;
      console.error(
        'Judge.me exact widgets are disabled because v3 asset discovery failed.',
        error,
      );
    }
    return null;
  }
}
