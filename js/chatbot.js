const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

let history = [];
let waiting = false;

function addMessage(content, role) {
    const div = document.createElement('div');
    div.className = `message message--${role === 'user' ? 'user' : 'bot'}`;
    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    if (role === 'user') {
        bubble.textContent = content;
    } else {
        bubble.innerHTML = content;
    }
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message message--bot';
    div.id = 'typingIndicator';
    div.innerHTML = `<div class="message__bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || waiting) return;

    waiting = true;
    chatInput.value = '';
    chatSend.disabled = true;

    addMessage(text, 'user');

    showTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: history.slice(-12) })
        });

        const raw = await res.text();

        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            removeTyping();
            addMessage('Sorry, something went wrong on our end. Please try again in a moment.', 'bot');
            waiting = false;
            chatSend.disabled = false;
            return;
        }

        removeTyping();

        const reply = data.reply || 'Sorry, something went wrong on our end. Please try again in a moment.';
        addMessage(reply, 'bot');
        if (data.reply) {
            history.push({ role: 'user', content: text });
            history.push({ role: 'model', content: data.reply });
        }

    } catch (e) {
        removeTyping();
        addMessage('Sorry, something went wrong. Please check your connection and try again.', 'bot');
    }

    waiting = false;
    chatSend.disabled = false;
    chatInput.focus();
}

chatSend.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
