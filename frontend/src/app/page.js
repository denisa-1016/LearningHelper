"use client";
import styles from "./page.module.css";
import { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";

export default function Home() {
    const [currentView, setCurrentView] = useState("login");
    const [showFlashcardModal, setShowFlashcardModal] = useState(false);
    //autentificare
    const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
    //backend
    const [backendMessage, setBackendMessage] = useState("Se incarca...");
    const [uploadMessage, setUploadMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    //ai
    const [summary, setSummary] = useState("");
    const [quiz, setQuiz] = useState([]);
    const [flashcards, setFlashcards] = useState([]);
    const [glossary, setGlossary] = useState("");
    //generare
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [isGeneratingCards, setIsGeneratingCards] = useState(false);
    const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
    //raspunsuri
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    //flashcards si audio
    const [flippedCards, setFlippedCards] = useState({});
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [audioState, setAudioState] = useState("idle");
    //camera
    const webcamRef = useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);

    useEffect(() => {
        fetch("https://learninghelper.onrender.com/api/test")
            .then((response) => response.json())
            .then((data) => setBackendMessage(data.message))
            .catch(() => setBackendMessage("Eroare: nu s-a putut face conectarea cu backend-ul"));
    }, []);

    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    const dataURLtoFile = (dataurl, filename) => {
        let arr = dataurl.split(","), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    };

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        const file = dataURLtoFile(imageSrc, "scanare_camera.jpg");
        setSelectedFile(file);
        setUploadMessage("Poza facuta");
        setIsCameraOpen(false);
    }, [webcamRef]);

    const resetStates = () => {
        setUploadMessage("");
        setSummary("");
        setQuiz([]);
        setFlashcards([]);
        setGlossary("");
        setUserAnswers({});
        setShowResults(false);
        setAudioState("idle");
        setCurrentFlashcardIndex(0);
        window.speechSynthesis.cancel();
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setImgSrc(null);
        setIsCameraOpen(false);
        resetStates();
    };

    const openCamera = () => {
        setIsCameraOpen(true);
        setImgSrc(null);
        setSelectedFile(null);
        resetStates();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            setUploadMessage("Selecteaza un fisier sau fa o poza!");
            return;
        }
        setIsLoading(true);
        resetStates();
        setUploadMessage("Documentul se proceseaza!");

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch("https://learninghelper.onrender.com/api/upload", { method: "POST", body: formData });
            if (!response.ok) throw new Error("Eroare la server!");
            const data = await response.json();
            setUploadMessage(`Fișierul a fost procesat cu succes!`);
            setSummary(data.summary);
        } catch (error) {
            setUploadMessage("A apărut o eroare la procesarea prin AI!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        if (!summary) return;
        if (flashcards.length > 0) {
            setShowFlashcardModal(true);
            return;
        }

        setIsGeneratingCards(true);
        try {
            const response = await fetch("https://learninghelper.onrender.com/api/flashcards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: summary }),
            });
            if (!response.ok) throw new Error("Eroare la generare");
            const data = await response.json();
            setFlashcards(data.flashcards);
            setFlippedCards({});
            setCurrentFlashcardIndex(0);
            setShowFlashcardModal(true);
        } catch (error) {
            alert("Eroare la generarea flashcardurilor.");
        } finally {
            setIsGeneratingCards(false);
        }
    };

    const handleGenerateQuiz = async () => {
        if (!summary) return;
        setIsGeneratingQuiz(true);
        try {
            const response = await fetch("https://learninghelper.onrender.com/api/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: summary }),
            });
            if (!response.ok) throw new Error("Eroare la generare");
            const data = await response.json();
            setQuiz(data.quiz);
            setUserAnswers({});
            setShowResults(false);
        } catch (error) {
            alert("Eroare la generarea testului.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const handleGenerateGlossary = async () => {
        if (!summary) return;
        setIsGeneratingGlossary(true);
        try {
            const response = await fetch("https://learninghelper.onrender.com/api/glossary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: summary }),
            });
            if (!response.ok) throw new Error("Eroare la generarea glosarului");
            const data = await response.json();
            setGlossary(data.glossary);
        } catch (error) {
            alert("Eroare la generarea glosarului.");
        } finally {
            setIsGeneratingGlossary(false);
        }
    };

    const handleNextCard = () => {
        if (currentFlashcardIndex < flashcards.length - 1) {
            setCurrentFlashcardIndex(prev => prev + 1);
            setFlippedCards({});
        }
    };

    const handlePrevCard = () => {
        if (currentFlashcardIndex > 0) {
            setCurrentFlashcardIndex(prev => prev - 1);
            setFlippedCards({});
        }
    };

    const toggleCard = (index) => setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
    const handleAnswerSelect = (qIndex, key) => setUserAnswers({ ...userAnswers, [qIndex]: key });

    const handlePlayPauseAudio = () => {
        if (!summary) return;
        if (audioState === "idle") {
            //citeste si glosarul
            const textToRead = glossary ? `${summary}. Urmeaza glosarul de termeni. ${glossary}` : summary;
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.lang = "ro-RO";
            utterance.rate = 1.0;
            utterance.onend = () => setAudioState("idle");
            utterance.onerror = () => setAudioState("idle");
            window.speechSynthesis.speak(utterance);
            setAudioState("playing");
        } else if (audioState === "playing") {
            window.speechSynthesis.pause();
            setAudioState("paused");
        } else if (audioState === "paused") {
            window.speechSynthesis.resume();
            setAudioState("playing");
        }
    };

    const handleStopAudio = () => {
        window.speechSynthesis.cancel();
        setAudioState("idle");
    };

    const handleRestartAudio = () => {
        window.speechSynthesis.cancel();
        setAudioState("idle");
        setTimeout(() => handlePlayPauseAudio(), 150);
    };

    const handleDownload = () => {
        if (!summary) return;
        const textToSave = glossary ? `${summary}\n\nGlosar de termeni\n\n${glossary}` : summary;
        const blob = new Blob([textToSave], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "SintezaCurs.txt";
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleAuthSubmit = (e) => {
        e.preventDefault();
        setCurrentView("dashboard");
    };

    const handleLogout = () => {
        setCurrentView("login");
        resetStates();
    };

    const renderFlashcardModal = () => {
        if (!showFlashcardModal || flashcards.length === 0) return null;

        const currentCard = flashcards[currentFlashcardIndex];

        return (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
                <div style={{ backgroundColor: "#fdfcff", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "600px", position: "relative", boxShadow: "0 15px 40px rgba(99, 102, 241, 0.2)" }}>

                    <button
                        onClick={() => { setShowFlashcardModal(false); setCurrentFlashcardIndex(0); setFlippedCards({}); }}
                        style={{ position: "absolute", top: "15px", right: "20px", background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", color: "#6366f1" }}
                    >
                        ✖️
                    </button>

                    <h2 style={{ textAlign: "center", color: "#4f46e5", marginBottom: "5px", fontSize: "28px" }}>Flashcards</h2>
                    <p style={{ textAlign: "center", color: "#818cf8", marginBottom: "30px" }}>Apasa pentru a vedea definitia</p>

                    <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
                        <div
                            onClick={() => toggleCard(currentFlashcardIndex)}
                            style={{ width: "100%", maxWidth: "450px", height: "250px", perspective: "1000px", cursor: "pointer" }}
                        >
                            <div style={{ width: "100%", height: "100%", transition: "transform 0.6s", transformStyle: "preserve-3d", transform: flippedCards[currentFlashcardIndex] ? "rotateY(180deg)" : "rotateY(0deg)", position: "relative" }}>
                                <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", backgroundColor: "#e0e7ff", border: "3px solid #6366f1", borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center", boxShadow: "0 8px 16px rgba(99, 102, 241, 0.15)" }}>
                                    <h3 style={{ margin: 0, color: "#312e81", fontSize: "24px" }}>{currentCard.concept}</h3>
                                </div>
                                <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", backgroundColor: "#6366f1", color: "white", borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center", transform: "rotateY(180deg)", boxShadow: "0 8px 16px rgba(99, 102, 241, 0.25)", overflowY: "auto" }}>
                                    <p style={{ margin: 0, fontSize: "18px", lineHeight: "1.5" }}>{currentCard.definition}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px", padding: "0 20px" }}>
                        <button
                            onClick={handlePrevCard}
                            disabled={currentFlashcardIndex === 0}
                            style={{ padding: "12px 20px", fontSize: "16px", backgroundColor: currentFlashcardIndex === 0 ? "#e0e7ff" : "#4f46e5", color: currentFlashcardIndex === 0 ? "#818cf8" : "white", border: "none", borderRadius: "10px", cursor: currentFlashcardIndex === 0 ? "not-allowed" : "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                        >
                            ⬅️
                        </button>

                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#4338ca", backgroundColor: "#e0e7ff", padding: "8px 20px", borderRadius: "20px", border: "1px solid #c7d2fe" }}>
                            {currentFlashcardIndex + 1} / {flashcards.length}
                        </span>

                        <button
                            onClick={handleNextCard}
                            disabled={currentFlashcardIndex === flashcards.length - 1}
                            style={{ padding: "12px 20px", fontSize: "16px", backgroundColor: currentFlashcardIndex === flashcards.length - 1 ? "#e0e7ff" : "#4f46e5", color: currentFlashcardIndex === flashcards.length - 1 ? "#818cf8" : "white", border: "none", borderRadius: "10px", cursor: currentFlashcardIndex === flashcards.length - 1 ? "not-allowed" : "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                        >
                            ➡️
                        </button>
                    </div>

                </div>
            </div>
        );
    };

    if (currentView === "login") {
        return (
            <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#eef2ff" }}>
                <div style={{ background: "white", padding: "40px", borderRadius: "15px", boxShadow: "0 10px 25px rgba(99, 102, 241, 0.1)", width: "100%", maxWidth: "400px", textAlign: "center" }}>
                    <h1 style={{ color: "#312e81", marginBottom: "20px" }}>Autentificare</h1>
                    <p style={{ color: "#6366f1", marginBottom: "30px" }}>Bine ai revenit pe platforma!</p>

                    <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <input type="email" placeholder="Email" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe", fontSize: "16px", backgroundColor: "#f8fafc" }} />
                        <input type="password" placeholder="Parolă" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe", fontSize: "16px", backgroundColor: "#f8fafc" }} />
                        <button type="submit" style={{ padding: "12px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "0.2s" }}>Intră în cont</button>
                    </form>

                    <p style={{ marginTop: "25px", color: "#64748b" }}>
                        Nu ai cont? <span onClick={() => setCurrentView("register")} style={{ color: "#4f46e5", cursor: "pointer", fontWeight: "bold" }}>Inregistreaza-te aici</span>
                    </p>
                </div>
            </main>
        );
    }

    if (currentView === "register") {
        return (
            <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#eef2ff" }}>
                <div style={{ background: "white", padding: "40px", borderRadius: "15px", boxShadow: "0 10px 25px rgba(99, 102, 241, 0.1)", width: "100%", maxWidth: "400px", textAlign: "center" }}>
                    <h1 style={{ color: "#312e81", marginBottom: "20px" }}>Creeaza un cont</h1>
                    <p style={{ color: "#6366f1", marginBottom: "30px" }}>Incepe sa inveti mai inteligent.</p>

                    <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <input type="text" placeholder="Nume complet" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe", fontSize: "16px", backgroundColor: "#f8fafc" }} />
                        <input type="email" placeholder="Email" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe", fontSize: "16px", backgroundColor: "#f8fafc" }} />
                        <input type="password" placeholder="Parolă" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe", fontSize: "16px", backgroundColor: "#f8fafc" }} />
                        <button type="submit" style={{ padding: "12px", backgroundColor: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "0.2s" }}>Creează contul</button>
                    </form>

                    <p style={{ marginTop: "25px", color: "#64748b" }}>
                        Ai deja cont? <span onClick={() => setCurrentView("login")} style={{ color: "#4f46e5", cursor: "pointer", fontWeight: "bold" }}>Conectează-te</span>
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main style={{ minHeight: "100vh", backgroundColor: "#eef2ff", display: "flex", flexDirection: "column", alignItems: "center", margin: 0, padding: 0 }}>
            <div style={{ width: "100%", padding: "15px 40px", backgroundColor: "white", boxShadow: "0 4px 15px rgba(99, 102, 241, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                <h2 style={{ margin: 0, color: "#4f46e5" }}>Platforma de Invatare</h2>
                <button onClick={handleLogout} style={{ padding: "8px 20px", backgroundColor: "#fff", border: "2px solid #818cf8", color: "#4f46e5", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
                    Deconectare
                </button>
            </div>

            <div style={{ maxWidth: "900px", width: "100%", padding: "0 20px" }}>
                <p style={{ textAlign: "center", marginBottom: "25px" }}>
                    <strong style={{ backgroundColor: "#e0e7ff", padding: "10px 20px", borderRadius: "25px", color: "#4338ca", fontSize: "15px" }}>
                        {backendMessage}
                    </strong>
                </p>

                <form onSubmit={handleSubmit} style={{ backgroundColor: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(99, 102, 241, 0.05)", textAlign: "center" }}>

                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "25px", margin: "20px 0", flexWrap: "wrap" }}>
                        <div style={{ padding: "20px", border: "2px dashed #818cf8", borderRadius: "15px", flex: "1", minWidth: "250px", backgroundColor: "#f8fafc", transition: "0.3s" }}>
                            <p style={{ margin: "0 0 15px 0", fontWeight: "bold", color: "#4f46e5" }}>Incarcare din memorie</p>
                            <input type="file" onChange={handleFileChange} accept=".pdf, .txt, .jpg, .png, .jpeg, .doc, .docx" style={{ color: "#64748b" }} />
                        </div>

                        <span style={{ fontWeight: "bold", color: "#94a3b8" }}>SAU</span>

                        <div style={{ padding: "20px", border: "2px dashed #a78bfa", borderRadius: "15px", flex: "1", minWidth: "250px", backgroundColor: "#f8fafc", transition: "0.3s" }}>
                            <p style={{ margin: "0 0 15px 0", fontWeight: "bold", color: "#7c3aed" }}>Foloseste camera</p>
                            <button type="button" onClick={openCamera} style={{ padding: "10px 25px", cursor: "pointer", backgroundColor: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", transition: "0.2s" }}>
                                Scaneaza materia
                            </button>
                        </div>
                    </div>

                    {isCameraOpen && (
                        <div style={{ margin: "20px auto", textAlign: "center", maxWidth: "500px", backgroundColor: "#f1f5f9", padding: "20px", borderRadius: "15px" }}>
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ border: "2px solid #cbd5e1", borderRadius: "10px" }} />
                            <div style={{ marginTop: "15px", display: "flex", justifyContent: "center", gap: "15px" }}>
                                <button type="button" onClick={capture} style={{ padding: "10px 25px", backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>📸 Fă Poza!</button>
                                <button type="button" onClick={() => setIsCameraOpen(false)} style={{ padding: "10px 25px", backgroundColor: "#94a3b8", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Anulează</button>
                            </div>
                        </div>
                    )}

                    {imgSrc && !isCameraOpen && (
                        <div style={{ margin: "25px 0", textAlign: "center" }}>
                            <img src={imgSrc} alt="Notite scanate" style={{ maxWidth: "300px", border: "3px solid #818cf8", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} />
                        </div>
                    )}

                    <button type="submit" style={{ padding: "16px 35px", fontSize: "18px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "10px", cursor: isLoading || (!selectedFile && !imgSrc) ? "not-allowed" : "pointer", fontWeight: "bold", marginTop: "25px", width: "100%", opacity: isLoading || (!selectedFile && !imgSrc) ? 0.6 : 1, transition: "0.3s", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" }} disabled={isLoading || (!selectedFile && !imgSrc)}>
                        {isLoading ? "Se proceseaza" : "Trimite materia"}
                    </button>
                </form>

                {uploadMessage && <div style={{ marginTop: "25px", padding: "15px", backgroundColor: "#e0e7ff", color: "#4338ca", borderRadius: "10px", textAlign: "center", fontWeight: "bold", border: "1px solid #c7d2fe" }}>{uploadMessage}</div>}


                {summary && (
                    <div style={{ marginTop: "50px", backgroundColor: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(99, 102, 241, 0.08)" }}>
                        <h2 style={{ borderBottom: "3px solid #6366f1", paddingBottom: "12px", marginBottom: "25px", color: "#312e81" }}>Sinteza Cursului</h2>
                        <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.7", color: "#334155", fontSize: "16px" }}>{summary}</p>

                        {glossary && (
                            <div style={{ marginTop: "45px", paddingTop: "25px", borderTop: "2px dashed #a78bfa" }}>
                                <h3 style={{ color: "#7c3aed", marginBottom: "15px", fontSize: "20px" }}>📖 Glosar de Termeni</h3>
                                <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.7", color: "#334155", fontSize: "16px" }}>{glossary}</p>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "15px", marginTop: "40px", justifyContent: "center", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", paddingTop: "25px" }}>
                            <button onClick={handleDownload} style={{ padding: "12px 25px", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
                                Descarca
                            </button>

                            <div style={{ display: "flex", gap: "5px", alignItems: "center", backgroundColor: "#e0e7ff", padding: "6px", borderRadius: "10px" }}>
                                <button type="button" onClick={handlePlayPauseAudio} style={{ padding: "10px 20px", fontSize: "15px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", backgroundColor: audioState === "playing" ? "#818cf8" : "#4f46e5", color: "white", transition: "0.2s" }}>
                                    {audioState === "idle" && "🔊 Asculta sinteza"}
                                    {audioState === "playing" && "⏸️ Pauza"}
                                    {audioState === "paused" && "▶️ Continua"}
                                </button>
                                {audioState !== "idle" && (
                                    <>
                                        <button type="button" onClick={handleRestartAudio} style={{ padding: "10px", backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }} title="Reia de la început">🔄</button>
                                        <button type="button" onClick={handleStopAudio} style={{ padding: "10px", backgroundColor: "#cbd5e1", color: "#475569", border: "none", borderRadius: "8px", cursor: "pointer" }} title="Oprește de tot">⏹️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {summary && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "25px", margin: "40px 0", flexWrap: "wrap" }}>

                        <div style={{ textAlign: "center" }}>
                            <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || quiz.length > 0} style={{ padding: "14px 28px", fontSize: "16px", backgroundColor: quiz.length > 0 ? "#10b981" : "#6366f1", color: "white", border: "none", borderRadius: "12px", cursor: quiz.length > 0 ? "default" : "pointer", fontWeight: "bold", opacity: isGeneratingQuiz ? 0.7 : 1, transition: "0.3s", boxShadow: quiz.length > 0 ? "none" : "0 4px 12px rgba(99, 102, 241, 0.3)" }}>
                                {isGeneratingQuiz ? "Se genereaza" : quiz.length > 0 ? "Test Generat" : "Genereaza un test grila"}
                            </button>
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <button onClick={handleGenerateFlashcards} disabled={isGeneratingCards} style={{ padding: "14px 28px", fontSize: "16px", backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", opacity: isGeneratingCards ? 0.7 : 1, transition: "0.3s", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)" }}>
                                {isGeneratingCards ? "Se genereaza" : flashcards.length > 0 ? "Vezi flashcards" : "Genereaza flashcards"}
                            </button>
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <button onClick={handleGenerateGlossary} disabled={isGeneratingGlossary || glossary} style={{ padding: "14px 28px", fontSize: "16px", backgroundColor: glossary ? "#10b981" : "#a855f7", color: "white", border: "none", borderRadius: "12px", cursor: glossary ? "default" : "pointer", fontWeight: "bold", opacity: isGeneratingGlossary ? 0.7 : 1, transition: "0.3s", boxShadow: glossary ? "none" : "0 4px 12px rgba(168, 85, 247, 0.3)" }}>
                                {isGeneratingGlossary ? "Se genereaza glosarul" : glossary ? "Glosar generat" : "Generează glosar"}
                            </button>
                        </div>

                    </div>
                )}

                {renderFlashcardModal()}

                {quiz.length > 0 && (
                    <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(99, 102, 241, 0.08)", marginBottom: "60px" }}>
                        <h2 style={{ borderBottom: "3px solid #6366f1", paddingBottom: "12px", marginBottom: "30px", color: "#312e81" }}>Test de verificare</h2>
                        {quiz.map((q, qIndex) => (
                            <div key={qIndex} style={{ marginBottom: "30px", padding: "25px", backgroundColor: "#f8fafc", borderRadius: "15px", border: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: "18px", marginBottom: "20px", color: "#1e293b", fontWeight: "500" }}><strong>{q.question}</strong></p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                    {Object.entries(q.options).map(([key, text]) => (
                                        <button key={key} style={{ padding: "15px", textAlign: "left", borderRadius: "10px", cursor: showResults ? "default" : "pointer", border: userAnswers[qIndex] === key ? "2px solid #6366f1" : "1px solid #cbd5e1", backgroundColor: userAnswers[qIndex] === key ? "#e0e7ff" : "white", fontSize: "16px", transition: "0.2s", color: "#334155" }} onClick={() => handleAnswerSelect(qIndex, key)} disabled={showResults}>
                                            <strong>{key}:</strong> {text}
                                        </button>
                                    ))}
                                </div>
                                {showResults && (
                                    <div style={{ marginTop: "20px", padding: "18px", borderRadius: "10px", backgroundColor: userAnswers[qIndex] === q.correctAnswer ? "#d1fae5" : "#fee2e2", color: userAnswers[qIndex] === q.correctAnswer ? "#065f46" : "#991b1b", border: `1px solid ${userAnswers[qIndex] === q.correctAnswer ? '#34d399' : '#f87171'}` }}>
                                        <p style={{ margin: "0 0 8px 0" }}><strong>Raspuns corect: {q.correctAnswer}</strong></p>
                                        <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5" }}>{q.explanation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {!showResults && (
                            <button onClick={() => setShowResults(true)} style={{ width: "100%", padding: "18px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "12px", fontSize: "18px", fontWeight: "bold", cursor: "pointer", marginTop: "25px", transition: "0.3s", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" }}>Verifică răspunsurile</button>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}