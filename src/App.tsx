/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Flame, MapPin, Send, RotateCcw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { storage } from './lib/storage';
import { GameState, ChatMessage, INITIAL_STATE } from './types';
import { getNextScene } from './services/geminiService';

export default function App() {
  const [history, setHistory] = useState<ChatMessage[]>(() => 
    storage.load('novel_history', () => [])
  );
  const [state, setState] = useState<GameState>(() => 
    storage.load('novel_state', () => INITIAL_STATE)
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Анализ сюжетных линий...');

  useEffect(() => {
    if (isLoading) {
      const texts = ['Ищу слова...', 'Персонаж обдумывает ответ...', 'Связываю нити судьбы...', 'Запахи старой спальни...', 'Напряжение нарастает...'];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storage.save('novel_history', history);
    storage.save('novel_state', state);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, state]);

  useEffect(() => {
    if (history.length === 0) {
      handleInitialization();
    }
  }, []);

  const handleInitialization = async () => {
    setIsLoading(true);
    try {
      const initMessage: ChatMessage = {
        role: 'user',
        content: '[START_COMMAND] Инициализируй Пролог. Место действия: Спальня после первой ночи. Персонажи: Главная героиня и Женя. Музыка: Выбери из списка в конце книги. Контекст: Спустя 7 лет ожидания. Опиши сцену пробуждения, используя психологические паттерны из "Психологии любви".'
      };
      const { text, newState } = await getNextScene([initMessage], INITIAL_STATE);
      setHistory([{ role: 'assistant', content: text, state: newState }]);
      setState(newState);
    } catch (error) {
      console.error("Initialization failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const { text, newState } = await getNextScene(newHistory, state);
      setHistory([...newHistory, { role: 'assistant', content: text, state: newState }]);
      setState(newState);
    } catch (error) {
      console.error("Failed to get next scene", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    if (window.confirm("Вы уверены, что хотите начать сначала? Прогресс будет потерян.")) {
      storage.clear();
      setHistory([]);
      setState(INITIAL_STATE);
      handleInitialization();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-main font-sans selection:bg-accent/30 overflow-hidden">
      <div className="bg-vignette" />

      {/* Status Bar */}
      <header className="min-h-[60px] flex flex-wrap items-center justify-between px-4 sm:px-10 py-3 bg-glass-dark backdrop-blur-md border-b border-border-accent z-20 gap-y-2">
        <div className="flex items-center gap-2 max-w-[50%]">
          <div className="text-[10px] sm:text-[12px] uppercase tracking-[1px] sm:tracking-[2px] text-accent font-medium truncate">
            📍 {state.meta.location} <span className="hidden xs:inline">• {state.meta.chapter}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex items-center gap-1.5 text-accent"
          >
            <span className="text-[10px] sm:text-[12px] uppercase tracking-[1px] font-medium opacity-50 sm:block hidden">❤️ RP:</span>
            <Heart size={14} className="sm:hidden text-accent" />
            <span className="text-[12px] sm:text-[14px] font-mono">{state.stats.relationshipPoints}</span>
          </motion.div>
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="flex items-center gap-1.5 text-accent"
          >
            <span className="text-[10px] sm:text-[12px] uppercase tracking-[1px] font-medium opacity-50 sm:block hidden">🔥 Напряжение:</span>
            <Flame size={14} className="sm:hidden text-accent" />
            <span className="text-[12px] sm:text-[14px] font-mono">{state.stats.tensionLevel}</span>
          </motion.div>
          <div className="flex items-center gap-1.5 text-accent hidden xs:flex">
            <span className="text-[10px] sm:text-[12px] uppercase tracking-[1px] font-medium opacity-50 sm:block hidden">👤 Тип:</span>
            <span className="text-[12px] sm:text-[14px] font-sans truncate max-w-[60px] sm:max-w-none">
              {state.stats.psychotype === 'avoidant' ? 'Избег.' : state.stats.psychotype === 'anxious' ? 'Тревож.' : 'Надеж.'}
            </span>
          </div>
          <button 
            onClick={resetGame}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-accent sm:ml-4"
            title="Сбросить историю"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* Main Narrative Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 sm:px-10 py-10 sm:py-16 space-y-16 sm:space-y-20 scroll-smooth relative z-10"
      >
        <div className="absolute top-4 right-5 sm:right-10 text-[9px] sm:text-[11px] text-text-muted italic flex items-center gap-2 opacity-60">
          <motion.div 
            animate={{ width: [10, 20, 10] }} 
            transition={{ repeat: Infinity, duration: 3 }}
            className="h-px bg-accent" 
          />
          Playing: {state.meta.soundtrack}
        </div>

        <AnimatePresence mode="popLayout">
          {history.length === 0 && isLoading && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-accent" size={32} />
              <motion.p 
                key={loadingText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-serif italic tracking-widest text-text-muted text-sm border-b border-accent/20 pb-2"
              >
                {loadingText}
              </motion.p>
            </div>
          )}
          {history.filter(m => m.role === 'assistant').map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="max-w-4xl mx-auto"
            >
              <div className="markdown-body font-serif">
                <ReactMarkdown
                  components={{
                    hr: () => <div className="h-px bg-gradient-to-r from-transparent via-border-accent to-transparent my-12" />,
                    p: ({children}) => <p className="leading-[1.7] mb-8 sm:mb-10 text-lg sm:text-[22px] text-[#d1d1c1] hyphens-auto text-balance sm:text-left">{children}</p>,
                    strong: ({children}) => (
                      <span className="block border-l-2 border-accent pl-4 sm:pl-6 my-6 sm:my-8 bg-accent/5 py-2">
                        <b className="text-accent uppercase tracking-[1px] text-[16px] sm:text-[18px] font-sans pr-2 block sm:inline mb-1 sm:mb-0">{children}</b>
                      </span>
                    ),
                    code: ({children}) => (
                      <footer className="mt-12 bg-[#0a0908] border-t border-[#1a1a1a] p-6 sm:p-8 -mx-5 sm:-mx-10 rounded-b-lg">
                        <div className="text-[9px] uppercase text-[#444] tracking-[1.5px] sm:tracking-[2px] mb-3">SYSTEM_STATE_OBJECT</div>
                        <div className="font-mono text-[10px] sm:text-[12px] text-[#555] truncate hover:text-zinc-500 transition-colors cursor-help">
                          {children}
                        </div>
                      </footer>
                    )
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && history.length > 0 && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-accent/50" size={24} />
          </div>
        )}
      </div>

      {/* Input Overlay */}
      <footer className="p-4 sm:p-10 bg-gradient-to-t from-bg-primary to-transparent z-20">
        <div className="max-w-4xl mx-auto relative">
          <div className="text-accent italic text-base sm:text-[18px] mb-4 sm:mb-6 animate-pulse opacity-80 font-serif">
            Опишите ваше следующее действие...
          </div>
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Введите здесь..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-4 sm:py-5 pl-4 sm:pl-8 pr-14 sm:pr-16 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all text-base sm:text-[18px] text-text-main placeholder:text-text-muted/30"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2 text-accent/40 hover:text-accent disabled:text-zinc-800 transition-all active:scale-90"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
        <p className="text-center text-[8px] sm:text-[10px] text-text-muted mt-6 sm:mt-8 uppercase tracking-[0.2em] opacity-40 flex items-center justify-center gap-2">
          <motion.span 
            animate={{ opacity: [0.3, 1, 0.3] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 rounded-full bg-accent"
          />
          Powered by Gemini • Interactive Engine v1.1 • {state.meta.chapter}
        </p>
      </footer>
    </div>
  );
}
