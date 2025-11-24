import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreVertical, Trash, ExternalLink, Copy, FileText, Eye, BarChart2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Flipbook } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, Link } from "react-router-dom";

interface FlipbookCardProps {
  flipbook: Flipbook;
  onDelete: (id: string) => void;
  onCopyEmbed: (flipbook: Flipbook) => void;
}

export function FlipbookCard({ flipbook, onDelete, onCopyEmbed }: FlipbookCardProps) {
  const navigate = useNavigate();
  const identifier = flipbook.slug || flipbook.id;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md border-muted">
      {/* Decorative Gradient Background for Thumbnail Placeholder */}
      <div className="h-48 w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b">
        <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Interactive PDF
          </p>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight truncate" title={flipbook.title}>
            {flipbook.title}
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/analytics/${flipbook.id}`)}>
                <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyEmbed(flipbook)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Embed
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/view/${identifier}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open Public Link
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive" 
                onClick={() => onDelete(flipbook.id)}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(flipbook.created_at))} ago
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
          <Link to={`/view/${identifier}`}>
            <Eye className="mr-2 h-4 w-4" /> View Flipbook
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
