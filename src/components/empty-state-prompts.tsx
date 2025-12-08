'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a Python function to reverse a string",
  "What are the latest trends in AI?",
  "How does blockchain work?",
  "Create a recipe for chocolate chip cookies",
  "Explain the theory of relativity",
  "Write a haiku about technology",
  "What is machine learning?",
  "How to optimize React performance?",
  "Explain the water cycle",
  "Write a JavaScript function to sort an array",
  "What are the benefits of meditation?",
  "Explain how photosynthesis works",
  "Create a workout plan for beginners",
  "What is the difference between HTTP and HTTPS?",
  "Write a story about a robot",
  "Explain the concept of recursion",
  "How does the internet work?",
  "What are the best practices for coding?",
  "Explain the greenhouse effect",
]

type FloatingPromptProps = {
  text: string
  isVisible: boolean
  onSelect?: (text: string) => void
}

function FloatingPrompt({ text, isVisible, onSelect }: FloatingPromptProps) {
  return (
    <div
      className={cn(
        "w-full flex justify-center transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelect?.(text)}
        className="bg-card/90 backdrop-blur-sm border-border/50 hover:bg-card hover:border-border shadow-lg text-xs sm:text-sm px-4 py-2 h-auto whitespace-nowrap cursor-pointer transition-transform hover:scale-105"
      >
        {text}
      </Button>
    </div>
  )
}

type EmptyStatePromptsProps = {
  onPromptSelect?: (prompt: string) => void
}

export function EmptyStatePrompts({ onPromptSelect }: EmptyStatePromptsProps) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const shuffledPrompts = useRef<string[]>([])

  useEffect(() => {
    // Shuffle prompts once
    shuffledPrompts.current = [...PROMPTS].sort(() => Math.random() - 0.5)
  }, [])

  useEffect(() => {
    // Cycle through prompts with fade in/out effect
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      
      // After fade out, change prompt and fade in
      setTimeout(() => {
        setCurrentPromptIndex((prev) => {
          if (prev >= shuffledPrompts.current.length - 1) {
            // Reshuffle when we've shown all prompts
            shuffledPrompts.current = [...PROMPTS].sort(() => Math.random() - 0.5)
            return 0
          }
          return prev + 1
        })
        setIsVisible(true)
      }, 300) // Wait for fade out to complete
    }, 3500) // Show each prompt for 3.5 seconds (3.2s visible + 0.3s fade)

    return () => clearInterval(interval)
  }, [])

  if (shuffledPrompts.current.length === 0) return null

  return (
    <div className="w-full">
      <FloatingPrompt
        key={currentPromptIndex}
        text={shuffledPrompts.current[currentPromptIndex]}
        isVisible={isVisible}
        onSelect={onPromptSelect}
      />
    </div>
  )
}

