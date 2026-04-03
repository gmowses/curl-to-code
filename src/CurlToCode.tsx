import { useState, useCallback } from 'react'
import { Sun, Moon, Languages, Copy, Check, Terminal, AlertCircle } from 'lucide-react'

const translations = {
  en: {
    title: 'curl to Code',
    subtitle: 'Convert curl commands to Python, JavaScript, Go, and PHP. Parses -H, -d, -X, -u flags.',
    inputLabel: 'Paste your curl command',
    inputPlaceholder: "curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{\"key\":\"value\"}'",
    convert: 'Convert',
    clear: 'Clear',
    copy: 'Copy',
    copied: 'Copied!',
    targetLang: 'Target language',
    error: 'Could not parse curl command. Make sure it starts with "curl".',
    noOutput: 'Paste a curl command above and click "Convert"',
    builtBy: 'Built by',
  },
  pt: {
    title: 'curl para Codigo',
    subtitle: 'Converta comandos curl para Python, JavaScript, Go e PHP. Interpreta flags -H, -d, -X, -u.',
    inputLabel: 'Cole seu comando curl',
    inputPlaceholder: "curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{\"chave\":\"valor\"}'",
    convert: 'Converter',
    clear: 'Limpar',
    copy: 'Copiar',
    copied: 'Copiado!',
    targetLang: 'Linguagem alvo',
    error: 'Nao foi possivel interpretar o comando curl. Verifique se comeca com "curl".',
    noOutput: 'Cole um comando curl acima e clique em "Converter"',
    builtBy: 'Criado por',
  }
} as const

type Lang = keyof typeof translations
type TargetLang = 'python' | 'javascript' | 'go' | 'php'

interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  auth: { user: string; pass: string } | null
}

function tokenizeCurl(cmd: string): string[] {
  const tokens: string[] = []
  let i = 0
  const s = cmd.trim()
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i++]
      let t = ''
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\' && i + 1 < s.length) { i++; t += s[i] } else { t += s[i] }
        i++
      }
      i++
      tokens.push(t)
    } else {
      let t = ''
      while (i < s.length && !/\s/.test(s[i])) { t += s[i++] }
      tokens.push(t)
    }
  }
  return tokens
}

function parseCurl(cmd: string): ParsedCurl | null {
  const tokens = tokenizeCurl(cmd.replace(/\\\n/g, ' '))
  if (!tokens[0]?.toLowerCase().startsWith('curl')) return null
  let i = 1
  let url = ''
  let method = 'GET'
  const headers: Record<string, string> = {}
  let body: string | null = null
  let auth: { user: string; pass: string } | null = null

  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok === '-X' || tok === '--request') { method = tokens[++i] ?? 'GET'; i++ }
    else if (tok === '-H' || tok === '--header') {
      const h = tokens[++i] ?? ''; i++
      const idx = h.indexOf(':')
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim()
    }
    else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      body = tokens[++i] ?? ''; i++
      if (method === 'GET') method = 'POST'
    }
    else if (tok === '-u' || tok === '--user') {
      const u = tokens[++i] ?? ''; i++
      const [user, pass = ''] = u.split(':')
      auth = { user, pass }
    }
    else if (!tok.startsWith('-') && !url) { url = tok; i++ }
    else i++
  }

  return { url: url || 'https://example.com', method, headers, body, auth }
}

function toPython(p: ParsedCurl): string {
  const lines: string[] = ['import requests', '']
  if (p.auth) lines.push(`auth = ('${p.auth.user}', '${p.auth.pass}')`)

  const hasJson = p.headers['Content-Type']?.includes('application/json')
  if (p.headers && Object.keys(p.headers).length) {
    lines.push('headers = {')
    for (const [k, v] of Object.entries(p.headers)) lines.push(`    '${k}': '${v}',`)
    lines.push('}')
  }

  if (p.body) {
    if (hasJson) {
      try { lines.push(`json_data = ${JSON.stringify(JSON.parse(p.body), null, 4).split('\n').join('\n')}`) }
      catch { lines.push(`data = '${p.body.replace(/'/g, "\\'")}'`) }
    } else {
      lines.push(`data = '${p.body.replace(/'/g, "\\'")}'`)
    }
  }

  lines.push('')
  const method = p.method.toLowerCase()
  const args: string[] = [`'${p.url}'`]
  if (Object.keys(p.headers).length) args.push('headers=headers')
  if (p.body && hasJson) args.push('json=json_data')
  else if (p.body) args.push('data=data')
  if (p.auth) args.push('auth=auth')

  lines.push(`response = requests.${method}(`)
  args.forEach((a, i) => lines.push(`    ${a}${i < args.length - 1 ? ',' : ''}`))
  lines.push(')')
  lines.push('')
  lines.push('print(response.status_code)')
  lines.push('print(response.json())')
  return lines.join('\n')
}

function toJavaScript(p: ParsedCurl): string {
  const lines: string[] = []
  const hasJson = p.headers['Content-Type']?.includes('application/json')

  if (p.auth) {
    lines.push(`const credentials = btoa('${p.auth.user}:${p.auth.pass}')`)
    p.headers['Authorization'] = '${`Basic ${credentials}`}'
    lines.push('')
  }

  lines.push('const response = await fetch(')
  lines.push(`  '${p.url}',`)
  lines.push('  {')
  lines.push(`    method: '${p.method}',`)

  if (Object.keys(p.headers).length) {
    lines.push('    headers: {')
    for (const [k, v] of Object.entries(p.headers)) {
      if (k === 'Authorization' && p.auth) lines.push(`      '${k}': \`Basic \${btoa('${p.auth.user}:${p.auth.pass}')}\`,`)
      else lines.push(`      '${k}': '${v}',`)
    }
    lines.push('    },')
  }

  if (p.body) {
    if (hasJson) lines.push(`    body: JSON.stringify(${p.body}),`)
    else lines.push(`    body: '${p.body.replace(/'/g, "\\'")}',`)
  }

  lines.push('  }')
  lines.push(')')
  lines.push('')
  lines.push('const data = await response.json()')
  lines.push('console.log(response.status, data)')
  return lines.join('\n')
}

function toGo(p: ParsedCurl): string {
  const lines: string[] = [
    'package main',
    '',
    'import (',
    '  "fmt"',
    '  "io"',
    '  "net/http"',
    '  "strings"',
    ')',
    '',
    'func main() {',
  ]

  if (p.body) {
    lines.push(`  body := strings.NewReader(\`${p.body}\`)`)
    lines.push(`  req, _ := http.NewRequest("${p.method}", "${p.url}", body)`)
  } else {
    lines.push(`  req, _ := http.NewRequest("${p.method}", "${p.url}", nil)`)
  }

  for (const [k, v] of Object.entries(p.headers)) {
    lines.push(`  req.Header.Set("${k}", "${v}")`)
  }

  if (p.auth) {
    lines.push(`  req.SetBasicAuth("${p.auth.user}", "${p.auth.pass}")`)
  }

  lines.push('')
  lines.push('  client := &http.Client{}')
  lines.push('  resp, err := client.Do(req)')
  lines.push('  if err != nil {')
  lines.push('    panic(err)')
  lines.push('  }')
  lines.push('  defer resp.Body.Close()')
  lines.push('  respBody, _ := io.ReadAll(resp.Body)')
  lines.push('  fmt.Println(resp.StatusCode, string(respBody))')
  lines.push('}')
  return lines.join('\n')
}

function toPHP(p: ParsedCurl): string {
  const lines: string[] = ['<?php', '', '$ch = curl_init();', '']
  lines.push(`curl_setopt($ch, CURLOPT_URL, '${p.url}');`)
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);')

  if (p.method !== 'GET') {
    if (p.method === 'POST') lines.push('curl_setopt($ch, CURLOPT_POST, true);')
    else lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${p.method}');`)
  }

  if (Object.keys(p.headers).length) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [')
    for (const [k, v] of Object.entries(p.headers)) lines.push(`    '${k}: ${v}',`)
    lines.push(']);')
  }

  if (p.body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${p.body.replace(/'/g, "\\'")}');`)
  if (p.auth) lines.push(`curl_setopt($ch, CURLOPT_USERPWD, '${p.auth.user}:${p.auth.pass}');`)

  lines.push('')
  lines.push('$response = curl_exec($ch);')
  lines.push('$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);')
  lines.push('curl_close($ch);')
  lines.push('')
  lines.push('echo $statusCode . "\\n";')
  lines.push('echo $response . "\\n";')
  return lines.join('\n')
}

const GENERATORS: Record<TargetLang, (p: ParsedCurl) => string> = {
  python: toPython, javascript: toJavaScript, go: toGo, php: toPHP,
}

const LANG_LABELS: Record<TargetLang, string> = {
  python: 'Python (requests)', javascript: 'JavaScript (fetch)', go: 'Go (net/http)', php: 'PHP (curl)',
}

export default function CurlToCode() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [targetLang, setTargetLang] = useState<TargetLang>('python')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark)
  }

  const handleConvert = useCallback(() => {
    if (!input.trim()) return
    const parsed = parseCurl(input.trim())
    if (!parsed) { setError(t.error); setOutput(''); return }
    setError('')
    setOutput(GENERATORS[targetLang](parsed))
  }, [input, targetLang, t.error])

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Terminal size={18} className="text-white" />
            </div>
            <span className="font-semibold">curl to Code</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/curl-to-code" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <label className="font-semibold text-sm">{t.inputLabel}</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                rows={10}
                spellCheck={false}
                className="w-full font-mono text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.targetLang}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(LANG_LABELS) as TargetLang[]).map(l => (
                    <button key={l} onClick={() => setTargetLang(l)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${targetLang === l ? 'bg-orange-500 border-orange-500 text-white' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleConvert} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                  <Terminal size={15} />{t.convert}
                </button>
                <button onClick={() => { setInput(''); setOutput(''); setError('') }}
                  className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">{t.clear}</button>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{LANG_LABELS[targetLang]}</span>
                {output && (
                  <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied ? t.copied : t.copy}
                  </button>
                )}
              </div>
              {output ? (
                <pre className="font-mono text-xs bg-zinc-900 dark:bg-zinc-950 text-green-400 rounded-lg p-3 overflow-auto min-h-[14rem] max-h-[32rem] leading-relaxed whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="flex items-center justify-center min-h-[14rem] rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 text-sm text-center px-4">
                  {t.noOutput}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
