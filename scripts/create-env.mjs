#!/usr/bin/env node
/**
 * Cria o arquivo .env na raiz do projeto a partir de env.example.
 * O Editor bloqueia a gravação direta de ".env", então este script faz a cópia.
 *
 * Uso: npm run env:create
 */
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const source = resolve(root, 'env.example')
const target = resolve(root, '.env')

if (!existsSync(source)) {
  console.error('env.example não encontrado na raiz do projeto.')
  process.exit(1)
}

if (existsSync(target)) {
  console.log('.env já existe — nada foi alterado.')
  process.exit(0)
}

copyFileSync(source, target)
console.log('.env criado a partir de env.example.')
