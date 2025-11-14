import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState = ({ onCreateClick }: EmptyStateProps) => {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="pt-16 pb-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">No flipbooks yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first flipbook by uploading a PDF document. Transform your static PDFs into engaging, interactive flipbooks.
        </p>
        <Button onClick={onCreateClick} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create Your First Flipbook
        </Button>
      </CardContent>
    </Card>
  );
};
