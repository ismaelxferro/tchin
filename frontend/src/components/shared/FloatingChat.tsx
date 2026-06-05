import { useEffect, useRef, useState } from "react";
import { api } from "../../api/api";
import type { ChatMessage, Conversation, User } from "../../types";
import { formatDateTimeUS, getInitials } from "../../utils";
import { useAppModal } from "./AppModalProvider";

type Props = {
  currentUser: User;
  chatTarget: User | null;
  setChatTarget: (user: User | null) => void;
};

function FloatingChat({ currentUser, chatTarget, setChatTarget }: Props) {
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const { showAlert } = useAppModal();
  const chatBoxRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, 80);
  };

  const loadUnreadCount = async () => {
    const response = await api.get("/messages/unread-count");
    setUnreadCount(response.data.unreadCount);
  };

  const loadConversations = async () => {
    const response = await api.get("/messages/conversations");
    setConversations(response.data);
  };

  const loadConversation = async (target: User) => {
    const response = await api.get(`/messages/${target.id}`);
    setMessages(response.data);

    await loadUnreadCount();
    await loadConversations();

    scrollToBottom();
  };

  const openChatBox = async () => {
    setChatTarget(null);
    setMessages([]);
    setContent("");
    setChatOpen(true);

    await loadConversations();
    await loadUnreadCount();
  };

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(() => {
      loadUnreadCount();
      loadConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const openSelectedChat = async () => {
      if (!chatTarget) return;

      setChatOpen(true);
      await loadConversation(chatTarget);
    };

    openSelectedChat();
  }, [chatTarget]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const openConversation = async (conversation: Conversation) => {
    setChatTarget(conversation.user);
    await loadConversation(conversation.user);
  };

  const sendMessage = async () => {
    if (!chatTarget) return;

    if (!content.trim()) {
      await showAlert({
        title: "Empty message",
        message: "Message cannot be empty.",
      });
      return;
    }

    try {
      await api.post("/messages", {
        receiverId: chatTarget.id,
        content,
      });

      setContent("");
      await loadConversation(chatTarget);
    } catch {
      await showAlert({
        title: "Could not send message",
        message: "Something went wrong while sending this message.",
      });
    }
  };

  const closeChat = async () => {
    setChatOpen(false);
    setChatTarget(null);
    setMessages([]);
    setContent("");

    await loadUnreadCount();
    await loadConversations();
  };

  const backToConversations = async () => {
    setChatTarget(null);
    setMessages([]);
    setContent("");

    await loadConversations();
    await loadUnreadCount();
  };

  return (
    <>
      <button
        className={
          unreadCount > 0
            ? "floating-chat-button floating-chat-button-unread"
            : "floating-chat-button"
        }
        onClick={openChatBox}
      >
        💬

        {unreadCount > 0 && (
          <span className="chat-unread-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {chatOpen && (
        <div className="chat-popup">
          <div className="chat-popup-header">
            {chatTarget ? (
              <div className="chat-target-header">
                <button className="chat-back-button" onClick={backToConversations}>
                  ‹
                </button>

                <div className="chat-avatar">
                  {getInitials(chatTarget.fullName)}
                </div>

                <div>
                  <h3>{chatTarget.fullName}</h3>
                  <p className="small">{chatTarget.role === "TEACHER" ? "Teacher" : "Student"}</p>
                </div>
              </div>
            ) : (
              <h3>Messages</h3>
            )}

            <button className="chat-close-button" onClick={closeChat}>
              ×
            </button>
          </div>

          {!chatTarget && (
            <div className="chat-contact-list">
              {conversations.length === 0 && (
                <div className="empty-chat-state">
                  <p className="small">No conversations yet.</p>
                  <p className="small">
                    Open a course, go to Participants, and choose Send message.
                  </p>
                </div>
              )}

              {conversations.map((conversation) => (
                <button
                  className="chat-contact conversation-contact"
                  key={conversation.user.id}
                  onClick={() => openConversation(conversation)}
                >
                  <div className="conversation-avatar">
                    {getInitials(conversation.user.fullName)}
                  </div>

                  <div className="conversation-main">
                    <span>{conversation.user.fullName}</span>

                    <small className="conversation-preview">
                      {conversation.lastMessage}
                    </small>

                    <small>{formatDateTimeUS(conversation.lastMessageAt)}</small>
                  </div>

                  {conversation.unreadCount > 0 && (
                    <span className="conversation-unread-badge">
                      {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {chatTarget && (
            <>
              <div className="chat-box" ref={chatBoxRef}>
                {messages.map((message) => (
                  <div
                    className={
                      message.senderId === currentUser.id
                        ? "message-bubble own-message"
                        : "message-bubble"
                    }
                    key={message.id}
                  >
                    <p>{message.content}</p>
                    <span>{formatDateTimeUS(message.createdAt)}</span>
                  </div>
                ))}
              </div>

              <div className="chat-compose-row">
                <textarea
                  placeholder="Write a message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default FloatingChat;