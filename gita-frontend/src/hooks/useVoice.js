import { useState, useRef, useCallback } from "react";
import { SpeechRecognition as CapSpeechRecognition } from "@capacitor-community/speech-recognition";
import { LANGUAGES } from "../data/translations.js";

/**
 * Unified Voice Input Hook (Web Speech API + Native Android Capacitor SpeechRecognition)
 */
export function useVoiceInput({ language = "hi", onTranscript, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const cancelledRef = useRef(false);

  const isNativeAndroid =
    typeof window !== "undefined" &&
    Boolean(window.Capacitor?.isNativePlatform?.());

  const startRecording = useCallback(async () => {
    cancelledRef.current = false;
    const langObj =
      LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
    const speechLocale = langObj.speechLang || "hi-IN";

    // 1. Native Android Capacitor SpeechRecognition plugin
    if (isNativeAndroid) {
      try {
        const perm = await CapSpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== "granted") {
          const req = await CapSpeechRecognition.requestPermissions();
          if (req.speechRecognition !== "granted") {
            onError?.("Microphone permission was not granted.");
            return;
          }
        }
        setIsRecording(true);
        const result = await CapSpeechRecognition.start({
          language: speechLocale,
          maxResults: 2,
          prompt: "Speak to GitaGPT…",
          partialResults: false,
          popup: true
        });
        if (!cancelledRef.current && result?.matches?.[0]) {
          onTranscript?.(result.matches[0]);
        }
      } catch (err) {
        onError?.(err?.message || "Voice input cancelled.");
      } finally {
        setIsRecording(false);
      }
      return;
    }

    // 2. Web Speech API
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      onError?.("Voice input is supported in Chrome, Edge, and the Android app.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      if (cancelledRef.current) return;
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onTranscript?.(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsListeningFalse();

    function setIsListeningFalse() {
      setIsRecording(false);
    }

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, isNativeAndroid, onTranscript, onError]);

  const stopRecording = useCallback(async () => {
    if (isNativeAndroid) {
      try {
        await CapSpeechRecognition.stop();
      } catch {
        // ignore
      }
    }
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, [isNativeAndroid]);

  const cancelRecording = useCallback(async () => {
    cancelledRef.current = true;
    await stopRecording();
    onTranscript?.("");
  }, [stopRecording, onTranscript]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
