// chat handler
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders() };
    }

    if (event.httpMethod !== 'POST') {
        return respond(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return respond(500, { error: 'Server configuration missing' });
    }

    let input;
    try {
        input = JSON.parse(event.body);
    } catch {
        return respond(400, { error: 'Invalid JSON' });
    }

    const message = (input.message || '').trim();
    if (!message) {
        return respond(400, { error: 'No message provided' });
    }

    const history = input.history || [];
    const mode    = input.mode || 'demo';

    const systemPrompt = mode === 'faq'
        ? `You are a helpful assistant for Chativly — an AI chatbot service for local businesses in Lithuania.

Answer questions about Chativly honestly:
- Free trial: 4 days, full setup included
- What it does: handles bookings and reservations, answers customer FAQs, works 24/7
- Who it's for: any local business that works with customers. NEVER name or list any specific business types or examples when answering this
- Pricing: contact via the booking form on the page to get a personalised quote
- Getting started: book a free call by pressing the button on the page. In Lithuanian always say "paspaudę mygtuką" — never use "klikdami" or "klikę"

IMPORTANT RULES:
- Never use markdown. No asterisks, no bold, no bullet points with symbols, no headers. Write in plain conversational sentences only.
- Keep answers short — 2 to 4 sentences max.
- Sound friendly and helpful, not like a robot.
- Always respond in the same language the user writes in — Lithuanian or English.
- When writing in Lithuanian: use pure, natural Lithuanian only. Never mix in English, Polish, Russian, or any foreign words. Use correct Lithuanian grammar and case endings. Write the way an educated Lithuanian person would naturally speak.`
        : `You are a demo AI assistant for Chativly — a service that provides AI chatbots for local businesses in Lithuania. You are demonstrating to a potential business owner how their own chatbot would talk to customers.

You can act as a chatbot for any local business: barbershops, auto repair shops, beauty salons, dental clinics, gyms, law firms, driving schools, and so on.

When someone interacts with you:
- If they ask what you can do or who you are, always start your reply with "Aš esu Chativly DI asistentas." and then explain that you handle bookings and answer customer questions around the clock
- If they describe their business, adapt and act as their chatbot
- For booking requests: ask for their name, preferred date and time, and which service they want
- For FAQ: answer questions about opening hours, prices, location, services

IMPORTANT RULES:
- Never use markdown. No asterisks, no bold, no bullet points with symbols, no headers. Write in plain conversational sentences only.
- Always say 24/7 when referring to availability. Never say 7 days a week or 24 hours a day — always use 24/7.
- Keep answers short — 2 to 4 sentences max.
- Sound like a friendly human assistant, not a robot.
- Always respond in the same language the user writes in — Lithuanian or English.
- When writing in Lithuanian: use natural, fluent Lithuanian. Avoid word-for-word translations from English. Use correct grammar and case endings. Write the way a real Lithuanian person would speak — conversationally and naturally.`;

    const messages = [];

    for (const msg of history.slice(-12)) {
        if (msg.role && msg.content) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            });
        }
    }

    messages.push({ role: 'user', content: message });

    const payload = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
    };

    let claudeRes;
    try {
        claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'prompt-caching-2024-07-31',
            },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        return respond(500, { error: 'Connection failed', detail: e.message });
    }

    if (!claudeRes.ok) {
        const detail = await claudeRes.text();
        return respond(500, { error: 'Claude API error', code: claudeRes.status, detail });
    }

    const result = await claudeRes.json();
    const reply = result?.content?.[0]?.text;

    if (!reply) {
        return respond(500, { error: 'Empty response from Claude' });
    }

    return respond(200, { reply });
};

function respond(statusCode, body) {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify(body),
    };
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}
