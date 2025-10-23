import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, Eye } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlipFlow
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Transform your PDFs into beautiful, interactive flipbooks
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
              <p className="text-sm text-muted-foreground">
                Simply upload your PDF files and we'll handle the rest
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Everything</h3>
              <p className="text-sm text-muted-foreground">
                Organize and manage all your flipbooks in one place
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Share & View</h3>
              <p className="text-sm text-muted-foreground">
                Share your flipbooks with anyone, anywhere
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
