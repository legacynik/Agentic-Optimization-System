"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Table, FileJson, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface ExportMenuProps {
  onExportCSV: () => void | Promise<void>
  onExportPDF: () => void | Promise<void>
  onExportJSON: () => void | Promise<void>
  label?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
}

export function ExportMenu({
  onExportCSV,
  onExportPDF,
  onExportJSON,
  label = 'Export',
  variant = 'outline',
  size = 'default',
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (
    exportFn: () => void | Promise<void>,
    format: string
  ) => {
    setIsExporting(true)
    try {
      await exportFn()
      toast.success(`Export successful`, {
        description: `${format} file has been downloaded.`,
      })
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      toast.error(`Export failed`, {
        description: error instanceof Error ? error.message : `Failed to export ${format}.`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport(onExportCSV, 'CSV')}
          disabled={isExporting}
        >
          <Table className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(onExportPDF, 'PDF')}
          disabled={isExporting}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(onExportJSON, 'JSON')}
          disabled={isExporting}
        >
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
