#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === 'win32'

function loadEnvPort(envFile, key, fallback) {
  try {
    const content = readFileSync(resolve(__dirname, envFile), 'utf8')
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match ? parseInt(match[1], 10) : fallback
  } catch {
    return fallback
  }
}

function killByName(pattern, description) {
  try {
    if (isWindows) {
      const output = execSync(`tasklist`, { encoding: 'utf8' })
      const lines = output
        .split('\n')
        .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()))
      const pids = new Set()
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/)
        const pid = parts[1]
        if (pid && !isNaN(pid)) pids.add(pid)
      })
      if (pids.size > 0) {
        pids.forEach((pid) => {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
          } catch {}
        })
        console.log(`✓ Killed ${pids.size} ${description} process(es)`)
        return pids.size
      }
    } else {
      execSync(`pkill -9 -f "${pattern}"`, { stdio: 'ignore' })
      console.log(`✓ Killed ${description} processes`)
      return 1
    }
  } catch {}
  return 0
}

function killByPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
      })
      const lines = output
        .split('\n')
        .filter((line) => line.includes('LISTENING'))
      const pids = new Set()
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && !isNaN(pid)) pids.add(pid)
      })
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        } catch {}
      })
    } else {
      const output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' })
      const pids = output
        .trim()
        .split('\n')
        .filter((pid) => pid)
      pids.forEach((pid) => {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        } catch {}
      })
    }
    console.log(`✓ Killed process on port ${port}`)
  } catch {
    console.log(`  No process found on port ${port}`)
  }
}

function checkRemaining() {
  try {
    if (isWindows) {
      const output = execSync(`tasklist`, { encoding: 'utf8' })
      const tsx = output.toLowerCase().includes('tsx')
      const nodemon = output.toLowerCase().includes('nodemon')
      return (tsx ? 1 : 0) + (nodemon ? 1 : 0)
    } else {
      const output = execSync(
        `ps aux | grep -E "tsx.*index.ts|nodemon" | grep -v grep`,
        {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        },
      )
      return output
        .trim()
        .split('\n')
        .filter((line) => line).length
    }
  } catch {
    return 0
  }
}

console.log('Killing all tsx/nodemon processes...')

let killed = 0
killed += killByName('nodemon', 'nodemon')
killed += killByName('tsx.*index.ts', 'tsx')

const backendPort = loadEnvPort('.env', 'PORT', 4500)
const frontendPort = loadEnvPort(
  '../frontend-example/.env.defaults',
  'DEV_FRONTEND_PORT',
  9500,
)
const ports =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map((p) => parseInt(p, 10))
    : [backendPort, frontendPort]

console.log('')
console.log(`Killing processes on ports ${ports.join(', ')}...`)
ports.forEach(killByPort)

await new Promise((r) => setTimeout(r, 1000))

console.log('')
const remaining = checkRemaining()
if (remaining === 0) {
  console.log('✓ All processes killed successfully')
} else {
  console.log(`⚠ Warning: ${remaining} process(es) may still be running`)
}
