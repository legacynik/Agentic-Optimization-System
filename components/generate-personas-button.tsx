'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface GeneratePersonasButtonProps {
  promptVersionId: string
  promptName: string
  version: string
  isFirstVersion?: boolean
  onPersonasGenerated?: (personas: any[]) => void
  className?: string
}

export function GeneratePersonasButton({
  promptVersionId,
  promptName,
  version,
  isFirstVersion = false,
  onPersonasGenerated,
  className
}: GeneratePersonasButtonProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle')

  const generatePersonas = async () => {
    setStatus('generating')

    try {
      const response = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptVersionId,
          promptName,
          version,
          isFirstVersion
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate personas')
      }

      const data = await response.json()

      toast.success(`Generazione personas avviata per ${promptName} ${version}`, {
        description: 'Il workflow N8N sta generando le personas. Riceverai una notifica al completamento.'
      })

      setStatus('completed')

      if (onPersonasGenerated) {
        onPersonasGenerated(data.personas || [])
      }

      // Reset dopo 3 secondi
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      console.error('Error generating personas:', error)
      toast.error('Errore nella generazione delle personas', {
        description: 'Si è verificato un problema. Riprova tra qualche istante.'
      })
      setStatus('error')

      // Reset dopo 3 secondi
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const getButtonContent = () => {
    switch (status) {
      case 'generating':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generazione in corso...
          </>
        )
      case 'completed':
        return (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Personas generate!
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Errore generazione
          </>
        )
      default:
        return (
          <>
            {isFirstVersion ? (
              <Sparkles className="mr-2 h-4 w-4" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            {isFirstVersion ? 'Genera Personas Iniziali' : 'Genera Nuove Personas'}
          </>
        )
    }
  }

  return (
    <Button
      onClick={generatePersonas}
      disabled={status !== 'idle'}
      variant={isFirstVersion ? 'default' : 'outline'}
      size={isFirstVersion ? 'default' : 'sm'}
      className={className}
    >
      {getButtonContent()}
    </Button>
  )
}