import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Share2,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: "Welcome to FlipFlow!",
    description:
      "Turn your static PDFs into interactive, flippable experiences in seconds.",
    icon: Sparkles,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "Upload & Create",
    description:
      "Simply upload your PDF. We'll handle the conversion and hosting for you.",
    icon: Upload,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Share & Track",
    description:
      "Share your unique link or embed it anywhere. Track views and engagement in real-time.",
    icon: Share2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="bg-background rounded-3xl overflow-hidden shadow-2xl border border-border">
          {/* Header Image/Icon Area */}
          <div
            className={`h-40 ${step.bg} flex items-center justify-center transition-colors duration-500`}
          >
            <step.icon
              className={`h-20 w-20 ${step.color} animate-in zoom-in-50 duration-500`}
            />
          </div>

          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            {/* Dots */}
            <div className="flex justify-center gap-2 my-8">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? "Let's Start!" : "Next"}
                {currentStep < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
            {currentStep < steps.length - 1 && (
              <Button
                variant="link"
                className="text-muted-foreground text-xs mt-2 w-full"
                onClick={onClose}
              >
                Skip for now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
