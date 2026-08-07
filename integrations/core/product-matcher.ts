import type { Component } from "@/types/domain";
import type { ExternalProduct, MatchCandidate, NormalizationResult } from "@/integrations/types/external";
import { normalizeBrand, normalizeComparableText, normalizeModel } from "./normalizer";

function identifiers(product: ExternalProduct) {
  return [product.gtin, product.ean].filter((value): value is string => Boolean(value));
}

function tokens(value: string) { return new Set(normalizeComparableText(value).split(" ").filter((token) => token.length > 1)); }
function similarity(left: string, right: string) {
  const a = tokens(left); const b = tokens(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

const variationFields = ["memoryType", "capacityGb", "modules", "vramGb", "wattage", "radiatorMm", "formFactor"];
function conflictingVariation(external: Record<string, unknown>, component: Record<string, unknown>) {
  return variationFields.some((field) => external[field] !== null && external[field] !== undefined && component[field] !== null && component[field] !== undefined && String(external[field]).toLowerCase() !== String(component[field]).toLowerCase());
}

function conflictingModelVariant(externalTitle: string, componentTitle: string) {
  const tags = ["oc", "ti", "super"];
  const externalTokens = tokens(externalTitle);
  const componentTokens = tokens(componentTitle);
  return tags.some((tag) => externalTokens.has(tag) !== componentTokens.has(tag));
}

export function rankProductMatches(product: ExternalProduct, normalized: NormalizationResult, components: Component[]): MatchCandidate[] {
  return components.filter((component) => !normalized.categorySlug || component.categorySlug === normalized.categorySlug).map((component) => {
    const reasons: string[] = [];
    let confidence = 0;
    let reliableIdentifier = false;
    const componentIdentifiers = [component.gtin, component.ean].filter((value): value is string => Boolean(value));
    if (identifiers(product).some((value) => componentIdentifiers.includes(value))) {
      confidence = 0.99; reliableIdentifier = true; reasons.push("GTIN/EAN idêntico");
    } else if (product.mpn && component.mpn && normalizeComparableText(product.mpn) === normalizeComparableText(component.mpn)) {
      const productBrand = normalizeBrand(product.brand); const componentBrand = normalizeBrand(component.brand);
      confidence = productBrand && componentBrand ? productBrand === componentBrand ? 0.98 : 0.3 : 0.96;
      reliableIdentifier = true; reasons.push("MPN idêntico");
      if (productBrand && componentBrand && productBrand === componentBrand) reasons.push("fabricante compatível");
      if (productBrand && componentBrand && productBrand !== componentBrand) reasons.push("fabricante divergente");
    } else {
      const brandMatch = normalizeBrand(product.brand) !== null && normalizeBrand(product.brand) === normalizeBrand(component.brand);
      const modelMatch = normalizeModel(product.model) !== null && normalizeModel(product.model) === normalizeModel(component.model ?? component.name);
      if (brandMatch && modelMatch) { confidence = 0.88; reasons.push("marca e modelo normalizados"); }
      else {
        const titleScore = similarity(product.title, `${component.brand} ${component.name}`);
        confidence = Math.min(0.74, titleScore * 0.74 + (brandMatch ? 0.1 : 0));
        if (brandMatch) reasons.push("fabricante compatível");
        if (titleScore > 0.5) reasons.push("similaridade textual como apoio");
      }
    }
    const blockedByVariation = conflictingVariation(normalized.specifications, component.specifications as unknown as Record<string, unknown>) || conflictingModelVariant(product.title, `${component.brand} ${component.name}`);
    if (blockedByVariation) { confidence = Math.min(confidence, 0.3); reasons.push("variação técnica divergente"); }
    return { componentId: component.id, confidence: Number(confidence.toFixed(4)), reasons, reliableIdentifier, blockedByVariation };
  }).filter((candidate) => candidate.confidence > 0).sort((a, b) => b.confidence - a.confidence);
}

export function canAutoMatch(candidate?: MatchCandidate) {
  return Boolean(candidate && candidate.confidence > 0.95 && candidate.reliableIdentifier && !candidate.blockedByVariation);
}
