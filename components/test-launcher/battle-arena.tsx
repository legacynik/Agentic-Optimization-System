'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, Zap, MessageSquare, Brain, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BattleArenaProps {
  testRunId?: string
  onStartBattle?: () => void
}

export function BattleArena({ testRunId, onStartBattle }: BattleArenaProps) {
  const [battleStatus, setBattleStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [currentTurn, setCurrentTurn] = useState(0)
  const [agentHealth, setAgentHealth] = useState(100)
  const [personaHealth, setPersonaHealth] = useState(100)
  const [messages, setMessages] = useState<Array<{speaker: string, text: string}>>([])

  // Simulated battle progress (replace with real WebSocket connection to N8N)
  useEffect(() => {
    if (battleStatus === 'running') {
      const interval = setInterval(() => {
        setCurrentTurn(prev => prev + 1)
        // Simulate message exchange
        const newMessage = currentTurn % 2 === 0
          ? { speaker: 'Agent', text: `Domanda strategica #${currentTurn/2}` }
          : { speaker: 'Persona', text: `Risposta complessa #${Math.floor(currentTurn/2)}` }
        setMessages(prev => [...prev.slice(-4), newMessage])

        // Simulate health changes based on performance
        if (Math.random() > 0.5) {
          setPersonaHealth(prev => Math.max(0, prev - Math.random() * 10))
        } else {
          setAgentHealth(prev => Math.max(0, prev - Math.random() * 5))
        }

        // Check for battle end
        if (currentTurn >= 20 || agentHealth <= 0 || personaHealth <= 0) {
          setBattleStatus('completed')
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [battleStatus, currentTurn])

  const startBattle = () => {
    setBattleStatus('running')
    setCurrentTurn(0)
    setAgentHealth(100)
    setPersonaHealth(100)
    setMessages([])
    onStartBattle?.()
  }

  const resetBattle = () => {
    setBattleStatus('idle')
    setCurrentTurn(0)
    setAgentHealth(100)
    setPersonaHealth(100)
    setMessages([])
  }

  return (
    <Card className="relative overflow-hidden border-2 border-purple-500/20 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Battle Arena
            </CardTitle>
            <CardDescription>
              Real-time Agent vs Persona Testing
            </CardDescription>
          </div>
          <Badge
            variant={battleStatus === 'running' ? 'default' : battleStatus === 'completed' ? 'secondary' : 'outline'}
            className={`px-3 py-1 ${
              battleStatus === 'running'
                ? 'bg-green-500 animate-pulse'
                : battleStatus === 'completed'
                ? 'bg-blue-500'
                : ''
            }`}
          >
            {battleStatus === 'running' && <Zap className="w-3 h-3 mr-1" />}
            {battleStatus === 'completed' && <Trophy className="w-3 h-3 mr-1" />}
            {battleStatus.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Battle Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Agent Side */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                AI Agent
              </span>
              <span className="text-sm text-muted-foreground">{agentHealth.toFixed(0)}%</span>
            </div>
            <Progress value={agentHealth} className="h-3 bg-purple-100" />
          </div>

          {/* Persona Side */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Test Persona
              </span>
              <span className="text-sm text-muted-foreground">{personaHealth.toFixed(0)}%</span>
            </div>
            <Progress value={personaHealth} className="h-3 bg-blue-100" />
          </div>
        </div>

        {/* Turn Counter */}
        {battleStatus !== 'idle' && (
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">Turn {currentTurn}</p>
            <p className="text-sm text-muted-foreground">Target: Complete in &lt;35 turns</p>
          </div>
        )}

        {/* Message Stream */}
        {battleStatus !== 'idle' && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 h-32 overflow-y-auto">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.speaker === 'Agent' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-2 p-2 rounded ${
                    msg.speaker === 'Agent'
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-left'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-right'
                  }`}
                >
                  <p className="text-sm font-medium">{msg.speaker}</p>
                  <p className="text-xs">{msg.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center gap-3">
          {battleStatus === 'idle' && (
            <Button
              onClick={startBattle}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Battle
            </Button>
          )}

          {battleStatus === 'running' && (
            <Button
              onClick={() => setBattleStatus('completed')}
              size="lg"
              variant="secondary"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Battle
            </Button>
          )}

          {battleStatus === 'completed' && (
            <>
              <Button
                onClick={resetBattle}
                size="lg"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={startBattle}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                New Battle
              </Button>
            </>
          )}
        </div>

        {/* Results Summary (shown when completed) */}
        {battleStatus === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg"
          >
            <h3 className="font-semibold mb-2">Battle Results</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-bold">{currentTurn} turns</p>
              </div>
              <div>
                <p className="text-muted-foreground">Outcome</p>
                <p className="font-bold text-green-600">Success</p>
              </div>
              <div>
                <p className="text-muted-foreground">Score</p>
                <p className="font-bold">8.5/10</p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>

      {/* Animated Background Effect */}
      {battleStatus === 'running' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500 rounded-full opacity-10 animate-ping" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 animate-ping animation-delay-1000" />
        </div>
      )}
    </Card>
  )
}