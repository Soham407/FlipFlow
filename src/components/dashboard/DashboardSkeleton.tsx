import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
