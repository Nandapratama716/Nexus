import os
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate

# Model Ollama yang akan digunakan (misal: mistral, llama3, atau gemma)
# Pastikan Anda sudah menjalankan `ollama run <model_name>` di lokal
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# Inisialisasi LLM
llm = Ollama(model=OLLAMA_MODEL)

# Prompt sederhana untuk asisten POS
prompt_template = PromptTemplate.from_template(
    """Anda adalah AI Order Assistant untuk restoran. 
Tugas Anda adalah membantu kasir dan pelanggan dalam mengelola pesanan.
Bersikaplah sopan, profesional, dan ringkas.

User: {question}
Assistant:"""
)

chain = prompt_template | llm

def get_chat_response(message: str) -> str:
    """Fungsi sederhana untuk mengetes koneksi ke Ollama."""
    try:
        response = chain.invoke({"question": message})
        return response
    except Exception as e:
        return f"Error connecting to Ollama: {str(e)}"

# Untuk streaming (SSE) akan diimplementasi di tahap selanjutnya.
