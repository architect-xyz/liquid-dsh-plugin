/**
 * Install-and-boot smoke test: pack the bundle, install the tarball into an
 * isolated profile of a real dsh, and boot it.
 *
 * Checks that a `link:` install or a mock context cannot see: the published
 * surface is complete, `lib/` carries no leftover `.ts` imports (a runtime ESM
 * crash), the host admits the manifest, the composed config carries the
 * `liquid` route and the tools row, and every row activates at boot.
 *
 * The boot ends with MISSING_CREDENTIAL from the default DeepSeek route; that
 * is expected. What must not appear is an inactive entry or a module error.
 *
 *   node scripts/install-test.mjs               # dsh@next
 *   DSH_VERSION=0.2.1-rc.2 node scripts/install-test.mjs
 *
 * Exit: 0 pass, 1 a check failed, 2 could not run.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshSpec = `@deepseek-ai/dsh@${process.env.DSH_VERSION ?? 'next'}`
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 180_000, ...options })
  if (res.error) {
    process.stderr.write(`install-test: could not run ${cmd}: ${res.error.message}\n`)
    process.exit(2)
  }
  return { status: res.status, stdout: res.stdout ?? '', out: `${res.stdout ?? ''}${res.stderr ?? ''}` }
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const scratch = mkdtempSync(join(tmpdir(), 'liquid-dsh-install-'))
try {
  // 1. Build, then make sure the output is runnable ESM.
  const build = run('pnpm', ['run', 'build'])
  check(build.status === 0, `build failed:\n${build.out}`)
  const leftovers = walk(join(root, 'lib'))
    .filter(f => f.endsWith('.js'))
    .filter(f => /from\s+['"]\.[^'"]*\.ts['"]/.test(readFileSync(f, 'utf8')))
  check(leftovers.length === 0, `lib/ imports .ts files (runtime crash): ${leftovers.join(', ')}`)

  // 2. The tarball carries what the host needs.
  const pack = run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', scratch])
  check(pack.status === 0, `npm pack failed:\n${pack.out}`)
  let tarball
  try {
    const [info] = JSON.parse(pack.stdout)
    tarball = join(scratch, info.filename)
    const files = new Set(info.files.map(f => f.path))
    for (const need of ['lib/index.js', 'cordis.patch.yml', 'package.json']) {
      check(files.has(need), `tarball is missing ${need}`)
    }
  } catch (error) {
    check(false, `could not read npm pack output: ${error.message}`)
  }

  if (tarball) {
    // 3. Install into an isolated headless profile (admission checks engines.dsh).
    const env = { ...process.env, DSH_HOME: join(scratch, 'home') }
    for (const key of ['DEEPSEEK_API_KEY', 'LIQUID_API_KEY']) delete env[key]
    const add = run('npx', ['-y', dshSpec, 'plugin', '--profile', 'headless', 'add', tarball], { env })
    check(add.status === 0, `dsh plugin add failed:\n${add.out}`)

    // 4. Composed configuration.
    const dump = run('npx', ['-y', dshSpec, '--profile', 'headless', '--dump-config'], { env })
    check(dump.status === 0, `--dump-config failed:\n${dump.out}`)
    for (const needle of ['id: liquid-tools', 'liquid:', 'x-liquid-cap-usd', 'liquid.auto:cheapest']) {
      check(dump.out.includes(needle), `composed config lacks "${needle}"`)
    }

    // 5. Boot: every row activates; the only expected error is the missing DeepSeek key.
    const boot = run('npx', ['-y', dshSpec, 'headless', 'ping'], { env, timeout: 120_000 })
    check(!/did not activate/.test(boot.out), `an entry did not activate:\n${boot.out}`)
    check(!/ERR_MODULE_NOT_FOUND|SyntaxError|Cannot find (module|package)/.test(boot.out), `module error at boot:\n${boot.out}`)
    check(/MISSING_CREDENTIAL/.test(boot.out), `boot did not reach the model call (expected MISSING_CREDENTIAL):\n${boot.out}`)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

if (failures.length) {
  for (const f of failures) process.stderr.write(`  FAIL  ${f}\n`)
  process.stderr.write(`install-test FAILED (${failures.length})\n`)
  process.exit(1)
}
process.stdout.write(`install-test passed against ${dshSpec}\n`)
