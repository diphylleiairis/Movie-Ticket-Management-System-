import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const backend = join(root, 'backend')
const java = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java'
const javaVersion = spawnSync(java, ['-version'], { encoding: 'utf8' })
const versionOutput = `${javaVersion.stdout ?? ''}${javaVersion.stderr ?? ''}`
const majorVersion = Number(versionOutput.match(/version "(?:1\.)?(\d+)/)?.[1])

if (javaVersion.error || javaVersion.status !== 0 || !Number.isFinite(majorVersion) || majorVersion < 21) {
  console.error('Java 21 or newer is required. Set JAVA_HOME to a JDK 21 installation, then rerun npm install.')
  process.exit(1)
}

const command = process.platform === 'win32' ? 'cmd.exe' : './mvnw'
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'mvnw.cmd', '-B', '-ntp', 'dependency:go-offline']
  : ['-B', '-ntp', 'dependency:go-offline']

console.log('Downloading backend Maven dependencies...')
const result = spawnSync(command, args, { cwd: backend, stdio: 'inherit' })

if (result.error) {
  console.error(result.error.message)
}
process.exit(result.status ?? 1)
