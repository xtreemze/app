const fs = require('fs');
const path = require('path');

const customRoot = path.resolve(__dirname, '..', 'custom-definitions', 'v3');
const upstreamRoot = path.resolve(
  __dirname,
  '..',
  'node_modules',
  'via-keyboards',
  'v3',
);

function listJsonFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function vendorProductKey(definition, sourcePath) {
  const {vendorId, productId} = definition;
  if (typeof vendorId !== 'string' || typeof productId !== 'string') {
    throw new Error(
      `Custom VIA definition ${sourcePath} must provide string vendorId and productId`,
    );
  }
  return `${vendorId.toLowerCase()}:${productId.toLowerCase()}`;
}

function readDefinition(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function installCustomDefinitions() {
  if (!fs.existsSync(upstreamRoot)) {
    throw new Error(
      `via-keyboards is not installed at ${upstreamRoot}; run the package install first`,
    );
  }

  const customFiles = listJsonFiles(customRoot);
  if (customFiles.length === 0) {
    console.log('No custom VIA definitions to install.');
    return;
  }

  const customRelativePaths = new Set(
    customFiles.map((filePath) => path.relative(customRoot, filePath)),
  );
  const upstreamByVendorProduct = new Map();

  for (const upstreamFile of listJsonFiles(upstreamRoot)) {
    const relativePath = path.relative(upstreamRoot, upstreamFile);
    if (customRelativePaths.has(relativePath)) {
      continue;
    }

    const definition = readDefinition(upstreamFile);
    if (
      typeof definition.vendorId !== 'string' ||
      typeof definition.productId !== 'string'
    ) {
      continue;
    }

    upstreamByVendorProduct.set(
      vendorProductKey(definition, upstreamFile),
      relativePath,
    );
  }

  for (const customFile of customFiles) {
    const definition = readDefinition(customFile);
    const key = vendorProductKey(definition, customFile);
    const collision = upstreamByVendorProduct.get(key);
    if (collision) {
      throw new Error(
        `Custom VIA definition ${path.relative(customRoot, customFile)} duplicates upstream ${collision} for ${key}. Reconcile the definitions instead of silently shadowing upstream.`,
      );
    }
  }

  for (const customFile of customFiles) {
    const relativePath = path.relative(customRoot, customFile);
    const destination = path.join(upstreamRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(customFile, destination);
    console.log(`Installed custom VIA definition: ${relativePath}`);
  }
}

if (require.main === module) {
  installCustomDefinitions();
}

module.exports = {installCustomDefinitions};
