// App.js
import React, { useState, useRef } from 'react';
import Recorder from './recorder';
import './App.css';
import axios from 'axios';


const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordings, setRecordings] = useState([]);
    const [medicalText, setMedicalText] = useState(""); // State para o texto médico
    const [medicalAnalysis, setMedicalAnalysis] = useState(""); // State para o resultado da análise médica
    const audioContextRef = useRef(null);
    const gumStreamRef = useRef(null);
    const recorderRef = useRef(null);

    const startRecording = async () => {
        setIsRecording(true);
        setIsPaused(false);

        const constraints = { audio: true, video: false };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const input = audioContextRef.current.createMediaStreamSource(stream);
        gumStreamRef.current = stream;
        recorderRef.current = new Recorder(input, { numChannels: 1 });
        recorderRef.current.record();
    };

    const pauseRecording = () => {
        if (recorderRef.current.recording) {
            recorderRef.current.stop();
            setIsPaused(true);
        } else {
            recorderRef.current.record();
            setIsPaused(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setIsPaused(false);
        recorderRef.current.stop();
        gumStreamRef.current.getAudioTracks()[0].stop();

        recorderRef.current.exportWAV(blob => {
            const url = URL.createObjectURL(blob);
            const filename = new Date().toISOString() + '.wav';
            setRecordings(prev => [...prev, { url, filename, blob }]);
        });
    };

    const uploadRecordings = async () => {
        const formData = new FormData();
        recordings.forEach(recording => {
            formData.append('files', recording.blob, recording.filename);
        });

        try {
            const response = await axios.post('http://localhost:8000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('Upload successful:', response.data);
        } catch (error) {
            console.error('Error uploading files:', error);
        }
    };

    const handleMedicalAnalysis = async () => {
        try {
            const response = await axios.post('http://localhost:8000/analyze_medical_text', medicalText, {
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
            console.log('Response:', response.data); // Verifique a resposta no console
            setMedicalAnalysis(response.data);
        } catch (error) {
            console.error('Error analyzing medical text:', error);
            setMedicalAnalysis('Error analyzing text');
        }
    };
    return (
        <div>
            <div id="controls">
                <button onClick={startRecording} disabled={isRecording}>Record</button>
                <button onClick={pauseRecording} disabled={!isRecording}>
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
            </div>
            <p><strong>Recordings:</strong></p>
            <ol id="recordingsList">
                {recordings.map((recording, index) => (
                    <li key={index}>
                        <audio controls src={recording.url}></audio>
                        <a href={recording.url} download={recording.filename}>Save to disk</a>
                    </li>
                ))}
            </ol>
            {recordings.length > 0 && (
                <button onClick={uploadRecordings}>Transcribe Recording(s) to Text</button>
            )}
            <div id="formats">The transcriptions will be stored in the '/transcripts' folder.</div>
            <div id="medical-text-analysis">
                <h2>Medical Text Analysis</h2>
                <textarea
                    value={medicalText}
                    onChange={(e) => setMedicalText(e.target.value)}
                    placeholder="Enter medical text here..."
                    rows="4"
                    cols="50"
                ></textarea>
                <br />
                <button onClick={handleMedicalAnalysis}>Analyze Medical Text</button>
                <div id="medical-analysis-result">
                    <h3>Analysis Result:</h3>
                    <pre>{medicalAnalysis}</pre>
                </div>
            </div>
        </div>
    );
};

export default App;