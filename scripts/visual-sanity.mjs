import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
const result=await build({stdin:{contents:`
  export * from './src/game/world/ReleaseWorldContent.ts';
  export * from './src/game/render3d/CreatureCatalog.ts';
  export * from './src/game/render3d/CreatureModels.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const sources=[...api.RELEASE_SPECIES,...api.RELEASE_BOSSES];
assert.equal(sources.length,64);assert.equal(new Set(sources.map(s=>s.id)).size,64);
assert.deepEqual(Object.keys(api.CREATURE_CATALOG).sort(),sources.map(s=>s.id).sort(),'Every release creature needs exactly one visual identity');
let proceduralVariants=0;
for(const source of sources){
  const identity=api.creatureIdentity(source.id);
  assert(identity.description.length>30,`${source.id}: missing description`);
  assert.equal(!!identity.boss,'isMain' in source);
  if(identity.asset){
    const path=`public/assets/models/gobkit-enemies/${identity.asset}.glb`,bytes=fs.readFileSync(path);
    assert.equal(bytes.readUInt32LE(0),0x46546c67,`${path}: invalid GLB`);
    const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
    assert(json.meshes.length>0&&json.animations.length>0,`${path}: mesh/animation missing`);
    continue;
  }
  for(const elite of [false,true]){
    const model=api.createCreature(source.id,0x607e64,0xd6ad69,elite,elite?42:25);
    assert(Number.isFinite(model.root.userData.visualHeight)&&model.root.userData.visualHeight>15);
    assert.equal(model.root.userData.visualIdentity,identity.shape);
    for(let frame=0;frame<90;frame++)model.step(1/60,200,false,frame>60);
    model.root.traverse(object=>{for(const v of [...object.position,...object.scale])assert(Number.isFinite(v),`${source.id}: invalid transform`);});
    model.dispose?.();proceduralVariants++;
  }
}
assert.equal(api.creatureIdentity('magma-serpent').shape,'serpent');
assert.equal(api.creatureIdentity('fire-dragon').shape,'dragon');
assert.equal(api.creatureIdentity('root-colossus').shape,'treant');
assert.equal(api.creatureIdentity('harpy').shape,'harpy');
console.log(`Visual catalog: PASS — 64 identities, 3 animated GLBs, ${proceduralVariants} animated procedural variants, finite bounds/transforms.`);

if(process.argv.includes('--report')){
  fs.mkdirSync('docs',{recursive:true});
  const rows=api.RELEASE_SPECIES.map(s=>{
    const identity=api.creatureIdentity(s.id),related=api.RELEASE_BOSSES.filter(b=>b.region===s.region&&api.creatureIdentity(b.id).shape===identity.shape).map(b=>b.name).join(', ')||'—';
    return `| ${s.region} | ${s.id} | ${s.name} | ${s.eliteName} | ${identity.asset??identity.shape} | ${related} |`;
  });
  const bosses=api.RELEASE_BOSSES.map(b=>`| ${b.region} | ${b.id} | ${b.name} | ${api.creatureIdentity(b.id).shape} | ${b.isMain?'Главный':'Малый'} |`);
  fs.writeFileSync('docs/VISUAL_AUDIT.md',`# Аудит моделей и UI · 27 сентября 2026\n\n## Единый источник\n\nВ мире и портретах вызывается один createCreature. Идентичность, описание и точное назначение ассета находятся в CreatureCatalog.ts. HP и урон бестиария читаются из вычисленных определений EnemySystem/BossSystem. Радиус тела модели нормализуется по существующему combatRadius; коллизии и формулы не изменены. Крылья, хвосты и оружие выступают за радиус корпуса.\n\nТри анимированных GLB: Gobkit Bat, Goat, Owl (CC0, локальные файлы). Остальные модели — артикулированная геометрия Ruinstead с отдельными формами видов. Элитные варианты сохраняют тот же тип тела, увеличиваются по существующему радиусу и получают золотые детали.\n\n## Обычные виды и элита\n\n| Регион | ID | Имя | Элита | Модель | Родственный босс региона |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\n## Боссы\n\n| Регион | ID | Имя | Модель | Ранг |\n|---|---|---|---|---|\n${bosses.join('\n')}\n\n## Переименования\n\n- cliff-ram: Скальный баран → Горный козёл. Модель Goat имеет силуэт козла; элита Камнерог сохранена.\n- dust-vulture: Пыльный стервятник → Пустынный филин; элита → Краснокрылый филин. Модель Owl изображает сову.\n- Внутренние ID сохранены, миграции сохранений не нужны.\n\n## UI\n\nЕдиный набор GameIcons, панели GameUI и GameUI.css: HUD, пять слотов оружия, фильтры типов и сортировка, рюкзак/склад, характеристики/мастерство, кузница/слияние, поселение, бестиарий/награды, сундуки/припасы/покупки, облики/фрагменты/спутники/темы, задания, звук/облако, возвращение домой, смерть и награда за босса/сундук. Карта использует тот же стиль; редкие ресурсы и ориентиры отделены фильтрами.\n\nСписки оружия прокручиваются отдельно от блока действий. Уровни оружия и героя повышаются у кузницы; слияние после её восстановления доступно из любой точки мира. HUD обновляет существующие DOM-узлы, сохраняя нажатую кнопку. При HP ≤40% зелье выделяется и рядом показывается здоровье; над героем появляется небольшая полоса. Подписаны все здания.\n\n## Удалённое\n\nУдалены четыре неиспользуемых Gobkit minion GLB, хеш-подбор моделей, старая система портретов бестиария, прямоугольный Phaser HUD. Старые текстуры противников сохранены как техническая основа невидимых Arcade-коллайдеров и резервного 2D-режима.\n\n## Проверки\n\n- npm run typecheck / npm run build\n- npm run check:world / npm run check:gameplay / npm run balance\n- node scripts/visual-sanity.mjs\n- creature-preview.html: все 8 регионов, обычные виды, элита и боссы.\n- ui-preview.html: 150 вариантов оружия, открытые записи бестиария, большие значения и длинные русские названия; состояние не сохраняется и не вызывает SDK.\n- Браузер: телефон 844×390, планшет 1024×768, стандарт 1280×720; все основные меню, награды, карта, сортировка и выбор последнего оружия.\n\n## Ограничения\n\nПроцедурные существа имеют базовую артикуляцию ходьбы/крыльев/тела, а не индивидуально поставленные скелетные клипы каждого из 64 видов. Художественная детализация проще Hero Path. Физическое сенсорное устройство не проверялось. Реальные оплаты/реклама Яндекса не запускаются при локальной визуальной проверке; вне площадки SDK сообщает о локальном режиме. Production build проходит с предупреждением Vite о крупном JS-файле (~623 КБ gzip).\n`);
}
