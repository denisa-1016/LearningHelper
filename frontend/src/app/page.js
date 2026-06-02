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
    const [keywords, setKeywords] = useState([]);
    const [complexity, setComplexity] = useState(null);
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
    //salvare pachet
    const [savedDecks, setSavedDecks] = useState([]);

    useEffect(() => {
        fetch("http://45.80.149.49:8000/api/test")
            .then((response) => response.json())
            .then((data) => setBackendMessage(data.message))
            .catch(() => setBackendMessage("Eroare: nu s-a putut face conectarea cu backend-ul"));
    }, []);

    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    const fetchSavedDecks = async () => {
        try {
            const response = await fetch("http://45.80.149.49:8000/api/decks/user/1");
            if (!response.ok) throw new Error("Eroare la preluare");
            const data = await response.json();
            setSavedDecks(data);
        } catch (error) {
            console.error("Eroare la incarcarea pachetelor:", error);
        }
    };

    useEffect(() => {
        if (currentView === "dashboard") {
            fetchSavedDecks();
        }
    }, [currentView]);

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
        setKeywords([]);
        setComplexity(null);
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
            const response = await fetch("http://45.80.149.49:8000/api/upload", { method: "POST", body: formData });
            if (!response.ok) throw new Error("Eroare la server!");
            const data = await response.json();
            console.log("Date primite de la backend:", data);
            setUploadMessage(`Fișierul a fost procesat cu succes!`);
            setSummary(data.summary);
            setKeywords(data.keywords || []);
            setComplexity(data.complexity || null);
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
            const response = await fetch("http://45.80.149.49:8000/api/flashcards", {
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
            const response = await fetch("http://45.80.149.49:8000/api/quiz", {
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
            const response = await fetch("http://45.80.149.49:8000/api/glossary", {
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

    const handleExportAnki = () => {
        if (!flashcards || flashcards.length === 0) return;

        // Anki foloseste formatul csv
        // ghilimele duble ca sa nu apara probleme cand in definitie sunt virgule
        const csvContent = flashcards.map(card => {
            const safeConcept = card.concept.replace(/"/g, '""');
            const safeDefinition = card.definition.replace(/"/g, '""');
            return `"${safeConcept}","${safeDefinition}"`;
        }).join("\n");

        // \uFEFF pt citirea corecta a diacriticelor romanesti in Anki
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "Flashcards_Platforma_Invatare.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSaveToDatabase = async () => {
        if (!flashcards || flashcards.length === 0) return;

        // titlu pachet prin fereastra pop up
        const deckTitle = window.prompt("Introdu un titlu pentru pachetul tau:", "Sinteza Curs");

        // anulare salvare daca s-a apasat cancel
        if (!deckTitle) return;

        // pregatire date
        const deckData = {
            title: deckTitle,
            user_id: 1,
            cards: flashcards.map(card => ({
                concept: card.concept,
                definition: card.definition
            }))
        };

        try {
            const response = await fetch("http://45.80.149.49:8000/api/decks/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(deckData),
            });

            if (!response.ok) throw new Error("Eroare la salvare");

            const data = await response.json();
            alert("Pachetul a fost salvat cu succes in contul tau!");
            fetchSavedDecks();
        } catch (error) {
            console.error("Eroare:", error);
            alert("A aparut o eroare la salvarea pachetului in baza de date.");
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
            <div className={`${styles.modalOverlay} ${showFlashcardModal ? styles.modalVisible : ''}`}>
                <div className={styles.modalCard}>

                    <button
                        onClick={() => { setShowFlashcardModal(false); setCurrentFlashcardIndex(0); setFlippedCards({}); }}
                        className={styles.modalCloseButton}
                    >
                        ✖️
                    </button>

                    <h2 className={styles.modalHeading}>Flashcards</h2>
                    <p className={styles.modalSubheading}>Apasa pentru a vedea definitia</p>

                    <div className={styles.flashcardContainer}>
                        <div
                            onClick={() => toggleCard(currentFlashcardIndex)}
                            className={`${styles.flashcardInner} ${flippedCards[currentFlashcardIndex] ? styles.flashcardFlipped : ''}`}
                        >
                            <div className={styles.flashcardFront}>
                                <h3>{currentCard.concept}</h3>
                            </div>
                            <div className={styles.flashcardBack}>
                                <p>{currentCard.definition}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalNavigation}>
                        <button
                            onClick={handlePrevCard}
                            disabled={currentFlashcardIndex === 0}
                            className={`${styles.buttonNav} ${currentFlashcardIndex === 0 ? styles.buttonNavDisabled : styles.buttonNavEnabled}`}
                        >
                            ⬅️
                        </button>

                        <span className={styles.modalCounter}>
                            {currentFlashcardIndex + 1} / {flashcards.length}
                        </span>

                        <button
                            onClick={handleNextCard}
                            disabled={currentFlashcardIndex === flashcards.length - 1}
                            className={`${styles.buttonNav} ${currentFlashcardIndex === flashcards.length - 1 ? styles.buttonNavDisabled : styles.buttonNavEnabled}`}
                        >
                            ➡️
                        </button>
                    </div>

                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <button onClick={handleExportAnki} className={styles.buttonPrimaryAction}>
                            Descarca pentru Anki (CSV)
                        </button>
                        <button onClick={handleSaveToDatabase} className={styles.buttonPrimaryAction}>
                            Salveaza in cont
                        </button>
                    </div>

                </div>
            </div>
        );
    };

    if (currentView === "login") {
        return (
            <main className={styles.authContainer}>
                <div className={styles.authCard}>
                    <h1 className={styles.headingPrimary}>Autentificare</h1>
                    <p className={styles.headingAccent}>Bine ai revenit pe platforma!</p>

                    <form onSubmit={handleAuthSubmit} className={styles.authForm}>
                        <input type="email" placeholder="Email" required className={styles.inputField} />
                        <input type="password" placeholder="Parolă" required className={styles.inputField} />
                        <button type="submit" className={styles.buttonPrimary}>Intră în cont</button>
                    </form>

                    <p className={styles.authSwitchPrompt}>
                        Nu ai cont? <span onClick={() => setCurrentView("register")} className={styles.authSwitchLink}>Inregistreaza-te aici</span>
                    </p>
                </div>
            </main>
        );
    }

    if (currentView === "register") {
        return (
            <main className={styles.authContainer}>
                <div className={styles.authCard}>
                    <h1 className={styles.headingPrimary}>Creeaza un cont</h1>
                    <p className={styles.headingAccent}>Incepe sa inveti mai inteligent.</p>

                    <form onSubmit={handleAuthSubmit} className={styles.authForm}>
                        <input type="text" placeholder="Nume complet" required className={styles.inputField} />
                        <input type="email" placeholder="Email" required className={styles.inputField} />
                        <input type="password" placeholder="Parolă" required className={styles.inputField} />
                        <button type="submit" className={`${styles.buttonPrimary} ${styles.buttonPrimaryAlt}`}>Creează contul</button>
                    </form>

                    <p className={styles.authSwitchPrompt}>
                        Ai deja cont? <span onClick={() => setCurrentView("login")} className={styles.authSwitchLink}>Conectează-te</span>
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.dashboardContainer}>
            <div className={styles.header}>
                <h2 className={styles.logo}>Platforma de Invatare</h2>
                <button onClick={handleLogout} className={styles.buttonLogout}>
                    Deconectare
                </button>
            </div>

            <div className={styles.dashboardContent}>
                <p className={styles.statusBarContainer}>
                    <strong className={styles.statusBarText}>
                        {backendMessage}
                    </strong>
                </p>

                <form onSubmit={handleSubmit} className={styles.uploadCard}>

                    <div className={styles.uploadInputsContainer}>
                        <div className={styles.uploadInputBox}>
                            <p className={styles.uploadInputHeading}>Incarcare din memorie</p>
                            <input type="file" onChange={handleFileChange} accept=".pdf, .txt, .jpg, .png, .jpeg, .doc, .docx" className={styles.uploadFileField} />
                        </div>

                        <span className={styles.uploadSeparator}>SAU</span>

                        <div className={`${styles.uploadInputBox} ${styles.cameraInputBox}`}>
                            <p className={`${styles.uploadInputHeading} ${styles.cameraInputHeading}`}>Foloseste camera</p>
                            <button type="button" onClick={openCamera} className={styles.buttonCamera}>
                                Scaneaza materia
                            </button>
                        </div>
                    </div>

                    {isCameraOpen && (
                        <div className={styles.cameraPreviewContainer}>
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" className={styles.cameraPreview} />
                            <div className={styles.cameraActionsContainer}>
                                <button type="button" onClick={capture} className={styles.buttonPrimary}>📸 Fă Poza!</button>
                                <button type="button" onClick={() => setIsCameraOpen(false)} className={styles.buttonSubtle}>Anulează</button>
                            </div>
                        </div>
                    )}

                    {imgSrc && !isCameraOpen && (
                        <div className={styles.scannedImageContainer}>
                            <img src={imgSrc} alt="Notite scanate" className={styles.scannedImage} />
                        </div>
                    )}

                    <button type="submit" className={`${styles.buttonPrimaryLarge} ${isLoading || (!selectedFile && !imgSrc) ? styles.buttonDisabled : styles.buttonEnabled}`} disabled={isLoading || (!selectedFile && !imgSrc)}>
                        {isLoading ? "Se proceseaza" : "Trimite materia"}
                    </button>
                </form>

                {uploadMessage && <div className={styles.messageBox}>{uploadMessage}</div>}


                {summary && (
                    <div className={styles.summaryCard}>
                        <h2 className={styles.summaryHeading}>Sinteza Cursului</h2>
                        {complexity && (
                            <div className={styles.statsContainer}>
                                <div className={styles.statBox}>
                                    <span className={styles.statLabel}>Nivel de dificultate</span>
                                    <span className={styles.statValue}>{complexity.nivel}</span>
                                </div>
                                <div className={styles.statBox}>
                                    <span className={styles.statLabel}>Timp de citire</span>
                                    <span className={styles.statValue}>~{complexity.timp_citire_minute} min</span>
                                </div>
                                <div className={styles.statBox}>
                                    <span className={styles.statLabel}>Total cuvinte</span>
                                    <span className={styles.statValue}>{complexity.total_cuvinte}</span>
                                </div>
                            </div>
                        )}

                        {keywords && keywords.length > 0 && (
                            <div className={styles.keywordsContainer}>
                                <span className={styles.keywordsLabel}>Cuvinte cheie:</span>
                                <div className={styles.keywordsList}>
                                    {keywords.map((kw, idx) => (
                                        <span key={idx} className={styles.keywordBadge}>{kw}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <p className={styles.summaryText}>{summary}</p>

                        {glossary && (
                            <div className={styles.glossaryBox}>
                                <h3 className={styles.glossaryHeading}>📖 Glosar de Termeni</h3>
                                <p className={styles.glossaryText}>{glossary}</p>
                            </div>
                        )}

                        <div className={styles.summaryActionsContainer}>
                            <button onClick={handleDownload} className={styles.buttonDownload}>
                                Descarca
                            </button>

                            <div className={styles.audioActionsBox}>
                                <button type="button" onClick={handlePlayPauseAudio} className={styles.buttonPrimaryAlt}>
                                    {audioState === "idle" && "🔊 Asculta sinteza"}
                                    {audioState === "playing" && "⏸️ Pauza"}
                                    {audioState === "paused" && "▶️ Continua"}
                                </button>
                                {audioState !== "idle" && (
                                    <>
                                        <button type="button" onClick={handleRestartAudio} className={styles.buttonRestartAudio} title="Reia de la început">🔄</button>
                                        <button type="button" onClick={handleStopAudio} className={styles.buttonStopAudio} title="Oprește de tot">⏹️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {summary && (
                    <div className={styles.aiGenerationActions}>

                        <div className={styles.aiActionBox}>
                            <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || quiz.length > 0} className={`${styles.buttonPrimary} ${styles.buttonEnabled} ${quiz.length > 0 ? styles.buttonSuccess : ''}`}>
                                {isGeneratingQuiz ? "Se genereaza" : quiz.length > 0 ? "Test Generat" : "Genereaza un test grila"}
                            </button>
                        </div>

                        <div className={styles.aiActionBox}>
                            <button onClick={handleGenerateFlashcards} disabled={isGeneratingCards} className={styles.buttonSecondaryAI}>
                                {isGeneratingCards ? "Se genereaza" : flashcards.length > 0 ? "Vezi flashcards" : "Genereaza flashcards"}
                            </button>
                        </div>

                        <div className={styles.aiActionBox}>
                            <button onClick={handleGenerateGlossary} disabled={isGeneratingGlossary || glossary} className={`${styles.buttonSecondaryAI} ${glossary ? styles.buttonSuccess : ''}`}>
                                {isGeneratingGlossary ? "Se genereaza glosarul" : glossary ? "Glosar generat" : "Generează glosar"}
                            </button>
                        </div>

                    </div>
                )}

                {renderFlashcardModal()}

                {quiz.length > 0 && (
                    <div className={styles.quizCard}>
                        <h2 className={styles.summaryHeading}>Test de verificare</h2>
                        {quiz.map((q, qIndex) => (
                            <div key={qIndex} className={styles.quizQuestionBox}>
                                <p className={styles.quizQuestionText}><strong>{q.question}</strong></p>
                                <div className={styles.quizOptionsGrid}>
                                    {Object.entries(q.options).map(([key, text]) => (
                                        <button key={key} className={`${styles.quizOptionButton} ${userAnswers[qIndex] === key ? styles.quizOptionButtonSelected : ''}`} onClick={() => handleAnswerSelect(qIndex, key)} disabled={showResults}>
                                            <strong>{key}:</strong> {text}
                                        </button>
                                    ))}
                                </div>
                                {showResults && (
                                    <div className={`${styles.quizResultBox} ${userAnswers[qIndex] === q.correctAnswer ? styles.quizResultBoxCorrect : styles.quizResultBoxIncorrect}`}>
                                        <p style={{ margin: "0 0 8px 0" }}><strong>Raspuns corect: {q.correctAnswer}</strong></p>
                                        <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5" }}>{q.explanation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {!showResults && (
                            <button onClick={() => setShowResults(true)} className={styles.buttonPrimaryAction}>Verifică răspunsurile</button>
                        )}
                    </div>
                )}
                {/*afisarea pachetelor salvate*/}
                {savedDecks.length > 0 && (
                    <div className={styles.summaryCard} style={{ marginTop: "30px" }}>
                        <h2 className={styles.summaryHeading}>Flashcards salvate</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "15px", marginTop: "15px" }}>
                            {savedDecks.map((deck) => (
                                <div
                                    key={deck.id}
                                    style={{ border: "1px solid #e0e0e0", padding: "20px", borderRadius: "12px", cursor: "pointer", background: "#f9f9f9" }}
                                    onClick={() => { setFlashcards(deck.cards); setCurrentFlashcardIndex(0); setFlippedCards({}); setShowFlashcardModal(true); }}
                                >
                                    <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>{deck.title}</h3>
                                    <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>{deck.cards.length} flashcards</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}