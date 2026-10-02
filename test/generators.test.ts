import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { parseCurl, toGo, toJavaScript, toPHP, toPython } from '../src/CurlToCode.tsx'

const parsed = parseCurl(`curl "https://example.test/a?x=O'Reilly" -H "X-Test: O'Reilly\\\\path" -d "line one
line two" -u "o'reilly:p\\\\ass"`)

test('generates escaped string literals in every supported language', () => {
  assert.ok(parsed)
  const output = [toPython(parsed), toJavaScript(parsed), toGo(parsed), toPHP(parsed)].join('\n')
  assert.match(output, /O'Reilly/)
  assert.match(output, /\\\\path/)
  assert.match(output, /line one[\\n\n]+line two/)
})

test('generated Python parses as Python source', () => {
  assert.ok(parsed)
  const source = toPython(parsed)
  const result = spawnSync('python3', ['-c', 'import ast, sys; ast.parse(sys.stdin.read())'], { input: source })
  assert.equal(result.status, 0, result.stderr.toString())
})

test('preserves malformed JSON bytes and custom HTTP methods as literals', () => {
  const edgeCurl = parseCurl(`curl -X REPORT https://example.test -H "Content-Type: application/json" -d '{"unterminated": true'`)
  assert.ok(edgeCurl)
  const source = toPython(edgeCurl)
  assert.match(source, /requests\.request\(\n {4}"REPORT",/)
  assert.ok(source.includes('data = "{\\"unterminated\\": true"'))
  const result = spawnSync('python3', ['-c', 'import ast, sys; ast.parse(sys.stdin.read())'], { input: source })
  assert.equal(result.status, 0, result.stderr.toString())
})

test('generated JavaScript, Go, and PHP parse without evaluating requests', () => {
  assert.ok(parsed)
  const js = spawnSync('node', ['--input-type=module', '--check'], { input: toJavaScript(parsed) })
  const go = spawnSync('gofmt', ['-d'], { input: toGo(parsed) })
  const php = spawnSync('php', ['-l', '/dev/stdin'], { input: toPHP(parsed) })
  assert.equal(js.status, 0, js.stderr.toString())
  assert.equal(go.status, 0, go.stderr.toString())
  assert.equal(php.status, 0, php.stderr.toString())
})
