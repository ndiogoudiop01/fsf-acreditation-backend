const fs = require('node:fs');
const path = require('node:path');

/**
 * Fait respecter le monolithe modulaire (docs/adr/0001-monolithe-modulaire.md) :
 * un module metier ne doit jamais importer les internes (domain/application/
 * infrastructure) d'un AUTRE module — seulement sa façade publique
 * (`xxx.module.ts`, `xxx.facade.ts`, `presentation/`) ou un evenement de
 * domaine. Les regles sont generees dynamiquement, une par module trouve
 * sous `src/modules`, car dependency-cruiser ne supporte pas les
 * back-references entre `from` et `to`.
 */
const modulesDir = path.join(__dirname, 'src', 'modules');
const moduleNames = fs.existsSync(modulesDir)
  ? fs.readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

const boundaryRules = moduleNames.map((name) => ({
  name: `no-cross-module-internals-${name}`,
  comment: `Seul le module '${name}' peut importer ses propres domain/application/infrastructure.`,
  severity: 'error',
  from: { path: `^src/(?!modules/${name}/)` },
  to: { path: `^src/modules/${name}/(domain|application|infrastructure)/` },
}));

module.exports = {
  forbidden: [
    ...boundaryRules,
    {
      name: 'no-domain-depends-on-framework',
      comment: 'La couche domaine ne doit dependre ni de Nest, ni de Prisma, ni du framework HTTP.',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: '(node_modules/@nestjs|node_modules/@prisma|node_modules/express)' },
    },
    {
      name: 'no-circular',
      comment: 'Aucune dependance circulaire entre fichiers TypeScript.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$' },
  },
};
