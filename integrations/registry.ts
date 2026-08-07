import { ProviderRegistry } from "@/integrations/core/provider-registry";
import { AmazonProvider } from "@/integrations/providers/amazon/provider";
import { KabumProvider } from "@/integrations/providers/kabum/provider";
import { MagaluProvider } from "@/integrations/providers/magalu/provider";
import { MercadoLivreProvider } from "@/integrations/providers/mercado-livre/provider";
import { loadMercadoLivreAccessToken } from "@/integrations/providers/mercado-livre/credentials";
import { MockProductProvider } from "@/integrations/providers/mock/provider";
import { PichauProvider } from "@/integrations/providers/pichau/provider";
import { TerabyteProvider } from "@/integrations/providers/terabyte/provider";

let registry: ProviderRegistry | null = null;
export function getProviderRegistry() {
  if (registry) return registry;
  registry = new ProviderRegistry()
    .register(new MercadoLivreProvider(loadMercadoLivreAccessToken))
    .register(new AmazonProvider())
    .register(new KabumProvider())
    .register(new PichauProvider())
    .register(new TerabyteProvider())
    .register(new MagaluProvider())
    .register(new MockProductProvider());
  return registry;
}
