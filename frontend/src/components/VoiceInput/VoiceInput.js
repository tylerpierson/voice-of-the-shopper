
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';


const VoiceInput = ({ onSpeechResult,handlePlaceHolder}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  
  const toggleMic = () => {
      setIsListening(prev => !prev);
      // Add your speech start/stop logic here
    };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      onSpeechResult(speechResult); // Send transcript to parent
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;
  }, [onSpeechResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      handlePlaceHolder('Type or click mic to speak...');
      recognitionRef.current.stop();
    } else {
      handlePlaceHolder('Listening...');
      recognitionRef.current.start();
    }

    setIsListening((prev) => !prev);
  };

  return (
    <div style={{ marginTop: '10px' }}>

<button
onClick={toggleListening}
style={{
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  color: '#808080',
  fontSize: '28px',
}}
title={isListening ? 'Mute Microphone' : 'Unmute Microphone'}
>
<FontAwesomeIcon icon={isListening ? faMicrophone : faMicrophoneSlash} />
</button>
    </div>
  );
};

export default VoiceInput;