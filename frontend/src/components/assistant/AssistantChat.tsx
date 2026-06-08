import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../services/apiClient';
import type { AssistantAction } from '../../services/asistenteService';
import { sendAssistantMessage } from '../../services/asistenteService';
import type { AuthUser } from '../../types/auth';

interface AssistantChatProps {
  user: AuthUser;
  authToken: string | null;
  onUnauthorized: () => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  acciones?: AssistantAction[];
}

const adminSuggestions = [
  '¿Qué animales debería revisar para venta?',
  '¿Qué insumos debo comprar esta semana?',
  '¿Qué vacunas vencidas debo priorizar?',
  '¿Cómo viene la producción esta semana?',
  '¿Qué partos próximos tengo?',
  '¿Qué lotes de leche están por vencer?',
  '¿Cómo vienen las ventas del mes?',
];

const employeeSuggestions = [
  '¿Qué vacunas tengo pendientes?',
  '¿Qué stock está bajo?',
  '¿Qué animales están próximos a parir?',
  '¿Qué ordeñes faltan registrar?',
  '¿Qué tareas debería revisar hoy?',
];

export function AssistantChat({ user, authToken, onUnauthorized }: AssistantChatProps) {
  const navigate = useNavigate();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messageIdRef = useRef(1);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Hola, soy el Asistente IA. Puedo ayudarte a consultar datos del tambo y sugerirte dónde revisar cada tema.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const suggestions = user.role === 'ADMIN' ? adminSuggestions : employeeSuggestions;

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isLoading, isOpen]);

  function nextMessageId() {
    const id = messageIdRef.current;
    messageIdRef.current += 1;
    return id;
  }

  async function sendMessage(messageText: string) {
    const normalizedMessage = messageText.trim();
    if (!normalizedMessage || isLoading) return;

    setErrorMessage('');
    setInput('');
    setMessages((current) => [
      ...current,
      { id: nextMessageId(), role: 'user', text: normalizedMessage },
    ]);
    setIsLoading(true);

    try {
      const response = await sendAssistantMessage(authToken, normalizedMessage);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: response.respuesta,
          acciones: response.acciones,
        },
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        onUnauthorized();
        return;
      }

      const message = error instanceof ApiError
        ? error.message
        : 'No pude consultar el asistente en este momento.';
      setErrorMessage(message);
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: message },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function handleAction(action: AssistantAction) {
    navigate(action.url);
    setIsOpen(false);
  }

  return (
    <>
      {isOpen ? (
        <section className="assistant-panel" aria-label="Asistente IA">
          <header className="assistant-header">
            <div className="assistant-title">
              <span className="assistant-avatar" aria-hidden="true">
                <Bot size={18} />
              </span>
              <div>
                <strong>Asistente IA</strong>
                <small>Consultas con datos reales</small>
              </div>
            </div>
            <button
              type="button"
              className="assistant-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente"
            >
              <X size={18} />
            </button>
          </header>

          <div className="assistant-messages" ref={messagesRef}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`assistant-message assistant-message-${message.role}`}
              >
                <p>{message.text}</p>
                {message.acciones && message.acciones.length > 0 ? (
                  <div className="assistant-actions">
                    {message.acciones.map((action) => (
                      <button
                        key={`${message.id}-${action.url}-${action.label}`}
                        type="button"
                        onClick={() => handleAction(action)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {isLoading ? (
              <div className="assistant-message assistant-message-assistant assistant-loading">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          <div className="assistant-suggestions" aria-label="Preguntas sugeridas">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void sendMessage(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {errorMessage ? <p className="assistant-error">{errorMessage}</p> : null}

          <form className="assistant-form" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu pregunta..."
              rows={2}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar pregunta">
              <Send size={18} />
              <span>Enviar</span>
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="assistant-floating-button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Abrir Asistente IA"
      >
        <MessageCircle size={24} />
      </button>
    </>
  );
}
