// chatbot
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'api/chat.php'
    : '/.netlify/functions/chat';

function createChatInstance({ messagesId, inputId, sendId, mode, hintsId }) {
    const messagesEl = document.getElementById(messagesId);
    const inputEl    = document.getElementById(inputId);
    const sendEl     = document.getElementById(sendId);
    if (!messagesEl || !inputEl || !sendEl) return;

    let history = [];
    let waiting  = false;
    const typingId = 'typing_' + messagesId;

    function addMessage(content, role) {
        const div    = document.createElement('div');
        div.className = `message message--${role === 'user' ? 'user' : 'bot'}`;
        const bubble  = document.createElement('div');
        bubble.className = 'message__bubble';
        if (role === 'user') {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = content;
        }
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'message message--bot';
        div.id = typingId;
        div.innerHTML = `<div class="message__bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById(typingId);
        if (el) el.remove();
    }

    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || waiting) return;

        waiting = true;
        inputEl.value = '';
        sendEl.disabled = true;

        addMessage(text, 'user');
        showTyping();

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: history.slice(-12), mode }),
            });

            const raw = await res.text();
            let data;
            try {
                data = JSON.parse(raw);
            } catch {
                removeTyping();
                addMessage('Sorry, something went wrong on our end. Please try again in a moment.', 'bot');
                waiting = false;
                sendEl.disabled = false;
                return;
            }

            removeTyping();
            const reply = data.reply || 'Sorry, something went wrong on our end. Please try again in a moment.';
            addMessage(reply, 'bot');
            if (data.reply) {
                history.push({ role: 'user',      content: text });
                history.push({ role: 'assistant', content: data.reply });
            }
        } catch (e) {
            removeTyping();
            addMessage('Sorry, something went wrong. Please check your connection and try again.', 'bot');
        }

        waiting = false;
        sendEl.disabled = false;
        inputEl.focus();
    }

    sendEl.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    if (hintsId) {
        const hintsEl = document.getElementById(hintsId);
        if (hintsEl) {
            hintsEl.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', () => {
                    const text = li.textContent.replace(/^💬\s*"/, '').replace(/"$/, '').trim();
                    inputEl.value = text;
                    sendMessage();
                });
            });
        }
    }
}

// Initialise chat instances
createChatInstance({ messagesId: 'chatMessagesFaq',    inputId: 'chatInputFaq',    sendId: 'chatSendFaq',    mode: 'faq',  hintsId: 'faqHints'  });
createChatInstance({ messagesId: 'chatMessagesBubble', inputId: 'chatInputBubble', sendId: 'chatSendBubble', mode: 'demo' });

// Bubble toggle
const bubbleBtn   = document.getElementById('bubbleBtn');
const bubblePopup = document.getElementById('bubblePopup');
const bubbleClose = document.getElementById('bubbleClose');

if (bubbleBtn && bubblePopup) {
    bubbleBtn.addEventListener('click', () => {
        const isOpen = bubblePopup.classList.toggle('open');
        bubbleBtn.classList.toggle('open', isOpen);
    });
    if (bubbleClose) {
        bubbleClose.addEventListener('click', () => {
            bubblePopup.classList.remove('open');
            bubbleBtn.classList.remove('open');
        });
    }
}
