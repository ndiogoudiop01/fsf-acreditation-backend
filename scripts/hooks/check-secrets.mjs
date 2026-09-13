#!/usr/bin/env node
/**
 * Detection minimale de secrets dans le diff stage avant commit. Zero
 * dependance : une liste de motifs suffisants pour attraper les erreurs les
 * plus courantes (cle AWS, bloc de cle privee, jeton generique, .env commit).
 * Volontairement simple ("hook minimum" demande) — pas un remplacement pour
 * un scanner complet (gitleaks, trufflehog) que l'equipe pourra brancher
 * plus tard en CI si le besoin grandit.
 */
import { execSync } from 'node:child_process';

const SECRET_PATTERNS = [
  { name: 'Cle AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Bloc de cle privee', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Jeton GitHub', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'Jeton Slack', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'URL PostgreSQL avec mot de passe', pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]{4,}@/ },
  { name: 'Cle privee generique assignee', pattern: /(secret|password|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{16,}['"]/i },
];

function stagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function main() {
  const files = stagedFiles().filter((f) => !f.match(/\.(png|jpg|jpeg|gif|webp|pdf|ico|lock)$/i));
  let found = false;

  for (const file of files) {
    // Un fichier .env ne doit jamais etre commit (deja gitignore, mais on
    // se protege d'un `git add -f`).
    if (/(^|\/)\.env(\..+)?$/.test(file) && !file.endsWith('.env.example')) {
      console.error(`\n[check-secrets] Fichier d'environnement stage : ${file} — ne jamais commit un .env reel.`);
      found = true;
      continue;
    }

    let content;
    try {
      content = execSync(`git show :${JSON.stringify(file).slice(1, -1)}`, { encoding: 'utf8' });
    } catch {
      continue; // fichier binaire ou supprime
    }

    // `.env.example` documente volontairement le format attendu (ex : un
    // en-tete PEM avec une valeur placeholder) — ce n'est jamais un vrai
    // secret, donc on n'y applique pas la detection de bloc de cle privee.
    const isEnvExample = file.endsWith('.env.example');

    for (const { name, pattern } of SECRET_PATTERNS) {
      if (isEnvExample && name === 'Bloc de cle privee') continue;
      if (pattern.test(content)) {
        console.error(`\n[check-secrets] Motif suspect (${name}) trouve dans : ${file}`);
        found = true;
      }
    }
  }

  if (found) {
    console.error(
      '\nCommit bloque : retirez le secret du code, utilisez les variables d\'environnement (.env, non versionne),\n' +
        'puis recommittez. Si c\'est un faux positif, adaptez scripts/hooks/check-secrets.mjs.\n',
    );
    process.exit(1);
  }
}

main();
