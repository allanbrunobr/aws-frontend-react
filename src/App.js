import React, { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();


function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [convertedBlob, setConvertedBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioRef = useRef(null);

    const startRecording = () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = handleDataAvailable;
                mediaRecorderRef.current.start();
                setIsRecording(true);
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
            });
    };

    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

    const handleDataAvailable = async (event) => {
        if (event.data.size > 0) {
            const blob = new Blob([event.data], { type: 'audio/webm' });
            setRecordedBlob(blob);
            await convertToWav(blob);
        }
    };

    const convertToWav = async (blob) => {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }
        const webmFile = await fetchFile(blob);
        await ffmpeg.writeFile('input.webm', webmFile);
        await ffmpeg.exec(['-i', 'input.webm', 'output.wav']);
        const data = await ffmpeg.readFile('output.wav');
        const wavBlob = new Blob([data.buffer], { type: 'audio/wav' });
        setConvertedBlob(wavBlob);
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append('audio', recordedBlob, 'audio.wav');
        fetch('http://localhost:8000/upload', {
            method: 'POST',
            body: formData,
        })
            .then(response => {
                console.log('Audio sent successfully!');
            })
            .catch(error => {
                console.error('Error sending audio:', error);
            });
    };

    const handlePlay = () => {
        audioRef.current.play();
    };

    return (
        <div className="audio-recorder">
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
            </button>
            {recordedBlob && (
                <div>
                    <audio ref={audioRef} src={URL.createObjectURL(recordedBlob)} controls />
                    <button onClick={handlePlay}>Reproduzir</button>
                    <button onClick={handleSubmit}>Enviar</button>
                </div>
            )}
        </div>
    );
}

export default AudioRecorder;
