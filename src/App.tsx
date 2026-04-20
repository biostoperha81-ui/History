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
      } else if (error.message === 'MISSING_API_KEY') {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: '⚠️ **API ключ отсутствует.**\n\nПохоже, вы забыли настроить переменную окружения `VITE_GEMINI_API_KEY` в Cloudflare или другом сервисе хостинга.' 
        };
        setHistory([errorMsg]);
      } else {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: `⚠️ **Ошибка связи с движком.**\n\nПодробности: ${error.message || 'Неизвестная ошибка'}` 
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
      } else if (error.message === 'MISSING_API_KEY') {
        alert("Ошибка: отсутствует API ключ (VITE_GEMINI_API_KEY). Проверьте настройки окружения.");
      } else {
        alert(`Произошла ошибка при связи с движком: ${error.message || 'Неизвестная ошибка'}. Попробуйте еще раз.`);
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
    <div className="relative flex flex-col h-screen overflow-hidden bg-bg-primary text-text-main font-sans selection:bg-accent/30">
      {/* Immersive Background Layers */}
      <div className="bg-animated" />
      <div className="bg-noise" />
      <div className="vignette-overlay" />

      {/* Cinematic HUD - Top Bar */}
      <header className="fixed top-0 inset-x-0 h-16 flex items-center justify-between px-6 sm:px-12 z-50">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-[4px] text-accent font-bold">
            {state.meta.chapter}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-accent/60" />
            <span className="text-[11px] font-medium text-text-muted/80">{state.meta.location}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {/* Relationship Indicator - Detailed Bar */}
          <div className="hidden sm:flex flex-col gap-1.5 w-48">
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] uppercase tracking-widest text-accent/70 font-bold flex items-center gap-1.5">
                  <Heart size={10} className={state.stats.relationshipPoints > 50 ? "fill-accent" : ""} />
                  Притяжение
                </span>
                <span className="text-[10px] font-mono text-accent">{state.stats.relationshipPoints}%</span>
             </div>
             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${state.stats.relationshipPoints}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-accent/40 via-accent to-accent/40 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] uppercase tracking-widest text-text-muted/50">Напряжение</span>
               <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 w-3 rounded-full transition-colors duration-500 ${i < (state.stats.tensionLevel / 20) ? 'bg-accent/80' : 'bg-white/5'}`} 
                    />
                  ))}
               </div>
            </div>
            <button 
              onClick={resetGame}
              className="w-10 h-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 active:scale-90 transition-all text-text-muted hover:text-accent"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Ambient Atmosphere Indicator */}
      <div className="fixed top-20 right-6 sm:right-12 z-40 flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-[4px] text-accent/40">Atmosphere</span>
          <span className="text-[10px] italic text-text-muted/60">{state.meta.soundtrack}</span>
        </div>
        <motion.div 
          animate={{ height: [4, 12, 4] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-[1px] bg-accent/40" 
        />
      </div>

      {/* Narrative Stage */}
      <main className="flex-1 flex flex-col justify-end relative z-10 px-4 sm:px-12 pb-32 sm:pb-40">
        <div 
          ref={scrollRef}
          className="max-w-4xl mx-auto w-full max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar"
        >
          <AnimatePresence mode="popLayout">
            {history.length === 0 && isLoading && (
              <div className="h-40 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-accent/40" size={20} />
                <motion.p 
                  key={loadingText}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="font-serif italic tracking-[4px] text-text-muted text-[10px] uppercase"
                >
                  {loadingText}
                </motion.p>
              </div>
            )}
            
            {history.filter(m => m.role === 'assistant').map((msg, idx, filtered) => {
              const isLast = idx === filtered.length - 1;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                  animate={{ opacity: isLast ? 1 : 0.4, y: 0, filter: isLast ? 'blur(0px)' : 'blur(2px)' }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={`mb-16 last:mb-0 transition-all duration-1000 ${!isLast ? 'scale-[0.98]' : ''}`}
                >
                  <div className="markdown-body font-serif">
                    <ReactMarkdown
                      components={{
                        hr: () => <div className="h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent my-16 opacity-20" />,
                        p: ({children}) => (
                          <p className={`leading-[1.8] mb-8 text-[18px] sm:text-[22px] text-text-main font-light text-balance transition-colors duration-1000 ${isLast ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-text-muted/60'}`}>
                            {children}
                          </p>
                        ),
                        strong: ({children}) => (
                          <span className="flex items-center gap-4 mb-8 mt-16 first:mt-0">
                            <span className="h-[1px] w-12 bg-accent opacity-40 inline-block" />
                            <b className="text-accent uppercase tracking-[6px] text-[13px] sm:text-[14px] font-sans font-bold italic drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{children}</b>
                          </span>
                        ),
                        code: () => null,
                        pre: () => null
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {isLoading && history.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start py-8 pl-1"
            >
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-accent/40"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Stage Controls - Visual Novel Style Box */}
      <footer className="fixed bottom-0 inset-x-0 p-6 sm:p-12 z-50">
        <div className="max-w-4xl mx-auto w-full">
          <div className="glass-panel p-2 sm:p-3 rounded-3xl flex items-center gap-4 overflow-hidden ring-1 ring-white/10 shadow-inner">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ваше решение..."
                className="w-full bg-transparent py-4 sm:py-5 pl-6 pr-14 outline-none text-[16px] sm:text-[18px] text-white placeholder:text-text-muted/30 font-serif italic"
                disabled={isLoading}
              />
              <div className="absolute left-6 bottom-0 h-[2px] w-0 bg-accent transition-all duration-500 focus-within:w-[calc(100%-48px)]" />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-accent/20 text-accent/40 hover:text-accent disabled:text-white/5 transition-all active:scale-95 border border-white/5 group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <motion.div whileHover={{ x: 3 }}>
                  <Send size={24} className="group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                </motion.div>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
