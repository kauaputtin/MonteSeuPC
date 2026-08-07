import { z } from "zod";

const httpUrl = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "A URL deve usar HTTP ou HTTPS.");

const optionalPositiveMoney = z.number().finite().positive().optional();

export const externalOfferSchema = z.object({
  providerId: z.string().trim().min(1).max(80),
  externalId: z.string().trim().min(1).max(200),
  sellerExternalId: z.string().trim().max(200).optional(),
  sellerName: z.string().trim().max(200).optional(),
  price: z.number().finite().positive(),
  pixPrice: optionalPositiveMoney,
  originalPrice: optionalPositiveMoney,
  installmentPrice: optionalPositiveMoney,
  installments: z.number().int().positive().max(48).optional(),
  shippingPrice: z.number().finite().nonnegative().optional(),
  currency: z.literal("BRL"),
  available: z.boolean(),
  stockQuantity: z.number().int().nonnegative().optional(),
  condition: z.enum(["new", "used", "refurbished", "open_box", "unknown"]),
  productUrl: httpUrl,
  affiliateUrl: httpUrl.optional(),
  affiliateProgram: z.string().trim().max(100).optional(),
  fetchedAt: z.iso.datetime()
}).superRefine((offer, context) => {
  if (offer.installmentPrice !== undefined && offer.installments === undefined) {
    context.addIssue({ code: "custom", path: ["installments"], message: "Quantidade de parcelas obrigatória." });
  }
});

export const externalProductSchema = z.object({
  providerId: z.string().trim().min(1).max(80),
  externalId: z.string().trim().min(1).max(200),
  externalSku: z.string().trim().max(200).optional(),
  gtin: z.string().regex(/^\d{8,14}$/).optional(),
  ean: z.string().regex(/^\d{8,14}$/).optional(),
  mpn: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  title: z.string().trim().min(2).max(500),
  model: z.string().trim().max(200).optional(),
  category: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  imageUrl: httpUrl.optional(),
  productUrl: httpUrl,
  specifications: z.record(z.string(), z.unknown()),
  offers: z.array(externalOfferSchema).max(250),
  rawPayload: z.unknown().optional(),
  fetchedAt: z.iso.datetime()
});

export const externalProductsSchema = z.array(externalProductSchema).max(500);
