import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const manifestPath = resolve(process.argv[2] ?? 'website/public/release-manifest.json')
const schemaPath = resolve('release/release-manifest.schema.json')
const [schema, manifest] = await Promise.all([
  readJson(schemaPath),
  readJson(manifestPath)
])

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validate = ajv.compile(schema)

if (!validate(manifest)) {
  const details = (validate.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('\n')
  throw new Error(`Invalid release manifest at ${manifestPath}:\n${details}`)
}

console.log(`Validated release manifest: ${manifestPath}`)

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new Error(
      `Could not read JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
}
