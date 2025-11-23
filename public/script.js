const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');
const chatBox = document.getElementById('chat-box');

// Array to store conversation history
const conversationHistory = [];

function formatBotResponse(text) {
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert * list items to <ul><li>...</li></ul>
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  lines.forEach(line => {
    if (line.trim().startsWith('* ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line.trim().substring(2)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += line + '<br>';
    }
  });
  if (inList) {
    html += '</ul>';
  }
  // Remove trailing <br> if it exists
  return html.replace(/<br>$/, '');
}

function appendMessage(sender, text, isBot = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (isBot) {
    msg.innerHTML = formatBotResponse(text);
  } else {
    msg.textContent = text;
  }
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg; // Return the element to allow modification
}

function showSelectedFile() {
  const file = fileInput.files[0];
  if (!file) {
    return;
  }

  // Hapus pratinjau file sebelumnya jika ada
  const existingPreview = document.querySelector('.file-preview');
  if (existingPreview) {
    existingPreview.remove();
  }

  const filePreview = document.createElement('div');
  filePreview.classList.add('file-preview');
  filePreview.textContent = `File: ${file.name}`;
  
  const removeBtn = document.createElement('span');
  removeBtn.textContent = '✖';
  removeBtn.onclick = () => {
    fileInput.value = ''; // Hapus file dari input
    filePreview.remove();
  };

  filePreview.appendChild(removeBtn);
  form.insertAdjacentElement('beforebegin', filePreview);
}

fileInput.addEventListener('change', showSelectedFile);

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  const selectedFile = fileInput.files[0];

  // Pengguna harus mengirim pesan atau file
  if (!userMessage && !selectedFile) {
    return;
  }

  // Clear welcome message on first message
  const welcomeMessage = chatBox.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  // Hapus pratinjau file setelah dikirim
  const filePreview = document.querySelector('.file-preview');
  if (filePreview) {
    filePreview.remove();
  }

  // 1. Add user's message to the chat box
  let messageToSend = userMessage;
  if (selectedFile) {
    // Tambahkan info file ke pesan yang ditampilkan
    messageToSend += `\n(File: ${selectedFile.name})`;
  }
  
  conversationHistory.push({ role: 'user', text: messageToSend.trim() });
  appendMessage('user', messageToSend.trim());

  // Reset input
  input.value = '';
  fileInput.value = '';

  // NOTE: The backend needs to be updated to handle multipart/form-data

  // 2. Show a temporary "Thinking..." bot message
  const thinkingMessage = document.createElement('div');
  thinkingMessage.classList.add('message', 'bot');
  thinkingMessage.textContent = 'Thinking...';
  chatBox.appendChild(thinkingMessage);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // 3. Send the user's message to the backend API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: conversationHistory,
      }),
    });

    if (!response.ok) {
      // Handle HTTP errors like 404, 500
      throw new Error('Failed to get response from server.');
    }

    const data = await response.json();

    // 4. Replace "Thinking..." with the AI's reply
    if (data && data.result) {
      const botResponse = data.result;
      conversationHistory.push({ role: 'bot', text: botResponse });
      thinkingMessage.innerHTML = formatBotResponse(botResponse);
    } else {
      // 5. Handle cases where the response is ok, but no result is found
      thinkingMessage.innerHTML = 'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Error fetching chat response:', error);
    // 5. Handle network errors or if the fetch fails
    thinkingMessage.innerHTML = 'Failed to get response from server.';
  } finally {
    // Ensure the chat box is scrolled to the bottom after the final message is set
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
