import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Copy, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Flipbook {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
  slug?: string;
  is_public?: boolean;
}

interface FlipbookCardProps {
  flipbook: Flipbook;
  onDelete: (id: string, filePath: string) => void;
  onCopyEmbed: (flipbook: Flipbook) => void;
}

export const FlipbookCard = ({ flipbook, onDelete, onCopyEmbed }: FlipbookCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-1">{flipbook.title}</CardTitle>
        <CardDescription>
          {new Date(flipbook.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center">
          <Eye className="h-12 w-12 text-muted-foreground/30" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => navigate(`/view/${flipbook.slug || flipbook.id}`)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopyEmbed(flipbook)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/analytics/${flipbook.id}`)}
        >
          <BarChart2 className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(flipbook.id, flipbook.file_path)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
