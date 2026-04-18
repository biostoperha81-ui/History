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
    } catch (error: any) {
      console.error("Initialization failed", error);
      if (error.message === 'QUOTA_EXCEEDED') {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: '⚠️ **Лимит запросов исчерпан при запуске.**\n\nДвигатель не смог инициализировать игру из-за квоты. Пожалуйста, подождите минуту и обновите страницу.' 
        };
        setHistory([errorMsg]);
      }
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
    } catch (error: any) {
      console.error("Failed to get next scene", error);
      if (error.message === 'QUOTA_EXCEEDED') {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: '⚠️ **Лимит запросов исчерпан.**\n\nДвигатель игры временно приостановлен из-за ограничений бесплатной квоты Google. Пожалуйста, подождите 1-2 минуты и попробуйте отправить действие снова. Ваш прогресс сохранен.' 
        };
        setHistory([...newHistory, errorMsg]);
      } else {
        alert("Произошла ошибка при связи с движком. Попробуйте еще раз.");
      }
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

      {/* Status Bar - Immersive HUD */}
      <header className="fixed top-0 inset-x-0 h-12 flex items-center justify-between px-4 sm:px-10 z-50 bg-gradient-to-b from-bg-primary/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="text-[9px] sm:text-[11px] uppercase tracking-[2px] text-accent font-medium truncate">
            {state.meta.location} <span className="opacity-30 mx-1">/</span> {state.meta.chapter}
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent/5 border border-accent/10">
            <Heart size={10} className="text-accent fill-accent/20" />
            <span className="text-[10px] sm:text-[12px] font-mono font-bold text-accent">{state.stats.relationshipPoints}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent/5 border border-accent/10">
            <Flame size={10} className="text-accent" />
            <span className="text-[10px] sm:text-[12px] font-mono font-bold text-accent">{state.stats.tensionLevel}</span>
          </div>
          <button 
            onClick={resetGame}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-90 transition-all text-text-muted hover:text-accent"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* Main Narrative Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 sm:px-10 pt-20 pb-40 space-y-20 scroll-smooth relative z-10 narrative-mask"
      >
        <div className="fixed top-12 right-6 sm:right-10 text-[8px] sm:text-[10px] text-text-muted italic flex items-center gap-2 opacity-40 z-40">
          <motion.div 
            animate={{ width: [8, 16, 8] }} 
            transition={{ repeat: Infinity, duration: 3 }}
            className="h-[1px] bg-accent" 
          />
          ATMOSPHERE: {state.meta.soundtrack}
        </div>

        <AnimatePresence mode="popLayout">
          {history.length === 0 && isLoading && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-accent" size={24} />
              <motion.p 
                key={loadingText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="font-serif italic tracking-[3px] text-text-muted text-[10px] uppercase text-center"
              >
                {loadingText}
              </motion.p>
            </div>
          )}
          {history.filter(m => m.role === 'assistant').map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="max-w-2xl mx-auto"
            >
              <div className="markdown-body font-serif">
                <ReactMarkdown
                  components={{
                    hr: () => <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent my-16 opacity-30" />,
                    p: ({children}) => <p className="leading-[1.8] mb-12 text-[19px] sm:text-[21px] text-text-main/90 font-light text-balance">{children}</p>,
                    strong: ({children}) => (
                      <span className="flex items-center gap-3 mb-6 mt-12 first:mt-0">
                        <span className="h-[2px] w-6 bg-accent opacity-40 inline-block" />
                        <b className="text-accent uppercase tracking-[4px] text-[13px] sm:text-[14px] font-sans font-semibold italic">{children}</b>
                      </span>
                    ),
                    code: ({children}) => (
                      <details className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
                        <summary className="text-[8px] uppercase tracking-[3px] cursor-pointer list-none text-center">Engine Data</summary>
                        <div className="mt-4 p-4 bg-black/50 rounded-lg text-[9px] font-mono leading-relaxed border border-white/5">
                          {children}
                        </div>
                      </details>
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

      {/* Input Overlay - Thumb Friendly */}
      <footer className="fixed bottom-0 inset-x-0 p-4 sm:p-8 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-50">
        <div className="max-w-2xl mx-auto relative">
          <div className="flex items-center gap-3 mb-3 ml-2">
            <motion.div 
               animate={{ opacity: [0.4, 1, 0.4] }} 
               transition={{ repeat: Infinity, duration: 2 }}
               className="w-1.5 h-1.5 rounded-full bg-accent"
            />
            <span className="text-[10px] uppercase tracking-[3px] text-accent/60 font-medium">Ваше действие</span>
          </div>
          
          <div className="relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-accent/30 transition-all shadow-2xl backdrop-blur-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Напишите, что вы чувствуете или делаете..."
              className="w-full bg-transparent py-4 sm:py-5 pl-5 pr-14 outline-none text-base sm:text-[17px] text-text-main placeholder:text-text-muted/20"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-accent/40 hover:text-accent disabled:text-zinc-800 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
          
          <div className="flex justify-center mt-4">
             <div className="px-3 py-1 bg-accent/5 border border-accent/10 rounded-full">
                <p className="text-[8px] sm:text-[9px] text-text-muted uppercase tracking-[3px] opacity-60">
                  Interactive Engine v1.2 • {state.meta.chapter}
                </p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
