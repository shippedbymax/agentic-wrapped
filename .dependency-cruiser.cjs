/**
 * Layer rules. Dependencies point inwards only:
 *   cli -> adapters, renderers -> core
 */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'core must not import adapters, renderers, cli, Node built-ins or npm packages.',
      severity: 'error',
      from: { path: '^src/core', pathNot: '\\.test\\.ts$' },
      to: {
        pathNot: '^src/core',
      },
    },
    {
      name: 'adapters-only-know-core',
      severity: 'error',
      from: { path: '^src/adapters' },
      to: { path: '^src/(renderers|cli)' },
    },
    {
      name: 'renderers-only-know-core',
      severity: 'error',
      from: { path: '^src/renderers' },
      to: { path: '^src/(adapters|cli)' },
    },
    {
      name: 'adapters-do-not-know-each-other',
      severity: 'error',
      from: { path: '^src/adapters/([^/]+)/' },
      to: {
        path: '^src/adapters/([^/]+)/',
        pathNot: ['^src/adapters/$1/', '^src/adapters/shared/'],
      },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
