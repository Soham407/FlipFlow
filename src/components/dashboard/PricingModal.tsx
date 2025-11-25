import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Crown, Loader2 } from "lucide-react";
import { PLANS } from "@/config/constants";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan: (planId: string) => void;
  processingPayment: boolean;
  currentPlan: string;
}

export function PricingModal({ 
  open, 
  onOpenChange, 
  onSelectPlan, 
  processingPayment,
  currentPlan 
}: PricingModalProps) {
  // Filter out Free plan and current plan from upgrade options
  const upgradablePlans = Object.entries(PLANS).filter(
    ([key]) => key !== 'FREE' && key.toLowerCase() !== currentPlan.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Upgrade your account to unlock more features and higher limits
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mt-4">
          {upgradablePlans.map(([key, plan]) => {
            const planId = key.toLowerCase();
            const isRecommended = key === 'BUSINESS';
            
            return (
              <Card 
                key={key} 
                className={`relative flex flex-col h-full ${
                  isRecommended ? 'border-primary shadow-lg' : 'border-2'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold rounded-full">
                    RECOMMENDED
                  </div>
                )}

                <CardContent className="pt-6 pb-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {key === 'PRO' && <Crown className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-bold">₹{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => onSelectPlan(planId)}
                    disabled={processingPayment}
                    className="w-full"
                    variant={isRecommended ? "default" : "outline"}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💳 Secure payment powered by Razorpay • Cancel anytime • 100% Money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
