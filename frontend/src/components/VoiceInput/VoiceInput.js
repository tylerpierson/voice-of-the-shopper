import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import styles from './VoiceInput.module.scss';

const VoiceInput = ({ onSpeechResult, handlePlaceHolder }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const lastFinalTranscriptRef = useRef('');

  const translateWord = (word) => {
    const translations = {
      hello: 'hola',
      world: 'mundo',
      how: 'cómo',
      are: 'estás',
      you: 'tú',
      doing: 'haciendo',
    };
    return translations[word.toLowerCase()] || word;
  };

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          finalTranscript = transcript;
          if (finalTranscript !== lastFinalTranscriptRef.current) {
            lastFinalTranscriptRef.current = finalTranscript;
            const translatedWord = translateWord(finalTranscript);
            onSpeechResult(finalTranscript, translatedWord);
          }
        } else {
          interimTranscript = transcript;
        }
      }

      if (interimTranscript) {
        handlePlaceHolder('Recognizing: ' + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    return recognition;
  };

  useEffect(() => {
    recognitionRef.current = initializeRecognition();
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      handlePlaceHolder('Type or click mic to speak...');
      recognitionRef.current.stop();
      recognitionRef.current.onend = () => {
        recognitionRef.current = initializeRecognition();
      };
    } else {
      handlePlaceHolder('Listening...');
      recognitionRef.current.start();
    }

    setIsListening((prev) => !prev);
  };

  return (
    <div className={styles.micContainer}>
      <button
        onClick={toggleListening}
        className={`${styles.micButton} ${isListening ? styles.micActive : ''}`}
        title={isListening ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        <FontAwesomeIcon icon={isListening ? faMicrophone : faMicrophoneSlash} />
      </button>
    </div>
  );
};

export default VoiceInput;
