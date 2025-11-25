import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, Eye, Zap, Shield, Sparkles, CheckCircle, Crown } from "lucide-react";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>FlipFlow - Transform PDFs into Interactive Flipbooks</title>
        <meta 
          name="description" 
          content="Create stunning, interactive HTML5 flipbooks from your PDFs in seconds. Perfect for magazines, catalogs, portfolios, and more. Start free with 3 flipbooks forever." 
        />
        <meta property="og:title" content="FlipFlow - Interactive PDF Flipbooks" />
        <meta 
          property="og:description" 
          content="Transform your PDFs into beautiful, interactive flipbooks with realistic page-turning animations. Try it free today!" 
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://flipflow.com" />
        <meta property="og:image" content="https://flipflow.com/Images/FF Logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FlipFlow - Interactive PDF Flipbooks" />
        <meta 
          name="twitter:description" 
          content="Create stunning flipbooks from PDFs in seconds. Free plan available." 
        />
        <link rel="canonical" href="https://flipflow.com" />
      </Helmet>

      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Images/FF Logo.png" alt="FlipFlow" className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-xl font-bold">FlipFlow</span>
          </Link>
          <div className="flex gap-3">
            <Button asChild variant="ghost">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-24 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/50 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Professional PDF Flipbook Solution</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Transform PDFs into
            <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Interactive Flipbooks
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create stunning, interactive flipbooks from your PDFs in seconds. Perfect for magazines, catalogs, portfolios, and more.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 h-12">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 h-12">
              <Link to="/login">View Demo</Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • 3 flipbooks free forever
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24 bg-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features to create professional flipbooks that engage your audience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">One-Click Upload</h3>
              <p className="text-muted-foreground leading-relaxed">
                Drag and drop your PDF or browse to upload. We'll convert it to a beautiful flipbook instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Optimized rendering engine ensures smooth page turns and instant loading, even on mobile devices.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Sharing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Share your flipbooks with a single link. Works perfectly across all devices and platforms.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Organize & Manage</h3>
              <p className="text-muted-foreground leading-relaxed">
                Powerful dashboard to manage all your flipbooks. Search, sort, and organize with ease.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground leading-relaxed">
                Enterprise-grade security. Your files are encrypted and stored safely in the cloud.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Beautiful Design</h3>
              <p className="text-muted-foreground leading-relaxed">
                Realistic page-turning animations and stunning visual effects that captivate your readers.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground">Choose the plan that's right for you</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2">
            <CardContent className="pt-6 pb-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">₹0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
                <p className="text-muted-foreground">Perfect for trying out FlipFlow</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Up to 3 flipbooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>10MB file size limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Basic sharing options</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Community support</span>
                </li>
              </ul>
              
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-br from-primary to-accent text-primary-foreground px-4 py-1 text-sm font-semibold">
              Popular
            </div>
            <CardContent className="pt-6 pb-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold">Pro</h3>
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">₹100</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">Unlimited flipbooks for professionals</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="font-medium">Unlimited flipbooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="font-medium">50MB file size limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Advanced sharing & embedding</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>No FlipFlow branding</span>
                </li>
              </ul>
              
              <Button asChild size="lg" className="w-full">
                <Link to="/signup">Upgrade to Pro</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <Card className="border-2 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to create amazing flipbooks?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already using FlipFlow to share their content in a more engaging way.
            </p>
            <Button asChild size="lg" className="text-lg px-8 h-12">
              <Link to="/signup">Start Your Free Trial</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
