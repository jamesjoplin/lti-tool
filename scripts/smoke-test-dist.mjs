const packages = [
  '@lti-tool/core',
  '@lti-tool/d1',
  '@lti-tool/dynamodb',
  '@lti-tool/hono',
  '@lti-tool/memory',
  '@lti-tool/mysql',
  '@lti-tool/postgresql',
];

for (const packageName of packages) {
  await import(packageName);
  console.log(`✓ ${packageName}`);
}
