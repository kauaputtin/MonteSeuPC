import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingBuilder() {
  return <div className="container-shell py-10"><Skeleton className="h-8 w-72" /><Skeleton className="mt-6 h-16" /><div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]"><Skeleton className="h-[500px]" /><div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-64" /></div></div></div>;
}
