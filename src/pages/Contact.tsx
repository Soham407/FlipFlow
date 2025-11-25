import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageCircle, FileText } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Images/FF Logo.png" alt="FlipFlow" className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-xl font-bold">FlipFlow</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4 text-center">Contact Us</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Have questions? We're here to help.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Email Support</h3>
              <p className="text-muted-foreground mb-4">
                Get help with technical issues, billing questions, or general inquiries.
              </p>
              <a 
                href="mailto:support@flipflow.com"
                className="text-primary hover:underline font-medium"
              >
                support@flipflow.com
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                Response time: Within 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Pro Support</h3>
              <p className="text-muted-foreground mb-4">
                Priority support for Pro subscribers with faster response times.
              </p>
              <a 
                href="mailto:pro@flipflow.com"
                className="text-primary hover:underline font-medium"
              >
                pro@flipflow.com
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                Response time: Within 4 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 bg-muted/30 mb-12">
          <CardContent className="pt-6">
            <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Documentation & FAQ</h3>
            <p className="text-muted-foreground mb-4">
              Looking for quick answers? Check out our help resources:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• How to upload and create flipbooks</li>
              <li>• Sharing and embedding options</li>
              <li>• Subscription and billing information</li>
              <li>• Troubleshooting common issues</li>
            </ul>
          </CardContent>
        </Card>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Business Inquiries</h2>
            <p>
              For partnerships, enterprise solutions, or media inquiries, please contact:{" "}
              <a href="mailto:business@flipflow.com" className="text-primary hover:underline">
                business@flipflow.com
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Report Abuse</h2>
            <p>
              If you encounter content that violates our Terms of Service or contains 
              inappropriate material, please report it to:{" "}
              <a href="mailto:abuse@flipflow.com" className="text-primary hover:underline">
                abuse@flipflow.com
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Registered Address</h2>
            <p className="text-muted-foreground">
              FlipFlow<br />
              [Your Business Address]<br />
              [City, State, PIN Code]<br />
              India
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What to Include in Your Email</h2>
            <p>To help us assist you better, please include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account email address</li>
              <li>A clear description of your issue or question</li>
              <li>Screenshots (if applicable)</li>
              <li>Steps to reproduce the issue</li>
              <li>Browser and device information</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;
