'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMeetingStore } from '@/lib/store';
import { chatWithMeeting } from '@/lib/llm';
import { filterTemplates } from '@/lib/templates';
import type { ChatMessage, Recipe } from '@/lib/types';

interface SendMessageArgs {
  displayText?: string;
  templatePrompt?: string;
  templateId?: string;
}

export type MeetingAssistantView = 'messages' | 'recipes';

export interface UseMeetingChatResult {
  input: string;
  setInput: (value: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  templates: Recipe[];
  filteredTemplates: Recipe[];
  templatesLoading: boolean;
  templatesError: string;
  assistantView: MeetingAssistantView;
  recipeQuery: string;
  selectedTemplateIndex: number;
  isDictating: boolean;
  canAsk: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  sendMessage: (args?: SendMessageArgs) => Promise<void>;
  selectTemplate: (template: Recipe) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleInputChange: (value: string) => void;
  toggleDictation: () => void;
  showMessages: () => void;
  reloadTemplates: () => Promise<void>;
}

export function useMeetingChat(): UseMeetingChatResult {
  const {
    segments,
    userNotes,
    enhancedNotes,
    chatMessages,
    isChatLoading,
    speakers,
    promptOptions,
    llmSettings,
    status,
    addChatMessage,
    setIsChatLoading,
  } = useMeetingStore();

  const [input, setInput] = useState('');
  const [templates, setTemplates] = useState<Recipe[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [isDictating, setIsDictating] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dictationRecognitionRef = useRef<SpeechRecognition | null>(null);
  const dictationBaseRef = useRef('');

  const resetInputHeight = useCallback(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '44px';
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesError('');
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data.error || '加载 Recipe 失败');
      }
      setTemplates(
        (data as Recipe[]).filter(
          (recipe) => recipe.surfaces === 'chat' || recipe.surfaces === 'both'
        )
      );
    } catch (error) {
      setTemplates([]);
      setTemplatesError(error instanceof Error ? error.message : '加载 Recipe 失败');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, templateFilter),
    [templateFilter, templates]
  );
  const assistantView: MeetingAssistantView = input.startsWith('/') ? 'recipes' : 'messages';

  useEffect(() => {
    if (input.startsWith('/')) {
      setTemplateFilter(input.slice(1));
      setSelectedTemplateIndex(0);
      return;
    }

    setTemplateFilter('');
  }, [input]);

  useEffect(() => {
    if (selectedTemplateIndex > filteredTemplates.length - 1) {
      setSelectedTemplateIndex(Math.max(filteredTemplates.length - 1, 0));
    }
  }, [filteredTemplates.length, selectedTemplateIndex]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
  }, []);

  const stopDictation = useCallback(() => {
    if (dictationRecognitionRef.current) {
      dictationRecognitionRef.current.onend = null;
      dictationRecognitionRef.current.stop();
      dictationRecognitionRef.current = null;
    }
    setIsDictating(false);
  }, []);

  const startDictation = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('当前浏览器不支持语音输入，请使用 Chrome');
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    dictationBaseRef.current = input ? `${input.trim()} ` : '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript;
      }

      handleInputChange(`${dictationBaseRef.current}${transcript.trim()}`.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Dictation error:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限以使用语音输入');
      }
      stopDictation();
    };

    recognition.onend = () => {
      dictationRecognitionRef.current = null;
      setIsDictating(false);
    };

    recognition.start();
    dictationRecognitionRef.current = recognition;
    setIsDictating(true);
  }, [handleInputChange, input, stopDictation]);

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      stopDictation();
      return;
    }

    startDictation();
  }, [isDictating, startDictation, stopDictation]);

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  const sendMessage = useCallback(
    async (args: SendMessageArgs = {}) => {
      const question = args.displayText || input.trim();
      if (!question || isChatLoading) return;

      if (dictationRecognitionRef.current) {
        dictationRecognitionRef.current.onend = null;
        dictationRecognitionRef.current.stop();
        dictationRecognitionRef.current = null;
        setIsDictating(false);
      }

      setInput('');
      resetInputHeight();
      setTemplateFilter('');

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: question,
        timestamp: Date.now(),
        templateId: args.templateId,
      };

      addChatMessage(userMessage);
      setIsChatLoading(true);

      try {
        const stream = await chatWithMeeting(
          segments,
          userNotes,
          enhancedNotes,
          chatMessages,
          args.templatePrompt || question,
          speakers,
          args.templatePrompt,
          promptOptions,
          llmSettings
        );

        if (!stream) {
          throw new Error('No stream');
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        const messageId = uuidv4();

        addChatMessage({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });

          useMeetingStore.setState((state) => ({
            chatMessages: state.chatMessages.map((message) =>
              message.id === messageId
                ? { ...message, content: fullContent }
                : message
            ),
          }));
        }
      } catch (error) {
        console.error('Chat error:', error);
        const detail = error instanceof Error ? error.message : '未知错误';
        addChatMessage({
          id: uuidv4(),
          role: 'assistant',
          content: `抱歉，请求出错了。\n\n${detail}`,
          timestamp: Date.now(),
        });
      } finally {
        setIsChatLoading(false);
      }
    },
    [
      addChatMessage,
      chatMessages,
      enhancedNotes,
      input,
      isChatLoading,
      llmSettings,
      promptOptions,
      resetInputHeight,
      segments,
      setIsChatLoading,
      speakers,
      userNotes,
    ]
  );

  const selectTemplate = useCallback(
    (template: Recipe) => {
      setInput('');
      resetInputHeight();
      void sendMessage({
        displayText: template.name,
        templatePrompt: template.prompt,
        templateId: template.id,
      });
    },
    [resetInputHeight, sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (assistantView === 'recipes' && filteredTemplates.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedTemplateIndex((index) =>
            Math.min(index + 1, filteredTemplates.length - 1)
          );
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedTemplateIndex((index) => Math.max(index - 1, 0));
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          selectTemplate(filteredTemplates[selectedTemplateIndex]);
          return;
        }

        if (event.key === 'Escape') {
          setInput('');
          resetInputHeight();
          return;
        }
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [
      assistantView,
      filteredTemplates,
      resetInputHeight,
      selectTemplate,
      selectedTemplateIndex,
      sendMessage,
    ]
  );

  const canAsk = segments.length > 0 || status !== 'idle';
  const showMessages = useCallback(() => {
    if (!input.startsWith('/')) return;
    setInput('');
    resetInputHeight();
  }, [input, resetInputHeight]);

  return {
    input,
    setInput: handleInputChange,
    messages: chatMessages,
    isLoading: isChatLoading,
    templates,
    filteredTemplates,
    templatesLoading,
    templatesError,
    assistantView,
    recipeQuery: templateFilter,
    selectedTemplateIndex,
    isDictating,
    canAsk,
    inputRef,
    sendMessage,
    selectTemplate,
    handleKeyDown,
    handleInputChange,
    toggleDictation,
    showMessages,
    reloadTemplates: loadTemplates,
  };
}
