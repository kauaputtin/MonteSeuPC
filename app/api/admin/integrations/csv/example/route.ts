import { csvExample } from "@/integrations/providers/csv/csv-parser";
import { getAdminApiContext } from "@/lib/admin-api";

export async function GET() {
  if (!await getAdminApiContext()) return new Response("Não autorizado.", { status: 401 });
  return new Response(`\uFEFF${csvExample}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=monte-seu-pc-exemplo.csv", "Cache-Control": "no-store" } });
}
