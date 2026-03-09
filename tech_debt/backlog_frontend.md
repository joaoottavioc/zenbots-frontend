# Frontend UI Consistency & Professionalization Backlog

> **Created:** 2026-03-09 | **Last updated:** 2026-03-09
> **Goal:** SaaS-grade visual consistency across all pages and components
> **Constraint:** Zero impact on existing functionality

---

## Phase 1 — Page-Level Consistency (DONE)

- [x] **FE-1** Create `PageHeader` component (`components/layout/page-header.tsx`)
- [x] **FE-2** Create `PageContainer` wrapper (`components/layout/page-container.tsx`)
- [x] **FE-3** Add `brand` variant to Button (`components/ui/button.tsx`)
- [x] **FE-4** Create `EmptyState` component (`components/ui/empty-state.tsx`)
- [x] **FE-5a** Migrate Suporte → `PageContainer` + `PageHeader`
- [x] **FE-5b** Migrate Settings → `PageContainer` + `PageHeader`
- [x] **FE-5c** Migrate Analytics → `PageContainer` + `PageHeader`
- [x] **FE-5d** Migrate Pagamentos → `PageContainer` + `PageHeader`
- [x] **FE-5e** Migrate Meus BotZ → `PageContainer` + `PageHeader` + `EmptyState`
- [x] **FE-5f** Migrate Produtos → `PageContainer` + `PageHeader` + `EmptyState`
- [x] **FE-5g** Migrate Pedidos → `PageContainer fullHeight` + `PageHeader`
- [x] **FE-6** Remove icons from page titles (Analytics, Pagamentos)
- [x] **FE-7** Delete old `DashboardHeader` component

---

## Phase 2 — Form Alignment & UX (DONE)

- [x] **FE-9** Add matching `<FormDescription>` to "Taxa de Entrega" so both side-by-side fields have equal height
- [x] **FE-10** Change bot form submit button to `variant="brand"`
- [x] **FE-11** Replace product form submit button inline styles with `variant="brand"`, remove `font-bold`
- [x] **FE-12** Change product form grid to `grid-cols-1 md:grid-cols-2` for mobile responsiveness
- [x] **FE-13** Remove hardcoded `h-6 mb-2` from category label row, use standard flex layout
- [x] **FE-14** Standardize form spacing: `space-y-4` inside cards, `space-y-6` between major sections

---

## Phase 3 — Button & Badge Consistency (DONE)

- [x] **FE-15a** `bot-card.tsx` "Testar" button → `variant="brand"`
- [x] **FE-15b** `connect-whatsapp-button.tsx` → normalize `font-bold` to `font-medium`
- [x] **FE-15c** `premium-lock.tsx` → normalize shadow from `shadow-lg` to `shadow-sm`
- [x] **FE-15d** `order-card.tsx` → refactor raw `<button>` elements to `<Button>` component
- [x] **FE-16a** Normalize all inline badges to consistent `px-2 py-0.5 text-[10px] border rounded-md` baseline
- [x] **FE-16b** Bot card connection status: convert from raw span to styled badge

---

## Phase 4 — Card & Spacing Polish (DONE)

- [x] **FE-17a** Normalize `bot-card.tsx` content padding from `p-5` → `p-4`
- [x] **FE-17b** Normalize `order-column.tsx` header from `px-4 py-3` → `p-3`
- [x] **FE-17c** Normalize `premium-lock.tsx` modal from `p-8` → `p-6`
- [x] **FE-18a** `order-column.tsx` `shadow-inner` → `shadow-sm`
- [x] **FE-18b** `premium-lock.tsx` `shadow-2xl` → `shadow-lg`
- [x] **FE-8a** Normalize `order-card.tsx` border-radius from `rounded-lg` → `rounded-xl`
- [x] **FE-8b** Wrap `bots/novo/page.tsx` in `PageContainer`
- [x] **FE-19** Replace all `text-[11px]` in `order-card.tsx` with `text-xs`

---

## Summary

| Phase | Items | Done | Remaining |
|-------|-------|------|-----------|
| Phase 1 — Page consistency | 13 | 13 | 0 |
| Phase 2 — Form alignment | 6 | 6 | 0 |
| Phase 3 — Buttons & badges | 2 | 2 | 0 |
| Phase 4 — Cards & polish | 4 | 4 | 0 |
| **Total** | **25** | **25** | **0** |
