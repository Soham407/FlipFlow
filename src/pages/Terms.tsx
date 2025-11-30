import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            <strong>Last updated:</strong> November 25, 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using FlipFlow, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p>
              FlipFlow provides a platform for converting PDF documents into interactive HTML5 flipbooks. 
              We offer both free and paid subscription tiers with different usage limits and features.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 13 years old to use this service</li>
              <li>One account per user; multiple accounts are prohibited</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Subscription Plans</h2>
            <p>
              <strong>Free Plan:</strong> Up to 3 flipbooks, 10MB file size limit
            </p>
            <p>
              <strong>Pro Plan:</strong> Unlimited flipbooks, 50MB file size limit, ₹100/month
            </p>
            <p>
              Subscriptions automatically renew unless cancelled before the renewal date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload content that infringes copyright or intellectual property rights</li>
              <li>Upload malicious files, viruses, or harmful code</li>
              <li>Upload illegal, offensive, or inappropriate content</li>
              <li>Attempt to breach security or access unauthorized areas</li>
              <li>Use the service for automated or excessive requests (scraping)</li>
              <li>Resell or redistribute the service without permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
            <p>
              You retain all rights to the content you upload. By using FlipFlow, you grant us a 
              license to process, store, and display your content solely to provide the service.
            </p>
            <p>
              FlipFlow's code, design, and branding remain our intellectual property.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payments are processed securely through Razorpay</li>
              <li>All prices are in Indian Rupees (INR)</li>
              <li>Taxes may apply based on your location</li>
              <li>Failed payments may result in service suspension</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Refunds and Cancellations</h2>
            <p>
              Please see our <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link> for 
              detailed information about cancellations and refunds.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Service Availability</h2>
            <p>
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform 
              maintenance with advance notice when possible.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
            <p>
              FlipFlow is provided "as is" without warranties. We are not liable for indirect, 
              incidental, or consequential damages arising from use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Account Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms. 
              You may delete your account at any time from your profile settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after 
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">13. Governing Law</h2>
            <p>
              These terms are governed by the laws of India. Any disputes shall be resolved in 
              the courts of Pune, India.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">14. Contact Information</h2>
            <p>
              For questions about these Terms of Service, contact us at:{" "}
              <a href="mailto:sohambhutkar1@gmail.com" className="text-primary hover:underline">
                sohambhutkar1@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
