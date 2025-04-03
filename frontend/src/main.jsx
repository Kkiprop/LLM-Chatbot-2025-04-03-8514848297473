import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { backend } from 'declarations/backend';
import botImg from '/logo.svg';
import userImg from '/user.svg';
import '/index.css';
import axios from 'axios';

const App = () => {
  const [chat, setChat] = useState([
    { role: { system: null }, content: "I help you build the best trading portfolio" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoData, setCryptoData] = useState([]);
  const chatBoxRef = useRef(null);

  const formatDate = (date) => {
    const h = ('0' + date.getHours()).slice(-2);
    const m = ('0' + date.getMinutes()).slice(-2);
    return `${h}:${m}`;
  };

  const fetchCryptoData = async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: { vs_currency: 'usd', ids: 'bitcoin,ethereum,internet computer,solana,ripple', order: 'market_cap_desc' },
      });
      setCryptoData(response.data);
    } catch (e) {
      console.error("Error fetching crypto data:", e);
      setCryptoData([]);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const constructPrompt = (userMessage) => {
    let prompt = `User message: ${userMessage}\n\n`;
    prompt += "Crypto data:\n";
    cryptoData.forEach((coin) => {
      prompt += `${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price}\n`;
    });
    prompt += "\nProvide investment advice based on the above data and user message.";
    return prompt;
  };

  const askAgent = async (messages) => {
    try {
      const userMessage = messages[messages.length - 1].content;
      const prompt = constructPrompt(userMessage);
      const response = await backend.chat([{ role: { user: null }, content: prompt }]);
      setChat((prevChat) => {
        const newChat = [...prevChat];
        newChat.pop();
        newChat.push({ role: { system: null }, content: response });
        return newChat;
      });
    } catch (e) {
      console.error(e);
      setChat((prevChat) => [...prevChat, { role: { system: null }, content: "An error occurred. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const userMessage = { role: { user: null }, content: inputValue };
    setChat((prevChat) => [...prevChat, userMessage, { role: { system: null }, content: 'Thinking ...' }]);
    setInputValue('');
    setIsLoading(true);
    askAgent([...chat.slice(1), userMessage]);
  };

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        <div className="p-4 border-b bg-gray-100 text-center font-bold">Live Crypto Prices</div>
        <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
          {cryptoData.length > 0 ? (
            cryptoData.map((coin) => (
              <div key={coin.id} className="bg-blue-100 rounded-lg p-2 text-sm text-center shadow">
                {coin.name} ({coin.symbol.toUpperCase()}): ${coin.current_price}
              </div>
            ))
          ) : (
            <p className="text-red-500">Error fetching data</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto rounded-t-lg bg-gray-100 p-4" ref={chatBoxRef}>
          {chat.map((message, index) => {
            const isUser = 'user' in message.role;
            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                {!isUser && <img src={botImg} alt="Bot" className="mr-2 h-10 w-10 rounded-full" />}
                <div className={`max-w-[70%] rounded-lg p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-white shadow'}`}>
                  <div className={`mb-1 text-sm ${isUser ? 'text-white' : 'text-gray-500'}`}>{isUser ? 'User' : 'Bot'}</div>
                  <div>{message.content}</div>
                </div>
                {isUser && <img src={userImg} alt="User" className="ml-2 h-10 w-10 rounded-full" />}
              </div>
            );
          })}
        </div>
        <form className="flex rounded-b-lg border-t bg-white p-4" onSubmit={handleSubmit}>
          <input
            type="text"
            className="flex-1 rounded-l border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask anything ..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="rounded-r bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:bg-blue-300" disabled={isLoading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
