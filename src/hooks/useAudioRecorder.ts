/**
 * Audio Recording & Speech-to-Text (STT) Hook
 * 
 * Free Built-in Transcription:
 * Uses the browser's native Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * to transcribe live speech without any API cost or external subscription.
 * 
 * =========================================================================================
 * 💡 HOW TO SWAP IN A PAID SPEECH-TO-TEXT (STT) SERVICE LATER:
 * =========================================================================================
 * 1. Google Cloud Speech-to-Text (@google-cloud/speech):
 *    - In your Firebase Cloud Function or Express server (server.ts), add `@google-cloud/speech`.
 *    - When the user stops recording, upload the audio Blob (e.g., audio/webm or audio/wav).
 *    - In the backend:
 *        const [response] = await speechClient.recognize({
 *          audio: { content: audioBuffer.toString('base64') },
 *          config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' }
 *        });
 *        return response.results.map(r => r.alternatives[0].transcript).join(' ');
 * 
 * 2. Gemini Pre-Recorded Audio Transcription (model: "gemini-3.5-transcribe"):
 *    - Pass the recorded base64 audio to your server:
 *        const response = await ai.models.generateContent({
 *          model: 'gemini-3.5-transcribe',
 *          contents: { parts: [{ inlineData: { mimeType: 'audio/webm', data: base64Audio } }, { text: 'Transcribe this audio verbatim.' }] }
 *        });
 * =========================================================================================
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Check MediaRecorder support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
    }

    // Check Web Speech API support
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      setTranscript('');
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks to turn off the microphone icon
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);

      // Start duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start Web Speech API transcription
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          let finalTrans = '';
          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTrans += event.results[i][0].transcript + ' ';
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            setTranscript((finalTrans + interim).trim());
          };

          recognition.onerror = (e: any) => {
            console.warn('Speech recognition warning:', e.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please grant microphone permissions in your browser.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    setTranscript('');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  }, [stopRecording]);

  return {
    isRecording,
    recordingDuration,
    transcript,
    setTranscript,
    audioBlob,
    audioUrl,
    isSupported,
    speechSupported,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
