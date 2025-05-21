// Variables globales y selección de elementos del DOM
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const transcriptionDiv = document.getElementById("transcription");
const summaryDiv = document.getElementById("summary");
const chatHistoryDiv = document.getElementById("chatHistory");
const chatInput = document.getElementById("chatInput");
const chatSendButton = document.getElementById("chatSendButton");
const saveClassButton = document.getElementById("saveClassButton");
const viewClassesButton = document.getElementById("viewClassesButton");
const notebooksDisplay = document.getElementById("notebooksDisplay");
const editorContainer = document.getElementById("editorContainer");
const editorArea = document.getElementById("editorArea");

let recognition;
let isRecording = false;
let finalTranscript = "";
let transcriptionText = "";
let summaryText = "";
let chatHistory = [];
let currentEditNotebook = null;
let currentEditIndex = null;

// Configuración de la Web Speech API para reconocimiento de voz
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log("Reconocimiento de voz iniciado.");
  };

  recognition.onerror = (event) => {
    console.error("Error en el reconocimiento de voz:", event.error);
    transcriptionDiv.textContent = "Error en el reconocimiento de voz. Inténtalo de nuevo.";
    startButton.disabled = false;
    stopButton.disabled = true;
    isRecording = false;
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }
    transcriptionText = finalTranscript + interimTranscript;
    transcriptionDiv.textContent = transcriptionText;
  };

  recognition.onend = () => {
    console.log("Reconocimiento de voz finalizado.");
    if (!isRecording && finalTranscript.trim() !== "") {
      summarizeText(finalTranscript.trim());
      finalTranscript = "";
    }
  };
} else {
  transcriptionDiv.textContent = "Tu navegador no soporta la Web Speech API.";
  startButton.disabled = true;
  stopButton.disabled = true;
}

// Manejo de botones de grabación
startButton.addEventListener("click", () => {
  if (!isRecording) {
    transcriptionDiv.textContent = "";
    summaryDiv.textContent = "Esperando resumen...";
    finalTranscript = "";
    transcriptionText = "";
    recognition.start();
    isRecording = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    console.log("Grabación iniciada");
  }
});

stopButton.addEventListener("click", () => {
  if (isRecording) {
    recognition.stop();
    isRecording = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    console.log("Grabación detenida");
  }
});

// Función para enviar la transcripción a la API y obtener el resumen
async function summarizeText(text) {
  summaryDiv.textContent = "Generando resumen...";
  try {
    const apiKey = 'AIzaSyAcIwwpEk9NxPNnPoOHPulJZ7V-tyuwxz0'; // Reemplaza con tu clave de API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Por favor, genera un resumen claro y conciso del siguiente texto, en formato de apuntes universitarios para clases de ingeniería:\n\n${text}` }
              ]
            }
          ]
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    let summary = data.candidates[0].content.parts[0].text;
    summaryText = summary || "No se pudo generar un resumen.";
    summaryDiv.innerHTML = summaryText;
    // Llamamos a MathJax para renderizar fórmulas en el resumen
    MathJax.typesetPromise([summaryDiv]).catch((err) => console.error(err));
  } catch (error) {
    console.error("Error al generar el resumen:", error);
    summaryDiv.textContent = "Ocurrió un error al generar el resumen. Inténtalo de nuevo.";
  }
}

// Función para enviar una pregunta al chat y obtener respuesta de la IA
async function sendChat() {
  const question = chatInput.value.trim();
  if (question === "") return;
  
  addChatMessage("Usuario", question);
  chatInput.value = "";
  
  const prompt = `Basado en la siguiente información:
  
Resumen de la clase:
${summaryText}

Transcripción:
${transcriptionText}

Pregunta: ${question}

Proporciona una respuesta eficiente y clara.`;
  
  try {
    const apiKey = 'AIzaSyAcIwwpEk9NxPNnPoOHPulJZ7V-tyuwxz0'; // Reemplaza con tu clave de API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    let answer = data.candidates[0].content.parts[0].text;
    addChatMessage("IA", answer || "No se pudo obtener respuesta.");
  } catch (error) {
    console.error("Error al enviar la pregunta:", error);
    addChatMessage("IA", "Ocurrió un error al procesar tu pregunta. Inténtalo de nuevo.");
  }
}

chatSendButton.addEventListener("click", sendChat);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat();
});

// Funciones para manejar el historial del chat
function addChatMessage(sender, message) {
  chatHistory.push({ sender, message });
  renderChatHistory();
}

function renderChatHistory() {
  chatHistoryDiv.innerHTML = "";
  chatHistory.forEach(msg => {
    const p = document.createElement("p");
    p.classList.add("chat-message", msg.sender === "Usuario" ? "user" : "ai");
    p.innerHTML = `<strong>${msg.sender}:</strong> ${msg.message}`;
    chatHistoryDiv.appendChild(p);
  });
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

// FUNCIONALIDAD PARA GUARDAR, VER, EDITAR Y BORRAR CLASES EN NOTEBOKS (localStorage)
saveClassButton.addEventListener("click", saveClass);
viewClassesButton.addEventListener("click", updateNotebooksDisplay);

function saveClass() {
  const notebookName = prompt("Introduce el nombre para tu notebook (por ejemplo, 'Telecomunicaciones 1'):");
  if (!notebookName) {
    alert("Debes ingresar un nombre para el notebook.");
    return;
  }
  const classRecord = {
    transcription: transcriptionText,
    summary: summaryText,
    timestamp: new Date().toLocaleString()
  };
  let notebooks = JSON.parse(localStorage.getItem("notebooks") || "{}");
  if (!notebooks[notebookName]) {
    notebooks[notebookName] = [];
  }
  notebooks[notebookName].push(classRecord);
  localStorage.setItem("notebooks", JSON.stringify(notebooks));
  alert("Clase guardada en el notebook: " + notebookName);
}

function updateNotebooksDisplay() {
  let notebooks = JSON.parse(localStorage.getItem("notebooks") || "{}");
  let displayHTML = "";
  for (let notebook in notebooks) {
    displayHTML += `<h3>${notebook}</h3>`;
    notebooks[notebook].forEach((record, index) => {
      displayHTML += `<div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0; border-radius: 5px;">
        <strong>Fecha:</strong> ${record.timestamp}<br>
        <strong>Resumen:</strong> ${record.summary}<br>
        <div class="record-buttons">
          <button class="edit-btn" onclick="openEditor('${notebook}', ${index})">Editar</button>
          <button class="delete-btn" onclick="deleteClass('${notebook}', ${index})">Eliminar</button>
        </div>
      </div>`;
    });
  }
  notebooksDisplay.innerHTML = displayHTML || "No hay clases guardadas.";
  MathJax.typesetPromise([notebooksDisplay]).catch((err) => console.error(err));
}

// Función para eliminar un registro. Si se elimina el último, también se elimina el notebook.
function deleteClass(notebookName, index) {
  if (!confirm("¿Estás seguro de que deseas eliminar este registro?")) return;
  let notebooks = JSON.parse(localStorage.getItem("notebooks") || "{}");
  notebooks[notebookName].splice(index, 1);
  if (notebooks[notebookName].length === 0) {
    delete notebooks[notebookName];
  }
  localStorage.setItem("notebooks", JSON.stringify(notebooks));
  updateNotebooksDisplay();
}

// Función para abrir el editor en línea y cargar el resumen
function openEditor(notebookName, index) {
  let notebooks = JSON.parse(localStorage.getItem("notebooks") || "{}");
  let record = notebooks[notebookName][index];
  currentEditNotebook = notebookName;
  currentEditIndex = index;
  editorArea.innerHTML = record.summary;
  editorContainer.style.display = "block";
  editorContainer.scrollIntoView({ behavior: "smooth" });
}

// Función para aplicar formato en el editor (execCommand)
function formatText(command, value = null) {
  document.execCommand(command, false, value);
}

// Función para guardar los cambios del editor
function saveEditor() {
  if (currentEditNotebook === null || currentEditIndex === null) return;
  let notebooks = JSON.parse(localStorage.getItem("notebooks") || "{}");
  notebooks[currentEditNotebook][currentEditIndex].summary = editorArea.innerHTML;
  localStorage.setItem("notebooks", JSON.stringify(notebooks));
  editorContainer.style.display = "none";
  currentEditNotebook = null;
  currentEditIndex = null;
  updateNotebooksDisplay();
}

// Función para cancelar la edición
function cancelEditor() {
  editorContainer.style.display = "none";
  currentEditNotebook = null;
  currentEditIndex = null;
}

// Hacer accesibles las funciones desde el HTML inline
window.openEditor = openEditor;
window.deleteClass = deleteClass;
window.formatText = formatText;
window.saveEditor = saveEditor;
window.cancelEditor = cancelEditor;