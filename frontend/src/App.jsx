import { useState, useEffect, useRef } from "react";
import { FaPaperclip } from "react-icons/fa";
import { GoArrowRight, GoArrowUp } from "react-icons/go";
import { IoMdClose } from "react-icons/io";
import { FiExternalLink } from "react-icons/fi";
import { FaExpand } from "react-icons/fa";
import { BiCollapse } from "react-icons/bi";
import "./App.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesContainerRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);


  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (popupRef.current?.contains(event.target)) return;

      setIsOpen(false);
      setIsExpanded(false);
      window.parent.postMessage("closeChatbot", "*");
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);


  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          language: navigator.language || "en-US",
          websiteUrl: "https://145914055.hs-sites-eu1.com/all-courses",
          chatHistory: messages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.isContactForm || (data.links && data.links.length === 0)) {
        setShowContactForm(true);
      }

      const cleanText = (data.reply || "")
        .replace(/^\*{1,2}Message to user:\*{1,2}\s*/i, "")
        .replace(/<JSON_OUTPUT>[\s\S]*<\/JSON_OUTPUT>/gi, "")
        .trim();

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: cleanText, links: data.links || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error contacting server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

      .replace(
        /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
        `
    <div class="link-header inline-link">
      <a href="$2" target="_blank" rel="noopener noreferrer">
        $1
      </a>
    </div>
    `
      )

      .replace(
        /(?:^|\n)(\d+)\.\s([\s\S]*?)(?=\n\d+\.\s|$)/g,
        (match, num, content) => `
      <div class="feature-item">
        <div class="feature-number">${num}</div>
        <div class="feature-text">${content.trim()}</div>
      </div>
    `
      )
      ;
  };

  const submitContactForm = async () => {
    const userDetails = `Name: ${userName}, Email: ${userEmail}`;
    setMessages((prev) => [...prev, { sender: "user", text: userDetails }]);
    setShowContactForm(false);
    setLoading(true);

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userDetails,
          language: navigator.language || "en-US",
          websiteUrl: "https://145914055.hs-sites-eu1.com/",
          chatHistory: messages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      if (userEmail) {
        await fetch(
          `https://api.hsforms.com/submissions/v3/integration/submit/${import.meta.env.VITE_HUBSPOT_PORTAL_ID}/${import.meta.env.VITE_HUBSPOT_FORM_ID}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: [
                { name: "email", value: userEmail },
                { name: "firstname", value: userName },
              ]
            }),
          }
        );
      }

      const thankYouMessage = `Vielen Dank für Ihre Kontaktaufnahme. Ich sehe, dass Sie mehr über Timeline erfahren möchten. Wenn Sie konkrete Fragen oder bereits ein Projekt im Sinn haben, stehen Ihnen unsere Berater gerne persönlich zur Verfügung. Sie können Sie individuell beraten und auf Ihre Bedürfnisse eingehen.

Ich habe Ihre E-Mail-Adresse bereits erhalten, und ein Berater wird sich in Kürze bei Ihnen melden. In der Zwischenzeit finden Sie hier einige hilfreiche Ressourcen, die für Sie interessant sein könnten.

Wenn Sie ein bestimmtes Anliegen besprechen möchten, lassen Sie es mich gerne wissen!`;

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: thankYouMessage },
      ]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error contacting server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`chat-popup ${isExpanded ? 'expanded' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
        ref={popupRef}
      >
        <div className="chat-popup-section">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M21.28 6.02634C22.5248 6.02634 23.7186 6.52082 24.5987 7.40099C25.4789 8.28116 25.9734 9.47493 25.9734 10.7197C25.9734 9.47493 26.4678 8.28116 27.348 7.40099C28.2282 6.52082 29.422 6.02634 30.6667 6.02634C29.422 6.02634 28.2282 5.53187 27.348 4.6517C26.4678 3.77152 25.9734 2.57776 25.9734 1.33301C25.9734 2.57776 25.4789 3.77152 24.5987 4.6517C23.7186 5.53187 22.5248 6.02634 21.28 6.02634ZM15.4134 30.6663C15.4134 26.9321 16.8968 23.3508 19.5373 20.7103C22.1778 18.0698 25.7591 16.5863 29.4934 16.5863C25.7591 16.5863 22.1778 15.1029 19.5373 12.4624C16.8968 9.82189 15.4134 6.24059 15.4134 2.50634C15.4134 6.24059 13.9299 9.82189 11.2894 12.4624C8.64892 15.1029 5.06762 16.5863 1.33337 16.5863C5.06762 16.5863 8.64892 18.0698 11.2894 20.7103C13.9299 23.3508 15.4134 26.9321 15.4134 30.6663Z" fill="#171A1C" />
                </svg>
                <span className="btn-gradient-text">Lassen Sie uns die passende Lösung für Sie finden.</span>
              </span>
            </div>

            <div className="chat-header-actions">
              <button
                className="expand-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <BiCollapse size={18} /> : <FaExpand size={18} />}
              </button>
              <button
                className="close-btn"
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                  (window.parent || window.top).postMessage("closeChatbot", "*");
                }}
                title="Close Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M11 1L1 11M1 1L11 11" stroke="#343A40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <p className="chat-subtitle">
            Erzählen Sie uns ein wenig über Ihr Unternehmen, Ihr Projekt und Ihre Anforderungen –
            unsere KI hilft Ihnen dabei, die perfekte Lösung zu finden.
          </p>

          <div className="chat-messages" ref={messagesContainerRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"
                  }`}
              >
                <div
                  className="bot-message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                />

                 {/* {i === messages.length - 1 &&
                  showContactForm &&
                  msg.sender === "bot" && (
                    <form
                      className="inline-contact-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitContactForm();
                      }}
                    >
                      <div className="contact-form-fields">
                        <input
                          type="text"
                          placeholder="Ihr Name"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          required
                        />
                        <input
                          type="email"
                          placeholder="Ihre E-Mail-Adresse"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          required
                        />
                        <button type="submit" className="icon-btn contact-send-btn">
                          <GoArrowRight />
                        </button>
                      </div>
                    </form>
                  )} */}
                {msg.links && msg.links.length > 0 && (
                  <div
                    className={`links-container ${msg.links.length > 4 ? "scrollable" : ""
                      }`}
                  >
                    {msg.links.map((link, j) => (
                      <div key={j} className="link-card">
                        <div className="link-header">
                          <span className="link-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <rect width="24" height="24" rx="12" fill="#FFECD4" />
                              <path d="M9.99999 13.9999L14 9.99992M11.3333 7.9998L11.642 7.64246C12.2672 7.01735 13.1151 6.6662 13.9992 6.66626C14.8833 6.66632 15.7312 7.01759 16.3563 7.6428C16.9814 8.268 17.3326 9.11592 17.3325 10C17.3325 10.8841 16.9812 11.732 16.356 12.3571L16 12.6665M12.6668 15.9999L12.4021 16.3559C11.7696 16.9814 10.9159 17.3322 10.0264 17.3322C9.13689 17.3322 8.28325 16.9814 7.65075 16.3559C7.33899 16.0477 7.09148 15.6806 6.92256 15.276C6.75364 14.8714 6.66666 14.4374 6.66666 13.9989C6.66666 13.5605 6.75364 13.1264 6.92256 12.7218C7.09148 12.3172 7.33899 11.9502 7.65075 11.6419L8.00008 11.3333" stroke="#FC7723" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.title}
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M9.08333 0.75L0.75 9.08333M9.08333 0.75H1.58333M9.08333 0.75V8.25" stroke="#FC7723" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                        </div>
                        <p className="link-desc">{link.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble bot-bubble">Tippen...</div>
            )}
          </div>

          <div className="chat-input-container">
            <div className="chat-input-row">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  placeholder="Hier eingeben"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button className="icon-btn send-btn" onClick={sendMessage}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path d="M6 1V12.6667M6 1L11 6M6 1L1 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <button className="icon-btn attach-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 5.83339L7.08333 11.2501C6.75181 11.5816 6.56556 12.0312 6.56556 12.5001C6.56556 12.9689 6.75181 13.4185 7.08333 13.7501C7.41485 14.0816 7.86449 14.2678 8.33333 14.2678C8.80217 14.2678 9.25181 14.0816 9.58333 13.7501L15 8.33339C15.663 7.67034 16.0355 6.77107 16.0355 5.83339C16.0355 4.8957 15.663 3.99643 15 3.33339C14.337 2.67034 13.4377 2.29785 12.5 2.29785C11.5623 2.29785 10.663 2.67034 10 3.33339L4.58333 8.75005C3.58877 9.74461 3.03003 11.0935 3.03003 12.5001C3.03003 13.9066 3.58877 15.2555 4.58333 16.2501C5.57789 17.2446 6.92681 17.8034 8.33333 17.8034C9.73985 17.8034 11.0888 17.2446 12.0833 16.2501L17.5 10.8334" stroke="#171A1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
