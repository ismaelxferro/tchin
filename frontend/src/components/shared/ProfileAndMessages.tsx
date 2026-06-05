import { useEffect, useState } from "react";
import { api } from "../../api/api";
import type { ChatMessage, User } from "../../types";
import { formatDateTimeUS } from "../../utils";

type Props = {
  currentUser: User;
};

function ProfileAndMessages({ currentUser }: Props) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");

  const loadContacts = async () => {
    const response = await api.get("/messages/contacts");
    setContacts(response.data);
  };

  const openChat = async (contact: User) => {
    setSelectedContact(contact);

    const response = await api.get(`/messages/${contact.id}`);
    setMessages(response.data);
  };

  const sendMessage = async () => {
    if (!selectedContact) return;

    if (!content.trim()) {
      alert("Message cannot be empty.");
      return;
    }

    await api.post("/messages", {
      receiverId: selectedContact.id,
      content,
    });

    setContent("");

    const response = await api.get(`/messages/${selectedContact.id}`);
    setMessages(response.data);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return (
    <>
      <div className="panel">
        <h2>Profile</h2>

        <p>
          <strong>Name:</strong> {currentUser.fullName}
        </p>
        <p>
          <strong>Username:</strong> {currentUser.username}
        </p>
        <p>
          <strong>Email:</strong> {currentUser.email}
        </p>
        <p>
          <strong>Role:</strong> {currentUser.role}
        </p>
      </div>

      <div className="panel">
        <h2>Messages</h2>

        {contacts.length === 0 && <p className="small">No contacts yet.</p>}

        {contacts.map((contact) => (
          <div className="course-card" key={contact.id}>
            <h3>{contact.fullName}</h3>
            <p className="small">{contact.email}</p>
            <p className="small">{contact.role}</p>

            <button onClick={() => openChat(contact)}>Open chat</button>
          </div>
        ))}
      </div>

      {selectedContact && (
        <div className="panel">
          <h2>Chat with {selectedContact.fullName}</h2>

          <div className="chat-box">
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

          <textarea
            placeholder="Write a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <button onClick={sendMessage}>Send message</button>

          <button
            className="secondary"
            onClick={() => {
              setSelectedContact(null);
              setMessages([]);
            }}
          >
            Close chat
          </button>
        </div>
      )}
    </>
  );
}

export default ProfileAndMessages;