import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a professional nutritionist and food recognition AI.
When given an image of food, analyse it carefully and respond with ONLY a valid JSON object — no markdown, no code fences, no explanation.

The JSON must have exactly these fields:
{
  "name": "string — concise food name (e.g. 'Grilled Chicken Breast', 'Mixed Fruit Bowl')",
  "description": "string — one-sentence description of what you see",
  "quantity": number — estimated serving size in grams (integer),
  "calories": number — estimated total calories for the portion shown (integer),
  "protein": number — grams of protein (one decimal),
  "carbs": number — grams of carbohydrates (one decimal),
  "fat": number — grams of fat (one decimal),
  "confidence": "string — one of: high | medium | low"
}

Rules:
- Base macros on the actual visible portion/serving, not per 100g.
- If multiple distinct foods are visible, estimate for the whole plate.
- If the image is unclear or not food, set confidence to "low" and use your best guess.
- Return ONLY the JSON object. No other text whatsoever.`

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Please analyse the food in this image and return the JSON nutritional estimate.',
            },
          ],
        },
      ],
    })

    // Extract text from response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Parse JSON — strip any accidental markdown fences
    const cleanedText = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleanedText)
    } catch {
      console.error('Failed to parse Claude response as JSON:', responseText)
      return new Response(
        JSON.stringify({
          error: 'Could not parse nutritional data from image. Please try again.',
          raw: responseText,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('analyze-food-image error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
