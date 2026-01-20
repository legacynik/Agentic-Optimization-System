"use client";

/**
 * PromptDiffViewer - Side-by-side diff viewer for prompt versions
 *
 * Displays differences between old and new prompt versions using
 * react-diff-viewer-continued. Includes action buttons for approving,
 * rejecting, or editing changes before approval.
 */

import React, { useMemo } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Edit } from "lucide-react";

interface PromptDiffViewerProps {
  /** The original prompt version text */
  oldVersion: string;
  /** The new/proposed prompt version text */
  newVersion: string;
  /** Callback when user approves the changes */
  onApprove: () => void;
  /** Callback when user rejects the changes */
  onReject: () => void;
  /** Callback when user wants to edit before approving */
  onEdit: () => void;
  /** Optional loading state for approve button */
  isApproving?: boolean;
  /** Optional custom title */
  title?: string;
  /** Optional old version label */
  oldVersionLabel?: string;
  /** Optional new version label */
  newVersionLabel?: string;
}

/**
 * Custom styles for the diff viewer
 * Supports both light and dark modes
 */
const getDiffStyles = (isDark: boolean) => ({
  variables: {
    dark: {
      diffViewerBackground: "#1e1e1e",
      diffViewerColor: "#e0e0e0",
      addedBackground: "#1e3a2f",
      addedColor: "#a8e6cf",
      removedBackground: "#3d1f1f",
      removedColor: "#ffb3b3",
      wordAddedBackground: "#2e5540",
      wordRemovedBackground: "#5c2626",
      addedGutterBackground: "#1e3a2f",
      removedGutterBackground: "#3d1f1f",
      gutterBackground: "#1e1e1e",
      gutterBackgroundDark: "#1a1a1a",
      highlightBackground: "#2d2d2d",
      highlightGutterBackground: "#2d2d2d",
      codeFoldGutterBackground: "#1e1e1e",
      codeFoldBackground: "#2d2d2d",
      emptyLineBackground: "#1e1e1e",
      gutterColor: "#6b6b6b",
      addedGutterColor: "#a8e6cf",
      removedGutterColor: "#ffb3b3",
      codeFoldContentColor: "#a0a0a0",
      diffViewerTitleBackground: "#1e1e1e",
      diffViewerTitleColor: "#e0e0e0",
      diffViewerTitleBorderColor: "#3d3d3d",
    },
    light: {
      diffViewerBackground: "#ffffff",
      diffViewerColor: "#1f2937",
      addedBackground: "#ecfdf5",
      addedColor: "#065f46",
      removedBackground: "#fef2f2",
      removedColor: "#991b1b",
      wordAddedBackground: "#bbf7d0",
      wordRemovedBackground: "#fecaca",
      addedGutterBackground: "#ecfdf5",
      removedGutterBackground: "#fef2f2",
      gutterBackground: "#f9fafb",
      gutterBackgroundDark: "#f3f4f6",
      highlightBackground: "#eff6ff",
      highlightGutterBackground: "#eff6ff",
      codeFoldGutterBackground: "#f9fafb",
      codeFoldBackground: "#f3f4f6",
      emptyLineBackground: "#f9fafb",
      gutterColor: "#6b7280",
      addedGutterColor: "#065f46",
      removedGutterColor: "#991b1b",
      codeFoldContentColor: "#6b7280",
      diffViewerTitleBackground: "#f9fafb",
      diffViewerTitleColor: "#1f2937",
      diffViewerTitleBorderColor: "#e5e7eb",
    },
  },
  line: {
    padding: "8px 2px",
    wordBreak: "break-all" as const,
  },
  wordDiff: {
    padding: "2px 0",
  },
  contentText: {
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  gutter: {
    minWidth: "40px",
    padding: "0 8px",
  },
  titleBlock: {
    fontWeight: "600",
    padding: "8px 16px",
    borderBottom: "1px solid",
  },
});

export function PromptDiffViewer({
  oldVersion,
  newVersion,
  onApprove,
  onReject,
  onEdit,
  isApproving = false,
  title = "Proposed Prompt Changes",
  oldVersionLabel = "Current Version",
  newVersionLabel = "Proposed Version",
}: PromptDiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const styles = useMemo(() => getDiffStyles(isDark), [isDark]);

  // Check if there are any changes
  const hasChanges = oldVersion !== newVersion;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {!hasChanges && (
            <span className="text-sm font-normal text-muted-foreground">
              (No changes detected)
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto rounded border mx-6">
          <ReactDiffViewer
            oldValue={oldVersion}
            newValue={newVersion}
            splitView={true}
            useDarkTheme={isDark}
            leftTitle={oldVersionLabel}
            rightTitle={newVersionLabel}
            styles={styles}
            compareMethod={DiffMethod.WORDS}
            showDiffOnly={false}
            hideLineNumbers={false}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isApproving}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="mr-1 h-4 w-4" />
          Reject Changes
        </Button>

        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isApproving}
        >
          <Edit className="mr-1 h-4 w-4" />
          Edit Before Approve
        </Button>

        <Button
          onClick={onApprove}
          disabled={isApproving || !hasChanges}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isApproving ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Approving...
            </>
          ) : (
            <>
              <Check className="mr-1 h-4 w-4" />
              Approve &amp; Continue
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
