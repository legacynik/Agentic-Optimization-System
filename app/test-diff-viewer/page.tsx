"use client";

/**
 * Test page for PromptDiffViewer component
 * Demonstrates the diff viewer UI for Phase 7 (PRD 10.6)
 */

import { useState } from "react";
import { PromptDiffViewer } from "@/components/prompt-diff-viewer";
import { toast, Toaster } from "sonner";

const OLD_PROMPT = `You are a medical appointment assistant. Help patients book appointments.

## Instructions
1. Greet the patient warmly
2. Ask what type of appointment they need
3. Check available times
4. Confirm the booking

## Rules
- Be polite and professional
- Never share other patient information
- Escalate complex medical questions to a human`;

const NEW_PROMPT = `You are a medical appointment assistant. Help patients book appointments efficiently.

## Instructions
1. Greet the patient warmly and ask their name
2. Ask what type of appointment they need
3. Confirm their preferred date and time range
4. Check available times using the calendar tool
5. Present top 3 available options
6. Confirm the booking with appointment details

## Rules
- Be polite, professional, and empathetic
- Never share other patient information
- Escalate complex medical questions to a human
- Always confirm the patient's contact information

## Optimizations Applied
- Added name collection for personalization
- Added preference gathering before calendar check
- Limited options to reduce decision fatigue`;

export default function TestDiffViewerPage() {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("Changes approved! Test cycle continuing...");
    setIsApproving(false);
  };

  const handleReject = () => {
    toast.error("Changes rejected. Test cycle stopped.");
  };

  const handleEdit = () => {
    toast.info("Edit mode enabled - modify the prompt and then approve");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Toaster position="top-right" />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Prompt Diff Viewer Test</h1>
        <p className="text-muted-foreground">
          Phase 7 - PRD 10.6: Testing the prompt optimization approval UI
        </p>
      </div>

      <PromptDiffViewer
        oldVersion={OLD_PROMPT}
        newVersion={NEW_PROMPT}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
        isApproving={isApproving}
        title="Iteration 2 - Proposed Prompt Optimization"
        oldVersionLabel="Current (Iteration 1)"
        newVersionLabel="Proposed (Iteration 2)"
      />
    </div>
  );
}
