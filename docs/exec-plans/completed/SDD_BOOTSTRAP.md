# Внедрение SDD

## Status

Completed · documentation/bootstrap only · 2026-10-02.

## Objective

Восстановить контракты текущей игры из кода, связать спецификации, проверки
и планы, устранить подтверждённый documentation drift без изменения runtime.

## Текущая архитектура и области изменения

Phaser/Three.js/DOM, общий GameState schema 29; интеграции через providers.
Изменения: `AGENTS.md`, README, `docs`, новый `scripts/docs-sanity.mjs`,
команда `check:docs` и её подключение к CI. Существующие src/ассеты/тесты не менять.

## Фазы и проверки

1. [x] Исследовать реализацию, тесты, CI, историю; записать SDD_INVESTIGATION.
2. [x] Создать доменные контракты и шаблон feature spec; сверить ссылки с кодом.
3. [x] Обновить AGENTS, snapshot/roadmap/drift, README и статусы старых отчётов.
4. [x] Добавить read-only docs gate; проверить повреждённые ссылки/команды/структуру.
5. [x] Запустить docs/typecheck/build и существующие sanity; зафиксировать сбои.
6. [x] Сравнить SHA256 src/public с началом bootstrap, проверить итоговый diff.
7. [x] Перенести этот план в completed; оставить NEXT_MILESTONE active, без реализации.

## Риски и завершение

Не превратить планы в якобы существующие функции; не потерять историю/миграции;
не принять fixture SDK или повторный PASS за живой QA. Новая проверка документации
не должна исполнять код из Markdown или ходить в сеть. Завершение: все обязательные
документы связаны, команды/ссылки валидны, drift отмечен, проверки честно отражены,
runtime не изменён. Известный случайный сбой генератора оставить явно открытым.

## Итог и доказательства

Созданы 10 связанных доменных/project/QA specs, шаблон, Approved визуальная
feature и Draft spawn feature, current state/roadmap/drift/investigation, план
следующего milestone. AGENTS требует автоматического обновления спецификаций.
README стал onboarding-документом; прежний текст целиком сохранён в
[HISTORICAL_DESIGN](../../HISTORICAL_DESIGN.md). SHA256 исходного тела архива:
`C98E40289269259FF1E133254DCE12679271680F2AE2B3711F5CF6E9075A7986`.

Добавлены только docs-sanity, check:docs и docs gate в CI. Предыдущие локальные
изменения package (sculpt gate/bake) и runtime сохранены, не выдаются за SDD-правки.

Выполнено в этом задании:

- `npm run balance`, `npm run check:world`, `npm run check:gameplay`,
  `npm run check:polish`, `npm run check:regressions`, `npm run check:art`,
  `npm run check:campaign` — PASS.
- `npm run check:release` — первый FAIL на случайном spawn import, повторный
  PASS. Дефект открыт; тесты/генератор не изменены и не ослаблены.
- `npm run typecheck`, `npm run build` — PASS. Vite предупреждает о JS chunk
  2604.84 КБ / gzip 745.34 КБ; это не аппаратный benchmark.
- `npm run check:docs`, `npm run check:docs -- --self-test` — PASS; 21 canonical
  документа, package/direct-script inventory, negative link/path/anchor/command/
  status/structure fixtures. Документация не исполняется, сеть не используется.
- `git diff --check` — PASS. Конфигурация CI проверена: только новая docs-команда,
  прежние gates сохранены. Семантика lockfile/dependencies не менялась.
- SHA256 167 файлов src/public до/после совпал, новых/удалённых runtime-файлов нет.

Ручная проверка этого задания: контракты против исходников, ссылки/команды,
разделение исторических/активных правил, сохранность README, границы UI/scene
range и primary/orbital safe-zone поведения. Browser/device/live-SDK QA здесь
не выполнялся. Новый ZIP/upload/commit/push/публикация не выполнялись.
Следующий план: [NEXT_MILESTONE](../active/NEXT_MILESTONE.md).
