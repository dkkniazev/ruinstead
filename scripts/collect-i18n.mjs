import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const entries = new Map();
const add = (text, file) => {
  text = text.trim().replace(/\s+/g, ' ');
  if (!/[А-Яа-яЁё]/u.test(text)) return;
  if (!entries.has(text)) entries.set(text, new Set());
  entries.get(text).add(file);
};
const extract = (text, file) => {
  if (/<[a-z!/]/i.test(text)) {
    for (const chunk of text.split(/<[^>]*>/g)) add(chunk, file);
    for (const match of text.matchAll(/(?:aria-label|title|placeholder|alt)=["']([^"']*)["']/g)) add(match[1], file);
  } else add(text, file);
};
function walk(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const file=path.join(dir,ent.name).replaceAll('\\','/');
    if (ent.isDirectory()) {if (!['qa','i18n'].includes(ent.name)) walk(file); continue;}
    if (!file.endsWith('.ts')) continue;
    const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
    const visit=node=>{
      if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) extract(node.text,file);
      else if(ts.isTemplateExpression(node)) {
        extract(node.head.text+node.templateSpans.map((s,i)=>`{${i}}`+s.literal.text).join(''),file);
      }
      ts.forEachChild(node,visit);
    };
    visit(source);
  }
}
walk('src');
const out=[...entries].map(([ru,files])=>({ru,files:[...files]}));
fs.writeFileSync('src/i18n/source-strings.json',JSON.stringify(out,null,2)+'\n');
console.log(`Extracted ${out.length} Russian source strings.`);
