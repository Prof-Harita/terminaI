import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceOrb({ onTranscript, disabled = false }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListening = useCallback(async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analysis for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start amplitude monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAmplitude = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAmplitude(avg / 255);
        animationFrameRef.current = requestAnimationFrame(updateAmplitude);
      };
      updateAmplitude();

      // MediaRecorder for actual recording
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        // Blob created from chunks for future STT integration
        // const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        onTranscript('[Voice input captured - STT integration pending]');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError('Microphone access denied');
      console.error('Voice capture failed:', err);
    }
  }, [disabled, onTranscript]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    audioContextRef.current?.close();

    setIsListening(false);
    setAmplitude(0);
  }, []);

  // Push-to-talk: Space key (when not in text input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isInputFocused()) {
        e.preventDefault();
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <button
      type="button"
      onMouseDown={startListening}
      onMouseUp={stopListening}
      onMouseLeave={stopListening}
      disabled={disabled}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-200 ease-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isListening
          ? 'bg-red-500 shadow-lg shadow-red-500/50'
          : 'bg-gray-700 hover:bg-gray-600'}
      `}
      title={error || 'Hold to speak'}
      aria-label="Voice input"
    >
      {/* Pulsing ring when listening */}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50"
          style={{ transform: `scale(${1 + amplitude * 0.5})` }}
        />
      )}

      {/* Mic icon */}
      <svg
        className={`w-5 h-5 ${isListening ? 'text-white' : 'text-gray-300'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      {/* Error indicator */}
      {error && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full" />
      )}
    </button>
  );
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active?.getAttribute('contenteditable') === 'true';
}
