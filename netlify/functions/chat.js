exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders(),
        };
    }

    if (event.httpMethod !== 'POST') {
        return respond(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
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
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const systemPrompt = `You are a demo AI assistant for Chativly — a service that provides AI chatbots for local businesses in Lithuania. Your job is to show potential business owners how a chatbot would work on their website.

You can act as a chatbot for any local business: barbershops, auto repair shops, beauty salons, dental clinics, gyms, law firms, driving schools, and so on.

When someone interacts with you:
- If they ask what you can do, explain naturally that you handle bookings and answer customer questions around the clock
- If they describe their business, adapt and act as their chatbot
- For booking requests: ask for their name, preferred date and time, and which service they want
- For FAQ: answer questions about opening hours, prices, location, services

IMPORTANT RULES:
- Never use markdown. No asterisks, no bold, no bullet points with symbols, no headers. Write in plain conversational sentences only.
- Always say 24/7 when referring to availability. Never say 7 days a week or 24 hours a day — always use 24/7.
- Keep answers short — 2 to 4 sentences max.
- Sound like a friendly human assistant, not a robot.
- Always respond in the same language the user writes in — Lithuanian or English.`;

    const contents = [];

    for (const msg of history.slice(-12)) {
        if (msg.role && msg.content) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            });
        }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let geminiRes;
    try {
        geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        return respond(500, { error: 'Connection failed', detail: e.message });
    }

    if (!geminiRes.ok) {
        const detail = await geminiRes.text();
        return respond(500, { error: 'Gemini API error', code: geminiRes.status, detail });
    }

    const result = await geminiRes.json();
    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
        return respond(500, { error: 'Empty response from Gemini' });
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
