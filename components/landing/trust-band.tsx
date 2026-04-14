import {
  Cookie,
  Fish,
  IceCream,
  Pizza,
  Sandwich,
  UtensilsCrossed,
} from "lucide-react";

const CUISINES = [
  { label: "Hamburgueria", Icon: Sandwich },
  { label: "Pizzaria", Icon: Pizza },
  { label: "Açaí", Icon: IceCream },
  { label: "Japonês", Icon: Fish },
  { label: "Marmitex", Icon: UtensilsCrossed },
  { label: "Lanches", Icon: Cookie },
] as const;

export function TrustBand() {
  return (
    <section className="relative border-y border-slate-200 bg-slate-50/80 px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-amber-600">
          Para qualquer cozinha
        </p>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600 sm:text-base">
          Hambúrguer, pizza, açaí, japa, marmitex — se cabe no WhatsApp, cabe no
          ZenBotZ.
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {CUISINES.map(({ label, Icon }) => (
            <li
              key={label}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:text-amber-700"
            >
              <Icon
                className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-500"
                strokeWidth={1.8}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
