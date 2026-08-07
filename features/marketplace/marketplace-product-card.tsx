import Image from "next/image";
import { ExternalLink, ShoppingCart } from "lucide-react";
import { OutboundLink } from "@/components/outbound-link";
import { formatCurrency } from "@/lib/utils";
import type { MarketplaceProduct } from "@/lib/marketplace";

const conditionLabel: Record<string, string> = { new: "Novo", used: "Usado", refurbished: "Recondicionado", open_box: "Caixa aberta", unknown: "Condição informada na loja" };

export function MarketplaceProductCard({ product }: { product: MarketplaceProduct }) {
  const cheapest = product.offers[0];
  return (
    <article className="surface group flex min-w-0 flex-col overflow-hidden rounded-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        <Image src={product.imageUrl} fill alt={product.title} className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        <span className="absolute left-3 top-3 rounded-full bg-slate-950/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">Mercado Livre</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold text-cyan-300">{product.categoryName}</p>
        <p className="mt-2 text-xs text-slate-500">{product.brand ?? "Marca informada no anúncio"}</p>
        <h2 className="mt-1 line-clamp-2 min-h-12 font-black leading-6 text-slate-100">{product.title}</h2>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-800 pt-4">
          <div>
            <p className="text-[11px] text-slate-500">A partir de · {product.offers.length} {product.offers.length === 1 ? "oferta" : "ofertas"}</p>
            {cheapest.originalPrice && <p className="text-xs text-slate-600 line-through">{formatCurrency(cheapest.originalPrice)}</p>}
            <p className="mt-0.5 text-2xl font-black text-white">{formatCurrency(cheapest.price)}</p>
            <p className="mt-1 text-[11px] text-slate-500">{conditionLabel[cheapest.condition] ?? conditionLabel.unknown}</p>
          </div>
          <ShoppingCart className="mb-2 shrink-0 text-cyan-300" size={22} />
        </div>
        <OutboundLink offerSourceId={cheapest.id} href={cheapest.url} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-black text-slate-950 transition-colors hover:bg-cyan-200">
          Ver no Mercado Livre <ExternalLink size={16} />
        </OutboundLink>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-600">Preço e disponibilidade podem mudar no site da loja.</p>
      </div>
    </article>
  );
}
