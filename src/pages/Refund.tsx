import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Refund = () => {
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
        <h1 className="text-4xl font-bold mb-8">Refund & Cancellation Policy</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            <strong>Last updated:</strong> November 25, 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Cancellation Policy</h2>
            <p>
              You can cancel your FlipFlow Pro subscription at any time from your Profile settings.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Immediate Effect:</strong> Upon cancellation, your Pro benefits will continue 
                until the end of your current billing period
              </li>
              <li>
                <strong>No Automatic Renewal:</strong> After cancellation, your subscription will not renew, 
                and you will be downgraded to the Free plan
              </li>
              <li>
                <strong>Data Retention:</strong> Your existing flipbooks will remain accessible. If you exceed 
                free plan limits, you'll need to delete flipbooks or resubscribe
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Refund Policy</h2>
            <p>
              We offer a <strong>7-day money-back guarantee</strong> for first-time Pro subscribers.
            </p>
            
            <h3 className="text-xl font-semibold mt-4">Eligible for Full Refund:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request made within 7 days of initial subscription payment</li>
              <li>First-time Pro subscription only</li>
              <li>Technical issues preventing service use (that we cannot resolve)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4">NOT Eligible for Refund:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Requests made after 7 days from payment</li>
              <li>Renewal payments (only initial subscription qualifies)</li>
              <li>Change of mind after using the service extensively</li>
              <li>Account termination due to Terms of Service violations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How to Request a Refund</h2>
            <p>To request a refund within the 7-day window:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Email us at{" "}
                <a href="mailto:sohambhutkar1@gmail.com" className="text-primary hover:underline">
                  sohambhutkar1@gmail.com
                </a>
              </li>
              <li>Include your account email and reason for the refund request</li>
              <li>We will process your request within 3-5 business days</li>
              <li>Refunds will be credited to the original payment method within 7-10 business days</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Partial Refunds</h2>
            <p>
              We do not offer partial or pro-rated refunds for unused portions of a billing cycle, 
              except in cases of:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Extended service outages (more than 48 hours)</li>
              <li>Billing errors or duplicate charges</li>
              <li>Service degradation that materially affects functionality</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Free Plan</h2>
            <p>
              The Free plan is provided at no cost and is not eligible for refunds. You may delete 
              your account at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Payment Gateway Fees</h2>
            <p>
              Refunds are processed through Razorpay. Payment gateway processing fees are 
              non-refundable. You will receive the subscription amount minus any transaction fees.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Dispute Resolution</h2>
            <p>
              If you have a billing dispute or unauthorized charge:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact us immediately at sohambhutkar1@gmail.com</li>
              <li>We will investigate and respond within 48 hours</li>
              <li>Provide transaction details and any supporting documentation</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Service Credits</h2>
            <p>
              In certain situations, we may offer service credits instead of refunds (e.g., extended 
              service disruptions). Credits can be applied to future billing cycles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p>
              For cancellations, refund requests, or billing questions, contact:{" "}
              <a href="mailto:sohambhutkar1@gmail.com" className="text-primary hover:underline">
                sohambhutkar1@gmail.com
              </a>
            </p>
            <p>
              We aim to respond to all refund requests within 1 business day.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Refund;
