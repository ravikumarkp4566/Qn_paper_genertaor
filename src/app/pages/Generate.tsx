import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export function Generate() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      navigate("/preview/1");
    }, 3000);
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3">
              Ready to Generate
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your question paper configuration is complete. Click the button below to generate
              your paper using AI.
            </p>

            {!isGenerating ? (
              <button
                onClick={handleGenerate}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-medium"
              >
                Generate Paper
              </button>
            ) : (
              <div className="space-y-4">
                <motion.div
                  className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-muted-foreground">Generating your question paper...</p>
                <motion.div
                  className="h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        {!isGenerating && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Configuration Summary</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Subject: Data Structures</p>
              <p>• Total Marks: 100</p>
              <p>• Duration: 180 minutes</p>
              <p>• Sections: A, B, C</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
