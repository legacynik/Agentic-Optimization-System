// Mock data matching Supabase personas_performance view structure

export interface EvaluationCriteria {
  criteria_name: string
  score: number
}

export interface ConversationSummary {
  conversationid: string
  outcome: "success" | "failure" | "partial"
  score: number
  summary: string
  human_notes: string
  turns: number
}

export interface PersonaPerformance {
  conversationid: string
  personaid: string
  persona_description: string
  testrunid: string
  promptversionid: string
  agentversion: string
  avg_score: number
  avg_turns: number
  test_date: string
  evaluation_criteria: EvaluationCriteria[]
  conversations_summary: ConversationSummary
  transcript: string
}

export const mockPersonas = [
  { id: "p1", name: "Frustrated Customer", description: "Angry about delayed order" },
  { id: "p2", name: "Technical User", description: "Asks detailed technical questions" },
  { id: "p3", name: "Confused Beginner", description: "Needs step-by-step guidance" },
  { id: "p4", name: "Price Negotiator", description: "Seeks discounts and deals" },
]

export const mockTestRuns = [
  { id: "tr1", date: "2025-09-28", total: 24, avgScore: 8.2, distribution: { success: 18, partial: 4, failure: 2 } },
  { id: "tr2", date: "2025-09-27", total: 20, avgScore: 7.8, distribution: { success: 14, partial: 5, failure: 1 } },
  { id: "tr3", date: "2025-09-26", total: 22, avgScore: 8.5, distribution: { success: 19, partial: 2, failure: 1 } },
]

export const mockConversations: PersonaPerformance[] = [
  {
    conversationid: "c1",
    personaid: "p1",
    persona_description: "Frustrated Customer - Angry about delayed order",
    testrunid: "tr1",
    promptversionid: "pv1",
    agentversion: "v2.3.1",
    avg_score: 8.5,
    avg_turns: 6,
    test_date: "2025-09-28T14:30:00Z",
    evaluation_criteria: [
      { criteria_name: "Empathy", score: 9 },
      { criteria_name: "Resolution", score: 8 },
      { criteria_name: "Efficiency", score: 8 },
      { criteria_name: "Accuracy", score: 9 },
    ],
    conversations_summary: {
      conversationid: "c1",
      outcome: "success",
      score: 8.5,
      summary: "Agent successfully de-escalated frustrated customer and provided order tracking solution.",
      human_notes: "Good empathy shown, could improve response time.",
      turns: 6,
    },
    transcript: `Agent: Hello! I'm here to help you today. How can I assist you?

Persona: My order is THREE WEEKS LATE! This is completely unacceptable!

Agent: I sincerely apologize for the delay with your order. I understand how frustrating this must be. Let me look into this right away for you.

Persona: You better! I've been waiting forever and no one has given me any updates.

Agent: I've located your order. It appears there was a shipping delay due to weather conditions. I'm expediting it now and you'll receive it within 2 business days. I'm also applying a 20% refund to your account.

Persona: Well, that's better I guess. Will I get tracking info?

Agent: I've just sent tracking information to your email. You'll receive updates every step of the way. Is there anything else I can help you with?

Persona: No, that's fine. Thanks for actually helping.`,
  },
  {
    conversationid: "c2",
    personaid: "p2",
    persona_description: "Technical User - Asks detailed technical questions",
    testrunid: "tr1",
    promptversionid: "pv1",
    agentversion: "v2.3.1",
    avg_score: 7.2,
    avg_turns: 8,
    test_date: "2025-09-28T15:45:00Z",
    evaluation_criteria: [
      { criteria_name: "Empathy", score: 6 },
      { criteria_name: "Resolution", score: 7 },
      { criteria_name: "Efficiency", score: 7 },
      { criteria_name: "Accuracy", score: 9 },
    ],
    conversations_summary: {
      conversationid: "c2",
      outcome: "partial",
      score: 7.2,
      summary: "Agent provided accurate technical information but took longer than optimal.",
      human_notes: "Needs to be more concise with technical users.",
      turns: 8,
    },
    transcript: `Agent: Hi there! What can I help you with today?

Persona: I need to know if your API supports OAuth 2.0 with PKCE flow for mobile apps.

Agent: Yes, our API does support OAuth 2.0. Let me get you the specific details about PKCE.

Persona: Also, what's the rate limit and do you support webhook retries?

Agent: Our rate limit is 1000 requests per hour for standard accounts. For webhooks, we do support automatic retries with exponential backoff.

Persona: What's the backoff strategy exactly? And can I configure the retry attempts?

Agent: The backoff starts at 1 second and doubles with each retry, up to a maximum of 5 attempts. Currently, the retry count isn't configurable, but you can disable retries entirely if needed.

Persona: Okay, and what about the PKCE support?

Agent: Yes, PKCE is fully supported. You'll need to use the authorization code flow with the code_challenge and code_verifier parameters. Our documentation has implementation examples.

Persona: Perfect, thanks.`,
  },
  {
    conversationid: "c3",
    personaid: "p3",
    persona_description: "Confused Beginner - Needs step-by-step guidance",
    testrunid: "tr1",
    promptversionid: "pv1",
    agentversion: "v2.3.1",
    avg_score: 9.1,
    avg_turns: 5,
    test_date: "2025-09-28T16:20:00Z",
    evaluation_criteria: [
      { criteria_name: "Empathy", score: 10 },
      { criteria_name: "Resolution", score: 9 },
      { criteria_name: "Efficiency", score: 9 },
      { criteria_name: "Accuracy", score: 8 },
    ],
    conversations_summary: {
      conversationid: "c3",
      outcome: "success",
      score: 9.1,
      summary: "Agent patiently guided beginner through setup process with clear instructions.",
      human_notes: "Excellent patience and clarity.",
      turns: 5,
    },
    transcript: `Agent: Welcome! I'm here to help you get started. What would you like to do today?

Persona: Um, I'm not really sure how to use this. I just signed up.

Agent: No problem at all! Let's start with the basics. First, have you verified your email address? You should have received a verification email.

Persona: Oh, let me check... yes, I see it! I clicked the link.

Agent: Perfect! Now you're all set. The next step is to complete your profile. Click on your name in the top right corner, then select "Profile Settings". Would you like me to walk you through what to fill in?

Persona: Yes please, that would be helpful!

Agent: Great! You'll see fields for your name, company, and preferences. The only required field is your name - everything else is optional. Once you fill that in and click "Save", you'll be ready to start using all our features. Does that make sense?

Persona: Yes! That was really easy. Thank you so much!`,
  },
]

export const mockHeatmapData = mockPersonas.map((persona) => ({
  persona: persona.name,
  Empathy: Math.floor(Math.random() * 3) + 7,
  Resolution: Math.floor(Math.random() * 3) + 7,
  Efficiency: Math.floor(Math.random() * 3) + 7,
  Accuracy: Math.floor(Math.random() * 3) + 7,
}))
