import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Send, FileText, X, ExternalLink, MessageCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { API_URL } from '@/lib/config';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        fileName: string;
        description: string;
        downloadUrl: string;
    }>;
    timestamp: Date;
}

interface ChatInterfaceProps {
    onClose?: () => void;
    hideHeader?: boolean;
}

export default function ChatInterface({ onClose, hideHeader = false }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle auto-ask from external trigger
    useEffect(() => {
        const handleAutoAsk = async (event: CustomEvent) => {
            const query = event.detail;
            if (query && typeof query === 'string' && !loading) {
                setInputValue(query);
                setTimeout(async () => {
                    if (!query.trim()) return;

                    const userMessage: Message = {
                        id: Date.now().toString(),
                        role: 'user',
                        content: query.trim(),
                        timestamp: new Date()
                    };

                    setMessages(prev => [...prev, userMessage]);
                    setInputValue('');
                    setLoading(true);

                    try {
                        const answerResponse = await apiFetch('/search/ai', {
                            method: 'POST',
                            body: JSON.stringify({
                                query: query.trim(),
                                type: 'answer'
                            })
                        });

                        if (answerResponse.success && answerResponse.answer) {
                            const assistantMessage: Message = {
                                id: (Date.now() + 1).toString(),
                                role: 'assistant',
                                content: answerResponse.answer.answer || "I couldn't find any relevant information.",
                                sources: answerResponse.answer.sourceFiles || [],
                                timestamp: new Date()
                            };
                            setMessages(prev => [...prev, assistantMessage]);
                        } else {
                            setMessages(prev => [...prev, {
                                id: (Date.now() + 1).toString(),
                                role: 'assistant',
                                content: "I couldn't find any relevant information to answer your question.",
                                timestamp: new Date()
                            }]);
                        }
                    } catch (error) {
                        console.error('Chat error:', error);
                    } finally {
                        setLoading(false);
                    }
                }, 200);
            }
        };

        window.addEventListener('auto-ask', handleAutoAsk as EventListener);
        return () => {
            window.removeEventListener('auto-ask', handleAutoAsk as EventListener);
        };
    }, [loading]);

    const handleSend = async () => {
        if (!inputValue.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setLoading(true);

        try {
            const answerResponse = await apiFetch('/search/ai', {
                method: 'POST',
                body: JSON.stringify({
                    query: inputValue.trim(),
                    type: 'answer'
                })
            });

            if (answerResponse.success && answerResponse.answer) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: answerResponse.answer.answer || "I couldn't find any relevant information.",
                    sources: answerResponse.answer.sourceFiles || [],
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: "I couldn't find any relevant information to answer your question.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="h-[700px] flex flex-col shadow-lg">
            {!hideHeader && (
                <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-emerald-brand/10 to-emerald-brand/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-brand/20 rounded-lg">
                                <MessageCircle className="h-5 w-5 text-emerald-brand" />
                            </div>
                            <div>
                                <CardTitle className="text-charcoal">AI Assistant</CardTitle>
                                <p className="text-xs text-charcoal/60">Ask questions about your files</p>
                            </div>
                        </div>
                        {onClose && (
                            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-red-100 hover:text-red-600">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
            )}

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-emerald-brand/20 rounded-full blur-xl"></div>
                                <Brain className="h-16 w-16 text-emerald-brand relative z-10 animate-pulse" />
                            </div>
                            <p className="text-xl font-semibold text-charcoal mb-2">Start a conversation</p>
                            <p className="text-sm text-charcoal/60 max-w-md">
                                Ask questions about your files, extract information, or find specific details from your documents
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-brand/20 flex items-center justify-center">
                                            <Brain className="h-4 w-4 text-emerald-brand" />
                                        </div>
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${message.role === 'user'
                                            ? 'bg-emerald-brand text-white'
                                            : 'bg-white text-charcoal border border-emerald-brand/20'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                                        {message.content.split('\n').map((line, idx) => {
                                            const trimmed = line.trim();
                                            
                                            // Empty lines for spacing
                                            if (!trimmed) {
                                                return <div key={idx} className="h-2" />;
                                            }
                                            
                                            // Headers - lines that are entirely bold
                                            if (trimmed.match(/^\*\*[^*]+\*\*$/)) {
                                                const headerText = trimmed.replace(/\*\*/g, '');
                                                return (
                                                    <div key={idx} className="font-bold text-emerald-brand mt-4 mb-2 text-base first:mt-0">
                                                        {headerText}
                                                    </div>
                                                );
                                            }
                                            
                                            // Bullet points
                                            if (trimmed.match(/^[•\-\*]\s+/)) {
                                                const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
                                                return (
                                                    <div key={idx} className="flex items-start gap-2 my-1.5">
                                                        <span className="text-emerald-brand mt-0.5 font-bold">•</span>
                                                        <span className="flex-1">{bulletText}</span>
                                                    </div>
                                                );
                                            }
                                            
                                            // Numbered lists
                                            if (trimmed.match(/^\d+\.\s/)) {
                                                const listText = trimmed.replace(/^\d+\.\s/, '');
                                                return (
                                                    <div key={idx} className="flex items-start gap-2 my-1.5">
                                                        <span className="text-emerald-brand mt-0.5 font-semibold">
                                                            {trimmed.match(/^(\d+\.)/)?.[1]}
                                                        </span>
                                                        <span className="flex-1">{listText}</span>
                                                    </div>
                                                );
                                            }
                                            
                                            // Text with bold formatting
                                            if (trimmed.includes('**')) {
                                                const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
                                                return (
                                                    <div key={idx} className="my-2">
                                                        {parts.map((part, partIdx) => {
                                                            if (part.match(/^\*\*[^*]+\*\*$/)) {
                                                                const boldText = part.replace(/\*\*/g, '');
                                                                return (
                                                                    <strong key={partIdx} className="text-emerald-brand/90 font-semibold">
                                                                        {boldText}
                                                                    </strong>
                                                                );
                                                            }
                                                            return <span key={partIdx}>{part}</span>;
                                                        })}
                                                    </div>
                                                );
                                            }
                                            
                                            // Regular text
                                            return (
                                                <div key={idx} className="my-1.5 text-sm leading-relaxed">
                                                    {line}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Source files */}
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-emerald-brand/20">
                                            <p className="text-xs font-semibold mb-2 text-emerald-brand/80 uppercase tracking-wide">
                                                Source Files
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {message.sources.map((source, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => window.open(`${API_URL}${source.downloadUrl}`, '_blank')}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-brand/10 text-emerald-brand hover:bg-emerald-brand/20 transition-colors border border-emerald-brand/20"
                                                        title={`${source.description || source.fileName} - Click to open`}
                                                    >
                                                        <FileText className="h-3 w-3 flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs mt-3 opacity-50">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                {message.role === 'user' && (
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-brand flex items-center justify-center">
                                            <span className="text-white text-xs font-semibold">You</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-8 h-8 rounded-full bg-emerald-brand/20 flex items-center justify-center">
                                    <Brain className="h-4 w-4 text-emerald-brand animate-pulse" />
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl px-5 py-3 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-emerald-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-emerald-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-emerald-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-sm text-charcoal/60 ml-2">AI is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="flex-shrink-0 border-t bg-white p-4">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask a question about your files..."
                                className="w-full min-h-[60px] max-h-[150px] p-4 pr-12 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-emerald-brand focus:ring-2 focus:ring-emerald-brand/20 transition-all bg-gray-50 focus:bg-white"
                                disabled={loading}
                            />
                        </div>
                        <Button
                            variant="hero"
                            onClick={handleSend}
                            disabled={loading || !inputValue.trim()}
                            className="h-[60px] px-6 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                        <p className="text-xs text-charcoal/50">
                            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send,
                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs ml-1">Shift+Enter</kbd> for new line
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


