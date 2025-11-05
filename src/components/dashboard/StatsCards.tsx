import { Card, CardContent } from "@/components/ui/card";
import { FileText, Crown, Upload } from "lucide-react";

interface StatsCardsProps {
  flipbooksCount: number;
  userRole: 'free' | 'pro';
}

export const StatsCards = ({ flipbooksCount, userRole }: StatsCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Flipbooks</p>
              <p className="text-3xl font-bold mt-1">{flipbooksCount}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plan Status</p>
              <p className="text-3xl font-bold mt-1 capitalize">{userRole}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {userRole === 'free' ? 'Remaining' : 'Capacity'}
              </p>
              <p className="text-3xl font-bold mt-1">
                {userRole === 'free' ? `${3 - flipbooksCount}` : '∞'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
