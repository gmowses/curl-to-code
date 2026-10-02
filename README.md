# curl to Code

Convert a limited set of curl commands into request examples for Python, JavaScript, Go, and PHP.

## Features

- Supports URLs, `-X`/`--request`, `-H`/`--header`, `-d` data flags, and `-u`/`--user`
- Generates escaped string literals for Python requests, browser fetch, Go net/http, and PHP cURL
- English and Portuguese UI with light and dark themes

## Local development

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Use `npm run lint`, `npm test`, and `npm run build` before changes are submitted.

## Data and limits

Conversion runs entirely in the browser; commands are not sent to a server. This is a convenience converter, not a complete shell or curl parser. Complex shell expansion, command substitution, multipart uploads, cookie jars, proxies, certificates, redirects, and every curl flag are outside its supported scope. Review generated code and never paste secrets into untrusted environments.

## License

[MIT](LICENSE)
