const apiKey = ""; 

export const callGeminiAPI = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Error HTTP! status: ${response.status}`);
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar una respuesta.";
    } catch (error) {
      if (i === 4) return "Error de conexión con la IA. Por favor, intente más tarde.";
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};