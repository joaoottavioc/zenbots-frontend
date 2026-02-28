import type { Order } from "./types";

export function TicketImpressao({ order }: { order: Order | null }) {
  if (!order) return null;

  return (
    <div id="printable-area" className="hidden print:block w-[80mm] p-0 font-mono text-black text-[12px] leading-tight">
      <div className="text-center border-b border-black pb-2 mb-2">
        <h2 className="text-2xl font-black">#{order.id}</h2>
        <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
        <p className="font-bold text-sm mt-1 uppercase">{order.customerName}</p>
      </div>

      <div className="mb-2">
        <p className="font-bold uppercase border-b border-black inline-block mb-1">
          {order.type === "DELIVERY" ? "🛵 ENTREGA" : "👜 RETIRADA"}
        </p>
        {order.type === "DELIVERY" && order.fullAddress && (
          <p className="text-[10px] mt-1">{order.fullAddress}</p>
        )}
      </div>

      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        {order.display_items.map((item, idx) => (
          <div key={idx} className="mb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-2">
                <span className="font-bold">{item.quantity}x</span>
                <span className="uppercase font-semibold">{item.product_name}</span>
              </div>
              {item.price_at_time_of_order && (
                <span className="font-bold whitespace-nowrap">
                  {(item.price_at_time_of_order * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {item.notes && (
              <p className="text-[10px] font-black ml-6 mt-0.5 bg-black text-white inline-block px-1 uppercase">
                OBS: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-1 mb-2 border-b border-black pb-2">
        <div className="flex justify-between text-[10px]">
          <span>SUBTOTAL:</span>
          <span>{order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex justify-between font-black text-sm">
          <span>TOTAL GERAL:</span>
          <span>{order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="mt-1 text-[10px] text-center border border-black p-1">
          MÉTODO: <span className="font-black uppercase">{order.payment_method || 'A DEFINIR'}</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-[10px]">*** FIM DO PEDIDO ***</p>
      </div>
    </div>
  );
}
