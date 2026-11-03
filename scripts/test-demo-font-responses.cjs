const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const loader = require('next/dist/compiled/@next/font/dist/google/loader').default;
const { findFontFilesInCss } = require('next/dist/compiled/@next/font/dist/google/find-font-files-in-css');
const { fetchCSSFromGoogleFonts } = require('next/dist/compiled/@next/font/dist/google/fetch-css-from-google-fonts');

function staticValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(staticValue);
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('Font options must be static property assignments');
      }
      const key = property.name.text;
      if (key === '__proto__' || Object.hasOwn(result, key)) throw new Error('Invalid static font option');
      result[key] = staticValue(property.initializer);
    }
    return result;
  }
  throw new Error('Font options must be static literals');
}

function extractFontOptions(source) {
  const file = ts.createSourceFile('layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('Invalid layout syntax');
  const calls = { Geist: [], Geist_Mono: [] };
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && Object.hasOwn(calls, node.expression.text)) {
      calls[node.expression.text].push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return Object.fromEntries(Object.entries(calls).map(([name, matches]) => {
    if (matches.length !== 1) throw new Error(`Expected exactly one ${name} call`);
    const args = matches[0].arguments;
    if (args.length !== 1 || !ts.isObjectLiteralExpression(args[0])) throw new Error(`${name} requires static options`);
    return [name, staticValue(args[0])];
  }));
}

async function main() {
  const fixture = path.join(__dirname, 'demo-font-responses.js');
  process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = fixture;
  const responses = require(fixture);
  const layout = readFileSync(path.join(__dirname, '../app/layout.tsx'), 'utf8');
  const sample = `/* Geist({ subsets: ['old'] }) */
    Geist({ variable: '--changed', subsets: ['latin'], display: 'block' });
    Geist_Mono({ subsets: ['latin'] });`;
  assert.deepEqual(extractFontOptions(sample).Geist, {
    variable: '--changed', subsets: ['latin'], display: 'block',
  });
  assert.throws(() => extractFontOptions('Geist({});'), /Geist_Mono/);
  assert.throws(() => extractFontOptions(`${sample}\nGeist({});`), /Geist/);
  assert.throws(() => extractFontOptions('Geist(options); Geist_Mono({});'), /static/i);
  assert.throws(() => extractFontOptions('Geist({ ...options }); Geist_Mono({});'), /static/i);
  const options = extractFontOptions(layout);
  for (const [name, local] of [
    ['Geist', 'Arial'],
    ['Geist_Mono', 'Courier New'],
  ]) {
    const result = await loader({ functionName: name, data: [options[name]],
      emitFontFile() { throw new Error('Unexpected font file fetch'); }, isDev: false, isServer: true });
    assert.equal(result.variable, options[name].variable);
    assert.match(result.css, new RegExp(`src: local\\("${local}"\\)`));
    assert.deepEqual(findFontFilesInCss(result.css, ['latin']), []);
    assert.doesNotMatch(result.css, /url\s*\(/i);
  }
  await assert.rejects(loader({ functionName: 'Geist', data: [extractFontOptions(sample).Geist],
    emitFontFile() { throw new Error('Unexpected font file fetch'); }, isDev: false, isServer: true }), /Failed to fetch.*Geist/);
  assert.equal(Object.keys(responses).length, 2);
  await assert.rejects(fetchCSSFromGoogleFonts('https://fonts.googleapis.com/missing', 'Missing', false), /Missing mocked response/);
  console.log('Demo font responses passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
