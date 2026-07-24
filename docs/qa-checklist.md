# QA Checklist

## Milestone gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- [x] 6 Playwright smoke assertions cho 5 workflow (wrapper preview-server timeout trên Windows sau khi tests pass)

## Per page

- [ ] Route hoạt động, không console error và không broken CTA.
- [ ] Semantic heading, keyboard focus, labels và WCAG AA.
- [ ] Responsive 1440+, 1200–1439, 768–1199 và dưới 768.
- [ ] Loading, empty, error hoặc disabled state phù hợp.
- [ ] Token đúng, không duplicate layout/component.
- [ ] Copy đúng auction lifecycle và không dùng thuật ngữ ecommerce bị cấm.
- [ ] Mock interaction thật; business logic có test.
