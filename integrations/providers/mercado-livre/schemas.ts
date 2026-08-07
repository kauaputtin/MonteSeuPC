import { z } from "zod";

export const mercadoLivreAttributeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  value_id: z.string().nullable().optional(),
  value_name: z.string().nullable().optional(),
  value_struct: z.object({ number: z.number().optional(), unit: z.string().optional() }).nullable().optional()
});

const pictureSchema = z.object({ id: z.string().optional(), url: z.url().optional(), secure_url: z.url().optional() });

export const catalogProductSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  domain_id: z.string().optional(),
  name: z.string(),
  attributes: z.array(mercadoLivreAttributeSchema).default([]),
  pictures: z.array(pictureSchema).default([]),
  main_features: z.array(z.unknown()).default([]),
  short_description: z.object({ content: z.string().optional() }).nullable().optional()
});

export const catalogSearchSchema = z.object({
  paging: z.object({ total: z.number().int().nonnegative(), limit: z.number().int().nonnegative(), offset: z.number().int().nonnegative() }),
  results: z.array(catalogProductSchema)
});

export const catalogOffersSchema = z.object({
  paging: z.object({ total: z.number().int().nonnegative(), limit: z.number().int().nonnegative(), offset: z.number().int().nonnegative() }).optional(),
  results: z.array(z.object({
    item_id: z.string(), seller_id: z.union([z.string(), z.number()]).optional(), price: z.number().positive(),
    original_price: z.number().positive().nullable().optional(), currency_id: z.string(), condition: z.string().optional()
  }))
});

export const itemDetailSchema = z.object({
  id: z.string(), title: z.string(), price: z.number().positive(), original_price: z.number().positive().nullable().optional(),
  currency_id: z.string(), available_quantity: z.number().nonnegative().optional(), status: z.string().optional(), condition: z.string().optional(),
  seller_id: z.union([z.string(), z.number()]).optional(), permalink: z.url(), thumbnail: z.url().optional(),
  catalog_product_id: z.string().nullable().optional(), category_id: z.string().optional(), domain_id: z.string().optional(),
  attributes: z.array(mercadoLivreAttributeSchema).default([]), last_updated: z.string().optional()
});

export const itemMultigetSchema = z.array(z.object({ code: z.number().int(), body: itemDetailSchema.optional() }));

export type MercadoLivreCatalogProduct = z.infer<typeof catalogProductSchema>;
export type MercadoLivreItem = z.infer<typeof itemDetailSchema>;
