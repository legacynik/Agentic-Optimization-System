'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TestTube, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LaunchTestButtonProps {
  promptVersionId: string
  promptName: string
  version: string
  personas?: any[] // Se già associate
  onTestStarted?: (testRunId: string) => void
}

export function LaunchTestButton({
  promptVersionId,
  promptName,
  version,
  personas,
  onTestStarted
}: LaunchTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')

  const launchTest = async () => {
    setIsLoading(true)
    setTestStatus('running')

    try {
      // Chiama il tuo webhook N8N direttamente o via API route
      const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK || 'https://your-n8n.app/webhook/test-runner'

      const response = await fetch('/api/launch-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptVersionId,
          promptName,
          version,
          // N8N prenderà le personas associate automaticamente dal DB
          webhookUrl: N8N_WEBHOOK_URL
        })
      })

      if (!response.ok) {
        throw new Error('Failed to trigger test')
      }

      const data = await response.json()

      toast.success(
        `Test avviato per ${promptName} ${version}`,
        {
          description: `Test ID: ${data.testRunId}`,
          duration: 5000
        }
      )

      setTestStatus('completed')
      onTestStarted?.(data.testRunId)

      // Reset dopo 3 secondi
      setTimeout(() => {
        setTestStatus('idle')
      }, 3000)

    } catch (error) {
      console.error('Error launching test:', error)
      setTestStatus('error')

      toast.error('Errore nel lanciare il test', {
        description: 'Controlla la connessione con N8N'
      })

      // Reset dopo 3 secondi
      setTimeout(() => {
        setTestStatus('idle')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonContent = () => {
    switch (testStatus) {
      case 'running':
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Test in corso...
          </>
        )
      case 'completed':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Test avviato!
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Errore
          </>
        )
      default:
        return (
          <>
            <TestTube className="w-4 h-4 mr-2" />
            Launch Test
          </>
        )
    }
  }

  const getButtonVariant = () => {
    switch (testStatus) {
      case 'completed':
        return 'outline' // Verde
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <Button
      onClick={launchTest}
      disabled={isLoading}
      variant={getButtonVariant()}
      className={
        testStatus === 'completed'
          ? 'border-green-500 text-green-600 hover:bg-green-50'
          : ''
      }
    >
      {getButtonContent()}
    </Button>
  )
}