const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Metro (Expo SDK 56) resolves @supabase/supabase-js via the ESM "import"
// condition in package.json exports, landing on index.mjs which contains:
//   import(/* webpackIgnore */ OTEL_PKG)
// Hermes AOT compiler rejects dynamic import() with a non-literal argument.
// Force the CJS build instead — it uses require(s) which Hermes handles fine.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('@opentelemetry/')) {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
